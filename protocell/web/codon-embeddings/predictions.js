// Predictions S1–S6 (design-spec §7), measured on a set of target vectors W.
// A line-for-line port of the functions in notebook 03b, so the lab and the notebook apply the same tests.
// Baselines: 95th percentile of the statistic over 1,000 random relabellings.
import { cosineMatrix } from "../shared/linalg.js";

const N_PERMUTATIONS = 1000;

function percentile95(values) {
  // Same rule as numpy.percentile (linear interpolation).
  const sorted = [...values].sort((a, b) => a - b);
  const position = 0.95 * (sorted.length - 1), lo = Math.floor(position), frac = position - lo;
  return lo + 1 < sorted.length ? sorted[lo] + frac * (sorted[lo + 1] - sorted[lo]) : sorted[lo];
}

function permutationBaseline(statistic, labels, rng) {
  const values = [];
  for (let i = 0; i < N_PERMUTATIONS; i++) values.push(statistic(rng.shuffle([...labels])));
  return percentile95(values);
}

const mean = values => values.reduce((a, b) => a + b, 0) / values.length;

// Indices of the rows sorted by decreasing similarity, excluding the row itself.
function neighbourOrder(cos, i) {
  return cos[i].map((v, j) => [j, v]).filter(([j]) => j !== i).sort((a, b) => b[1] - a[1]).map(([j]) => j);
}

export function s1CodingVsSpacer(W, vocabulary, lang, rng) {
  // Class purity of the 5 nearest neighbours, among coding and spacer-only codons only.
  const spacerOnly = new Set(lang.spacerOnlyCodons);
  const codons = vocabulary.filter(c => lang.codeTable[c] || spacerOnly.has(c));
  const cos = cosineMatrix(codons.map(c => W[vocabulary.indexOf(c)]));
  const neighbours = codons.map((_, i) => neighbourOrder(cos, i).slice(0, 5));
  const labels = codons.map(c => Boolean(lang.codeTable[c]));
  const purity = lab => mean(neighbours.flatMap((ns, i) => ns.map(j => (lab[j] === lab[i] ? 1 : 0))));
  return { value: purity(labels), baseline: permutationBaseline(purity, labels, rng) };
}

export function s2PreferredGene(W, vocabulary, lang, rng) {
  // Fraction of coding codons whose nearest coding neighbour has the same preferred gene.
  const codons = lang.codingCodons.filter(c => vocabulary.includes(c));
  const cos = cosineMatrix(codons.map(c => W[vocabulary.indexOf(c)]));
  const nearest = codons.map((_, i) => neighbourOrder(cos, i)[0]);
  const labels = codons.map(c => lang.preferredGene(c));
  const agreement = lab => mean(nearest.map((j, i) => (lab[j] === lab[i] ? 1 : 0)));
  return { value: agreement(labels), baseline: permutationBaseline(agreement, labels, rng) };
}

export function s3RegisterVsResidue(W, vocabulary, lang) {
  // Mean cosine of same-register pairs with different residues, minus mean cosine of synonym pairs.
  const cos = cosineMatrix(W);
  const at = (a, b) => cos[vocabulary.indexOf(a)][vocabulary.indexOf(b)];
  const sameRegister = [];
  const coding = lang.codingCodons;
  for (let i = 0; i < coding.length; i++) {
    for (let j = i + 1; j < coding.length; j++) {
      const a = coding[i], b = coding[j];
      if (a[2] === b[2] && lang.codeTable[a] !== lang.codeTable[b]) sameRegister.push(at(a, b));
    }
  }
  const synonyms = lang.synonymPairs.map(([a, b]) => at(a, b));
  return { sameRegister: mean(sameRegister), synonyms: mean(synonyms), value: mean(sameRegister) - mean(synonyms) };
}

export function s4Initiator(W, vocabulary, lang, n = 5) {
  const cos = cosineMatrix(W);
  const i = vocabulary.indexOf(lang.initiator);
  return neighbourOrder(cos, i).slice(0, n).map(j => [vocabulary[j], cos[i][j]]);
}

export function s5PathwayOrder(W, vocabulary, lang) {
  // Of the 5 adjacent pairs that do not span the leader: the rank (1 = most similar) of the next gene's
  // marker among the 7 markers, seen from terminator_i — and, descriptively, from gene i's top body codon.
  const cos = cosineMatrix(W);
  const genes = lang.geneNames;
  const pairs = genes.slice(0, -1).map((g, i) => [g, genes[i + 1]]).filter(([a, b]) => !(a === "NaxTAG" && b === "NaxSNIP"));
  const markerRank = (codon, nextGene) => {
    const sims = Object.fromEntries(genes.map(g => [g, cos[vocabulary.indexOf(codon)][vocabulary.indexOf(lang.markerOf[g])]]));
    return 1 + Object.values(sims).filter(s => s > sims[nextGene]).length;
  };
  const topBody = g => lang.codingCodons.reduce((best, c) => (lang.distributionOf[g][c] > lang.distributionOf[g][best] ? c : best));
  const ranks = pairs.map(([a, b]) => markerRank(lang.terminatorOf[a], b));
  const bodyRanks = pairs.map(([a, b]) => markerRank(topBody(a), b));
  return { ranks, bodyRanks, firsts: ranks.filter(r => r === 1).length, pairs };
}

export function s6ZvTwins(W, vocabulary, lang, rng) {
  // Mean cosine of Z/V twins vs random DNA-form/RNA-form pairings.
  const dnaForms = vocabulary.filter(c => c.includes("Z") && vocabulary.includes(lang.transcribe(c)));
  if (!dnaForms.length) return null;
  const cos = cosineMatrix(W);
  const block = dnaForms.map(d => dnaForms.map(r => cos[vocabulary.indexOf(d)][vocabulary.indexOf(lang.transcribe(r))]));
  const meanPairing = perm => mean(perm.map((p, i) => block[i][p]));
  const identity = dnaForms.map((_, i) => i);
  return { value: meanPairing(identity), baseline: permutationBaseline(meanPairing, identity, rng), twins: dnaForms.length };
}

// All the predictions that apply to a corpus, with verdicts. corpus: "dna" | "shuffled" | "mixed".
export function measurePredictions(W, vocabulary, lang, corpus, rng) {
  const rows = [];
  if (corpus !== "mixed") {
    const s1 = s1CodingVsSpacer(W, vocabulary, lang, rng);
    rows.push({ id: "S1", value: s1.value, baseline: s1.baseline, holds: s1.value > s1.baseline });
    const s2 = s2PreferredGene(W, vocabulary, lang, rng);
    rows.push({ id: "S2", value: s2.value, baseline: s2.baseline, holds: s2.value > s2.baseline });
    const s3 = s3RegisterVsResidue(W, vocabulary, lang);
    rows.push({ id: "S3", value: s3.value, baseline: 0, holds: s3.value > 0, detail: `same register ${s3.sameRegister.toFixed(3)} · synonyms ${s3.synonyms.toFixed(3)}` });
    const s5 = s5PathwayOrder(W, vocabulary, lang);
    const threshold = corpus === "dna" ? 5 : 2;
    rows.push({ id: "S5", value: s5.firsts, baseline: threshold, holds: corpus === "dna" ? s5.firsts === 5 : s5.firsts <= 2,
      detail: `ranks ${s5.ranks.join(", ")} · body codons ${s5.bodyRanks.join(", ")}` });
  } else {
    const s6 = s6ZvTwins(W, vocabulary, lang, rng);
    if (s6) rows.push({ id: "S6", value: s6.value, baseline: s6.baseline, holds: s6.value > s6.baseline, detail: `${s6.twins} twins` });
  }
  const s4 = s4Initiator(W, vocabulary, lang);
  rows.push({ id: "S4", value: null, baseline: null, holds: null, detail: "WXZ neighbours: " + s4.map(([c, s]) => `${c} ${s.toFixed(2)}`).join(", ") });
  return rows;
}
