# Generating text with a decoder, first steps

| Notebook | Content |
|---|---|
| [`next-token-generation.ipynb`](next-token-generation.ipynb) | one prompt through a small GPT-2 model, step by step: tokens → transformer layers → last linear layer (logits) → softmax → top-10 candidates → temperature and sampling → the chosen token appended to the input, one token at a time and in a loop; then the same prompts at five temperatures |

It follows the slides *Decoder Generative Model* (sampling for LLM
generation, after Jurafsky & Martin, *Speech and Language Processing*, 3rd
ed.) and uses their example prompt, *So long and thanks for*.

## The two models

| | model | parameters | layers | trained on |
|---|---|---|---|---|
| A | `distilgpt2` (default) | 82M | 6 | web pages (OpenWebText), distilled from GPT-2 (124M, 12 layers) |
| B | `roneneldan/TinyStories-33M` | 69M | 4 | simple children's stories (TinyStories) |

`distilgpt2` is the smallest model of the GPT-2 family that still writes
general English. Smaller ones exist but only know a narrow language (the
TinyStories models) or are untrained test models (`sshleifer/tiny-gpt2`,
which outputs noise).

Reference results (model A, prompt *So long and thanks for*):

| | *reading* | *your* | *the* | *all* | *that* | top-10 | rest of the vocabulary |
|---|---|---|---|---|---|---|---|
| probability (τ = 1) | 0.300 | 0.128 | 0.085 | 0.063 | 0.012 | 0.695 | 0.305 |

The four words of the slides are real candidates, in a different order and
with smaller probabilities, since 50,257 tokens share the probability.
Greedy decoding (τ = 0) ends with "reading!" plus a web-page ending; τ = 0.7
gives a plausible sentence and then falls into a loop of repeated tokens;
τ = 1.5 produces invented words. With the prompt *The patient was admitted
to the hospital with*, greedy and τ = 0.3 repeat themselves.

The notebook is committed with its outputs (executed with papermill, see
the repository `CLAUDE.md`); the random draws use a fixed seed (`SEED`),
so the outputs are the same on every run.

## Run it locally

With [uv](https://docs.astral.sh/uv/), from this folder:

```bash
uv venv --python 3.12
uv pip install -r requirements.txt
source .venv/bin/activate
jupyter lab next-token-generation.ipynb
```

Each model is downloaded from Hugging Face the first time it is chosen
(A ≈340 MB, B ≈290 MB). Everything runs on CPU in a few seconds.
