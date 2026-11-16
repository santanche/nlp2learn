# Classifying `[CLS]` embeddings

| Notebook | Content |
|---|---|
| [`title-classification.ipynb`](title-classification.ipynb) | **the short version**, straight to the point: embed the titles, train a logistic regression, test it (accuracy), classify the four MultiCaRe texts of [`../embedding/`](../embedding/) |
| [`title-classification-in-depth.ipynb`](title-classification-in-depth.ipynb) | **the in-depth version**: a logistic regression trained on the `[CLS]` vectors (`BAAI/bge-small-en-v1.5`, frozen) of 2,400 medical titles in four classes — neoplasms, digestive, nervous, cardiovascular; batching with padding and the attention mask; accuracy, per-class report, confusion matrix, errors; accuracy vs number of training titles; routing the four MultiCaRe texts of [`../embedding/`](../embedding/) |

Both follow [`../embedding/text-embeddings.ipynb`](../embedding/text-embeddings.ipynb)
(same model, same texts) and use the same data, sample and split; the short
version embeds the titles one at a time, the in-depth one in batches, so
their accuracies differ only by rounding (0.865 vs 0.864). The notebooks are
committed with their outputs (executed with papermill, see the repository
`CLAUDE.md`).

## Data

The titles come from the **Medical Abstracts** corpus (T. Schopf, D. Braun,
F. Matthes, NLPIR 2022;
[GitHub](https://github.com/sebischair/Medical-Abstracts-TC-Corpus),
CC BY-SA 3.0): 14,438 labeled PubMed abstracts in five classes.
`classification_helpers.load_titles()` downloads the two CSV files (≈18 MB)
into `data/` (gitignored) on the first run and cleans them:

* the official train and test files are pooled: an abstract with several
  labels appears once per label, sometimes in both files (988 abstracts
  would otherwise be in train *and* test);
* only abstracts with a single label are kept (8,298 of 11,227);
* the fifth class, "general pathological conditions", a catch-all, is left out;
* the title is the text up to the first `. ` or `? `; titles over 30 words
  (no final punctuation, the cut falls inside the abstract) and repeated
  titles are dropped.

Result: 5,683 titles (676 to 2,130 per class). The notebook samples 600 per
class and splits them 2/3 train, 1/3 test (1,600 / 800 titles).

## Run it on Binder

[Launch this folder](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-embedding?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fclassification%26branch%3Dmain)
— same image as `../embedding/` (branch `binder-embedding`); setup and
maintenance in [`../embedding/binder-env/`](../embedding/binder-env/README.md).

## Run it locally

With [uv](https://docs.astral.sh/uv/), from this folder:

```bash
uv venv --python 3.12
uv pip install -r requirements.txt
source .venv/bin/activate
jupyter lab
```

The model (≈130 MB) and the corpus (≈18 MB) are downloaded on the first run.
On CPU each notebook runs in about a minute.
