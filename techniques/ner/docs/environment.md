# Environment, Binder, execution and maintenance

**Purpose of this document.** Everything needed to run, publish and
maintain the NER notebook series: the local setup, what is pinned and why,
caches and resource use, the Binder deployment, how notebooks are executed
and verified, and how to extend the series. Step-by-step Binder commands
are also in [`../binder-env/README.md`](../binder-env/README.md).

## 1. Local setup

One environment serves all notebooks of the series. Requirements:
[uv](https://docs.astral.sh/uv/), a CPU, ≈2.5 GB of disk.

```bash
cd techniques/ner
uv venv --python 3.12
source .venv/bin/activate              # .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
jupyter lab                            # open 01a, 01b or ner_pipeline
```

* uv keeps a global package cache and hardlinks packages into each venv,
  so another project's venv with the same torch version costs almost no
  extra disk.
* The `.venv` folder is ignored by the repository's `.gitignore`.
* papermill, used to execute notebooks for commits (§5), is a **dev tool**,
  deliberately not in `requirements.txt` (that file also builds the Binder
  image): `uv pip install --python .venv/bin/python papermill`.

### What `requirements.txt` pins, and why

| Line | Reason |
|---|---|
| `--extra-index-url https://download.pytorch.org/whl/cpu` | CPU-only torch wheel; without it pip/uv install the CUDA build (several GB) |
| `numpy<2` | spaCy 3.7 / thinc 8.2 wheels are compiled against numpy 1.x (`ValueError: numpy.dtype size changed` otherwise) |
| `torch>=2.2`, `transformers>=4.45` | lower bounds only; tested with torch 2.15.0+cpu and transformers 5.22.1 |
| `en_core_sci_sm` 0.5.4 (URL) | scispaCy models are only published for 0.5.4; this pulls spaCy 3.7.x |
| `en_core_web_md` 3.7.1 (URL) | static vectors; same spaCy 3.7 line |
| `nbgitpuller` | only used on Binder; harmless locally |
| `jupyterlab`, `ipywidgets`, `pandas`, `scikit-learn`, `matplotlib` | notebook front-end and analysis |

The `scispacy` package itself is **not** installed: loading its models does
not need it. That avoids its `nmslib` dependency, which often has to be
compiled from source.

### Caches and resource use

| What | Where | Size |
|---|---|---|
| venv | `techniques/ner/.venv` | ≈1.7 GB |
| Hugging Face models and tokenizers | `~/.cache/huggingface` (default; **no `HF_HOME` is set**, so all projects share it) | ≈0.55 GB (two DistilBERT models of ≈266 MB each, plus tokenizer files) |
| MACCROBAT | `~/.cache/nlp2learn/maccrobat` (override with `MACCROBAT_DIR`) | ≈4 MB |

First run: the models and MACCROBAT are downloaded on demand. After that,
with a laptop CPU: 01a ≈10 s, 01b ≈30 s, `ner_pipeline` ≈2 min. Peak memory
of `ner_pipeline` is ≈1.2 GB (whole Jupyter container, measured in the
Binder image).

(The sibling project `to-kg` sets `HF_HOME` to its own `data/hf_cache` so
that downloads survive its Docker containers. This series does not need
that.)

## 2. Binder

### Design: nbgitpuller

The image is built from a separate branch that contains **only** the
environment, and the notebooks are pulled from `main` when each session
starts:

```
branch binder-ner  ──(Binder builds the image once)──►  packages + models + MACCROBAT
branch main        ──(nbgitpuller, at session start)──►  notebooks in ~/nlp2learn/techniques/ner
```

Why: if the heavy environment lived in the repository's top-level
`binder/`, every push to `main` (even a typo in a web page) would trigger a
slow image rebuild, and every other notebook of the repository would get
this environment. With nbgitpuller, editing notebooks never triggers a
rebuild.

| File in `binder-env/` | Becomes on `binder-ner` | Purpose |
|---|---|---|
| `../requirements.txt` | `binder/requirements.txt` | the same file as the local setup |
| `runtime.txt` | `binder/runtime.txt` | Python 3.12 |
| `postBuild` | `binder/postBuild` | at build time: downloads both DistilBERT models, the tokenizers of 01a/01b, and MACCROBAT **into the image** |
| `make_branch.sh` | — | creates/updates the local `binder-ner` branch (orphan branch, via a temporary git worktree) |

### Status

As of 2026-11-07 the `binder-ner` branch has **not been created or pushed**
yet, so the launch links below do not work until it is published.

### Publishing (once, and again whenever `requirements.txt` or `postBuild` change)

```bash
techniques/ner/binder-env/make_branch.sh      # commits to local branch binder-ner
git push -u origin binder-ner
```

Then open a launch link once **before class**, so the first build (≈5 min)
happens before students arrive.

### Launch links

| Opens | Link |
|---|---|
| the folder (all notebooks) | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-ner?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fner%26branch%3Dmain) |
| `01a-tokenization-tokens.ipynb` | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-ner?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fner%252F01a-tokenization-tokens.ipynb%26branch%3Dmain) |
| `ner_pipeline.ipynb` | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-ner?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fner%252Fner_pipeline.ipynb%26branch%3Dmain) |

The format is `…/v2/gh/<user>/<repo>/binder-ner?urlpath=git-pull?repo=…&urlpath=lab/tree/nlp2learn/<path>&branch=main`,
with the inner query URL-encoded twice. To link another notebook, encode
it with:

```python
from urllib.parse import urlencode, quote
inner = "git-pull?" + urlencode({"repo": "https://github.com/santanche/nlp2learn",
                                 "urlpath": "lab/tree/nlp2learn/techniques/ner/<file>.ipynb",
                                 "branch": "main"})
print("https://mybinder.org/v2/gh/santanche/nlp2learn/binder-ner?urlpath=" + quote(inner, safe=""))
```

### Limits to keep in mind

* **Memory**: mybinder.org sessions have roughly 1–2 GB. The design keeps
  `ner_pipeline` at ≈1.2 GB; adding a scispaCy `md`/`lg` model would add
  ≈1.6 GB and break it.
* **Sessions are temporary**: work is lost when a session ends or is culled
  after inactivity. Students should download solved challenges.
* **Concurrency**: mybinder.org limits simultaneous sessions per repository.
  Check the current limit before a large class.

### Testing the image locally (Docker)

```bash
techniques/ner/binder-env/make_branch.sh
git worktree add /tmp/binder-ner binder-ner
uvx --from jupyter-repo2docker repo2docker --no-run --image-name ner-binder /tmp/binder-ner
git worktree remove /tmp/binder-ner

# run the main class as Binder would: repo at ~/nlp2learn, no network, 2 GB cap
docker run --rm --network none --memory 2g --memory-swap 2g \
  -v "$PWD":/home/jovyan/nlp2learn:ro ner-binder bash -c \
  'cd ~/nlp2learn/techniques/ner && jupyter nbconvert --to notebook --execute ner_pipeline.ipynb --output /tmp/out.ipynb && cat /sys/fs/cgroup/memory.peak'
```

This was done for `ner_pipeline.ipynb` on 2026-11-05: build OK (image
≈5.9 GB: conda base and libraries 2.7 GB, models 0.5 GB), all 41 code cells
ran offline, peak 1.15 GB. **It has not yet been repeated** since
`postBuild` gained the 01a/01b tokenizers; do it before the first
class that uses 01a/01b on Binder.

## 3. Executing the notebooks

Notebooks are committed **with outputs**, executed with papermill (the
procedure in the repository's `CLAUDE.md`):

```bash
cd techniques/ner
source .venv/bin/activate
papermill NB.ipynb NB.ipynb --cwd . --log-output --no-progress-bar
```

* Same input and output path means the notebook is executed in place. If a
  cell fails, papermill stops, the failing cell shows the traceback, and the
  exit code is non-zero.
* Always run it from the project venv (the `python3` kernel then resolves to
  `.venv`).
* Check the **outputs**, not only the exit code. The markdown commentary and
  the docs quote numbers. Run the verification checklist of the notebook
  ([`ner_pipeline.md` §6](ner_pipeline.md#6-verification-checklist-after-editing-the-notebook),
  [`tokenization.md`](tokenization.md#verification-checklist-after-editing-01b)).
* papermill adds per-cell timing metadata; that is expected.

Note: 01a and 01b were executed with papermill. The committed outputs of
`ner_pipeline.ipynb` come from an `nbconvert` run (no papermill metadata),
so use papermill on its next re-execution.

## 4. Maintenance recipes

**Changing a notebook.** Edit the cells directly (the notebooks are the
source of truth; no generator scripts are kept). Then execute with papermill,
run that notebook's checklist, and update the numbers in the notebook's
markdown and in `docs/` if they moved.

**Changing `requirements.txt` or `postBuild`.** Re-create the local venv (or
`uv pip install -r requirements.txt`), re-execute all three notebooks, run
`make_branch.sh`, test the image with Docker (memory!), push `binder-ner`, and
pre-warm the launch link.

**Upgrading transformers/torch.** Only lower bounds are pinned. After an
upgrade, re-run everything: transformers 5 already changed one behavior
the notebook depends on (attention weights need
`attn_implementation="eager"`).

**Adding a notebook to the series.**

1. Name it by the naming rule (`NN-topic.ipynb`, `a`/`b` for elementary and
   detailed, see [`notebooks_overview.md`](notebooks_overview.md#naming-rule)).
   A detailed notebook starts like the main class (same sample, case,
   sentence, `en_core_sci_sm`).
2. Use the existing environment. If a new model is unavoidable, add it to
   `postBuild` (and check memory). Avoid new packages.
3. Keep teaching code in the notebook; put only plumbing in `ner_helpers.py`.
4. Style: numbered `## N.` sections, a configuration cell, 🧩 challenges,
   credits.
5. Execute with papermill; add it to `README.md`, to
   `docs/notebooks_overview.md`, and a design document in `docs/`; add a
   section to `CLAUDE.md` (the decision log used to resume work with Claude).

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ValueError: numpy.dtype size changed, may indicate binary incompatibility` on `import spacy` | numpy 2 with spaCy 3.7's thinc | `numpy<2` (already pinned) |
| `ImportError: cannot import name 'display' from 'IPython.core.display'` from displacy | spaCy 3.7's `displacy.render(..., jupyter=True)` with IPython ≥ 9 | render with `jupyter=False` and wrap in `IPython.display.HTML` (what the notebooks do) |
| `output_attentions=True` returns `None` / warning about `sdpa` | transformers 5 default attention | load with `attn_implementation="eager"` |
| A load report listing `UNEXPECTED` keys when loading `distilbert-base-uncased` | masked-LM head weights not used by `AutoModel` | harmless; hidden by `transformers.logging.set_verbosity_error()` |
| `MACCROBAT2018.zip checksum mismatch` | interrupted download | the zip is deleted automatically; re-run the cell |
| Kernel dies on Binder | memory: a larger spaCy model or many models loaded at once | keep to `en_core_sci_sm`; run one notebook per session |
| torch download is several GB | the CPU index line was dropped | keep `--extra-index-url https://download.pytorch.org/whl/cpu` |
