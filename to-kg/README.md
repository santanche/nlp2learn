# From Clinical Case Reports to Knowledge Graphs

See [Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md](Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md)
for the full pedagogical plan, and
[docs/kg_extraction_methodology.md](docs/kg_extraction_methodology.md) for
the design behind `02_kg_extraction.ipynb`.

The corpus is the **MultiCaRe** clinical case dataset
([Zenodo, concept DOI 10.5281/zenodo.10079369](https://doi.org/10.5281/zenodo.10079369);
Nievas Offidani et al., *Data*, 2026). The entity/relation categories used later
in the activity are inspired by a different work, *"Named Entities in Medical
Case Reports: Corpus and Experiments"* (Schulz et al., LREC 2020) — that paper's
own annotated corpus is not part of this repository; students perform the
annotation themselves in Steps 3–4 of the plan.

## Two separate environments

This activity has two stages with very different infrastructure needs, so
each gets its own environment rather than one shared one:

| Environment | Notebook | What it needs |
|---|---|---|
| `env/data-prep` | `01_data_preparation.ipynb` | DuckDB, pandas, requests — lightweight, runs anywhere |
| `env/kg-extraction` | `02_kg_extraction.ipynb` | PyTorch, transformers, spaCy/scispaCy — local encoder models, heavier, laptop-scale |

Both are offered two ways: a **Docker image** (no local Python setup at all)
or a **local `uv` virtual environment** (faster iteration, no container
overhead). Pick whichever fits; both install from the same
`env/<name>/requirements.txt`, so behavior matches between the two paths.
This project no longer targets Binder — if you need that again later, a
root-level `environment.yml` + `repo2docker` build would need to be
reintroduced.

## Option A — Docker

From the `to-kg/` directory:

```bash
# data preparation (Step 0)
docker compose up --build data-prep
# → http://127.0.0.1:8888/lab?token=...

# full local KG-extraction pipeline
docker compose up --build kg-extraction
# → http://127.0.0.1:8889/lab?token=...
```

Both containers bind-mount the whole `to-kg/` directory into
`/home/jovyan/work`, so files and downloaded data persist on the host
across restarts (`data/` is gitignored). Check `docker compose logs
<service>` for the token if you missed it. Stop with `docker compose down`.

Optional: `02_kg_extraction.ipynb` can push the resulting graph into a
local Neo4j instance for an interactive Cypher demo (Stage 8). Neo4j isn't
started by default — bring it up explicitly alongside `kg-extraction`:

```bash
docker compose --profile graph up --build kg-extraction neo4j
```

Then open `http://127.0.0.1:7474` (auth `neo4j` / `localdevpassword`, set
in `docker-compose.yml` — change it if this ever runs anywhere but your own
machine). If `neo4j` isn't running, the notebook detects that and skips the
Neo4j cells without failing.

## Option B — local `uv` virtual environment

Requires [uv](https://docs.astral.sh/uv/) installed. From `to-kg/`:

```bash
# data preparation
cd env/data-prep
uv venv
source .venv/bin/activate       # .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
cd ../../notebooks
jupyter lab 01_data_preparation.ipynb
```

```bash
# kg extraction (separate environment — open a new shell, or deactivate first)
cd to-kg/env/kg-extraction
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
cd ../../notebooks
jupyter lab 02_kg_extraction.ipynb
```

Each `.venv` lives inside its own `env/<name>/` folder and is already
covered by the repo's `.gitignore` (`.venv` pattern).

**Known friction point:** `scispacy`'s UMLS entity linker depends on
`nmslib`, which sometimes has no prebuilt wheel for your platform/Python
combination (a long-standing issue on Apple Silicon in particular) and
falls back to compiling from source — you'll need a C/C++ toolchain
installed locally (Xcode Command Line Tools on macOS, `build-essential` on
Linux). If that compilation fails and you don't want to chase it, use the
Docker path instead (its image already includes the build tools), or run
with `USE_UMLS_LINKING = False` in the notebook's config cell — the
pipeline degrades gracefully and still runs, just without UMLS grounding.

## Structure

```
to-kg/
├── Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md
├── README.md
├── docker-compose.yml
├── docs/
│   ├── data_source.md                  # Zenodo provenance, DuckDB schema reference
│   └── kg_extraction_methodology.md    # design behind 02_kg_extraction.ipynb
├── env/
│   ├── data-prep/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── kg-extraction/
│       ├── requirements.txt
│       └── Dockerfile
├── data/                     # downloaded parquet files + clinical_cases.duckdb (gitignored)
└── notebooks/
    ├── 01_data_preparation.ipynb   # download source files, build the DuckDB database
    └── 02_kg_extraction.ipynb      # local, encoder-only KG extraction over a configurable sample
```

## Data preparation

`notebooks/01_data_preparation.ipynb` downloads three files from the latest
version of the Zenodo record (`cases.parquet`, `metadata.parquet`,
`data_dictionary.csv`) and loads them into a single DuckDB database at
`data/clinical_cases.duckdb`:

```python
import duckdb
con = duckdb.connect("../data/clinical_cases.duckdb")
```

See [docs/data_source.md](docs/data_source.md) for the full analysis behind
these decisions, and the exact DuckDB table schemas (`cases`, `metadata`,
`data_dictionary`).

## KG extraction

`notebooks/02_kg_extraction.ipynb` connects to the same DuckDB database
(built by `01_data_preparation.ipynb`, assumed to already exist — this
notebook does not download anything) and runs the local, encoder-only
pipeline proposed in
[docs/kg_extraction_methodology.md](docs/kg_extraction_methodology.md) over
a configurable sample of cases (`SAMPLE_SIZE`, set in the notebook's first
config cell). It produces an illustrative knowledge graph — exported as an
inline pyvis visualization and, optionally, loaded into a local Neo4j
instance for Cypher querying.
