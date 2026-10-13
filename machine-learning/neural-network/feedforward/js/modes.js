window.Lab = window.Lab || {};
Lab.modeInfo = {
  autoencoder: { name: "Autoencoder", description: "Reconstruct the input word. The model must preserve enough information in two numbers to identify one of the eight words.", outputSize: 8, kind: "softmax", groups: [8] },
  symbol: { name: "Symbol translator", description: "Translate each word into its specified two-character direction symbol. Each character position has its own eight-symbol probability distribution.", outputSize: 16, kind: "grouped-softmax", groups: [8, 8] },
  image: { name: "Image translator", description: "Translate each word into its exact 3 × 3 black-and-white direction image. Each output is a pixel probability trained with binary cross-entropy.", outputSize: 9, kind: "sigmoid", groups: [9] }
};
Lab.targetFor = function(mode, index) {
  if (mode === "autoencoder") return Lab.oneHotInputs[index].slice();
  if (mode === "symbol") return Lab.symbolTargets[index].split("").map(char => Lab.symbols.indexOf(char));
  return Lab.imageTargets[index].slice();
};
Lab.targetLabel = function(mode, index) {
  if (mode === "autoencoder") return Lab.words[index];
  if (mode === "symbol") return Lab.symbolTargets[index];
  return Lab.imagePatterns[index];
};
