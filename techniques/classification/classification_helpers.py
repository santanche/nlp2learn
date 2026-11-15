"""Plumbing for title-classification.ipynb: download and clean the Medical
Abstracts corpus (Schopf et al., 2022).

https://github.com/sebischair/Medical-Abstracts-TC-Corpus — CC BY-SA 3.0.
"""
from pathlib import Path
from urllib.request import urlretrieve

import pandas as pd

BASE_URL = "https://raw.githubusercontent.com/sebischair/Medical-Abstracts-TC-Corpus/main/"
FILES = ["medical_tc_train.csv", "medical_tc_test.csv"]

# condition_label of the corpus → short name used in the notebook
LABELS = {1: "neoplasms", 2: "digestive", 3: "nervous", 4: "cardiovascular", 5: "general"}


def download(data_dir="data"):
    """Download the two CSV files once (≈18 MB) into data_dir."""
    data_dir = Path(data_dir)
    data_dir.mkdir(exist_ok=True)
    for name in FILES:
        if not (data_dir / name).exists():
            urlretrieve(BASE_URL + name, data_dir / name)
    return [data_dir / name for name in FILES]


def load_titles(classes=("neoplasms", "digestive", "nervous", "cardiovascular"),
                max_words=30, data_dir="data", verbose=True):
    """Return a DataFrame (title, label) with one row per article.

    Cleaning steps:
    1. pool the official train and test files: an abstract with several
       labels appears once per label, sometimes in both files;
    2. keep abstracts with exactly one label;
    3. keep the requested classes;
    4. the title is the text up to the first '. ' or '? ';
    5. drop titles longer than max_words (titles without final punctuation,
       where the cut falls inside the abstract) and repeated titles.
    """
    rows = pd.concat([pd.read_csv(f) for f in download(data_dir)], ignore_index=True)
    n_labels = rows.groupby("medical_abstract").condition_label.nunique()
    single = rows[rows.medical_abstract.map(n_labels) == 1].drop_duplicates("medical_abstract")

    df = pd.DataFrame({
        "title": single.medical_abstract.str.split(r"(?<=[.?]) ", n=1, regex=True).str[0],
        "label": single.condition_label.map(LABELS),
    })
    df = df[df.label.isin(classes)]
    df = df[df.title.str.split().str.len() <= max_words].drop_duplicates("title")
    df = df.reset_index(drop=True)

    if verbose:
        print(f"{len(rows):,} rows → {len(n_labels):,} distinct abstracts → "
              f"{len(single):,} with a single label → {len(df):,} titles in {len(classes)} classes")
    return df
