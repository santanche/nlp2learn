# Methodology Proposal: Best-Possible KG Extraction from MultiCaRe Cases

**Purpose of this document.** This is a proposal, not an implemented pipeline.
It answers: *if the goal were the best knowledge graph we can reasonably
produce from `cases.parquet`, using any model or framework available today,
what would that pipeline look like?* It is meant to be run once by the
instructor (not by students, not on Binder) to produce an illustrative KG —
shown at the start of the course as "here's where NLP can take you" — and
then reverse-engineered into the simplified, manual steps students already
work through in
[Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md](../Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md).
See Section 7 for that mapping.

Nothing here has been added to `environment.yml` or implemented in a
notebook yet — Section 8 lists what implementation would require.

## 1. Design goals and constraints

- **Best quality, not classroom-runnable.** Unlike the pedagogical steps,
  this pipeline is allowed to call a frontier LLM API and use models too
  heavy for Binder's free-tier CPU containers. It produces an artifact
  (graph file, Neo4j dump, screenshots/video) that gets *shown* to students,
  not re-run by them.
- **No gold KG exists for this corpus.** `docs/data_source.md` already
  establishes that MultiCaRe supplies raw text only, and the LREC 2020
  paper (Schulz et al.) supplies a category scheme, not annotations over
  this data. So "best possible" has to be validated against a small
  hand-checked sample (Section 6), not against a pre-existing benchmark.
- **Reuse the activity plan's own schema.** Step 3 of the activity plan
  already commits to six entity categories (Symptom, Disease, Drug,
  Laboratory Test, Anatomy, Procedure) and Step 4 to example relations
  (`has_symptom`, `reveals`, `treats`). The automatic pipeline should target
  the *same* schema, not a richer one — otherwise the "compare your manual
  annotation to the automatic one" discussion (Section 7) breaks down.
- **Small, curated sample, not the full 98k cases.** A convincing
  illustrative graph needs real hub structure (a drug treating several
  diseases, a symptom shared across cases) but doesn't need scale. Stratify
  a sample of roughly 150–300 cases across `metadata.mesh_terms` /
  `major_mesh_terms`, age, and gender so the graph reads as multi-specialty
  rather than one narrow topic.

## 2. Pipeline stages

```
case_text
    ↓
1. Sentence/narrative segmentation
    ↓
2. Candidate NER + UMLS grounding (classical, local)
    ↓
3. Negation / assertion tagging
    ↓
4. LLM joint entity + relation extraction (whole case_text, schema-constrained)
    ↓
5. Merge classical + LLM entities, reconcile to CUIs
    ↓
6. Cross-case entity resolution (CUI exact match + embedding clustering)
    ↓
7. LLM-as-judge faithfulness filter
    ↓
8. Graph construction, storage, visualization
```

### Stage 1 — Segmentation

Use scispaCy's sentencizer (`en_core_sci_lg`), not a generic one — it
handles clinical abbreviations ("pt.", "hx.", "Dr.") that break naive
sentence splitters. Optional but useful: a per-sentence LLM tag for
narrative phase (presentation / history / exam / tests / diagnosis /
treatment / outcome) — cheap to add and gives relation extraction a
temporal backbone ("reveals" should attach a test-phase sentence to a
diagnosis-phase entity).

### Stage 2 — Candidate NER + grounding (classical)

**Framework: scispaCy** (`en_core_sci_lg` or the narrower
`en_ner_bc5cdr_md` for disease/chemical, `en_ner_bionlp13cg_md` for
anatomy/cell) with the `scispacy.linking` UMLS `EntityLinker`. CPU-only,
free, deterministic, and grounds every hit to a UMLS CUI + preferred term +
semantic type — which is what makes later cross-case entity resolution
possible.

This pass is a *recall net*, not the final answer: it catches well-known
terminology reliably but misses paraphrased or implicit mentions ("the
antibiotic" without naming it, a lab value expressed as a sentence).

### Stage 3 — Negation / assertion

**Framework: negspacy** (NegEx algorithm) layered on the scispaCy pipeline.
Clinical text is full of negated findings ("no signs of pneumonia", "denies
fever") — without this stage, a naive pipeline will assert the opposite of
what the case actually says. Tag each entity `affirmed` / `negated` /
`possible` / `family_history` (a category the LREC scheme also calls out as
a "negation modifier").

### Stage 4 — LLM joint extraction (the quality-driving stage)

**Model: Claude Opus 5**, called once per case with the *full* `case_text`
(cases run 9–79,243 chars, median ~2,543 — well within context, so no
chunking needed, which also sidesteps most coreference problems: "she",
"the patient", "it" resolve naturally when the model sees the whole case).
Feed it the Stage 2/3 candidate entities as hints, not as ground truth, and
constrain the output via a Pydantic schema passed as a tool/function
definition:

- entity type ∈ the activity plan's six categories
- relation type ∈ a small controlled vocabulary (`has_symptom`, `treats`,
  `reveals`, `diagnosed_with`, `underwent`, `located_in`,
  `administered_at_dose`, `has_lab_result`, `ruled_out`) extendable but kept
  small deliberately, so the resulting graph stays legible for the "compare
  to your manual triples" discussion later
- each entity carries the negation/assertion status from Stage 3 where
  applicable

Why an LLM here rather than a trained relation-extraction model: there is
no off-the-shelf RE model for this exact schema, and training one needs
labeled data that doesn't exist for this corpus. An instruction-following
LLM with a schema-constrained tool call gets both entities scispaCy missed
and multi-sentence relations ("CT scan reveals pulmonary infiltrate")
without needing training data.

**Cost-effective fallback:** Claude Sonnet 5 if running the full ~150–300
case sample at Opus pricing is a concern — quality drop is real but modest
for this kind of structured extraction. **Zero-API-cost fallback:** an
open-weight instruct model (Llama 3.3 70B, Qwen2.5-72B-Instruct) served via
vLLM or Ollama, if the instructor wants a fully local/reproducible run —
worth doing once as a comparison point, since "closed frontier model vs.
open local model" is itself a nice thing to show students later in the
semester.

### Stage 5 — Merge and re-ground

Reconcile the Stage 2 (scispaCy+UMLS) and Stage 4 (LLM) entity sets by
string + CUI match. Where the LLM surfaces an entity scispaCy missed, run
it back through the UMLS linker's candidate generator alone so it also gets
a CUI where one exists. Entities with no UMLS match at all are kept but
flagged ungrounded — informative in itself (shows where structured
vocabularies fall short of free text).

### Stage 6 — Cross-case entity resolution

Nodes with the same CUI collapse automatically. For ungrounded entities
(and near-synonyms UMLS didn't unify), cluster by embedding similarity
using **SapBERT** (purpose-built for biomedical synonym/entity-linking
similarity — meaningfully better here than a generic sentence-embedding
model) and merge above a similarity threshold, e.g. unifying "myocardial
infarction" / "heart attack" / "MI" mentioned in different cases into one
node.

### Stage 7 — LLM-as-judge faithfulness filter

A second, cheaper LLM call (Sonnet or Haiku 4.5 is enough) re-reads each
(source sentence, extracted triple) pair and flags triples not actually
supported by the text. This is the main defense against LLM hallucination
in Stage 4 — important for drug names and dosages specifically, where a
confident-sounding wrong extraction is easy to miss by eye. Drop or
down-weight flagged triples rather than silently keeping them.

### Stage 8 — Graph construction, storage, visualization

Two complementary outputs, not a single choice:

- **NetworkX + pyvis**, serialized alongside the notebook — zero
  infrastructure, renders inline, good for the "here's the KG for this one
  case" walkthroughs during class.
- **Neo4j** (local Docker instance or Neo4j Aura free tier, loaded via the
  `neo4j` Python driver), for an interactive Cypher-query demo — this is
  the "wow, this is what a real KG deployment looks like" moment, and
  supports live queries in class ("show me every case where drug X treats
  disease Y"). Not Binder-compatible, which is fine since this pipeline
  isn't meant to run there.

Optional third output for a later-semester tie-in: export as RDF via
`rdflib`, mapped loosely to the UMLS Semantic Network / Biolink Model, to
illustrate the property-graph-vs-RDF/OWL distinction when the course
reaches formal semantics.

## 3. Entity and relation schema

Kept identical to the activity plan's Step 3/4 categories, with UMLS
semantic types as the grounding target for each:

| Activity category | UMLS semantic type(s) |
|---|---|
| Symptom | Sign or Symptom (T184) |
| Disease | Disease or Syndrome (T047) |
| Drug | Pharmacologic Substance (T121), Clinical Drug (T200) |
| Laboratory Test | Laboratory Procedure (T059), Lab or Test Result (T034) |
| Anatomy | Body Part, Organ, or Organ Component (T023) |
| Procedure | Therapeutic or Preventive Procedure (T061), Diagnostic Procedure (T060) |

Relation vocabulary: `has_symptom`, `treats`, `reveals`, `diagnosed_with`,
`underwent`, `located_in`, `administered_at_dose`, `has_lab_result`,
`ruled_out` (from a negated finding), `family_history_of`.

## 4. Sampling strategy

Do not run over all 98,641 cases. Stratify a sample of ~150–300 cases
across `metadata.mesh_terms` / `major_mesh_terms` (specialty diversity),
`age`, and `gender` (already computed in `01_data_preparation.ipynb`,
Section 4) so the resulting graph shows cross-specialty hub structure
rather than one narrow topic. This also keeps LLM API cost and manual spot
review (Section 6) tractable.

## 5. What makes this "best possible" rather than "automatic but shallow"

The quality gain over a single-pass "run an NER model, run an RE model"
approach comes specifically from:

1. Grounding to UMLS CUIs (Stage 2/5) — without this, "MI", "myocardial
   infarction", and "heart attack" are three unrelated graph nodes.
2. Negation handling (Stage 3) — without this, the graph asserts findings
   the case text explicitly rules out.
3. Whole-case-text LLM extraction (Stage 4) — avoids brittle
   sentence-by-sentence coreference failures and catches implicit/
   multi-sentence relations pattern-based RE would miss.
4. A faithfulness filter (Stage 7) — the one stage that directly guards
   against the main new failure mode LLM extraction introduces
   (fluent-sounding but unsupported triples).

Any of these four can be dropped to produce a cheaper, shallower pipeline —
which is exactly the knob to turn when designing the backward-simplified
pedagogical labs.

## 6. Evaluation given no gold KG exists

- **Pilot gold sample.** Hand-annotate ~20 cases from the stratified sample
  using the LREC 2020 category/relation scheme as guideline (the same
  scheme `docs/data_source.md` already identifies as the intended
  annotation guide). Compute precision/recall of the automatic pipeline's
  output against this pilot set. This pilot set doubles as instructor
  material for Steps 3–5 of the activity plan.
- **LLM-as-judge** (Stage 7) as a continuous, cheap sanity filter across
  the full sample, not just the pilot.
- **Ontology consistency checks.** A triple like `Drug X treats Disease Y`
  should have both endpoints grounded to UMLS CUIs of the expected semantic
  type (Section 3) — flag triples that violate this as a mechanical,
  non-LLM quality signal.

## 7. Mapping back to the pedagogical activity plan

This pipeline is not a replacement for
[Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md](../Activity_Plan_Clinical_Cases_to_Knowledge_Graphs.md)
— it's the "answer key" that motivates and later validates it.

- **New Step 0 (motivation).** Before Step 1, show the finished Neo4j graph
  live (Cypher query demo) or a pyvis rendering of one case's subgraph:
  "this is what we're building toward, by hand, this semester."
- **Steps 3–5 (manual NER/RE/KG) stay manual**, but each can now be
  followed by "compare your group's triples for this case to the automatic
  pipeline's triples for the same case" — using the automatic output as a
  discussion prompt about annotation ambiguity and inter-annotator
  agreement (already listed as a discussion point in Step 5), not as
  ground truth to defer to.
- **Step 7 (transition to statistical/neural NLP)** already gestures at
  "automatic NLP models" — this pipeline gives that step concrete content
  to unpack incrementally across the semester:
  - manual NER (Step 3) → scispaCy + UMLS linking (Stage 2)
  - manual RE (Step 4) → LLM structured extraction (Stage 4)
  - manual KG (Step 5) → the pre-built Neo4j graph (Stage 8)
  - embeddings (Step 6/7) → SapBERT embeddings used for entity resolution
    (Stage 6), reused later for vector-space/IR material

## 8. Implementation footprint (not yet done)

If this gets implemented as an instructor-run notebook (outside Binder, or
in a Binder variant with secrets support for the API key), new dependencies
not currently in `environment.yml` would include: `spacy`, `scispacy` (+ a
scispaCy model download), `negspacy`, `anthropic`, `pydantic`, `networkx`,
`pyvis`, and optionally `neo4j` (driver) and `rdflib`. An `ANTHROPIC_API_KEY`
would be required and should never be committed — pass via environment
variable, matching how `data/` is already gitignored for downloaded
artifacts.
