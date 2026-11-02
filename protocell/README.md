# Protocell-0 Language Labs

Jupyter notebooks and browser labs that show how static (word2vec-style) and contextual (attention-encoder)
embeddings form. The text they learn from is the genome of Protocell-0, an invented organism with an invented
genetic code. Its energy pathway — seven Nax genes — is a simplified, renamed glycolysis.

Audience: students in machine learning and bioinformatics courses.

## Reading order

1. [docs/design-spec.md](docs/design-spec.md) — what is built, the data contract, phases, predictions.
2. [docs/protocell-0-energy-pathway.md](docs/protocell-0-energy-pathway.md) — the seven Nax genes and their
   real counterparts.
3. [docs/protocell-0-spec.md](docs/protocell-0-spec.md) — the organism: bases, staged code, grammar.
4. [docs/architecture.md](docs/architecture.md) — what has been built so far.

Background: [docs/ai/](docs/ai/) holds the design debates; [legacy/](legacy/) holds the superseded prototype.

## Layout

| Path | Content |
|---|---|
| `protocell_lang.py` | the language definition, the single source of truth (Phase 1) |
| `01-corpus/` | corpus generator notebook |
| `02-ngrams/` | optional n-gram baselines |
| `03-static/` | co-occurrence and word2vec notebooks |
| `04-attention/` | attention by hand, encoder training, contextual analysis |
| `data/corpus/` | full CSVs for notebooks |
| `data/web/` | size-budgeted JSON for the labs |
| `web/` | the browser labs and their shared modules |

## Running the labs

From this directory:

```bash
python -m http.server
```

then open `http://localhost:8000/web/`. The labs read only from
`data/web/`.

## Status

| Phase | Content | Status |
|---|---|---|
| 0 | repository setup, consistent docs | done |
| 1 | language module and corpus generator | done |
| 2 | static embeddings (03a, 03b, Lab A) | done |
| 3 | attention by hand (04a, Lab B) | done |
| 4 | encoder training and export (04b) | not started |
| 5 | contextual analysis and Context Lab (04c, Lab C) | not started |
| 6 | n-gram baselines (optional) | not started |
