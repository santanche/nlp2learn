# Named Entity Recognition, step by step

An interactive class that follows one sentence from a clinical case report
through a Transformer-based NER system, exposing every intermediate step:

1. **spaCy / scispaCy pipeline** — sentence splitting and rule-based tokens
2. **Static word vectors** — one vector per word type, blind to context
3. **WordPiece tokenization** — sub-word pieces, ids, and their alignment to words
4. **Layer 0** — BERT's own embedding table (token + position), rebuilt by hand
5. **Six Transformer layers** — attention, and how a word's vector becomes contextual
6. **The classifier** — its input (768-d vectors) and output (84 logits), rebuilt by hand
7. **Decoding** — sub-word BIO labels → word labels → entity spans → spaCy `Doc` / displacy
8. **What fine-tuning changed** — `distilbert-base-uncased` vs `d4data/biomedical-ner-all`:
   distance of word vectors to entity-type centroids, layer by layer, plus
   silhouette, nearest-centroid and linear-probe measures
9. **A different architecture** — spaCy's CNN + transition-based NER

with four 🧩 challenges along the way.

## Run it

**On Binder** (nothing to install):
[launch `ner_pipeline.ipynb`](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-ner?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fner%252Fner_pipeline.ipynb%26branch%3Dmain)
— see [`binder-env/README.md`](binder-env/README.md) for how that environment is built.

**Locally**, with [uv](https://docs.astral.sh/uv/) (from this folder):

```bash
uv venv --python 3.12
source .venv/bin/activate          # .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
jupyter lab ner_pipeline.ipynb
```

The first run downloads the two DistilBERT models (~0.5 GB, into the default
Hugging Face cache `~/.cache/huggingface`) and MACCROBAT (~1 MB, into
`~/.cache/nlp2learn/maccrobat`). A full run takes about 2 minutes on a
laptop CPU and peaks at ~1.5 GB of RAM.

## Files

| Path | Content |
|---|---|
| `ner_pipeline.ipynb` | the class |
| `ner_helpers.py` | plumbing only: MACCROBAT download, brat parsing, span → token alignment |
| `sample/` | 50-article sample of MultiCaRe converted to CSV (same as `to-kg/data/csv/sample`) |
| `requirements.txt` | environment, shared by the local and Binder setups |
| `binder-env/` | Binder image definition (published as branch `binder-ner`) |

## Design notes

* **Why not spaCy alone?** spaCy's pipelines are very explicit, but its
  neural NER hides exactly what this class wants to show: `tok2vec` hashes
  token features instead of looking up one vector per word, and the `ner`
  component is a transition-based parser, so there is no per-token
  "vector in → label probabilities out" step. spaCy is used where it is
  transparent (tokenization, sentences, displacy) and as a contrast (step 9).
* **Model sizes.** scispaCy's `md`/`lg` models are avoided because their
  vocabularies take ~1.6 GB of RAM each; `en_core_sci_sm` (no vectors) plus
  the vector table of `en_core_web_md` fit in a Binder session.
* **Leakage, on purpose.** Step 8 measures geometry on MACCROBAT, the data
  `d4data/biomedical-ner-all` was fine-tuned on. The goal is to show how
  fine-tuning reshaped the vector space, not to estimate accuracy.
* **Version pins.** scispaCy models are only published for v0.5.4, which
  needs spaCy 3.7.x, whose `thinc` wheels need `numpy<2`.

## Data and model credits

* MultiCaRe — Nievas Offidani et al., [Zenodo 10.5281/zenodo.10079369](https://doi.org/10.5281/zenodo.10079369).
* MACCROBAT2018 — Caufield, J. H. (2019), [figshare 10.6084/m9.figshare.9764942.v2](https://doi.org/10.6084/m9.figshare.9764942.v2), CC BY 4.0.
* [`d4data/biomedical-ner-all`](https://huggingface.co/d4data/biomedical-ner-all),
  [`distilbert-base-uncased`](https://huggingface.co/distilbert-base-uncased),
  [scispaCy](https://allenai.github.io/scispacy/), [spaCy `en_core_web_md`](https://spacy.io/models/en#en_core_web_md) — see their model cards for licenses.
