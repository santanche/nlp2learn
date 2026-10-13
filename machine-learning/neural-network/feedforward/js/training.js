window.Lab = window.Lab || {};
Lab.trainMany = async function(model, count, rate, onProgress) {
  for (let epoch = 0; epoch < count; epoch++) {
    Lab.trainStep(model, rate);
    if ((epoch + 1) % 10 === 0 || epoch === count - 1) { onProgress(); await new Promise(resolve => setTimeout(resolve, 0)); }
  }
};
Lab.performance = function(model) {
  let exact = 0, auxiliary = 0, total = Lab.words.length * (model.mode === "image" ? 9 : model.mode === "symbol" ? 2 : 1);
  Lab.words.forEach((_, i) => {
    const result = Lab.exampleResult(model, i);
    if (model.mode === "image") { const correct = result.prediction.reduce((n, bit, j) => n + +(bit === result.target[j]), 0); auxiliary += correct; exact += +(correct === 9); }
    else if (model.mode === "symbol") { const chars = result.prediction.split(""); const expected = Lab.symbolTargets[i].split(""); const correct = chars.reduce((n, char, j) => n + +(char === expected[j]), 0); auxiliary += correct; exact += +(correct === 2); }
    else exact += +(result.prediction === Lab.words[i]);
  });
  return { exact, exactRate: exact / Lab.words.length, auxiliaryRate: model.mode === "image" ? auxiliary / total : model.mode === "symbol" ? auxiliary / total : null };
};
