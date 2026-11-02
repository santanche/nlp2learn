// Lab C — Context Lab: replay, static view, occurrence clouds, probes, transcript viewer and mutation editor.
// The encoder maths lives in ../shared/encoder.js; this file loads data, runs it and draws.
import { loadJSON, escapeHtml } from "../shared/data.js";
import { lineChart, scatter2d, heatmapCanvas, legendMarkup } from "../shared/charts.js";
import { pca } from "../shared/linalg.js";
import { attachCodeView, jsSource, pythonSource } from "../shared/codeview.js";
import * as ENC from "../shared/encoder.js";

const $ = id => document.getElementById(id);
const CONFIGS = ["full", "no_position", "causal"];
const CONFIG_COLOURS = { full: "#087f78", no_position: "#df8b35", causal: "#7b2cbf" };
const CASE_COLOURS = { case1: "#e63946", case2: "#457b9d", case3: "#9b5de5" };
const LABEL_PALETTE = ["#087f78", "#e63946", "#f4a261", "#457b9d", "#9b5de5", "#c9a227", "#6a994e", "#8d99ae"];
const CLASS_COLOURS = { coding: "#2a9d8f", reserved: "#e76f51", "spacer-only": "#adb5bd" };
const BASES = ["W", "X", "Y", "V"];
const TOKEN_WIDTH = 44;          // .tok width (42 px) + gap (2 px); the arcs use the same spacing

const state = {
  encoders: {}, parity: null, sample: null, showcase: null, w2v: null, language: null,
  current: "full", snapshot: 9, caseId: "case1",
  weightCache: new Map(), finalsCache: new Map(), cloudJob: 0,
  editor: null,        // {value, original, tokens, labels, selected, edited: Set, inTraining, forward}
  parityResults: {},
};

// ------------------------------------------------------------------------------------------------
// Weights, forward pass, probes
// ------------------------------------------------------------------------------------------------
const encoder = (name = state.current) => state.encoders[name];
const snapshotOf = (name = state.current) => encoder(name).snapshots[state.snapshot];

function weights(name = state.current, index = state.snapshot) {
  const key = `${name}:${index}`;
  if (!state.weightCache.has(key)) state.weightCache.set(key, ENC.loadWeights(encoder(name).snapshots[index].weights));
  return state.weightCache.get(key);
}

function idsOf(tokens) {
  const vocab = encoder().config.vocabulary, special = encoder().config.special_tokens;
  return [special["[CLS]"], ...tokens.map(t => vocab.indexOf(t)), special["[EOS]"]];
}

// Probability of each class from a probe exported by 04c (logistic regression: binary or multinomial).
export function probeProbabilities(probe, vector) {
  const logits = probe.final.coef.map((row, k) => row.reduce((s, w, j) => s + w * vector[j], probe.final.intercept[k]));
  if (logits.length === 1) {
    const p = 1 / (1 + Math.exp(-logits[0]));
    return { [probe.classes[0]]: 1 - p, [probe.classes[1]]: p };
  }
  const max = Math.max(...logits), exps = logits.map(z => Math.exp(z - max)), total = exps.reduce((a, b) => a + b, 0);
  return Object.fromEntries(probe.classes.map((c, k) => [c, exps[k] / total]));
}

// The point of a vector on the fixed PCA axes exported by 04c: (v − mean) · components.
export function project(vector, axes) {
  return axes.components.map(component => component.reduce((s, c, j) => s + c * (vector[j] - axes.mean[j]), 0));
}

// Which case a token at a position is a target of (labels refer to the original transcript).
function caseOf(token, region) {
  return Object.entries(state.sample.targets).find(([, t]) => t.token === token && (!t.region || t.region === region))?.[0] ?? null;
}

// ------------------------------------------------------------------------------------------------
// Panel 1 · replay
// ------------------------------------------------------------------------------------------------
function renderReplay() {
  const all = encoder().snapshots, epochs = all.map(s => s.epoch), chosen = all[state.snapshot];
  $("epoch-value").textContent = String(chosen.epoch);
  $("train-loss").textContent = chosen.train_loss.toFixed(3);
  $("test-loss").textContent = chosen.test_loss.toFixed(3);
  $("test-acc").textContent = `${(chosen.masked_acc * 100).toFixed(1)}%`;
  const order = [...CONFIGS.filter(c => c !== state.current), state.current];
  const series = (key, testKey) => order.flatMap(c => [
    { label: `${c} training`, colour: CONFIG_COLOURS[c], dash: true, values: state.encoders[c].snapshots.map(s => s[key]) },
    { label: `${c} test`, colour: CONFIG_COLOURS[c], values: state.encoders[c].snapshots.map(s => s[testKey]) },
  ]);
  const maxAcc = Math.max(...CONFIGS.flatMap(c => state.encoders[c].snapshots.map(s => s.train_masked_acc)));
  lineChart($("loss-chart"), series("train_loss", "test_loss"), { xLabel: `epoch (selected: ${chosen.epoch})`, yLabel: "masked-token loss", xValues: epochs, highlight: state.snapshot, height: 240 });
  lineChart($("accuracy-chart"), series("train_masked_acc", "masked_acc"), { xLabel: "epoch · teal full, orange no_position, purple causal", yLabel: "masked-token accuracy", xValues: epochs, highlight: state.snapshot, height: 240, yRange: [0, maxAcc * 1.08] });
}

// ------------------------------------------------------------------------------------------------
// Panel 2 · static view
// ------------------------------------------------------------------------------------------------
function staticPoints(tokens, rows) {
  const coords = pca(rows, 2).coords;
  return tokens.map((t, i) => ({ id: t, label: t, coords: coords[i], colour: CLASS_COLOURS[state.language.codon_classes[t.replaceAll("V", "Z")]] }));
}

function renderStatic() {
  const vocab = encoder().config.vocabulary, W = weights();
  const codons = vocab.slice(4);
  scatter2d($("static-encoder"), staticPoints(codons, codons.map(t => W["tok_emb.weight"][vocab.indexOf(t)])),
    { xLabel: `encoder tok_emb (${state.current}, epoch ${snapshotOf().epoch}) · PC1`, yLabel: "PC2", height: 420 });
  const w2v = state.w2v.configs.find(c => c.corpus === "mixed" && c.half_window === 1 && c.dim === 8);
  const w2vVocab = state.w2v.vocabularies.mixed, shared = codons.filter(t => w2vVocab.includes(t));
  scatter2d($("static-w2v"), staticPoints(shared, shared.map(t => w2v.W[w2vVocab.indexOf(t)])),
    { xLabel: "word2vec W (mixed corpus, ±1, dim 8) · PC1", yLabel: "PC2", height: 420 });
  $("static-legend").innerHTML = legendMarkup(Object.entries(CLASS_COLOURS));
}

// ------------------------------------------------------------------------------------------------
// Panel 3 · occurrence cloud (computed in chunks, cached per configuration and snapshot)
// ------------------------------------------------------------------------------------------------
async function finalsFor(name, index, onProgress) {
  const key = `${name}:${index}`;
  if (state.finalsCache.has(key)) return state.finalsCache.get(key);
  const W = weights(name, index), config = encoder(name).config, finals = [];
  for (const [i, tr] of state.sample.transcripts.entries()) {
    finals.push(ENC.encoderForward(W, config, tr.ids).final);
    if (i % 10 === 9) { onProgress?.(i + 1); await new Promise(resolve => setTimeout(resolve, 0)); }
  }
  state.finalsCache.set(key, finals);
  return finals;
}

function editedPoint() {
  const ed = state.editor;
  if (!ed?.forward) return null;
  const caseId = caseOf(ed.tokens[ed.selected], ed.labels.region[ed.selected]);
  if (caseId !== state.caseId) return null;
  return project(ed.forward.final[ed.selected + 1], state.sample.pca[state.current][state.caseId]);
}

async function renderCloud() {
  const job = ++state.cloudJob, target = state.sample.targets[state.caseId], status = $("cloud-status");
  const started = performance.now();
  status.textContent = "computing…";
  status.className = "status busy";
  const finals = await finalsFor(state.current, state.snapshot, n => { if (job === state.cloudJob) status.textContent = `computing ${n}/${state.sample.transcripts.length}`; });
  if (job !== state.cloudJob) return;           // a newer request replaced this one
  const axes = state.sample.pca[state.current][state.caseId];
  const details = target.details;
  const points = target.occurrences.map(([t, pos, , detail], k) => ({
    id: `o${k}`, label: "", coords: project(finals[t][pos], axes),
    colour: LABEL_PALETTE[details.indexOf(String(detail))],
    title: `transcript ${state.sample.transcripts[t].transcript_id} (${state.sample.transcripts[t].condition}) · ${detail}`,
  }));
  const star = editedPoint();
  if (star) points.push({ id: "edited", label: "your edited token", coords: star, colour: "#ffd166", shape: "star" });
  scatter2d($("cloud-chart"), points, { xLabel: `PC1 (${(axes.explained[0] * 100).toFixed(0)}% of variance, final snapshot)`, yLabel: `PC2 (${(axes.explained[1] * 100).toFixed(0)}%)`, height: 460 });
  $("cloud-legend").innerHTML = legendMarkup(details.map((d, i) => [d, LABEL_PALETTE[i]]).concat(star ? [["your edited token", "#ffd166"]] : []));
  const probe = encoder().probes[state.caseId], last = probe.curve.at(-1), here = probe.curve[state.snapshot];
  $("cloud-caption").textContent = `${target.occurrences.length} occurrences of ${target.token} in ${state.sample.transcripts.length} test transcripts · ${state.current}, epoch ${snapshotOf().epoch}`;
  $("cloud-info").innerHTML = `<h3>${target.token} · ${target.title}</h3>
    <p>Label: <b>${target.label}</b>. Majority class: ${(probe.majority * 100).toFixed(0)}%.</p>
    <table><tr><td>Probe, this snapshot</td><td>contextual <b>${(here.contextual * 100).toFixed(1)}%</b> · static ${(here.static * 100).toFixed(1)}%</td></tr>
    <tr><td>Probe, final snapshot</td><td>contextual <b>${(last.contextual * 100).toFixed(1)}%</b> · static ${(last.static * 100).toFixed(1)}%</td></tr></table>
    <p class="muted">The static vector is the same for every occurrence, so its probe can only answer the majority class.</p>`;
  status.textContent = `${(performance.now() - started).toFixed(0)} ms`;
  status.className = "status good";
  state.lastCloudMs = performance.now() - started;
}

// ------------------------------------------------------------------------------------------------
// Panel 4 · probes and predictions
// ------------------------------------------------------------------------------------------------
function renderProbes() {
  const probes = encoder().probes, epochs = encoder().snapshots.map(s => s.epoch);
  const series = Object.entries(probes).flatMap(([caseId, p]) => [
    { label: `${caseId} contextual`, colour: CASE_COLOURS[caseId], values: p.curve.map(r => r.contextual) },
    { label: `${caseId} static`, colour: CASE_COLOURS[caseId], dash: true, values: p.curve.map(r => r.static) },
  ]);
  lineChart($("probe-chart"), series, { xLabel: `epoch · ${state.current} · red case 1, blue case 2, purple case 3 (dashed: static)`, yLabel: "probe-test accuracy", xValues: epochs, yRange: [0, 1.02], highlight: state.snapshot, height: 230 });
  let html = `<thead><tr><th>Case</th><th>Majority</th>${CONFIGS.map(c => `<th>${c}<br>static · contextual</th>`).join("")}</tr></thead><tbody>`;
  Object.entries(state.sample.targets).forEach(([caseId, t]) => {
    html += `<tr><td><b>${caseId}</b> ${t.token}</td><td>${(state.encoders.full.probes[caseId].majority * 100).toFixed(0)}%</td>` +
      CONFIGS.map(c => { const r = state.encoders[c].probes[caseId].curve.at(-1); return `<td>${(r.static * 100).toFixed(1)}% · <b>${(r.contextual * 100).toFixed(1)}%</b></td>`; }).join("") + "</tr>";
  });
  $("probe-table").innerHTML = html + "</tbody>";
  $("verdict-table").innerHTML = `<thead><tr><th>ID</th><th>Criterion</th><th>Result</th><th>Verdict</th></tr></thead><tbody>` +
    state.sample.verdicts.map(v => `<tr><td><b>${v.id}</b></td><td>${escapeHtml(v.criterion)}</td><td>${escapeHtml(v.result)}</td><td class="${v.holds ? "holds" : "fails"}">${v.holds ? "holds" : "fails"}</td></tr>`).join("") + "</tbody>";
}

// ------------------------------------------------------------------------------------------------
// Panels 5 and 6 · transcript viewer and mutation editor
// ------------------------------------------------------------------------------------------------
function transcriptOptions() {
  const train = new Set(encoder("full").config.train_genomes);
  const showcase = state.showcase.transcripts.map((t, i) => ({
    value: `s${i}`, text: `showcase · ${t.label} · genome ${t.genome_id}${train.has(t.genome_id) ? " (a training genome)" : " (test genome)"}`,
  }));
  const test = state.sample.transcripts.map((t, i) => ({ value: `t${i}`, text: `test · transcript ${t.transcript_id} · genome ${t.genome_id} · ${t.condition}` }));
  return [...showcase, ...test];
}

function loadTranscript(value) {
  const train = new Set(encoder("full").config.train_genomes);
  const t = value.startsWith("s") ? state.showcase.transcripts[Number(value.slice(1))] : state.sample.transcripts[Number(value.slice(1))];
  const tokens = value.startsWith("s") ? t.codon : t.tokens;
  const firstStart = t.start_role.indexOf("true_start");
  state.editor = {
    value, tokens: [...tokens],
    labels: { region: [...t.region], gene: [...t.gene], start_role: [...t.start_role], leader_state: [...t.leader_state] },
    selected: firstStart >= 0 ? firstStart : 0, edited: new Set(), inTraining: train.has(t.genome_id), forward: null,
    scrollToSelected: true,
  };
  renderEditor();
}

function attentionMatrix(forward, layer, head) {
  const heads = forward.layers[layer].attention;
  if (head !== "avg") return heads[Number(head)];
  return heads[0].map((row, i) => row.map((_, j) => heads.reduce((s, h) => s + h[i][j], 0) / heads.length));
}

function renderEditor() {
  const started = performance.now();
  const ed = state.editor;
  ed.forward = ENC.encoderForward(weights(), encoder().config, idsOf(ed.tokens));
  const forwardMs = performance.now() - started;
  const f = ed.forward, layer = Number($("layer").value), head = $("head").value;
  const all = ["[CLS]", ...ed.tokens, "[EOS]"], sel = ed.selected + 1;
  const matrix = attentionMatrix(f, layer, head), weightsRow = matrix[sel];

  // Strip: arcs from the selected token, then one cell per token.
  const width = all.length * TOKEN_WIDTH + 8, height = 80, centre = i => 4 + i * TOKEN_WIDTH + 21;
  let arcs = "";
  weightsRow.forEach((a, j) => {
    if (j === sel || a < 0.01) return;
    const x1 = centre(sel), x2 = centre(j), lift = Math.min(height - 6, 10 + Math.abs(x2 - x1) * 0.12);
    arcs += `<path d="M ${x1} ${height} Q ${(x1 + x2) / 2} ${height - 2 * lift} ${x2} ${height}" fill="none" stroke="#087f78" stroke-width="${(0.5 + 10 * a).toFixed(2)}" stroke-opacity="${(0.2 + 0.8 * a).toFixed(2)}"><title>${escapeHtml(all[sel])} → ${escapeHtml(all[j])} (${j}): ${a.toFixed(3)}</title></path>`;
  });
  const cells = all.map((token, i) => {
    const k = i - 1, special = i === 0 || i === all.length - 1;
    const region = special ? "special" : ed.labels.region[k];
    const bases = special ? `<button disabled>${token}</button>` : [...token].map((b, p) => `<button data-k="${k}" data-p="${p}" title="mutate base ${p + 1}">${b}</button>`).join("");
    const tip = special ? token : `${i}: ${region} ${ed.labels.gene[k] || ""} ${ed.labels.start_role[k] || ""} ${ed.labels.leader_state[k] || ""}`;
    return `<div class="tok r-${region} ${i === sel ? "selected" : ""} ${ed.edited.has(k) ? "edited" : ""}" title="${escapeHtml(tip)}">
      <div class="bases">${bases}</div>${special ? `<span class="name">${i}</span>` : `<button class="name" data-select="${k}">${i}</button>`}</div>`;
  }).join("");
  const strip = $("strip"), scroll = strip.scrollLeft;
  strip.innerHTML = `<svg width="${width}" height="${height}">${arcs}</svg><div class="tokens">${cells}</div>`;
  strip.scrollLeft = ed.scrollToSelected ? Math.max(0, centre(sel) - strip.clientWidth / 2) : scroll;   // a new transcript opens on its selected token
  ed.scrollToSelected = false;
  strip.querySelectorAll(".bases button[data-k]").forEach(b => b.addEventListener("click", () => {
    const k = Number(b.dataset.k), p = Number(b.dataset.p), codon = [...ed.tokens[k]];
    codon[p] = BASES[(BASES.indexOf(codon[p]) + 1) % BASES.length];
    ed.tokens[k] = codon.join("");
    ed.edited.add(k);
    renderEditorAndCloud();
  }));
  strip.querySelectorAll("button[data-select]").forEach(b => b.addEventListener("click", () => { ed.selected = Number(b.dataset.select); renderEditorAndCloud(); }));

  heatmapCanvas($("heatmap"), matrix, { highlightRow: sel });
  $("heatmap-title").textContent = `Attention · layer ${layer + 1} · ${head === "avg" ? "average of the heads" : `head ${Number(head) + 1}`} · ${all.length} tokens`;

  // Token information and probe read-out.
  const token = ed.tokens[ed.selected], region = ed.labels.region[ed.selected], caseId = caseOf(token, region);
  const top = weightsRow.map((a, j) => [j, a]).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([j, a]) => `<li>${all[j]} <span class="muted">pos ${j}, ${a.toFixed(3)}</span></li>`).join("");
  let probeHtml = `<p class="muted">The selected token is not one of the three probe targets (WXV; XYX in a body; WVV in the attenuator).</p>`;
  if (caseId) {
    const probe = encoder().probes[caseId], probs = probeProbabilities(probe, f.final[sel]);
    const lastIndex = encoder().snapshots.length - 1;
    probeHtml = `<p><b>Probe for ${caseId}</b> (${probe.label}), trained by 04c on the final snapshot${state.snapshot !== lastIndex ? ` — <span class="muted">you are viewing epoch ${snapshotOf().epoch}, so read it with care</span>` : ""}:</p>` +
      Object.entries(probs).sort((a, b) => b[1] - a[1]).map(([c, p]) => `<div>${escapeHtml(c)} <span class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span>${(p * 100).toFixed(1)}%</div>`).join("") +
      (caseId === state.caseId ? `<p class="muted">Shown as a star in the occurrence cloud.</p>` : `<p class="muted">Pick ${caseId} in the cloud panel to see this token as a star.</p>`);
  }
  const labelText = ["gene", "start_role", "leader_state"].map(k => ed.labels[k][ed.selected]).filter(Boolean).map(escapeHtml).join(" · ");
  $("token-info").innerHTML = `<h3>${escapeHtml(token)} <span class="muted">· position ${sel}</span></h3>
    <p>Original labels: ${escapeHtml(region)}${labelText ? ` · ${labelText}` : ""}${ed.edited.size ? ` <span class="muted">(labels describe the unedited transcript)</span>` : ""}</p>
    <p class="muted">${ed.inTraining ? "This transcript's genome was used to train the encoder." : "Test genome: the encoder never trained on it."}</p>
    ${probeHtml}
    <p class="muted">Strongest attention from this token (layer ${layer + 1}, ${head === "avg" ? "average" : `head ${Number(head) + 1}`}):</p><ol>${top}</ol>`;
  const total = performance.now() - started;
  $("latency").textContent = `forward ${forwardMs.toFixed(0)} ms · redraw ${total.toFixed(0)} ms`;
  $("latency").className = "status good";
  state.lastEditorMs = total;
}

function renderEditorAndCloud() {
  renderEditor();
  renderCloud();
}

// Presets.
function breakRbs() {
  const ed = state.editor;
  if (ed.tokens[ed.selected] !== "WXV") { alert("Select a start codon (WXV) first."); return; }
  for (let k = ed.selected - 1; k >= Math.max(0, ed.selected - 5); k--) {
    if (ed.tokens[k] === "WXX") {
      ed.tokens[k] = "XXX";                 // one base, W → X: the RBS codon nearer to the start is broken
      ed.edited.add(k);
      renderEditorAndCloud();
      return;
    }
  }
  alert("No intact RBS codon (WXX) within 5 positions before this start.");
}

function truncateAfterAttenuator() {
  const ed = state.editor, last = ed.labels.region.lastIndexOf("attenuator");
  if (last < 0 || last === ed.tokens.length - 1) { alert("This transcript already ends at its attenuator (or has none)."); return; }
  ed.tokens = ed.tokens.slice(0, last + 1);
  Object.keys(ed.labels).forEach(k => { ed.labels[k] = ed.labels[k].slice(0, last + 1); });
  ed.selected = Math.min(ed.selected, last);
  ed.edited.add(last);
  renderEditorAndCloud();
}

// ------------------------------------------------------------------------------------------------
// Parity (start-up)
// ------------------------------------------------------------------------------------------------
async function runParity() {
  for (const c of CONFIGS) {
    const started = performance.now();
    state.parityResults[c] = { ...ENC.parityCheck(state.encoders[c], state.parity.configs[c], state.parity.tolerance), ms: performance.now() - started };
  }
  // Clouds: the first occurrences of each case, projected in JS, vs notebook 04c's projections.
  for (const c of CONFIGS) {
    let worst = 0;
    const W = weights(c, encoder(c).snapshots.length - 1), config = encoder(c).config;
    for (const [caseId, target] of Object.entries(state.sample.targets)) {
      const axes = state.sample.pca[c][caseId];
      target.occurrences.slice(0, 5).forEach(([t, pos], k) => {
        const point = project(ENC.encoderForward(W, config, state.sample.transcripts[t].ids).final[pos], axes);
        worst = Math.max(worst, ...point.map((v, i) => Math.abs(v - axes.reference[k][i])));
      });
    }
    state.parityResults[c].cloud = worst;
  }
  const ok = c => state.parityResults[c].passed && state.parityResults[c].cloud <= state.parity.tolerance;
  $("parity-table").innerHTML = `<thead><tr><th>Configuration</th><th>Snapshot epoch</th><th>Test transcripts</th><th>max |Δ| final vectors</th>
    <th>max |Δ| layer-0 attention</th><th>max |Δ| cloud projection (vs 04c)</th><th>Result</th><th>Time</th></tr></thead><tbody>` +
    CONFIGS.map(c => {
      const r = state.parityResults[c];
      return `<tr><td><b>${c}</b></td><td>${state.parity.configs[c].epoch}</td><td>${r.tests}</td><td>${r.maxFinal.toExponential(1)}</td><td>${r.maxAttention.toExponential(1)}</td>` +
        `<td>${r.cloud.toExponential(1)}</td><td class="${ok(c) ? "pass" : "fail"}">${ok(c) ? "pass" : "FAIL"}</td><td>${r.ms.toFixed(0)} ms</td></tr>`;
    }).join("") + "</tbody>";
  $("parity-badges").innerHTML = CONFIGS.map(c => {
    const r = state.parityResults[c];
    return `<span class="status ${ok(c) ? "good" : "bad"}" title="max |Δ| ${Math.max(r.maxFinal, r.maxAttention, r.cloud).toExponential(1)}">${c} ${ok(c) ? "✓" : "✗"}</span>`;
  }).join("");
}

// ------------------------------------------------------------------------------------------------
// Start-up and wiring
// ------------------------------------------------------------------------------------------------
function describe() {
  const c = encoder().config;
  $("config-description").textContent =
    `${c.name}: ${c.n_layers} layers · ${c.n_heads} heads · d_model ${c.d_model} · positions ${c.use_position ? "on" : "off"} · ` +
    `${c.causal ? "causal (left only)" : "bidirectional"} · ${c.train_genomes.length} training / ${c.test_genomes.length} test genomes`;
}

function renderModelPanels() {
  describe();
  renderReplay();
  renderStatic();
  renderProbes();
  renderEditor();
  renderCloud();
}

async function init() {
  try {
    const [parity, sample, showcase, w2v, language, ...encoders] = await Promise.all([
      loadJSON("parity-tests.json"), loadJSON("contextual-sample.json"), loadJSON("showcase-transcripts.json"),
      loadJSON("w2v-results.json"), loadJSON("language.json"), ...CONFIGS.map(c => loadJSON(`encoder-${c}.json`)),
    ]);
    Object.assign(state, { parity, sample, showcase, w2v, language });
    CONFIGS.forEach((c, i) => { state.encoders[c] = encoders[i]; });
  } catch (error) {
    $("error").innerHTML = `<div class="error-box">${escapeHtml(error.message)}</div>`;
    return;
  }
  await runParity();
  state.snapshot = encoder().snapshots.length - 1;
  $("epoch").max = String(state.snapshot);
  $("epoch").value = String(state.snapshot);
  ["config", "epoch"].forEach(id => { $(id).disabled = false; });
  $("config").addEventListener("change", event => { state.current = event.target.value; renderModelPanels(); });
  $("epoch").addEventListener("input", event => { state.snapshot = Number(event.target.value); renderModelPanels(); });
  $("case").addEventListener("change", event => { state.caseId = event.target.value; renderCloud(); renderEditor(); });
  $("transcript").innerHTML = transcriptOptions().map(o => `<option value="${o.value}">${escapeHtml(o.text)}</option>`).join("");
  $("transcript").addEventListener("change", event => { loadTranscript(event.target.value); renderCloud(); });
  ["layer", "head"].forEach(id => $(id).addEventListener("change", renderEditor));
  $("preset-break").addEventListener("click", breakRbs);
  $("preset-truncate").addEventListener("click", truncateAfterAttenuator);
  $("preset-restore").addEventListener("click", () => { loadTranscript(state.editor.value); renderCloud(); });

  const pyEncoder = state.encoders.full.metadata.source, pySample = state.sample.metadata.source;
  attachCodeView($("replay-panel"), () => pythonSource("model and train_config (notebook 04b)", pyEncoder));
  attachCodeView($("static-panel"), () => jsSource(renderStatic, staticPoints, pca));
  attachCodeView($("cloud-panel"), () => [...jsSource(finalsFor, project, renderCloud), ...pythonSource("forward pass, occurrences and probes (notebook 04c)", pySample)]);
  attachCodeView($("probe-panel"), () => [...jsSource(probeProbabilities, renderProbes), ...pythonSource("run_probe and helpers (notebook 04c)", pySample)]);
  attachCodeView($("editor-panel"), () => jsSource(ENC.encoderForward, ENC.selfAttention, ENC.layerNorm, ENC.linear, renderEditor, breakRbs, truncateAfterAttenuator));
  attachCodeView($("parity-panel"), () => jsSource(ENC.parityCheck, runParity));

  loadTranscript("s0");
  renderModelPanels();
  window.labC = { state, ENC, renderCloud, renderEditor, loadTranscript, breakRbs, truncateAfterAttenuator, probeProbabilities, project };
}

init();
