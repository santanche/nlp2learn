# Binder setup for `techniques/ner`

(The full context — design, limits, local Docker test, maintenance — is in
[`../docs/environment.md`](../docs/environment.md#2-binder).)

The NER notebook needs PyTorch, transformers, spaCy models, two DistilBERT
models and the MACCROBAT corpus. Putting all that in the repository's
top-level `binder/` would make every push to `main` (even a typo fix in a
web page) trigger a slow image rebuild, and would load this heavy environment
under every other notebook in the repo.

Instead we use the **nbgitpuller** pattern:

```
branch binder-ner  ──(Binder builds the image once)──►  image with packages + models + data
branch main        ──(nbgitpuller, at session start)──►  notebooks pulled into ~/nlp2learn
```

## Files

| File | Goes to | Purpose |
|---|---|---|
| `../requirements.txt` | `binder/requirements.txt` | same file as the local `uv` setup (single source of truth) |
| `runtime.txt` | `binder/runtime.txt` | Python 3.12 |
| `postBuild` | `binder/postBuild` | downloads the two Hugging Face models, the tokenizers used by 01a/01b, and MACCROBAT **into the image** |
| `make_branch.sh` | — | builds the `binder-ner` branch from the files above |

## Publishing (once, and again whenever requirements or postBuild change)

```bash
techniques/ner/binder-env/make_branch.sh      # creates/updates local branch binder-ner
git push -u origin binder-ner
```

Then open the launch link once **before class** so the image gets built and
cached (the first build takes several minutes):

<https://mybinder.org/v2/gh/santanche/nlp2learn/binder-ner?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fner%252Fner_pipeline.ipynb%26branch%3Dmain>

Changes to the notebook on `main` need no rebuild: each new session pulls
the latest version.

## Memory budget

mybinder.org sessions get roughly 1–2 GB of RAM. A full run of
`ner_pipeline.ipynb` inside this image, with a 2 GB memory cap and **no
network** (proving nothing is downloaded at run time), peaks at about
**1.2 GB** for the whole container. That is why the
notebook uses `en_core_sci_sm` + `en_core_web_md` vectors and not
scispaCy's `md`/`lg` models: their 4-million-key vocabularies alone take
~1.6 GB each.

## Testing the image locally

With Docker installed:

```bash
git worktree add /tmp/binder-ner binder-ner
uvx --from jupyter-repo2docker repo2docker --no-run --image-name ner-binder /tmp/binder-ner
git worktree remove /tmp/binder-ner
```
