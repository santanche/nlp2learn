// Lab B — Attention Inspector: wiring of the controls and panels. The maths lives in attention.js.
import { loadJSON, escapeHtml } from "../shared/data.js";
import { lineChart } from "../shared/charts.js";
import { attachCodeView, jsSource, pythonSource } from "../shared/codeview.js";
import * as AT from "./attention.js";

const $ = id => document.getElementById(id);
const BASES = ["W", "X", "Y", "V"];
const RECORD_EVERY = 25;          // steps between points on the training curves
const YIELD_EVERY = 4;            // steps between pauses that let the browser redraw
const MODEL_LABEL = { with_position: "positions on", no_position: "positions off" };

const state = {
  data: null, config: null, tokenId: null, markers: null,
  train: [], test: [],
  models: {}, current: "with_position",
  example: 0, tokens: [], edited: new Set(),
  busy: false,
};

// ------------------------------------------------------------------------------------------------
// Models
// ------------------------------------------------------------------------------------------------
function newModel(key) {
  const init = $("init").value;
  const params = init === "notebook"
    ? AT.paramsFromJSON(state.data.models[key].initial)
    : AT.createParams(Math.trunc(Number($("seed").value)) || 0, state.config);
  return { params, steps: 0, losses: [], history: [], evaluation: null };
}

const model = () => state.models[state.current];
const usePosition = key => key === "with_position";

function record(m, key, loss) {
  const train = AT.evaluate(m.params, state.train, usePosition(key), state.data.categories);
  const test = AT.evaluate(m.params, state.test, usePosition(key), state.data.categories);
  m.evaluation = { train, test };
  m.history.push({ step: m.steps, loss, train: train.overall, test: test.overall });
}

async function train(steps) {
  if (state.busy) return;
  state.busy = true;
  renderControls();
  const key = state.current, m = model(), lr = learningRate();
  for (let s = 0; s < steps; s++) {
    const loss = AT.trainStep(m.params, state.train, usePosition(key), lr);
    m.losses.push(loss);
    m.steps += 1;
    if (m.steps % RECORD_EVERY === 0 || s === steps - 1) {
      record(m, key, loss);
      $("model-status").textContent = `Training · step ${m.steps}`;
      renderMetrics();
      renderCurves();
    }
    if (s % YIELD_EVERY === YIELD_EVERY - 1) await new Promise(resolve => setTimeout(resolve, 0));   // keep the page responsive
  }
  state.busy = false;
  renderAll();
}

function learningRate() {
  const v = Number($("learning-rate").value);
  return Number.isFinite(v) && v > 0 ? v : 0.1;
}

function reset() {
  state.models[state.current] = newModel(state.current);
  renderAll();
}

// ------------------------------------------------------------------------------------------------
// Sequence editor
// ------------------------------------------------------------------------------------------------
function loadExample(index) {
  state.example = index;
  state.tokens = [...state.test[index].tokens];
  state.edited = new Set();
  renderSequenceViews();
}

function tokenKind(codon) {
  if (codon === "WXX") return ["rbs", "RBS"];
  if (codon === "WXV") return ["initiator", "start"];
  if (state.markers.has(codon)) return ["marker", "marker"];
  return ["other", ""];
}

function currentForward(key = state.current) {
  const ex = state.test[state.example];
  const ids = state.tokens.map(c => state.tokenId.get(c));
  return AT.forward(state.models[key].params, ids, ex.target, usePosition(key));
}

const TOKEN_WIDTH = 76;           // token box (70 px) + gap (6 px); the arcs use the same spacing

function renderSequence(f) {
  const ex = state.test[state.example], t = ex.target, weights = f.A[t];
  const n = state.tokens.length, height = 96;
  const centre = i => i * TOKEN_WIDTH + 35;
  let arcs = "";
  weights.forEach((a, j) => {
    if (j === t) return;
    const x1 = centre(t), x2 = centre(j), lift = Math.min(height - 8, 18 + Math.abs(x2 - x1) * 0.18);
    arcs += `<path d="M ${x1} ${height} Q ${(x1 + x2) / 2} ${height - 2 * lift} ${x2} ${height}" fill="none" stroke="#087f78"
      stroke-width="${(0.6 + 12 * a).toFixed(2)}" stroke-opacity="${(0.15 + 0.85 * a).toFixed(2)}"><title>${escapeHtml(state.tokens[t])} → ${escapeHtml(state.tokens[j])}: ${a.toFixed(3)}</title></path>`;
  });
  const selfLoop = `<circle cx="${centre(t)}" cy="${height - 10}" r="${(3 + 10 * weights[t]).toFixed(1)}" fill="#087f78" fill-opacity="${(0.15 + 0.85 * weights[t]).toFixed(2)}"><title>self: ${weights[t].toFixed(3)}</title></circle>`;
  const svg = `<svg width="${n * TOKEN_WIDTH}" height="${height}" viewBox="0 0 ${n * TOKEN_WIDTH} ${height}" aria-label="Attention from the start codon">${arcs}${selfLoop}</svg>`;
  const tokens = state.tokens.map((codon, i) => {
    const [kind, label] = tokenKind(codon);
    const bases = [...codon].map((b, k) => `<button data-i="${i}" data-k="${k}" title="mutate base ${k + 1}">${b}</button>`).join("");
    return `<div class="token ${kind} ${i === t ? "target" : ""} ${state.edited.has(i) ? "edited" : ""}" style="width:70px">` +
      `<div class="bases">${bases}</div><span class="kind">${label}</span><span class="weight">${weights[i].toFixed(3)}</span><span class="pos">pos ${i}</span></div>`;
  }).join("");
  $("sequence").innerHTML = `${svg}<div class="token-row">${tokens}</div>`;
  $("sequence").querySelectorAll(".bases button").forEach(button => button.addEventListener("click", () => {
    const i = Number(button.dataset.i), k = Number(button.dataset.k), codon = [...state.tokens[i]];
    codon[k] = BASES[(BASES.indexOf(codon[k]) + 1) % BASES.length];
    state.tokens[i] = codon.join("");
    state.edited.add(i);
    renderSequenceViews();
  }));
}

function renderPrediction() {
  const ex = state.test[state.example];
  const parts = Object.keys(state.models).map(key => {
    const f = currentForward(key), m = state.models[key];
    return `<span><b>${MODEL_LABEL[key]}</b>${m.steps ? "" : " (untrained)"}: p(true start) = ${f.p.toFixed(3)} <span class="bar"><i style="width:${(f.p * 100).toFixed(1)}%"></i></span></span>`;
  });
  const warning = state.tokens[ex.target] !== "WXV" ? `<span class="warn">The framed position no longer holds WXV; the model still reads it out there.</span>` : "";
  const truth = state.edited.size ? `<span>Original example: ${ex.category}${ex.variant ? ` (${ex.variant})` : ""}; <b>edited</b></span>`
    : `<span>Category: <b>${ex.category}</b>${ex.variant ? ` (${ex.variant})` : ""} · label ${ex.label ? "true start" : "false start"}</span>`;
  $("prediction").innerHTML = truth + parts.join("") + warning;
}

// ------------------------------------------------------------------------------------------------
// Matrices
// ------------------------------------------------------------------------------------------------
function cellColour(v, max, sequential) {
  const share = Math.min(1, Math.abs(v) / (max || 1));
  if (sequential) return `rgba(8,127,120,${(share * 0.85).toFixed(2)})`;
  return v >= 0 ? `rgba(8,127,120,${(share * 0.75).toFixed(2)})` : `rgba(220,139,66,${(share * 0.75).toFixed(2)})`;
}

function matrixHtml(name, description, M, rowLabels, colLabels, { target = null, sequential = false, wide = false } = {}) {
  const rows = M.map(r => Array.from(r));
  const max = Math.max(...rows.flat().map(Math.abs));
  const head = `<tr><th></th>${colLabels.map(c => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;
  const body = rows.map((row, i) => `<tr class="${i === target ? "target" : ""}"><th>${escapeHtml(rowLabels[i])}</th>${row.map(v =>
    `<td style="background:${cellColour(v, max, sequential)}">${v.toFixed(2)}</td>`).join("")}</tr>`).join("");
  return `<div class="matrix ${wide ? "wide" : ""}"><h3>${name}</h3><p>${description}</p><div class="scroll"><table>${head}${body}</table></div></div>`;
}

function renderMatrices(f) {
  const t = state.test[state.example].target, p = model().params, tokens = state.tokens;
  const dims = ["d1", "d2", "d3", "d4"], labels = tokens.map((c, i) => `${i} ${c}`);
  const positions = usePosition(state.current) ? " + P[i]" : " (positions off)";
  $("matrices").innerHTML = [
    matrixHtml("X", `token embedding${positions}`, f.X, labels, dims, { target: t }),
    matrixHtml("W_Q", "query projection", p.W_Q, dims, dims),
    matrixHtml("W_K", "key projection", p.W_K, dims, dims),
    matrixHtml("W_V", "value projection", p.W_V, dims, dims),
    matrixHtml("Q = X W_Q", "what each token looks for", f.Q, labels, dims, { target: t }),
    matrixHtml("K = X W_K", "what each token offers to be found by", f.K, labels, dims, { target: t }),
    matrixHtml("V = X W_V", "what each token passes on", f.V, labels, dims, { target: t }),
    matrixHtml("S = Q Kᵀ / √d", "scores: row looks at column", f.S, labels, tokens, { target: t, wide: true }),
    matrixHtml("A = softmax(S)", "attention weights (each row sums to 1)", f.A, labels, tokens, { target: t, sequential: true, wide: true }),
    matrixHtml("H = A V", "output of the head", f.H, labels, dims, { target: t }),
    matrixHtml("classifier", `h = H[${t}] · w + b = z = ${f.z.toFixed(3)} → p = σ(z) = ${f.p.toFixed(3)}`,
      [Array.from(f.h), Array.from(p.w)], ["h", "w"], dims),
  ].join("");
}

// ------------------------------------------------------------------------------------------------
// Curves, metrics, results
// ------------------------------------------------------------------------------------------------
function renderMetrics() {
  const m = model(), e = m.evaluation;
  $("steps-value").textContent = String(m.steps);
  $("loss-value").textContent = m.losses.length ? m.losses.at(-1).toFixed(5) : "—";
  $("train-acc").textContent = e ? `${(e.train.overall * 100).toFixed(1)}%` : "—";
  $("test-acc").textContent = e ? `${(e.test.overall * 100).toFixed(1)}%` : "—";
}

function renderCurves() {
  const h = model().history, steps = h.map(r => r.step);
  lineChart($("loss-chart"), [{ label: "training loss", colour: "#087f78", values: h.map(r => r.loss) }],
    { xLabel: "step", yLabel: "training loss", xValues: steps, yRange: [0, Math.max(0.01, ...h.map(r => r.loss)) * 1.05], height: 190 });
  lineChart($("accuracy-chart"), [
    { label: "training accuracy", colour: "#087f78", values: h.map(r => r.train) },
    { label: "test accuracy", colour: "#df8b35", values: h.map(r => r.test) },
  ], { xLabel: "step (teal: training, orange: test)", yLabel: "accuracy", xValues: steps, yRange: [0, 1.02], height: 190 });
}

function pct(v) {
  return v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`;
}

function renderResults() {
  const cats = [...state.data.categories, "overall"], nb = state.data.models;
  const live = key => state.models[key].evaluation;
  let html = `<thead><tr><th rowspan="2">Category</th><th colspan="2">This page: positions on</th><th colspan="2">This page: positions off</th><th colspan="2">Notebook 04a (test)</th></tr>
    <tr><th>train</th><th>test</th><th>train</th><th>test</th><th>on</th><th>off</th></tr></thead><tbody>`;
  cats.forEach(c => {
    html += `<tr><td>${c}</td>` +
      ["with_position", "no_position"].map(k => `<td>${pct(live(k)?.train[c])}</td><td><b>${pct(live(k)?.test[c])}</b></td>`).join("") +
      `<td>${pct(nb.with_position.accuracy.test[c])}</td><td>${pct(nb.no_position.accuracy.test[c])}</td></tr>`;
  });
  $("category-table").innerHTML = html + "</tbody>";

  const crit = state.data.criterion;
  const on = live("with_position")?.test.misplaced_rbs, off = live("no_position")?.test.misplaced_rbs;
  const liveVerdict = on === undefined || off === undefined
    ? "Train <b>both</b> models (switch the positional embeddings off and train again) to test it on this page."
    : `This page (on: ${state.models.with_position.steps} steps, off: ${state.models.no_position.steps} steps): on ${pct(on)}, off ${pct(off)} → ` +
      `<b class="${on >= 0.9 && off <= 0.5 ? "holds" : "fails"}">${on >= 0.9 && off <= 0.5 ? "holds" : "fails"}</b>. The notebook trained each model for ${state.data.config.steps} steps.`;
  $("criterion").innerHTML = `<b>Prediction (fixed before training):</b> on test sequences with a misplaced RBS, the model with positions
    reaches ≥ 90% and the model without positions ≤ 50%. Notebook 04a: on ${pct(crit.with_position)}, off ${pct(crit.no_position)} →
    <b class="${crit.holds ? "holds" : "fails"}">${crit.holds ? "holds" : "fails"}</b>. ${liveVerdict}`;
}

function renderControls() {
  const busy = state.busy, m = model();
  ["train-btn", "step-btn", "reset-btn", "positions", "init", "seed", "example", "restore-btn"].forEach(id => { $(id).disabled = busy; });
  const status = $("model-status");
  status.className = `status ${busy ? "busy" : m.steps ? "good" : ""}`;
  if (!busy) status.textContent = `${MODEL_LABEL[state.current]} · ${m.steps ? "trained" : "untrained"}`;
}

function renderSequenceViews() {
  const f = currentForward();
  renderSequence(f);
  renderPrediction();
  renderMatrices(f);
}

function renderAll() {
  renderControls();
  renderMetrics();
  renderCurves();
  renderSequenceViews();
  renderResults();
}

// ------------------------------------------------------------------------------------------------
// Start-up
// ------------------------------------------------------------------------------------------------
function prepare(examples) {
  return examples.map(e => ({ ...e, ids: e.tokens.map(c => state.tokenId.get(c)) }));
}

async function init() {
  try {
    const [data, language] = await Promise.all([loadJSON("mini-transcripts.json"), loadJSON("language.json")]);
    state.data = data;
    state.markers = new Set(language.genes.map(g => g.marker.replaceAll("Z", "V")));
  } catch (error) {
    $("error").innerHTML = `<div class="error-box">${escapeHtml(error.message)}</div>`;
    return;
  }
  const c = state.data.config;
  state.config = { vocabularySize: state.data.vocabulary.length, d: c.d, maxLen: c.max_len, initStd: c.init_std };
  state.tokenId = new Map(state.data.vocabulary.map((t, i) => [t, i]));
  state.train = prepare(state.data.train);
  state.test = prepare(state.data.test);
  $("learning-rate").value = c.learning_rate;
  $("data-description").textContent = `${state.train.length} training and ${state.test.length} test mini-transcripts · d = ${c.d} · ` +
    `notebook: learning rate ${c.learning_rate}, ${c.steps} steps`;

  // Checks at start-up: finite-difference gradients, and the JS forward pass on the notebook's weights.
  const checks = ["with_position", "no_position"].map(k => AT.gradientCheck(state.train.slice(0, 5), state.config, usePosition(k)));
  const worst = Math.max(...checks.map(r => r.maxError)), passed = checks.every(r => r.passed);
  $("gradient-status").textContent = `Gradient check ${passed ? "passed" : "FAILED"} · ${worst.toExponential(1)}`;
  $("gradient-status").className = `status ${passed ? "good" : "bad"}`;
  $("gradient-status").title = `Central differences on all ${checks[0].checked} parameters, positions on and off.`;
  const parity = ["with_position", "no_position"].map(k =>
    AT.parityCheck(AT.paramsFromJSON(state.data.models[k].trained), state.test, state.data.parity[k], usePosition(k)));
  const parityOk = parity.every(r => r.passed), maxDiff = Math.max(...parity.flatMap(r => [r.maxLogit, r.maxAttention]));
  $("parity-status").textContent = `JS = NumPy ${parityOk ? "✓" : "✗"} · max |Δ| ${maxDiff.toExponential(1)}`;
  $("parity-status").className = `status ${parityOk ? "good" : "bad"}`;
  $("parity-status").title = "The JavaScript forward pass on the notebook's trained weights, compared with the logits and attention rows computed by NumPy, for all 300 test sequences and both models.";
  state.checks = { gradient: checks, parity };

  $("example").innerHTML = state.test.map((e, i) => `<option value="${i}">#${i} ${e.category}${e.variant ? ` (${e.variant})` : ""}</option>`).join("");
  const firsts = state.data.categories.map(cat => state.test.findIndex(e => e.category === cat));
  state.example = firsts[0];
  $("example").value = String(state.example);

  state.models = { with_position: newModel("with_position"), no_position: newModel("no_position") };
  $("positions").addEventListener("change", event => { state.current = event.target.value; renderAll(); });
  ["init", "seed"].forEach(id => $(id).addEventListener("change", () => {
    state.models = { with_position: newModel("with_position"), no_position: newModel("no_position") };
    renderAll();
  }));
  $("train-btn").addEventListener("click", () => train(Math.max(1, Math.min(10000, Math.trunc(Number($("steps").value)) || 500))));
  $("step-btn").addEventListener("click", () => train(1));
  $("reset-btn").addEventListener("click", reset);
  $("example").addEventListener("change", event => loadExample(Number(event.target.value)));
  $("restore-btn").addEventListener("click", () => loadExample(state.example));

  const py = state.data.metadata.source;
  attachCodeView($("editor-panel"), () => jsSource(AT.forward, AT.embed));
  attachCodeView($("matrices-panel"), () => [...jsSource(AT.forward), ...pythonSource("forward and training", py)]);
  attachCodeView($("curves-panel"), () => [...jsSource(AT.trainStep, AT.lossAndGradients), ...pythonSource("forward_backward and train_model", py)]);
  attachCodeView($("results-panel"), () => jsSource(AT.evaluate, AT.gradientCheck, AT.parityCheck));

  loadExample(state.example);
  renderAll();
  window.labB = { state, train, reset, AT };
}

init();
