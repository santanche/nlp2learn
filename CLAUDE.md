# nlp2learn — notes for Claude

Teaching material (NLP / ML classes) published as a Jekyll site. Each topic
lives in its own folder; some folders have their own `CLAUDE.md` with
project-specific context (e.g. `techniques/ner/CLAUDE.md`) — read it before
working there.

## Standard procedure: executing notebooks with papermill

Notebooks are committed **with their outputs**, so readers (and GitHub) see
the results without running anything. Whenever a notebook is created or
changed, execute it with [papermill](https://papermill.readthedocs.io/),
which writes every cell's output into the `.ipynb` as it runs:

```bash
cd <project folder>                 # e.g. techniques/ner
source .venv/bin/activate           # the project's own uv venv
papermill NB.ipynb NB.ipynb --cwd . --log-output --no-progress-bar
```

* **Run it in the background** (Bash `run_in_background`) and wait for the
  completion notification instead of polling; redirect the log to the
  scratchpad (`> $SCRATCH/pm.log 2>&1`) and read only its tail.
* **Same input and output path** = execute in place. If a cell fails,
  papermill stops, the notebook keeps all cells, the failing cell shows the
  traceback and papermill exits non-zero — fix and run again.
* **Kernel**: papermill uses the kernel named in the notebook metadata
  (`python3`); with the venv activated it resolves to the venv's Python.
  Always run papermill *from the project venv*, never a global one.
* papermill is a **dev tool**, not in the projects' `requirements.txt`
  (that file also feeds Binder). Install it once per venv:
  `uv pip install --python .venv/bin/python papermill`.
* After the run, **check the outputs** (not only the exit code): read the
  numbers the markdown commentary relies on and update the commentary if
  the results say something else.
* papermill adds per-cell `papermill`/`execution` metadata (timings); that
  is expected and fine to commit.

## Conventions

* Each project keeps its own `requirements.txt` and `.venv` (created with
  `uv venv --python 3.12`), run on CPU.
* Notebooks keep the teaching content (models, tensors, algorithms) visible
  in cells; only plumbing (downloads, file parsing) goes to helper modules.
* Commit or push only when asked.
