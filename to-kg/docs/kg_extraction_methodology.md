# Methodology Proposal: Local, Encoder-Based KG Extraction from MultiCaRe Cases

**Purpose of this document.** This is the design behind
[`notebooks/02_kg_extraction.ipynb`](../notebooks/02_kg_extraction.ipynb).
It answers: *given a hard constraint of running entirely on a local laptop,
with no remote LLM APIs and encoder-only (BERT-family) models rather than
generative ones, what's the best KG-extraction pipeline achievable?* This
supersedes an earlier sketch of the same idea that assumed API access to a
generative LLM (Claude) — that version traded infrastructure simplicity for
API cost and a network dependency; this version makes the opposite trade:
lower peak quality, in exchange for zero cost, zero API keys, and full
reproducibility on a single machine. Section 5 makes that trade-off
explicit.

It is meant to be run once by the instructor to produce an illustrative KG
— shown at the start of the course as "here's where NLP can take you" —
and then reverse-engineered into the simplified, manual steps students
already work through in
[Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md](../Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md).
See Section 8 for that mapping and Section 9 for how the implementation
maps onto this design.

## 1. Design goals and constraints

- **Fully local, fully offline after model download.** No calls to any
  hosted LLM API. Every model runs on the instructor's laptop CPU (a GPU
  helps but isn't required at this scale).
- **Encoder-only (BERT-family) models throughout.** No generative
  decoding anywhere in the pipeline — every stage that would use a
  generative LLM in a cloud-based design is replaced by a *classification*
  or *embedding-similarity* stage instead. This is the main architectural
  consequence of the constraint (Section 2).
- **Consciously lower KG quality than a generative-LLM pipeline, in
  exchange for zero cost/infrastructure.** No implicit multi-sentence
  relation understanding, no free-form disambiguation via world knowledge
  — only what fits in fixed label sets and entailment scoring. This is an
  accepted trade, not an oversight (Section 5).
- **Reuse the activity plan's own schema.** Still targets the same six
  entity categories (Symptom, Disease, Drug, Laboratory Test, Anatomy,
  Procedure) and a small controlled relation vocabulary from Step 3/4 of
  the activity plan, so the automatic output stays comparable to what
  students produce by hand later.
- **No gold KG exists for this corpus** (unchanged from the earlier
  version — see `docs/data_source.md`). "Best achievable" is validated
  against a small hand-checked sample (Section 7), not a benchmark.

## 2. Pipeline stages

```
case_text
    ↓
1. Sentence/narrative segmentation
    ↓
2. Candidate NER (BERT-family token classifier)
    ↓
3. Entity grounding/normalization (SapBERT + UMLS)
    ↓
4. Negation / assertion tagging
    ↓
5. Relation candidate generation (dependency+cues) + typing (zero-shot NLI)
    ↓
6. Cross-case entity resolution (embedding clustering)
    ↓
7. Faithfulness filter (entailment score, same NLI model as Stage 5)
    ↓
8. Graph construction, storage, visualization
```

One design principle worth stating up front: **stages 1, 5, and 7 all
reuse a single general-purpose NLI/zero-shot encoder model** rather than
loading a different specialized model for each. On a laptop, minimizing
the number of distinct model weights loaded into memory matters more than
it would with API calls, and it keeps the total download footprint small
(Section 4).

### Stage 1 — Segmentation

scispaCy's sentencizer (`en_core_sci_lg`) handles clinical abbreviations
("pt.", "hx.", "Dr.") that break generic sentence splitters — this part is
unchanged from the earlier design and isn't LLM-dependent either way.
Optional: tag each sentence with a narrative phase (presentation / history
/ exam / tests / diagnosis / treatment / outcome) using the same zero-shot
NLI model as Stage 5, reformulated as "this sentence describes the
{phase}" hypotheses — cheap to add, gives relation typing a temporal
backbone, and costs no extra model download since it reuses Stage 5's
model.

### Stage 2 — Candidate NER

**Model: `d4data/biomedical-ner-all`** — a DistilBERT-base model (66.4M
params, verified on the Hugging Face hub), fine-tuned on MACCROBAT, a
corpus of annotated **clinical case reports** — a close genre match to
MultiCaRe's `case_text`. It recognizes 107 fine-grained entity types
including Sign_symptom, Disease_disorder, Medication, Diagnostic_procedure,
Biological_structure, and Lab_value, which map fairly directly onto the
activity's six categories (Section 3 gives the mapping). Small and
DistilBERT-based, so CPU inference over a few hundred cases takes minutes,
not hours.

**Heavier alternative, if accuracy matters more than speed:**
`Clinical-AI-Apollo/Medical-NER`, a DeBERTa-v3-base model (~0.2B params,
verified on the hub), 41 medical entity labels, trained on PubMed-derived
text. Worth a side-by-side comparison against the DistilBERT model on the
pilot sample (Section 7) before committing to one.

Neither model's label set was designed around this activity's six
categories, so a manual label-mapping table (native label → activity
category) is real, unavoidable work — see Section 3. Labels that don't map
cleanly (e.g. MACCROBAT's `Duration`, `Frequency`, `Severity`, `History`)
are worth keeping as edge/node attributes rather than discarding, since
they're useful qualifiers on drug and symptom nodes.

### Stage 3 — Entity grounding / normalization

**Model: SapBERT** (`cambridgeltl/SapBERT-from-PubMedBERT-fulltext`,
verified on the hub) — a PubMedBERT-base model fine-tuned via
self-alignment pretraining specifically to embed biomedical entity
mentions so that synonyms land close together in embedding space (trained
on UMLS 2020AA synonym pairs). Embed each NER span and each UMLS concept's
preferred term/synonyms, then assign the nearest UMLS CUI by cosine
similarity above a threshold. This is the encoder-native replacement for
what an API-based pipeline would otherwise lean on an LLM's world
knowledge for.

**Lightweight complement:** scispaCy's own `EntityLinker` (TF-IDF
character n-gram nearest neighbor over UMLS terms) is not a neural model
at all, but it's essentially free to run and catches exact/near-exact
string matches SapBERT's embedding search might rank lower — worth running
both and taking the union, or falling back to it when SapBERT similarity
is below threshold.

### Stage 4 — Negation / assertion

**Primary: negspacy** (NegEx algorithm) — rule-based, no model download,
proven in clinical NLP, unchanged from the earlier design. Tags each
entity `affirmed` / `negated` / `possible` / `family_history`.

**Optional BERT-based upgrade:** `bvanaken/clinical-assertion-negation-bert`
(verified on the hub) — a Bio+Discharge Summary ClinicalBERT model
(Alsentzer et al. base) fine-tuned on 2010 i2b2 assertion data, classifying
a marked entity as `PRESENT` / `ABSENT` / `POSSIBLE`. Its label set is
narrower than NegEx's (no explicit family-history class), so treat it as a
second opinion to combine with negspacy rather than a full replacement —
e.g. flag disagreements for the pilot-sample review in Section 7.

### Stage 5 — Relation candidate generation and typing

This is the stage that most directly replaces the earlier design's
generative LLM call, and it has to be split into two steps because an
encoder can't generate a triple from scratch — it can only score whether a
*given* candidate is right.

**Step 5a — candidate generation (rule-based, not a model).** For each
pair of entities co-occurring in the same sentence (or adjacent sentences,
within a token-distance window), generate a candidate triple using
scispaCy's dependency parse: keep the pair if a verb or preposition cue
from a small controlled lexicon (`treat*`, `reveal*`, `diagnos*`,
`undergo/underwent`, `show*`, `administer*`, `indicate*`, …) sits on the
shortest dependency path between them. This is the same kind of pattern
matching classical relation extraction has always used — cheap, fast,
fully local, and it bounds the number of pairs the next step has to score.

**Step 5b — typing via zero-shot NLI (the encoder-based "reasoning"
step).** For each candidate pair, verbalize each relation in the
controlled vocabulary as a hypothesis ("this sentence implies that
{subject} {relation} {object}") and score entailment with a compact
zero-shot NLI encoder — e.g. a DeBERTa-v3-base zero-shot checkpoint in the
`MoritzLaurer/deberta-v3-*-zeroshot-*` family (~0.2B params, verified on
the hub; check the model card for the commercially-friendly `-c` variant
if license terms matter for redistributing course materials). Assign the
highest-scoring relation above a confidence threshold; below threshold,
drop the candidate rather than forcing a label.

**Practical refinement found during implementation, not in the original
design:** scoring all ten relation labels for every candidate measured at
~8s/candidate on one CPU-only laptop — untenable at any real sample size
(a single ~1,800-character case generated 25+ candidates, i.e. minutes per
case). The fix is a category-plausibility table — e.g. only `located_in`
makes sense for an Anatomy/Symptom pair, only `treats` for a Drug/Disease
pair — that restricts each candidate to the 1–3 labels actually plausible
for its pair of entity *categories* before the NLI call, dropping
candidates with no plausible label at all. Measured effect on the same
case: ~197s → ~15s. This is also a precision win, not just speed: it stops
the model from ever being asked to score nonsensical combinations like
"Anatomy administered_at_dose Symptom." A per-case cap on the number of
candidates (default 30) is applied alongside it as a safety valve, since
`case_text` length ranges from 9 to 79,243 characters in this corpus and
one outlier case could otherwise dominate a run.

**If relation quality after this still isn't good enough, and there's
time to invest:** fine-tune a small BioClinicalBERT/PubMedBERT relation
classifier (entity-marker sentence classification, `[E1]`/`[E2]` special
tokens around subject/object) on the same ~20-case pilot annotation set
already needed for evaluation (Section 7). This directly reuses annotation
work the instructor is doing anyway, rather than being extra effort — the
natural "if you want better local RE, this is the upgrade path" note.

### Stage 6 — Cross-case entity resolution

Unchanged in spirit from the earlier design, and it was already
encoder-based: nodes sharing a UMLS CUI (Stage 3) collapse automatically;
ungrounded or near-synonym entities are clustered by SapBERT embedding
cosine similarity (reusing the same embeddings computed in Stage 3, no
extra model or pass needed) — e.g. unifying "myocardial infarction" /
"heart attack" / "MI" mentioned in different cases into one node.

### Stage 7 — Faithfulness filter

The encoder-native replacement for the earlier "LLM-as-judge" stage: reuse
the **same** zero-shot NLI model from Stage 5b. For each surviving
candidate triple, score entailment between the source sentence and the
verbalized triple; drop triples below a (possibly stricter) threshold than
the one used for relation typing. Because Stage 5b already computes this
score to pick the relation label, this filter is close to free — it's
mostly a matter of choosing where to set the threshold, and is a good
target for the pilot-sample calibration in Section 7.

### Stage 8 — Graph construction, storage, visualization

Two graphs are built, not one — a distinction that only emerged once a
case-centric view became a separate requirement from the entity-relation
view:

- **`G`, entity-only** (nodes = resolved entities from Stage 6, edges =
  accepted relation triples from Stage 7). This is what the notebook's
  own inline **NetworkX + pyvis** preview renders — zero infrastructure,
  renders inline, good for a fast per-case sanity check while iterating in
  the notebook. It's also what gets loaded into **Neo4j Community
  Edition, running locally** (Docker container or native install on the
  same laptop — not Neo4j Aura, which is a cloud service and would
  violate the fully-local constraint), via the `neo4j` Python driver, for
  an interactive Cypher-query demo in class.
- **`G_export`, entity graph plus one node per case**, each connected by a
  `mentions` edge to every entity extracted from it. This is the graph
  behind every *exported* artifact: `nodes.csv`/`edges.csv` (Cytoscape's
  own default column names — `source`/`target`/`interaction` — so
  Cytoscape auto-detects them on import), `kg.graphml` as a one-step
  alternative import, and `graph_data.js` for the dedicated
  [KG viewer](kg_viewer.md) (`viewer/graph_viewer.html`) — a versioned,
  hand-editable page, not something the notebook regenerates from
  scratch, that lets a case node be toggled on/off and clicked to
  highlight or filter down to everything it directly or indirectly
  extracted. See `kg_viewer.md` for the full design of that page.

Export format is CSV, not Parquet: nothing about these outputs (a few
thousand rows at most) needs Parquet's columnar/typed storage, and CSV is
what both Cytoscape and the viewer's fallback CSV loader actually want.

## 3. Entity and relation schema

Same target categories as before; the new column is the mapping from each
NER model's native labels into them (fill in against the actual model card
before implementation — label names above are indicative, not final):

| Activity category | UMLS semantic type(s) | `d4data/biomedical-ner-all` native label(s) (indicative) |
|---|---|---|
| Symptom | Sign or Symptom (T184) | Sign_symptom |
| Disease | Disease or Syndrome (T047) | Disease_disorder |
| Drug | Pharmacologic Substance (T121), Clinical Drug (T200) | Medication |
| Laboratory Test | Laboratory Procedure (T059), Lab or Test Result (T034) | Lab_value, Diagnostic_procedure (subset) |
| Anatomy | Body Part, Organ, or Organ Component (T023) | Biological_structure |
| Procedure | Therapeutic/Preventive Procedure (T061), Diagnostic Procedure (T060) | Diagnostic_procedure, Therapeutic_procedure |

Relation vocabulary (used as NLI hypothesis templates in Stage 5b):
`has_symptom`, `treats`, `reveals`, `diagnosed_with`, `underwent`,
`located_in`, `administered_at_dose`, `has_lab_result`, `ruled_out` (from a
negated finding), `family_history_of`.

## 4. Laptop resource budget

Since there's no per-call API cost, the limiting factor shifts from
"dollars per case" to "CPU wall-clock time and disk space on one laptop":

- **Total model download, one-time:** roughly 66M (NER) + ~110–180M
  (SapBERT/PubMedBERT-base) + ~0.2B (zero-shot NLI) params ≈ under 2GB of
  weights combined — comfortable on a laptop, fully offline afterward.
- **Inference:** NER + grounding themselves are fast (well under a second
  per case). The real cost is Stage 5b's NLI relation typing — measured
  at **~19s/case on average** (range 1–57s across 8 real, varied-length
  cases) on one CPU-only laptop, *after* the category-plausibility
  restriction described in Stage 5 above (roughly 11x slower without it).
  That's ~16 minutes for a 50-case sample, not "a few minutes" as
  originally guessed here before this was actually measured — extrapolate
  linearly for larger samples and budget accordingly rather than assuming
  it stays cheap. A GPU (including a laptop's integrated/Apple Silicon MPS
  backend) speeds this up further but isn't required.
- **RAM:** if the laptop has 8GB or less, load models one stage at a time
  rather than all simultaneously, or use quantized/ONNX versions (via
  `optimum`) for a further speedup.
- **Sample size:** the earlier ~150–300 stratified cases (across
  `metadata.mesh_terms`, age, gender) is still a reasonable target — not
  because of cost anymore, but because a convincing illustrative graph
  needs specialty diversity more than raw scale, and because the pilot
  gold-sample review (Section 7) has to stay a size a human can actually
  check by hand.

## 5. Quality trade-offs versus a remote generative-LLM pipeline

Worth stating plainly, since this is a deliberate trade rather than a free
lunch:

**What's given up:**
- Implicit or multi-sentence relation understanding — a generative LLM
  reading the whole case can connect an entity pair across three sentences
  of narrative; the dependency+NLI approach here is bounded by what
  co-occurs within a sentence/window and by a pre-enumerated relation
  vocabulary rather than one that can be extended on the fly.
- World-knowledge disambiguation — an LLM can use general medical
  knowledge to resolve an ambiguous mention; SapBERT/UMLS grounding only
  goes as far as string/embedding similarity to known UMLS terms.
- Graceful handling of paraphrase and novel phrasing outside training
  distribution.

**What's gained:**
- Zero marginal cost, no API key, no rate limits — the sample size is
  bounded by laptop time, not budget.
- No case text (even though it's public/de-identified case-report text)
  ever leaves the laptop.
- Full reproducibility: fixed model weights and thresholds give the exact
  same graph on every run, with no model-version drift from a hosted API
  changing behavior between runs.
- Every intermediate decision is inspectable: the NLI entailment scores
  and hypothesis templates driving Stage 5/7 are transparent numbers a
  student can read and question, rather than a black-box generation. This
  is arguably a *better* teaching artifact for showing students how
  automatic relation extraction actually reasons — see Section 8.

## 6. What still makes this the best achievable under these constraints

The quality gain over a naive "just run an NER model and connect
co-occurring entities" approach still comes from the same four levers as
before, adapted to encoder-only tooling:

1. UMLS grounding via SapBERT (Stage 3) — without it, "MI", "myocardial
   infarction", and "heart attack" stay three unrelated nodes.
2. Negation handling (Stage 4) — without it, the graph asserts findings
   the text explicitly rules out.
3. Dependency-seeded, NLI-typed relation extraction (Stage 5) instead of
   raw co-occurrence — a co-occurrence-only graph produces edges with no
   semantic label at all; this at least assigns a typed, scored relation.
4. An NLI-based faithfulness filter (Stage 7) reusing Stage 5's model at
   near-zero extra cost — the main defense against low-confidence,
   spurious candidate triples surviving into the final graph.

## 7. Evaluation given no gold KG exists

Unchanged in approach from the earlier design:

- **Pilot gold sample.** Hand-annotate ~20 cases from the stratified
  sample using the LREC 2020 category/relation scheme as guideline (the
  scheme `docs/data_source.md` already identifies as the intended
  annotation guide). Compute precision/recall of the pipeline's output
  against it — and use it to calibrate the Stage 5b/7 NLI thresholds,
  which otherwise have no principled default. This pilot set doubles as
  instructor material for Steps 3–5 of the activity plan, and as training
  data for the optional fine-tuned RE upgrade (Stage 5).
- **Ontology consistency checks.** A triple like `Drug X treats Disease Y`
  should have both endpoints grounded to UMLS CUIs of the expected
  semantic type (Section 3) — a mechanical, model-free quality signal.

## 8. Mapping back to the pedagogical activity plan

Same role as before — this pipeline is the "answer key" that motivates and
later validates
[Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md](../Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md),
not a replacement for it.

- **New Step 0 (motivation).** Show the [KG viewer](kg_viewer.md) live
  before Step 1 — toggle case nodes on, click one, and let the class watch
  it highlight everything that one case contributed: "this is what we're
  building toward, by hand, this semester — and it ran entirely on this
  laptop." The Neo4j Cypher demo or the notebook's inline pyvis preview
  work as lighter-weight alternatives if the viewer isn't set up.
- **Steps 3–5 (manual NER/RE/KG) stay manual**, followed by "compare your
  group's triples for this case to the pipeline's triples for the same
  case" — a genuinely useful comparison now, since the pipeline's relation
  decisions (an NLI entailment score against a specific hypothesis) are
  simple enough to walk through on a whiteboard, unlike a generative LLM's
  reasoning.
- **Step 7 (transition to statistical/neural NLP)** gets the same
  incremental unpacking as before, now grounded in classifiers students
  can inspect:
  - manual NER (Step 3) → the BERT-family token classifier (Stage 2)
  - manual RE (Step 4) → dependency-seeded candidate generation + NLI
    typing (Stage 5) — a natural bridge to later units on NLI and
    zero-shot classification specifically
  - manual KG (Step 5) → the pre-built graph, explored either in the
    [KG viewer](kg_viewer.md) or the local Neo4j graph (Stage 8)
  - embeddings (Step 6/7) → SapBERT embeddings used for grounding and
    entity resolution (Stages 3 and 6), reused later for vector-space/IR
    material

## 9. Implementation footprint

Implemented in [`notebooks/02_kg_extraction.ipynb`](../notebooks/02_kg_extraction.ipynb),
against [`environment/kg-extraction/requirements.txt`](../environment/kg-extraction/requirements.txt)
(`torch` CPU wheel, `transformers`, `spacy`, `scispacy==0.5.4` + the
`en_core_sci_lg` model, `negspacy`, `networkx`, `pyvis`, and the `neo4j`
Python driver for the optional local Cypher demo — see
[`../README.md`](../README.md) for the Docker and `uv` setup paths, both
driving off that same requirements file). No API keys or network access
required at inference time — only for the one-time model downloads from
the Hugging Face hub, cached locally afterward.

The notebook implements every stage exactly as described above, with two
deliberate simplifications worth flagging:

- Stage 3 grounding relies solely on scispaCy's bundled UMLS linker (no
  separate SapBERT-against-UMLS lookup, since that would require indexing
  a licensed UMLS synonym dump locally) — SapBERT is used only for Stage 6
  (cross-case resolution of entities the linker didn't confidently
  ground), not as a second grounding path.
- Stage 5b's relation typing is category-restricted, not a straight
  ten-label zero-shot call — see the "practical refinement" note under
  Stage 5 above. This was discovered as a hard performance requirement
  during implementation, not chosen up front; the notebook's Section 9
  markdown carries the same before/after measurements as this document.

Grounding is also best-effort end to end: if `scispacy`/`nmslib` isn't
installed or fails to build (a known friction point, see the README), the
notebook degrades gracefully — entities keep their surface form and
category without a CUI, and Stage 6 falls back to embedding-only
resolution for everything. Similarly, Stage 5's dependency-path candidate
generation requires an entity's *entire* span to fall inside one
scispaCy-segmented sentence — checking only the start token let entities
whose span straddles a sentence boundary (e.g. a lab value like
"1.100 x 10^9/L" split by scispaCy's segmentation) crash the run with a
`NodeNotFound` error partway through a batch; the fix, plus a broadened
exception net around the same call, is a correctness detail rather than a
methodology choice, so it isn't elaborated above.

**Viewer and export footprint.** [`viewer/graph_viewer.html`](../viewer/graph_viewer.html)
adds no new Python dependency — `vis-network` is vendored as a plain JS
file (`viewer/lib/vis-network.min.js`, copied from `pyvis`'s own bundled
copy, Apache-2.0/MIT) rather than pulled from a CDN, keeping the "fully
offline" property intact for the viewer as well as the notebook. See
[`kg_viewer.md`](kg_viewer.md) for its design. `entities.csv`,
`qualifiers.csv`, `triples.csv`, `nodes.csv`, `edges.csv`, `kg.graphml`,
and `graph_data.js` are all written by the notebook's Section 16 into
`data/kg_extraction/` (gitignored, regenerated per run).

Given the models above are downloaded from third-party hub repos rather
than official model cards, worth a quick license check
(model card "License" field) before bundling any of their weights into
distributed course material, even though running them locally for
in-class use carries no such restriction.
