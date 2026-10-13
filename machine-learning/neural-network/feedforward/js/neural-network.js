window.Lab = window.Lab || {};
Lab.randomGenerator = function(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return function() { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
};
Lab.createModel = function(mode, seed) {
  const config = Lab.modeInfo[mode], random = Lab.randomGenerator(seed);
  const init = (rows, cols) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => (random() * 2 - 1) * 0.35));
  return { mode, encoder: init(2, 8), encoderBias: [0, 0], decoder: init(config.outputSize, 2), decoderBias: Array(config.outputSize).fill(0), trained: false, updates: 0, lossHistory: [] };
};
Lab.sigmoid = x => x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
Lab.softmax = values => { const max = Math.max(...values), exps = values.map(v => Math.exp(v - max)), total = exps.reduce((a, b) => a + b, 0); return exps.map(v => v / total); };
Lab.forward = function(model, input) {
  const encoderPre = model.encoder.map((row, i) => row.reduce((sum, weight, j) => sum + weight * input[j], model.encoderBias[i]));
  const z = encoderPre.map(Math.tanh);
  const decoderPre = model.decoder.map((row, i) => row[0] * z[0] + row[1] * z[1] + model.decoderBias[i]);
  let output;
  if (model.mode === "image") output = decoderPre.map(Lab.sigmoid);
  else if (model.mode === "symbol") output = [...Lab.softmax(decoderPre.slice(0, 8)), ...Lab.softmax(decoderPre.slice(8, 16))];
  else output = Lab.softmax(decoderPre);
  return { input: input.slice(), encoderPre, z, decoderPre, output };
};
Lab.prediction = function(mode, output) {
  if (mode === "autoencoder") return Lab.words[output.indexOf(Math.max(...output))];
  if (mode === "symbol") return [0, 1].map(pos => Lab.symbols[output.slice(pos * 8, pos * 8 + 8).indexOf(Math.max(...output.slice(pos * 8, pos * 8 + 8)))]).join("");
  return output.map(v => +(v >= 0.5));
};
Lab.lossFor = function(mode, output, target) {
  const eps = 1e-12;
  if (mode === "autoencoder") return -Math.log(Math.max(eps, output[target.indexOf(1)]));
  if (mode === "symbol") return target.reduce((loss, symbol, pos) => loss - Math.log(Math.max(eps, output[pos * 8 + symbol])), 0);
  return target.reduce((loss, bit, i) => loss - bit * Math.log(Math.max(eps, output[i])) - (1 - bit) * Math.log(Math.max(eps, 1 - output[i])), 0);
};
Lab.exampleResult = function(model, index) { const pass = Lab.forward(model, Lab.oneHotInputs[index]), target = Lab.targetFor(model.mode, index); return { ...pass, target, loss: Lab.lossFor(model.mode, pass.output, target), prediction: Lab.prediction(model.mode, pass.output) }; };
Lab.datasetLoss = function(model) { return Lab.words.reduce((sum, _, i) => sum + Lab.exampleResult(model, i).loss, 0); };
Lab.zeroGradients = model => ({ encoder: model.encoder.map(row => row.map(() => 0)), encoderBias: [0, 0], decoder: model.decoder.map(row => row.map(() => 0)), decoderBias: model.decoderBias.map(() => 0) });
Lab.gradientsForExample = function(model, input, target) {
  const pass = Lab.forward(model, input), grads = Lab.zeroGradients(model), dz = [0, 0], output = pass.output;
  let dLogits;
  if (model.mode === "image") dLogits = output.map((p, i) => p - target[i]);
  else {
    dLogits = output.slice();
    if (model.mode === "autoencoder") dLogits[target.indexOf(1)] -= 1;
    else target.forEach((symbol, pos) => { dLogits[pos * 8 + symbol] -= 1; });
  }
  dLogits.forEach((delta, i) => { grads.decoderBias[i] = delta; for (let j = 0; j < 2; j++) { grads.decoder[i][j] = delta * pass.z[j]; dz[j] += model.decoder[i][j] * delta; } });
  for (let j = 0; j < 2; j++) {
    const delta = dz[j] * (1 - pass.z[j] * pass.z[j]); grads.encoderBias[j] = delta;
    for (let i = 0; i < 8; i++) grads.encoder[j][i] = delta * input[i];
  }
  return { loss: Lab.lossFor(model.mode, output, target), grads };
};
Lab.trainStep = function(model, learningRate) {
  const grads = Lab.zeroGradients(model);
  Lab.words.forEach((_, index) => {
    const result = Lab.gradientsForExample(model, Lab.oneHotInputs[index], Lab.targetFor(model.mode, index));
    ["encoder", "decoder", "encoderBias", "decoderBias"].forEach(key => {
      if (Array.isArray(grads[key][0])) grads[key].forEach((row, i) => row.forEach((_, j) => { grads[key][i][j] += result.grads[key][i][j] / Lab.words.length; }));
      else grads[key].forEach((_, i) => { grads[key][i] += result.grads[key][i] / Lab.words.length; });
    });
  });
  ["encoder", "decoder", "encoderBias", "decoderBias"].forEach(key => {
    if (Array.isArray(model[key][0])) model[key].forEach((row, i) => row.forEach((_, j) => { model[key][i][j] -= learningRate * grads[key][i][j]; }));
    else model[key].forEach((_, i) => { model[key][i] -= learningRate * grads[key][i]; });
  });
  model.updates++; model.trained = true; const loss = Lab.datasetLoss(model); model.lossHistory.push(loss); return loss;
};
// Relative central-difference check for one encoder and one decoder weight per task.
Lab.gradientCheck = function(mode, seed = 31) {
  const model = Lab.createModel(mode, seed), input = Lab.oneHotInputs[0], target = Lab.targetFor(mode, 0), analytical = Lab.gradientsForExample(model, input, target).grads;
  const checks = [["encoder", 0, 0], ["decoder", 0, 0]], epsilon = 1e-5;
  return checks.map(([key, i, j]) => {
    const original = model[key][i][j]; model[key][i][j] = original + epsilon; const plus = Lab.lossFor(mode, Lab.forward(model, input).output, target);
    model[key][i][j] = original - epsilon; const minus = Lab.lossFor(mode, Lab.forward(model, input).output, target); model[key][i][j] = original;
    const numeric = (plus - minus) / (2 * epsilon), analytic = analytical[key][i][j]; return { parameter: `${key}[${i}][${j}]`, numeric, analytic, relativeError: Math.abs(numeric - analytic) / Math.max(1e-7, Math.abs(numeric) + Math.abs(analytic)) };
  });
};
