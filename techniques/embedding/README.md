# Text embeddings, first steps

| Notebook | Content |
|---|---|
| [`text-embeddings.ipynb`](text-embeddings.ipynb) | four clinical texts → one vector each; the vectors as a table; cosine similarity of each pair; the same with four models, one at a time (students switch the active line and note their results) |

## The four models

| | model | trained to… | pooling |
|---|---|---|---|
| A | `BAAI/bge-small-en-v1.5` (default) | produce sentence embeddings (contrastive) | `cls` |
| B | `distilbert-base-uncased` | predict masked words, general English (distilled from BERT) | `cls` (none trained) |
| C | `microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext` | predict masked words + next-sentence prediction, PubMed | `cls` (trained for NSP only) |
| D | `NeuML/pubmedbert-base-embeddings` | C fine-tuned for sentence embeddings | `mean` |

The point of the comparison: the model's vocabulary/domain is not what makes
its vectors comparable — the **training objective** is, and the pooling must
be the one the model was trained with. C and D share architecture, vocabulary
and initial weights; only D's similarity fine-tuning differs.

Reference results (cosine similarity; spread = highest − lowest):

| | pooling | 1×2 | 1×3 | 1×4 | 2×3 | 2×4 | 3×4 | spread |
|---|---|---|---|---|---|---|---|---|
| A | `cls`  | 0.791 | 0.632 | 0.575 | 0.710 | 0.549 | 0.521 | 0.270 |
| B | `cls`  | 0.977 | 0.925 | 0.946 | 0.936 | 0.952 | 0.910 | 0.067 |
| C | `cls`  | 0.974 | 0.939 | 0.941 | 0.951 | 0.936 | 0.921 | 0.053 |
| C | `mean` | 0.990 | 0.977 | 0.973 | 0.983 | 0.974 | 0.976 | 0.017 |
| D | `mean` | 0.771 | 0.531 | 0.350 | 0.532 | 0.285 | 0.315 | 0.486 |

A and D keep texts 1 × 2 as the closest pair and text 4 apart; B and C
squeeze every pair into 0.91–0.99 (B even puts text 4 closer to texts 1 and 2
than text 3 is), and `mean` pooling makes C worse, not better.

Next: [`../classification/title-classification.ipynb`](../classification/title-classification.ipynb)
trains a logistic regression on these `[CLS]` vectors.

The four texts are sentences from MultiCaRe cases in the sample
[`../../data/multicare/data/csv_sample/`](../../data/multicare/data/csv_sample/)
(`PMC5137649_01`, `PMC11722600_01`, `PMC6949661_01`, `PMC6134951_01`):
texts 1 and 2 are about abdominal pain, text 3 is about a possible seizure,
text 4 about a rash. The notebook is committed with its outputs (executed
with papermill, see the repository `CLAUDE.md`).

## Run it on Binder

[Launch `text-embeddings.ipynb`](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-embedding?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fembedding%252Ftext-embeddings.ipynb%26branch%3Dmain)
— the image (branch `binder-embedding`, shared with `../classification/`)
already holds the four models; setup and maintenance in
[`binder-env/`](binder-env/README.md).

## Run it locally

With [uv](https://docs.astral.sh/uv/), from this folder:

```bash
uv venv --python 3.12
uv pip install -r requirements.txt
source .venv/bin/activate
jupyter lab text-embeddings.ipynb
```

Each model is downloaded from Hugging Face the first time it is chosen
(A ≈130 MB, B ≈260 MB, C and D ≈420 MB each). Everything runs on CPU in a
few seconds; the largest models peak at under 0.9 GB of RAM, and switching
through all four in the same kernel at about 1.1 GB.
