# CLAUDE.md — Protocell-0 Language Labs

Teaching material: Jupyter notebooks plus browser labs that show how static (word2vec-style) and contextual
(attention-encoder) embeddings form, using Protocell-0, an invented organism with an invented genetic code.
Audience: students in machine learning and bioinformatics courses. Clarity beats cleverness everywhere.

## Read first

1. `docs/design-spec.md` — what to build, the data contract, phases, predictions. **Authoritative.**
2. `docs/protocell-0-energy-pathway.md` — the seven Nax genes and their real counterparts.
3. `docs/protocell-0-spec.md` — the organism (bases, staged code, grammar).
4. `docs/architecture.md` — what has been built so far. Created in Phase 0; update it at the end of every
   phase.

Background only: `docs/ai/` (design debates). `legacy/protocell_lm.py` is the superseded prototype (A/C/G/T
bases); do not import it or copy its tables.

Reference implementations in the same repository, for style and level:
- `zombie/zombienella/` — notebook series (n-grams, co-occurrence, NumPy word2vec).
- `machine-learning/neural-network/feedforward/` — browser lab: live training, latent-space chart, network
  inspector, gradient check at startup.

## Workflow

- One phase of `design-spec.md` §6 per session. Start in plan mode; state the acceptance criteria you will
  check; implement; verify; update `docs/architecture.md`; stop.
- If a design question is not answered by the spec, ask instead of inventing.
- If the data contract (§5) must change, edit the spec first, then the code, and say so.

## Single sources of truth

- The language (bases, transcription, code table, residues, reserved codons, genes, dialect profiles) lives
  only in `protocell_lang.py`. Notebooks import it; labs read `data/web/language.json`, exported from it.
  Never re-type these tables anywhere else.
- Data files follow `design-spec.md` §5 exactly, including the metadata block.

## Python (notebooks)

- Notebooks run top to bottom on a laptop CPU or Colab; each finishes in minutes.
- Pedagogical code is inline and readable; short cells; markdown explains each step before its code.
- NumPy for co-occurrence, word2vec and attention by hand. PyTorch only for the encoder, with attention
  written explicitly — no `nn.MultiheadAttention`, no `nn.TransformerEncoder*`.
- scikit-learn allowed only for PCA and linear probes.
- Every random process is seeded. Train/test splits are by genome.
- Outputs go to `data/corpus/` (full CSVs) and `data/web/` (size-budgeted JSON). Store the producing
  function's source with `inspect.getsource` in each JSON's metadata.

## Web (labs)

- Vanilla HTML, CSS and JavaScript. No frameworks, no build step, no package manager, no ML or plotting
  libraries. Charts in SVG or Canvas.
- Network maths written from scratch in small, readable modules under `web/shared/`.
- Served with `python -m http.server` from `protocell/`; labs fetch from `data/web/`. No other network access.
- Training loops yield to the browser so the page never freezes.
- Seeded RNG; Reset reproduces a run for a given seed.
- Every panel has a Code view: the JS function for live computations, the Python `source` from metadata for
  replayed ones.
- The JS encoder forward pass must match PyTorch: run `parity-tests.json` at startup and show the result.
  Live-trained models run a finite-difference gradient check at startup.
- Layout works on a laptop screen and a classroom projector.

## Honesty rules (pedagogical)

- Never arrange embeddings by hand; plot what the model learned, even when it looks unintuitive.
- Label training-set metrics as training performance.
- Report every prediction in `design-spec.md` §7 as it actually came out. Do not tune the generator to force a
  result; any parameter change needs a stated reason.
- Proximity in embedding space means similar contexts, not similar meaning — say so where embeddings appear.
- The masked-token loss is not evidence that attention does the work; the probes are.
- Keep biology claims modest; Protocell-0 is invented, its real counterparts are listed in the pathway doc.

## Naming

- Bases end in -ine (W welline, X xoline, Y ythrine, Z zoltine; V vethine in RNA). Residues end in -an
  (two-letter codes: Nm, Kv, Ds, Th, My, Os, Si, Pv, Qu, Lu).
- DNA strings use Z; RNA strings use V.
- Genes: NaxGATE, NaxTAG, NaxSNIP, NaxFLIP, NaxGRAB, NaxPAY, NaxDUMP.
- UI text, comments and docs in English.
