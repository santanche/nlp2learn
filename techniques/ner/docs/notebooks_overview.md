# Notebooks overview

**Purpose of this document.** A single map of the NER notebook series in
`techniques/ner/`: what each notebook is for, in which order to use them,
what they read and write, how long they take, and how they relate to each
other. Start here; the other documents in `docs/` go deeper into one
notebook or one concern each.

| Document | Covers |
|---|---|
| **this file** | the series as a whole |
| [`ner_pipeline.md`](ner_pipeline.md) | design and rationale of the main class, section by section |
| [`tokenization.md`](tokenization.md) | design and rationale of the two tokenization notebooks (01a, 01b) |
| [`static_embeddings.md`](static_embeddings.md) | design and rationale of the static-embeddings notebook (02a) |
| [`data_and_models.md`](data_and_models.md) | the two corpora, every model and tokenizer, `ner_helpers.py` |
| [`environment.md`](environment.md) | local setup, caches, Binder, executing and verifying the notebooks, extending the series |

## Where the series sits in the course

Students arrive having studied **attention and the Transformer**. The
series uses that knowledge to open up a real **Named Entity Recognition**
system on real clinical text, and shows what each stage of the pipeline
does to the data. The corpus is the same as the sibling project
[`to-kg`](../../../to-kg/) (MultiCaRe clinical case reports), so the two
activities share vocabulary and examples.

## The notebooks

| Notebook | Role | Runs in | Reads | Writes |
|---|---|---|---|---|
| [`01a-tokenization-tokens.ipynb`](../01a-tokenization-tokens.ipynb) | **warm-up**: one routine, `tokenizer.tokenize(text)`, and seven tokenizers to plug into it | ~10 s | nothing (the sentence is hard-coded) | — |
| [`01b-tokenization.ipynb`](../01b-tokenization.ipynb) | **detailed** look at the first step of the pipeline: rule-based, BPE, WordPiece, Unigram and byte tokenization on clinical text | ~30 s | `sample/cases.csv`, MACCROBAT | — |
| [`02a-static-embeddings.ipynb`](../02a-static-embeddings.ipynb) | **warm-up** for steps ② and ④: one routine, `embedding(tokens)`, showing each token's token, position and segment vectors and layer 0 as colored boxes; five Transformer models and Word2Vec-style vectors | ~20 s | nothing (the sentence is hard-coded) | — |
| [`ner_pipeline.ipynb`](../ner_pipeline.ipynb) | **the main class**: one sentence through a Transformer NER, tensor by tensor; then what fine-tuning changed, and a contrasting architecture | ~2 min | `sample/cases.csv`, MACCROBAT | — |

Times are for a laptop CPU with models already cached. All notebooks are
read-only with respect to the repository: they write nothing to disk except
the model/data caches described in [`environment.md`](environment.md).

### Naming rule

* `ner_pipeline.ipynb` is the main class and has no number.
* **Preliminary** notebooks are numbered `NN-topic.ipynb`; each one zooms
  into **one step** of the main class.
* When a step is split in two, a letter marks the **elementary** notebook
  (`a`) and the **detailed** one (`b`): `01a` is a one-cell routine, `01b`
  is the full comparison.
* Detailed notebooks **start exactly where the main class starts** (same
  sample file, case `PMC5137649_01`, the sentence beginning *"A 44-year-old
  woman presented"*, `en_core_sci_sm` sentence splitting), so students
  recognize the material.

## Suggested order in class

```
01a  (5–10 min)  "what is a token?" — change one name, re-run one cell
  │
01b  (selected sections)  why tokenizers differ; §5 side-by-side, §6 clinical
  │                       words and §8 entity boundaries are the most useful live
  │
02a  (10–15 min)  "what vector does a token get?" — token + position + segment,
  │               change one name, re-run one cell
  ▼
ner_pipeline  §1–7   one sentence, tensor by tensor (the core of the class)
              §8     what fine-tuning changed (the "aha" plots)
              §9     a non-Transformer NER for contrast
```

01b and §8 of the main class are dense; both work as take-home material if
class time is short, and both end with challenges.

## How the notebooks connect

```
                         sample/cases.csv  (MultiCaRe, 56 cases)
                                │
          ┌─────────────────────┼─────────────────────────────┐
          ▼                     ▼                             ▼
     01a, 02a (sentence    01b §1–7                     ner_pipeline §1–7
      hard-coded)          tokenizers compared          walkthrough sentence
                                │                             │
                     MACCROBAT (200 annotated reports, via ner_helpers.py)
                                │                             │
                           01b §8–9                     ner_pipeline §8
                    entity-boundary alignment,       base vs fine-tuned
                    tokenizers trained from scratch  embedding geometry
```

| Step of `ner_pipeline.ipynb` | Deepened in |
|---|---|
| ① spaCy sentence splitting and word tokens (§1) | 01a, 01b §1–2 |
| ③ WordPiece tokenization (§3) | 01a, 01b §3–7 |
| ⑦ sub-word labels → entity spans, `char_span(alignment_mode="expand")` | 01b §8 |
| ② static word vectors (§2), ④ layer 0: token + position embeddings (§4) | 02a (adds segment embeddings, four more models, and mixed tokenizer/embedding pairs) |
| ⑤ layer 0 → contextual vectors | not yet (candidate for `02b`) |
| ⑧ fine-tuning geometry | not yet |

The recurring idea that ties the notebooks together is that **character
offsets are the glue**: spaCy tokens (`token.idx`), WordPiece pieces
(`return_offsets_mapping`, `word_ids()`) and gold annotations (brat
character spans) are different segmentations of the same string, and are
reconciled only through offsets.

## Shared ground

* **One environment** for the whole series (`requirements.txt`, one
  `.venv`, one Binder image). A new notebook should not add packages unless
  unavoidable.
* **Teaching code stays in the notebooks.** `ner_helpers.py` holds only
  plumbing (MACCROBAT download, brat parsing, span → token alignment).
* **Notebooks are committed with their outputs**, executed with papermill
  (repository `CLAUDE.md`, and [`environment.md`](environment.md#3-executing-the-notebooks)),
  so GitHub shows the results and the markdown commentary can quote them.
* **Style**: numbered `## N.` sections, a configuration cell at the top,
  🧩 Challenge cells (markdown + empty code cell), credits at the end.

## What comes next

`02a` covers the static step only. The natural candidates for what follows are:

* **`02b`, static vs contextual embeddings**, expanding §4–5 of the main
  class (e.g. more polysemous words, layer-wise similarity, static vectors
  from domain-specific models on a machine with more RAM);
* **a BiomedBERT-based NER compared with d4data**: 01b shows BiomedBERT's
  vocabulary keeps clinical words whole and puts fewer cases over the
  512-token limit, but no NER fine-tune of it is used yet.
