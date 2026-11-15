# Notebooks Overview

**Purpose of this document.** A single map of every notebook in
`notebooks/`: what it does, what environment it needs, what it reads and
writes, and how it depends on the others. Use this as the entry point
before diving into the deeper design docs (`data_source.md`,
`kg_extraction_methodology.md`, `kg_viewer.md`), each of which covers one
notebook or artifact in much more detail.

**Before any of them: the dataset.** The MultiCaRe data is prepared
outside this project, by
[`multicare_data_preparation.ipynb`](../../data/multicare/preparation/multicare_data_preparation.ipynb)
in `data/multicare/` at the repository root, because other parts of the
repository use it too (e.g. `techniques/ner/` reads the CSV sample). Paths
below starting with `data/multicare/` are relative to the repository root;
`data/kg_extraction/` is this project's own (gitignored) output folder.

**On the numbering.** `01_tokenization` → `02a`/`02b` → `03` →
`10_kg_extraction`. The `02a`/`02b`/`03` exploration notebooks only read
the prepared data and can be run in any order (or before `01`).
`10_kg_extraction.ipynb` jumps to `10` to mark it as the culminating
deliverable rather than a literal tenth step.

## Map

| Notebook | Environment | Reads | Writes | Role |
|---|---|---|---|---|
| [`multicare_data_preparation.ipynb`](../../data/multicare/preparation/multicare_data_preparation.ipynb) (outside this project) | `data-prep` | Zenodo (network) | `data/multicare/data/raw/`, `data/multicare/data/duckdb/clinical_cases.duckdb`, `data/multicare/data/csv_full/`, `data/multicare/data/csv_sample/` | Downloads the MultiCaRe files, builds the DuckDB database, exports CSV in full and 50-article-sample form. Everything downstream depends on this having run once. |
| [`01_tokenization.ipynb`](../notebooks/01_tokenization.ipynb) | `kg-extraction` | `data/multicare/data/duckdb/clinical_cases.duckdb` | — (read-only) | A guided tour of *Introduction to Information Retrieval*, Lecture 2 (normalization, tokenization problems, case folding, stop words, stemming, lemmatization) plus modern subword tokenization (BPE/WordPiece/SentencePiece), using real sentences mined from `cases`/`metadata` rather than toy examples. Diagnostic precursor to `10_kg_extraction.ipynb`, not a separate pipeline. |
| [`02a_csv_data_exploration_sample.ipynb`](../notebooks/02a_csv_data_exploration_sample.ipynb) | `data-prep` | `data/multicare/data/csv_sample/` | — (read-only) | Example queries (schema, text length, demographics, joins, journal/license) over the small CSV sample, via DuckDB's `read_csv_auto`. Fast, good for a first look or live demo. |
| [`02b_csv_data_exploration_full.ipynb`](../notebooks/02b_csv_data_exploration_full.ipynb) | `data-prep` | `data/multicare/data/csv_full/` | — (read-only) | The same queries as `02a`, over the full CSV export. Slower (DuckDB re-parses CSV text per query) — run it to see what the sample's numbers were standing in for. |
| [`03_duckdb_data_exploration.ipynb`](../notebooks/03_duckdb_data_exploration.ipynb) | `data-prep` | `data/multicare/data/duckdb/clinical_cases.duckdb` | — (read-only) | The same queries again, this time against the native DuckDB tables (typed columns, e.g. `authors`/`mesh_terms` stay real arrays instead of the bracketed-text form they take in CSV). The fastest of the three, and the reference for what "correct" types look like. |
| [`10_kg_extraction.ipynb`](../notebooks/10_kg_extraction.ipynb) | `kg-extraction` | `data/multicare/data/duckdb/clinical_cases.duckdb` | `data/kg_extraction/*.csv`, `kg.graphml`, `graph_data.js`, `kg_preview.html` | The main deliverable: an illustrative, fully local, encoder-only (BERT-family) NER → grounding → relation-extraction → graph pipeline over a configurable sample of cases. Design rationale in [`kg_extraction_methodology.md`](kg_extraction_methodology.md). |

Downstream of all of these, but not a notebook: **[`viewer/graph_viewer.html`](../viewer/graph_viewer.html)** auto-loads `data/kg_extraction/graph_data.js` from the last `10_kg_extraction.ipynb` run — see [`kg_viewer.md`](kg_viewer.md).

## Dependency graph

```
Zenodo (network)
       │
       ▼
data/multicare/preparation/multicare_data_preparation.ipynb
       │
       ├──► data/multicare/data/csv_sample/  ──► 02a_csv_data_exploration_sample.ipynb
       │                                      (also read by techniques/ner/)
       │
       ├──► data/multicare/data/csv_full/    ──► 02b_csv_data_exploration_full.ipynb
       │
       └──► data/multicare/data/duckdb/clinical_cases.duckdb
                  │
                  ├──► 01_tokenization.ipynb
                  │
                  ├──► 03_duckdb_data_exploration.ipynb
                  │
                  └──► 10_kg_extraction.ipynb
                              │
                              ▼
                  data/kg_extraction/graph_data.js
                              │
                              ▼
                  viewer/graph_viewer.html
```

## Which environment for which notebook

Matches the `environment/<name>/requirements.txt` split described in the
main [`README.md`](../README.md#two-separate-environments):

- **`environment/data-prep`** (DuckDB, pandas, requests — lightweight): `multicare_data_preparation.ipynb` (in `data/multicare/preparation/`), `02a_csv_data_exploration_sample.ipynb`, `02b_csv_data_exploration_full.ipynb`, `03_duckdb_data_exploration.ipynb`.
- **`environment/kg-extraction`** (PyTorch, transformers, spaCy/scispaCy — heavier): `01_tokenization.ipynb`, `10_kg_extraction.ipynb`.

## Other documents in `docs/`

- [`data_source.md`](data_source.md) — where the corpus comes from, why
  those specific Zenodo files were picked, and the exact schema of
  `cases`/`metadata`/`data_dictionary` in both DuckDB and CSV form. The
  reference for `multicare_data_preparation.ipynb` and all three exploration
  notebooks.
- [`kg_extraction_methodology.md`](kg_extraction_methodology.md) — the
  design behind `10_kg_extraction.ipynb`'s eight-stage pipeline, and the
  trade-offs of going fully local/encoder-only instead of calling a
  generative LLM.
- [`kg_viewer.md`](kg_viewer.md) — the design behind
  `viewer/graph_viewer.html`.
