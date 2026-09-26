# Zombie Vectors: hand-made feature vectors before embeddings

A step-by-step path toward embeddings. Before learning vectors, we build them **by hand** with simple
algorithms (dictionary lookup and n-grams). To make this possible, we work backward: synthetic
clinical reports are generated from `data/zombie/zombie-health.csv` in a controlled language where
every sentence states that one symptom or disease is **present** or **absent**. Context sentences
reuse words of those expressions in other senses ("the tongue is green", "speaks in a strange
tongue"), so the same word appears in different company.

## Notebooks (run in order)

1. `01_generate_reports.ipynb`: generates the sectioned reports, plus the ground truth and the lexicon.
2. `02_feature_vectors.ipynb`: extracts 1- to 5-grams, computes a 4-position vector for each one, and
   compares the contexts (and neighbors) of the borrowed words.

| Position | Meaning |
|---|---|
| 1 | in the disease dictionary |
| 2 | in the symptom dictionary |
| 3 | negation word |
| 4 | in negation scope (a negation cue appears earlier in the sentence) |

## Generated files

| File | Content |
|---|---|
| `reports/*.md` | one report per patient (sections: Presentation, General Examination, Negative Findings, Laboratory Analysis, Clinical History, Social History, Assessment) |
| `sentences.csv` | `report_id, section, sentence_id, sentence` |
| `annotations.csv` | ground truth: `report_id, sentence_id, surface, canonical, type, polarity` |
| `context_words.csv` | ground truth of context sentences: `report_id, sentence_id, word, context` (`normal finding` or `everyday`) |
| `lexicon.csv` | known expressions: symptoms, diseases, pathogens, negation cues, scope terminators |
| `vectors.csv` | one row per n-gram occurrence with its 4 features |

## Knobs in Notebook 1

* `VARIANTS_PER_PATIENT`: more reports per patient, which gives more text for statistics.
* `N_ABSENT_SYMPTOMS`, `N_RULED_OUT`: how many negative facts each report states.
* `N_NORMAL_FINDINGS`, `N_EVERYDAY`: how many context sentences each report has. A normal finding
  describes a healthy zombie with a borrowed word ("Tongue color: green."), and is only used when the
  patient lacks that term. An everyday sentence uses the word in another sense ("A video of the
  patient dancing went viral."). No context sentence contains a lexicon expression.
* `POST_NEGATION`: hard mode. It adds sentences such as "Signs of paralysis were not observed.", where
  the negation comes *after* the term. Notebook 2's simple rule then fails, and the failures are listed.

## Metaphors used along the way

* **Field guide:** the lexicon tells what kind of creature each expression is (positions 1–3).
* **Where it was spotted:** position 4 depends on context, not on the expression itself.
* **Passport:** averaging all the occurrences of an expression gives one vector per expression.
  The negation feature becomes a *negation rate*. This is the first embedding-like table.
* **Same word, different company:** "tongue" is a symptom (yellow tongue), an absent symptom
  (no yellow tongue), a healthy zombie (green tongue) or a language (a strange tongue). One passport
  mixes all of them; counting its neighbors separates the senses, but not the polarity.
* Next steps: a **triage form** (more checkboxes), **the company it keeps** (co-occurrence), and a
  **city map** (PPMI + SVD down to 2-D dense coordinates).
