// Lab C — Context Lab (Phase 4 skeleton): start-up parity check and training replay.
// Phase 5 adds the static view, occurrence clouds, probes, transcript viewer and mutation editor.
import { loadJSON, escapeHtml } from "../shared/data.js";
import { lineChart } from "../shared/charts.js";
import { attachCodeView, jsSource, pythonSource } from "../shared/codeview.js";
import * as ENC from "../shared/encoder.js";

const $ = id => document.getElementById(id);
const CONFIGS = ["full", "no_position", "causal"];
const COLOURS = { full: "#087f78", no_position: "#df8b35", causal: "#7b2cbf" };

const state = { encoders: {}, parity: null, results: {}, current: "full", snapshot: 9 };

function snapshots() {
  return state.encoders[state.current].snapshots;
}

function renderReplay() {
  const all = snapshots(), epochs = all.map(s => s.epoch), chosen = all[state.snapshot];
  $("epoch").max = String(all.length - 1);
  $("epoch-value").textContent = String(chosen.epoch);
  $("train-loss").textContent = chosen.train_loss.toFixed(3);
  $("test-loss").textContent = chosen.test_loss.toFixed(3);
  $("test-acc").textContent = `${(chosen.masked_acc * 100).toFixed(1)}%`;
  // All three configurations on the same axes; the selected one is drawn last (on top).
  const order = [...CONFIGS.filter(c => c !== state.current), state.current];
  const series = (key, testKey) => order.flatMap(c => [
    { label: `${c} training`, colour: COLOURS[c], dash: true, values: state.encoders[c].snapshots.map(s => s[key]) },
    { label: `${c} test`, colour: COLOURS[c], values: state.encoders[c].snapshots.map(s => s[testKey]) },
  ]);
  lineChart($("loss-chart"), series("train_loss", "test_loss"), { xLabel: `epoch (selected: ${chosen.epoch})`, yLabel: "masked-token loss", xValues: epochs, highlight: state.snapshot, height: 240 });
  lineChart($("accuracy-chart"), series("train_masked_acc", "masked_acc"), { xLabel: "epoch · teal full, orange no_position, purple causal", yLabel: "masked-token accuracy", xValues: epochs, highlight: state.snapshot, height: 240,
    yRange: [0, Math.max(...CONFIGS.flatMap(c => state.encoders[c].snapshots.map(s => s.train_masked_acc))) * 1.08] });
}

function renderParity() {
  const rows = CONFIGS.map(c => {
    const r = state.results[c];
    return `<tr><td><b>${c}</b></td><td>${state.parity.configs[c].epoch}</td><td>${r.tests}</td><td>${r.maxFinal.toExponential(1)}</td>` +
      `<td>${r.maxAttention.toExponential(1)}</td><td class="${r.passed ? "pass" : "fail"}">${r.passed ? "pass" : "FAIL"}</td><td>${r.ms.toFixed(0)} ms</td></tr>`;
  }).join("");
  $("parity-table").innerHTML = `<thead><tr><th>Configuration</th><th>Snapshot epoch</th><th>Test transcripts</th><th>max |Δ| final vectors</th>
    <th>max |Δ| layer-0 attention</th><th>Result</th><th>Time</th></tr></thead><tbody>${rows}</tbody>`;
  $("parity-badges").innerHTML = CONFIGS.map(c => {
    const r = state.results[c];
    return `<span class="status ${r.passed ? "good" : "bad"}" title="max |Δ| ${Math.max(r.maxFinal, r.maxAttention).toExponential(1)}">${c} ${r.passed ? "✓" : "✗"}</span>`;
  }).join("");
}

function describe() {
  const c = state.encoders[state.current].config;
  $("config-description").textContent =
    `${c.name}: ${c.n_layers} layers · ${c.n_heads} heads · d_model ${c.d_model} · positions ${c.use_position ? "on" : "off"} · ` +
    `${c.causal ? "causal (left only)" : "bidirectional"} · ${c.train_genomes.length} training / ${c.test_genomes.length} test genomes`;
}

async function init() {
  try {
    const [parity, ...encoders] = await Promise.all([loadJSON("parity-tests.json"), ...CONFIGS.map(c => loadJSON(`encoder-${c}.json`))]);
    state.parity = parity;
    CONFIGS.forEach((c, i) => { state.encoders[c] = encoders[i]; });
  } catch (error) {
    $("error").innerHTML = `<div class="error-box">${escapeHtml(error.message)}</div>`;
    return;
  }
  for (const c of CONFIGS) {
    const started = performance.now();
    state.results[c] = { ...ENC.parityCheck(state.encoders[c], state.parity.configs[c], state.parity.tolerance), ms: performance.now() - started };
  }
  state.snapshot = snapshots().length - 1;
  $("epoch").value = String(state.snapshot);
  ["config", "epoch"].forEach(id => { $(id).disabled = false; });
  $("config").addEventListener("change", event => { state.current = event.target.value; describe(); renderReplay(); });
  $("epoch").addEventListener("input", event => { state.snapshot = Number(event.target.value); renderReplay(); });

  const py = state.encoders.full.metadata.source;
  attachCodeView($("replay-panel"), () => pythonSource("model and train_config (notebook 04b)", py));
  attachCodeView($("parity-panel"), () => jsSource(ENC.parityCheck, ENC.encoderForward, ENC.selfAttention, ENC.layerNorm, ENC.linear));

  describe();
  renderParity();
  renderReplay();
  window.labC = { state, ENC };
}

init();
