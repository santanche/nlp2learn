# Activity Plan: From Clinical Case Reports to Knowledge Graphs

## Overview

This activity introduces Natural Language Processing (NLP) through a
progressive transformation of unstructured biomedical text into
structured knowledge. It is inspired by the corpus presented in **"Named
Entities in Medical Case Reports: Corpus and Experiments"** and assumes
that the course uses the `cases.parquet` dataset derived from medical
case reports.

Rather than starting with machine learning models, students first learn
how information can be progressively structured:

    Clinical Case Report
            ↓
    Corpus Exploration
            ↓
    Tokenization
            ↓
    Normalization
            ↓
    Named Entity Recognition (manual)
            ↓
    Relation Extraction (manual)
            ↓
    Knowledge Graph
            ↓
    Vector Representations (BoW / TF-IDF / Embeddings)
            ↓
    Automatic NLP Models

## Learning Objectives

-   Explore a real biomedical corpus.
-   Understand how NLP begins with corpus analysis.
-   Transform unstructured text into structured information.
-   Identify biomedical entities and semantic relations.
-   Build a simple knowledge graph.
-   Compare graph-based and vector-based representations.
-   Appreciate the role of annotated corpora.

## Step 1 -- Exploring the Corpus with DuckDB

``` python
import duckdb

cases = duckdb.sql("""
SELECT *
FROM 'cases.parquet'
""").df()
```

Suggested exploratory queries:

``` sql
SELECT COUNT(*) FROM 'cases.parquet';
```

``` sql
DESCRIBE SELECT * FROM 'cases.parquet';
```

``` sql
SELECT *
FROM 'cases.parquet'
USING SAMPLE 5 ROWS;
```

Students should inspect:

-   number of reports
-   available columns
-   text length distribution
-   medical specialties (if available)
-   publication years (if available)

## Step 2 -- Selecting a Case

Assign each group one short clinical case (approximately 100--150
words).

The objective is not to solve the medical problem but to understand how
information can be represented computationally.

## Step 3 -- Manual Named Entity Recognition

Students annotate entities such as:

  Category          Examples
  ----------------- ---------------
  Symptom           fever
  Disease           pneumonia
  Drug              azithromycin
  Laboratory Test   blood glucose
  Anatomy           lung
  Procedure         CT scan

## Step 4 -- Manual Relation Extraction

Students identify semantic relations.

Example triples:

  Subject        Relation      Object
  -------------- ------------- ----------------------
  Patient        has_symptom   fever
  CT scan        reveals       pulmonary infiltrate
  Azithromycin   treats        pneumonia

## Step 5 -- Building a Knowledge Graph

Convert triples into a graph and compare graphs produced by different
groups.

Discuss:

-   annotation ambiguity
-   annotation guidelines
-   inter-annotator agreement
-   gold-standard corpora

## Step 6 -- Multiple Representations

Using the same clinical case, construct:

1.  Tokens
2.  Normalized tokens
3.  Bag of Words
4.  TF-IDF
5.  Knowledge Graph

Discuss which information is preserved or lost in each representation.

## Step 7 -- Transition to Statistical and Neural NLP

Reuse the same corpus throughout the semester for:

-   vector space models
-   information retrieval
-   language models
-   embeddings
-   transformers
-   biomedical language models
-   retrieval-augmented generation (RAG)

## Pedagogical Rationale

The same biomedical corpus supports the entire course. Students
progressively move from raw text to structured knowledge and finally to
statistical and neural representations. This continuity reinforces that
different NLP techniques operate on different representations of the
same underlying information.
