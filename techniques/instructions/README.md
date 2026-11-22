# From next-token prediction to following instructions

| Notebook | Content |
|---|---|
| [`instruction-following.ipynb`](instruction-following.ipynb) | the same questions asked to tiny **base** models (trained only to predict the next token) and to their **instruction-tuned** versions: the base model continues the text (prompt engineering, templates); the fine-tuning loss on one (instruction, response) example; the fine-tuned model answers and stops; chat templates and a two-turn conversation |

It follows the previous notebook,
[`../generative/next-token-generation.ipynb`](../generative/next-token-generation.ipynb),
and OpenAI's [*Aligning language models to follow
instructions*](https://openai.com/index/instruction-following/)
(InstructGPT, 2022).

## The models

| | base model | instruction-tuned version | how it was tuned | license |
|---|---|---|---|---|
| parts 2–3 | `distilgpt2` (82M), or `gpt2` (124M) | [`MBZUAI/LaMini-GPT-124M`](https://huggingface.co/MBZUAI/LaMini-GPT-124M) | `gpt2` fine-tuned (SFT) on 2.58M instructions with responses by `gpt-3.5-turbo` (LaMini-LM, 2023); Alpaca template | CC BY-NC 4.0 |
| part 4 | [`HuggingFaceTB/SmolLM2-135M`](https://huggingface.co/HuggingFaceTB/SmolLM2-135M) | [`HuggingFaceTB/SmolLM2-135M-Instruct`](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct) | SFT, then DPO on UltraFeedback; chat template | Apache 2.0 |

`LaMini-GPT-124M` is `gpt2` with other weights (same architecture and
tokenizer), so parts 2–3 compare the same network before and after the
instruction fine-tuning. SmolLM2 is the smallest recent pair of base and
chat models.

Reference results (base `distilgpt2`, greedy decoding, 60 tokens at most):

| question | `distilgpt2` (*Question/Answer*) | `LaMini-GPT-124M` | `SmolLM2-135M-Instruct` |
|---|---|---|---|
| What is the capital of France? | *The capital of France is the capital of France.* (repeated) | *Paris.* | *The capital of France is Paris.* |
| Translate to French: Good morning, my friend. | *I am a French citizen.* (repeated) | *Je suis de l'aide.* | *Je m'appelle Pierre.* |

None of the base-model answers ends by itself; the instruct models end
most of theirs with their end-of-text token. Both instruct models get the
translation wrong: the fine-tuning teaches how to respond, not new
knowledge. On the example of section 3.1, the loss on the response goes
from 2.68 (`distilgpt2`) to 0.75 (`LaMini-GPT-124M`).

The notebook is committed with its outputs (executed with papermill, see
the repository `CLAUDE.md`). It uses greedy decoding, so the outputs are
the same on every run.

## Run it on Binder

[Launch `instruction-following.ipynb`](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-instructions?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Finstructions%252Finstruction-following.ipynb%26branch%3Dmain)
— the image (branch `binder-instructions`) already holds the five models; setup and
maintenance in [`binder-env/`](binder-env/README.md).

## Run it locally

With [uv](https://docs.astral.sh/uv/), from this folder:

```bash
uv venv --python 3.12
uv pip install -r requirements.txt
source .venv/bin/activate
jupyter lab instruction-following.ipynb
```

Each model is downloaded from Hugging Face the first time it is loaded
(≈1.4 GB for the four of the default run). Everything runs on CPU in
about a minute; only one model is kept in memory at a time (≈1 GB peak).
