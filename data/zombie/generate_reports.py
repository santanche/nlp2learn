"""Generate markdown clinical-report texts from zombie-health.csv.

Each row of the CSV becomes one narrative markdown report under reports/.
Students are meant to reverse-engineer the structured CSV fields back out
of these reports using basic tokenization, normalization, and dictionary
/ regex matching -- so the generated text intentionally varies label
casing and rephrases symptoms/diagnoses through a small fixed synonym
bank, while keeping the same controlled vocabulary and section layout
throughout (the ground truth stays the source CSV, matched by patient
name / case id).

Regenerating is deterministic: each case's random choices are seeded by
its row index, so re-running this script reproduces the same reports.
"""

import csv
import random
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent
CSV_PATH = DATA_DIR / "zombie-health.csv"
REPORTS_DIR = DATA_DIR / "reports"

SYMPTOM_PHRASES = {
    "paralysis": [
        "paralysis",
        "paralyzed limbs",
        "loss of motor control",
    ],
    "yellow tongue": [
        "a yellow tongue",
        "a yellowish tongue",
        "a tongue with a yellow tint",
    ],
    "trembling on the little finger": [
        "trembling on the little finger",
        "a tremor in the little finger",
        "shaking of the pinky finger",
    ],
    "member loss": [
        "loss of a limb",
        "a missing limb",
        "member loss",
    ],
    "chest pain": [
        "chest pain",
        "pain in the chest",
        "thoracic discomfort",
    ],
    "severe anger": [
        "severe anger",
        "intense anger episodes",
        "acute rage attacks",
    ],
}

DIAGNOSIS_PHRASES = {
    "bacterial infection": [
        "bacterial infection",
        "an infection of bacterial origin",
        "a bacterial infectious process",
    ],
    "viral infection": [
        "viral infection",
        "an infection of viral origin",
        "a viral infectious process",
    ],
    "bite deficit": [
        "bite deficit",
        "a bite-related deficit",
        "a deficit caused by a bite",
    ],
    "fights": [
        "injuries from a fight",
        "fight-related trauma",
        "an altercation injury",
    ],
    "nothing": [
        "no significant findings",
        "no diagnosis established",
        "an unremarkable clinical picture",
    ],
}

CONJUNCTIONS = ["and", "as well as", "along with"]

PRESENTATION_TEMPLATES = [
    "{name} presents with {symptoms}.",
    "{name} was admitted reporting {symptoms}.",
    "Upon examination, {name} exhibited {symptoms}.",
]

LAB_PRESENT_TEMPLATES = [
    "Blood analysis identified {pathogen}.",
    "Laboratory tests isolated {pathogen}.",
    "The pathogen {pathogen} was detected in the blood analysis.",
]

LAB_ABSENT_TEMPLATES = [
    "No pathogen was isolated in the blood analysis.",
    "Blood analysis returned no relevant findings.",
    "Laboratory tests did not identify any pathogen.",
]

HISTORY_PRESENT_TEMPLATES = [
    "Prior record indicates {prev}.",
    "Patient history includes {prev}.",
    "Clinical history reveals {prev} in the past.",
]

HISTORY_ABSENT_TEMPLATES = [
    "No prior conditions are on record.",
    "Clinical history is unremarkable.",
    "No previous diagnosis was recorded.",
]

ASSESSMENT_TEMPLATES = [
    "Diagnosis: {diag}.",
    "Clinical impression: {diag}.",
    "The patient was diagnosed with {diag}.",
]

LABEL_CASE_VARIANTS = ["Case ID", "CASE ID", "case id"]
PATIENT_LABEL_VARIANTS = ["Patient", "PATIENT", "patient"]


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def render_symptoms(rng: random.Random, symptoms: list[str]) -> str:
    phrases = [rng.choice(SYMPTOM_PHRASES[s]) for s in symptoms]
    if len(phrases) == 1:
        return phrases[0]
    conj = f" {rng.choice(CONJUNCTIONS)} "
    return conj.join([", ".join(phrases[:-1]), phrases[-1]]) if len(phrases) > 2 else conj.join(phrases)


def render_report(index: int, row: dict) -> str:
    rng = random.Random(index)

    name = row["Name"]
    case_id = f"ZH-{index:03d}"
    symptoms = [row[f"Symptom {i}"] for i in (1, 2, 3) if row[f"Symptom {i}"]]

    presentation = rng.choice(PRESENTATION_TEMPLATES).format(
        name=name, symptoms=render_symptoms(rng, symptoms)
    )

    blood = row["Blood Analysis"]
    if blood:
        lab = rng.choice(LAB_PRESENT_TEMPLATES).format(pathogen=blood)
    else:
        lab = rng.choice(LAB_ABSENT_TEMPLATES)

    prev_diag = row["Previous Diagnosis"]
    if prev_diag:
        prev_phrase = rng.choice(DIAGNOSIS_PHRASES[prev_diag])
        history = rng.choice(HISTORY_PRESENT_TEMPLATES).format(prev=prev_phrase)
    else:
        history = rng.choice(HISTORY_ABSENT_TEMPLATES)

    diag_phrase = rng.choice(DIAGNOSIS_PHRASES[row["Diagnosis"]])
    assessment = rng.choice(ASSESSMENT_TEMPLATES).format(diag=diag_phrase)

    case_label = rng.choice(LABEL_CASE_VARIANTS)
    patient_label = rng.choice(PATIENT_LABEL_VARIANTS)

    return (
        "# Zombie Clinical Report\n\n"
        f"**{case_label}:** {case_id}\n"
        f"**{patient_label}:** {name}\n\n"
        "## Presentation\n"
        f"{presentation}\n\n"
        "## Laboratory Analysis\n"
        f"{lab}\n\n"
        "## Clinical History\n"
        f"{history}\n\n"
        "## Assessment\n"
        f"{assessment}\n"
    )


def main() -> None:
    with open(CSV_PATH, newline="") as f:
        rows = list(csv.DictReader(f))

    REPORTS_DIR.mkdir(exist_ok=True)
    for old_file in REPORTS_DIR.glob("*.md"):
        old_file.unlink()

    for index, row in enumerate(rows, start=1):
        text = render_report(index, row)
        out_path = REPORTS_DIR / f"{slugify(row['Name'])}.md"
        out_path.write_text(text)

    print(f"Generated {len(rows)} reports in {REPORTS_DIR}")


if __name__ == "__main__":
    main()
