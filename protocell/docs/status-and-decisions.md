# Protocell-0 Language Labs — Status, Decisions and Limitations

*Start here when resuming the project. Last updated 2026-11-02, at the end of version 1 (all phases of
`design-spec.md` §6 done).*

The three other documents have different jobs:
- `design-spec.md` says what to build (the authoritative design);
- `architecture.md` records what was built, phase by phase, with the measured numbers and the spec change
  log;
- this document collects what a new session needs to continue: how to rebuild everything, the conventions
  agreed with the author, the decisions and their reasons, the known limitations, and the open items.

---

## 1. Status at a glance

| Phase | Deliverables | State |
|---|---|---|
| 0 | repository setup, consistent docs | done |
| 1 | `protocell_lang.py`, notebook 01 (corpus generator) | done |
| 2 | notebooks 03a, 03b; Lab A (Codon Embeddings) | done |
| 3 | notebook 04a; Lab B (Attention Inspector) | done |
| 4 | notebook 04b (encoder, PyTorch); `web/shared/encoder.js`; parity tests | done |
| 5 | notebook 04c (probes); Lab C (Context Lab), complete | done |
| 6 (optional) | notebook 02 (n-grams and the terminator experiment) | done |

Every phase was committed by the author (`git log -- protocell`: "protocell: phase N completed").

**Predictions** (criteria were fixed in `design-spec.md` §7 *before* each experiment ran; the full log is in
`architecture.md` §10):

| Hold | Fail |
|---|---|
| S1, S2, S6 (static); S4 by construction | S3, S5 |
| P3 (no positions cannot place the RBS) | — |
| C3 (gene identity), C5 (no positions collapses cases 1–2) | C1, C2, C4 |
| P6 (n-grams beat chance; causal encoder ≫ n-grams on the terminator) | — |

**The teaching storyline these results support:**
1. **Static vectors reflect the grammatical slot and the dialect** (03a, 03b). They cannot separate
   true from false starts (S4), and in this generator style does not beat meaning (S3 fails).
2. **One attention head with positions learns "an intact RBS 2–5 positions to my left" perfectly**, and
   without positions it cannot tell a misplaced RBS from a correct one (04a, Lab B, P3).
3. **A masked-language-model encoder learns what its objective needs**:
   - the gene of a body codon (case 2) — yes;
   - whether transcription continues (case 3) — yes, but even a model without positions does this, from the
     transcript's composition;
   - whether a start is real (case 1) — **no**. Masked-codon prediction never asks that question (C1, C2).

   *What a model represents depends on what it was trained to predict.*
4. **N-grams beat chance through dialect leakage but cannot reach the marker; attention can** (02, P6). More
   context is not always better: the 4-gram overfits.

---

## 2. How to rebuild everything

### Environment
- A uv virtual environment at `protocell/.venv` (gitignored). It was built with **Python 3.12.15**; uv chose it,
  the system Python is 3.14.
  ```bash
  uv venv .venv
  uv pip install --python .venv/bin/python numpy pandas jupyter nbconvert matplotlib scikit-learn
  uv pip install --python .venv/bin/python torch --index-url https://download.pytorch.org/whl/cpu
  uv pip install --python .venv/bin/python playwright      # testing only, not in requirements.txt
  ```
- Versions used: numpy 2.5.4, pandas 3.1.0, scikit-learn 1.9.1, matplotlib 3.11.2, torch 2.15.0+cpu,
  nbconvert 7.17.2, playwright 1.64.1. Playwright used the Chromium already cached in `~/.cache/ms-playwright`.

### Run order and run times (laptop CPU, 4 threads)
Run each notebook **from its own directory**: every notebook uses `sys.path.insert(0, "..")` and relative paths.
The command is `jupyter nbconvert --to notebook --execute --inplace <notebook>`.

| Order | Notebook | Needs | Writes | Time |
|---|---|---|---|---|
| 1 | `01-corpus/01_generate_corpus.ipynb` | `protocell_lang.py` | `data/corpus/*.csv`; `language.json`, `genome-sample.json`, `showcase-transcripts.json` | ~4 s |
| 2 | `03-static/03a_cooccurrence.ipynb` | 01 | `cooccurrence.json` | ~6 s |
| 3 | `03-static/03b_word2vec.ipynb` | 01 | `w2v-results.json` | ~3.5 min |
| — | `04-attention/04a_attention_by_hand.ipynb` | `protocell_lang.py` only | `mini-transcripts.json` | ~13 s |
| 4 | `04-attention/04b_encoder_training.ipynb` | 01 | `encoder-*.json` (without `probes`), `parity-tests.json` | ~8.5 min |
| 5 | `04-attention/04c_contextual_analysis.ipynb` | 01, 04b, 03b | adds `probes` to `encoder-*.json`; `contextual-sample.json` | ~20 s |
| 6 | `02-ngrams/02_ngram_baselines.ipynb` | 01, 04b | nothing (report only) | ~10 s |

- **`data/corpus/` is gitignored.** On a fresh clone, run notebook 01 before 03a, 03b, 04b, 04c or 02.
  `data/web/` is committed, so the labs work without running anything.
- **04b and 04c are coupled.** Re-running 04b rewrites the encoder files *without* `probes`, which breaks
  Lab C until 04c is run again.
- **Determinism.** Every notebook was run twice and compared, by output-file hashes excluding the metadata
  `created` timestamp, or by printed output for 02. PyTorch results are reproducible on the same machine
  with the same thread count (`torch.set_num_threads(min(4, cpu_count))`, deterministic algorithms on). A
  different CPU or thread count may change 04b's numbers slightly.

### The labs
```bash
cd protocell && python -m http.server      # then open http://localhost:8000/web/
```
`file://` does not work: browsers block `fetch` and ES modules there.

| Lab | Reads |
|---|---|
| A | `language.json`, `genome-sample.json`, `w2v-results.json` |
| B | `mini-transcripts.json`, `language.json` |
| C | `encoder-*.json`, `parity-tests.json`, `contextual-sample.json`, `showcase-transcripts.json`, `w2v-results.json`, `language.json` |

`data/web/` totals 15.2 MB of the 20 MB budget.

### Checking after a change
- **Notebooks:** re-run, check the printed validation and parity lines, and compare hashes against a previous
  run (excluding `created`).
- **Labs:** the start-up badges must pass:
  - Lab A — gradient check;
  - Lab B — gradient check, and JS = NumPy;
  - Lab C — parity for the three configurations, including the cloud projections.
- Each lab exposes a handle for automated checks: `window.labA`, `window.labB` and `window.labC`. They expose
  the state, the maths modules, and `train` / `reset` / `render…` functions.
- The Playwright checks used during development (load, badges, training time and UI pauses, Reset
  reproducibility, JS–Python metric parity, presets, screenshots at 1366×768 and 1920×1080) were one-off
  scripts and are **not in the repository** (see §5). They can be rebuilt from `architecture.md`, whose
  "Verification" subsections list what each one measured.

### Editing notebooks
The notebooks were generated by builder scripts kept outside the repository; those scripts are gone. **The
`.ipynb` files are now the source.** Edit them directly (or with `nbformat`) and re-execute. A markdown-only
change can be made without re-running, as was done for 04b's observations cell.

---

## 3. Working conventions agreed with the author

- **One phase per session**, starting in plan mode: state the acceptance criteria, implement, verify, update
  `architecture.md`, stop.
- **Spec first.** Any design detail not in the spec is decided with the author and written into
  `design-spec.md` before the code. Every such change is logged in `architecture.md` §12.
- **Ask, don't invent.** Design questions were put to the author with a recommended option. The author
  accepted the recommendation in almost every case, but expects to be asked.
- **Pre-register predictions.** For every experiment with a prediction (S1–S6, P3, C1–C5, P6), the metric and
  pass threshold were fixed in the spec before running. Results are reported as they came out, including
  failures. Generator or hyper-parameter changes are allowed only for a stated reason that does not depend on
  the results (convergence, or a spec constraint), and are logged.
- **Report, don't repair.** When a criterion turned out to be badly worded (C1's static half), it was reported
  as written, with the explanation, not silently fixed.
- **Claude does not commit.** The author commits at the end of each phase.
- **Honesty rules** in `CLAUDE.md`:
  - training metrics are labelled "training performance";
  - "proximity means similar contexts, not meaning";
  - the masked-token loss is not evidence that attention does the work;
  - biology claims stay modest.

---

## 4. Key decisions and their reasons

Each decision lives in the spec section named, and is logged in `architecture.md` §12.

**The language (Phases 0–1)**
- **The code is a renamed copy of Ikehara's GNC–SNS code** (G→X, C→Y, A→W, T/U→Z/V), so every claim about it
  can be checked against real biology. Several reserved codons are isomorphic images of real signals: the
  Pribnow box, Shine–Dalgarno, stop codons and the U-run terminator (spec §1).
- **Gene bodies are 12–24 codons**, not 30–60, so that transcripts stay at about 150–220 tokens and attention
  maps stay readable (§2.2).
- **The attenuator and the transcription terminator are the same word** (`WZZ ZZZ`), which creates the
  polysemy of case 3 (§1.4).
- **Dialects** = residue composition (meaning) × synonym preference (style, two registers: X-ending and
  Y-ending, 0.8/0.2).
  - The weights were hand-written, then tuned **only** to meet two §2.3 constraints: naive Bayes from 10 codons
    ≥ 0.90, and no single codon giving a gene a posterior above 0.6.
  - The tuning log is in `architecture.md` §4.
- **Decoys and broken RBS.**
  - Spacer decoys go into 11 uniform slots.
  - A broken RBS is one base mutated, never into a reserved codon, so the gene is otherwise intact (§2.4).
- **The shuffled control.** Each genome is generated once as parts and assembled in two orders, so the
  shuffled corpus differs **only** in gene order. The leader stays before NaxSNIP (§2.2).

**Static embeddings (Phase 2)**
- **03b and Lab A run the same algorithm**: mini-batch SGD with summed updates, 5 negatives, learning rate
  0.025 and 5 epochs. This makes the lab's comparison panel meaningful. The JS RNG differs, so the coordinates
  differ, but the structure is comparable (§4.4).

**Attention by hand (Phase 3)**
- **A `misplaced_rbs` category was added.** Without it, a model with no positions would solve the task from the
  tokens alone, and the spec's prediction would fail by construction (§4.6).
- **No residual connection, no layer normalisation, no Q/K/V biases**, so that every tensor fits on the page.
- **Learning rate 0.1 and 3,000 steps** were chosen on training loss only.

**The encoder (Phases 4–5)**
- **Weights are exported per snapshot, and the forward pass is re-run in JS** instead of shipping precomputed
  attention maps (§0.1). This keeps files small and makes the mutation editor possible. A start-up parity check
  enforces equality with PyTorch.
- **No dropout**, so the forward pass is exactly reproducible. Linear layers keep PyTorch's (out, in) layout in
  JS. The parity values are computed from the *rounded, exported* weights in float64 (§4.7).
- **60 epochs instead of 30**, because `full` had not converged at 30. This was decided before any probe
  existed. The model is still not fully converged at 60 (§5).
- **Notebooks 04c and 02 reimplement the forward pass in NumPy from the JSON weights** rather than importing
  the PyTorch classes. §0.2 allows no shared module besides the language, and this way the notebooks check the
  same files the browser uses.
- **The probe protocol.**
  - Targets are fixed by the language: case 2 uses `XYX`, the codon used most evenly across genes.
  - Probes are trained on the 150 unique test transcripts, split 50/50 by genome, with logistic regression
    (C = 1).
  - The probe weights are exported, so Lab C can score edited tokens live (§4.8).

**N-grams (Phase 6)**
- **Add-k smoothing with k = 0.1, fixed in advance.** The n-grams use the encoder's training genomes, so the
  comparison is like for like.
- **The main comparison is the `causal` encoder**, which, like an n-gram, sees only the left context. `full`
  sees the right context too, which leaks the gene through pathway order.

---

## 5. Limitations and known issues

**Results to read with care**
- **The encoders are not fully converged**: `full`'s test loss is still falling at epoch 60. Longer training
  might change case 1 (C1, C2, C4). Any change of epochs must be decided and logged before looking at probe
  results again.
- **03b at ±1 is not fully converged at 5 epochs** (its loss still falls by about 0.002 per epoch). The epochs
  were fixed before the predictions.
- **C1's static criterion is badly worded.** It compares against the majority rate over *all* occurrences
  (0.48 for case 2), but the probe is scored on the probe-test half, where the majority share is 0.509. The
  static half therefore "fails" on case 2 by sampling alone. A future version should compare against the
  probe-test majority.
- **The case-3 probe is scored on only 76 occurrences** (steps of about 1.3%).
- **N-gram tie-breaking.** At order 4, 52% of terminator decisions tie, because the contexts were never seen;
  ties fall to NaxGATE's terminator. The notebook reports the even-split accuracy (0.437), which does not
  change P6.
- **S3 depends on the dimension:** it fails at dimension 8 and narrowly holds at dimensions 2–3. That is a sign
  of a weak effect.

**Labs**
- **Lab C's occurrence cloud takes 1.4–3.4 s** the first time a (configuration, snapshot) is shown: 150
  transcripts run through the forward pass, with a progress counter, and instant from the cache afterwards.
  The mutation editor itself takes about 57 ms per edit.
- **The probe read-out in Lab C uses the final snapshot's probe at every epoch.** The page warns when the
  slider is not at the final snapshot.
- **Some showcase transcripts in Lab C come from training genomes**, because showcase transcripts are picked
  by rule from the whole corpus. The selector says so; the test transcripts are listed separately.
- **Live training differs from the notebooks.** Lab A and Lab B train with the JS RNG, so a live run differs
  numerically from the notebook. Lab B can start from the notebook's initial weights and then reproduces the
  notebook's loss history to about 1e-15.
- **Browsers tested:** Chromium only (via Playwright). Firefox and Safari have not been checked.

**Process and infrastructure**
- **No automated test suite in the repository**: the browser checks were one-off Playwright scripts.
- **Notebook builder scripts are gone**: edit the `.ipynb` files directly.
- **Colab is untested.** The notebooks assume the repository layout (`sys.path.insert(0, "..")`, `../data/…`).
  On Colab they need a clone of the repository and a `cd` into the notebook's folder; PyTorch is preinstalled
  there.
- **Determinism of 04b** holds on the same machine and thread count; another machine may differ slightly.

---

## 6. Open items and ideas for a next version

From design-spec §9 (still open):
- **NaxGATE isoforms** (two related genes), for paralog similarity in both kinds of embedding.
- **Stage III of the code** (61 codons, 20 residues) and the chemiosmotic branch.
- **The graph side** (nodes and edges for Dagoberto; low-food expression scenario; GATE role label). See the
  pathway doc §8.

Arising from version 1:
- **Case 1 in the encoder.** Train longer, or add a supervised objective (for example, predicting
  `start_role`), and compare the probes. That would turn the C1/C2 failure into a lesson about objectives.
- **Fix the C1 criterion wording** (probe-test majority) before any rerun. Log it as a criterion change, not
  as a result change.
- **Make the browser checks a repeatable script** in the repository (for example `tests/`, using the
  `window.labX` handles).
- **Optional Phase 6 panel:** the terminator experiment in a lab (n-gram against encoder, per gene).
- **Check the notebooks on Colab, and the labs on Firefox and Safari.**
