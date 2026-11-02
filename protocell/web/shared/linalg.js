// Small vector and matrix helpers. A matrix is an array of rows; each row is an array of numbers.

export function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export function norm(a) {
  return Math.sqrt(dot(a, a));
}

export function addMatrices(A, B) {
  return A.map((row, i) => Array.from(row, (v, j) => v + B[i][j]));
}

// Cosine similarity between every pair of rows: 1 = same direction, 0 = orthogonal.
export function cosineMatrix(rows) {
  const unit = rows.map(row => {
    const n = Math.max(norm(row), 1e-12);
    return Array.from(row, v => v / n);
  });
  return unit.map(a => unit.map(b => dot(a, b)));
}

// The n rows most similar to row i (excluding i itself), as [index, cosine] pairs.
export function nearest(cosine, i, n, allowed = null) {
  return cosine[i]
    .map((value, j) => [j, value])
    .filter(([j]) => j !== i && (!allowed || allowed.has(j)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// Principal component analysis by power iteration on the covariance matrix.
// Returns the rows projected on the first k components, and the share of variance each explains.
export function pca(rows, k = 2) {
  const n = rows.length, d = rows[0].length;
  const mean = Array.from({ length: d }, (_, j) => rows.reduce((s, r) => s + r[j], 0) / n);
  const centred = rows.map(r => Array.from(r, (v, j) => v - mean[j]));
  let cov = Array.from({ length: d }, (_, a) =>
    Array.from({ length: d }, (_, b) => centred.reduce((s, r) => s + r[a] * r[b], 0) / (n - 1)));
  const totalVariance = cov.reduce((s, row, i) => s + row[i], 0);

  const components = [], explained = [];
  for (let c = 0; c < Math.min(k, d); c++) {
    let v = Array.from({ length: d }, (_, j) => 1 / (j + 1 + c));   // fixed start: deterministic result
    let eigenvalue = 0;
    for (let iter = 0; iter < 300; iter++) {
      const w = cov.map(row => dot(row, v));
      eigenvalue = norm(w);
      if (eigenvalue < 1e-15) break;
      v = w.map(x => x / eigenvalue);
    }
    // Sign convention: the largest entry is positive, so the picture does not flip between redraws.
    const big = v.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
    if (big < 0) v = v.map(x => -x);
    components.push(v);
    explained.push(totalVariance > 0 ? eigenvalue / totalVariance : 0);
    cov = cov.map((row, a) => row.map((x, b) => x - eigenvalue * v[a] * v[b]));   // deflation
  }
  const coords = centred.map(r => components.map(v => dot(r, v)));
  return { coords, components, mean, explained };
}
