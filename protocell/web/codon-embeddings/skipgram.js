// Skip-gram with negative sampling — the same algorithm as notebook 03b (design-spec §4.4):
// positive (target, context) pairs within ±k, 5 fresh negatives per positive from the unigram^¾ noise,
// mini-batch SGD with the per-sample gradients of a batch summed into W and U.
import { createRng, categoricalSampler } from "../shared/rng.js";

export const TRAINING = { negatives: 5, batchSize: 1024, initStd: 0.1, noisePower: 0.75 };

// ------------------------------------------------------------------------------------------------
// Corpus
// ------------------------------------------------------------------------------------------------

// sample: genome-sample.json. kind: "dna" | "shuffled" | "mixed". Returns a list of codon sequences.
export function buildCorpus(sample, kind, nGenomes) {
  const genomes = sample.genomes.filter(g => g.genome_id < nGenomes).map(g => g.codon);
  if (kind === "dna") return genomes;
  if (kind === "shuffled") return sample.shuffled.filter(g => g.genome_id < nGenomes).map(g => g.codon);
  const transcripts = sample.transcripts.filter(t => t.genome_id < nGenomes).map(t => t.codon);
  return genomes.concat(transcripts);           // mixed: DNA and RNA spellings, not normalised
}

// Canonical order (as in 03b): the 64 DNA codons, then the RNA forms with V; only tokens that occur.
export function buildVocabulary(sequences, allCodons) {
  const seen = new Set(sequences.flat());
  const order = allCodons.concat(allCodons.filter(c => c.includes("Z")).map(c => c.replaceAll("Z", "V")));
  return order.filter(c => seen.has(c));
}

// Every (target, context) pair within ±halfWindow; windows never cross from one sequence into the next.
export function buildPairs(sequences, index, halfWindow) {
  const targets = [], contexts = [];
  for (const sequence of sequences) {
    const ids = sequence.map(c => index.get(c));
    for (let i = 0; i < ids.length; i++) {
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(ids.length - 1, i + halfWindow); j++) {
        if (j !== i) { targets.push(ids[i]); contexts.push(ids[j]); }
      }
    }
  }
  return { targets: Int32Array.from(targets), contexts: Int32Array.from(contexts) };
}

// Noise distribution for negatives: P(c) ∝ count(c)^¾.
export function noiseDistribution(sequences, index, size) {
  const counts = new Float64Array(size);
  sequences.forEach(s => s.forEach(c => { counts[index.get(c)] += 1; }));
  const weights = Array.from(counts, n => n ** TRAINING.noisePower);
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / total);
}

export function prepareData(sample, settings, allCodons) {
  const sequences = buildCorpus(sample, settings.corpus, settings.nGenomes);
  const vocabulary = buildVocabulary(sequences, allCodons);
  const index = new Map(vocabulary.map((c, i) => [c, i]));
  const pairs = buildPairs(sequences, index, settings.halfWindow);
  const noise = noiseDistribution(sequences, index, vocabulary.length);
  return { sequences, vocabulary, index, pairs, noise, tokens: sequences.reduce((n, s) => n + s.length, 0) };
}

// ------------------------------------------------------------------------------------------------
// Model
// ------------------------------------------------------------------------------------------------

export function createModel(vocabularySize, dim, seed) {
  const rng = createRng(seed);
  const init = () => Array.from({ length: vocabularySize }, () => Float64Array.from({ length: dim }, () => rng.normal() * TRAINING.initStd));
  const W = init();      // target vectors: the embeddings
  const U = init();      // context vectors
  return { W, U, dim, rng, seed, epochs: 0, lossHistory: [] };
}

export function sigmoid(x) {
  return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
}

// log(1 + e^x), computed without overflow.
export function softplus(x) {
  return x > 0 ? x + Math.log1p(Math.exp(-x)) : Math.log1p(Math.exp(x));
}

// Forward pass for one pair: score s = w_t · u_c, probability σ(s), and the loss for both labels.
export function pairForward(model, t, c) {
  let score = 0;
  for (let j = 0; j < model.dim; j++) score += model.W[t][j] * model.U[c][j];
  return { w: model.W[t], u: model.U[c], score, probability: sigmoid(score), lossIfObserved: softplus(-score), lossIfNegative: softplus(score) };
}

// ------------------------------------------------------------------------------------------------
// Training
// ------------------------------------------------------------------------------------------------

const pause = () => new Promise(resolve => setTimeout(resolve, 0));
const YIELD_EVERY = 250000;      // samples between pauses while an epoch is being prepared

// One epoch's samples: all positives (label 1) plus `negatives` fresh random contexts per positive (label 0),
// in random order. Large corpora have millions of samples, so this pauses now and then for the browser.
export async function makeEpochSamples(model, data) {
  const { targets: pt, contexts: pc } = data.pairs;
  const k = TRAINING.negatives, n = pt.length * (1 + k);
  const targets = new Int32Array(n), contexts = new Int32Array(n), labels = new Uint8Array(n);
  const drawNoise = categoricalSampler(data.noise);
  for (let i = 0; i < pt.length; i++) {
    targets[i] = pt[i]; contexts[i] = pc[i]; labels[i] = 1;
  }
  for (let i = 0; i < pt.length * k; i++) {
    const at = pt.length + i;
    targets[at] = pt[Math.floor(i / k)];
    contexts[at] = drawNoise(model.rng.next());
    if (i % YIELD_EVERY === YIELD_EVERY - 1) await pause();
  }
  // Fisher–Yates shuffle of the three arrays together.
  for (let i = n - 1; i > 0; i--) {
    const j = model.rng.integer(i + 1);
    let tmp = targets[i]; targets[i] = targets[j]; targets[j] = tmp;
    tmp = contexts[i]; contexts[i] = contexts[j]; contexts[j] = tmp;
    tmp = labels[i]; labels[i] = labels[j]; labels[j] = tmp;
    if (i % YIELD_EVERY === 0) await pause();
  }
  return { targets, contexts, labels };
}

// Gradients of the summed loss over samples[start, end), all computed from the current weights.
// Loss per sample: −y log σ(s) − (1 − y) log(1 − σ(s)); its gradient is (σ(s) − y)·u_c for w_t
// and (σ(s) − y)·w_t for u_c.
export function batchGradients(model, samples, start, end) {
  const { dim, W, U } = model;
  const size = end - start;
  const gradW = new Float64Array(size * dim), gradU = new Float64Array(size * dim);
  let loss = 0;
  for (let i = 0; i < size; i++) {
    const t = samples.targets[start + i], c = samples.contexts[start + i], y = samples.labels[start + i];
    let score = 0;
    for (let j = 0; j < dim; j++) score += W[t][j] * U[c][j];
    loss += y ? softplus(-score) : softplus(score);
    const error = sigmoid(score) - y;
    for (let j = 0; j < dim; j++) {
      gradW[i * dim + j] = error * U[c][j];
      gradU[i * dim + j] = error * W[t][j];
    }
  }
  return { loss, gradW, gradU };
}

// Summed SGD update: rows that appear several times in the batch receive the sum of their gradients.
export function applyGradients(model, samples, start, end, grads, learningRate) {
  const { dim, W, U } = model;
  for (let i = 0; i < end - start; i++) {
    const t = samples.targets[start + i], c = samples.contexts[start + i];
    for (let j = 0; j < dim; j++) {
      W[t][j] -= learningRate * grads.gradW[i * dim + j];
      U[c][j] -= learningRate * grads.gradU[i * dim + j];
    }
  }
}

// One epoch. Yields to the browser every few batches so the page never freezes.
// Returns the epoch loss: mean cross-entropy over the epoch's samples (training performance).
export async function trainEpoch(model, data, learningRate, onProgress = () => {}) {
  const samples = await makeEpochSamples(model, data);
  const n = samples.targets.length, batch = TRAINING.batchSize;
  let total = 0, batches = 0;
  for (let start = 0; start < n; start += batch) {
    const end = Math.min(n, start + batch);
    const grads = batchGradients(model, samples, start, end);
    applyGradients(model, samples, start, end, grads, learningRate);
    total += grads.loss;
    if (++batches % 40 === 0) {
      onProgress(end / n);
      await pause();
    }
  }
  const loss = total / n;
  model.epochs += 1;
  model.lossHistory.push(loss);
  return loss;
}

// ------------------------------------------------------------------------------------------------
// Gradient check (runs at startup): compares batchGradients with central finite differences of the
// summed loss, for every parameter of a small random model.
// ------------------------------------------------------------------------------------------------
export function gradientCheck(seed = 7) {
  const V = 6, dim = 3, epsilon = 1e-5;
  const model = createModel(V, dim, seed);
  model.W.forEach(row => row.forEach((_, j) => { row[j] *= 10; }));    // larger weights: a sharper test
  model.U.forEach(row => row.forEach((_, j) => { row[j] *= 10; }));
  const samples = {
    targets: Int32Array.from([0, 1, 2, 0, 3, 5, 0]),
    contexts: Int32Array.from([1, 2, 3, 4, 5, 0, 1]),
    labels: Uint8Array.from([1, 1, 0, 0, 1, 0, 0]),
  };
  const n = samples.targets.length;
  const totalLoss = () => batchGradients(model, samples, 0, n).loss;
  const { gradW, gradU } = batchGradients(model, samples, 0, n);

  // Sum the per-sample gradients into one gradient per parameter.
  const analytic = { W: model.W.map(r => new Float64Array(r.length)), U: model.U.map(r => new Float64Array(r.length)) };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < dim; j++) {
      analytic.W[samples.targets[i]][j] += gradW[i * dim + j];
      analytic.U[samples.contexts[i]][j] += gradU[i * dim + j];
    }
  }
  let maxError = 0, checked = 0;
  for (const name of ["W", "U"]) {
    model[name].forEach((row, r) => row.forEach((value, j) => {
      row[j] = value + epsilon; const plus = totalLoss();
      row[j] = value - epsilon; const minus = totalLoss();
      row[j] = value;
      const numeric = (plus - minus) / (2 * epsilon), a = analytic[name][r][j];
      const error = Math.abs(numeric - a) / Math.max(1e-8, Math.abs(numeric) + Math.abs(a));
      maxError = Math.max(maxError, error);
      checked += 1;
    }));
  }
  return { maxError, checked, passed: maxError < 1e-6 };
}
