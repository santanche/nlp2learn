# Protocell-0 Language Labs — Design Specification

**Static and contextual embeddings over the Protocell-0 energy pathway**

*Version 1.0 · 2026-11-01 · Companion to `protocell-0-spec.md` and `protocell-0-energy-pathway.md`*

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

### 2.4 Decoys (controlled polysemy of WXZ)

| Decoy | Rate parameter (default) | Label |
|---|---|---|
| Bare `WXZ` in a spacer, followed by a gene marker with probability 0.5 | `p_spacer_decoy` = 1.0 per genome (Poisson mean) | `false_start_spacer` |
| Gene block with one base of the RBS mutated (gene otherwise intact) | `p_broken_rbs` = 0.15 per gene block | `false_start_broken_rbs` |

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
│   └── ai/                       ← background debates (ChatGPT, Gemini)
├── legacy/protocell_lm.py        ← superseded prototype; not imported
├── protocell_lang.py             ← single source of truth for the language
├── 01-corpus/01_generate_corpus.ipynb
├── 02-ngrams/                    ← optional (phase 6)
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

### 4.5 Lab A — Codon Embeddings Lab (live training)

Modelled on the Direction Embeddings Lab: Train / Step / Reset, learning rate, epochs, seed, window,
dimension, corpus (DNA / DNA+RNA mixed / shuffled order), corpus size (subset of `genome-sample.json` so a
run takes seconds).

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
| Optimiser | AdamW, lr 1e-3, batch 32, ≈30 epochs; must train on a laptop CPU in minutes |
| Split | by genome, 80/20 |

**Configurations (each exported separately):** `full`; `no_position` (positional embeddings removed);
`causal` (causal attention mask). Snapshots at ≈10 epochs (log-spaced, including epoch 0) with weights,
train/test loss, masked-token accuracy.

### 4.8 Notebook 04c — contextual analysis

- Occurrence vectors (final layer output) for the target codons of cases 1–3, from test genomes.
- **Linear probes** (logistic regression) per case: static baseline (input embedding / word2vec vector, which
  is constant per codon type, so it reaches only the majority baseline) vs. contextual vector. Report probe
  accuracy per snapshot (probe-accuracy-vs-epoch curve) and per configuration.
- PCA per target codon on final-snapshot vectors; export mean and components so the browser can project live
  vectors onto fixed axes.
- Encoder input embedding matrix vs. word2vec vectors (both static).

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
| `transcripts.csv` | transcript_id, genome_id, condition, position, codon, region, gene, start_role, leader_state, residue, pos_in_gene |
| `proteins.csv` | genome_id, gene, translated (bool), residues |

**`data/web/` (labs; JSON, each file ≤ 5 MB, total ≤ 20 MB)**

| File | Producer | Content |
|---|---|---|
| `language.json` | 01 | bases, transcription map, code table (stages I–II), residues, reserved codons, genes; the labs never hard-code these |
| `genome-sample.json` | 01 | ≈60 genomes (DNA) with labels; plus RNA versions for the mixed-corpus experiment and a shuffled-order sample |
| `showcase-transcripts.json` | 01 | ≈6 curated transcripts (K_low, K_high, broken RBS, spacer decoy) with labels |
| `cooccurrence.json` | 03a | matrices, cosine similarities, PCA coordinates per window |
| `w2v-results.json` | 03b | per configuration: W, U, cosine similarities, loss history |
| `mini-transcripts.json` | 04a | Lab B dataset and the NumPy-trained weights for comparison |
| `encoder-full.json`, `encoder-no_position.json`, `encoder-causal.json` | 04b/04c | architecture config, vocabulary, snapshots [{epoch, train_loss, test_loss, masked_acc, weights}], probe curves |
| `contextual-sample.json` | 04c | ≈100 test transcripts, target-codon positions and labels, PCA mean/components per target codon |
| `parity-tests.json` | 04b | inputs with expected final hidden states and layer-0 attention weights; tolerance 1e-4 |

Weights are stored as nested arrays rounded to 6 decimals, with named tensors matching the JS forward pass.

---

## 6. Phases and acceptance criteria

One phase per Claude Code session, starting in plan mode. Update `docs/architecture.md` at the end of each.

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

## 10. References

- `protocell-0-spec.md`; `protocell-0-energy-pathway.md`.
- Zombienella notebook architecture (`santanche/nlp2learn/zombie/zombienella/`).
- Direction Embeddings Lab (`santanche/nlp2learn/machine-learning/neural-network/feedforward/`).
- Ikehara, K. GNC–SNS hypothesis on the origin of the genetic code.
- Mikolov et al. (2013) word2vec; Devlin et al. (2019) BERT (masked-language-model objective).
- Debates: `docs/ai/attention_encoders_pathway_debate_chatgpt.md`, `docs/ai/attention_encoders_pathway_debate_gemini.md`.
