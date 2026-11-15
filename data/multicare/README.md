# MultiCaRe

Clinical case reports from PubMed Central — the **MultiCaRe** dataset
([Zenodo, concept DOI 10.5281/zenodo.10079369](https://doi.org/10.5281/zenodo.10079369);
Nievas Offidani et al., *Data*, 2026). It is kept here, at the repository
root, because several parts of the repository use it:

* [`to-kg/`](../../to-kg/) — From Clinical Case Reports to Knowledge Graphs
  (DuckDB database and CSV exports);
* [`techniques/ner/`](../../techniques/ner/) — the NER notebook series (CSV
  sample).

(`projects/` keeps its own copy of the sample, so each project stays
self-contained.)

## Layout

```
data/multicare/
├── preparation/
│   └── multicare_data_preparation.ipynb   # downloads from Zenodo, builds everything below
└── data/
    ├── raw/            # cases.parquet, metadata.parquet, data_dictionary.csv   (gitignored)
    ├── duckdb/         # clinical_cases.duckdb: cases, metadata, data_dictionary (gitignored)
    ├── csv_full/       # the three tables as CSV, all rows                      (gitignored)
    └── csv_sample/     # the three tables, fixed 50-article sample (seed 42)    (versioned)
```

Only `csv_sample/` (≈220 KB) is in git, so notebooks that only need the
sample work right after cloning. Everything else (≈860 MB) is re-created by
running
[`preparation/multicare_data_preparation.ipynb`](preparation/multicare_data_preparation.ipynb)
once, in the `data-prep` environment of `to-kg`
([`to-kg/README.md`](../../to-kg/README.md), Docker or `uv`).

Provenance, file selection and the exact table schemas are documented in
[`to-kg/docs/data_source.md`](../../to-kg/docs/data_source.md).
