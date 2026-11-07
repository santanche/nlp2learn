# techniques/ner — design notes and decision log

Context for resuming work on the NER notebook series. Human-facing usage is
in `README.md`; the papermill execution procedure is in the repository
`CLAUDE.md` (run every changed notebook with it, outputs are committed).

## The series

| Notebook | Role | Status |
|---|---|---|
| `ner_pipeline.ipynb` | main class: one MultiCaRe sentence through spaCy → WordPiece → DistilBERT layers → classifier → spans, plus fine-tuning geometry (MACCROBAT) and spaCy's CNN NER | done |
| `01a-tokenization-tokens.ipynb` | preliminary 01a: the elementary operation only — one `tokenizer.tokenize(w)` routine, tokenizers chosen from a dict | done (2026-11-07) |
| `01b-tokenization.ipynb` | preliminary 01b: the detailed tokenization comparison (§1–3 of the main class); was `01-tokenization.ipynb` | done (2026-11-07) |
| `02-...` | not yet defined; natural candidates: static vs contextual embeddings (§2/§4–5 of the main class), or a BiomedBERT-based NER compared with d4data | — |

Rules of the series:

* Preliminary notebooks are numbered `NN-topic.ipynb`, with a letter when a
  step is split into an elementary notebook (`a`) and a detailed one (`b`).
  Detailed notebooks **replicate the start of `ner_pipeline.ipynb`** (same `sample/cases.csv`, case
  `PMC5137649_01`, sentence starting "A 44-year-old woman presented",
  `en_core_sci_sm` sentence splitting) and then goes deep into one step.
* Same environment as the main class (`requirements.txt`, `.venv`, Binder
  branch `binder-ner`): no new packages unless unavoidable.
* Teaching code stays in the notebook; `ner_helpers.py` only holds plumbing
  (MACCROBAT download, brat parsing, span alignment). 01 reuses
  `download_maccrobat` and `read_brat` from it.
* Style: markdown sections numbered `## N.`, a configuration cell at the
  top, 🧩 Challenge cells (markdown + empty code cell) at the end, credits
  last. Commentary must match the executed outputs (see "verification").

## 01a-tokenization-tokens.ipynb

The user asked for a "very starting" notebook: one studied cell with the
basic routine, everything else prepared in earlier cells, no tables/charts.

* Preparation cell: `SpacyTokenizer` adapter (gives spaCy a
  `.tokenize(text) -> list[str]` method, like Hugging Face tokenizers) and
  a `TOKENIZERS` dict of 7 (scispaCy, spaCy blank, BERT-uncased via
  `d4data/biomedical-ner-all` as in the main class, BiomedBERT, RoBERTa,
  ALBERT, ByT5); the sentence is hard-coded (same walkthrough sentence)
  to avoid loading the case CSV and running the parser.
* Studied cell: `tokenizer = TOKENIZERS["..."]  # ← change me`, then
  sentence token count and the `for w in WORDS: print(... tokenizer.tokenize(w))`
  loop. A second cell runs the same routine for every tokenizer.
* Then the same pair for the whole sentence ("A whole sentence": one
  tokenizer, `← change me`, prints all tokens; then every tokenizer).
  Token counts for the sentence: scispaCy 22, spaCy 28, BERT-uncased 31,
  BiomedBERT 28, RoBERTa 30, ALBERT 30, ByT5 140 — quoted in the closing
  "What to notice" notes.
* `.tokenize()` never adds special tokens, so the count line says
  "tokens in the sentence" (not "including [CLS] and [SEP]" as in the
  main class, which counted `input_ids`).
* RoBERTa shows no `Ġ` on isolated words (no preceding space) — the
  closing notes say so.

## 01b-tokenization.ipynb

### Architecture

1. Setup + configuration (`TOKENIZERS` dict = key → (family, source, note);
   `FAMILY_COLORS`; `SEQ_BUDGET = 512`).
2. §1 data + sentence splitting (as in the main class).
3. §2 rule-based tokenization: rule table, `tokenizer.explain()`,
   spaCy-en (`spacy.blank("en")`) vs scispaCy on clinical strings,
   non-destructive round-trip.
4. §3 OOV motivation: word vocabulary from even-indexed cases, OOV rate on
   odd-indexed ones.
5. §4 algorithms, each **re-implemented from scratch and checked against
   the real tokenizer** (`same` column must be all True):
   BPE trainer/segmenter on the sample's word counts; byte-level BPE
   display (RoBERTa); WordPiece greedy longest-match vs
   `distilbert-base-uncased`; Unigram Viterbi with ALBERT's log-probs
   (read from `backend_tokenizer.to_str()`); ByT5 ids == UTF-8 bytes + 3.
6. §5 a uniform wrapper `Tok(tokenize(text) → [(piece, start, end)], roundtrip,
   vocab_size, n_special, unk)` built by `spacy_tok`, `hf_tok`, `bytes_tok`;
   `align(words, toks)` maps tokens ↔ words by character-range overlap
   (bisect); `side_by_side()` table on the walkthrough sentence.
7. §6 clinical words (piece counts, styled) and notation/abbreviations.
8. §7 `corpus_stats()` over the 56 cases: fertility, chars/token, % words
   whole, % crossing tokens, [UNK], tokens/case, % cases > 512, exact
   round-trip, time; two charts.
9. §8 entity-boundary alignment on MACCROBAT (start ∈ token starts and
   end ∈ token ends), with misaligned examples, and the
   `char_span(alignment_mode=...)` demo linking to the main class's step ⑦.
10. §9 controlled experiment: `tokenizers` library, BPE / WordPiece /
    Unigram, same `BertNormalizer(lowercase=True)` + `BertPreTokenizer`,
    trained on MACCROBAT, evaluated on MultiCaRe, sizes 500–8000; chart with
    BERT-uncased and BiomedBERT as reference lines (comparable because they
    use the same normalizer/pre-tokenizer).
11. §10 summary table + implications for the NER pipeline; 3 challenges.

### Decisions and rationale

* **Name of spaCy's method**: no established name; described as a
  *rule-based, non-destructive tokenizer* in the Penn Treebank tradition
  (special cases → prefixes → suffixes → infixes).
* **Tokenizer line-up (9)**, one axis of variation per addition:
  spaCy-en vs scispaCy (rules: general vs biomedical);
  BERT-uncased (= the `d4data/biomedical-ner-all` vocabulary, verified in
  the notebook) vs BERT-cased (casing; also BioBERT/Bio_ClinicalBERT's
  vocabulary) vs BiomedBERT (domain vocabulary, same size/algorithm);
  RoBERTa (byte-level BPE; ModernBERT gave identical splits on our tests,
  so it was left out); ALBERT (Unigram, 30k, comparable to BERT) vs XLM-R
  (Unigram, 250k multilingual); ByT5 (bytes, the extreme).
  Not included: tiktoken/GPT-4 vocabularies (extra dependency, not used
  for NER), character-level CANINE.
* **Reference unit** for all per-word metrics = scispaCy token (the word
  tokenization the main class uses). Hence scispaCy fertility is 1.0 by
  definition.
* **Tokenizers only** are downloaded (no weights) — fast, light on Binder.
  `binder-env/postBuild` pre-downloads them (needs `make_branch.sh` +
  push of `binder-ner` to take effect on Binder).
* **ByT5 offsets** are computed by hand (its tokenizer is slow/Python and
  has no offset mapping); the notebook first checks that ids = bytes + 3.
* **Controlled experiment** trains on MACCROBAT and tests on MultiCaRe so
  it measures generalization within the genre. Caveat stated in the
  notebook: HF's `WordPieceTrainer` uses BPE merges (Google's trainer is
  unreleased), so BPE vs WordPiece there differs only in segmentation
  rule and the `##` prefix.
* **Charts**: one color per algorithm family, consistent across charts
  (dataviz reference palette, fixed order: WordPiece blue, BPE orange,
  Unigram aqua, Rule-based yellow, Bytes magenta); pieces-per-word
  distribution uses a single sequential blue ramp; values are direct
  labels.

### Key results (as executed 2026-11-07; re-check after any change)

* Fertility (tokens per scispaCy word): BiomedBERT 1.16, RoBERTa 1.29,
  BERT-uncased 1.33, ALBERT 1.34, BERT-cased 1.40, XLM-R 1.45, ByT5 5.69.
* Cases > 512 tokens: 50% even in words; BERT-uncased 73%, BiomedBERT 61%.
* [UNK]: only ALBERT (`<`, `>`, `~`, `|`). Exact round-trip: XLM-R only
  14% (newlines → spaces).
* MACCROBAT entity alignment: WordPiece/ALBERT 99.9%, RoBERTa 99.4%,
  spaCy-en 99.3%, scispaCy 99.0%, XLM-R 98.4%, bytes 100%.
* Controlled: BPE slightly better than WordPiece at every size; Unigram
  worse fertility, caps at ~5.3k pieces; an 8k in-domain vocabulary beats
  BERT's 30k general one (1.25–1.28 vs 1.33).

### Verification checklist (after editing 01)

1. Run with papermill (repository `CLAUDE.md`).
2. The three `same` columns in §4 are all True.
3. Re-read the numbers quoted in markdown (§5 bullets, §6 lessons, §7
   "Reading the table", §8 bullets, §9 conclusions, §10) against outputs.
4. Look at both PNG charts (label collisions, legend placement).

### Editing

The notebook itself is the source of truth (it was generated once by a
throw-away builder script; there is no generator in the repo). Edit cells
directly (NotebookEdit or a small `nbformat` script), then re-run papermill.
