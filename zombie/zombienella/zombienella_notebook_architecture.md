# Zombienella importunus: Architecture of the Probabilistic Language-Model and Embedding Notebooks

## 1. Overview

The project is a sequence of experiments built around a small fictional language. The central idea is to keep the observations fixed while changing how information in those observations is represented or modeled.

```text
Probabilistic Grammar
        |
        v
01_generate_observations.ipynb
        |
        | observations.csv
        v
   +----+----------------+------------------+
   |                     |                  |
   v                     v                  v
02_markov_ngrams     03_prefix         04_cooccurrence
                         probabilities      embeddings
   |                     |                  |
   v                     v                  +-- co-occurrence matrices
N-gram probabilities  full-prefix           +-- token vectors
                     probabilities          +-- cosine similarity
                                            +-- PCA visualization
```

The four notebooks have deliberately different responsibilities:

1. Observation generation: knows the grammar and produces data.
2. N-gram modeling: learns fixed-order conditional probabilities from observations.
3. Full-prefix modeling: learns probabilities conditioned on the entire preceding prefix.
4. Co-occurrence/embeddings: represents tokens according to the tokens that occur around them.

The downstream notebooks do not need access to the grammar. This separates the **generative process** from the **statistical models learned from observations**.

---

## 2. Current Grammar

The current grammar is **Zombienella importunus**:

```text
S -> s A | s B | s C.
A -> F | r F | r r F | r r e.
B -> l A.
C -> l l A.
F -> f e | p e.
```

It defines 21 terminal sequences:

```text
1.  s f e
2.  s p e
3.  s r f e
4.  s r p e
5.  s r r f e
6.  s r r p e
7.  s r r e
8.  s l f e
9.  s l p e
10. s l r f e
11. s l r p e
12. s l r r f e
13. s l r r p e
14. s l r r e
15. s l l f e
16. s l l p e
17. s l l r f e
18. s l l r p e
19. s l l r r f e
20. s l l r r p e
21. s l l r r e
```

The grammar and these derivations are documented in the current `README.md`. The grammar is used by the observation generator, but the later notebooks intentionally learn only from `observations.csv`.

---

## 3. Production Probabilities

The current transition/production probabilities are:

```text
S -> s A   1/3
S -> s B   1/3
S -> s C   1/3

A -> F       1/4
A -> r F     1/4
A -> r r F   1/4
A -> r r e   1/4

F -> f e     1/2
F -> p e     1/2

B -> l A     1
C -> l l A   1
```

Each group of alternatives forms a probability distribution. For example:

```text
P(S -> s A) + P(S -> s B) + P(S -> s C) = 1
```

and:

```text
P(A -> F) + P(A -> r F) + P(A -> r r F) + P(A -> r r e) = 1
```

A complete sentence probability is the product of the production probabilities along its derivation. For example:

```text
P(s r r f e)
 = P(S -> s A)
 × P(A -> r r F)
 × P(F -> f e)
 = 1/3 × 1/4 × 1/2
 = 1/24
```

Notebook 01 samples these distributions to generate 850 observations.

---

## 4. Notebook 01 — Observation Generation

### File

```text
01_generate_observations.ipynb
```

This is the **data-generation layer**. It contains the grammar, production probabilities, stochastic grammar sampler, and code that generates the 850 observations.

```text
Grammar
   |
   v
Production probabilities
   |
   v
Random production selection
   |
   v
Terminal sequence
   |
   v
850 observations
   |
   v
observations.csv
```

Its main output is:

```text
observations.csv
```

The observations are random samples, so empirical frequencies approximate the theoretical grammar distribution but are not expected to be identical to it.

---

## 5. Notebook 02 — N-gram Markov Model

### File

```text
02_markov_ngrams.ipynb
```

This notebook learns a fixed-order language model from `observations.csv`.

```python
N = 2
```

gives a bigram model; `N = 3` gives a trigram model; `N = 4` gives a four-gram model.

The architecture is:

```text
observations.csv
       |
       v
Tokenization
       |
       v
<s> ... </s>
       |
       v
N-gram extraction
       |
       v
N-gram counts
       |
       v
History counts
       |
       v
Conditional probabilities
       |
       v
N-gram probability CSV
```

The estimated probability is:

\[
P(w_t\mid h)=\frac{C(h,w_t)}{C(h)}
\]

where `h` contains the previous `N-1` tokens.

The notebook saves, for example:

```text
2-gram-probabilites.csv
3-gram-probabilites.csv
4-gram-probabilites.csv
```

with columns:

```text
history
next_token
ngram_count
history_count
probability
```

The file is a compact representation of a Markov transition system:

```text
history -- probability --> next_token
```

---

## 6. Notebook 03 — Full-Prefix Model

### File

```text
03_prefix_probabilities.ipynb
```

This notebook explores an intentionally impractical model for natural language: the **complete prefix from the beginning of the sentence is the state**.

For:

```text
s r r f e
```

the notebook records:

```text
<s>             -> s
<s> s           -> r
<s> s r         -> r
<s> s r r       -> f
<s> s r r f     -> e
<s> s r r f e   -> </s>
```

The probability is:

\[
P(w\mid h)=\frac{C(h,w)}{C(h)}
\]

and the output is:

```text
prefix-probabilities.csv
```

with:

```text
history
next_token
combination_count
history_count
probability
```

This is feasible here because the fictional language has a very restricted set of possible prefixes. For natural language, the number of possible histories grows combinatorially, producing severe sparsity.

---

## 7. Notebook 04 — Co-occurrence and Embeddings

### File

```text
04_cooccurrence_embeddings.ipynb
```

The fourth notebook changes the question. Instead of asking:

> What token comes next?

it asks:

> Which tokens tend to occur near a given token?

This introduces the distributional intuition behind embeddings.

The notebook reads the same:

```text
observations.csv
```

and does not use the grammar.

### 7.1 Vocabulary

The linguistic tokens are:

```text
s, i, r, l, f, p, e
```

The sentence-boundary markers used by the language-model notebooks are not treated as ordinary linguistic tokens in the co-occurrence representation.

### 7.2 Context windows

Three context windows are computed:

```text
window 2 = 1 previous + 1 next
window 4 = 2 previous + 2 next
window 6 = 3 previous + 3 next
```

For every occurrence of a token, the notebook counts the other tokens occurring inside the selected window.

### 7.3 Co-occurrence matrices

For each window, the notebook creates a matrix:

```text
             s   i   r   l   f   p   e
         +-------------------------------
s        | ...
i        | ...
r        | ...
l        | ...
f        | ...
p        | ...
e        | ...
```

where:

\[
C_{ij} =
\text{number of times token }j
\text{ occurs within the context window of token }i
\]

The matrices are saved as:

```text
2-cooccurrence-matrix.csv
4-cooccurrence-matrix.csv
6-cooccurrence-matrix.csv
```

Each row is a vector representation of one token.

Thus:

```text
token
  |
  v
co-occurrence counts
  |
  v
vector
```

This is an explicit, transparent distributional representation: no neural network is required to create the initial vectors.

### 7.4 Cosine similarity

The notebook computes pairwise cosine similarities between token vectors:

\[
\operatorname{cos}(x,y)=
\frac{x\cdot y}{\|x\|\|y\|}
\]

and saves:

```text
2-cosine-similarities.csv
4-cosine-similarities.csv
6-cosine-similarities.csv
```

This makes it possible to compare the same pair of tokens under different definitions of context.

A high cosine similarity means that two tokens have similar **co-occurrence profiles**. It does not automatically mean that they are synonyms.

### 7.5 Two-dimensional visualization

The original vectors have one coordinate for each vocabulary token. PCA reduces these vectors to two dimensions:

```text
7-dimensional token vectors
          |
          v
         PCA
          |
          v
2-dimensional coordinates
```

The notebook draws each projected token as a vector from the origin:

```text
                    r
                    ●
                   /
                  /
               f ●
                /
        l ●    /
          \   /
           \ /
            +----------------
          origin
```

The same procedure is applied to windows 2, 4, and 6 so that students can see how the representation changes as the context becomes broader.

---

## 8. Why the Co-occurrence Experiment Matters

The embedding notebook makes an important idea explicit:

> A vector representation can be constructed from the distributional behavior of a token.

The pipeline is:

```text
observations
    |
    v
context window
    |
    v
co-occurrence counts
    |
    v
token vectors
    |
    +------> cosine similarity
    |
    +------> PCA visualization
```

The vectors are not initially learned by a neural network. They are direct numerical descriptions of contextual behavior.

This provides a simple bridge toward Word2Vec and other learned embedding methods.

---

## 9. Context Has Different Roles

The N-gram/prefix notebooks and the co-occurrence notebook use context differently.

### Sequence modeling

```text
history
   |
   v
P(next_token | history)
   |
   v
next token
```

The question is:

> What comes next?

### Distributional representation

```text
token
   |
   v
context distribution
   |
   v
vector
```

The question is:

> What tends to occur around this token?

This distinction is central to the progression from language modeling toward embeddings.

---

## 10. Comparison of Representations

```text
Bigram:
    state = last 1 token

Trigram:
    state = last 2 tokens

4-gram:
    state = last 3 tokens

Full prefix:
    state = entire preceding sequence

Co-occurrence:
    representation = context-count vector of a token
```

For example, after generating:

```text
s l r r
```

a trigram model uses:

```text
r r
```

as its state, whereas the full-prefix model uses:

```text
<s> s l r r
```

The co-occurrence model does something different: it represents the tokens themselves by their contextual distributions.

---

## 11. Architectural Separation of Concerns

| Component | Responsibility | Knows grammar? |
|---|---|---:|
| `01_generate_observations.ipynb` | Generate observations | Yes |
| `observations.csv` | Store observations | No |
| `02_markov_ngrams.ipynb` | Learn fixed-order probabilities | No |
| `03_prefix_probabilities.ipynb` | Learn full-prefix probabilities | No |
| `04_cooccurrence_embeddings.ipynb` | Build distributional vectors | No |
| N-gram probability CSVs | Store learned transitions | No |
| `prefix-probabilities.csv` | Store full-prefix transitions | No |
| Co-occurrence matrices | Store token vectors | No |
| Cosine-similarity CSVs | Store vector similarities | No |

The common data contract is:

```text
01_generate_observations.ipynb
              |
              v
       observations.csv
              |
       +------+------+----------------+
       |             |                |
       v             v                v
   N-grams        Prefixes       Co-occurrences
       |             |                |
       v             v                v
 probabilities   probabilities     vectors
                                      |
                                      v
                                similarities
```

This is a simple pipeline architecture. The grammar is isolated in the data-generation layer, while the later notebooks operate on observations.

---

## 12. Reproducibility and Randomness

There are two different stochastic processes.

### Dataset generation

Notebook 01 samples grammar productions:

```text
Grammar probabilities
        |
        v
random production
        |
        v
observation
```

A random seed can make the dataset reproducible.

### Sentence generation

The N-gram and prefix notebooks sample from learned transition probabilities:

```text
learned probabilities
        |
        v
random next-token selection
        |
        v
generated sentence
```

The probability model is deterministic once the observations are fixed; the sampling process is stochastic.

The co-occurrence matrices, cosine similarities, and PCA representations are deterministic once `observations.csv` is fixed.

---

## 13. End-to-End Experimental Loop

```text
                    GENERATIVE PROCESS
                           |
                           v
                 Probabilistic grammar
                           |
                           v
                  850 observations
                           |
                           v
                    observations.csv
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
     Fixed history    Full history     Distributional
       N-grams          Prefix           context
          |                |                |
          v                v                v
      Markov           Prefix          Co-occurrence
   probabilities     probabilities       matrices
                                           |
                                           v
                                         vectors
                                           |
                                  +--------+--------+
                                  |                 |
                                  v                 v
                              cosine            PCA
                            similarity       visualization
```

The project can therefore ask two complementary questions:

1. **How much history is required to predict the next token?**
2. **How can contextual behavior be transformed into a representation of a token?**

---

## 14. Suggested Teaching Progression

### Stage 1 — Grammar
Understand the grammar and enumerate its possible sentences.

### Stage 2 — Probability
Assign probabilities to productions and calculate complete-sentence probabilities.

### Stage 3 — Observations
Generate 850 observations and compare empirical and theoretical distributions.

### Stage 4 — Bigram model
Estimate:

\[
P(w_t\mid w_{t-1})
\]

from observations.

### Stage 5 — Higher-order N-grams
Increase the history:

\[
P(w_t\mid w_{t-2},w_{t-1})
\]

and:

\[
P(w_t\mid w_{t-3},w_{t-2},w_{t-1})
\]

### Stage 6 — Full prefix
Remove the fixed history limit:

\[
P(w_t\mid w_1,\ldots,w_{t-1})
\]

This demonstrates the conceptual ideal of remembering everything.

### Stage 7 — Co-occurrence
Change the question from:

```text
What comes next?
```

to:

```text
What tends to occur around this token?
```

Build context-count matrices using windows 2, 4, and 6.

### Stage 8 — Vector representation
Interpret each row of the co-occurrence matrix as a vector representing a token.

### Stage 9 — Cosine similarity
Compare token vectors and investigate whether tokens with similar contextual behavior have similar representations.

### Stage 10 — PCA visualization
Project the vectors into two dimensions and visualize them geometrically.

### Stage 11 — Neural embeddings
Use the explicit co-occurrence representation as a conceptual bridge toward methods such as Word2Vec:

```text
explicit co-occurrence counts
          |
          v
dense learned representations
```

### Stage 12 — Modern language models

```text
grammar
   |
   v
Markov chains
   |
   v
N-grams
   |
   v
context/history
   |
   v
co-occurrence vectors
   |
   v
embeddings
   |
   v
neural language models
   |
   v
Transformers
```

---

## 15. Main Architectural Insight

The deepest conceptual distinction is not simply bigram versus trigram. It is:

> **What information about language is being represented, and how is that information encoded?**

Sequence models represent context in order to predict:

```text
history -> probability distribution -> next token
```

Distributional representations describe a token through its contextual behavior:

```text
token -> context distribution -> vector
```

The fictional language makes it possible to explore both ideas with a tiny vocabulary and a completely controlled generative process.

The notebooks therefore form both a software pipeline and a conceptual pipeline:

```text
formal grammar
      |
      v
Markov chains
      |
      v
N-gram language models
      |
      v
context/history
      |
      v
co-occurrence representations
      |
      v
vector similarity
      |
      v
embeddings
      |
      v
neural representations
      |
      v
modern language models
```
