# PROTOCELL-0

### A hypothetical minimal organism, designed for teaching language models

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

| Symbol | Name | Pairs with | Bond strength |
|---|---|---|---|
| W | welline | Z | weak (2 bonds) |
| X | xoline | Y | strong (3 bonds) |
| Y | ythrine | X | strong (3 bonds) |
| Z | zoltine | W | weak (2 bonds) |

The asymmetry is load-bearing, not decoration. Because X–Y is stronger than W–Z, a region's
**XY-content** determines its melting temperature, its mechanical stability, and its mutational
bias. This is what makes composition bias in Protocell-0 physically motivated rather than
stipulated — the codon-usage "dialects" in §4 have a reason to exist.

*Naming convention: bases end in* **-ine***, matching real nucleobases (adenine, thymine). The
stems are invented; the morphology signals the category.*

### 1.2 Transcription and the V substitution

Protocell-0 transcribes DNA to RNA. One base is substituted in the transcript:

> **Z (zoltine) in DNA becomes V (vethine) in RNA.**

So the DNA triplet `ZWX` appears in the transcript as `VWX`.

This mirrors T→U, and it is a free pedagogical gift. The same word has two surface forms
depending on which molecule you read it from. Any model that treats DNA and RNA sequence as
one corpus must normalise across them — which is **tokenisation normalisation**, sitting inside
the organism rather than in a preprocessing script. It is the biological version of case folding.

### 1.3 Residues

Names end in **-an**, deliberately distinct from the bases' **-ine**, so students never confuse
the two levels.

**Stage I inventory (4 residues).** Chosen to span the minimal functional space a polymer needs:
something flexible, something greasy, something charged, something bulky.

| Code | Name | Character |
|---|---|---|
| Nm | neman | smallest, flexible — allows turns |
| Kv | korvan | hydrophobic — forms cores |
| Ds | dresan | acidic — charged surface |
| Th | thulan | branched hydrophobic — packs rigidly |

**Stage II adds six (10 total):** myrran (My, polar), osvan (Os, basic), pelvan (Pv, cyclic/rigid),
sirran (Si, small polar), vethan (Ve, amide), lurran (Lu, large hydrophobic).

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

**Structural markers** (outside the coding vocabulary at every stage):

- **Initiator:** `WXZ`
- **Terminators:** four reserved triplets, one per pathway class (see §3)

Note the honest wrinkle: at Stages I and II the terminators are not members of the code at all —
no triplet of the form `XNY` or `[XY]N[XY]` can be a terminator. This is not a bug. In the real
GNC/SNS hypothesis the primeval codes have no stop codons either; termination is a later
invention. Protocell-0 borrows terminators as exogenous punctuation, and that fact is worth
twenty minutes of discussion on its own.

**Degeneracy.** At Stage III, multiple codons map to one residue. These are true synonyms: same
meaning, different word, and the choice between them carries *style* rather than content. This is
the cleanest example of synonymy any student will ever see.

---

## 3. The pathways

Four units. Three are the chemoton's, renamed and given a code. The fourth is a deliberate
departure, flagged as such.

### 3.1 The currency

All four pathways trade in one currency: **kelate**, written K.

INTAKE produces it. The other three spend it. There is a fixed budget per cycle, which means the
pathways are in genuine competition — and competition, not parts, is what makes invented biology
feel alive rather than diagrammatic.

### 3.2 The four units

**① INTAKE — "eat"** *(chemoton: metabolic cycle)*
Converts environmental substrate Σ into kelate, expelling waste Ω. Autocatalytic: one turn of the
cycle yields the intermediates for two. Gene family: **Nax** (NaxA–NaxD).

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

---

## 4. Genome grammar

The genome is a stream of codons. One codon is one token. The alphabet has four letters; the
language has 64 words.

```
[ spacer ]  WXZ  <class marker>  <body codons ...>  <class terminator>
```

**Spacers** are noncoding, drawn from all 64 triplets. Gene interiors use only the stage's coding
vocabulary — so restricted-vocabulary-inside-genes is itself something a model must learn.

**Class markers** are four reserved codons, one per pathway, never appearing inside a body. Each
announces which pathway the gene belongs to.

**Codon-usage dialects.** Each pathway has its own distribution over body codons — peaky enough to
be distinguishable, overlapping enough that class identity is a statistical inference rather than
a lookup. This is register, or topic, in natural language.

**Class terminators.** Each pathway ends its genes with its own reserved terminator triplet.

### 4.1 The two dependencies, and why they are different

| | Range | Inferable locally? |
|---|---|---|
| marker → dialect | short | partly — a few body codons already hint at the class |
| marker → terminator | 30–60 codons | **no** — nothing near the end reveals it |

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
- **Translation level:** initiator → ORF → class terminator

Same text, two parses, different units, different scales. A transcription unit may carry several
ORFs. This is a considerably richer object than a flat codon stream, and it maps directly onto how
language models handle structure at more than one scale.

---

## 6. The mapping to language modelling

This table is the reason the organism exists.

| Protocell-0 | Language model |
|---|---|
| base (W/X/Y/Z) | character |
| codon | token |
| reading frame | tokenisation boundary |
| gene | sentence |
| pathway class | topic / register |
| class marker | topic marker — the long-range dependency |
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

Working, in `protocell_lm.py`:

- staged code (Stage I / II / III), built programmatically as filters on one table
- proto-genome generator with markers, dialects, class terminators
- n-gram baselines (orders 1–4) with add-k smoothing
- 1-layer, 2-head transformer
- terminator probe, marker-attention ratio, generation grammar checks

To bring the script in line with this spec:

1. **Bases W/X/Y/Z** replacing A/C/G/T throughout, with the code-stage filters rewritten as
   `X N Y` and `[XY] N [XY]`
2. **Four gene classes**, not three — which means four reserved terminator triplets rather than
   borrowing the three real stop codons
3. **Residue names** in the translation output, so printed proteins read as Protocell-0 rather
   than as standard one-letter amino acid codes
4. **Transcription layer** — emit an RNA view with Z→V, and add the promoter/terminator grammar
   above the ORF grammar

Items 1–3 are cosmetic but matter for detaching the example from real biology. Item 4 is the
substantive extension, and it is where the nested-grammar lesson comes from.

---

## References

- Gánti, T. *The Principles of Life.* OUP, 2003 (essays by Szathmáry & Griesemer)
- Hutchison, C.A. et al. Design and synthesis of a minimal bacterial genome. *Science* 351, aad6253 (2016)
- Kurisu, M. et al. Synthesising a minimal cell with artificial metabolic pathways. *Commun. Chem.* 6, 56 (2023)
- Ikehara, K. GNC–SNS hypothesis on the origin of the genetic code
- Moody, E.R.R. et al. The nature of the last universal common ancestor. *Nat. Ecol. Evol.* (2024)
