# legacy/ — superseded prototype

`protocell_lm.py` is the first prototype of Protocell-0 as a language: a proto-genome generator with class
markers, dialects and class terminators, n-gram baselines and a 1-layer, 2-head transformer. It predates the
current design and still uses A/C/G/T bases, real amino-acid codes and three gene classes.

It is kept for reference only (it is the script described in `docs/protocell-0-spec.md` §7). Do not import it;
the language now lives in `protocell_lang.py` (Phase 1 of `docs/design-spec.md` §6).

`requirements.txt` lists the prototype's dependencies (NumPy, PyTorch).
