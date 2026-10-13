window.Lab = window.Lab || {};
Lab.init = function() {
  let mode="autoencoder", selected=0, busy=false, arbitrary=null;
  const models={};
  const getModel=()=>models[mode];
  function update() {
    const model=getModel(), info=Lab.modeInfo[mode], performance=Lab.performance(model);
    document.getElementById("mode-description").textContent=info.description;
    const status=document.getElementById("model-status"); status.textContent=busy?"Training":model.trained?"Trained":"Untrained"; status.className=`status ${busy?"training":model.trained?"trained":""}`;
    document.getElementById("loss-value").textContent=Lab.datasetLoss(model).toFixed(4);
    document.getElementById("exact-value").textContent=`${performance.exact}/8 (${(performance.exactRate*100).toFixed(0)}%)`;
    document.getElementById("extra-label").textContent=mode==="image"?"Pixel accuracy":mode==="symbol"?"Character accuracy":"Model updates";
    document.getElementById("extra-value").textContent=mode==="autoencoder"?String(model.updates):`${(performance.auxiliaryRate*100).toFixed(1)}%`;
    document.getElementById("selected-word-label").textContent=Lab.words[selected];
    const coords=Lab.forward(model,Lab.oneHotInputs[selected]).z;
    document.getElementById("selected-coords").textContent=`z₁ ${coords[0].toFixed(3)} · z₂ ${coords[1].toFixed(3)}`;
    const predictionStatus=document.getElementById("prediction-status"), result=Lab.exampleResult(model,selected), target=mode==="autoencoder"?Lab.words[selected]:mode==="symbol"?Lab.symbolTargets[selected]:Lab.imageTargets[selected];
    const correct=mode==="image"?result.prediction.every((v,i)=>v===target[i]):result.prediction===target;
    predictionStatus.textContent=model.trained?(correct?"Correct":"Incorrect"):"Untrained";predictionStatus.className=`status ${model.trained?(correct?"trained":""):""}`;
    Lab.renderLossChart(model); Lab.renderLatent(model,selected,index=>{selected=index;arbitrary=null;update();},decodeArbitrary);
    Lab.renderExamples(model,selected,index=>{selected=index;arbitrary=null;update();});
    Lab.renderOutput(model,selected); Lab.renderInspector(model,selected);
    const train=document.getElementById("train-btn"), step=document.getElementById("step-btn"), reset=document.getElementById("reset-btn");train.disabled=step.disabled=reset.disabled=busy;
  }
  function decodeArbitrary(z) {
    const model=getModel(), logits=model.decoder.map((row,i)=>row[0]*z[0]+row[1]*z[1]+model.decoderBias[i]);
    const output=mode==="image"?logits.map(Lab.sigmoid):mode==="symbol"?[...Lab.softmax(logits.slice(0,8)),...Lab.softmax(logits.slice(8,16))]:Lab.softmax(logits);
    const prediction=Lab.prediction(mode,output);let html=`z = (${z.map(v=>v.toFixed(3)).join(", ")}) · `;
    if(mode==="autoencoder")html+=`most likely word: <b>${Lab.escape(prediction)}</b> <span class="muted">(${(Math.max(...output)*100).toFixed(1)}%)</span>`;
    else if(mode==="symbol")html+=`decoded symbols: <b>${Lab.escape(prediction)}</b>`;
    else html+=`decoded image ${output.map(v=>v>=.5?"■":"□").join(" ")} · probabilities ${output.map(v=>v.toFixed(2)).join(" ")}`;
    document.getElementById("arbitrary-output").innerHTML=html;
  }
  document.querySelectorAll(".mode-tab").forEach(button=>button.addEventListener("click",()=>{
    if(busy)return;mode=button.dataset.mode;document.querySelectorAll(".mode-tab").forEach(tab=>{const active=tab===button;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active));});
    if(!models[mode])models[mode]=Lab.createModel(mode,document.getElementById("seed").value);arbitrary=null;update();
  }));
  document.getElementById("step-btn").addEventListener("click",()=>{Lab.trainStep(getModel(),rate());update();});
  document.getElementById("train-btn").addEventListener("click",async()=>{busy=true;update();const count=Math.max(1,Math.min(10000,Number(document.getElementById("epochs").value)||100));await Lab.trainMany(getModel(),count,rate(),update);busy=false;update();});
  document.getElementById("reset-btn").addEventListener("click",()=>{models[mode]=Lab.createModel(mode,document.getElementById("seed").value);arbitrary=null;update();});
  function rate(){return Math.max(.0001,Math.min(2,Number(document.getElementById("learning-rate").value)||.05));}
  document.getElementById("seed").addEventListener("change",()=>{if(!busy){models[mode]=Lab.createModel(mode,document.getElementById("seed").value);update();}});
  document.getElementById("learning-rate").addEventListener("change",()=>{const n=Number(document.getElementById("learning-rate").value);if(!Number.isFinite(n)||n<=0)document.getElementById("learning-rate").value="0.05";});
  models[mode]=Lab.createModel(mode,document.getElementById("seed").value);
  const checkResults=Object.keys(Lab.modeInfo).flatMap(task=>Lab.gradientCheck(task));
  const maxError=Math.max(...checkResults.map(result=>result.relativeError));
  document.getElementById("extra-value").title=`Gradient check maximum relative error: ${maxError.toExponential(2)}`;
  update();
};
document.addEventListener("DOMContentLoaded",Lab.init);
