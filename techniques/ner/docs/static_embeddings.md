# Static embeddings notebook (02a) — design and rationale

**Purpose of this document.** The design behind
`02a-static-embeddings.ipynb`, the elementary notebook for the second step
of the main class: what it contains, why it is built that way, and the
results as committed. For the place of the notebook in the series see
[`notebooks_overview.md`](notebooks_overview.md); the main class is
documented in [`ner_pipeline.md`](ner_pipeline.md) (steps ② and ④ are the
ones this notebook zooms into).

The question: *once the text is cut into tokens, how does each token become
a vector — before any context is taken into account?*

| | `02a-static-embeddings.ipynb` |
|---|---|
| level | elementary (the `a` of step 02; a detailed `02b` is not defined yet) |
| in class | 10–15 minutes, live |
| content | one routine (`embedding(tokens)` → a table drawn as colored boxes), six embedding approaches |
| reads | nothing (sentence and words hard-coded, as in 01a) |
| run time | ≈20 s |
| downloads | four extra checkpoints (BERT, BiomedBERT, RoBERTa, ALBERT, ≈1.1 GB) — only their embedding layers are kept in memory |

## Idea

The same pattern as 01a: everything is prepared in earlier cells, and the
studied cell is a routine where one name is changed and the cell re-run.
Tokenization is **taken for granted** — one cell builds the tokenizers of
01a, with no analysis of the tokens.

For a BERT-style encoder, layer 0 is

```
layer-0 vector = LayerNorm( token_table[id] + position_table[position] + segment_table[segment] )
```

and the notebook shows each term as a row of a table. A Word2Vec-style
word-vector table is the contrast: one lookup by the word string, no
position, no segment.

## Structure

| Section | Content |
|---|---|
| Preparation · tokenizers | the `SpacyTokenizer` adapter and the `TOKENIZERS` dict of 01a, minus ByT5; the walkthrough sentence and the five `WORDS` |
| Preparation · embedding approaches | two classes, `TransformerEmbeddings` and `WordVectors`, both called as `embedding(tokens, tokens_b=None) → DataFrame`; the `EMBEDDINGS` dict (name → approach, each naming its own tokenizer); an overview table of the tables' shapes |
| How to read the boxes | color legend and scales |
| The routine | `name = "BERT (uncased)"  # ← change me`; the tokenizer follows from `embedding.tokenizer`; one table per word |
| The same routine, for every embedding approach | loop over `EMBEDDINGS` |
| A whole sentence | one approach (`← change me`), the walkthrough sentence |
| The whole sentence, for every embedding approach | loop |
| Two texts: where the segment matters | `embedding(tokens_a, tokens_b)` on two fragments of the sentence |
| Mixing: any tokenizer with any embedding | both names chosen by the student; missing strings → `[UNK]` / zero vector |
| Mixing, for every pair | a tokenizer × embedding table of missing tokens |
| What to notice | closing notes |

### The table

One row per token (including `[CLS]`/`[SEP]` for Transformers):

| Column | Meaning |
|---|---|
| `token` | the token string |
| `id` | the row of the token table it reads (`100 = [UNK]` when the string is not in the vocabulary; for word vectors, the row of the vector table) |
| `position` | the row of the position table (RoBERTa starts at 2) |
| `segment` | 0 for the first text, 1 for the second; `—` when the model has no segment table |
| `token embedding`, `position embedding`, `segment embedding` | the three looked-up vectors, drawn as boxes |
| `layer 0 = LayerNorm(sum)` | the input of the first Transformer layer — the extra column added to the requested ones |

Under each table: `check — the sum above equals the model's own layer 0:
True`, comparing the hand-made sum with the model's embedding module.

### The six approaches

| Name | Checkpoint | Own tokenizer | Why it is there |
|---|---|---|---|
| BERT (uncased) | `bert-base-uncased` | WordPiece (BERT, uncased) | the reference: all three tables |
| DistilBERT (ner_pipeline) | `d4data/biomedical-ner-all` | WordPiece (BERT, uncased) | the main class's model; **no segment table** |
| BiomedBERT | `microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext` | WordPiece (BiomedBERT) | same architecture as BERT, domain vocabulary |
| RoBERTa | `roberta-base` | BPE (RoBERTa) | positions start at 2; a single segment row; `</s></s>` between texts |
| ALBERT | `albert-base-v2` | Unigram (ALBERT) | **128**-dimensional embeddings (factorized, projected to 768 later) |
| Word2Vec-style (spaCy) | `en_core_web_md` vectors | Rule-based (spaCy) | one table looked up by word; no position, no segment |

## Design decisions

* **Lookup by string.** Each approach converts token *strings* into ids
  with its own vocabulary (`convert_tokens_to_ids`, `vectors.find`). With
  the embedding's own tokenizer this is exactly what the model does; with
  another tokenizer, unknown strings become `[UNK]` (or a zero vector for
  word vectors) instead of indexing a table with ids from a foreign
  vocabulary (meaningless, and out of range for RoBERTa's 50k ids). This is
  what makes the "Mixing" section safe and instructive.
* **Special tokens added by hand** (`[CLS] A [SEP] (B [SEP])`, two
  separators for RoBERTa): transformers 5 removed
  `build_inputs_with_special_tokens`, and the explicit form is easier to
  read.
* **Only the embedding layer is kept** (`AutoModel.from_pretrained(...).embeddings`):
  the rest of each model is garbage-collected. Peak memory of the papermill
  run was 1.26 GB (while loading); add 02a to the Binder memory test
  before using it there.
* **"Word2Vec-style" rather than Word2Vec.** The real Google News Word2Vec
  is 3.6 GB and needs `gensim` (a new package). spaCy's `en_core_web_md`
  vectors (already in the environment, used in §2 of the main class) behave
  the same way for this notebook's purpose: a table keyed by the word
  string, one vector per word type, learned from co-occurrence. They are
  not Google's Word2Vec model (they are Explosion's vectors trained on
  OSCAR, Wikipedia, OpenSubtitles and news text, and pruned to 20k rows),
  hence the name.
* **Colored boxes** (as in the `clinical-embedding` browser): one box per
  dimension, red–white–blue, 48 per line. Drawn by `ner_helpers.show_embeddings`
  as small palette PNGs inside an HTML table (≈1.6 KB per vector), so the
  notebook stays small enough to commit with outputs. The three summed
  vectors share one color scale (±2 standard deviations of their pooled
  values), so their relative strength is visible; layer 0 has its own.
* **Words with special tokens.** The five words are encoded as the model
  would see them, `[CLS] … [SEP]`, so `[CLS]`'s row is the same in every
  word table — a first hint of what "static" means.
* **Mixing, for every pair**: one extra cell (not in 01a's pattern) counts,
  for every tokenizer × embedding, the tokens the embedding cannot find. It
  is the "for every" companion of the mixing routine and makes the point of
  the section in one table.
* **No challenges, no numbered sections**, as in 01a: the elementary
  notebooks are a single routine with closing notes.

## Committed results

As executed 2026-11-08 (papermill, 18 s, 2.4 MB with outputs):

* All 38 Transformer tables report `own layer 0: True`.
* Shapes (rows × dims): BERT and BiomedBERT token 30,522 × 768, position
  512 × 768, segment 2 × 768; DistilBERT the same without segments; RoBERTa
  50,265 × 768, 514 × 768 (positions from 2), 1 × 768; ALBERT 30,000 × 128,
  512 × 128, 2 × 128; Word2Vec-style 20,000 × 300.
* Rows for the sentence (with special tokens): BERT/DistilBERT 33,
  BiomedBERT 30, RoBERTa 32, ALBERT 32, Word2Vec-style 28.
* Word2Vec-style: `dyspnea` and `nausea` share row 18050 (pruning).
* Mixing, BERT + scispaCy tokens: `[UNK]` for `A`, `44-year-old`, `3-day`,
  `constipation`. Missing tokens of the sentence, tokenizer (rows) ×
  embedding (columns):

  | | BERT | DistilBERT | BiomedBERT | RoBERTa | ALBERT | Word2Vec-style |
  |---|---|---|---|---|---|---|
  | scispaCy | 4 | 4 | 3 | 8 | 11 | 2 |
  | spaCy | 2 | 2 | 1 | 6 | 9 | 0 |
  | WordPiece (BERT) | 0 | 0 | 1 | 8 | 10 | 3 |
  | WordPiece (BiomedBERT) | 1 | 1 | 0 | 6 | 8 | 0 |
  | BPE (RoBERTa) | 23 | 23 | 23 | 0 | 22 | 21 |
  | Unigram (ALBERT) | 22 | 22 | 22 | 21 | 0 | 21 |

* Measured while designing, **not shown in the notebook** (candidates for
  a challenge or for 02b): table standard deviations token / position /
  segment — BERT 0.043 / 0.016 / 0.034, BiomedBERT 0.079 / 0.036 / 0.071,
  RoBERTa 0.13 / 0.066 / 0, ALBERT 0.036 / 0.033 / 0.015 (hence the
  "fainter position" note); cosine between the layer-0 vectors of the two
  `with` of the sentence — BERT 0.89, RoBERTa 0.84, ALBERT 0.43 (token
  vectors: 1.0).

## Verification checklist (after editing 02a)

1. Run with papermill (repository `CLAUDE.md`).
2. Every table note reads `... own layer 0: True`.
3. Re-read the "What to notice" notes against the outputs (shapes table,
   `[UNK]` rows of the mixing section, shared Word2Vec rows).
4. Look at the notebook size (images are embedded): ≈2.4 MB; the boxes are ≈1.6 KB per vector (switching `vector_boxes` to a gapless 1-pixel-per-dimension PNG scaled by CSS would halve it).
