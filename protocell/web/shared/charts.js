// SVG charts written by hand: a line chart, a 2D scatter and a rotatable 3D scatter.
// Points: {id, label, colour, shape: "circle" | "square", coords: [x, y] or [x, y, z]}.
import { escapeHtml } from "./data.js";

const NS = "http://www.w3.org/2000/svg";

function extent(values, padShare = 0.08) {
  let min = Math.min(...values), max = Math.max(...values);
  if (!Number.isFinite(min)) { min = 0; max = 1; }
  if (max - min < 1e-9) { min -= 1; max += 1; }
  const pad = (max - min) * padShare;
  return [min - pad, max + pad];
}

// ------------------------------------------------------------------------------------------------
// Line chart. series: [{label, colour, values: [y0, y1, …], dash?}]; x is the index + xOffset, or xValues[index].
// highlight: an index to mark with a vertical band.
// ------------------------------------------------------------------------------------------------
export function lineChart(svg, series, { xLabel = "", yLabel = "", xOffset = 1, xValues = null, yRange = null, highlight = null, width = 640, height = 220 } = {}) {
  const xName = i => (xValues ? xValues[i] : i + xOffset);
  const pad = { l: 62, r: 16, t: 14, b: 40 };
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const all = series.flatMap(s => s.values);
  if (!all.length) {
    svg.innerHTML = `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" class="chart-empty">No epochs yet: press Train or Step.</text>`;
    return;
  }
  const n = Math.max(...series.map(s => s.values.length));
  const [ymin, ymax] = yRange || extent(all);
  const x = i => pad.l + (n === 1 ? 0.5 : i / (n - 1)) * (width - pad.l - pad.r);
  const y = v => pad.t + (ymax - v) / (ymax - ymin) * (height - pad.t - pad.b);

  let out = "";
  for (let g = 0; g <= 4; g++) {
    const v = ymin + g * (ymax - ymin) / 4;
    out += `<line class="gridline" x1="${pad.l}" x2="${width - pad.r}" y1="${y(v)}" y2="${y(v)}"/>`;
    out += `<text class="tick" x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(4)}</text>`;
  }
  const step = Math.max(1, Math.ceil(n / 10));
  for (let i = 0; i < n; i += step) {
    out += `<text class="tick" x="${x(i)}" y="${height - pad.b + 16}" text-anchor="middle">${xName(i)}</text>`;
  }
  if (highlight !== null) out += `<line x1="${x(highlight)}" x2="${x(highlight)}" y1="${pad.t}" y2="${height - pad.b}" stroke="#df8b35" stroke-width="10" stroke-opacity="0.18"/>`;
  out += `<line class="axis" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${height - pad.b}"/>`;
  out += `<line class="axis" x1="${pad.l}" y1="${height - pad.b}" x2="${width - pad.r}" y2="${height - pad.b}"/>`;
  series.forEach(s => {
    const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    out += `<polyline points="${points}" fill="none" stroke="${s.colour}" stroke-width="2.5"${s.dash ? ' stroke-dasharray="6 4"' : ""}/>`;
    s.values.forEach((v, i) => { out += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${s.colour}"><title>${escapeHtml(s.label)} · ${xName(i)}: ${v.toFixed(5)}</title></circle>`; });
  });
  out += `<text class="axis-label" x="${(pad.l + width - pad.r) / 2}" y="${height - 6}" text-anchor="middle">${escapeHtml(xLabel)}</text>`;
  out += `<text class="axis-label" x="14" y="${height / 2}" transform="rotate(-90 14 ${height / 2})" text-anchor="middle">${escapeHtml(yLabel)}</text>`;
  svg.innerHTML = out;
}

// ------------------------------------------------------------------------------------------------
// Shared point drawing (used by the 2D and 3D scatters).
// ------------------------------------------------------------------------------------------------
function pointMarkup(p, cx, cy, selected, radius = 6) {
  const r = selected ? radius + 2.5 : radius;
  if (p.shape === "star") {
    const points = Array.from({ length: 10 }, (_, k) => {
      const radius = k % 2 ? r * 0.75 : r * 1.9, angle = -Math.PI / 2 + k * Math.PI / 5;
      return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(" ");
    return `<g class="scatter-point" data-id="${escapeHtml(p.id)}"><polygon points="${points}" fill="${p.colour}" stroke="#172b3a" stroke-width="1.5"/>` +
      `<text class="point-label" x="${cx + 2 * r}" y="${cy + 3.5}">${escapeHtml(p.label)}</text><title>${escapeHtml(p.title || p.label)}</title></g>`;
  }
  const shape = p.shape === "square"
    ? `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="${p.colour}" class="point${selected ? " selected" : ""}"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.colour}" class="point${selected ? " selected" : ""}"/>`;
  return `<g class="scatter-point" data-id="${escapeHtml(p.id)}" tabindex="0" role="button" aria-label="${escapeHtml(p.label)}">` +
    `${shape}<text class="point-label" x="${cx + r + 2}" y="${cy + 3.5}">${escapeHtml(p.label)}</text><title>${escapeHtml(p.title || p.label)}</title></g>`;
}

function bindSelection(svg, onSelect) {
  svg.querySelectorAll(".scatter-point").forEach(node => {
    node.addEventListener("click", event => { event.stopPropagation(); onSelect?.(node.dataset.id); });
    node.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(node.dataset.id); }
    });
  });
}

function linesMarkup(lines, position) {
  return lines.map(([a, b, cls]) => {
    if (!position[a] || !position[b]) return "";
    const [x1, y1] = position[a], [x2, y2] = position[b];
    return `<line class="pair-line ${cls || ""}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join("");
}

// ------------------------------------------------------------------------------------------------
// 2D scatter. lines: [[idA, idB, cssClass]].
// ------------------------------------------------------------------------------------------------
export function scatter2d(svg, points, { lines = [], selected = null, onSelect = null, xLabel = "dimension 1", yLabel = "dimension 2", width = 720, height = 520 } = {}) {
  const pad = { l: 52, r: 40, t: 16, b: 40 };
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const [xmin, xmax] = extent(points.map(p => p.coords[0]));
  const [ymin, ymax] = extent(points.map(p => p.coords[1]));
  const sx = v => pad.l + (v - xmin) / (xmax - xmin) * (width - pad.l - pad.r);
  const sy = v => height - pad.b - (v - ymin) / (ymax - ymin) * (height - pad.t - pad.b);

  let out = "";
  for (let g = 0; g <= 4; g++) {
    const gx = pad.l + g * (width - pad.l - pad.r) / 4, gy = pad.t + g * (height - pad.t - pad.b) / 4;
    out += `<line class="gridline" x1="${gx}" x2="${gx}" y1="${pad.t}" y2="${height - pad.b}"/>`;
    out += `<line class="gridline" x1="${pad.l}" x2="${width - pad.r}" y1="${gy}" y2="${gy}"/>`;
    out += `<text class="tick" x="${gx}" y="${height - pad.b + 15}" text-anchor="middle">${(xmin + g * (xmax - xmin) / 4).toFixed(2)}</text>`;
    out += `<text class="tick" x="${pad.l - 6}" y="${gy + 4}" text-anchor="end">${(ymax - g * (ymax - ymin) / 4).toFixed(2)}</text>`;
  }
  if (xmin < 0 && xmax > 0) out += `<line class="axis zero" x1="${sx(0)}" x2="${sx(0)}" y1="${pad.t}" y2="${height - pad.b}"/>`;
  if (ymin < 0 && ymax > 0) out += `<line class="axis zero" x1="${pad.l}" x2="${width - pad.r}" y1="${sy(0)}" y2="${sy(0)}"/>`;

  const position = Object.fromEntries(points.map(p => [p.id, [sx(p.coords[0]), sy(p.coords[1])]]));
  out += linesMarkup(lines, position);
  // Draw the selected point last so it sits on top.
  [...points].sort((a, b) => (a.id === selected) - (b.id === selected))
    .forEach(p => { out += pointMarkup(p, ...position[p.id], p.id === selected); });
  out += `<text class="axis-label" x="${(pad.l + width - pad.r) / 2}" y="${height - 6}" text-anchor="middle">${escapeHtml(xLabel)}</text>`;
  out += `<text class="axis-label" x="13" y="${height / 2}" transform="rotate(-90 13 ${height / 2})" text-anchor="middle">${escapeHtml(yLabel)}</text>`;
  svg.innerHTML = out;
  bindSelection(svg, onSelect);
}

// ------------------------------------------------------------------------------------------------
// 3D scatter: drag to rotate. Points are rotated (yaw, then pitch) and drawn with a simple perspective.
// ------------------------------------------------------------------------------------------------
export function createScatter3d(svg, { width = 720, height = 520 } = {}) {
  let yaw = 0.6, pitch = -0.35, last = null, state = null;

  function rotate([x, y, z]) {
    const x1 = x * Math.cos(yaw) - z * Math.sin(yaw), z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
    const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    return [x1, y2, z2];
  }

  function draw() {
    if (!state) return;
    const { points, lines, selected, onSelect } = state;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    // Centre and scale the cloud so it fits whatever the rotation.
    const centre = [0, 1, 2].map(j => points.reduce((s, p) => s + p.coords[j], 0) / points.length);
    const radius = Math.max(1e-9, ...points.map(p => Math.hypot(...p.coords.map((v, j) => v - centre[j]))));
    const scale = 0.42 * Math.min(width, height);        // pixels per unit of the normalised cloud
    const project = coords => {
      const [x, y, z] = rotate(coords.map((v, j) => (v - centre[j]) / radius));   // now within the unit ball
      const perspective = 1 / (1 + 0.35 * z);
      return [width / 2 + x * scale * perspective, height / 2 - y * scale * perspective, z];
    };
    let out = "";
    // Axes of the embedding space, through the cloud's centre.
    ["d1", "d2", "d3"].forEach((name, j) => {
      const tip = centre.map((v, k) => v + (k === j ? radius : 0));
      const [x0, y0] = project(centre), [x1, y1] = project(tip);
      out += `<line class="axis3d" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/><text class="tick" x="${x1}" y="${y1}">${name}</text>`;
    });
    const projected = points.map(p => ({ p, xyz: project(p.coords) }));
    const position = Object.fromEntries(projected.map(({ p, xyz }) => [p.id, xyz]));
    out += linesMarkup(lines, position);
    projected.sort((a, b) => b.xyz[2] - a.xyz[2]);      // far points first
    projected.forEach(({ p, xyz }) => { out += pointMarkup(p, xyz[0], xyz[1], p.id === selected, 5.5); });
    out += `<text class="axis-label" x="${width - 10}" y="${height - 10}" text-anchor="end">drag to rotate</text>`;
    svg.innerHTML = out;
    bindSelection(svg, onSelect);
  }

  svg.addEventListener("pointerdown", event => { last = [event.clientX, event.clientY]; svg.setPointerCapture(event.pointerId); });
  svg.addEventListener("pointermove", event => {
    if (!last) return;
    yaw += (event.clientX - last[0]) * 0.01;
    pitch = Math.max(-1.5, Math.min(1.5, pitch + (event.clientY - last[1]) * 0.01));
    last = [event.clientX, event.clientY];
    draw();
  });
  svg.addEventListener("pointerup", () => { last = null; });

  return {
    update(points, { lines = [], selected = null, onSelect = null } = {}) {
      state = { points, lines, selected, onSelect };
      draw();
    },
    // Stop reacting to drags (when the same SVG is used for a 2D chart).
    deactivate() { state = null; },
  };
}

// Heat map of a matrix with values in [0, 1] (attention weights), drawn on a canvas so that 220 × 220 stays fast.
// highlightRow: a row to outline.
export function heatmapCanvas(canvas, matrix, { highlightRow = null, size = 440 } = {}) {
  const n = matrix.length, cell = size / n;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = matrix[i][j];
      if (v <= 0.002) continue;
      ctx.fillStyle = `rgba(8,127,120,${Math.min(1, Math.sqrt(v)).toFixed(3)})`;     // sqrt: small weights stay visible
      ctx.fillRect(j * cell, i * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
  if (highlightRow !== null) {
    ctx.strokeStyle = "#b8433c";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, highlightRow * cell, size, Math.max(cell, 2));
  }
}

export function legendMarkup(entries) {
  return entries.map(([label, colour, shape]) =>
    `<span class="legend-item"><i class="swatch ${shape === "square" ? "square" : ""}" style="background:${colour}"></i>${escapeHtml(label)}</span>`).join("");
}

export { NS };
