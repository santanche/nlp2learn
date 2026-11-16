# Binder setup for `techniques/embedding` and `techniques/classification`

Same design as [`../../ner/binder-env/`](../../ner/binder-env/README.md): the
**nbgitpuller** pattern.

```
branch binder-embedding ──(Binder builds the image once)──► image with packages + the 4 models
branch main             ──(nbgitpuller, at session start)──► notebooks pulled into ~/nlp2learn
```

The branch holds **only the environment**; the notebooks stay on `main`.
Editing a notebook needs no rebuild (each new session pulls the latest
version), and this environment is not loaded under the other notebooks of
the repository.

## Files

| File | Goes to | Purpose |
|---|---|---|
| `../requirements.txt` + `../../classification/requirements.txt` | `binder/requirements.txt` | merged (repeated lines dropped) + `nbgitpuller`; the two local files stay the single source of truth |
| `runtime.txt` | `binder/runtime.txt` | Python 3.12 |
| `postBuild` | `binder/postBuild` | downloads the four Hugging Face models of `text-embeddings.ipynb` **into the image** (model A is also the one of the classification notebooks) |
| `make_branch.sh` | — | builds the `binder-embedding` branch from the files above |

The Medical Abstracts CSVs (≈18 MB) of the classification notebooks are not in
the image: `classification_helpers.py` downloads them into the notebook's
`data/` folder at the first run, as it does locally.

## Publishing (once, and again whenever a requirements.txt or postBuild change)

```bash
techniques/embedding/binder-env/make_branch.sh      # creates/updates local branch binder-embedding
git push -u origin binder-embedding
```

Then open a launch link once **before class**, so the image gets built and
cached (the first build takes several minutes).

## Launch links

| Opens | Link |
|---|---|
| `embedding/text-embeddings.ipynb` | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-embedding?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fembedding%252Ftext-embeddings.ipynb%26branch%3Dmain) |
| the `classification/` folder | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-embedding?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fclassification%26branch%3Dmain) |
| `classification/title-classification.ipynb` | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-embedding?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fclassification%252Ftitle-classification.ipynb%26branch%3Dmain) |
| `classification/title-classification-in-depth.ipynb` | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-embedding?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fclassification%252Ftitle-classification-in-depth.ipynb%26branch%3Dmain) |

The format and how to encode a link to another notebook are explained in
[`../../ner/docs/environment.md`](../../ner/docs/environment.md#launch-links)
(replace `binder-ner` by `binder-embedding`).

## Memory budget

mybinder.org sessions get roughly 1–2 GB of RAM. Measured locally (one Python
process): **≈0.9 GB** peak for the largest models (C and D, 110M parameters);
**≈1.1 GB** after switching through all four models in the same kernel (the
previous model is replaced, not kept). Running one model at a time, as the
notebook asks, is what keeps it under the limit. If a session gets slow
after many switches: *Kernel → Restart Kernel*, then run again.

## Testing the image locally

With Docker installed:

```bash
git worktree add /tmp/binder-embedding binder-embedding
uvx --from jupyter-repo2docker repo2docker --no-run --image-name embedding-binder /tmp/binder-embedding
git worktree remove /tmp/binder-embedding
```
