# Protocell-0 Language Labs — Design Specification

**Static and contextual embeddings over the Protocell-0 energy pathway**

*Version 1.1 · 2026-11-02 · as implemented (version 1 of the labs is complete) · Companion to `protocell-0-spec.md`
and `protocell-0-energy-pathway.md`*

*Version 1.0 (2026-11-01) was the design before implementation. Every later change was made here first —
the details each phase had to fix, the `misplaced_rbs` category, the 60-epoch encoder, and the pass criteria
of §7 — and is logged, with its reason, in `architecture.md` §12. Results are in `architecture.md` §10; how to
resume the project is in `status-and-decisions.md`.*

---

## 0. Purpose and scope

This specification defines a sequence of Jupyter notebooks and interactive web labs that teach two kinds of
word representation using an invented genetic language:

1. **Static embeddings** (word2vec-style): one vector per codon *type*, learned from the genome.
2. **Contextual embeddings** (attention-based encoder): one vector per codon *occurrence*, learned from
   transcripts.

The organizing idea is the type/token distinction, mapped onto biology:

| | Static (Part A) | Contextual (Part B) |
|---|---|---|
| Corpus | genome (DNA: W X Y Z) | transcripts (RNA: W X Y V) |
| Unit of text | continuous stream, sliding window | one transcription unit = one "sentence" |
| Language analogue | lexicon | utterances |
| Model | skip-gram with negative sampling | small bidirectional encoder, masked-codon prediction |
| Output | one vector per codon | one vector per codon per position |

Transcription is treated as the language's *expression*: the genome stores every word the cell can say; a
transcript is the cell saying some of them, in a given order, under a given condition.

**What transcription is not, here:** a sequence-to-sequence task. DNA→RNA is a one-to-one copy with Z→V; an
encoder trained on it learns only a diagonal attention matrix. That may be shown once as a sanity check, but
the contextual lessons come from decisions the cell makes about *what* is expressed: where translation starts,
which gene a codon belongs to, whether transcription continues past a conditional terminator.

### 0.1 Division of labour between notebooks and web labs

Notebooks run the processes, print preliminary results, and export data files. Web labs load those files and
let students explore them. The split follows one rule: **train live in the browser when full training takes
seconds; otherwise train in Python and replay.**

| Model | Trained where | What the browser does |
|---|---|---|
| Codon skip-gram (64 codons, 2–3 dims) | Live in browser (JS) **and** in a NumPy notebook | Train/Step/Reset with moving embeddings; can load the notebook result for comparison |
| Single-head attention classifier (mini-transcripts) | Live in browser (JS) **and** in a NumPy notebook | Every tensor shown and recomputed; live training |
| Encoder (masked-codon prediction) | PyTorch notebook only | Loads weight snapshots and **re-runs the forward pass in JS**: training replay, attention maps, occurrence clouds, live mutation |

The last row is the central architectural choice. Exporting weights (≈30k parameters per snapshot) instead
of precomputed attention maps keeps files small and makes the mutation demo possible. It requires a JS forward
pass numerically identical to PyTorch, enforced by a parity check (`parity-tests.json`, §5.2; Phase 4, §6).

### 0.2 Students see the code

- **Python:** pedagogical code stays inline in the notebooks (as in Zombienella). The only shared module is
  the language definition, so notebooks cannot disagree about the code table.
- **Web:** math modules are small and readable (as in the feedforward Direction Embeddings Lab). Every panel
  has a **Code** view: for live computations, the JS function that produced it; for replayed results, the
  Python source excerpt stored in the data file's metadata (§5.1).

### 0.3 Out of scope for version 1

Stage III of the code (61 codons, 20 residues); the low-food expression scenario (belongs to the network-graph
side, Dagoberto); NaxGATE isoforms (listed as an extension, §9); the chemiosmotic alternative branch.

---

## 1. The language

### 1.1 Bases and transcription

| Symbol | Name | Pairs with | Bond | Real analogue |
|---|---|---|---|---|
| W | welline | Z | weak | A |
| X | xoline | Y | strong | G |
| Y | ythrine | X | strong | C |
| Z | zoltine | W | weak | T |

Transcription replaces **Z (zoltine)** with **V (vethine)**. Nothing else changes. In the coding vocabulary
only the four middle-Z codons change surface form (XZY→XVY, XZX→XVX, YZY→YVY, YZX→YVX).

### 1.2 Code table — Stage I and Stage II, isomorphic to Ikehara's GNC–SNS code

**Decision:** the Protocell-0 code is a renamed copy of the GNC (Stage I) and SNS (Stage II) codes under the
map G→X, C→Y, A→W, T/U→Z/V. Residue chemistry matches the real counterpart, so every claim about the code is
checkable against real biology.

Coding rule at Stage II: `[XY] N [XY]` → 2 × 4 × 2 = **16 codons, 10 residues**. Stage I is the subset `X N Y`
(4 codons, 4 residues).

Rows: first·third base. Columns: middle base. DNA spelling (RNA: replace Z with V).

| first·third ↓ / middle → | **W** | **X** | **Y** | **Z** |
|---|---|---|---|---|
| **X·Y** — Stage I | XWY → Ds | XXY → Nm | XYY → Kv | XZY → Th |
| **X·X** | XWX → My | XXX → Nm | XYX → Kv | XZX → Th |
| **Y·Y** | YWY → Os | YXY → Si | YYY → Pv | YZY → Lu |
| **Y·X** | YWX → Qu | YXX → Si | YYX → Pv | YZX → Lu |

### 1.3 Residues (Stage II roster, revised)

Names end in **-an** (bases end in **-ine**). Two characters changed from the original roster of
`protocell-0-spec.md` to match SNS, and one residue was renamed; `protocell-0-spec.md` §1.3 has been updated
to this table.

| Code | Name | Character | Real analogue | Stage | Codons | Change vs. original spec (v0) |
|---|---|---|---|---|---|---|
| Nm | neman | smallest, flexible | Gly | I | XXY, XXX | — |
| Kv | korvan | small hydrophobic | Ala | I | XYY, XYX | — |
| Ds | dresan | acidic | Asp | I | XWY | — |
| Th | thulan | branched hydrophobic | Val | I | XZY, XZX | — |
| My | myrran | acidic, longer | Glu | II | XWX | was "polar" |
| Os | osvan | basic, ring | His | II | YWY | — |
| Si | sirran | basic, long | Arg | II | YXY, YXX | was "small polar" |
| Pv | pelvan | cyclic, rigid | Pro | II | YYY, YYX | — |
| Qu | quellan | amide | Gln | II | YWX | renamed from vethan (Ve) |
| Lu | lurran | large hydrophobic | Leu | II | YZY, YZX | — |

Teaching patterns carried by the table:

- **The middle base decides chemistry:** W column charged/polar; Z column hydrophobic; Y column small/rigid.
- **Synonyms differ only in the third base** (six pairs: Nm, Kv, Th, Si, Pv, Lu). Exception: in the W column
  the third base changes the residue (Ds/My, Os/Qu), as in the real code.

### 1.4 Reserved (structural) codons

All reserved codons lie outside the coding set (their first or third base is W or Z), so they never occur in
gene bodies. Several are chosen as isomorphic images of real signals.

| Signal | Codons (DNA) | Length | Real analogue | Transcribed? |
|---|---|---|---|---|
| Promoter | `ZWZ WWZ` | 2 | Pribnow box TATAAT | no (upstream of TSS) |
| Ribosome-binding site (RBS) | `WXX WXX` | 2 | Shine–Dalgarno AGGAGG | yes |
| Initiator | `WXZ` | 1 | start codon (from spec) | yes |
| Gene markers | see §2.1 | 1 each | — (Protocell-0 invention) | yes |
| Gene terminators | see §2.1 | 1 each | stop codons (TAA, TAG, TGA → ZWW, ZWX, ZXW) | yes |
| K-sensor | `WYW YWZ WYW` | 3 | riboswitch / attenuator sensing domain | yes |
| Transcription terminator | `WZZ ZZZ` | 2 | rho-independent terminator U-run | yes |

**Key design point:** the attenuator in the leader and the final transcription terminator are the **same
word** (`WZZ ZZZ`). The leader copy is a *conditional* terminator; whether it ends the transcript depends on
the kelate condition. This is the polysemy of case 3 (§3.3).

22 reserved codons in total; the remaining 26 noncoding codons occur only in spacers.

---

## 2. The genome: one Nax operon per genome

### 2.1 The seven Nax genes

From `protocell-0-energy-pathway.md` §2. Operon order follows the pathway; the FLIP side branch is flattened.

| # | Gene | Role in pathway | Real counterpart | Marker | Terminator | Dialect (§2.3) |
|---|---|---|---|---|---|---|
| 1 | NaxGATE | brings food Σ in | GLUT transporter | `WWX` | `ZWW` | hydrophobic (membrane protein) |
| 2 | NaxTAG | tags Σ (−1 K) | hexokinase | `WWY` | `ZWX` | mixed |
| 3 | NaxSNIP | cuts into halves (−1 K); valve | PFK + aldolase | `WXY` | `ZXW` | mixed, charged-rich |
| 4 | NaxFLIP | β → α | triose-phosphate isomerase | `WYX` | `ZYW` | mixed, small |
| 5 | NaxGRAB | oxidation, new phosphate | GAPDH | `WYY` | `ZZW` | mixed, charged-rich |
| 6 | NaxPAY | 2 K per half | PGK + pyruvate kinase | `WZX` | `ZXZ` | mixed |
| 7 | NaxDUMP | empties the bucket → Ω | lactate dehydrogenase | `WZY` | `ZYZ` | mixed, flexible |

### 2.2 Operon grammar (DNA)

```
spacer(10–40)
PROMOTER                                  ZWZ WWZ          ← not transcribed
── TSS ──────────────────────────────────────────────────
5'UTR spacer(0–2)
GENE_BLOCK(GATE)
GENE_BLOCK(TAG)
LEADER = K-SENSOR + ATTENUATOR + spacer(0–2)
         WYW YWZ WYW   WZZ ZZZ
GENE_BLOCK(SNIP) … GENE_BLOCK(DUMP)
TX_TERMINATOR                             WZZ ZZZ
── end of transcription unit ───────────────────────────
spacer(10–40)

GENE_BLOCK(g) = RBS + gap + WXZ + MARKER_g + BODY_g + TERMINATOR_g + intergenic
                WXX WXX  spacer(1–3)       12–24 codons             spacer(0–2)
```

- **Gene body length:** 12–24 codons (decision; the original spec's 30–60 would give 250–450-token transcripts and
  unreadable attention maps). A full read-through transcript is ≈150–220 tokens.
- **Spacers** draw codons uniformly from all 64 triplets **except** `WXZ` (initiator decoys are injected
  deliberately, §2.4) and except draws that would complete a multi-codon motif (promoter pair, RBS pair,
  K-sensor triple, terminator pair). Single reserved codons may appear in spacers; that polysemy is wanted.
- **Order:** pathway order in every genome by default. A control corpus with shuffled gene order is generated
  with the same seed (parameter `operon_order = pathway | shuffled`). In shuffled genomes the LEADER stays
  directly before GENE_BLOCK(SNIP), wherever NaxSNIP lands: the control element moves with the gene it
  controls. The shuffled corpus is a genome-only control for the static experiments (§4.4, §4.5); `K_high`
  attenuation (§2.5) is defined for pathway order.
- **Parts and assembly (Phase 1).** Each genome is generated once as parts:
  - flanking spacers, 5'UTR and leader;
  - seven gene blocks, each carrying its intergenic spacer and any decoys.

  The parts are then assembled in pathway order (`genome.csv`) and in shuffled order
  (`genome-shuffled.csv`), so the two corpora differ only in gene order. An assembly in which a multi-codon
  motif occurs anywhere other than its intended place is rejected, and that genome is resampled.

### 2.3 Codon dialects: meaning layer and style layer

Body codons are generated in two steps, which separates *meaning* from *style*:

1. **Residue composition (meaning).** Each gene has a distribution over the 10 residues reflecting protein
   chemistry. NaxGATE, a membrane transporter, is rich in hydrophobic residues (Th, Lu, Kv — the middle-Z and
   middle-Y columns). Enzymes have mixed composition with charged surface residues (Ds, My, Os, Si).
2. **Synonym choice (style).** For each degenerate residue, each gene prefers one of the two synonymous codons
   (e.g. 80/20), with the preferred codon varying across genes so that synonyms split by register.

Constraints for the generator: distributions peaky enough that each gene is statistically identifiable from
≈10 body codons, overlapping enough that no single body codon identifies the gene. The generator prints a
gene-identifiability check (e.g. naive Bayes accuracy from k body codons, k = 1, 3, 10).

Concrete form (Phase 1):

- The weights are a hand-written table in `protocell_lang.GENES` (`composition`: residue → weight). Every
  weight is positive, so every coding codon occurs in all seven genes.
- **Two registers** for synonym choice, preference 0.8 / 0.2:
  - register X — NaxGATE, NaxSNIP, NaxGRAB, NaxDUMP — prefers the synonym ending in X;
  - register Y — NaxTAG, NaxFLIP, NaxPAY — prefers the synonym ending in Y.
- **Targets:**
  - naive-Bayes accuracy from the first 10 body codons is ≥ 0.90 on held-out genomes;
  - no single coding codon gives any gene a posterior above 0.6 (uniform prior).

  The weights may be adjusted only to meet these two constraints, with the reason logged in
  `architecture.md`, and never to influence the predictions of §7.

### 2.4 Decoys (controlled polysemy of WXZ)

| Decoy | Rate parameter (default) | Label |
|---|---|---|
| Bare `WXZ` in a spacer, followed by a gene marker with probability 0.5 | `p_spacer_decoy` = 1.0 per genome (Poisson mean) | `false_start_spacer` |
| Gene block with one base of the RBS mutated (gene otherwise intact) | `p_broken_rbs` = 0.15 per gene block | `false_start_broken_rbs` |

Placement and mutation rules (Phase 1):

- **Spacer decoys.** The number of decoys per genome is Poisson(`p_spacer_decoy`). Each decoy goes into one of
  11 spacer slots, chosen uniformly: two flanking spacers, the 5'UTR, seven intergenic spacers and the leader
  spacer. Its insertion point within the slot is also uniform. With probability 0.5 a uniformly chosen gene
  marker follows the `WXZ`. Decoy codons keep their slot's region label and get gene = none.
- **Broken RBS.** One base of one RBS codon is mutated, choosing uniformly among the mutations whose result is
  not a reserved codon: `WXX` → `XXX`, `YXX`, `ZXX` (first base) or `WXW` (third base), in either RBS codon —
  8 options. A middle-base mutation would give a marker (`WWX`, `WYX`, `WZX`), and a third-base mutation to
  `WXY` or `WXZ` would give a marker or an initiator. Both are excluded so that the gene stays otherwise intact.

A broken-RBS gene is transcribed but not translated; its WXZ differs from a true start **only** in the RBS
2–5 positions upstream. This is the cleanest test of case 1 and the basis of the mutation demo.

### 2.5 Transcripts

Each genome yields `transcripts_per_genome` (default 4) transcripts, each with a condition drawn with equal
probability:

| Condition | Transcript |
|---|---|
| `K_low` (kelate scarce) | read-through: TSS → end of final TX_TERMINATOR; contains the leader including its attenuator |
| `K_high` (kelate abundant) | attenuated: TSS → end of the leader's attenuator (GATE and TAG only) |

The leader codons are identical in both. In `K_high` the attenuator is the last word; in `K_low` it is
followed by the SNIP gene block. Transcripts are written in the RNA alphabet (Z→V).

**Train/test splits are always by genome**, never by transcript: transcripts of one genome share almost all
their sequence.

### 2.6 Per-occurrence labels (ground truth)

Every codon occurrence, in genome and transcripts, carries:

| Label | Values |
|---|---|
| `region` | spacer, promoter, utr5, rbs, gap, initiator, marker, body, terminator, intergenic, ksensor, attenuator, tx_terminator |
| `gene` | GATE … DUMP, or none |
| `start_role` | true_start, false_start_spacer, false_start_broken_rbs (WXZ only) |
| `leader_state` | read_through, attenuated (ksensor and attenuator codons in transcripts only) |
| `residue` | residue code (body codons only) |
| `pos_in_gene` | index within body, or none |

Label conventions:
- `gene` is set on the rbs, gap, initiator, marker, body and terminator codons of a gene block. Intergenic
  codons and decoys have gene = none.
- The leader's trailing spacer has region `spacer`.
- `pos_in_gene` is 0-based.
- Absent labels are empty in CSV and `null` in JSON.

These labels make every claim in the labs checkable.

---

## 3. The three polysemy cases (Part B targets)

### 3.1 Case 1 — true start vs. false start

`WXZ` is a start only with an intact RBS 2–5 positions upstream. Expected: contextual vectors of WXZ separate
by `start_role`; attention from WXZ concentrates on the RBS; a one-base RBS mutation moves the vector across
and redraws the heatmap.

### 3.2 Case 2 — which enzyme am I in?

A body codon used by all seven dialects. Expected: its contextual vectors cluster by `gene`, because attention
can reach the marker up to 24 positions away. This is the spec's marker→terminator long-range dependency
shown as geometry.

### 3.3 Case 3 — kelate feedback through attenuation

The leader codons (K-sensor + attenuator) are identical in `K_low` and `K_high` transcripts; what follows them
differs. Expected: contextual vectors of leader codons separate by `leader_state` in a bidirectional encoder
and **not** in a causal one. The cue is short-range but strictly to the right: this case teaches
bidirectionality (encoder vs. decoder), not distance. It is also the language-side counterpart of lesson 5 of
the pathway ("the valve listens to the product"): the real control of phosphofructokinase acts on the protein
and is invisible in sequence, so the language side uses a transcript-level element placed before NaxSNIP.

---

## 4. Notebooks and web labs

### 4.1 Directory layout (suggested)

```
protocell/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── protocell-0-spec.md
│   ├── protocell-0-energy-pathway.md
│   ├── design-spec.md            ← this file
│   ├── architecture.md           ← maintained as phases land
│   ├── status-and-decisions.md   ← resume here: run order, decisions, limitations, open items
│   └── ai/                       ← background debates (ChatGPT, Gemini)
├── legacy/protocell_lm.py        ← superseded prototype; not imported
├── protocell_lang.py             ← single source of truth for the language
├── 01-corpus/01_generate_corpus.ipynb
├── 02-ngrams/02_ngram_baselines.ipynb   ← optional (phase 6)
├── 03-static/03a_cooccurrence.ipynb
│             03b_word2vec.ipynb
├── 04-attention/04a_attention_by_hand.ipynb
│                04b_encoder_training.ipynb
│                04c_contextual_analysis.ipynb
├── data/
│   ├── corpus/                   ← full CSVs for notebooks
│   └── web/                      ← size-budgeted JSON for the labs
└── web/
    ├── index.html                ← landing page linking the labs
    ├── shared/                   ← styles, seeded RNG, matrix utils, charts, code viewer
    ├── codon-embeddings/         ← Lab A
    ├── attention-inspector/      ← Lab B
    └── context-lab/              ← Lab C
```

Labs are served with `python -m http.server` from `protocell/` and read files from `data/web/`.

### 4.2 Notebook 01 — corpus generator

Uses `protocell_lang.py` (bases, code table, residues, reserved codons, genes, dialect profiles). Produces the
genome corpus, transcripts, proteins and labels. Prints: sample genome with regions coloured, sample
transcripts in both conditions, translated proteins with residue names, codon frequencies per gene,
gene-identifiability check, grammar validation (every reserved-codon rule holds; every body translates;
Z→V correct; every occurrence labelled). Exports `data/corpus/*` and `data/web/language.json`,
`genome-sample.json`, `showcase-transcripts.json`.

Defaults: 400 genomes, 4 transcripts per genome, seed 42.

### 4.3 Notebook 03a — co-occurrence vectors

Zombienella 03a method on the genome: half-windows ±1, ±2, ±4 (Zombienella's "window 2, 4, 8"); count
matrices; cosine similarities; PCA to 2D. Window sizes in this spec are always written as half-windows (±k).

### 4.4 Notebook 03b — word2vec (NumPy)

Skip-gram with negative sampling written in NumPy, as Zombienella 03b. Configurations: half-window ∈ {±1, ±9}
(±9 covers the terminator→next-marker distance of prediction S5), dimension ∈ {2, 3, 8 (+PCA)}. Also two experiments:

- **Mixed DNA+RNA corpus without normalisation:** ZWX and VWX become separate tokens; measure whether they
  converge.
- **Shuffled-order control corpus:** pathway-order signal should disappear.

**Training (identical in NumPy and in Lab A's JavaScript).**
- Positive pairs: every (target, context) within the half-window. Windows never cross a genome or transcript
  boundary.
- k = 5 negatives per positive, drawn fresh each epoch from the unigram^¾ noise distribution.
- Mini-batch SGD with batch 1,024: the per-sample gradients of a batch are summed into W and U. Learning rate
  0.025, 5 epochs, initial weights N(0, 0.1²) for both W and U.
- Epoch loss: the mean binary cross-entropy over that epoch's samples (training performance).
- Grid: corpus {dna, shuffled, mixed} × half-window {±1, ±9} × dimension {2, 3, 8} = 18 runs.
- The mixed corpus is the genomes plus all of their transcripts, unnormalised.

The epochs may be changed only for convergence, with the reason logged.

### 4.5 Lab A — Codon Embeddings Lab (live training)

Modelled on the Direction Embeddings Lab: Train / Step / Reset, learning rate, epochs, seed, window,
dimension, corpus (DNA / DNA+RNA mixed / shuffled order), corpus size (subset of `genome-sample.json` so a
run takes seconds). Half-window ∈ {±1, ±2, ±4, ±9}, and the notebook comparison exists for ±1 and ±9.
Dimension ∈ {2, 3, 8}. Corpus size ∈ {10, 20, 40, 60} sample genomes, with 20 as the default.

Panels:

1. **Loss chart** (dataset loss per epoch).
2. **Embedding space** (2D, or 3D rotatable): one point per codon, colour-by selector: residue · preferred
   gene (dialect) · codon class (coding / reserved / spacer-only) · middle base. Toggle W, U, W+U as in 03b.
   Optional lines joining synonym pairs and Z/V pairs.
3. **Codon table view**: the §1.2 grid with each cell showing the codon's nearest neighbours.
4. **Network inspector**: for a selected (target, context) pair: one-hot → row of W → dot with U → sigmoid →
   loss; explanation that a one-hot input selects a row of W.
5. **Compare with notebook**: load `w2v-results.json` and show the NumPy result for the same configuration.
6. **Code view** for each panel.

Permanent note under the chart: proximity reflects similar contexts, not similar meaning.

### 4.6 Notebook 04a and Lab B — attention by hand

**Task:** classify the WXZ token in mini-transcripts (8–14 tokens: optional spacer, RBS or broken RBS or
none, gap of 1–3, WXZ, marker, a few body codons) as true or false start. This is ChatGPT's six-symbol task in
Protocell form, with a variable cue distance.

**Model:** token embedding + learned positional embedding (d = 4), one attention head, read out the output at
the WXZ position, logistic classifier. Full-batch gradient descent with manually derived gradients.

**Lab B panels:** sequence editor (choose or edit a mini-transcript); matrices X, W_Q, W_K, W_V, Q, K, V,
scores, softmax weights, output H, each shown as a labelled heatmap with values; attention arcs from the
selected token; Train / Step / Reset with loss and accuracy; toggle positional embeddings off (prediction:
the task becomes unsolvable when cue position matters); mutation by clicking a base. A finite-difference
gradient check runs at startup (as in the feedforward lab). 04a is the NumPy twin with identical maths.

**Dataset (Phase 3).** Transcripts use RNA spelling, so the initiator token is `WXV`.
- Length 8–14 tokens; 600 train and 300 test sequences, seed 42.
- Categories (label 1 = true start), roughly 1/2 `true_start` and 1/6 each of the others:

  | Category | Construction |
  |---|---|
  | `true_start` | intact RBS, gap 1–3 (the nearer RBS codon is 2–4 positions upstream) |
  | `broken_rbs` | one RBS codon mutated as in §2.4 (`XXX`, `YXX`, `VXX`, `WXW`) |
  | `no_rbs` | spacer codons only |
  | `misplaced_rbs` | an intact RBS at the wrong place: upstream with gap 5–7 (6–8 positions away), or downstream, inside the body after the marker |

  The misplaced-RBS category is added so that the position of the cue matters. Without it, "an intact RBS is
  present somewhere" would decide the task, and a model without positions could solve it.
- Spacer and gap codons are uniform over the RNA codons, excluding `WXV`, `WXX` and the markers.
- Then come the marker of a random gene and 1–4 body codons from that gene's dialect.

**Model (d = 4).**
- X = E[tokens] + P[0:n] (P is omitted when positions are off).
- Q = X W_Q, K = X W_K, V = X W_V; S = Q Kᵀ/√d; A = softmax by row; H = A V.
- The readout is h = H[t] at the `WXV` position t; z = w·h + b; p = σ(z); the loss is the mean binary
  cross-entropy.
- There are no Q/K/V biases, no residual connection and no layer normalisation. Only row t of A receives
  gradient.

**Training.**
- Full-batch gradient descent with manual gradients. Initial parameters N(0, 0.5²) and b = 0.
- The `with_position` and `no_position` models are trained separately from the same seed.
- The learning rate and number of steps are tuned on the training loss only, before any test accuracy is
  examined, and are logged here.
- **Chosen: learning rate 0.1, 3,000 steps.** At learning rates 0.3, 0.5 and 2.0 at least one model became
  unstable: the training loss jumped up, or became NaN. At 0.1 both models' training losses fall steadily.
- Gradient check: central differences with ε = 1e-5 on every parameter. It passes when
  |numeric − analytic| / max(|numeric| + |analytic|, 1e-6) < 1e-5.

**Prediction and pass criterion (fixed before training).** On the test set:
- the model with positions reaches ≥ 0.90 accuracy on `misplaced_rbs`; **and**
- the model without positions reaches ≤ 0.50 on `misplaced_rbs`.

Overall and per-category accuracies are otherwise reported descriptively.

### 4.7 Notebook 04b — encoder training (PyTorch)

| Item | Value |
|---|---|
| Vocabulary | 64 RNA codons + `[PAD]`, `[MASK]`, `[CLS]`, `[EOS]` |
| Max length | 256 |
| d_model / heads / d_ff / layers | 32 / 2 / 64 / 2 |
| Positions | learned positional embeddings (removable for ablation) |
| Block | pre-LayerNorm: x + Attn(LN(x)); x + FF(LN(x)); FF uses ReLU |
| Attention | written explicitly (no `nn.MultiheadAttention`, no `nn.TransformerEncoder*`) |
| Objective | masked-codon prediction: 15% of non-special tokens replaced by `[MASK]`; loss on masked positions only |
| Optimiser | AdamW, lr 1e-3, batch 32, 60 epochs (≈30 in v1.0; see Details below); must train on a laptop CPU in minutes |
| Split | by genome, 80/20 |

**Configurations (each exported separately):** `full`; `no_position` (positional embeddings removed);
`causal` (causal attention mask). Snapshots at ≈10 epochs (log-spaced, including epoch 0) with weights,
train/test loss, masked-token accuracy.

**Details (Phase 4).** These fill in what the table above leaves open.

- **Sequence:** `[CLS]` + transcript (RNA codons) + `[EOS]`, padded with `[PAD]` to the batch's longest
  sequence.
- **Vocabulary order:** `[PAD]`, `[MASK]`, `[CLS]`, `[EOS]`, then the 64 RNA codons in `protocell_lang` order.
- **Masking:**
  - 15% of the codon tokens (never special tokens), rounded up, at least 1 per sequence;
  - the masks are redrawn every epoch from a seeded generator;
  - test metrics use one fixed, seeded set of masks;
  - masked-token accuracy is the top-1 prediction on the masked positions.
- **Attention:** 2 heads with d_head = 16 and scores scaled by 1/√16.
  - Q, K and V come from one `Linear(32 → 96)`, split into three, then into the two heads.
  - A `Linear(32 → 32)` output projection follows.
  - Key padding is masked; the `causal` configuration also masks keys j > i.
- **Normalisation and head:** LayerNorm with eps = 1e-5, a final LayerNorm, then an untied MLM head
  `Linear(32 → 68)`.
- **No dropout:** a teaching choice, so that the browser can reproduce the forward pass exactly.
- **Initialisation:** PyTorch defaults under `torch.manual_seed(42)`, with a fixed number of CPU threads.
- **Split:** 80/20 by genome, seeded. The test genome IDs are exported, so 04c uses the same split.
- **Epochs (Phase 5 change):** 60 instead of ≈30. At 30 epochs the `full` model's test loss was still
  falling (2.922 → 2.895 over the last 6 epochs). The change was decided before any probe or C result
  existed.
- **Snapshots:** at epochs 0, 1, 2, 4, 7, 11, 17, 26, 40 and 60. Each is evaluated with fixed, seeded masks on
  the training set (training performance) and on the test set: masked-token loss and masked-token accuracy.
- **Weights:** named tensors in PyTorch layout. A linear layer stores W as (out, in) and computes
  y = x Wᵀ + b; the JS forward pass follows the same convention. `no_position` has no `pos_emb`.
- **Final hidden state:** the output of the final LayerNorm. It is what the MLM head reads, and it is the
  occurrence vector of §4.8.
- **Parity tests:** 4 test transcripts per configuration (`K_low`, `K_high`, broken RBS, spacer decoy).
  - Each test stores the token IDs, the final hidden states and the layer-0 attention weights per head, all
    computed with the final snapshot's **rounded** (exported) weights, in float64.
  - The JS forward pass must match within 1e-4.

### 4.8 Notebook 04c — contextual analysis

- Occurrence vectors (final layer output) for the target codons of cases 1–3, from test genomes.
- **Linear probes** (logistic regression) per case: static baseline (input embedding / word2vec vector, which
  is constant per codon type, so it reaches only the majority baseline) vs. contextual vector. Report probe
  accuracy per snapshot (probe-accuracy-vs-epoch curve) and per configuration.
- PCA per target codon on final-snapshot vectors; export mean and components so the browser can project live
  vectors onto fixed axes.
- Encoder input embedding matrix vs. word2vec vectors (both static).

**Protocol (Phase 5, fixed before 04c ran).**
- **Targets.** These are fixed by the language, not by results:

  | Case | Target | Label | Majority |
  |---|---|---|---|
  | 1 | every `WXV` | true start vs false start | 0.78 |
  | 2 | `XYX` in gene bodies — the codon used most evenly by the seven genes (highest entropy of P(gene \| codon)) | gene | 0.48 |
  | 3 | `WVV` as the first codon of the attenuator | `leader_state` | 0.53 |

  The majority values are measured on the test transcripts.
- **Occurrences.** These come from the unique (genome, condition) transcripts of the encoder's 80 test
  genomes: 150 transcripts.
- **Probe.** Multinomial logistic regression (scikit-learn, C = 1, no scaling).
  - It is trained on the occurrences of half of those genomes and scored on the other half. The split is by
    genome and seeded.
  - **Contextual features:** the final hidden state.
  - **Static features:** the encoder's `tok_emb` row, which is constant per type.
  - It runs at every snapshot and for every configuration, and the verdicts use the final snapshot.
- **PCA axes.** Per (configuration, case), from the final-snapshot occurrence vectors.
- **Static comparison.** `tok_emb` against word2vec on the mixed corpus at ±1, dimension 8 (that run has RNA
  tokens). Descriptive only.
- **Forward pass.** 04c computes the forward pass in NumPy from the exported JSON weights, checked against
  `parity-tests.json`.

### 4.9 Lab C — Context Lab (replay + live inference)

Loads `encoder-<config>.json` and runs the forward pass in JS.

Panels:

1. **Training replay:** loss and masked-accuracy curves with an epoch slider; every other panel follows the
   slider by loading that snapshot's weights.
2. **Static view:** input embedding matrix projected to 2D, next to the word2vec result.
3. **Occurrence cloud:** pick a target codon; each occurrence (from `contextual-sample.json`) is run through
   the current snapshot and projected on the exported PCA axes; colour by ground-truth label. Shows clouds
   forming over training.
4. **Probe table and curves** (precomputed in 04c): static vs. contextual, per case and configuration.
5. **Transcript viewer:** a showcase transcript with regions coloured; attention heatmap with layer/head
   selector; arcs from a selected token.
6. **Mutation editor:** edit any base of the transcript; live forward pass; heatmap, arcs, and the token's
   projected point update. Preset mutations: break the RBS; restore it; delete the post-attenuator genes
   (turn a `K_low` transcript into `K_high`).
7. **Configuration selector:** full / no_position / causal.
8. **Code view** for each panel.

---

## 5. Data contract

The data contract is the interface between notebooks and labs. Change this section first, then the code.

### 5.1 Metadata block (every JSON file)

| Field | Content |
|---|---|
| `produced_by` | notebook path |
| `function` | name of the producing function |
| `source` | source excerpt of that function (`inspect.getsource`), shown in the labs' Code view |
| `seed` | random seed |
| `params` | parameters used |
| `generator_version` | version of `protocell_lang.py` |
| `created` | ISO timestamp |

### 5.2 Files

**`data/corpus/` (notebooks; long-format CSV)**

| File | Columns |
|---|---|
| `genome.csv` | genome_id, position, codon, region, gene, start_role, residue, pos_in_gene |
| `genome-shuffled.csv` | same columns as `genome.csv`; the same genomes with shuffled gene order (§2.2) |
| `transcripts.csv` | transcript_id, genome_id, condition, position, codon, region, gene, start_role, leader_state, residue, pos_in_gene |
| `proteins.csv` | genome_id, gene, translated (bool: RBS intact), residues (space-separated codes; empty when not translated) |

**`data/web/` (labs; JSON, each file ≤ 5 MB, total ≤ 20 MB)**

| File | Producer | Content |
|---|---|---|
| `language.json` | 01 | bases, transcription map, code table (stages I–II), residues, reserved codons, genes; the labs never hard-code these |
| `genome-sample.json` | 01 | ≈60 genomes (DNA) with labels; plus RNA versions (the corpus transcripts of the same genomes) for the mixed-corpus experiment and the same genomes in shuffled order; sequences stored column-wise (one array per label) |
| `showcase-transcripts.json` | 01 | ≈6 curated transcripts (K_low, K_high, broken RBS, spacer decoy) with labels |
| `cooccurrence.json` | 03a | `vocabulary`, `codon_class`, `windows`: [{half_window, counts, cosine, pca: {coords, explained_variance}}] |
| `w2v-results.json` | 03b | `vocabularies` {dna, mixed}, `training` (hyper-parameters), `configs`: [{corpus, half_window, dim, W, U, loss_history, cosine}], `predictions`: [{id, corpus, half_window, dim, metric, value, baseline, holds}] |
| `mini-transcripts.json` | 04a | `vocabulary` (64 RNA codons), `config`, `categories`, `train`/`test` [{tokens, target, label, category}], `models.{with_position, no_position}` {initial, trained (E, P, W_Q, W_K, W_V, w, b), loss_history, accuracy}, `parity` (test logits and attention rows at the readout), `criterion` |
| `encoder-full.json`, `encoder-no_position.json`, `encoder-causal.json` | 04b/04c | `config` (architecture, causal, use_position, vocabulary, special tokens, train/test genome IDs), `snapshots` [{epoch, train_loss, test_loss, masked_acc, weights}]; 04c adds `probes` {case: {target, label, classes, majority, curve [{epoch, static, contextual}], final {coef, intercept}}} |
| `contextual-sample.json` | 04c | the 150 unique test transcripts (tokens, ids, labels), per-case targets {token, label, classes, occurrences [[transcript, position, label]]}, PCA {config: {case: {mean, components, explained}}}, C1–C5 results |
| `parity-tests.json` | 04b | per configuration: `epoch` and `tests` [{label, transcript_id, ids, final (n × 32), attention_layer0 (heads × n × n)}]; tolerance 1e-4 |

Weights are stored as nested arrays rounded to 6 decimals, with named tensors matching the JS forward pass.

---

## 6. Phases and acceptance criteria

One phase per Claude Code session, starting in plan mode. Update `docs/architecture.md` at the end of each.

**Status (2026-11-02):** phases 0–6 are all done. What was built and measured is recorded per phase in
`architecture.md` §3–§9.

### Phase 0 — repository setup
- Directory skeleton; docs copied in; `CLAUDE.md` in place.
- Create `docs/architecture.md` as a skeleton (in the style of `zombienella_notebook_architecture.md`): one
  section per phase, filled in as each phase lands with the files, functions and data flow actually built.
- Update `protocell-0-spec.md`: §1.3 residue roster (§1.3 here), §2 code table (§1.2), §3.2 INTAKE → seven
  Nax genes (from the pathway document), §4 gene length and reserved codons (§1.4, §2.2).
- **Done when:** docs are consistent with each other; no code yet.

### Phase 1 — language module and generator
- `protocell_lang.py`; notebook 01; exports.
- **Done when:** all validation checks in §4.2 pass; gene-identifiability check printed; files match §5.

### Phase 2 — static embeddings
- Notebooks 03a, 03b; Lab A.
- **Done when:** Lab A trains live in seconds on the default subset without freezing; the notebook result loads
  for comparison; predictions S1–S6 (§7) reported, whether they hold or not.

### Phase 3 — attention by hand
- Notebook 04a; Lab B.
- **Done when:** gradient check passes; JS and NumPy agree on the forward pass for the same weights; the
  no-position toggle shows the predicted failure.

### Phase 4 — encoder training and export
- Notebook 04b (three configurations); JS forward pass in `web/shared/`; `parity-tests.json`.
- **Done when:** parity check passes in the browser at startup for all three configurations; training fits
  the CPU budget.

### Phase 5 — contextual analysis and Context Lab
- Notebook 04c; Lab C.
- **Done when:** predictions C1–C5 (§7) reported; mutation editor updates within interactive latency.

### Phase 6 (optional) — n-gram baselines
- Zombienella-style n-grams (orders 1–4) on transcripts; the spec's terminator experiment (predict the gene
  terminator at the end of the body) compared with the encoder.
- **Details (fixed before running):**
  - **Notebook:** `02-ngrams/02_ngram_baselines.ipynb`, run after 01 and 04b.
  - **N-gram data:** the n-grams are trained on the transcripts of the encoder's training genomes (the 04b
    split). Each sequence is wrapped in `<s>` … `</s>`.
  - **Smoothing:** add-k with k = 0.1 over the 64 codons plus `</s>`.
  - **Evaluation:** the 150 unique test transcripts of §4.8, with cross-entropy (bits per codon) and
    perplexity per order.
  - **Terminator experiment:** one item per gene terminator in those transcripts. Each model ranks the 7
    terminator codons at that position. An n-gram uses P(t | the previous n−1 tokens); an encoder masks the
    position and reads its MLM head (final snapshot).
  - **Comparison:** the main comparison is the `causal` encoder, which has the same left-only context as the
    n-grams. `full` and `no_position` are reported too. `full` also sees the right-hand context, where pathway
    order leaks the gene.
  - **Reference levels:** chance (1/7) and the majority-terminator rate.
  - **Outputs:** none for the labs (no data-contract file).

---

## 7. Predictions to verify

Report actual results. If a prediction fails, say so in the notebook and the lab; adjust generator parameters
only for a documented reason, never to force a result.

**Static (Part A)**

| ID | Prediction |
|---|---|
| S1 | The 16 coding codons separate from spacer-only codons. |
| S2 | Body codons cluster by preferred gene (dialect). |
| S3 | Synonymous codons cluster by register, not by residue, when their genes' preferences differ: distributional similarity is not semantic similarity. |
| S4 | WXZ has one vector blending true and false starts. |
| S5 | With a wide half-window (≥ the TERMINATOR_i → MARKER_i+1 distance, 5–9 positions; ±9), markers and terminators of adjacent genes lie close: pathway order recovered from sequence alone; the signal disappears in the shuffled-order corpus. Body codons do not carry it. Exception: NaxTAG → NaxSNIP spans the leader (intergenic 0–2 + leader 5 + spacer 0–2 + RBS 2 + gap 1–3 + WXZ + marker = 10–16 positions), so ±9 is predicted to recover the other five adjacent pairs, not this one. |
| S6 | In the mixed DNA+RNA corpus, Z/V pairs (ZWX/VWX etc.) converge through shared neighbours. |

**Pass criteria for S1–S6.** These were fixed before any training (Phase 2).

Basis:
- the target vectors W and cosine similarity;
- every result is reported for half-windows ±1 and ±9 and dimensions 2, 3 and 8, and the verdict uses
  dimension 8;
- the baseline is the 95th percentile of 1,000 label permutations (seeded);
- "beats the baseline" means strictly greater.

| ID | Metric | Holds if |
|---|---|---|
| S1 | Mean class purity of the 5 nearest neighbours, over the 16 coding + 26 spacer-only codons (reserved codons excluded); classes coding / spacer-only | purity > baseline |
| S2 | Over the 16 coding codons labelled with their preferred gene (the argmax of `codon_distribution`): the fraction whose nearest coding neighbour has the same label | fraction > baseline |
| S3 | Mean cosine of coding pairs with the same register (third base) and different residues, minus the mean cosine of the six synonym pairs | difference > 0 |
| S4 | One vector per codon type, by construction. Reported descriptively: WXZ's nearest neighbours, and the share of WXZ occurrences that are false starts | — (by construction) |
| S5 | Of the 5 pathway-adjacent pairs that do not span the leader, the number in which terminator_i ranks marker_(i+1) first among the 7 markers | pathway corpus at ±9: 5 of 5; shuffled corpus at ±9: ≤ 2 of 5 (chance ≈ 0.7). For body codons, reported descriptively. |
| S6 | Mixed corpus: the mean cosine over the Z/V twins (each Z-containing codon and its V form) | mean > the 95th percentile of the mean over 1,000 random DNA-form/RNA-form pairings |

**Contextual (Part B)**

| ID | Prediction |
|---|---|
| C1 | Probes: static vectors reach only the majority baseline; contextual vectors approach 100% for cases 1–3. |
| C2 | Case 1: attention from WXZ concentrates on the RBS; breaking the RBS moves WXZ across the cloud boundary. |
| C3 | Case 2: shared body codons cluster by gene. |
| C4 | `causal` configuration: case 3 falls to chance; cases 1 and 2 survive. |
| C5 | `no_position` configuration: cases 1 and 2 collapse (the model cannot tell which RBS or marker belongs to which gene). |

**Caveat:** with strong dialects, many masked codons are predictable from neighbours alone; the masked-token
loss is not evidence that attention does the work. The probes are.

**Baselines (Phase 6).**

| ID | Prediction | Holds if |
|---|---|---|
| P6 | N-grams beat chance on the terminator through dialect leakage, and attention buys the remaining gap (protocell-0-spec §4.1). | (a) every n-gram of order 2–4 is > 1/7 on the test terminators, **and** (b) the `causal` encoder is ≥ the best n-gram + 0.10 |

**Pass criteria for C1–C5.** These were fixed before 04c ran. Accuracies are probe-test accuracies at the
final snapshot; "majority" is the majority-class rate of that case (§4.8).

| ID | Holds if |
|---|---|
| C1 | `full`: for each of cases 1–3, the static probe is ≤ majority + 0.02 **and** the contextual probe is ≥ 0.95 |
| C2 | `full`, both parts:<br>(a) in some layer/head, the mean over true starts of the attention that `WXV` puts on its two RBS codons is ≥ 0.30;<br>(b) mutating the nearer RBS codon `WXX` → `XXX` flips the case-1 probe to "false start" for ≥ 80% of the correctly classified probe-test true starts |
| C3 | `full`: the case-2 contextual probe is ≥ 0.90 |
| C4 | `causal`: case 3 is ≤ majority + 0.05, **and** cases 1 and 2 are ≥ 0.90 |
| C5 | `no_position`: cases 1 and 2 are both ≤ majority + 0.10 |

---

## 8. Conventions

- Bases end in -ine, residues in -an; DNA uses Z, RNA uses V; genes are written NaxGATE … NaxDUMP.
- All randomness seeded and reproducible (Python and JS).
- UI and comments in English.
- Wording in labs: "training performance" for training-set metrics; never call proximity "meaning".
- Biology claims stay modest and point to `protocell-0-energy-pathway.md` for the real counterparts.

---

## 9. Remaining open items (not blocking)

1. **NaxGATE isoforms** (pathway doc §5): two related genes for rich/poor environments — a natural extension
   for paralog similarity in both embedding types.
2. **NaxGATE + NaxTAG fusion** (PTS-style): kept separate (seven genes); more classes help the language side.
3. **NaxGATE role label** (receptor vs. transporter): graph side only.
4. **Low-food scenario:** graph side only in version 1; on the language side it would change transcript
   frequencies, not sequences.
5. **Stage III** (synonymy at scale) and the chemiosmotic branch: later versions.

Items arising from the implementation (case 1 in the encoder, the wording of C1, repeatable browser checks,
Colab and browser coverage, an optional Phase 6 panel) are listed in `status-and-decisions.md` §6.

## 10. References

- `protocell-0-spec.md`; `protocell-0-energy-pathway.md`.
- Zombienella notebook architecture (`santanche/nlp2learn/zombie/zombienella/`).
- Direction Embeddings Lab (`santanche/nlp2learn/machine-learning/neural-network/feedforward/`).
- Ikehara, K. GNC–SNS hypothesis on the origin of the genetic code.
- Mikolov et al. (2013) word2vec; Devlin et al. (2019) BERT (masked-language-model objective).
- Debates: `docs/ai/attention_encoders_pathway_debate_chatgpt.md`, `docs/ai/attention_encoders_pathway_debate_gemini.md`.
