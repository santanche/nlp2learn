# Binder setup for `techniques/instructions`

Same design as [`../../generative/binder-env/`](../../generative/binder-env/README.md):
the **nbgitpuller** pattern.

```
branch binder-instructions ──(Binder builds the image once)──► image with packages + the 5 models
branch main                ──(nbgitpuller, at session start)──► notebooks pulled into ~/nlp2learn
```

The branch holds **only the environment**; the notebooks stay on `main`.
Editing a notebook needs no rebuild (each new session pulls the latest
version).

## Files

| File | Goes to | Purpose |
|---|---|---|
| `../requirements.txt` | `binder/requirements.txt` | copied (comments dropped) + `nbgitpuller`; the local file stays the single source of truth |
| `runtime.txt` | `binder/runtime.txt` | Python 3.12 |
| `postBuild` | `binder/postBuild` | downloads the Hugging Face models of `instruction-following.ipynb` (`distilgpt2`, `gpt2`, `MBZUAI/LaMini-GPT-124M`, `HuggingFaceTB/SmolLM2-135M`, `HuggingFaceTB/SmolLM2-135M-Instruct`) **into the image** |
| `make_branch.sh` | — | builds the `binder-instructions` branch from the files above |

## Publishing (once, and again whenever requirements.txt or postBuild change)

```bash
techniques/instructions/binder-env/make_branch.sh      # creates/updates local branch binder-instructions
git push -u origin binder-instructions
```

Then open a launch link once **before class**, so the image gets built and
cached (the first build takes several minutes).

## Launch links

| Opens | Link |
|---|---|
| `instructions/instruction-following.ipynb` | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-instructions?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Finstructions%252Finstruction-following.ipynb%26branch%3Dmain) |
| the `instructions/` folder | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-instructions?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Finstructions%26branch%3Dmain) |

The format and how to encode a link to another notebook are explained in
[`../../ner/docs/environment.md`](../../ner/docs/environment.md#launch-links)
(replace `binder-ner` by `binder-instructions`).

## Memory budget

mybinder.org sessions get roughly 1–2 GB of RAM. The notebook keeps one
model in memory at a time (`load` replaces the previous one). Measured
locally (a whole papermill run, four models loaded in turn): **≈1 GB**
peak. If a session gets slow: *Kernel → Restart Kernel*, then run again.

## Testing the image locally

With Docker installed:

```bash
git worktree add /tmp/binder-instructions binder-instructions
uvx --from jupyter-repo2docker repo2docker --no-run --image-name instructions-binder /tmp/binder-instructions
git worktree remove /tmp/binder-instructions
```
