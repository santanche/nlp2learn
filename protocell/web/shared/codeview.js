// "Code" view: every panel can show the code that produced it.
// Live computations show the JavaScript function itself (fn.toString()); replayed results show the Python
// source stored in the data file's metadata.
import { escapeHtml } from "./data.js";

export function jsSource(...functions) {
  return functions.map(fn => ({ title: `${fn.name} (JavaScript, runs in this page)`, code: fn.toString() }));
}

export function pythonSource(title, code) {
  return [{ title: `${title} (Python, from the notebook)`, code }];
}

// panel: a .panel element containing a button.code-toggle and a div.code-view.
// getSources: () => [{title, code}], called each time the view opens, so it always shows the current code.
export function attachCodeView(panel, getSources) {
  const button = panel.querySelector(".code-toggle");
  const view = panel.querySelector(".code-view");
  button.addEventListener("click", () => {
    const opening = view.hidden;
    view.hidden = !opening;
    button.setAttribute("aria-pressed", String(opening));
    button.textContent = opening ? "Hide code" : "Code";
    if (opening) {
      view.innerHTML = getSources()
        .map(s => `<h4>${escapeHtml(s.title)}</h4><pre class="codebox">${escapeHtml(s.code)}</pre>`)
        .join("");
    }
  });
}
