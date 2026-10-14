window.Lab = window.Lab || {};
Lab.words = ["north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest"];
Lab.symbols = ["|", "^", "v", "-", ">", "<", "/", "\\"];
Lab.symbolTargets = ["|^", "|v", "->", "<-", "/^", "^\\", "\\v", "v/"];
Lab.imagePatterns = [
  ["***", "_*_", "___"], ["___", "_*_", "***"], ["__*", "_**", "__*"], ["*__", "**_", "*__"],
  ["_**", "_**", "___"], ["**_", "**_", "___"], ["___", "_**", "_**"], ["___", "**_", "**_"]
];
Lab.oneHotInputs = Lab.words.map((_, index) => Lab.words.map((__, i) => +(i === index)));
Lab.imageTargets = Lab.imagePatterns.map(rows => rows.join("").split("").map(pixel => +(pixel === "*")));
Lab.trainingIndices = Lab.words.map((_, index) => index);
