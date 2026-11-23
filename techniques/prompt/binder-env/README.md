# Binder setup for `techniques/prompt`

Same design as [`../../instructions/binder-env/`](../../instructions/binder-env/README.md):
the **nbgitpuller** pattern.

```
branch binder-prompt ──(Binder builds the image once)──► image with packages + Qwen3-0.6B
branch main          ──(nbgitpuller, at session start)──► notebooks pulled into ~/nlp2learn
```

The branch holds **only the environment**; the notebooks stay on `main`.
Editing a notebook needs no rebuild (each new session pulls the latest
version).

## Files

| File | Goes to | Purpose |
|---|---|---|
| `../requirements.txt` | `binder/requirements.txt` | copied (comments dropped) + `nbgitpuller`; the local file stays the single source of truth |
| `runtime.txt` | `binder/runtime.txt` | Python 3.12 |
| `postBuild` | `binder/postBuild` | downloads `Qwen/Qwen3-0.6B` (parts 1–5 of `prompt-engineering.ipynb`) **into the image** |
| `make_branch.sh` | — | builds the `binder-prompt` branch from the files above |

## Publishing (once, and again whenever requirements.txt or postBuild change)

```bash
techniques/prompt/binder-env/make_branch.sh      # creates/updates local branch binder-prompt
git push -u origin binder-prompt
```

Then open a launch link once **before class**, so the image gets built and
cached (the first build takes several minutes).

## Launch links

| Opens | Link |
|---|---|
| `prompt/prompt-engineering.ipynb` | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-prompt?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fprompt%252Fprompt-engineering.ipynb%26branch%3Dmain) |
| the `prompt/` folder | [launch](https://mybinder.org/v2/gh/santanche/nlp2learn/binder-prompt?urlpath=git-pull%3Frepo%3Dhttps%253A%252F%252Fgithub.com%252Fsantanche%252Fnlp2learn%26urlpath%3Dlab%252Ftree%252Fnlp2learn%252Ftechniques%252Fprompt%26branch%3Dmain) |

The format and how to encode a link to another notebook are explained in
[`../../ner/docs/environment.md`](../../ner/docs/environment.md#launch-links)
(replace `binder-ner` by `binder-prompt`).

## Memory budget

mybinder.org sessions get roughly 1–2 GB of RAM. Qwen3-0.6B is loaded in
bfloat16 (≈1.2 GB of weights), so parts 1–5 fit, close to the limit.
**Part 6 does not fit**: Qwen3-1.7B needs ≈4 GB, and it is not in the
image (it would be downloaded, ≈4 GB, then the kernel would be killed).
On Binder, stop before part 6; its outputs are in the committed notebook.
If a session gets slow: *Kernel → Restart Kernel*, then run again.

## Testing the image locally

With Docker installed:

```bash
git worktree add /tmp/binder-prompt binder-prompt
uvx --from jupyter-repo2docker repo2docker --no-run --image-name prompt-binder /tmp/binder-prompt
git worktree remove /tmp/binder-prompt
```
