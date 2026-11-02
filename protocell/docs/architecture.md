# Protocell-0 Language Labs: Architecture of the Notebooks and Web Labs

*Maintained as phases land. What to build is in `design-spec.md`; this document records what has actually been
built: files, functions and data flow. Update it at the end of every phase.*

## 1. Overview

The project is a sequence of experiments over one invented genetic language. The corpus is fixed by the
generator; the experiments change how its codons are represented: first one vector per codon type (static
embeddings, Part A), then one vector per codon occurrence (contextual embeddings, Part B).

### 1.1 Directory organization

Current state (after Phase 1). Directories marked *(empty)* hold only a `.gitkeep`.

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
├── 03-static/                    (empty) notebooks 03a, 03b — Phase 2
├── 04-attention/                 (empty) notebooks 04a, 04b, 04c — Phases 3–5
├── data/
│   ├── corpus/                   genome.csv, genome-shuffled.csv, transcripts.csv, proteins.csv
│   └── web/                      language.json, genome-sample.json, showcase-transcripts.json
└── web/
    ├── shared/                   (empty) styles, seeded RNG, matrix utils, charts, code viewer
    ├── codon-embeddings/         (empty) Lab A — Phase 2
    ├── attention-inspector/      (empty) Lab B — Phase 3
    └── context-lab/              (empty) Lab C — Phase 5
```

### 1.2 Pipeline (built through notebook 01; the rest planned)

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

**Status:** not yet built.

### Files
### Functions
### Data flow
### Outputs
### Verification (predictions S1–S6, §10)

## 6. Phase 3 — Attention by hand (04a, Lab B)

**Status:** not yet built.

### Files
### Functions
### Data flow
### Outputs
### Verification (gradient check; JS–NumPy forward agreement; no-position toggle)

## 7. Phase 4 — Encoder training and export (04b, JS forward pass)

**Status:** not yet built.

### Files
### Functions
### Data flow
### Outputs
### Verification (browser parity check for all three configurations; CPU training time)

## 8. Phase 5 — Contextual analysis and Context Lab (04c, Lab C)

**Status:** not yet built.

### Files
### Functions
### Data flow
### Outputs
### Verification (predictions C1–C5, §10; mutation-editor latency)

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
| S1 | coding codons separate from spacer-only codons | not yet run | | |
| S2 | body codons cluster by preferred gene | not yet run | | |
| S3 | synonyms cluster by register, not residue | not yet run | | |
| S4 | WXZ has one blended vector | not yet run | | |
| S5 | ±9 recovers pathway order (5 adjacent pairs; TAG→SNIP excepted); gone when shuffled | not yet run | | |
| S6 | Z/V pairs converge in the mixed corpus | not yet run | | |
| C1 | static probes at the majority baseline; contextual probes near 100% | not yet run | | |
| C2 | WXZ attends to the RBS; breaking it moves the vector | not yet run | | |
| C3 | shared body codons cluster by gene | not yet run | | |
| C4 | `causal`: case 3 at chance; cases 1–2 survive | not yet run | | |
| C5 | `no_position`: cases 1–2 collapse | not yet run | | |

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
