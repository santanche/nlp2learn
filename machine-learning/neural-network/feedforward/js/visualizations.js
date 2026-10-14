window.Lab = window.Lab || {};
Lab.escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
Lab.renderLossChart = function(model, horizontal=false) {
  const svg = document.getElementById("loss-chart"), w = 720, h = horizontal ? 430 : 190, left = 54, right = 18, top = 16, bottom = 34; let history = model.lossHistory;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  if (!history.length) history = [Lab.datasetLoss(model)];
  let values = history.length > 120 ? history.filter((_, i) => i % Math.ceil(history.length / 120) === 0 || i === history.length - 1) : history;
  const max = Math.max(...values, 1e-6), min = Math.min(...values, 0), x = i => left + i / Math.max(1, values.length - 1) * (w - left - right), y = v => top + (max - v) / Math.max(1e-6, max - min) * (h - top - bottom);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  svg.innerHTML = `<line class="gridline" x1="${left}" y1="${top}" x2="${w-right}" y2="${top}"/><line class="gridline" x1="${left}" y1="${(top+h-bottom)/2}" x2="${w-right}" y2="${(top+h-bottom)/2}"/><line class="axis" x1="${left}" y1="${top}" x2="${left}" y2="${h-bottom}"/><line class="axis" x1="${left}" y1="${h-bottom}" x2="${w-right}" y2="${h-bottom}"/><polyline points="${points}" fill="none" stroke="#087f78" stroke-width="2.5"/><text x="${left-8}" y="${top+4}" text-anchor="end">${max.toFixed(2)}</text><text x="${left-8}" y="${h-bottom+4}" text-anchor="end">${min.toFixed(2)}</text><text x="${(left+w-right)/2}" y="${h-7}" text-anchor="middle">Epoch</text><text x="15" y="${h/2}" transform="rotate(-90 15 ${h/2})" text-anchor="middle">Training loss</text><text x="${w-right}" y="${h-bottom+20}" text-anchor="end">${model.updates} updates</text>`;
};
Lab.renderLatent = function(model, selected, onSelect, onArbitrary) {
  const svg = document.getElementById("latent-chart"), w = 680, h = 430, pad = { l: 58, r: 26, t: 30, b: 50 }, coords = Lab.trainingIndices.map(i => ({ index: i, z: Lab.forward(model, Lab.oneHotInputs[i]).z }));
  let minX = Math.min(...coords.map(c => c.z[0])), maxX = Math.max(...coords.map(c => c.z[0])), minY = Math.min(...coords.map(c => c.z[1])), maxY = Math.max(...coords.map(c => c.z[1]));
  const dx = Math.max(0.5, maxX - minX) * .18, dy = Math.max(.5, maxY - minY) * .18; minX -= dx; maxX += dx; minY -= dy; maxY += dy;
  const sx = x => pad.l + (x - minX) / (maxX - minX) * (w - pad.l - pad.r), sy = y => h - pad.b - (y - minY) / (maxY - minY) * (h - pad.t - pad.b);
  let content = `<rect class="plot-hit" x="${pad.l}" y="${pad.t}" width="${w-pad.l-pad.r}" height="${h-pad.t-pad.b}"/>`;
  for (let i=0;i<=4;i++) { const xx=pad.l+i*(w-pad.l-pad.r)/4, yy=pad.t+i*(h-pad.t-pad.b)/4, vx=minX+i*(maxX-minX)/4, vy=maxY-i*(maxY-minY)/4; content += `<line class="gridline" x1="${xx}" y1="${pad.t}" x2="${xx}" y2="${h-pad.b}"/><text x="${xx}" y="${h-pad.b+18}" text-anchor="middle">${vx.toFixed(2)}</text><line class="gridline" x1="${pad.l}" y1="${yy}" x2="${w-pad.r}" y2="${yy}"/><text x="${pad.l-8}" y="${yy+4}" text-anchor="end">${vy.toFixed(2)}</text>`; }
  content += `<line class="axis" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${h-pad.b}"/><line class="axis" x1="${pad.l}" y1="${h-pad.b}" x2="${w-pad.r}" y2="${h-pad.b}"/><text x="${(pad.l+w-pad.r)/2}" y="${h-8}" text-anchor="middle">z₁</text><text x="17" y="${h/2}" transform="rotate(-90 17 ${h/2})" text-anchor="middle">z₂</text>`;
  coords.forEach(({index,z})=>{const cx=sx(z[0]),cy=sy(z[1]);content+=`<g class="latent-point" data-index="${index}" tabindex="0" role="button" aria-label="Select ${Lab.words[index]}"><circle class="point ${selected===index?"selected":""}" cx="${cx}" cy="${cy}" r="${selected===index?8:6}"/><text class="point-label" x="${cx+9}" y="${cy-8}">${Lab.words[index]}</text></g>`;});
  svg.innerHTML=content;
  svg.querySelectorAll(".latent-point").forEach(node=>{node.addEventListener("click",e=>{e.stopPropagation();onSelect(+node.dataset.index);});node.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(+node.dataset.index);}});});
  svg.querySelector(".plot-hit").addEventListener("click",e=>{const rect=svg.getBoundingClientRect(), vbX=(e.clientX-rect.left)/rect.width*w, vbY=(e.clientY-rect.top)/rect.height*h; if(vbX<pad.l||vbX>w-pad.r||vbY<pad.t||vbY>h-pad.b)return;onArbitrary([minX+(vbX-pad.l)/(w-pad.l-pad.r)*(maxX-minX),maxY-(vbY-pad.t)/(h-pad.t-pad.b)*(maxY-minY)]);});
};
Lab.renderTarget = function(mode,index) {
  if(mode==="image") return `<div class="pixel-grid">${Lab.imageTargets[index].map(bit=>`<i class="pixel ${bit?"black":"white"}"></i>`).join("")}</div>`;
  return Lab.escape(mode==="autoencoder"?Lab.words[index]:Lab.symbolTargets[index]);
};
Lab.renderExamples = function(model, selected, choose) {
  document.querySelector(".decoder-weight-heading").hidden=!Lab.showDecoderWeights;
  document.getElementById("example-rows").innerHTML=Lab.trainingIndices.map(i=>{const word=Lab.words[i],r=Lab.exampleResult(model,i),correct=model.mode==="image"?r.prediction.every((v,j)=>v===r.target[j]):r.prediction===(model.mode==="autoencoder"?word:Lab.symbolTargets[i]);let pred=model.mode==="image"?`<span class="mini-pixels">${r.prediction.map(v=>`<i class="${v?"on":""}"></i>`).join("")}</span>`:Lab.escape(r.prediction);const decoder=Lab.decoderWeightsForWord(model,i);return `<tr data-index="${i}" class="${selected===i?"selected":""}"><td>${word}</td><td>${Lab.renderTarget(model.mode,i)}</td><td>(${r.z.map(v=>v.toFixed(2)).join(", ")})</td><td class="decoder-weight-cell" ${Lab.showDecoderWeights?"":"hidden"}>${decoder}</td><td>${pred}</td><td class="${correct?"correct":"incorrect"}">${correct?"Correct":"Incorrect"}</td></tr>`;}).join("");
  document.querySelectorAll("#example-rows tr").forEach(row=>row.addEventListener("click",()=>choose(+row.dataset.index)));
};
Lab.decoderWeightsForWord = function(model,index) {
  const pairs=[];
  if(model.mode==="autoencoder") pairs.push(`${Lab.words[index]}: (${model.decoder[index][0].toFixed(2)}, ${model.decoder[index][1].toFixed(2)})`);
  else if(model.mode==="symbol") Lab.symbolTargets[index].split("").forEach((symbol,pos)=>{const output=pos*8+Lab.symbols.indexOf(symbol);pairs.push(`p${pos+1} ${Lab.escape(symbol)}: (${model.decoder[output][0].toFixed(2)}, ${model.decoder[output][1].toFixed(2)})`);});
  else Lab.imageTargets[index].forEach((bit,pixel)=>pairs.push(`p${pixel+1}${bit?"*":"_"}: (${model.decoder[pixel][0].toFixed(2)}, ${model.decoder[pixel][1].toFixed(2)})`));
  return pairs.join(" · ");
};
Lab.renderDistribution = function(output, labels=Lab.words) {return `<div class="distribution">${output.map((p,i)=>`<div class="prob-row"><span>${Lab.escape(labels[i])}</span><span class="bar"><i style="width:${(p*100).toFixed(1)}%"></i></span><span>${p.toFixed(3)}</span></div>`).join("")}</div>`;};
Lab.renderOutput = function(model,index) {
  const r=Lab.exampleResult(model,index), mode=model.mode; let detail="";
  if(mode==="autoencoder") detail=`<div class="target-prediction"><div class="output-card"><h3>Input / target</h3><div class="big-output">${Lab.words[index]}</div></div><div class="output-card"><h3>Reconstructed word</h3><div class="big-output">${Lab.escape(r.prediction)}</div><b class="${r.prediction===Lab.words[index]?"correct":"incorrect"}">${r.prediction===Lab.words[index]?"Correct":"Incorrect"}</b></div></div><h3>Probability for each word</h3>${Lab.renderDistribution(r.output)}`;
  if(mode==="symbol") detail=`<div class="target-prediction"><div class="output-card"><h3>Target symbols</h3><div class="big-output">${Lab.symbolTargets[index]}</div></div><div class="output-card"><h3>Predicted symbols</h3><div class="big-output">${Lab.escape(r.prediction)}</div><b class="${r.prediction===Lab.symbolTargets[index]?"correct":"incorrect"}">${r.prediction===Lab.symbolTargets[index]?"Correct":"Incorrect"}</b></div></div><div class="inspect-grid"><div><h3>Position 1 probabilities</h3>${Lab.renderDistribution(r.output.slice(0,8),Lab.symbols)}</div><div><h3>Position 2 probabilities</h3>${Lab.renderDistribution(r.output.slice(8,16),Lab.symbols)}</div></div>`;
  if(mode==="image") {const pixelGrid=(values,binary)=>`<div class="pixel-grid">${values.map(v=>`<i class="pixel ${((binary?v>=.5:v)?"black":"white")}"></i>`).join("")}</div>`;const correct=r.prediction.reduce((n,v,j)=>n+ +(v===r.target[j]),0);detail=`<div class="target-prediction"><div class="output-card"><h3>Target image</h3>${pixelGrid(r.target,true)}</div><div class="output-card"><h3>Predicted image</h3>${pixelGrid(r.output,false)}<b class="${correct===9?"correct":"incorrect"}">${correct===9?"Exact image":"Not an exact image"}</b></div></div><p class="note">Pixel accuracy: ${correct}/9 (${(correct/9*100).toFixed(1)}%) · Example loss: ${r.loss.toFixed(4)}</p><h3>Pixel probabilities (row-major)</h3><div class="pixel-prob">${r.output.map(v=>v.toFixed(2)).join(" · ")}</div>`;}
  document.getElementById("output-detail").innerHTML=detail;
};
Lab.renderInspector = function(model,index,onSelectWord) {
  const pass=Lab.forward(model,Lab.oneHotInputs[index]), target=Lab.targetFor(model.mode,index), config=Lab.modeInfo[model.mode];
  document.getElementById("architecture").innerHTML=`<div class="layer"><b>Input</b>8 one-hot values</div><div class="layer"><b>Encoder · tanh</b>8 → 2</div><div class="layer"><b>Latent</b>2 values</div><div class="layer"><b>Decoder</b>2 → ${config.outputSize}</div><div class="layer"><b>${config.kind}</b>${model.mode==="image"?"9 pixel probabilities":model.mode==="symbol"?"2 × 8 symbol probabilities":"8 word probabilities"}</div>`;
  document.getElementById("forward-inspector").innerHTML=`<p class="explain-onehot">The input is one-hot, so the encoder selects column ${index+1} of Wₑ for <b>${Lab.words[index]}</b>; the bias is then added.</p><div class="codebox">Input x:     [${pass.input.join(", ")}]
Encoder a:   [${pass.encoderPre.map(v=>v.toFixed(4)).join(", ")}]
Embedding z: [${pass.z.map(v=>v.toFixed(4)).join(", ")}]
Decoder a:   [${pass.decoderPre.map(v=>v.toFixed(3)).join(", ")}]
Output:      [${pass.output.map(v=>v.toFixed(3)).join(", ")}]
Target:      [${target.join(", ")}]
Example loss: ${Lab.lossFor(model.mode,pass.output,target).toFixed(5)}</div>`;
  document.getElementById("weight-inspector").innerHTML=`<div class="codebox">Wₑ (2 × 8)
${model.encoder.map(row=>"["+row.map(v=>v.toFixed(2)).join(", ")+"]").join("\n")}
bₑ [${model.encoderBias.map(v=>v.toFixed(2)).join(", ")}]

W_d (${config.outputSize} × 2)
${model.decoder.map(row=>"["+row.map(v=>v.toFixed(2)).join(", ")+"]").join("\n")}
b_d [${model.decoderBias.map(v=>v.toFixed(2)).join(", ")}]</div>`;
  Lab.renderNetworkDiagram(model,index,pass,onSelectWord);
};
Lab.renderNetworkDiagram = function(model,index,pass,onSelectWord) {
  const svg=document.getElementById("network-diagram"), inputX=130, latentX=490, outputX=825, yTop=58, yBottom=548;
  const spread=(count)=>count===1?[305]:Array.from({length:count},(_,i)=>yTop+i*(yBottom-yTop)/(count-1));
  const shownInputIndices=Lab.trainingIndices, inputYs=spread(shownInputIndices.length), inputYByWord=new Map(shownInputIndices.map((wordIndex,yIndex)=>[wordIndex,inputYs[yIndex]])), hiddenYs=spread(2);
  let shownOutputIndices=Array.from({length:Lab.modeInfo[model.mode].outputSize},(_,i)=>i);
  if(model.mode==="autoencoder") shownOutputIndices=Lab.trainingIndices.slice();
  if(model.mode==="symbol"&&Lab.trainingIndices.length<Lab.words.length) shownOutputIndices=[...new Set(Lab.trainingIndices.flatMap(wordIndex=>Lab.symbolTargets[wordIndex].split("").map((symbol,pos)=>pos*8+Lab.symbols.indexOf(symbol))))].sort((a,b)=>a-b);
  const outputYs=spread(shownOutputIndices.length);
  const outputLabels=model.mode==="autoencoder"?shownOutputIndices.map(i=>Lab.words[i]):model.mode==="symbol"?shownOutputIndices.map(i=>`${i<8?"1":"2"}:${Lab.symbols[i%8]}`):shownOutputIndices.map(i=>`p${i+1}`);
  const esc=Lab.escape;
  const edges=[];
  let maxInputContribution=0,maxOutputContribution=0;
  model.encoder.forEach(row=>shownInputIndices.forEach(i=>{maxInputContribution=Math.max(maxInputContribution,Math.abs(row[i]*pass.input[i]));}));
  shownOutputIndices.forEach(o=>model.decoder[o].forEach((weight,h)=>{maxOutputContribution=Math.max(maxOutputContribution,Math.abs(weight*pass.z[h]));}));
  const edgeMarkup=(x1,y1,x2,y2,value,max)=>{const strength=Math.abs(value),ratio=max?strength/max:0;return `<line class="diagram-edge ${value<0?"negative":"positive"}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${(.45+2.5*ratio).toFixed(2)}" stroke-opacity="${(.07+.78*ratio).toFixed(2)}"><title>Weighted contribution: ${value.toFixed(4)}</title></line>`;};
  model.encoder.forEach((row,h)=>shownInputIndices.forEach(i=>edges.push(edgeMarkup(inputX+11,inputYByWord.get(i),latentX-12,hiddenYs[h],row[i]*pass.input[i],maxInputContribution))));
  shownOutputIndices.forEach((o,visibleIndex)=>model.decoder[o].forEach((weight,h)=>edges.push(edgeMarkup(latentX+12,hiddenYs[h],outputX-11,outputYs[visibleIndex],weight*pass.z[h],maxOutputContribution))));
  let nodes="";
  shownInputIndices.forEach((wordIndex,visibleIndex)=>{const value=pass.input[wordIndex], y=inputYs[visibleIndex], opacity=value?1:.08;nodes+=`<g class="diagram-word-node" data-index="${wordIndex}" tabindex="0" role="button" aria-label="Select ${Lab.words[wordIndex]}"><circle class="diagram-node ${value?"":"inactive"}" cx="${inputX}" cy="${y}" r="10" fill="#168c7e" fill-opacity="${opacity}"/><text class="diagram-label" x="${inputX-18}" y="${y+4}" text-anchor="end">${Lab.words[wordIndex]}</text><text class="diagram-value" x="${inputX}" y="${y+25}" text-anchor="middle">${value.toFixed(0)}</text></g>`;});
  pass.z.forEach((value,i)=>{const opacity=.12+.82*Math.abs(value),negative=value<0;nodes+=`<circle class="diagram-node ${negative?"negative-node":""}" cx="${latentX}" cy="${hiddenYs[i]}" r="13" fill="${negative?"#dc8b42":"#168c7e"}" fill-opacity="${opacity.toFixed(2)}"/><text class="diagram-value" x="${latentX}" y="${hiddenYs[i]+31}" text-anchor="middle">${value.toFixed(3)}</text>`;});
  shownOutputIndices.forEach((outputIndex,visibleIndex)=>{const value=pass.output[outputIndex],binary=model.mode==="image",fill=binary?(value>=.5?"#172b3a":"#fff"):"#168c7e",opacity=binary?1:(.08+.9*value);nodes+=`<circle class="diagram-node" cx="${outputX}" cy="${outputYs[visibleIndex]}" r="${model.mode==="symbol"?8.5:10}" fill="${fill}" fill-opacity="${opacity.toFixed(2)}"/><text class="diagram-label" x="${outputX+17}" y="${outputYs[visibleIndex]+4}">${esc(outputLabels[visibleIndex])}</text><text class="diagram-value" x="${outputX+110}" y="${outputYs[visibleIndex]+4}">${value.toFixed(2)}</text>`;});
  const cardinalOnly=Lab.trainingIndices.length<Lab.words.length, inputHeading=cardinalOnly?`INPUT · ${shownInputIndices.length} WORDS`:`INPUT · ${shownInputIndices.length}`;
  const outputHeading=model.mode==="autoencoder"?`WORDS · ${shownOutputIndices.length}/${Lab.modeInfo[model.mode].outputSize}`:model.mode==="symbol"?`SYMBOLS · ${shownOutputIndices.length}/${Lab.modeInfo[model.mode].outputSize}`:`PIXELS · ${shownOutputIndices.length}`;
  svg.innerHTML=`<text class="diagram-layer-label" x="${inputX}" y="25" text-anchor="middle">${inputHeading}</text><text class="diagram-layer-label" x="${latentX}" y="25" text-anchor="middle">TANH · 2</text><text class="diagram-layer-label" x="${outputX}" y="25" text-anchor="middle">${outputHeading}</text>${edges.join("")}${nodes}`;
  svg.querySelectorAll(".diagram-word-node").forEach(node=>{node.addEventListener("click",()=>onSelectWord(+node.dataset.index));node.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelectWord(+node.dataset.index);}});});
};
