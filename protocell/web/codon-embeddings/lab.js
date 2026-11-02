// Lab A — Codon Embeddings Lab: wiring of the controls and panels.
// The maths lives in skipgram.js (training) and predictions.js (S1–S6); this file only draws.
import { loadJSON, languageHelpers, escapeHtml } from "../shared/data.js";
import { createRng } from "../shared/rng.js";
import { cosineMatrix, nearest, pca, addMatrices } from "../shared/linalg.js";
import { lineChart, scatter2d, createScatter3d, legendMarkup } from "../shared/charts.js";
import { attachCodeView, jsSource, pythonSource } from "../shared/codeview.js";
import * as SG from "./skipgram.js";
import * as P from "./predictions.js";

const $ = id => document.getElementById(id);

// ------------------------------------------------------------------------------------------------
// Colours
// ------------------------------------------------------------------------------------------------
const GREY = "#c9d2d7";
const CLASS_COLOURS = { coding: "#2a9d8f", reserved: "#e76f51", "spacer-only": "#adb5bd" };
const GENE_PALETTE = ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#9b5de5", "#c9a227", "#6a994e"];
const RESIDUE_PALETTE = ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d", "#1f78b4", "#b2df8a", "#fb9a99"];
const MIDDLE_COLOURS = { W: "#457b9d", X: "#e63946", Y: "#2a9d8f", Z: "#f4a261" };

const PREDICTION_TEXT = {
  S1: "Coding codons separate from spacer-only codons.",
  S2: "Body codons cluster by preferred gene (dialect).",
  S3: "Synonyms cluster by register, not by residue.",
  S4: "WXZ has one vector blending true and false starts.",
  S5: "At ±9, terminator_i is closest to marker_(i+1); not in the shuffled corpus.",
  S6: "In the mixed corpus, Z/V twins converge.",
};

const state = {
  lang: null, sample: null, w2v: null,
  settings: null, data: null, model: null,
  selected: "WXZ", context: null, busy: false,
  live: null, cosine: null,
};
let scatter3d = null;

// ------------------------------------------------------------------------------------------------
// Settings and model
// ------------------------------------------------------------------------------------------------
function readSettings() {
  return {
    corpus: $("corpus").value,
    nGenomes: Number($("n-genomes").value),
    halfWindow: Number($("half-window").value),
    dim: Number($("dim").value),
    seed: Math.trunc(Number($("seed").value)) || 0,
  };
}

function learningRate() {
  const value = Number($("learning-rate").value);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 1) : 0.025;
}

// Rebuild corpus, pairs and a fresh model from the current settings (also used by Reset).
function rebuild() {
  state.settings = readSettings();
  state.data = SG.prepareData(state.sample, state.settings, state.lang.allCodons);
  state.model = SG.createModel(state.data.vocabulary.length, state.settings.dim, state.settings.seed);
  state.live = null;
  if (!state.data.index.has(state.selected)) state.selected = state.lang.initiator;
  state.context = null;
  renderAll();
}

async function train(epochs) {
  if (state.busy) return;
  state.busy = true;
  renderControls();
  for (let e = 0; e < epochs; e++) {
    await SG.trainEpoch(state.model, state.data, learningRate(), fraction => {
      $("model-status").textContent = `Training · epoch ${state.model.epochs + 1} · ${Math.round(fraction * 100)}%`;
    });
    renderTrainingProgress();
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  state.live = P.measurePredictions(state.model.W, state.data.vocabulary, state.lang, state.settings.corpus, createRng(state.settings.seed));
  state.busy = false;
  renderAll();
}

function currentVectors() {
  const view = $("view").value;
  if (view === "U") return state.model.U;
  if (view === "WU") return addMatrices(state.model.W, state.model.U);
  return state.model.W;
}

// ------------------------------------------------------------------------------------------------
// Point styling
// ------------------------------------------------------------------------------------------------
function colourOf(token, colourBy) {
  const lang = state.lang;
  if (colourBy === "class") return CLASS_COLOURS[lang.codonClass(token)];
  if (colourBy === "gene") {
    const gene = lang.preferredGene(token);
    return gene ? GENE_PALETTE[lang.geneNames.indexOf(gene)] : GREY;
  }
  if (colourBy === "residue") {
    const residue = lang.residueOf(token);
    return residue ? RESIDUE_PALETTE[Object.keys(lang.language.residues).indexOf(residue)] : GREY;
  }
  return MIDDLE_COLOURS[lang.toDna(token)[1]];
}

function legendEntries(colourBy) {
  const lang = state.lang;
  let entries;
  if (colourBy === "class") entries = Object.entries(CLASS_COLOURS);
  else if (colourBy === "gene") entries = [...lang.geneNames.map((g, i) => [g, GENE_PALETTE[i]]), ["no preferred gene", GREY]];
  else if (colourBy === "residue") entries = [...Object.entries(lang.language.residues).map(([code, r], i) => [`${code} ${r.name}`, RESIDUE_PALETTE[i]]), ["not coding", GREY]];
  else entries = Object.entries(MIDDLE_COLOURS).map(([b, c]) => [`middle ${b}${b === "Z" ? " / V" : ""}`, c]);
  if (state.settings.corpus === "mixed") entries.push(["RNA spelling (square)", "#8a99a3", "square"]);
  return entries;
}

function pointsFor(vocabulary, coords, colourBy) {
  return vocabulary.map((token, i) => ({
    id: token, label: token, coords: coords[i],
    colour: colourOf(token, colourBy),
    shape: state.lang.isRna(token) ? "square" : "circle",
    title: `${token} · ${state.lang.codonClass(token)}${state.lang.residueOf(token) ? " · " + state.lang.residueOf(token) : ""}`,
  }));
}

function pairLines(vocabulary) {
  const present = new Set(vocabulary), lines = [];
  if ($("show-synonyms").checked) state.lang.synonymPairs.forEach(([a, b]) => { if (present.has(a) && present.has(b)) lines.push([a, b, "synonym"]); });
  if ($("show-twins").checked) vocabulary.filter(c => c.includes("Z") && present.has(state.lang.transcribe(c))).forEach(c => lines.push([c, state.lang.transcribe(c), "twin"]));
  return lines;
}

// 2D coordinates of a set of vectors: as they are for dimension 2, by PCA otherwise.
function project2d(vectors) {
  if (vectors[0].length === 2) return { coords: vectors.map(v => Array.from(v)), labels: ["dimension 1", "dimension 2"] };
  const result = pca(vectors, 2);
  return { coords: result.coords, labels: result.explained.map((e, i) => `PC${i + 1} (${(e * 100).toFixed(0)}% of variance)`) };
}

function select(token) {
  state.selected = token;
  state.context = null;
  renderAll();
}

// ------------------------------------------------------------------------------------------------
// Panels
// ------------------------------------------------------------------------------------------------
function renderControls() {
  const busy = state.busy;
  ["train-btn", "step-btn", "reset-btn", "corpus", "n-genomes", "half-window", "dim", "seed"].forEach(id => { $(id).disabled = busy; });
  const status = $("model-status");
  status.className = `status ${busy ? "busy" : state.model.epochs ? "good" : ""}`;
  if (!busy) status.textContent = state.model.epochs ? "Trained" : "Untrained";
  const d = state.data, s = state.settings;
  $("corpus-description").textContent =
    `${s.nGenomes} genomes${s.corpus === "mixed" ? " + their transcripts" : ""} · ${d.tokens.toLocaleString()} codons · ` +
    `${d.vocabulary.length} codon types · ±${s.halfWindow} → ${d.pairs.targets.length.toLocaleString()} positive pairs`;
}

function renderTrainingProgress() {
  const m = state.model;
  $("loss-value").textContent = m.lossHistory.length ? m.lossHistory.at(-1).toFixed(5) : "—";
  $("epochs-value").textContent = String(m.epochs);
  $("samples-value").textContent = (state.data.pairs.targets.length * (1 + SG.TRAINING.negatives)).toLocaleString();
  renderLoss();
  renderEmbedding();
}

function renderLoss() {
  lineChart($("loss-chart"), [{ label: "training loss", colour: "#087f78", values: state.model.lossHistory }], { xLabel: "epoch", yLabel: "training loss" });
}

function renderEmbedding() {
  const vectors = currentVectors(), vocabulary = state.data.vocabulary, colourBy = $("colour-by").value;
  const svg = $("embedding-chart"), lines = pairLines(vocabulary);
  const dim = vectors[0].length;
  if (dim === 3) {
    scatter3d.update(pointsFor(vocabulary, vectors.map(v => Array.from(v)), colourBy), { lines, selected: state.selected, onSelect: select });
    $("embedding-caption").textContent = "3 dimensions — drag the chart to rotate it.";
  } else {
    scatter3d.deactivate();
    const { coords, labels } = project2d(vectors);
    scatter2d(svg, pointsFor(vocabulary, coords, colourBy), { lines, selected: state.selected, onSelect: select, xLabel: labels[0], yLabel: labels[1] });
    $("embedding-caption").textContent = dim === 2 ? "2 dimensions, drawn as they are." : "8 dimensions, projected to 2 by PCA (recomputed at every redraw).";
  }
  $("embedding-legend").innerHTML = legendMarkup(legendEntries(colourBy));
  renderSelected();
}

function tokenCount(token) {
  return state.data.sequences.reduce((n, s) => n + s.filter(c => c === token).length, 0);
}

function renderSelected() {
  const lang = state.lang, token = state.selected, i = state.data.index.get(token);
  const cos = cosineMatrix(currentVectors());
  state.cosine = cos;
  const neighbours = nearest(cos, i, 8).map(([j, v]) => `<li>${state.data.vocabulary[j]} <span class="muted">${v.toFixed(3)}</span></li>`).join("");
  const residue = lang.residueOf(token), gene = lang.preferredGene(token);
  $("selected-codon").innerHTML =
    `<h3>${escapeHtml(token)}</h3>` +
    `<span class="tag">${lang.isRna(token) ? "RNA spelling" : "DNA spelling"}</span><span class="tag">${lang.codonClass(token)}</span>` +
    (residue ? `<span class="tag">${residue} ${lang.language.residues[residue].name}</span>` : "") +
    (gene ? `<span class="tag">${gene}</span>` : "") +
    `<p class="muted">${tokenCount(token).toLocaleString()} occurrences in this corpus. Nearest neighbours (cosine):</p><ol>${neighbours}</ol>` +
    `<p class="muted">Click any point to select it.</p>`;
}

function renderTable() {
  const lang = state.lang, cos = state.cosine || cosineMatrix(currentVectors()), vocab = state.data.vocabulary;
  const grid = lang.language.code_grid;
  let html = `<thead><tr><th>first·third</th>${grid.columns.map(m => `<th>middle ${m}${m === "Z" ? " (V in RNA)" : ""}</th>`).join("")}</tr></thead><tbody>`;
  grid.rows.forEach(row => {
    const [first, third] = row.split("·");
    html += `<tr><th>${row}${row === "X·Y" ? " · Stage I" : ""}</th>`;
    grid.columns.forEach(middle => {
      const codon = first + middle + third, i = state.data.index.get(codon);
      const neighbours = i === undefined ? "" : nearest(cos, i, 3).map(([j, v]) => `<span class="nb">${vocab[j]} ${v.toFixed(2)}</span>`).join("");
      html += `<td class="clickable ${codon === state.selected ? "selected" : ""}" data-codon="${codon}"><b>${codon}</b> → ${lang.codeTable[codon]}${neighbours}</td>`;
    });
    html += "</tr>";
  });
  $("codon-table").innerHTML = html + "</tbody>";
  $("table-hint").textContent = state.settings.dim === 2
    ? "In 2 dimensions every vector is just a direction on a circle, so most cosines are close to ±1. Choose dimension 8 for more informative neighbours."
    : "";
  $("codon-table").querySelectorAll("td.clickable").forEach(td => td.addEventListener("click", () => select(td.dataset.codon)));
}

// How often the pair (t, c) is a positive example in the current window.
function pairCount(t, c) {
  const { targets, contexts } = state.data.pairs;
  let n = 0;
  for (let i = 0; i < targets.length; i++) if (targets[i] === t && contexts[i] === c) n++;
  return n;
}

function mostFrequentContext(t) {
  const { targets, contexts } = state.data.pairs;
  const counts = new Map();
  for (let i = 0; i < targets.length; i++) if (targets[i] === t) counts.set(contexts[i], (counts.get(contexts[i]) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

function renderInspector() {
  const vocab = state.data.vocabulary, t = state.data.index.get(state.selected);
  if (state.context === null || !state.data.index.has(state.context)) state.context = vocab[mostFrequentContext(t)];
  const c = state.data.index.get(state.context);
  const options = selected => vocab.map(v => `<option ${v === selected ? "selected" : ""}>${v}</option>`).join("");
  $("inspect-target").innerHTML = options(state.selected);
  $("inspect-context").innerHTML = options(state.context);

  const f = SG.pairForward(state.model, t, c), count = pairCount(t, c);
  const vec = v => "[" + Array.from(v, x => x.toFixed(3)).join(", ") + "]";
  const oneHot = vocab.length <= 64 ? `[${vocab.map((_, i) => (i === t ? 1 : 0)).join("")}]` : `one 1 at position ${t}, ${vocab.length - 1} zeros`;
  $("inspector").innerHTML = `
    <p class="note">The target is a one-hot vector over the ${vocab.length} codon types. Multiplying it by W
      simply <b>selects row ${t}</b> of W: that row is the codon's embedding. The context selects a row of U.</p>
    <div class="inspector-steps">
      <div class="step"><b>one-hot(${state.selected})</b>${oneHot}</div>
      <div class="step"><b>w = row ${t} of W</b>${vec(f.w)}</div>
      <div class="step"><b>u = row ${c} of U (${state.context})</b>${vec(f.u)}</div>
      <div class="step"><b>score s = w · u</b>${f.score.toFixed(4)}</div>
      <div class="step"><b>σ(s) = P(observed)</b>${f.probability.toFixed(4)}</div>
      <div class="step"><b>loss if observed (y = 1)</b>−log σ(s) = ${f.lossIfObserved.toFixed(4)}</div>
      <div class="step"><b>loss if negative (y = 0)</b>−log(1 − σ(s)) = ${f.lossIfNegative.toFixed(4)}</div>
    </div>
    <p class="note">${state.context} occurs within ±${state.settings.halfWindow} of ${state.selected}
      <b>${count.toLocaleString()}</b> time${count === 1 ? "" : "s"} in this corpus${count ? " — a positive pair, so training pushes σ(s) up" : " — never observed together, so it can only appear as a negative"}.</p>`;
}

function notebookConfig() {
  const s = state.settings;
  return state.w2v.configs.find(c => c.corpus === s.corpus && c.half_window === s.halfWindow && c.dim === s.dim);
}

function renderCompare() {
  const s = state.settings, cfg = notebookConfig();
  $("compare-caption").textContent = `Notebook result for: ${s.corpus}, ±${s.halfWindow}, dimension ${s.dim}.`;
  if (!cfg) {
    $("compare-chart").innerHTML = `<text x="360" y="120" text-anchor="middle" class="chart-empty">Not exported: the notebook trains ±1 and ±9 only.</text>`;
    $("compare-chart").setAttribute("viewBox", "0 0 720 240");
    $("compare-info").innerHTML = "";
    return;
  }
  const vocabulary = state.w2v.vocabularies[s.corpus === "mixed" ? "mixed" : "dna"];
  const { coords, labels } = project2d(cfg.W);
  scatter2d($("compare-chart"), pointsFor(vocabulary, coords, $("colour-by").value), {
    lines: pairLines(vocabulary), selected: state.selected, onSelect: select, xLabel: labels[0], yLabel: labels[1],
  });
  const own = state.w2v.predictions.filter(p => p.corpus === s.corpus && p.half_window === s.halfWindow && p.dim === s.dim);
  $("compare-info").innerHTML =
    `<p class="note">Notebook training loss by epoch (all 400 genomes): ${cfg.loss_history.map(v => v.toFixed(4)).join(" → ")}.` +
    (s.dim === 3 ? " Dimension 3 is shown here by PCA." : "") + `</p>` +
    (own.length ? `<p class="note">Notebook predictions for this configuration: ${own.map(p => `${p.id} ${p.holds === null ? "descriptive" : p.holds ? "holds" : "fails"}`).join(" · ")}.</p>` : "");
}

function formatValue(row) {
  if (row.value === null || row.value === undefined) return "—";
  return row.id === "S5" ? `${row.value} of 5` : row.value.toFixed(3);
}

function verdictCell(holds) {
  if (holds === null || holds === undefined) return `<td>descriptive</td>`;
  return `<td class="${holds ? "holds" : "fails"}">${holds ? "holds" : "fails"}</td>`;
}

function renderPredictions() {
  const nb = state.w2v.predictions.filter(p => p.dim === 8);
  const notebookCell = id => {
    const rows = nb.filter(p => p.id === id);
    if (id === "S4") return "one vector per type — holds by construction";
    if (id === "S5") {
      return [1, 9].map(k => {
        const dna = rows.find(p => p.corpus === "dna" && p.half_window === k), shuf = rows.find(p => p.corpus === "shuffled" && p.half_window === k);
        return `±${k}: dna ${dna.value} of 5, shuffled ${shuf.value} of 5 → <b class="${dna.holds && shuf.holds ? "holds" : "fails"}">${dna.holds && shuf.holds ? "holds" : "fails"}</b>`;
      }).join("<br>");
    }
    return rows.map(p => `±${p.half_window}: ${p.value.toFixed(3)} vs ${p.baseline.toFixed(3)} → <b class="${p.holds ? "holds" : "fails"}">${p.holds ? "holds" : "fails"}</b>`).join("<br>");
  };
  const live = state.live ? Object.fromEntries(state.live.map(r => [r.id, r])) : null;
  let html = `<thead><tr><th>ID</th><th>Prediction</th><th>Notebook 03b (400 genomes, dim 8)</th><th>Your run</th><th>Verdict (your run)</th></tr></thead><tbody>`;
  Object.entries(PREDICTION_TEXT).forEach(([id, text]) => {
    const r = live?.[id];
    const liveCell = !live ? "train first" : !r ? (id === "S6" ? "needs the mixed corpus" : "not measured on the mixed corpus") :
      r.value === null ? escapeHtml(r.detail) : `${formatValue(r)}${r.id === "S5" ? "" : ` vs ${r.baseline.toFixed(3)}`}${r.detail ? `<br><span class="muted">${escapeHtml(r.detail)}</span>` : ""}`;
    html += `<tr><td><b>${id}</b></td><td>${escapeHtml(text)}</td><td>${notebookCell(id)}</td><td>${liveCell}</td>${r ? verdictCell(r.holds) : "<td>—</td>"}</tr>`;
  });
  $("predictions-table").innerHTML = html + "</tbody>";
  const s = state.settings;
  $("predictions-note").innerHTML = state.live
    ? `Your run: ${s.corpus}, ±${s.halfWindow}, dimension ${s.dim}, ${s.nGenomes} genomes, ${state.model.epochs} epochs. ` +
      `Criteria: S1/S2/S6 beat the 95th percentile of 1,000 random relabellings; S3 difference &gt; 0; S5 needs 5 of 5 (pathway) or ≤ 2 of 5 (shuffled). ` +
      `The notebook's verdicts use dimension 8 on all 400 genomes; a small live run can disagree.`
    : "Train the model to measure the predictions on your own run.";
}

function renderAll() {
  renderControls();
  renderTrainingProgress();
  renderTable();
  renderInspector();
  renderCompare();
  renderPredictions();
}

// ------------------------------------------------------------------------------------------------
// Code views
// ------------------------------------------------------------------------------------------------
function attachCodeViews() {
  const py = state.w2v.metadata.source;
  attachCodeView($("loss-panel"), () => [...jsSource(SG.trainEpoch, SG.makeEpochSamples, SG.batchGradients, SG.applyGradients), ...pythonSource("train_skipgram and helpers", py)]);
  attachCodeView($("inspector-panel"), () => jsSource(SG.pairForward, SG.sigmoid, SG.softplus));
  attachCodeView($("embedding-panel"), () => jsSource(renderEmbedding, project2d, pca));
  attachCodeView($("table-panel"), () => jsSource(cosineMatrix, nearest, renderTable));
  attachCodeView($("compare-panel"), () => pythonSource("train_skipgram and helpers", py));
  attachCodeView($("predictions-panel"), () => [
    ...jsSource(P.measurePredictions, P.s1CodingVsSpacer, P.s2PreferredGene, P.s3RegisterVsResidue, P.s4Initiator, P.s5PathwayOrder, P.s6ZvTwins),
    ...Object.entries(state.w2v.prediction_sources).flatMap(([name, code]) => pythonSource(name, code)),
  ]);
}

// ------------------------------------------------------------------------------------------------
// Start-up
// ------------------------------------------------------------------------------------------------
async function init() {
  try {
    const [language, sample, w2v] = await Promise.all([loadJSON("language.json"), loadJSON("genome-sample.json"), loadJSON("w2v-results.json")]);
    state.lang = languageHelpers(language);
    state.sample = sample;
    state.w2v = w2v;
  } catch (error) {
    $("error").innerHTML = `<div class="error-box">${escapeHtml(error.message)}</div>`;
    return;
  }
  const check = SG.gradientCheck();
  const badge = $("gradient-status");
  badge.textContent = `Gradient check ${check.passed ? "passed" : "FAILED"} · max rel. error ${check.maxError.toExponential(1)}`;
  badge.className = `status ${check.passed ? "good" : "bad"}`;
  badge.title = `Central differences on all ${check.checked} parameters of a small test model.`;
  state.gradientCheck = check;

  scatter3d = createScatter3d($("embedding-chart"));
  ["corpus", "n-genomes", "half-window", "dim", "seed"].forEach(id => $(id).addEventListener("change", rebuild));
  ["view", "colour-by", "show-synonyms", "show-twins"].forEach(id => $(id).addEventListener("change", () => { renderEmbedding(); renderTable(); renderCompare(); }));
  $("train-btn").addEventListener("click", () => train(Math.max(1, Math.min(200, Math.trunc(Number($("epochs").value)) || 5))));
  $("step-btn").addEventListener("click", () => train(1));
  $("reset-btn").addEventListener("click", rebuild);
  $("inspect-target").addEventListener("change", event => select(event.target.value));
  $("inspect-context").addEventListener("change", event => { state.context = event.target.value; renderInspector(); });

  attachCodeViews();
  rebuild();
  // Handle for automated checks and for curious students in the console.
  window.labA = { state, train, rebuild, SG, P, createRng };
}

init();
