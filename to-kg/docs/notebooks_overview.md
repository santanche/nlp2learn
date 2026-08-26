# Notebooks Overview

**Purpose of this document.** A single map of every notebook in
`notebooks/`: what it does, what environment it needs, what it reads and
writes, and how it depends on the others. Use this as the entry point
before diving into the deeper design docs (`data_source.md`,
`kg_extraction_methodology.md`, `kg_viewer.md`), each of which covers one
notebook or artifact in much more detail.

**On the numbering.** The prefixes are not one strict global sequence —
they encode two related but separate progressions:

- `01` → `02a`/`02b` → `03` is the **data pipeline**: download once, then
  explore the result three ways (CSV sample, CSV full, DuckDB).
- `02_tokenization` → `10_kg_extraction` is the **NLP pipeline** that
  consumes the DuckDB database once it exists — `02_tokenization.ipynb`'s
  own `02` refers to Lecture 2 of the IR course it walks through, not to a
  position after `02a`/`02b`/`03`. `10_kg_extraction.ipynb` jumps to `10`
  to mark it as the culminating deliverable rather than a literal tenth
  step.

If that's confusing on first read, the table below groups notebooks by
what they actually depend on rather than by prefix.

## Map

| Notebook | Environment | Reads | Writes | Role |
|---|---|---|---|---|
| [`01_data_preparation.ipynb`](../notebooks/01_data_preparation.ipynb) | `data-prep` | Zenodo (network) | `data/raw/`, `data/duckdb/clinical_cases.duckdb`, `data/csv/full/`, `data/csv/sample/` | Downloads the MultiCaRe files, builds the DuckDB database, exports CSV in full and 50-article-sample form. Everything downstream depends on this having run once. |
| [`02a_csv_data_exploraton_sample.ipynb`](../notebooks/02a_csv_data_exploraton_sample.ipynb) | `data-prep` | `data/csv/sample/` | — (read-only) | Example queries (schema, text length, demographics, joins, journal/license) over the small CSV sample, via DuckDB's `read_csv_auto`. Fast, good for a first look or live demo. |
| [`02b_csv_data_exploraton_full.ipynb`](../notebooks/02b_csv_data_exploraton_full.ipynb) | `data-prep` | `data/csv/full/` | — (read-only) | The same queries as `02a`, over the full CSV export. Slower (DuckDB re-parses CSV text per query) — run it to see what the sample's numbers were standing in for. |
| [`03_duckdb_data_exploraton.ipynb`](../notebooks/03_duckdb_data_exploraton.ipynb) | `data-prep` | `data/duckdb/clinical_cases.duckdb` | — (read-only) | The same queries again, this time against the native DuckDB tables (typed columns, e.g. `authors`/`mesh_terms` stay real arrays instead of the bracketed-text form they take in CSV). The fastest of the three, and the reference for what "correct" types look like. |
| [`02_tokenization.ipynb`](../notebooks/02_tokenization.ipynb) | `kg-extraction` | `data/duckdb/clinical_cases.duckdb` | — (read-only) | A guided tour of *Introduction to Information Retrieval*, Lecture 2 (normalization, tokenization problems, case folding, stop words, stemming, lemmatization) plus modern subword tokenization (BPE/WordPiece/SentencePiece), using real sentences mined from `cases`/`metadata` rather than toy examples. Diagnostic precursor to `10_kg_extraction.ipynb`, not a separate pipeline. |
| [`10_kg_extraction.ipynb`](../notebooks/10_kg_extraction.ipynb) | `kg-extraction` | `data/duckdb/clinical_cases.duckdb` | `data/kg_extraction/*.csv`, `kg.graphml`, `graph_data.js`, `kg_preview.html` | The main deliverable: an illustrative, fully local, encoder-only (BERT-family) NER → grounding → relation-extraction → graph pipeline over a configurable sample of cases. Design rationale in [`kg_extraction_methodology.md`](kg_extraction_methodology.md). |

Downstream of all of these, but not a notebook: **[`viewer/graph_viewer.html`](../viewer/graph_viewer.html)** auto-loads `data/kg_extraction/graph_data.js` from the last `10_kg_extraction.ipynb` run — see [`kg_viewer.md`](kg_viewer.md).

## Dependency graph

```
Zenodo (network)
       │
       ▼
01_data_preparation.ipynb
       │
       ├──► data/csv/sample/  ──► 02a_csv_data_exploraton_sample.ipynb
       │
       ├──► data/csv/full/    ──► 02b_csv_data_exploraton_full.ipynb
       │
       └──► data/duckdb/clinical_cases.duckdb
                  │
                  ├──► 03_duckdb_data_exploraton.ipynb
                  │
                  ├──► 02_tokenization.ipynb
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

- **`environment/data-prep`** (DuckDB, pandas, requests — lightweight): `01_data_preparation.ipynb`, `02a_csv_data_exploraton_sample.ipynb`, `02b_csv_data_exploraton_full.ipynb`, `03_duckdb_data_exploraton.ipynb`.
- **`environment/kg-extraction`** (PyTorch, transformers, spaCy/scispaCy — heavier): `02_tokenization.ipynb`, `10_kg_extraction.ipynb`.

## Other documents in `docs/`

- [`data_source.md`](data_source.md) — where the corpus comes from, why
  those specific Zenodo files were picked, and the exact schema of
  `cases`/`metadata`/`data_dictionary` in both DuckDB and CSV form. The
  reference for `01_data_preparation.ipynb` and all three exploration
  notebooks.
- [`kg_extraction_methodology.md`](kg_extraction_methodology.md) — the
  design behind `10_kg_extraction.ipynb`'s eight-stage pipeline, and the
  trade-offs of going fully local/encoder-only instead of calling a
  generative LLM.
- [`kg_viewer.md`](kg_viewer.md) — the design behind
  `viewer/graph_viewer.html`.
