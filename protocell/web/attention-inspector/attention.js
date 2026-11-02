// One attention head, by hand — the same maths as notebook 04a (design-spec §4.6).
//   X = E[tokens] (+ P[0:n]);  Q = X W_Q, K = X W_K, V = X W_V;  S = Q Kᵀ/√d;  A = softmax(S);  H = A V
//   h = H[t] (t = the WXV token);  z = w·h + b;  p = σ(z);  loss = mean binary cross-entropy
import { createRng } from "../shared/rng.js";

export const PARAM_NAMES = ["E", "P", "W_Q", "W_K", "W_V", "w", "b"];

// ------------------------------------------------------------------------------------------------
// Small helpers. Vectors are Float64Arrays; matrices are arrays of Float64Array rows.
// ------------------------------------------------------------------------------------------------
const zeros = (rows, cols) => Array.from({ length: rows }, () => new Float64Array(cols));

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// Row vector times matrix: x (length r) · M (r × c).
function vecMat(x, M) {
  const out = new Float64Array(M[0].length);
  for (let i = 0; i < x.length; i++) for (let j = 0; j < out.length; j++) out[j] += x[i] * M[i][j];
  return out;
}

const matmul = (A, M) => A.map(row => vecMat(row, M));

export function sigmoid(x) {
  return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
}

function softplus(x) {          // log(1 + e^x) without overflow
  return x > 0 ? x + Math.log1p(Math.exp(-x)) : Math.log1p(Math.exp(x));
}

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / total);
}

// ------------------------------------------------------------------------------------------------
// Parameters
// ------------------------------------------------------------------------------------------------
export function createParams(seed, { vocabularySize, d, maxLen, initStd }) {
  const rng = createRng(seed);
  const randomMatrix = (rows, cols) => Array.from({ length: rows }, () => Float64Array.from({ length: cols }, () => rng.normal() * initStd));
  return {
    E: randomMatrix(vocabularySize, d),        // token embeddings
    P: randomMatrix(maxLen, d),                // position embeddings
    W_Q: randomMatrix(d, d),
    W_K: randomMatrix(d, d),
    W_V: randomMatrix(d, d),
    w: Float64Array.from({ length: d }, () => rng.normal() * initStd),   // classifier weights
    b: new Float64Array(1),                                               // classifier bias
  };
}

// Weights exported by the notebook (nested lists) → the same structure.
export function paramsFromJSON(json) {
  const matrix = m => m.map(row => Float64Array.from(row));
  return { E: matrix(json.E), P: matrix(json.P), W_Q: matrix(json.W_Q), W_K: matrix(json.W_K), W_V: matrix(json.W_V),
           w: Float64Array.from(json.w), b: Float64Array.of(json.b) };
}

function zerosLike(params) {
  return { E: zeros(params.E.length, params.w.length), P: zeros(params.P.length, params.w.length),
           W_Q: zeros(params.w.length, params.w.length), W_K: zeros(params.w.length, params.w.length),
           W_V: zeros(params.w.length, params.w.length), w: new Float64Array(params.w.length), b: new Float64Array(1) };
}

// Every number of every parameter, as [array, index] handles (used by the update and the gradient check).
function entries(params) {
  const out = [];
  PARAM_NAMES.forEach(name => {
    const value = params[name];
    if (value instanceof Float64Array) value.forEach((_, i) => out.push([name, value, i]));
    else value.forEach((row, r) => row.forEach((_, i) => out.push([`${name}[${r}]`, row, i])));
  });
  return out;
}

// ------------------------------------------------------------------------------------------------
// Forward pass of one sequence, keeping every tensor for display.
// ------------------------------------------------------------------------------------------------
export function embed(params, ids, usePosition) {
  return ids.map((id, i) => Float64Array.from(params.E[id], (v, k) => v + (usePosition ? params.P[i][k] : 0)));
}

export function forward(params, ids, target, usePosition) {
  const d = params.w.length;
  const X = embed(params, ids, usePosition);
  const Q = matmul(X, params.W_Q), K = matmul(X, params.W_K), V = matmul(X, params.W_V);
  const S = Q.map(q => K.map(k => dot(q, k) / Math.sqrt(d)));
  const A = S.map(softmax);
  const H = A.map(a => {
    const row = new Float64Array(d);
    a.forEach((weight, j) => { for (let k = 0; k < d; k++) row[k] += weight * V[j][k]; });
    return row;
  });
  const h = H[target];
  const z = dot(h, params.w) + params.b[0];
  return { X, Q, K, V, S, A, H, h, z, p: sigmoid(z) };
}

// ------------------------------------------------------------------------------------------------
// Loss and gradients over a set of sequences (full batch), computing only the WXV row as the loss needs.
// Each line mirrors the table "Gradients by hand" in notebook 04a.
// ------------------------------------------------------------------------------------------------
export function lossAndGradients(params, examples, usePosition) {
  const d = params.w.length, n = examples.length, scale = 1 / Math.sqrt(d);
  const g = zerosLike(params);
  let loss = 0;
  for (const ex of examples) {
    const t = ex.target, X = embed(params, ex.ids, usePosition);
    const K = matmul(X, params.W_K), V = matmul(X, params.W_V);
    const q = vecMat(X[t], params.W_Q);
    const a = softmax(K.map(k => dot(q, k) * scale));
    const h = new Float64Array(d);
    a.forEach((weight, j) => { for (let k = 0; k < d; k++) h[k] += weight * V[j][k]; });
    const z = dot(h, params.w) + params.b[0];
    loss += ex.label ? softplus(-z) : softplus(z);

    const dz = (sigmoid(z) - ex.label) / n;                         // ∂ℓ/∂z
    g.b[0] += dz;
    for (let k = 0; k < d; k++) g.w[k] += dz * h[k];                // ∂w = h ∂z
    const dh = params.w.map(wk => dz * wk);                         // ∂h = ∂z w
    const da = V.map(v => dot(v, dh));                              // ∂a_j = v_j · ∂h
    const mean = dot(a, da);
    const ds = a.map((aj, j) => aj * (da[j] - mean));               // softmax Jacobian
    const dq = new Float64Array(d);
    ds.forEach((dsj, j) => { for (let k = 0; k < d; k++) dq[k] += dsj * K[j][k] * scale; });

    for (let j = 0; j < X.length; j++) {
      const dK = q.map(qk => ds[j] * qk * scale);                   // ∂k_j = ∂s_j q/√d
      const dV = dh.map(x => a[j] * x);                             // ∂v_j = a_j ∂h
      const dX = new Float64Array(d);
      for (let r = 0; r < d; r++) {
        for (let c = 0; c < d; c++) {
          g.W_K[r][c] += X[j][r] * dK[c];
          g.W_V[r][c] += X[j][r] * dV[c];
          dX[r] += dK[c] * params.W_K[r][c] + dV[c] * params.W_V[r][c];
          if (j === t) {
            g.W_Q[r][c] += X[t][r] * dq[c];
            dX[r] += dq[c] * params.W_Q[r][c];
          }
        }
      }
      const id = ex.ids[j];
      for (let k = 0; k < d; k++) {
        g.E[id][k] += dX[k];
        if (usePosition) g.P[j][k] += dX[k];
      }
    }
  }
  return { loss: loss / n, grads: g };
}

// One step of full-batch gradient descent. Returns the loss before the update (as the notebook records it).
export function trainStep(params, examples, usePosition, learningRate) {
  const { loss, grads } = lossAndGradients(params, examples, usePosition);
  const update = entries(params), step = entries(grads);
  update.forEach(([, array, i], k) => { array[i] -= learningRate * step[k][1][step[k][2]]; });
  return loss;
}

// Accuracy (threshold p ≥ 0.5, i.e. z ≥ 0), overall and per category.
export function evaluate(params, examples, usePosition, categories) {
  const hits = {}, totals = {};
  let correct = 0;
  for (const ex of examples) {
    const { z } = forward(params, ex.ids, ex.target, usePosition);
    const ok = (z >= 0) === (ex.label === 1);
    correct += ok;
    hits[ex.category] = (hits[ex.category] || 0) + ok;
    totals[ex.category] = (totals[ex.category] || 0) + 1;
  }
  const perCategory = Object.fromEntries(categories.map(c => [c, totals[c] ? hits[c] / totals[c] : null]));
  return { overall: correct / examples.length, ...perCategory };
}

// ------------------------------------------------------------------------------------------------
// Checks
// ------------------------------------------------------------------------------------------------

// Central differences on every parameter, as in notebook 04a.
export function gradientCheck(examples, config, usePosition, seed = 7) {
  const params = createParams(seed, config), epsilon = 1e-5;
  const { grads } = lossAndGradients(params, examples, usePosition);
  const analytic = entries(grads);
  let worst = 0;
  entries(params).forEach(([, array, i], k) => {
    const original = array[i];
    array[i] = original + epsilon; const plus = lossAndGradients(params, examples, usePosition).loss;
    array[i] = original - epsilon; const minus = lossAndGradients(params, examples, usePosition).loss;
    array[i] = original;
    const numeric = (plus - minus) / (2 * epsilon), a = analytic[k][1][analytic[k][2]];
    worst = Math.max(worst, Math.abs(numeric - a) / Math.max(Math.abs(numeric) + Math.abs(a), 1e-6));
  });
  return { maxError: worst, checked: analytic.length, passed: worst < 1e-5 };
}

// The JS forward pass on the notebook's trained weights vs the logits and attention rows the notebook computed.
export function parityCheck(params, examples, expected, usePosition) {
  let maxLogit = 0, maxAttention = 0;
  examples.forEach((ex, i) => {
    const f = forward(params, ex.ids, ex.target, usePosition);
    maxLogit = Math.max(maxLogit, Math.abs(f.z - expected.logits[i]));
    f.A[ex.target].forEach((v, j) => { maxAttention = Math.max(maxAttention, Math.abs(v - expected.attention[i][j])); });
  });
  return { maxLogit, maxAttention, passed: maxLogit <= 1e-9 && maxAttention <= 1e-9 };
}
