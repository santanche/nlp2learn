# Data Source: Zenodo Record and DuckDB Schema

**Purpose of this document.** This is the reference for where the corpus
comes from, which files were selected (and why), and the exact schema that
ends up in `data/clinical_cases.duckdb` after `01_data_preparation.ipynb`
runs. Later notebooks (manual NER/RE, knowledge graph construction, vector
representations) should treat this file — not `data_dictionary.csv` alone —
as the source of truth for column names and layout, because the raw files
turned out to be more nested than `data_dictionary.csv` documents (Section 3).

## 1. Provenance

The activity brief points to Zenodo concept DOI `10.5281/zenodo.10079369`.
That concept DOI always resolves to the *latest version* of one dataset; at
the time this project was built it resolved to:

- **Record id:** 20416562 (concept/parent id 10079369)
- **Title:** *MultiCaRe: An open-source clinical case dataset for medical
  image classification and multimodal AI applications*
- **Authors:** Mauro Nievas Offidani et al.
- **Version:** 3.0.1, published 2026-05-27
- **Companion paper:** Nievas Offidani et al., *"An Open-Source Clinical
  Case Dataset for Medical Image Classification and Multimodal AI
  Applications"*, *Data*, 2026, [doi:10.3390/data10080123](https://doi.org/10.3390/data10080123)

**Important discrepancy found during setup:** `Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md`
cites a different work, *"Named Entities in Medical Case Reports: Corpus and
Experiments"* (Schulz, Ševa, Rodriguez, Ostendorff & Rehm, LREC 2020,
[ACL Anthology](https://aclanthology.org/2020.lrec-1.553/)), as inspiration.
That LREC paper describes its **own, separate** annotated corpus (entities:
case/condition/finding/factor/negation modifier, plus relations) — it is
**not** the source of this Zenodo dataset, and its gold-annotated corpus is
not included here. The relationship between the two is intentional, not a
mistake to fix:

- MultiCaRe (`cases.parquet`) supplies raw, **unannotated** case-report text
  at scale.
- The LREC paper supplies the **entity/relation category scheme** used as a
  guideline when students do the manual annotation in Steps 3–4 of the
  activity plan.

## 2. Files in the Zenodo record and selection decisions

The record has 15 files. Only three are downloaded by
`01_data_preparation.ipynb`; the rest are skipped because the activity plan
never touches images or abstracts.

| File | Size | Decision | Reason |
|---|---|---|---|
| `cases.parquet` | 168 MB | **Used** | Core corpus — case text, age, gender (Step 1 of the activity plan) |
| `metadata.parquet` | 20 MB | **Used** | Article-level metadata, needed to confront extracted stats against the source paper (Section 5) |
| `data_dictionary.csv` | 6 KB | **Used** | Documents field meaning (see Section 3 for its limits) |
| `abstracts.parquet` | 47 MB | Skipped | Not referenced anywhere in the activity plan |
| `captions_and_labels.csv` | 53 MB | Skipped | Image captions/labels — no image work in this activity |
| `case_images.parquet` | 55 MB | Skipped | Image metadata — same reason |
| `PMC1.zip` … `PMC9.zip` | ~2.66 GB total | Skipped | Raw PMC image archives — by far the largest part of the record, entirely unused here |

Files are downloaded at notebook runtime into `data/` (gitignored) rather
than committed to git, via Zenodo's `versions/latest` API endpoint keyed on
the concept id `10079369` — so the notebook always tracks the current
version instead of a version pinned at authoring time. Re-running the
notebook later may therefore show different row counts than this document.

## 3. Schema drift: `data_dictionary.csv` vs. the actual Parquet files

`data_dictionary.csv` documents both `cases.parquet` and `metadata.parquet`
as flat, one-row-per-entity tables. The actual files are more nested:

- **`cases.parquet`**: one row **per article** (`article_id`), with a
  `cases` column typed `STRUCT(age DOUBLE, case_id VARCHAR, case_text
  VARCHAR, gender VARCHAR)[]` — a list of one struct per patient case in
  that article.
- **`metadata.parquet`**: one row per article (`article_id`), with every
  documented field (`title`, `authors`, `journal`, `year`, `doi`, `pmid`,
  `mesh_terms`, `case_amount`, …) packed into a single struct column named
  `article_metadata`.

`01_data_preparation.ipynb` unnests/flattens both before writing the DuckDB
tables (`UNNEST(cases)` for the list, `article_metadata.*` for the struct),
so the tables described in Section 4 match what `data_dictionary.csv`
implies — but a naive `SELECT * FROM read_parquet(...)` on the raw files
will not.

## 4. Resulting DuckDB schema (`data/clinical_cases.duckdb`)

### `cases` — one row per patient case

| column | type | notes |
|---|---|---|
| `article_id` | VARCHAR | PMCID; foreign key to `metadata.article_id` |
| `case_id` | VARCHAR | `article_id` + sequential suffix, e.g. `PMC3738355_01` |
| `case_text` | VARCHAR | full clinical case text |
| `age` | DOUBLE | ages < 1 year recorded as 0 |
| `gender` | VARCHAR | one of `Female`, `Male`, `Transgender`, `Unknown` |

98,641 rows as observed on 2026-08-06 (dataset version 3.0.1, Zenodo record
20416562).

### `metadata` — one row per article

| column | type | notes |
|---|---|---|
| `article_id` | VARCHAR | PMCID, primary key |
| `title` | VARCHAR | |
| `authors` | VARCHAR[] | |
| `journal` | VARCHAR | |
| `journal_detail` | VARCHAR | citation details |
| `year` | VARCHAR | **stored as text**, not an integer — cast explicitly for numeric comparisons |
| `doi` | VARCHAR | |
| `pmid` | VARCHAR | |
| `pmcid` | VARCHAR | |
| `mesh_terms` | VARCHAR[] | |
| `major_mesh_terms` | VARCHAR[] | |
| `keywords` | VARCHAR[] | |
| `link` | VARCHAR | |
| `license` | VARCHAR | `CC BY`, `CC BY-NC`, `CC BY-NC-SA`, `CC0`, … |
| `case_amount` | BIGINT | cases contributed by this article |

76,137 rows.

### `data_dictionary` — loaded verbatim from `data_dictionary.csv`

45 rows, columns `file`, `field`, `explanation`. Describes field *meaning*
correctly; does **not** reflect the raw nested file layout (Section 3) —
use Section 4 of this document for actual DuckDB column names.

## 5. Confronting extracted metadata against the source paper

The paper's abstract reports **93,816 clinical cases**. Section 5 of
`01_data_preparation.ipynb` computes the same figure from the downloaded
data and diffs it:

- Cases in DB (version 3.0.1, fetched 2026-08-06): **98,641**
- Cases reported in the paper: **93,816**
- Difference: **+4,825 (+5.1%)**

This drift is expected, not a bug: the paper describes a snapshot at
publication time, while the notebook always pulls the latest Zenodo
version, and the dataset grows over time.

## 6. Caveats for later steps

- Counts in this document are a snapshot from 2026-08-06. Because the
  notebook always fetches the latest version, re-running it later will
  likely show higher case/article counts — re-run Section 5's comparison
  rather than trusting the numbers above as current.
- No entity/relation/annotation tables exist yet. Those are produced
  manually by students in Steps 3–5 of the activity plan and are out of
  scope for `01_data_preparation.ipynb` and this document.
- If a future Zenodo version changes the file layout again (e.g. flattens
  the nested columns, renames fields), re-verify Section 3 before trusting
  the `UNNEST`/struct-expansion logic in the notebook.
