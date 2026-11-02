// Forward pass of the notebook 04b encoder, in plain JavaScript (float64).
// It mirrors the PyTorch classes SelfAttention, Block and Encoder line by line (design-spec §4.7):
//   x = tok_emb[ids] (+ pos_emb[0:n])
//   per block:  x = x + Attn(LN1(x));  x = x + FF2(ReLU(FF1(LN2(x))))
//   final = LN_final(x)   — the contextual vector of every token;  logits = head(final)
// Linear layers store W as (out, in), exactly as PyTorch does, so a layer computes y = x Wᵀ + b.

// Named tensors from the JSON (nested lists) → arrays of Float64Array rows (2-D) or a Float64Array (1-D).
export function loadWeights(weights) {
  const out = {};
  for (const [name, value] of Object.entries(weights)) {
    out[name] = Array.isArray(value[0]) ? value.map(row => Float64Array.from(row)) : Float64Array.from(value);
  }
  return out;
}

// y[i] = x[i] Wᵀ + b, for every row i.
export function linear(x, W, b) {
  return x.map(row => {
    const y = new Float64Array(W.length);
    for (let o = 0; o < W.length; o++) {
      let sum = b[o];
      const w = W[o];
      for (let k = 0; k < row.length; k++) sum += row[k] * w[k];
      y[o] = sum;
    }
    return y;
  });
}

// LayerNorm over the features of each row (biased variance, as in PyTorch).
export function layerNorm(x, gamma, beta, eps) {
  return x.map(row => {
    const n = row.length;
    let mean = 0;
    for (const v of row) mean += v;
    mean /= n;
    let variance = 0;
    for (const v of row) variance += (v - mean) ** 2;
    variance /= n;
    const scale = 1 / Math.sqrt(variance + eps);
    return Float64Array.from(row, (v, k) => (v - mean) * scale * gamma[k] + beta[k]);
  });
}

export const relu = x => x.map(row => row.map(v => Math.max(0, v)));

function softmax(values) {
  let max = -Infinity;
  for (const v of values) if (v > max) max = v;
  const exps = values.map(v => (v === -Infinity ? 0 : Math.exp(v - max)));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / total);
}

// Multi-head self-attention of one block. Returns the block's attention output and the weights per head.
export function selfAttention(a, W, prefix, config) {
  const n = a.length, d = config.d_model, heads = config.n_heads, dHead = d / heads;
  const qkv = linear(a, W[`${prefix}attn.qkv.weight`], W[`${prefix}attn.qkv.bias`]);   // n × 3d: [Q | K | V]
  const weights = [];
  const mixed = Array.from({ length: n }, () => new Float64Array(d));
  for (let h = 0; h < heads; h++) {
    const q = i => qkv[i].subarray(h * dHead, (h + 1) * dHead);
    const k = j => qkv[j].subarray(d + h * dHead, d + (h + 1) * dHead);
    const v = j => qkv[j].subarray(2 * d + h * dHead, 2 * d + (h + 1) * dHead);
    const headWeights = [];
    for (let i = 0; i < n; i++) {
      const qi = q(i), scores = new Array(n);
      for (let j = 0; j < n; j++) {
        if (config.causal && j > i) { scores[j] = -Infinity; continue; }      // a token cannot see its right
        const kj = k(j);
        let s = 0;
        for (let c = 0; c < dHead; c++) s += qi[c] * kj[c];
        scores[j] = s / Math.sqrt(dHead);
      }
      const row = softmax(scores);
      headWeights.push(row);
      for (let j = 0; j < n; j++) {
        if (row[j] === 0) continue;
        const vj = v(j);
        for (let c = 0; c < dHead; c++) mixed[i][h * dHead + c] += row[j] * vj[c];
      }
    }
    weights.push(headWeights);
  }
  return { output: linear(mixed, W[`${prefix}attn.out.weight`], W[`${prefix}attn.out.bias`]), weights };
}

// ids: token ids of one sequence ([CLS] … [EOS], no padding). config: the "config" block of encoder-<name>.json.
export function encoderForward(W, config, ids) {
  const eps = config.layer_norm_eps;
  let x = ids.map((id, i) => Float64Array.from(W["tok_emb.weight"][id], (v, k) => v + (config.use_position ? W["pos_emb.weight"][i][k] : 0)));
  const embeddings = x;
  const layers = [];
  for (let l = 0; l < config.n_layers; l++) {
    const p = `blocks.${l}.`;
    const attended = selfAttention(layerNorm(x, W[`${p}ln1.weight`], W[`${p}ln1.bias`], eps), W, p, config);
    x = x.map((row, i) => row.map((v, k) => v + attended.output[i][k]));
    const hidden = relu(linear(layerNorm(x, W[`${p}ln2.weight`], W[`${p}ln2.bias`], eps), W[`${p}ff1.weight`], W[`${p}ff1.bias`]));
    const ff = linear(hidden, W[`${p}ff2.weight`], W[`${p}ff2.bias`]);
    x = x.map((row, i) => row.map((v, k) => v + ff[i][k]));
    layers.push({ attention: attended.weights, output: x });
  }
  const final = layerNorm(x, W["ln_final.weight"], W["ln_final.bias"], eps);
  return { embeddings, layers, final };
}

// Masked-token prediction: a probability over the vocabulary for every position.
export function predictTokens(W, final) {
  return linear(final, W["head.weight"], W["head.bias"]).map(row => softmax(Array.from(row)));
}

// Parity check: the JS forward pass on the final snapshot vs the values PyTorch computed (parity-tests.json).
export function parityCheck(encoderJson, parity, tolerance) {
  const snapshot = encoderJson.snapshots.find(s => s.epoch === parity.epoch);
  const W = loadWeights(snapshot.weights);
  let maxFinal = 0, maxAttention = 0;
  for (const test of parity.tests) {
    const f = encoderForward(W, encoderJson.config, test.ids);
    f.final.forEach((row, i) => row.forEach((v, k) => { maxFinal = Math.max(maxFinal, Math.abs(v - test.final[i][k])); }));
    f.layers[0].attention.forEach((head, h) => head.forEach((row, i) => row.forEach((v, j) => {
      maxAttention = Math.max(maxAttention, Math.abs(v - test.attention_layer0[h][i][j]));
    })));
  }
  return { maxFinal, maxAttention, tests: parity.tests.length, passed: maxFinal <= tolerance && maxAttention <= tolerance };
}
