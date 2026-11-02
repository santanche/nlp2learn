// Loading the data files (data/web/) and reading the language from language.json.
// The labs never hard-code the language: every table comes from protocell_lang.py through language.json.

export async function loadJSON(name) {
  const response = await fetch(`../../data/web/${name}`);
  if (!response.ok) throw new Error(`Cannot load data/web/${name} (${response.status}). Serve the labs with "python -m http.server" from protocell/.`);
  return response.json();
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Helpers built from language.json.
export function languageHelpers(language) {
  const codeTable = Object.fromEntries(language.code_table.map(row => [row.codon, row.residue]));
  const geneNames = language.genes.map(g => g.name);
  const toDna = codon => codon.replaceAll("V", "Z");
  const transcribe = codon => codon.replaceAll("Z", "V");
  const synonyms = residue => language.code_table.filter(row => row.residue === residue).map(row => row.codon);

  return {
    language,
    geneNames,
    codeTable,
    toDna,
    transcribe,
    isRna: codon => codon.includes("V"),
    codonClass: codon => language.codon_classes[toDna(codon)],
    preferredGene: codon => language.preferred_genes[toDna(codon)],
    residueOf: codon => codeTable[toDna(codon)] || null,
    codingCodons: language.code_table.map(row => row.codon),
    spacerOnlyCodons: language.spacer_only_codons,
    allCodons: Object.keys(language.codon_classes),
    markerOf: Object.fromEntries(language.genes.map(g => [g.name, g.marker])),
    terminatorOf: Object.fromEntries(language.genes.map(g => [g.name, g.terminator])),
    distributionOf: Object.fromEntries(language.genes.map(g => [g.name, g.codon_distribution])),
    synonymPairs: Object.keys(language.residues).map(synonyms).filter(pair => pair.length === 2),
    initiator: language.signals.find(s => s.signal === "initiator").codons[0],
  };
}
