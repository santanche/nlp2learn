// Seeded random numbers. The same seed always gives the same sequence, so Reset reproduces a run.
// Generator: mulberry32 (a small, well-tested 32-bit generator).

export function createRng(seed) {
  let state = (Number(seed) >>> 0) || 1;

  // Uniform number in [0, 1).
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Standard normal number (Box–Muller transform).
  function normal() {
    const u = 1 - next();
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Integer in 0 … n−1.
  function integer(n) {
    return Math.floor(next() * n);
  }

  // Fisher–Yates shuffle, in place.
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = integer(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function permutation(n) {
    return shuffle(Array.from({ length: n }, (_, i) => i));
  }

  return { next, normal, integer, shuffle, permutation };
}

// Draws indices with the given probabilities: build the cumulative sum once, then binary-search it.
export function categoricalSampler(probabilities) {
  const cumulative = new Float64Array(probabilities.length);
  let total = 0;
  probabilities.forEach((p, i) => { total += p; cumulative[i] = total; });
  return function sample(uniform) {
    const target = uniform * total;
    let lo = 0, hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] > target) hi = mid; else lo = mid + 1;
    }
    return lo;
  };
}
