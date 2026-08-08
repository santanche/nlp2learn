# From Clinical Case Reports to Knowledge Graphs

See [Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md](Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md)
for the full pedagogical plan.

The corpus is the **MultiCaRe** clinical case dataset
([Zenodo, concept DOI 10.5281/zenodo.10079369](https://doi.org/10.5281/zenodo.10079369);
Nievas Offidani et al., *Data*, 2026). The entity/relation categories used later
in the activity are inspired by a different work, *"Named Entities in Medical
Case Reports: Corpus and Experiments"* (Schulz et al., LREC 2020) — that paper's
own annotated corpus is not part of this repository; students perform the
annotation themselves in Steps 3–4 of the plan.

## Run on Binder

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/santanche/nlp2learn/main?labpath=to-kg%2Fnotebooks%2F01_data_preparation.ipynb)

The environment (`environment.yml`) lives at the repository root because
Binder/repo2docker only reads build configuration from the repo root — this
is the standard layout for a monorepo hosting several activities.

## Run locally with conda

```bash
conda env create -f ../environment.yml
conda activate nlp2learn
jupyter lab notebooks/01_data_preparation.ipynb
```

## Run locally with Docker

`Dockerfile` and `docker-compose.yml` (repo root) build the same
`environment.yml` used by Binder, so local behavior matches what Binder will
run.

```bash
docker compose up --build
```

Then open the `http://127.0.0.1:8888/lab?token=...` URL printed in the
container logs (`docker compose logs jupyter` if you missed it). The whole
repo is bind-mounted into the container at `/home/jovyan/work`, so files you
edit or data you download (`to-kg/data/`) persist on the host across
container restarts. Stop with `docker compose down`.

## Structure

```
to-kg/
├── Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md
├── README.md
├── docs/
│   └── data_source.md        # Zenodo provenance, file selection, DuckDB schema reference
├── data/                     # downloaded parquet files + clinical_cases.duckdb (gitignored)
└── notebooks/
    └── 01_data_preparation.ipynb   # download source files, build the DuckDB database, example queries
```

## Data preparation

`notebooks/01_data_preparation.ipynb` downloads three files from the latest
version of the Zenodo record (`cases.parquet`, `metadata.parquet`,
`data_dictionary.csv` — the image-related files are not used by this activity
and are skipped to keep the download small) and loads them into a single
DuckDB database at `data/clinical_cases.duckdb`. Later notebooks in this
activity connect directly to that database file:

```python
import duckdb
con = duckdb.connect("../data/clinical_cases.duckdb")
```

See [docs/data_source.md](docs/data_source.md) for the full analysis behind
these decisions: why this DOI's paper differs from the one cited in the
activity plan, why each file was included or skipped, and — most
importantly — the exact DuckDB table schemas (`cases`, `metadata`,
`data_dictionary`), including the nested-vs-flat schema drift discovered
while building this notebook. Treat that document as the reference for
column names in later notebooks.
