# Tokenization notebooks (01a, 01b) — design and rationale

**Purpose of this document.** The design behind the two preliminary
notebooks that deepen the first step of the main class: what each one
contains, why it is built that way, and the results as committed. For the
place of these notebooks in the series see
[`notebooks_overview.md`](notebooks_overview.md); the main class is
documented in [`ner_pipeline.md`](ner_pipeline.md).

Both notebooks answer one question from different distances: *the main
class cuts a clinical case report into tokens twice (spaCy words, then
WordPiece sub-words). What are the ways of tokenizing text, how do they
behave on clinical English, and what does that mean for NER?*

| | `01a-tokenization-tokens.ipynb` | `01b-tokenization.ipynb` |
|---|---|---|
| level | elementary | detailed |
| in class | 5–10 minutes, live | selected sections live, the rest as reading |
| content | one routine, seven tokenizers | algorithms re-implemented, nine tokenizers measured, NER alignment, a controlled experiment |
| reads | nothing (sentence hard-coded) | `sample/cases.csv`, MACCROBAT |
| run time | ≈10 s | ≈30 s |
| downloads | tokenizer files only (a few MB each, no model weights) | same |

---

## 01a — Tokens: a first look

### Idea

The most elementary operation of the series: **give a tokenizer some
text, look at the tokens it returns.** One studied cell, with everything
else prepared beforehand; no tables or charts.

### Structure

| Section | Content |
|---|---|
| Preparation | a `SpacyTokenizer` adapter (gives spaCy the same `.tokenize(text) → list[str]` method the Hugging Face tokenizers have) and a `TOKENIZERS` dict of seven tokenizers; the walkthrough sentence and five clinical words (`WORDS`) are hard-coded |
| The routine | `tokenizer = TOKENIZERS["WordPiece (BERT, uncased)"]  # ← change me`, then the sentence's token count and `tokenizer.tokenize(w)` for each word |
| The same routine, for every tokenizer | a loop over the dict |
| A whole sentence | one tokenizer (`← change me`), all tokens of the sentence |
| The whole sentence, for every tokenizer | a loop over the dict |
| What to notice | closing notes |

The seven tokenizers (dict key → source):

| Key | Source | Approach |
|---|---|---|
| Rule-based (scispaCy) | `en_core_sci_sm` | rules for biomedical text |
| Rule-based (spaCy) | `spacy.blank("en")` | spaCy's default English rules |
| WordPiece (BERT, uncased) | `d4data/biomedical-ner-all` | the tokenizer of the main class |
| WordPiece (BiomedBERT) | `microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext` | same algorithm, PubMed vocabulary |
| BPE (RoBERTa) | `roberta-base` | byte-level BPE |
| Unigram (ALBERT) | `albert-base-v2` | SentencePiece Unigram |
| Bytes (ByT5) | `google/byt5-small` | no vocabulary |

### Design decisions

* **Hard-coded sentence** (the same walkthrough sentence as the main
  class) so the notebook does not need the CSV or the parser and starts
  instantly.
* **`.tokenize()` never adds special tokens.** The count line therefore says
  "tokens in the sentence". The main class says "including `[CLS]` and
  `[SEP]`" because it counts `input_ids`.
* **One name to change** is the whole interaction: students edit a string
  and re-run, so the elementary notebook needs no programming.

### Committed results

Tokens for the walkthrough sentence: scispaCy 22, spaCy 28, BERT-uncased 31,
BiomedBERT 28, RoBERTa 30, ALBERT 30, ByT5 140. The closing notes point out:

* rule-based tokenizers never split a plain word, and scispaCy keeps
  `44-year-old` whole;
* WordPiece marks continuations with `##`. BiomedBERT keeps `constipation`
  whole where BERT needs four pieces;
* Unigram marks word *starts* with `▁`. RoBERTa uses `Ġ` only when a space
  really precedes the word, so isolated words show none and the sentence's
  first word `A` has none;
* uncased tokenizers lower-case everything;
* the same sentence costs 22 to 140 tokens, which matters with a 512-token
  limit.

---

## 01b — Tokenization, compared

### Structure

| § | Content | Key code |
|---|---|---|
| 0 | setup and configuration: `TOKENIZERS` (key → family, source, note), `FAMILY_COLORS`, `SEQ_BUDGET = 512` | |
| 1 | the same start as the main class: MultiCaRe case, scispaCy sentence splitting; tokenization runs *before* sentence detection | |
| 2 | **rule-based** word tokenization: rule sets (special cases, prefixes, suffixes, infixes), `tokenizer.explain()`, spaCy-en vs scispaCy on clinical strings, non-destructive round-trip | `nlp.tokenizer.explain()` |
| 3 | why sub-words: out-of-vocabulary rate when a word vocabulary is built from half of the cases and tested on the other half | `words_of()` |
| 4 | the algorithms, each **re-implemented and checked against the real tokenizer**: BPE training and segmentation; byte-level BPE display (RoBERTa); WordPiece greedy longest-match; Unigram Viterbi with ALBERT's piece scores; ByT5 = UTF-8 bytes + 3 | `bpe_train()`, `same` columns |
| 5 | nine tokenizers side by side, behind one interface: `Tok.tokenize(text) → [(piece, start, end)]`; `align(words, toks)` by character overlap | `spacy_tok`, `hf_tok`, `bytes_tok`, `align`, `side_by_side` |
| 6 | clinical vocabulary (piece counts and pieces), notation and abbreviations | |
| 7 | the whole sample measured (fertility, sequence length, round-trip, ...), two charts | `corpus_stats()` |
| 8 | the NER view: do token boundaries respect gold entity boundaries? (MACCROBAT), with misaligned examples and the `char_span(alignment_mode=...)` link to step ⑦ of the main class | `entity_alignment` |
| 9 | controlled experiment: BPE, WordPiece and Unigram trained with the `tokenizers` library on the same corpus, normalizer, pre-tokenizer and sizes | `train_tokenizer()` |
| 10 | summary table and implications for the NER pipeline | |
| 🧩 | three challenges, credits | |

### The nine tokenizers

Each one was added to vary **one** thing relative to another:

| Key | Family | Source | Varies |
|---|---|---|---|
| spaCy-en | Rule-based | `spacy.blank("en")` | general rules … |
| scispaCy | Rule-based | `en_core_sci_sm` | … vs biomedical rules (the main class's word tokenizer) |
| BERT-uncased | WordPiece | `distilbert-base-uncased` | the main class's vocabulary (identity with `d4data/biomedical-ner-all` is checked in §5) |
| BERT-cased | WordPiece | `bert-base-cased` | casing (also the vocabulary of BioBERT and Bio_ClinicalBERT) |
| BiomedBERT | WordPiece | `microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext` | domain of the vocabulary (same algorithm and size as BERT) |
| RoBERTa | BPE | `roberta-base` | algorithm: byte-level BPE (= GPT-2's vocabulary) |
| ALBERT | Unigram | `albert-base-v2` | algorithm: Unigram, 30k, comparable to BERT |
| XLM-R | Unigram | `xlm-roberta-base` | vocabulary size and languages (250k, multilingual) |
| ByT5 | Bytes | `google/byt5-small` | the extreme: no vocabulary |

Left out: ModernBERT (byte-level BPE, identical splits to RoBERTa on our
tests), tiktoken/GPT-4 vocabularies (extra dependency, not used for NER),
character-level CANINE.

### Design decisions

* **Naming spaCy's method.** It has no established name in the
  literature. The notebook calls it a *rule-based, non-destructive
  tokenizer* in the Penn Treebank tradition (special cases → prefixes →
  suffixes → infixes) and shows each rule at work with `explain()`.
* **Re-implement, then verify.** Each algorithm is written in a few lines
  and compared with the library output (`same` column all `True`). Students
  see that the algorithms are simple and that the code really is the
  algorithm. Unigram scores are read from ALBERT's serialized tokenizer
  (`backend_tokenizer.to_str()`).
* **Reference unit = scispaCy token**, the word tokenization the main
  class uses. All per-word metrics are relative to it, so scispaCy's
  fertility is 1.0 by definition.
* **Offsets as the common interface.** Hugging Face fast tokenizers return
  offsets (`return_offsets_mapping`), spaCy tokens carry `token.idx`, and
  ByT5's are computed by hand (its tokenizer has no offset mapping; §4 first
  checks ids = bytes + 3).
* **Tokenizers only.** No model weights are downloaded, so the notebook is
  fast and light on Binder. `binder-env/postBuild` pre-downloads all of them.
* **Controlled experiment design.** Training on MACCROBAT and evaluating on
  MultiCaRe measures generalization within the genre. All three algorithms
  share BERT's normalizer (`BertNormalizer(lowercase=True)`) and
  pre-tokenizer (`BertPreTokenizer`), which also makes BERT-uncased and
  BiomedBERT valid reference lines. A caveat is stated in the notebook: Hugging Face's
  `WordPieceTrainer` learns its vocabulary with BPE merges (Google's
  likelihood-based trainer was never released), so there BPE and WordPiece
  differ only in segmentation rule and the `##` prefix.
* **Charts.** One color per algorithm family across every chart (WordPiece
  blue, BPE orange, Unigram aqua, Rule-based yellow, Bytes magenta); a
  single sequential ramp for the pieces-per-word distribution; direct
  value labels.

### Committed results

**§3 OOV.** With every word of the training half kept (3,126 types), 21.2%
of test tokens and 61.6% of test word types are unknown.

**§4.** All `same` columns are `True` (WordPiece and Unigram re-implementations
match the libraries); ByT5 ids == UTF-8 bytes + 3.

**§6.** BiomedBERT keeps most clinical words whole. `hypokalemia` is
`hypo kal emia` in ALBERT, close to its morphology, versus
`h ##yp ##oka ##lem ##ia` in BERT-uncased. Uncased tokenizers cannot
tell `US` (ultrasound) from `us`. ALBERT has no piece for `≥` or `°`.

**§7 corpus statistics** (56 cases, ≈185k characters):

| Tokenizer | tokens / word | words kept whole (%) | crossing tokens (%) | [UNK] | cases > 512 (%) | exact round-trip (%) |
|---|---|---|---|---|---|---|
| spaCy-en | 1.04 | 97.9 | 0.0 | 0 | 55.4 | 100 |
| scispaCy | 1.00 | 100.0 | 0.0 | 0 | 50.0 | 100 |
| BERT-uncased | 1.33 | 83.8 | 0.0 | 0 | 73.2 | 0 |
| BERT-cased | 1.40 | 81.6 | 0.0 | 0 | 75.0 | 0 |
| BiomedBERT | 1.16 | 91.3 | 0.0 | 0 | 60.7 | 0 |
| RoBERTa | 1.29 | 82.0 | 0.9 | 0 | 73.2 | 100 |
| ALBERT | 1.34 | 80.8 | 0.2 | 19 | 73.2 | 0 |
| XLM-R | 1.45 | 68.0 | 1.1 | 0 | 78.6 | 14.3 |
| ByT5 | 5.69 | 17.4 | 0.0 | 0 | 98.2 | 100 |

Even counted in words, half of the cases exceed 512. BiomedBERT has the
lowest fertility but the *longest* single case: the sample's one
non-clinical text (an essay about Theranos). ALBERT's `[UNK]`s are `<`,
`>`, `~`, `|`. XLM-R's normalization turns newlines into spaces.

**§8 entity alignment on MACCROBAT** (200 reports, 24,986 entity mentions):

| Tokenizer | aligned (%) | misaligned | typical cause |
|---|---|---|---|
| BERT-uncased / BERT-cased / BiomedBERT / ALBERT | 99.90–99.91 | 22–25 | annotation errors (spans starting or ending mid-word) |
| RoBERTa | 99.37 | 157 | punctuation merged with the next characters (`%.`) |
| spaCy-en | 99.28 | 181 | sentence-final period left on short units (`mmol/l.`) |
| scispaCy | 99.04 | 240 | hyphenated compounds kept whole (`catalase-negative`) |
| XLM-R | 98.38 | 406 | `▁(23` style merges |
| ByT5 | 100.00 | 0 | any boundary falls between bytes |

Splitting on every punctuation mark first (BERT's pre-tokenizer) is one
reason BERT-family models are a comfortable default for token
classification.

**§9 controlled experiment** (tokens per word on MultiCaRe):

| size | BPE | WordPiece | Unigram |
|---|---|---|---|
| 500 | 2.22 | 2.40 | 2.28 |
| 2000 | 1.58 | 1.67 | 1.72 |
| 8000 | 1.25 | 1.28 | 1.57 (stops at 5,347 pieces) |

BPE is slightly ahead of WordPiece at every size. Unigram has worse
fertility but splits closer to morphemes (`adeno carcinoma`,
`pancreat itis`) and never produced `[UNK]`. An 8k vocabulary learned from
200 case reports beats BERT's 30k general vocabulary (1.33) on other case
reports.

**§10 implications for the NER pipeline:** the tokenizer comes with the
model; offsets are the glue; a domain vocabulary pays twice (fewer pieces,
fewer cases over 512), so a BiomedBERT-based NER is a natural candidate for
a later notebook; case matters in clinical text; BERT-style
pre-tokenization aligns with 99.9% of entity boundaries.

### Challenges

1. **Predict, then check:** add Bio_ClinicalBERT and predict how it splits
   `hypokalemia` and `US` (hint: it inherited BioBERT's, i.e. BERT-cased's,
   vocabulary).
2. **Fix a misalignment:** change scispaCy's infix rules to remove its most
   frequent misalignment and re-measure.
3. **When does a word become a token?** The smallest vocabulary size at
   which `pneumothorax` is one piece, per algorithm; then a cased WordPiece.

### Verification checklist (after editing 01b)

1. Execute with papermill from the project venv.
2. The `same` columns in §4 are all `True`.
3. Re-read the numbers quoted in markdown (§5 bullets, §6 lessons, §7
   "Reading the table", §8 bullets, §9 conclusions, §10) against the outputs,
   and the tables in this document.
4. Look at both PNG charts (label collisions, legend placement).
