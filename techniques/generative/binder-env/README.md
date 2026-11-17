# Binder setup for `techniques/generative`

Same design as [`../../ner/binder-env/`](../../ner/binder-env/README.md)
and [`../../embedding/binder-env/`](../../embedding/binder-env/README.md):
the **nbgitpuller** pattern.

```
branch binder-generative ──(Binder builds the image once)──► image with packages + the 2 models
branch main              ──(nbgitpuller, at session start)──► notebooks pulled into ~/nlp2learn
```

The branch holds **only the environment**; the notebooks stay on `main`.
Editing a notebook needs no rebuild (each new session pulls the latest
version), and this environment is not loaded under the other notebooks of
the repository.

## Files

| File | Goes to | Purpose |
|---|---|---|
| `../requirements.txt` | `binder/requirements.txt` | copied (comments dropped) + `nbgitpuller`; the local file stays the single source of truth |
| `runtime.txt` | `binder/runtime.txt` | Python 3.12 |
| `postBuild` | `binder/postBuild` | downloads the two Hugging Face models of `next-token-generation.ipynb` (`distilgpt2`, `roneneldan/TinyStories-33M`) **into the image** |
| `make_branch.sh` | — | builds the `binder-generative` branch from the files above |

## Publishing (once, and again whenever requirements.txt or postBuild change)

```bash
techniques/generative/binder-env/make_branch.sh      # creates/updates local branch binder-generative
git push -u origin binder-generative
```

Then open a launch link once **before class**, so the image gets built and
cached (the first build takes several minutes).

## Launch links

| Opens | Link |
|---|---|
| `generative/next-token-generation.ipynb` | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-generative?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fgenerative%252Fnext-token-generation.ipynb%26branch%3Dmain) |
| the `generative/` folder | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-generative?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fgenerative%26branch%3Dmain) |

The format and how to encode a link to another notebook are explained in
[`../../ner/docs/environment.md`](../../ner/docs/environment.md#launch-links)
(replace `binder-ner` by `binder-generative`).

## Memory budget

mybinder.org sessions get roughly 1–2 GB of RAM. Measured locally (one Python
process, loading the model and generating 45 tokens): **≈0.7 GB** peak with
model A (`distilgpt2`, 82M parameters); **≈0.75 GB** after switching to
model B in the same kernel (the previous model is replaced, not kept). If a
session gets slow after many switches: *Kernel → Restart Kernel*, then run
again.

## Testing the image locally

With Docker installed:

```bash
git worktree add /tmp/binder-generative binder-generative
uvx --from jupyter-repo2docker repo2docker --no-run --image-name generative-binder /tmp/binder-generative
git worktree remove /tmp/binder-generative
```
