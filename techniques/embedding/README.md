# Text embeddings, first steps

| Notebook | Content |
|---|---|
| [`text-embeddings.ipynb`](text-embeddings.ipynb) | three clinical texts → one `[CLS]` vector each (`BAAI/bge-small-en-v1.5`, 384 dimensions); the vectors as a table; cosine similarity of each pair; a logistic regression on the `[CLS]` vectors that labels a new case |

The three texts are opening sentences of MultiCaRe cases from the sample in
[`../ner/`](../ner/) (`PMC5137649_01`, `PMC11722600_01`, `PMC6949661_01`):
texts 1 and 2 are about abdominal pain, text 3 is about a possible seizure.
The notebook is committed with its outputs (executed with papermill, see the
repository `CLAUDE.md`).

## Run it locally

With [uv](https://docs.astral.sh/uv/), from this folder:

```bash
uv venv --python 3.12
uv pip install -r requirements.txt
source .venv/bin/activate
jupyter lab text-embeddings.ipynb
```

The model (≈130 MB) is downloaded from Hugging Face on the first run. Everything
runs on CPU in a few seconds.
