# Protocell-0 Language Labs: Architecture of the Notebooks and Web Labs

*Maintained as phases land. What to build is in `design-spec.md`; this document records what has actually been
built: files, functions and data flow. Update it at the end of every phase.*

## 1. Overview

The project is a sequence of experiments over one invented genetic language. The corpus is fixed by the
generator; the experiments change how its codons are represented: first one vector per codon type (static
embeddings, Part A), then one vector per codon occurrence (contextual embeddings, Part B).

### 1.1 Directory organization

Current state (after Phase 5). Directories marked *(empty)* hold only a `.gitkeep`.

```text
protocell/
├── CLAUDE.md                     working rules for Claude Code sessions
├── README.md                     project overview, reading order, phase status
├── docs/
│   ├── design-spec.md            what to build (authoritative)
│   ├── protocell-0-spec.md       the organism: bases, code, pathways, grammar
│   ├── protocell-0-energy-pathway.md   the seven Nax genes and their real counterparts
│   ├── architecture.md           this document
│   └── ai/                       background debates (ChatGPT, Gemini) on attention and the pathway
├── protocell_lang.py             the language, single source of truth (Phase 1)
├── requirements.txt              Python dependencies of the notebooks
├── legacy/
│   ├── README.md
│   ├── protocell_lm.py           superseded prototype (A/C/G/T); not imported
│   └── requirements.txt
├── 01-corpus/01_generate_corpus.ipynb   corpus generator — Phase 1
├── 02-ngrams/                    (empty) optional n-gram baselines — Phase 6
├── 03-static/03a_cooccurrence.ipynb, 03b_word2vec.ipynb — Phase 2
├── 04-attention/04a_attention_by_hand.ipynb (Phase 3), 04b_encoder_training.ipynb (Phase 4),
│                 04c_contextual_analysis.ipynb (Phase 5)
├── data/
│   ├── corpus/                   genome.csv, genome-shuffled.csv, transcripts.csv, proteins.csv
│   └── web/                      language.json, genome-sample.json, showcase-transcripts.json,
│                                 cooccurrence.json, w2v-results.json, mini-transcripts.json,
│                                 encoder-{full,no_position,causal}.json, parity-tests.json, contextual-sample.json
└── web/
    ├── index.html                landing page
    ├── shared/                   styles.css, rng.js, linalg.js, charts.js, data.js, codeview.js, encoder.js
    ├── codon-embeddings/         Lab A: index.html, lab.css, lab.js, skipgram.js, predictions.js
    ├── attention-inspector/      Lab B: index.html, lab.css, lab.js, attention.js
    └── context-lab/              Lab C: index.html, lab.css, lab.js
```

### 1.2 Pipeline (built through Phase 2; the rest planned)

```text
protocell_lang.py  (language: bases, code table, residues, reserved codons, genes, dialects)
        |
        v
01-corpus/01_generate_corpus.ipynb
        |
        +--> data/corpus/genome.csv, genome-shuffled.csv, transcripts.csv, proteins.csv
        +--> data/web/language.json, genome-sample.json, showcase-transcripts.json
        |
   +----+------------------------+------------------------------+
   |                             |                              |
   v                             v                              v
03-static/                   04-attention/                  04-attention/
03a co-occurrence            04a attention by hand          04b encoder (PyTorch)
03b word2vec                   |                              |
   |                           | mini-transcripts.json        | encoder-<config>.json
   | cooccurrence.json         v                              | parity-tests.json
   | w2v-results.json        Lab B (web/attention-inspector)  v
   v                                                        04c contextual analysis
 Lab A (web/codon-embeddings)                                 |
                                                              | contextual-sample.json, probe curves
                                                              v
                                                            Lab C (web/context-lab)
```

The labs are served with `python -m http.server` from `protocell/` and read only from `data/web/`.

## 2. Single sources of truth

- **Language:** `protocell_lang.py` only. Notebooks import it; labs read `data/web/language.json`, which is
  exported from it.
- **Data contract:** `design-spec.md` §5 (metadata block, file list, columns). Not restated here; this
  document records only the deviations and the producing functions.

## 3. Phase 0 — Repository setup

**Status:** done (2026-11-01).

### Files
- `docs/architecture.md` (this document), `README.md`, `legacy/README.md`.
- Directory skeleton of `design-spec.md` §4.1, each directory with a `.gitkeep`.
- Moved from `cell/`: `ai/*.md` → `docs/ai/`; `protocell_lm.py`, `requirements.txt` → `legacy/`.

### Functions
None (no code in this phase).

### Data flow
None.

### Documentation changes
- `protocell-0-spec.md` revised to match `design-spec.md` v1.0: real analogues of the bases (§1.1); Stage II
  residue roster with quellan (Qu) replacing vethan (§1.3); explicit Stage I–II code table, reserved-codon table
  and Stage II degeneracy (§2); INTAKE as the seven Nax genes and "you need K to make K" (§3.2), with version 1
  limited to INTAKE; one Nax operon per genome, 12–24-codon bodies, per-gene markers, terminators and
  dialects, and the kelate leader (§4); the attenuator as a conditional terminator (§5); the language-model
  mapping table (§6); implementation status pointing to `legacy/` and this document (§7).
- `protocell-0-energy-pathway.md` §8: a status line for each open item.
- `design-spec.md`: see §12, spec change log.

### Verification
- The directory tree matches `design-spec.md` §4.1.
- No outdated terms remain in the docs (NaxA–NaxD, vethan/Ve, 30–60-codon genes, one terminator per class),
  except where they are named as historical.
- Reserved codons counted: 22, all outside `[XY]N[XY]`; 48 − 22 = 26 spacer-only codons.
- No code files besides `legacy/protocell_lm.py`.

## 4. Phase 1 — Language module and generator

**Status:** done (2026-11-01).

### Files
- `protocell_lang.py` — the language; `GENERATOR_VERSION = "1.0.0"`.
- `01-corpus/01_generate_corpus.ipynb` — the generator, executed with stored outputs. It is run from its own
  directory and imports the module through `sys.path.insert(0, "..")`.
- `requirements.txt`. The environment is a uv venv at `protocell/.venv` (gitignored).

### Functions
`protocell_lang.py` holds definitions and tiny helpers only. Its tables:

| Name | Content |
|---|---|
| `BASES` | the four DNA bases plus V |
| `CODE_TABLE` | the 16 coding codons, written out |
| `RESIDUES` | the 10 residues |
| `PROMOTER`, `RBS`, `INITIATOR`, `K_SENSOR`, `TX_TERMINATOR` (= `ATTENUATOR`) | the reserved signals |
| `MULTI_CODON_MOTIFS` | the signals that span several codons |
| `SIGNALS` | the signals as records, for printing and export |
| `GENES` | name, role, marker, terminator, dialect description, `register`, `composition` |
| `SYNONYM_PREFERENCE` = 0.8 | the strength of the synonym preference |
| `RESERVED_CODONS` (22), `SPACER_ONLY_CODONS` (26) | the codon inventories |
| `REGIONS`, `CONDITIONS`, `START_ROLES`, `LEADER_STATES` | the label vocabularies |

Its helpers:
- `transcribe` and `to_dna`;
- `synonyms`, `translate`, `codon_distribution(gene)` (composition × synonym preference) and `codon_class`;
- `language_as_dict()`, which builds `language.json`.

Consistency asserts run on import.

The notebook's functions, all inline:

| Function | Role |
|---|---|
| `record` | one labelled codon |
| `make_spacer` | uniform over 63 codons (no `WXZ`), never completing a signal internally |
| `make_gene_block` | RBS (broken with p = 0.15, one of 8 non-reserved mutations), gap, `WXZ`, marker, body from the dialect, terminator, intergenic spacer |
| `make_genome_parts` | the flanks, promoter, 5'UTR, gene blocks, leader and TX terminator; Poisson(1) decoys placed into 11 uniform slots |
| `assemble(parts, order)` | lays the parts out; the leader goes before NaxSNIP |
| `find_unintended_motifs` | finds signals spelled anywhere other than their intended place |
| `make_genome` | resamples until both orders are clean |
| `transcribe_genome` | builds a transcript (below) |
| `translate_genes` | builds the proteins |
| `show_sequence` | HTML display, coloured by region |
| `gene_order`, `leader_before_snip` | used by the validation |
| `pick_showcase` | chooses the showcase transcripts (below) |
| `metadata`, `columns`, `write_json` | export helpers |

`transcribe_genome` starts at the TSS, right after the promoter, and replaces Z with V. It ends at the TX
terminator for `K_low` and at the attenuator for `K_high`, and it sets `leader_state` on the leader codons.

`pick_showcase` takes, for each rule, the first transcript that fits:
- `K_low` and `K_high` transcripts of one clean genome;
- a transcript with a broken RBS;
- a `K_high` transcript with a broken RBS;
- a decoy followed by a marker;
- a bare decoy.

### Data flow
```text
protocell_lang (GENES, CODE_TABLE, signals)
  -> make_genome_parts -> assemble(pathway) -> genomes          -> genome.csv, proteins.csv
                       -> assemble(shuffled) -> genomes_shuffled -> genome-shuffled.csv
  genomes -> transcribe_genome x 4 per genome (condition drawn uniformly) -> transcripts.csv
  genomes[0:60] + their transcripts + shuffled twins -> genome-sample.json
  transcripts -> pick_showcase -> showcase-transcripts.json
  language_as_dict() -> language.json
```
The JSON files store their sequences column-wise (`fields` lists the arrays). `genome-sample.json` has three
lists — `genomes`, `transcripts` and `shuffled` (each shuffled genome carries a `gene_order`). Each showcase
entry has `label`, `description`, `transcript_id`, `genome_id` and `condition`. The metadata `source` field
concatenates the producer and the functions it calls:
- `make_genome_parts` + `make_spacer` + `make_gene_block` + `assemble` + `transcribe_genome`;
- `pick_showcase` + `transcribe_genome`;
- `language_as_dict`.

### Outputs (seed 42)

| File | Rows / size |
|---|---|
| `genome.csv`, `genome-shuffled.csv` | 97,991 rows each, 2.8 MB each |
| `transcripts.csv` | 194,715 rows, 8.1 MB (756 `K_low`, 844 `K_high` transcripts) |
| `proteins.csv` | 2,800 rows (84.5% translated) |
| `language.json` | 0.01 MB |
| `genome-sample.json` | 2.29 MB |
| `showcase-transcripts.json` | 0.04 MB |

- Genomes are 193–287 codons long (mean 245).
- 85 draws were rejected because two adjacent parts spelled an unintended multi-codon signal.

### Verification
- **Grammar validation:** all 15 checks pass (notebook §11).
- **Gene identifiability** (notebook §10), with chance at 1/7 = 0.143:

  | k body codons | test accuracy | training performance |
  |---|---|---|
  | 1 | 0.489 | 0.470 |
  | 3 | 0.688 | 0.683 |
  | 10 | **0.950** (target ≥ 0.90) | 0.950 |

  The highest single-codon posterior is **0.595** (`YXX` → NaxGRAB; target ≤ 0.6).
- **Determinism:** two runs give identical CSVs and identical JSON files, once `created` is excluded.
- **Consistency:** `CODE_TABLE`, `RESIDUES`, `SIGNALS` and the markers and terminators were cross-checked
  against `design-spec.md` §1.2, §1.3, §1.4 and §2.1.
- **Runtime:** about 4 s on a laptop CPU.

### Dialect tuning log
- First draft: hand-written weights following §2.1. Its analytic accuracy at k = 10 was 0.844, below the 0.90
  target; NaxTAG ("mixed") was the weakest gene at 0.73.
- The emphasised residues were sharpened (weights 4–6) and the background residues lowered (0.5–1). This
  reached 0.948 analytically.
- The highest single-codon posterior then reached 0.63 (`YXX`, NaxGRAB). NaxGRAB's Si weight was lowered from
  5 to 4, giving 0.59.

No prediction of §7 was consulted.

## 5. Phase 2 — Static embeddings (03a, 03b, Lab A)

**Status:** done (2026-11-01).

### Files
- `03-static/03a_cooccurrence.ipynb` — the Zombienella 03a method on the genome. It runs in about 6 s.
- `03-static/03b_word2vec.ipynb` — skip-gram with negative sampling in NumPy, the 18-run grid and the S1–S6
  tests. It runs in about 3.5 min, of which 193 s is training.
- `web/index.html` — the landing page.
- `web/shared/` — the shared modules: `styles.css`, `rng.js`, `linalg.js`, `charts.js`, `data.js` and
  `codeview.js` (ES modules).
- `web/codon-embeddings/` — Lab A: `index.html`, `lab.css`, `lab.js` (UI), `skipgram.js` (model) and
  `predictions.js` (S1–S6).
- `protocell_lang.py` gained `preferred_gene(codon)`, exported as `language.json` → `preferred_genes`.
  Notebook 01 was re-run, and only `language.json` changed.
- `requirements.txt`: added matplotlib and scikit-learn. Playwright is installed in `.venv` for testing only.

### Functions
- **03a:**
  - `build_cooccurrence_matrix(sequences, vocabulary, half_window)`;
  - `cosine_similarity_matrix`, `nearest_neighbours`;
  - `project_with_pca` (scikit-learn), `plot_codons`.
- **03b:**
  - `read_sequences`, `vocabulary_of` (the 64 DNA codons, then the V forms, keeping only tokens that occur);
  - `build_positive_pairs` (by offset), `noise_distribution` (count^¾);
  - `add_rows` (an `np.bincount` scatter-add), `train_skipgram`, the plotting helpers;
  - the prediction tests `s1_coding_vs_spacer`, `s2_preferred_gene`, `s3_register_vs_residue`,
    `s4_initiator`, `s5_pathway_order`, `s6_zv_twins`, with `permutation_baseline` and `cosine_matrix`.
- **`skipgram.js`** — the same algorithm as 03b:
  - `buildCorpus`, `buildVocabulary`, `buildPairs`, `noiseDistribution`, `prepareData`;
  - `createModel`, `pairForward`;
  - `makeEpochSamples` (async; it yields every 250k samples), `batchGradients`, `applyGradients`;
  - `trainEpoch` (async; it yields every 40 batches);
  - `gradientCheck`: central differences on every parameter of a 6-codon, 3-dimensional model.
- **`predictions.js`:** `s1CodingVsSpacer` … `s6ZvTwins` and `measurePredictions`, ported line for line from
  03b.
- **`lab.js`:** a renderer for each panel, and `train` and `rebuild`. `window.labA` is exposed for
  automated checks.
- **Shared modules:**
  - `createRng` (mulberry32, seeded) and `categoricalSampler`;
  - `cosineMatrix`, `nearest`, `pca` (power iteration with deflation, with a sign convention);
  - `lineChart`, `scatter2d`, `createScatter3d` (drag to rotate);
  - `attachCodeView`, `jsSource`, `pythonSource`.

### Data flow
```text
genome.csv ─> 03a ─> cooccurrence.json  (counts, cosine, PCA for ±1, ±2, ±4)
genome.csv, genome-shuffled.csv, transcripts.csv ─> 03b ─> w2v-results.json
        (18 configs: W, U, loss history, cosine; predictions; Python sources of the trainer and the tests)
language.json + genome-sample.json + w2v-results.json ─> Lab A
        live: buildCorpus(subset) → buildPairs → trainEpoch …  ·  replay: the notebook W for the same config
```
Lab A's corpora come from `genome-sample.json`:

| Corpus | Source |
|---|---|
| dna | `genomes` |
| shuffled | `shuffled` |
| mixed | `genomes` + `transcripts` |

In each case, the first N genomes are used: 10, 20, 40 or 60.

### Outputs
- `cooccurrence.json` is 0.13 MB and `w2v-results.json` is 0.89 MB.
- Lab A uses the same algorithm and hyper-parameters as 03b, but its own RNG.
- On the default subset (20 genomes, about 4,800 codons), 5 epochs take 0.2 s at ±1 and 0.7 s at ±9.
- The worst case (60 genomes, mixed corpus, ±9: 736k positive pairs, 4.4M samples) takes 1.6 s per epoch.

### Verification
- **Notebooks:** both run top to bottom and are deterministic (the hashes of a second run match, ignoring
  `created`).
- **Lab A**, tested with Playwright and Chromium on `python -m http.server`:
  - the gradient check passes, with a maximum relative error of 4.5e-10;
  - there are no console errors;
  - the longest pause in the UI during training is 43 ms on the default subset and 38 ms in the worst case.
    Before `makeEpochSamples` was made to yield, the worst case froze the page for 1.6 s;
  - Reset with the same seed reproduces W exactly;
  - every corpus, dimension and colouring renders;
  - all six Code views are populated;
  - screenshots were checked at 1366×768 and 1920×1080.
- **Parity of the metrics:** the JS prediction functions, applied to the notebook's exported W for all 18
  configurations, reproduce all 42 notebook metric values (|Δ| ≤ 1e-6), all verdicts and the first neighbour
  in S4. The permutation baselines differ only by RNG (max |Δ| = 0.06, one step of S2's 1/16 resolution).

### Observations worth teaching (03a)
- At every window, codons that fill the same grammatical *slot* get similar count vectors:
  - the markers are each other's nearest neighbours;
  - the RBS codon `WXX` is closest to `ZXX` and `WXW`, its broken-RBS mutants.
- PC1 of the raw count matrices correlates 0.89–0.96 with codon frequency, so the PCA plots mostly sort
  codons by frequency. This is reported in the notebook.

### Training caveat (03b)
- The ±9 losses are flat after epoch 1.
- The ±1 losses still fall by about 0.002 per epoch at epoch 5. The number of epochs was fixed before the
  predictions were computed and was not changed afterwards.

## 6. Phase 3 — Attention by hand (04a, Lab B)

**Status:** done (2026-11-02).

### Files
- `04-attention/04a_attention_by_hand.ipynb` — the NumPy model, the gradient check, both models, the
  criterion, and attention heat maps. It runs in about 13 s.
- `web/attention-inspector/` — Lab B: `index.html`, `lab.css`, `lab.js` (UI) and `attention.js` (maths).
- `web/shared/charts.js`: `lineChart` gained the `xValues` and `yRange` options.
- `web/index.html`: Lab B is linked.

### Functions
- **04a:**
  - `make_mini_transcript(category, rng)`, `make_dataset`;
  - `init_params`, `forward` (one sequence, every tensor);
  - `batch_arrays` (padding and mask);
  - `forward_backward` (batched, only the WXV row, manual gradients);
  - `gradient_check`, `train_model`, `predict`, `accuracy_table`, `plot_attention`.
- **`attention.js`:**
  - `createParams` (seeded by mulberry32), `paramsFromJSON`;
  - `embed`, `forward` (every tensor), `lossAndGradients` (the same equations, one sequence at a time);
  - `trainStep`, `evaluate`, `gradientCheck`, `parityCheck`.
- **`lab.js`:** the sequence editor (a click on a base cycles W→X→Y→V), attention arcs, matrix heat maps,
  training curves, the per-category table and the criterion. `window.labB` is exposed for automated checks.

### Data flow
```text
protocell_lang ─> 04a: make_dataset (600 train / 300 test, seed 42) ─> train both models (lr 0.1, 3000 steps)
      ─> mini-transcripts.json: dataset, initial + trained weights (full precision), loss histories,
         accuracies, parity data (test logits and WXV attention rows), criterion, Python sources
mini-transcripts.json + language.json ─> Lab B
      start-up: gradientCheck (5 sequences, every parameter, both models)
                parityCheck (the notebook's trained weights, all 300 test sequences, both models)
      live: trainStep (full batch) from a JS seed or from the notebook's initial weights
```

### Outputs (seed 42, notebook)
Test accuracy, overall and per category:

| Model | overall | true_start | broken_rbs | no_rbs | misplaced_rbs |
|---|---|---|---|---|---|
| with positions | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| without positions | 0.787 | 0.830 | 1.000 | 1.000 | **0.260** |

- With positions, the training performance is 1.000 everywhere.
- Without positions, the training performance is 0.875 overall and 0.576 on misplaced RBS: it memorises
  training sequences through their spacer codons.
- The training loss falls from 0.685 to 0.0008 with positions, and from 0.687 to 0.271 without.
- `mini-transcripts.json` is 0.44 MB.

### Verification
- **04a:** the gradient check passes (max relative error 6.2e-7 with positions, 1.7e-6 without; threshold
  1e-5). The batched and one-sequence logits agree to 6e-17, and the notebook is deterministic.
- **Lab B**, tested with Playwright:
  - the gradient check passes (5.7e-6);
  - **forward parity:** the JS forward pass on the notebook's trained weights matches the NumPy logits and
    attention rows to max |Δ| 3.8e-14, on all 300 test sequences and both models;
  - **training parity:** 300 JS steps from the notebook's initial weights reproduce the notebook's loss history
    to a relative 2e-15;
  - a live run (JS seed 42, 3,000 steps per model) takes about 24 s per model, with the longest UI pause at
    70 ms. Its test accuracy on misplaced RBS is 0.96 with positions and 0.36 without, so the criterion also
    holds live;
  - Reset reproduces a run;
  - mutating one base of the RBS of a true start moves p from 1.000 to 0.068;
  - there are no console errors;
  - Lab A still works with the changed `charts.js`.

## 7. Phase 4 — Encoder training and export (04b, JS forward pass)

**Status:** done (2026-11-02).

### Files
- `04-attention/04b_encoder_training.ipynb`: the PyTorch encoder written out, three configurations, learning
  curves, a first look at attention, the export and a self-check. It runs in about 8.5 min on a 4-thread CPU
  (60 epochs; see the Phase 5 update below).
- `web/shared/encoder.js`: the JS forward pass (float64).
- `web/context-lab/` (Lab C skeleton): `index.html`, `lab.css`, `lab.js`. It runs the start-up parity check
  and shows the training replay with an epoch slider.
- `web/shared/charts.js`: `lineChart` gained per-series `dash` and a `highlight` band.
- `web/index.html`: Lab C is linked and marked "in progress".
- `requirements.txt`: added `torch`, installed from the CPU index.

### Functions
- **04b:**
  - `pad_batch`, `mask_tokens` (15% of codons, at least 1, never special tokens);
  - the classes `SelfAttention` (fused QKV, head split, padding and causal masks, returns the weights),
    `Block` (pre-LN, ReLU FF) and `Encoder` (tok_emb, optional pos_emb, 2 blocks, ln_final, head);
  - `evaluate`, `fixed_masks`, `train_config` (AdamW, snapshots);
  - `model_from_weights` (float64, from rounded weights), `parity_cases`, `class_source` (method sources,
    because `inspect` cannot read a class defined in a notebook).
- **`encoder.js`:** `loadWeights`, `linear` (x Wᵀ + b), `layerNorm`, `relu`, `selfAttention`,
  `encoderForward` (returns embeddings, per-layer attention and outputs, and `final`), `predictTokens`,
  `parityCheck`.
- **Lab C:** `renderReplay` (all three configurations on the same axes, training dashed and test solid, with the
  selected snapshot highlighted) and `renderParity`. `window.labC` is exposed for checks.

### Data flow
```text
transcripts.csv ─> 04b: split by genome (seed 42; 320 / 80 genomes → 1280 / 320 transcripts)
   ─> train full / no_position / causal (AdamW, 60 epochs, snapshots 0,1,2,4,7,11,17,26,40,60)
   ─> encoder-<config>.json (config incl. train/test genome IDs; snapshots with weights rounded to 6 dp)
   ─> parity-tests.json (4 test transcripts per config: final vectors + layer-0 attention, float64, from rounded weights)
encoder-*.json + parity-tests.json ─> Lab C: parityCheck at start-up; training replay
```

### Outputs (seed 42; 60 epochs since Phase 5)
| Config | test masked-token accuracy | training performance | test loss | time |
|---|---|---|---|---|
| full | 0.254 | 0.269 | 2.750 | 158 s |
| no_position | 0.102 | 0.095 | 3.376 | 167 s |
| causal | 0.279 | 0.292 | 2.615 | 174 s |

- Guessing the most frequent codon would score 0.071.
- The first Phase 4 run (30 epochs) gave 0.227 / 0.098 / 0.244.
- File sizes stay about the same: about 2.8 MB per encoder with positions, 2.1 MB without, and 2.9 MB for
  `parity-tests.json`.

### Verification
- **04b self-check:** reloading each exported file reproduces `parity-tests.json` exactly (Δ = 0).
- **Determinism:** two runs give identical hashes, ignoring `created`.
- **Lab C** (Playwright):
  - all three configurations pass the parity check at start-up. The max |Δ| is 5.0e-8 for both the final
    vectors and the layer-0 attention, which is the 7-decimal rounding of the stored expected values; the
    tolerance is 1e-4;
  - the check takes 35–97 ms per configuration, and the page loads in 0.4 s from a local server;
  - the configuration selector and the epoch slider update the replay;
  - there are no console errors, and Labs A and B still work.

### Observations (descriptive; predictions belong to 04c)
- **`full` is not fully converged, even at 60 epochs:** its test loss is 2.844 → 2.750 between epochs 40 and
  60. At 30 epochs it was 2.922 → 2.895 over the last 6 epochs; that is why the epoch count was raised before
  Phase 5.
- **`causal` slightly beats `full` on masked-token accuracy.** In this generator, the gene body to the left of
  a masked codon already reveals the dialect.
- **`no_position` barely beats the most-frequent baseline.** Without positions, every token sees the same bag
  of tokens.

## 8. Phase 5 — Contextual analysis and Context Lab (04c, Lab C)

**Status:** done (2026-11-02). It started by retraining 04b with 60 epochs (see Phase 4).

### Files
- `04-attention/04c_contextual_analysis.ipynb`. It runs in about 20 s and covers:
  - a NumPy forward pass from the exported JSON weights, checked against `parity-tests.json` (Δ 5e-8);
  - the occurrences of the three targets in the 150 unique test transcripts;
  - probes at every snapshot for all three configurations, static against contextual;
  - the C1–C5 evaluation: C2a (attention mass on the RBS) and C2b (the RBS-mutation flip rate);
  - a descriptive check of cutting a transcript after its attenuator;
  - PCA clouds, and the static view.
- `04b` gained `EPOCHS = 60`. Its observations cell was rewritten in place, without re-running the code cells.
- `web/context-lab/` is complete: all eight panels.
- `web/shared/charts.js`: `heatmapCanvas` (canvas, for up to 223 × 223) and a `star` point shape.

### Functions
- **04c:**
  - `layer_norm`, `softmax`, `encoder_forward` (it mirrors `encoder.js`);
  - `build_transcripts` (unique (genome, condition) transcripts), `find_occurrences`, `run_probe`
    (`LogisticRegression(C=1)`), `occurrence_vectors`;
  - `rbs_positions`, `flip_rate`, `probe_block`.
- **Lab C `lab.js`:**
  - `weights` (cached per configuration and snapshot), `idsOf`;
  - `probeProbabilities`, which applies 04c's final probe weights in the browser;
  - `project`, onto 04c's PCA axes;
  - `caseOf`;
  - one renderer per panel: `renderReplay`, `renderStatic`, `renderCloud` (async with chunked forward passes,
    a cache, and cancellation by job number), `renderProbes`, `renderEditor`;
  - the presets `breakRbs` and `truncateAfterAttenuator`;
  - `runParity`, which also checks the cloud projections against 04c's reference points;
  - `window.labC` is exposed for checks.

### Data flow
```text
encoder-*.json + parity-tests.json + transcripts.csv ─> 04c (NumPy forward from the exported weights)
   ─> probes per snapshot × configuration × case ─> encoder-*.json gains "probes" (curves + final probe weights)
   ─> contextual-sample.json: 150 test transcripts with labels, target occurrences, PCA axes (+5 reference
      projections) per configuration × case, C1–C5 verdicts
Lab C: encoder-*.json, parity-tests.json, contextual-sample.json, showcase-transcripts.json, w2v-results.json,
       language.json ─> parity at start-up; every panel follows the configuration and the epoch slider
```

Running 04b again rewrites the encoder files without `probes`, so 04c must be run after it.

### Outputs (seed 42)
Probe-test accuracy at the final snapshot (contextual / static):

| Case (target) | majority | full | no_position | causal |
|---|---|---|---|---|
| 1 (`WXV`, true vs false start) | 0.78 | 0.777 / 0.788 | 0.788 / 0.788 | 0.804 / 0.788 |
| 2 (`XYX` in a body, gene) | 0.48 | **0.916** / 0.509 | 0.486 / 0.509 | **0.953** / 0.509 |
| 3 (`WVV` attenuator, leader state) | 0.53 | **0.803** / 0.513 | **1.000** / 0.513 | 0.500 / 0.513 |

- **C2a:** the maximum attention mass from a true-start `WXV` onto its RBS codons is 0.061, in layer 1,
  head 1.
- **C2b:** breaking the RBS flips the probe for 0.011 of 278 true starts.
- **Truncation check** (`full`, case 3, probe-test): cutting the `K_low` transcripts after the attenuator turns
  29 of 37 "read-through" predictions into "attenuated". The `K_high` transcripts get 32 of 39 "attenuated".
- The cosine structures of `tok_emb` and word2vec correlate at 0.03.
- `contextual-sample.json` is 0.77 MB. All of `data/web/` comes to 15.2 MB.

### Verification
- **04c:** NumPy matches PyTorch's parity values (Δ 5.0e-8). Two runs give identical hashes for the encoder
  files and `contextual-sample.json`.
- **Lab C** (Playwright):
  - parity at start-up passes for all three configurations: final vectors and attention Δ 5.0e-8, cloud
    projections against 04c Δ ≤ 4.3e-15;
  - **mutation editor:** about 57 ms per edit, including the forward pass and redraw, on the longest test
    transcript (221 codons); the target was < 200 ms;
  - **cloud:** about 1.4–3.4 s the first time a (configuration, snapshot) is shown, with a progress counter,
    and instant from the cache after that;
  - the presets work. "Break RBS" barely moves the case-1 probe, consistent with C2. "Delete the genes after
    the attenuator" moves the case-3 probe for most transcripts;
  - a newly loaded transcript opens with its selected token in view;
  - there are no console errors, and Labs A and B still work.

### Results in short
- C3 and C5 hold; C1, C2 and C4 fail (§10).
- The main lesson: **the masked-codon objective did not make the encoder represent RBS integrity** (case 1),
  while the supervised one-head model of 04a learned it perfectly.
- **A surprise:** `no_position` solves case 3 from the *composition* of the transcript (which genes are
  present), without seeing order.
- The full discussion is in 04c, §5.

## 9. Phase 6 (optional) — N-gram baselines

**Status:** not yet built.

### Files
### Functions
### Data flow
### Outputs
### Verification (terminator experiment vs. encoder)

## 10. Predictions log

Report each prediction as it actually came out (`design-spec.md` §7). Do not tune the generator to force a
result.

| ID | Prediction (short) | Status | Result | Where reported |
|---|---|---|---|---|
| S1 | coding codons separate from spacer-only codons | **holds** | 5-NN purity 1.000 (±1), 0.995 (±9) vs baseline ≈ 0.59 | 03b, Lab A |
| S2 | body codons cluster by preferred gene | **holds** | nearest coding neighbour same gene 0.81 (±1), 0.94 (±9) vs ≈ 0.25 | 03b, Lab A |
| S3 | synonyms cluster by register, not residue | **fails** | same-register − synonym cosine −0.007 (±1), −0.019 (±9) at dim 8; slightly positive at dims 2–3 | 03b, Lab A |
| S4 | WXZ has one blended vector | holds by construction | 74.5% true / 13.7% broken RBS / 11.8% spacer decoy; nearest neighbour at ±9 is `WXX` | 03b, Lab A |
| S5 | ±9 recovers pathway order (5 adjacent pairs; TAG→SNIP excepted); gone when shuffled | **fails** | ±9: 3 of 5 ranked first (others second; criterion 5 of 5); shuffled 0 of 5 (control behaves); ±1: 0 of 5 | 03b, Lab A |
| S6 | Z/V pairs converge in the mixed corpus | **holds** | twin cosine 0.41 (±1), 0.29 (±9) vs random 0.30, 0.22 | 03b, Lab A |
| P3 | (Phase 3) without positions, a misplaced RBS cannot be told from a true start | **holds** | test accuracy on misplaced RBS: 1.000 with positions (≥ 0.90), 0.260 without (≤ 0.50); live Lab B run 0.96 / 0.36 | 04a, Lab B |
| C1 | static probes at the majority baseline; contextual probes near 100% | **fails** | full contextual: case 1 0.777 (≈ majority), case 2 0.916, case 3 0.803 (needed ≥ 0.95); static case 2 0.509 > 0.50 (split artefact: it equals the probe-test majority share) | 04c, Lab C |
| C2 | WXZ attends to the RBS; breaking it moves the vector | **fails** | max attention mass on the RBS 0.061 (needed ≥ 0.30); RBS mutation flips 0.011 of 278 (needed ≥ 0.80) | 04c, Lab C |
| C3 | shared body codons cluster by gene | **holds** | full case 2 probe 0.916 (≥ 0.90); causal 0.953 | 04c, Lab C |
| C4 | `causal`: case 3 at chance; cases 1–2 survive | **fails** | case 3 0.500 (at chance, as predicted); case 2 0.953; case 1 0.804 (needed ≥ 0.90; no configuration learned case 1) | 04c, Lab C |
| C5 | `no_position`: cases 1–2 collapse | **holds** | case 1 0.788, case 2 0.486 (both at majority); unexpectedly, case 3 1.000 | 04c, Lab C |

## 11. Reproducibility

- Every random process is seeded (Python and JS); the default corpus seed is 42 (`design-spec.md` §4.2).
- Train/test splits are by genome, never by transcript.
- Each JSON in `data/web/` carries the metadata block of `design-spec.md` §5.1, including the producing
  function's source.

## 12. Spec change log

| Date | Phase | Section | Change | Reason |
|---|---|---|---|---|
| 2026-11-01 | 0 | design-spec §7, S5 | NaxTAG → NaxSNIP named as an exception: the leader makes that distance 10–16, beyond ±9 | the 5–9 figure holds only for adjacent gene blocks without the leader |
| 2026-11-01 | 0 | design-spec §2.2 | in shuffled genomes the leader stays directly before NaxSNIP; the shuffled corpus is a genome-only control | placement was unspecified; the control element moves with the gene it controls |
| 2026-11-01 | 0 | design-spec §1.3 | "Change vs. spec" column renamed "Change vs. original spec (v0)" | `protocell-0-spec.md` now carries the revised roster |
| 2026-11-01 | 0 | design-spec §4.1, §10 | layout includes `docs/ai/` and `legacy/`; debate paths updated | files moved from `cell/` |
| 2026-11-01 | 1 | design-spec §2.3 | dialect weights in `protocell_lang.GENES`; two synonym registers; targets ≥ 0.90 at k = 10 and max posterior ≤ 0.6 | the spec gave only qualitative constraints |
| 2026-11-01 | 1 | design-spec §2.4 | decoy slots (11, uniform) and broken-RBS mutations (8 non-reserved options) | placement and mutation rules were unspecified |
| 2026-11-01 | 1 | design-spec §2.2 | genomes generated as parts and assembled in both orders; assemblies with unintended signals resampled | makes the shuffled corpus differ only in order |
| 2026-11-01 | 1 | design-spec §2.6 | label conventions (gene on rbs…terminator; intergenic/decoys none; leader spacer = `spacer`; 0-based `pos_in_gene`) | unspecified |
| 2026-11-01 | 1 | design-spec §5.2 (data contract) | added `genome-shuffled.csv`; `proteins.csv` semantics; `genome-sample.json` column-wise, RNA = corpus transcripts | 03b needs the shuffled corpus; file budget |
| 2026-11-01 | 2 | design-spec §7 | pass criteria for S1–S6 (metrics, permutation baselines, thresholds), fixed before any training | predictions must be testable, not judged after the fact |
| 2026-11-01 | 2 | design-spec §4.4 | training algorithm and hyper-parameters, identical in NumPy and JS; the 18-run grid; the mixed-corpus definition | Lab A and 03b must run the same maths |
| 2026-11-01 | 2 | design-spec §4.5 | Lab A option lists (half-windows, dimensions, corpus sizes) | unspecified |
| 2026-11-01 | 2 | design-spec §5.2 (data contract) | contents of `cooccurrence.json` and `w2v-results.json` (adds `predictions`, `training`) | the labs need the prediction table and hyper-parameters |
| 2026-11-02 | 3 | design-spec §4.6 | the mini-transcript dataset is specified, with a new `misplaced_rbs` category | without it, a model with no positions could solve the task from the tokens alone, and the spec's prediction would fail by construction |
| 2026-11-02 | 3 | design-spec §4.6 | model equations, training (lr 0.1, 3,000 steps, chosen on training loss only), gradient-check rule, and the pre-registered criterion | the spec gave the architecture only in words |
| 2026-11-02 | 3 | design-spec §5.2 (data contract) | contents of `mini-transcripts.json` | Lab B needs the dataset, initial and trained weights, and parity data |
| 2026-11-02 | 4 | design-spec §4.7 | sequence format, vocabulary order, masking rule, attention layout, final LN + untied head, no dropout, initialisation and threads, snapshot epochs and metrics, weight layout, definition of the "final hidden state", parity-test construction | unspecified, and needed for exact JS parity |
| 2026-11-02 | 4 | design-spec §5.2 (data contract) | contents of `encoder-<config>.json` (adds train/test genome IDs; 04c adds `probes`) and `parity-tests.json` | Lab C and 04c need them |
| 2026-11-02 | 5 | design-spec §4.7 | 60 epochs, with new snapshot epochs | `full` had not converged at 30 epochs; decided before any probe result existed |
| 2026-11-02 | 5 | design-spec §4.8 | the 04c protocol: targets, probe, split, static features, PCA axes, static comparison, NumPy forward pass | unspecified |
| 2026-11-02 | 5 | design-spec §7 | pass criteria for C1–C5, fixed before 04c ran | predictions must be testable |
| 2026-11-02 | 5 | design-spec §5.2 (data contract) | `probes` in `encoder-*.json`; contents of `contextual-sample.json` (150 transcripts instead of ≈100) | Lab C needs the probe weights, the PCA axes and the labels |
