# `ner_pipeline.ipynb` — design and rationale

**Purpose of this document.** The design behind the main class of the NER
series: what each section does, why it is built that way, what students are
expected to see, and which alternatives were rejected. It also records the
results as committed, and a checklist for re-verifying them after a change.
For the series as a whole see [`notebooks_overview.md`](notebooks_overview.md);
for data and models, [`data_and_models.md`](data_and_models.md); for setup
and Binder, [`environment.md`](environment.md).

## 1. Goals and constraints

**Teaching goal.** Students who have just studied attention and the
Transformer should be able to follow **one clinical sentence** through a real
NER system and point at every intermediate object: the tokens, the vectors
that represent them before and after attention, the input and output of the
classifier, and the step that turns per-token labels into entity spans. A
second goal is to show **what fine-tuning does** to the vector space, by
comparing the NER model with the general-purpose model it was trained from.

**Constraints that shaped the design.**

| Constraint | Consequence |
|---|---|
| Every intermediate tensor must be visible | Hugging Face + PyTorch for the neural part; two "rebuilt by hand" checks (layer 0 and the logits) |
| Runs on a student laptop CPU and on mybinder.org (≈1–2 GB RAM) | DistilBERT (66M parameters); scispaCy `sm` instead of `md`/`lg`; peak ≈1.2 GB measured in the Binder image |
| No downloads during class | models and MACCROBAT baked into the Binder image (`binder-env/postBuild`) |
| Real data, not toy sentences | MultiCaRe case reports for the walkthrough; MACCROBAT gold annotations for §8; the polysemy examples are real sentences from the sample |
| Instructor presents it live and sets challenges | numbered sections, one idea per cell, 🧩 challenge cells with empty code cells |

## 2. Architecture

```
sentence (MultiCaRe case report)
  │  ① spaCy / scispaCy: sentence splitting + word tokens        §1
  │  ② static word vectors (spaCy)                                §2
  ▼
  ③ WordPiece tokenizer (Hugging Face)                            §3
  ▼
  ④ layer 0: BERT's own embedding table (token + position)        §4
  ▼
  ⑤ 6 Transformer layers (self-attention)                         §5
  ▼
  ⑥ classifier head: Linear(768 → 84) + softmax                   §6
  ▼
  ⑦ sub-word labels → word labels → entity spans → spaCy Doc      §7
  ⑧ what fine-tuning changed (base vs fine-tuned, MACCROBAT)      §8
  ⑨ a CNN + transition-based NER for contrast                     §9
```

The same pipeline as data, for the walkthrough sentence:

| Step | Input → output | Key objects | Checked by |
|---|---|---|---|
| ① | case text → 18 sentences; sentence → 22 spaCy tokens | `nlp = spacy.load("en_core_sci_sm")`, `doc.sents`, `token.idx` | — |
| ② | word → 300-d static vector | `vec_nlp.vocab[w].vector` (`en_core_web_md`, 20,000 × 300) | identical vectors in two contexts (cosine 1.0) |
| ③ | sentence → 33 `input_ids` (31 pieces + `[CLS]`, `[SEP]`) | `tokenizer(...)`, `word_ids()`, `offset_mapping` | — |
| ④ | ids → `(1, 33, 768)` | `word_embeddings` (30,522 × 768), `position_embeddings` (512 × 768), `LayerNorm` | manual layer 0 == `hidden_states[0]` |
| ⑤ | `(1, 33, 768)` → 6 more hidden states; 6 attention tensors `(1, 12, 33, 33)` | `output_hidden_states=True`, `output_attentions=True` | — |
| ⑥ | `(33, 768)` → `(33, 84)` logits | `ft_model.classifier` (weight 84 × 768, bias 84) | `h @ W.T + b` == `out.logits` |
| ⑦ | logits → 10 typed spans → `Doc.ents` | `decode_entities()`, `show_entities()` | same spans as `pipeline(aggregation_strategy="first")` |
| ⑧ | 904 MACCROBAT words × 7 layers × 768, per model → distances and scores | `centroid_distances()`, scikit-learn | — |
| ⑨ | sentence → untyped `ENTITY` spans | `nlp.get_pipe("ner")` | — |

## 3. Section by section

### §0 Setup

Imports, quieting (warnings, transformers logging and progress bars), a
fixed torch seed, and **one configuration cell** that holds every name a
teacher might want to change:

| Variable | Value | Meaning |
|---|---|---|
| `SPACY_MODEL` | `en_core_sci_sm` | biomedical spaCy pipeline (tokenizer, sentences, POS, untyped NER) |
| `STATIC_VECTORS` | `en_core_web_md` | where the static vectors of §2 come from (comment suggests `en_core_sci_md` on machines with > 3 GB RAM) |
| `FT_MODEL` | `d4data/biomedical-ner-all` | the fine-tuned NER model |
| `BASE_MODEL` | `distilbert-base-uncased` | the model it was fine-tuned from |
| `CASES_CSV` | `sample/cases.csv` | MultiCaRe sample |
| `CASE_ID`, `SENTENCE_STARTS_WITH` | `PMC5137649_01`, `"A 44-year-old woman presented"` | the walkthrough sentence |
| `COMPARE_LABELS` | 6 MACCROBAT types | entity types used in §8 |
| `WORDS_PER_LABEL` | 150 | balanced sample size per type in §8 |
| `COLORS` | dict | displacy and plot colors per entity type |

### §1 Raw text and the spaCy pipeline

Loads the sample, prints one case, loads `en_core_sci_sm` and explains its
components (`tok2vec`, `tagger`, `attribute_ruler`, `lemmatizer`, `parser`,
`ner`, plus the tokenizer, which is not in `pipe_names`). The case is split
into 18 sentences; the walkthrough sentence is shown as a token table
(text, character offset, lemma, POS, shape, stop word).

* **Why this sentence.** It is the typical opening of a case report and in
  one line contains five kinds of entity the model knows (age, sex, event,
  anatomy, symptoms), with no rare characters. That keeps the later tables
  readable.
* **What to notice.** scispaCy keeps `44-year-old` as **one** token: its
  rules were tuned for biomedical text. WordPiece will split it into five
  (§3). The `char_offset` column introduces the idea the whole series
  relies on: **offsets are the common currency** between tokenizations.

### §2 Static word vectors

`en_core_sci_sm` has no vectors (`(0, 0)`), so the notebook loads only the
vector table of `en_core_web_md` (all pipeline components excluded):
20,000 rows × 300 dimensions, reached by 514,157 keys.

* **Pruning, shown on purpose.** There are more keys than rows: rare words
  were mapped onto the row of a kept neighbor. In the similarity heatmap
  *dyspnea* and *nausea* score exactly 1.00. The next cell proves why: both
  map to row 18050. This is a good moment to discuss what a lookup table can
  and cannot represent.
* **The limitation that motivates Transformers.** *culture* has the same
  vector (cosine 1.0) in "the biliary culture was positive" and in "the
  Theranos culture".
* **Aside on spaCy's own features.** spaCy's `tok2vec` does not look up
  one vector per word. It uses `MultiHashEmbed`, which hashes `NORM`, `PREFIX`, `SUFFIX`,
  `SHAPE`, ... into small tables and runs a CNN over neighbors. The config is
  printed to show it, and to explain why the rest of the walkthrough
  switches to a Transformer.
* **Why general-domain vectors.** See [§4 decisions](#4-decisions-and-alternatives).
  The heatmap is meant to be read with that in mind: *dyspnea* and
  *breathlessness* score only 0.34.

### §3 WordPiece tokenization

The tokenizer of `d4data/biomedical-ner-all` (uncased, 30,522 entries)
produces 33 positions for the sentence: 31 pieces plus `[CLS]` and `[SEP]`.
The table shows each piece with its `input_id`, `word_id` and character
span. Five words are tokenized alone to show sub-word splitting:
`constipation → con ##sti ##pati ##on`, `hypokalemia → h ##yp ##oka ##lem ##ia`,
`44-year-old → 44 - year - old`.

* **What to notice.** Frequent words stay whole; rare clinical words are
  spelled with pieces that carry little meaning on their own, so the model
  has to rebuild their meaning from context. The text is lower-cased.
* **Deepened in** 01a and 01b (algorithms, other vocabularies, corpus
  statistics), see [`tokenization.md`](tokenization.md).

### §4 Layer 0 — BERT's own static embeddings

Loads the fine-tuned model **with `attn_implementation="eager"`** and
prints its architecture. Then it rebuilds layer 0 by hand:

```python
layer0_manual = emb.LayerNorm(emb.word_embeddings(input_ids) + emb.position_embeddings(positions))
torch.allclose(layer0_manual, out.hidden_states[0], atol=1e-5)   # True
```

* **The answer to "which static embedding library does BERT use?"**:
  none from outside. The model carries its own learned table, one row per
  vocabulary entry, plus a position table. This is the static,
  context-free part of the Transformer.
* **Detail worth mentioning.** Dropout is part of the embedding module but
  inactive in `eval()` mode, which is why the equality holds. Because
  position is added at layer 0, the same word at two positions is already
  *slightly* different there (the context curves of §5 start near 0.9–0.95,
  not at 1.0).

### §5 Six Transformer layers: from static to contextual

* **Shapes.** `hidden_states` is a tuple of 7 tensors (layer 0 + 6 layers),
  each `(1, 33, 768)`; `attentions` has 6 tensors `(batch, heads, from, to)`
  = `(1, 12, 33, 33)`.
* **Attention heatmap.** Last layer, averaged over the 12 heads. For
  head-by-head exploration the markdown points to the bertviz notebook in
  `machine-learning/neural-network/attention/bertviz/`, which students used
  in the previous lesson.
* **Context curves** (`plot_context_curves`). For each of two words, three
  **real** sentences from the sample: two with the same sense (A1, A2) and
  one with another sense (B):

  | Word | A1 | A2 | B |
  |---|---|---|---|
  | *culture* | "The biliary culture was positive …" | "Upon culture and sensitivity results …" | "… characterized the Theranos culture …" |
  | *cold* | "… a cold agglutinin titer …" | "… antegrade cold blood cardioplegia …" | "… tenacious, cold, and obsessed with success." |

  `word_vectors_by_layer()` finds the first piece of the word's first
  occurrence through the offset mapping and returns its vector at every
  layer. The plot shows cosine(A1, A2) and cosine(A1, B) per layer, with
  the static-vector line at 1.0 for reference. **Committed result:** both
  curves start at ≈0.9 (layer 0). By layer 6, the other-sense similarity
  drops to ≈0.15 for both words, and the same-sense pair stays higher
  (≈0.6 for *culture*, ≈0.33 for *cold*).
* **Why these words.** The sample happens to contain a non-clinical essay
  about the Theranos company (case `PMC9650410_01`). It gives genuine
  non-clinical senses of *culture* and *cold*, so nothing had to be
  invented.

### §6 The classifier: its input and its output

The NER part of the model is **one linear layer**,
`Linear(768 → 84)` (weight `(84, 768)`, bias `(84,)`). The notebook applies
it by hand to the last hidden state and checks the result:

```python
h_last = out.hidden_states[-1][0]                 # input : (33, 768)
logits_manual = h_last @ clf.weight.T + clf.bias  # output: (33, 84)
torch.allclose(logits_manual, out.logits[0], atol=1e-4)   # True
```

A table then shows, per piece, the first 4 of its 768 input values and the
top-3 labels after softmax.

* **Label set.** 84 BIO labels (`O` plus `B-`/`I-` tags over 43 type
  names). Two are malformed: `B-Non[biological](Detailed_description` and
  `B-Personal_[back](Biological_structure`. They are leftovers of broken
  annotations in the training data, and the notebook lists them as a
  reminder that models inherit their data's mistakes.

### §7 From sub-word labels to entities

1. **Raw piece labels** (argmax per piece) are shown transposed. The
   intended observation: *constipation*'s four pieces get `B, O, B, O`.
   Pieces of one word disagree.
2. **`decode_entities()`** takes each word's **first piece** label
   (`word_ids()` gives the grouping, `word_to_chars()` the offsets), then
   builds spans: `B-X` opens a span; `I-X` extends the open span if it has
   the same type, otherwise it opens a new one (a lenient rule); `O`
   closes. Result: 10 spans (Age, Sex, Clinical_event, Duration,
   3 × Biological_structure, 3 × Sign_symptom).
3. **Cross-check**: Hugging Face `pipeline("token-classification",
   aggregation_strategy="first")` returns the same 10 spans with scores.
4. **Back to spaCy**: `show_entities()` builds a `Doc` with spaCy's own
   tokenizer (`nlp.make_doc`), attaches the spans with
   `doc.char_span(..., alignment_mode="expand")`, removes overlaps with
   `filter_spans`, and renders with displacy. The same function runs on
   three more sentences of the case.

* **Errors worth discussing in class**, visible in the committed output:
  *computed* tagged as Diagnostic_procedure without *tomography*; *EUS-FNA*
  tagged as Coreference; *internal* as Disease_disorder. The model is good,
  not perfect.
* **Implementation note.** displacy output is rendered with
  `displacy.render(..., jupyter=False)` wrapped in `IPython.display.HTML`.
  spaCy 3.7's `jupyter=True` path imports an IPython function that IPython 9
  removed.
* **🧩 Challenge 1** asks for a sentence with an entity split into ≥ 5
  pieces with inconsistent labels, and an alternative decoder (majority
  vote or average probability), compared with the pipeline's `"average"`
  and `"max"` strategies.

### §8 What did fine-tuning change?

**Question.** `d4data/biomedical-ner-all` is `distilbert-base-uncased`
plus a new classifier head, trained on MACCROBAT. Same architecture, same
vocabulary (checked: `same vocabulary: True`), different weights. *Do
vectors of words of the same entity type end up closer to each other, and
to their type, after fine-tuning?*

**Deliberate leakage.** The measurements use MACCROBAT, the fine-tuning
data. The goal is to *see* how the space was reshaped, not to estimate
accuracy on new text, and the notebook says so before any measurement.

**8.1 How much did the weights move?** Relative change
‖W_ft − W_base‖ / ‖W_base‖ for every 2-D weight matrix, as a bar chart.
Most matrices moved 4–8%; the largest changes are in the last layer's
feed-forward network (`L5 ffn.lin2` 0.119, `ffn.lin1` 0.104) and the
position embeddings (0.106). The **word embedding table barely moved**
(≈0.02). The point to make: small changes everywhere, but they compound
layer after layer.

**8.2 Gold annotations.** `ner_helpers.load_maccrobat_sentences()` reads
the 200 reports (4,541 sentences). It keeps only the six `COMPARE_LABELS`
types, which are filtered *before* overlap resolution so other types become
plain text, and resolves nested spans longest-first. One gold sentence is
rendered with displacy.

The six types (Sign_symptom, Disease_disorder, Diagnostic_procedure,
Therapeutic_procedure, Medication, Biological_structure) are among the
most frequent in MACCROBAT and map to clear clinical categories; six
colors keep the scatter plots readable.

**Sampling.** Sentences are shuffled with a fixed seed. For each sentence,
`ner_helpers.word_labels()` gives every word its first-piece index and
gold label (the label of the span containing its first character). Words
of the six types are collected until each type has 150. A type can end
slightly above 150, because all qualifying words of the last sentence are
taken: 904 words in total. Both models run on the same input ids, and the
vector of each word's first piece is stored at all 7 layers:
`X["base"]`, `X["fine-tuned"]`, each `(904, 7, 768)`.

Some sampled words are function words inside multi-word spans (e.g. *and*
in "HAART and emtricitabine", labeled Medication). That is real annotation
practice, and it slightly blurs every measure equally for both models.

**8.3 Distance to the "entity type".** The base model has no classifier,
so there is no ready-made "type vector". Both models get the same
definition: the **centroid** of the type's word vectors.
`centroid_distances(V, y)`:

1. subtract the mean vector of all 904 words, because raw BERT vectors are
   *anisotropic*: they share a dominant direction, and without centering
   every cosine is close to 1;
2. L2-normalize each vector;
3. centroid per type, normalized;
4. for each word: **own** = cosine distance to its type's centroid,
   **nearest other** = smallest cosine distance to another type's centroid,
   **margin** = nearest other − own.

Plotted per layer for both models (solid = fine-tuned, dashed = base),
plus a margin histogram at the last layer. Committed values (mean cosine
distance):

| Layer | own (base) | own (ft) | nearest other (base) | nearest other (ft) | margin (base) | margin (ft) |
|---|---|---|---|---|---|---|
| 0 | 0.874 | 0.872 | 0.924 | 0.925 | 0.049 | 0.053 |
| 3 | 0.804 | 0.737 | 0.863 | 0.900 | 0.060 | 0.163 |
| 6 | 0.701 | 0.431 | 0.833 | 0.941 | 0.132 | 0.511 |

**8.4 2-D projections.** PCA, fitted separately per model and layer, of
centered vectors at layer 0 and layer 6. At layer 0 the two panels are
nearly indistinguishable. At layer 6 the fine-tuned model shows clear
groups (Medication well apart), while the base model is still a cloud with
gradients. The markdown warns that PCA is only a shadow of 768 dimensions.

**8.5 Three measures of separation**, per layer and model:

| Measure | Implementation |
|---|---|
| silhouette | `silhouette_score(Z, y, metric="cosine")` |
| nearest-centroid accuracy | `StandardScaler(with_std=False) → Normalizer → NearestCentroid`, 5-fold stratified CV |
| linear probe accuracy | `StandardScaler → LogisticRegression(C=0.1, max_iter=3000)`, 5-fold stratified CV |

Committed values:

| Layer | silhouette (base / ft) | nearest centroid (base / ft) | linear probe (base / ft) |
|---|---|---|---|
| 0 | −0.001 / −0.000 | 0.427 / 0.445 | 0.419 / 0.428 |
| 4 | 0.010 / 0.132 | 0.633 / 0.910 | 0.746 / 0.940 |
| 6 | 0.033 / 0.291 | 0.684 / 0.864 | 0.825 / 0.935 |

Chance level is 1/6 ≈ 0.17.

**Reading the results** (the notebook's closing markdown for §8):

* at layer 0 the models are practically identical, because fine-tuning
  hardly touched the embedding table;
* the curves split in the upper layers, where fine-tuned vectors move much
  closer to their own type's centroid;
* the **linear probe on the base model is already far above chance**
  (0.83). The general model already *encodes* most of the information, and
  fine-tuning mainly **reorganizes** the space so that one linear layer
  (the classifier of §6) can read the types directly.

A detail students may notice: in the fine-tuned model both accuracies peak
at layers 4–5, not 6 (nearest centroid 0.910 at layer 4 → 0.864 at layer 6;
linear probe 0.954 at layer 5 → 0.935), while silhouette keeps rising. The
last layer is shaped for the 84-label BIO head, not for our 6-type grouping.
That makes a good open question.

**🧩 Challenge 2** (add `O` as a class; mean of pieces instead of first
piece; context curves with the base model) and **🧩 Challenge 3** (train a
logistic regression on base-model vectors as a home-made classifier head
and apply it to the walkthrough sentence; what is missing: `O` and the
B/I distinction).

### §9 A different architecture for the same task

The `ner` component that was in the spaCy pipeline all along:
`spacy.TransitionBasedParser.v2` over the `tok2vec` CNN, with moves
`B-ENTITY, I-ENTITY, L-ENTITY, U-ENTITY, O` (BILUO). It marks biomedical
mentions without types. The notebook renders spaCy's spans and d4data's
spans one after the other for four sentences.

* **What to notice.** spaCy's spans are longer and noun-phrase-like
  (*abdominal pain*, *computed tomography*, *cystic lesion*). It also marks
  non-entities (*associated with*, *measuring*, *Fig 2*). d4data splits
  modifiers into separate typed entities.
* **Why it is last.** A transition system decides by a sequence of moves,
  so there is no per-token probability table to inspect. That is exactly
  why the walkthrough used a Transformer to open the box.
* **🧩 Challenge 4** compares the two systems on 10 sentences (span
  boundaries, misses, relation to training data). Optionally, on a machine
  with ≥ 4 GB free RAM, it uses scispaCy's typed `en_ner_bc5cdr_md`.

## 4. Decisions and alternatives

| Decision | Alternatives considered | Why |
|---|---|---|
| spaCy at both ends, Hugging Face + PyTorch in the middle | spaCy alone (`spacy-transformers`, `en_core_web_trf`) | spaCy's pipelines are explicit, but its neural NER hides what the class must show: `tok2vec` hashes features rather than looking up one vector per word, and `ner` is a transition-based parser with no per-token "vector in → probabilities out" step. spaCy is kept where it is transparent (tokenization, sentences, displacy) and as the contrast of §9 |
| `d4data/biomedical-ner-all` (DistilBERT, 6 layers, 66M parameters) | Bio_ClinicalBERT, BiomedBERT, `Clinical-AI-Apollo/Medical-NER` (DeBERTa) | Already fine-tuned for NER (Bio_ClinicalBERT and BiomedBERT have no NER head); trained on **case reports** (MACCROBAT), the same genre as MultiCaRe (Bio_ClinicalBERT was trained on ICU notes); small enough for Binder; a plain linear head that can be rebuilt by hand. Already used in `to-kg` |
| Compare against `distilbert-base-uncased` | none | It is the model d4data was fine-tuned from (its config's `_name_or_path`); same architecture and vocabulary make the comparison controlled |
| Gold labels from MACCROBAT | labeling MultiCaRe with d4data's own predictions; hand-annotating MultiCaRe sentences | Predictions would make the comparison circular (the last layer is trained to separate its own predictions). MACCROBAT is d4data's training data, so leakage is accepted on purpose: the goal is geometry, not accuracy |
| Centroids as "type vectors" | rows of the classifier weight | The base model has no classifier; centroids are defined identically for both models |
| Mean-centering before cosine | raw cosine | BERT vectors are anisotropic; without centering all cosines are near 1 and nothing compares |
| Relative measures (margins, silhouette, CV accuracies) | raw distances across models | The two models' spaces have different scales; only within-model relative quantities are comparable |
| Six types, `O` excluded | all 40+ types; including `O` | Readable plots; `O` is a heterogeneous "everything else" with no meaningful centroid (left as Challenge 2) |
| First-piece word representation and decoding | mean of pieces; majority vote | Matches the common convention and HF's `aggregation_strategy="first"`; alternatives are challenges |
| `en_core_sci_sm` + `en_core_web_md` vectors | `en_core_sci_md`/`lg`; `en_ner_bc5cdr_md` for §9 | scispaCy `md` models have a 4M-key vocabulary that takes ≈1.6 GB of RAM each (and bc5cdr loads its own copy even with a shared `Vocab`), which does not fit Binder. `sm` takes ≈75 MB; `en_core_web_md`'s vector table ≈230 MB. Cost: the static vectors are general-domain |
| §9 uses `en_core_sci_sm`'s own `ner` | `en_ner_bc5cdr_md` | Same architecture, zero extra memory; bc5cdr moved to an optional challenge |
| `attn_implementation="eager"` | default (`sdpa`) | In transformers 5 the default SDPA attention does not return attention weights |
| Real sentences for polysemy | invented minimal pairs | The sample contains genuine senses; nothing to defend in class |
| MACCROBAT downloaded to a user cache | committing the corpus | Keeps the repository small; checksum-verified; baked into the Binder image. CC BY 4.0 would also allow committing it |

## 5. Known limitations

* **Uncased model.** `US` (ultrasound) and `us` are the same token; the
  model never sees case (see 01b §6).
* **Label set.** 84 labels with two malformed ones; MACCROBAT's
  discontinuous entities are skipped and nested ones simplified
  (longest-first), so gold spans used in §8 are a simplification of the
  original annotation.
* **Sequence length.** The walkthrough works sentence by sentence, so the
  512-token limit never bites here. Whole case reports often exceed it
  (01b §7: ≈73% with this vocabulary).
* **Static vectors are general-domain** (see §4); swap
  `STATIC_VECTORS = "en_core_sci_md"` on a machine with more RAM.
* **Upper bounds are not pinned** for transformers/torch. A future major
  version could change outputs or APIs (transformers 5 already required the
  `eager` attention flag), so re-verify after upgrading.

## 6. Verification checklist (after editing the notebook)

1. Execute with papermill from the project venv (see
   [`environment.md`](environment.md#3-executing-the-notebooks)).
2. Hard checks, all printed as `True`: manual layer 0 (§4), manual logits
   (§6), same vocabulary (§8).
3. `decode_entities` spans (§7) equal the `pipeline(... "first")` spans.
4. Context curves (§5): the other-sense curve ends well below the
   same-sense curve for both words.
5. §8 tables: layer 0 nearly equal between models; fine-tuned `own`
   distance and silhouette clearly better at layers 4–6; base linear probe
   well above chance. If numbers change, update the markdown of §8 *and*
   the tables in this document.
6. Look at the PNGs (heatmap, context curves, weight change, distance
   curves, margin histogram, PCA grid, three-metric chart).
7. On a change to models or requirements, rebuild the Binder image and check
   memory (see [`environment.md`](environment.md#2-binder)).

## 7. Editing

The notebook is the source of truth. It was generated once by a throw-away
script that is not in the repository. Edit cells directly (Jupyter,
NotebookEdit, or a small `nbformat` script), keep teaching code in the
notebook and plumbing in `ner_helpers.py`, then re-execute and run the
checklist above.
