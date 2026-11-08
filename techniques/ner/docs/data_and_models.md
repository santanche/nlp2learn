# Data, models and helper code

**Purpose of this document.** Reference for everything the NER notebooks
load: the two corpora, every model and tokenizer, where each one is cached,
and the API of `ner_helpers.py`. Design choices are explained in
[`ner_pipeline.md`](ner_pipeline.md) and [`tokenization.md`](tokenization.md);
installation and caches in [`environment.md`](environment.md).

## 1. Corpora

### 1.1 MultiCaRe sample (`sample/`)

Unannotated clinical case reports from PubMed Central, used for every
walkthrough and corpus statistic.

| | |
|---|---|
| Source | MultiCaRe, Nievas Offidani et al., [Zenodo 10.5281/zenodo.10079369](https://doi.org/10.5281/zenodo.10079369) |
| How the sample was made | by `to-kg/notebooks/01_data_preparation.ipynb`: 50 `article_id`s drawn with seed 42 from the sorted list of all ids (see [`to-kg/docs/data_source.md`](../../../to-kg/docs/data_source.md)). The files here are byte-identical copies of `to-kg/data/csv/sample/` |
| Size | 56 cases from 50 articles (some articles report several cases), 185,279 characters; cases range from 465 to 11,806 characters |
| Licenses | per article, in the `license` column of `metadata.csv` |

| File | Rows | Columns |
|---|---|---|
| `cases.csv` | 56 | `article_id`, `age`, `case_id`, `case_text`, `gender` |
| `metadata.csv` | 50 | `article_id`, `authors`, `case_amount`, `doi`, `journal`, `journal_detail`, `keywords`, `license`, `link`, `major_mesh_terms`, `mesh_terms`, `pmcid` |
| `data_dictionary.csv` | 45 | `file`, `field`, `explanation` — documents the *full* MultiCaRe dataset, including files not used here |

Things worth knowing about the sample:

* **The walkthrough case** is `PMC5137649_01` (18 sentences). Its first
  sentence, *"A 44-year-old woman presented with a 3-day history of right
  flank and lower quadrant abdominal pain associated with nausea and
  constipation."*, is the walkthrough sentence of every notebook.
* **One text is not clinical**: `PMC9650410_01` is an essay about the
  Theranos company. The main class uses it for genuine non-clinical senses
  of *culture* and *cold*; in 01b it is the case where BiomedBERT's PubMed
  vocabulary does worst.
* Several cases are longer than the 512-token limit of the encoders (half
  of them even counted in words), so the notebooks always work sentence by
  sentence.

### 1.2 MACCROBAT2018

Case reports **with entity annotations**: the corpus
`d4data/biomedical-ner-all` was fine-tuned on. Used in `ner_pipeline.ipynb`
§8 (gold labels for the geometry comparison) and in `01b-tokenization.ipynb`
§8–9 (entity-boundary alignment; training corpus of the controlled
experiment).

| | |
|---|---|
| Source | Caufield, J. H. (2019), [figshare 10.6084/m9.figshare.9764942.v2](https://doi.org/10.6084/m9.figshare.9764942.v2), **CC BY 4.0** |
| File used | `MACCROBAT2018.zip` (≈1 MB, md5 `453c144879c303d248d74f56b6b40914`). The figshare item also has a `MACCROBAT2020.zip`; 2018 is the version d4data's model card links to |
| Content | 200 PubMed Central case reports, ≈566k characters, 4,541 sentences |
| Format | [brat standoff](https://brat.nlplab.org/standoff.html): `<pmid>.txt`, **one sentence per line**, plus `<pmid>.ann` |
| Annotations | 25,041 entity (`T`) lines over 40+ types; 55 of them discontinuous. Events (`E`), relations (`R`) and attributes (`A`) are present but not used |
| Cache | `~/.cache/nlp2learn/maccrobat/` (override with the `MACCROBAT_DIR` environment variable); in the Binder image it is pre-filled by `postBuild` |

An entity line looks like `T7<TAB>Sign_symptom 78 90<TAB>palpitations`
(id, type, character start/end in the `.txt`, mention). Spans can nest:
*"previously healthy"* (History) contains *"healthy"* (Sign_symptom).

Most frequent entity types: Diagnostic_procedure 4,567 · Sign_symptom 3,359
· Biological_structure 2,931 · Detailed_description 2,901 · Lab_value 2,858
· Disease_disorder 1,362 · Medication 1,076 · Therapeutic_procedure 1,005 ·
Date 731 · Clinical_event 626. The main class's §8 uses six of these
(Sign_symptom, Disease_disorder, Diagnostic_procedure,
Therapeutic_procedure, Medication, Biological_structure).

## 2. Models and tokenizers

### 2.1 Installed as Python packages (`requirements.txt`)

| Package | Version | Role | Notebooks | Size |
|---|---|---|---|---|
| `en_core_sci_sm` | scispaCy 0.5.4 | tokenizer and sentence splitter tuned for biomedical text; POS, lemmas, parser; untyped CNN + transition-based NER (`ENTITY`); **no word vectors** | all three | 19 MB on disk, ≈75 MB RAM |
| `en_core_web_md` | spaCy 3.7.1 | only its static vector table is used (20,000 × 300, 514,157 keys, pruned) | `ner_pipeline` §2; `02a` (as the Word2Vec-style approach) | 53 MB on disk, ≈230 MB RAM |

scispaCy models are only published for v0.5.4, which needs spaCy 3.7.x,
whose `thinc` wheels need `numpy<2`. Hence the `numpy<2` pin. spaCy itself
is not pinned: the model packages pull a compatible version.

### 2.2 Downloaded from the Hugging Face Hub (default cache `~/.cache/huggingface`)

| Model | Architecture | Role | Notebooks | Download |
|---|---|---|---|---|
| [`d4data/biomedical-ner-all`](https://huggingface.co/d4data/biomedical-ner-all) | `DistilBertForTokenClassification`: 6 layers, 768 dims, 12 heads, 66M parameters, head `Linear(768 → 84)` | the NER model; its tokenizer is BERT-uncased's (30,522 WordPiece entries) | `ner_pipeline`; tokenizer in `01a` | 266 MB |
| [`distilbert-base-uncased`](https://huggingface.co/distilbert-base-uncased) | `DistilBertModel` (encoder only; its masked-LM head weights are discarded on load) | the starting point of d4data's fine-tuning, for §8 | `ner_pipeline`; tokenizer in `01b` | 268 MB |
| [`bert-base-uncased`](https://huggingface.co/bert-base-uncased) | `BertModel`; only `.embeddings` is kept: token 30,522 × 768, position 512 × 768, segment 2 × 768 | the reference BERT layer 0 | `02a` | 440 MB |
| [`microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext`](https://huggingface.co/microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext) | `BertModel`, same shapes as BERT, PubMed vocabulary | domain vocabulary, same architecture | `02a`; tokenizer in `01a`/`01b` | 440 MB |
| [`roberta-base`](https://huggingface.co/roberta-base) | `RobertaModel`: token 50,265 × 768, position 514 × 768 (ids start at 2), segment 1 × 768 | byte-level BPE model | `02a`; tokenizer in `01a`/`01b` | 500 MB |
| [`albert-base-v2`](https://huggingface.co/albert-base-v2) | `AlbertModel`: factorized embeddings, token 30,000 × **128**, position 512 × 128, segment 2 × 128 | Unigram model, small embeddings | `02a`; tokenizer in `01a`/`01b` | 47 MB |

**Tokenizers only** (no weights; a few MB each), for 01a/01b (02a downloads
the weights of BiomedBERT, RoBERTa and ALBERT, above):
`bert-base-cased`, `microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext`,
`roberta-base`, `albert-base-v2`, `xlm-roberta-base`, `google/byt5-small`.

Facts about d4data worth knowing when teaching:

* Its `config.json` names `distilbert-base-uncased` as `_name_or_path`, and
  the two vocabularies are identical (checked in both `ner_pipeline` §8 and
  01b §5).
* 84 BIO labels over 43 type names, two of them malformed
  (`B-Non[biological](Detailed_description`,
  `B-Personal_[back](Biological_structure`). The model card speaks of 107
  entity types; the head has 84 labels.
* Uncased: case is lost before the model sees the text.

### 2.3 Not used, and why

| Model | Reason |
|---|---|
| `en_core_sci_md` / `en_core_sci_lg` | 4M-key vocabulary, ≈1.6 GB of RAM each: does not fit Binder. Can replace `STATIC_VECTORS` locally |
| `en_ner_bc5cdr_md` (typed DISEASE/CHEMICAL NER) | same ≈1.6 GB cost, even with a shared `Vocab`; optional in Challenge 4 |
| `emilyalsentzer/Bio_ClinicalBERT` | no NER head; trained on ICU notes, not case reports. Appears in 01b Challenge 1 |
| BiomedBERT NER | no NER fine-tune of it is used (02a loads its weights only for the embedding layer); candidate for a future notebook |
| Google News Word2Vec (`word2vec-google-news-300`) | 3.6 GB and needs `gensim`; 02a uses spaCy's `en_core_web_md` vectors as the Word2Vec-style approach |
| `Clinical-AI-Apollo/Medical-NER` | DeBERTa, ≈3× larger; a possible comparison, not needed for the class |

## 3. `ner_helpers.py`

Plumbing only. Everything the class is *about* stays in the notebooks.

| Name | Kind | What it does |
|---|---|---|
| `MACCROBAT_URL`, `MACCROBAT_MD5` | constants | figshare download URL of `MACCROBAT2018.zip` and its checksum |
| `DEFAULT_CACHE` | constant | `$MACCROBAT_DIR` if set, else `~/.cache/nlp2learn/maccrobat` |
| `download_maccrobat(cache_dir=DEFAULT_CACHE) → Path` | function | returns the folder at once if ≥ 200 `.ann` files are there; otherwise downloads the zip, verifies the md5 (deletes it and raises on mismatch), extracts the `.txt`/`.ann` files flat |
| `Span(start, end, label, text)` | dataclass | one entity mention, character offsets |
| `Sentence(doc_id, text, spans)` | dataclass | one MACCROBAT line, spans re-based onto it |
| `read_brat(txt_path) → (text, spans)` | function | parses one report; keeps `T` lines only; **skips discontinuous** entities (`10 15;20 25`) |
| `resolve_overlaps(spans) → spans` | function | non-overlapping subset, **longest span first** (a BIO tagger can give one label per token) |
| `load_maccrobat_sentences(folder, keep_labels=None, max_docs=None) → [Sentence]` | function | reads all reports; if `keep_labels` is given, drops other types *before* resolving overlaps (so they become plain text); splits on newlines; keeps a span only if it lies within one line |
| `word_labels(tokenizer, sentence, max_length=512) → (encoding, words)` | function | tokenizes a sentence with offsets; for each **word** (`word_ids()`), returns its text, the index of its **first piece**, and the gold label of the span containing its first character (`"O"` otherwise) |
| `vector_boxes(vector, scale) → str` | function | an `<img>` tag drawing a vector as tiny boxes, one per dimension, 48 per line (`BOX_COLUMNS`), red (negative) – white – blue (positive), saturating at ±`scale` in 5 steps (`BOX_LEVELS`); a palette PNG with 1-pixel transparent gaps, ≈1.6 KB for 768 dims |
| `show_embeddings(table, title=None)` | function | displays a DataFrame as an HTML table, drawing every array-valued column with `vector_boxes`; scale = 2 standard deviations of the values shown, shared by the columns listed in `table.attrs["same_scale"]`; prints `table.attrs["note"]` under the table |

Who uses what:

| Function | `ner_pipeline` | `01b` |
|---|---|---|
| `download_maccrobat` | §8 | §8–9 |
| `load_maccrobat_sentences`, `word_labels` | §8 | — |
| `read_brat` | (via `load_maccrobat_sentences`) | §8 |
| `show_embeddings` (`vector_boxes`) | — | — (used by `02a`) |

`binder-env/postBuild` duplicates the download logic (same URL, checksum and
target folder), because it runs at image-build time, before the notebooks
are pulled into the session. If the URL or folder changes, change both.
