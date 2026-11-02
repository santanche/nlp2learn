# Protocell-0 Language Labs

Jupyter notebooks and browser labs that show how static (word2vec-style) and contextual (attention-encoder)
embeddings form. The text they learn from is the genome of Protocell-0, an invented organism with an invented
genetic code. Its energy pathway — seven Nax genes — is a simplified, renamed glycolysis. Because the grammar
is ours, every claim about what a model learned can be checked against the ground truth.

Audience: students in machine learning and bioinformatics courses.

**Status:** version 1 is complete (2026-11-02). All phases of the design are implemented.

## Using the labs (no notebook needed)

The labs read only the committed files in `data/web/`. From this directory:

```bash
python -m http.server
```

Then open `http://localhost:8000/web/`. Opening the HTML files directly (`file://…`) does not work.

| Lab | What students do |
|---|---|
| A · Codon Embeddings | train word2vec live on Protocell-0 genomes; compare with notebook 03b; test predictions S1–S6 |
| B · Attention Inspector | train one attention head by hand: is this start codon a true start? Switch positions off and see it fail |
| C · Context Lab | replay a small encoder's training; watch occurrence clouds form; read probes; mutate a transcript live |

## Running the notebooks

Install the dependencies in `requirements.txt` (the PyTorch CPU build is enough), then run each notebook **from
its own directory**:

1. `01-corpus/01_generate_corpus.ipynb` — the corpus. Run it first: `data/corpus/` is not committed.
2. `03-static/03a_cooccurrence.ipynb`, `03-static/03b_word2vec.ipynb` — static embeddings.
3. `04-attention/04a_attention_by_hand.ipynb` — one attention head with manual gradients (needs only
   `protocell_lang.py`).
4. `04-attention/04b_encoder_training.ipynb` — the encoder (about 8.5 min), then **always**
   `04c_contextual_analysis.ipynb`, which adds the probes Lab C needs.
5. `02-ngrams/02_ngram_baselines.ipynb` — n-gram baselines and the terminator experiment (after 01 and 04b).

The full run order, run times and environment are in
[docs/status-and-decisions.md](docs/status-and-decisions.md) §2.

## Documentation

1. [docs/status-and-decisions.md](docs/status-and-decisions.md) — **start here when resuming**: status, how
   to rebuild, conventions, decisions and their reasons, limitations, open items.
2. [docs/design-spec.md](docs/design-spec.md) — what is built: the language, the data contract, the phases,
   and the predictions with their pass criteria. Authoritative.
3. [docs/architecture.md](docs/architecture.md) — what was built, phase by phase: files, functions, data flow,
   measured results, the predictions log (§10) and the spec change log (§12).
4. [docs/protocell-0-energy-pathway.md](docs/protocell-0-energy-pathway.md) — the seven Nax genes and their
   real counterparts.
5. [docs/protocell-0-spec.md](docs/protocell-0-spec.md) — the organism: bases, staged code, grammar.

Background: [docs/ai/](docs/ai/) holds the design debates, and [legacy/](legacy/) holds the superseded
prototype.

## Layout

| Path | Content |
|---|---|
| `protocell_lang.py` | the language definition, the single source of truth |
| `01-corpus/` | corpus generator |
| `02-ngrams/` | n-gram baselines (optional phase) |
| `03-static/` | co-occurrence and word2vec |
| `04-attention/` | attention by hand, encoder training, contextual analysis |
| `data/corpus/` | full CSVs for the notebooks (generated, not committed) |
| `data/web/` | size-budgeted JSON for the labs (committed) |
| `web/` | the labs (`codon-embeddings/`, `attention-inspector/`, `context-lab/`) and their shared modules |

## Results in one table

Each prediction's pass criterion was fixed before the experiment ran. The results are reported as they came
out (details in `docs/architecture.md` §10).

| Holds | Fails |
|---|---|
| S1, S2, S6 (static embeddings); S4 by construction | S3, S5 |
| P3 — without positions, a misplaced RBS cannot be told from a true start | — |
| C3, C5 (contextual probes) | C1, C2, C4 |
| P6 — n-grams beat chance on the terminator; the causal encoder beats them by far | — |

The central lesson of Part B: the masked-codon encoder learned what its objective needed (which gene a codon
is in), but not whether a start codon is real. The one-head model of Lab B, trained on exactly that question,
learned it perfectly.

## Status

| Phase | Content | Status |
|---|---|---|
| 0 | repository setup, consistent docs | done |
| 1 | language module and corpus generator | done |
| 2 | static embeddings (03a, 03b, Lab A) | done |
| 3 | attention by hand (04a, Lab B) | done |
| 4 | encoder training and export (04b) | done |
| 5 | contextual analysis and Context Lab (04c, Lab C) | done |
| 6 | n-gram baselines (optional) | done |
