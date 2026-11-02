# PROTOCELL-0

### A hypothetical minimal organism, designed for teaching language models

*Revised 2026-11-01 to match `design-spec.md` v1.0. For Stages I–II (code table, residues, reserved codons,
genome grammar) `design-spec.md` §1–§2 is authoritative; this document keeps the organism's story and outlook.*

---

## 0. What this is, and why it is fake on purpose

Protocell-0 is an invented organism. Nothing in it corresponds to anything on Earth: not the
bases, not the code, not the residues, not the proteins. This is deliberate. A real genome
carries confounds — evolutionary history, selection, contingency — that make it impossible to
say what a model *should* have learned. In Protocell-0 we wrote the grammar, so we know the
ground truth exactly, and every claim about what a language model discovers is checkable.

The design is not arbitrary, though. It sits on three real research traditions, each of which
answers "what is the minimum?" a different way:

| Approach | Question | Reference |
|---|---|---|
| Top-down | Delete genes until it dies | JCVI-syn3.0 — 473 genes, ~531 kb |
| Bottom-up | Build chemistry until it divides | Kurisu et al. 2023, *Commun Chem* 6:56 |
| Formal | Specify the abstraction, derive what follows | Gánti's chemoton, *The Principles of Life* (2003) |

Protocell-0 is of the third kind, with one addition. **The chemoton has a template but no code.**
Its information subsystem controls the system quantitatively, through stoichiometry — how much
membrane to build — not symbolically. Protocell-0 grafts an arbitrary, learnable genetic code
onto the chemoton skeleton. That graft is the whole point: it is the only version of the minimal
cell in which a *language* exists to be modelled.

---

## 1. Chemistry layer

### 1.1 Bases

Four bases. Four is not negotiable: you need even numbers for pairing, and four gives 64 triplets,
which is enough vocabulary to be interesting and small enough to print on a slide.

| Symbol | Name | Pairs with | Bond strength | Real analogue |
|---|---|---|---|---|
| W | welline | Z | weak (2 bonds) | A |
| X | xoline | Y | strong (3 bonds) | G |
| Y | ythrine | X | strong (3 bonds) | C |
| Z | zoltine | W | weak (2 bonds) | T (U in RNA) |

The asymmetry is load-bearing, not decoration. Because X–Y is stronger than W–Z, a region's
**XY-content** determines its melting temperature, its mechanical stability, and its mutational
bias. This is what makes composition bias in Protocell-0 physically motivated rather than
stipulated — the codon-usage "dialects" in §4 have a reason to exist.

The real analogues are not decoration either: under the map G→X, C→Y, A→W, T/U→Z/V the Protocell-0 code
and its signals are renamed copies of real ones (§2), so every claim about them can be checked against real
biology.

*Naming convention: bases end in* **-ine***, matching real nucleobases (adenine, thymine). The
stems are invented; the morphology signals the category.*

### 1.2 Transcription and the V substitution

Protocell-0 transcribes DNA to RNA. One base is substituted in the transcript:

> **Z (zoltine) in DNA becomes V (vethine) in RNA.**

So the DNA triplet `ZWX` appears in the transcript as `VWX`. Only codons containing Z change; in the
coding vocabulary (§2) these are the four middle-Z codons (`XZY`→`XVY`, `XZX`→`XVX`, `YZY`→`YVY`,
`YZX`→`YVX`).

This mirrors T→U, and it is a free pedagogical gift. The same word has two surface forms
depending on which molecule you read it from. Any model that treats DNA and RNA sequence as
one corpus must normalise across them — which is **tokenisation normalisation**, sitting inside
the organism rather than in a preprocessing script. It is the biological version of case folding.

### 1.3 Residues

Names end in **-an**, deliberately distinct from the bases' **-ine**, so students never confuse
the two levels.

**Stage I inventory (4 residues).** Chosen to span the minimal functional space a polymer needs:
something flexible, something greasy, something charged, something bulky.

**Stage II adds six (10 total).** Each residue mirrors a real amino acid of the SNS code (§2), so its
chemistry is the real counterpart's.

| Code | Name | Character | Real analogue | Stage |
|---|---|---|---|---|
| Nm | neman | smallest, flexible — allows turns | Gly | I |
| Kv | korvan | small hydrophobic — forms cores | Ala | I |
| Ds | dresan | acidic — charged surface | Asp | I |
| Th | thulan | branched hydrophobic — packs rigidly | Val | I |
| My | myrran | acidic, longer | Glu | II |
| Os | osvan | basic, ring | His | II |
| Si | sirran | basic, long | Arg | II |
| Pv | pelvan | cyclic, rigid | Pro | II |
| Qu | quellan | amide | Gln | II |
| Lu | lurran | large hydrophobic | Leu | II |

*Changes from the first roster:* myrran was "polar" and sirran "small polar"; both now match SNS. The amide
residue, first named vethan (Ve), is now **quellan (Qu)**, so that the letter V belongs only to the base
vethine.

**Stage III** extends to 20 by the same principle — each new residue adds a distinction the
existing set cannot express. The exact roster matters less than the progression.

---

## 2. The code

Codons are three bases, read in one direction, non-overlapping. The code is staged, following
Ikehara's GNC–SNS hypothesis, which gives three vocabularies of the same language:

| Stage | Rule | Codons | Residues |
|---|---|---|---|
| I | `X N Y` | 4 | 4 |
| II | `[XY] N [XY]` | 16 | 10 |
| III | all triplets | 61 sense | 20 |

where `N` is any base and `[XY]` is either strong-pairing base.

**The code table (Stages I–II).** The Protocell-0 code is a renamed copy of Ikehara's GNC (Stage I) and SNS
(Stage II) codes under the map G→X, C→Y, A→W, T/U→Z/V. Rows: first·third base; columns: middle base; DNA
spelling (RNA: replace Z with V).

| first·third ↓ / middle → | **W** | **X** | **Y** | **Z** |
|---|---|---|---|---|
| **X·Y** — Stage I | XWY → Ds | XXY → Nm | XYY → Kv | XZY → Th |
| **X·X** | XWX → My | XXX → Nm | XYX → Kv | XZX → Th |
| **Y·Y** | YWY → Os | YXY → Si | YYY → Pv | YZY → Lu |
| **Y·X** | YWX → Qu | YXX → Si | YYX → Pv | YZX → Lu |

The middle base decides chemistry: the W column is charged or polar, the Z column hydrophobic, the Y column
small or rigid.

**Structural (reserved) codons.** All of them lie outside the coding vocabulary at Stages I–II (their first
or third base is W or Z), so they never occur inside a gene body. Several are isomorphic images of real
signals.

| Signal | Codons (DNA) | Real analogue |
|---|---|---|
| Promoter | `ZWZ WWZ` | Pribnow box TATAAT |
| Ribosome-binding site (RBS) | `WXX WXX` | Shine–Dalgarno AGGAGG |
| Initiator | `WXZ` | start codon |
| Gene markers | one per Nax gene (`WWX`, `WWY`, `WXY`, `WYX`, `WYY`, `WZX`, `WZY`) | — (Protocell-0 invention) |
| Gene terminators | one per Nax gene (`ZWW`, `ZWX`, `ZXW`, `ZYW`, `ZZW`, `ZXZ`, `ZYZ`) | stop codons (TAA, TAG, TGA → ZWW, ZWX, ZXW) |
| K-sensor | `WYW YWZ WYW` | riboswitch / attenuator sensing domain |
| Transcription terminator | `WZZ ZZZ` | rho-independent terminator U-run |

That is 22 reserved codons; of the 48 noncoding triplets, the remaining 26 occur only in spacers. The
gene-by-gene assignment of markers and terminators is in `design-spec.md` §2.1.

Note the honest wrinkle: at Stages I and II the terminators are not members of the code at all —
no triplet of the form `XNY` or `[XY]N[XY]` can be a terminator. This is not a bug. In the real
GNC/SNS hypothesis the primeval codes have no stop codons either; termination is a later
invention. Protocell-0 borrows terminators as exogenous punctuation, and that fact is worth
twenty minutes of discussion on its own.

**Degeneracy.** Already at Stage II, six residues have two codons each (Nm, Kv, Th, Si, Pv, Lu), and the
synonyms differ only in the third base. In the W column the third base changes the residue instead
(Ds/My, Os/Qu), as in the real code. At Stage III degeneracy grows to the real code's scale. Synonyms are
true synonyms: same meaning, different word, and the choice between them carries *style* rather than
content. This is the cleanest example of synonymy any student will ever see.

---

## 3. The pathways

Four units. Three are the chemoton's, renamed and given a code. The fourth is a deliberate
departure, flagged as such.

### 3.1 The currency

All four pathways trade in one currency: **kelate**, written K.

INTAKE produces it (real counterpart: ATP; its spent form K₀ is ADP). The other three spend it. There
is a fixed budget per cycle, which means the pathways are in genuine competition — and competition, not parts, is what makes invented biology
feel alive rather than diagrammatic.

### 3.2 The four units

**① INTAKE — "eat"** *(chemoton: metabolic cycle)*
Converts environmental substrate Σ into kelate, expelling waste Ω. Its real basis is glycolysis with
lactic-acid fermentation, reduced to seven proteins (details and rationale in
`protocell-0-energy-pathway.md`). Gene family: **Nax**.

| Gene | What it does | Real counterpart |
|---|---|---|
| NaxGATE | lets food Σ into the cell | glucose transporter (GLUT) |
| NaxTAG | spends 1 K to tag Σ, trapping it inside | hexokinase |
| NaxSNIP | spends 1 K and cuts the food into halves α and β; the control valve | phosphofructokinase + aldolase |
| NaxFLIP | converts β into α | triose-phosphate isomerase |
| NaxGRAB | strips electrons into the electron bucket; attaches a new high-energy phosphate | GAPDH |
| NaxPAY | releases 2 K per half | phosphoglycerate kinase + pyruvate kinase |
| NaxDUMP | empties the bucket; the leftovers leave as waste Ω | lactate dehydrogenase |

Net yield: −2 K invested, +4 K earned, **+2 K** per Σ. The cycle is not autocatalytic in a strict sense,
but it has the same practical consequence: **you need K to make K.** A cell at zero kelate cannot pay the
entry cost and cannot restart even when food returns (the "turbo design" problem).

**② EXPRESS — "read"** *(chemoton: template subsystem, upgraded with a code)*
Transcribes DNA to RNA, translates RNA to polymer. This is the self-referential unit: the genome
encodes the machine that reads the genome. Gene family: **Lum** (LumA–LumF).

**③ ENVELOPE — "build"** *(chemoton: membrane subsystem)*
Synthesises the boundary amphiphile, grows the compartment, divides it. Gene family: **Sev**.

**④ FORAGE — "move"** *(no chemoton counterpart — the deliberate addition)*
Spends kelate to relocate along substrate gradients. Gene family: **Wir**.

### 3.3 The couplings

Two, and both matter.

**Coupling A — the chemoton's trick, transposed.** In Gánti's model, template replication releases
a byproduct that activates the membrane precursor, so the membrane cannot grow unless the
template replicates. Protocell-0 keeps this: **ENVELOPE's amphiphile precursor requires a
byproduct of EXPRESS's translation cycle.** You cannot grow the boundary without expressing genes.
Growth and information processing are stoichiometrically welded together.

**Coupling B — the life-history trade-off.** FORAGE and ENVELOPE draw on the same kelate pool.
Spending on movement is spending not-on-reproduction. This is the classic forage-versus-reproduce
conflict, and it is why FORAGE earns its place: a chemoton sits in a nutrient bath, whereas an
organism goes looking. Every canonical minimal-cell model (Gánti, Koonin, syn3.0, Kurisu et al.)
omits motility. Protocell-0 adds it knowingly, and says so.

**Scope of version 1.** The language labs (`design-spec.md`) model only INTAKE: each genome carries one Nax
operon. EXPRESS, ENVELOPE and FORAGE, and the couplings above, are the organism's outlook for later
versions.

---

## 4. Genome grammar

The genome is a stream of codons. One codon is one token. The alphabet has four letters; the
language has 64 words. In version 1 each genome carries one Nax operon (full grammar in
`design-spec.md` §2.2):

```
[ spacer ]  PROMOTER  ── TSS ──  [ 5'UTR ]
            GENE_BLOCK(GATE)  GENE_BLOCK(TAG)
            LEADER = K-SENSOR + ATTENUATOR
            GENE_BLOCK(SNIP) … GENE_BLOCK(DUMP)
            TX_TERMINATOR  [ spacer ]

GENE_BLOCK(g) = RBS  [gap]  WXZ  <marker g>  <body codons, 12–24>  <terminator g>  [intergenic]
```

**Spacers** are noncoding, drawn from all 64 triplets (except the initiator, whose decoys are placed
deliberately). Gene interiors use only the stage's coding vocabulary — so
restricted-vocabulary-inside-genes is itself something a model must learn.

**Gene markers** are seven reserved codons, one per Nax gene, never appearing inside a body. Each announces
which gene follows. The genes appear in pathway order, as real bacteria often arrange an operon.

**Codon-usage dialects.** Each gene has its own body-codon distribution, generated in two layers: a residue
composition (meaning: NaxGATE, a membrane transporter, is rich in hydrophobic residues; the enzymes carry
charged surface residues) and a synonym preference (style: each gene prefers one of two synonymous codons).
The distributions are peaky enough to be distinguishable and overlapping enough that gene identity is a
statistical inference rather than a lookup. This is register, or topic, in natural language.

**Gene terminators.** Each gene ends with its own reserved terminator triplet.

**The kelate leader.** Before NaxSNIP, the valve of the pathway, sits a K-sensor followed by an attenuator.
The attenuator is the same word as the final transcription terminator (§5).

### 4.1 The two dependencies, and why they are different

| | Range | Inferable locally? |
|---|---|---|
| marker → dialect | short | partly — a few body codons already hint at the gene |
| marker → terminator | 12–24 codons | **no** — nothing near the end reveals it |

The second is the experiment. At a gene's final position, the correct terminator is written only
in the marker word at the gene's start. An n-gram with a window of k codons physically cannot see
it. Attention can.

The honest result, which is more interesting than a clean win: n-gram models still beat chance
substantially, because dialect leaks — local word choice betrays the topic. The transformer's
advantage is the remaining gap. That gap, not the headline number, is what attention actually buys.

---

## 5. Nested grammars

Because Protocell-0 transcribes before it translates, one string carries two grammars at once:

- **Transcription level:** promoter → transcript → terminator
- **Translation level:** initiator → ORF → gene terminator

Same text, two parses, different units, different scales. A transcription unit carries several
ORFs — the whole Nax operon. This is a considerably richer object than a flat codon stream, and it maps
directly onto how language models handle structure at more than one scale.

The two levels meet in the kelate leader. Its attenuator `WZZ ZZZ` is the same word as the final
transcription terminator, but it is *conditional*: when kelate is abundant (`K_high`) transcription stops
there, and the transcript carries only NaxGATE and NaxTAG; when kelate is scarce (`K_low`) transcription reads
through to the end of the operon. The same word means "stop" or "go on" depending on what comes after it.

---

## 6. The mapping to language modelling

This table is the reason the organism exists.

| Protocell-0 | Language model |
|---|---|
| base (W/X/Y/Z) | character |
| codon | token |
| reading frame | tokenisation boundary |
| genome | lexicon — every word the cell can say |
| transcript | utterance — the words it says, under a condition |
| gene | sentence |
| gene (Nax dialect) | topic / register |
| gene marker | topic marker — the long-range dependency |
| codon-usage dialect | style, register |
| synonymous codons | synonyms |
| Z→V transcription swap | normalisation (case folding) |
| transcript vs. ORF | nested grammars at two scales |
| Shannon entropy of a sequence | cross-entropy, perplexity |

The last row deserves emphasis. Kurisu et al. quantify the information in their polymer's sequence
as bits per monomer — the difference between the entropy of a random sequence and the observed
entropy. That is the same quantity a language model estimates. Perplexity is the exponential of
cross-entropy. Put their equation and your perplexity table on one slide: they are measuring the
same thing on different molecules.

Their thermodynamic argument gives you the closing line. An ordered sequence costs entropy, and
that cost must be paid by an enthalpy gain. **Information is not free — it has a price in joules.**

---

## 7. Implementation status

The first prototype, `legacy/protocell_lm.py` (staged code, proto-genome generator, n-gram baselines,
a 1-layer, 2-head transformer, terminator probe), predates this revision: it uses A/C/G/T, real
amino-acid codes and three gene classes. It is kept for reference only.

The current implementation follows the phases of `design-spec.md` §6, starting from `protocell_lang.py`, the
single source of truth for the language. What has been built so far is recorded in `docs/architecture.md`.

---

## References

- Gánti, T. *The Principles of Life.* OUP, 2003 (essays by Szathmáry & Griesemer)
- Hutchison, C.A. et al. Design and synthesis of a minimal bacterial genome. *Science* 351, aad6253 (2016)
- Kurisu, M. et al. Synthesising a minimal cell with artificial metabolic pathways. *Commun. Chem.* 6, 56 (2023)
- Ikehara, K. GNC–SNS hypothesis on the origin of the genetic code
- Moody, E.R.R. et al. The nature of the last universal common ancestor. *Nat. Ecol. Evol.* (2024)
