# Zombienella importunus: Architecture of the Probabilistic Language-Model and Embedding Notebooks

## 1. Overview

The project is a sequence of experiments built around a small fictional language. The central idea is to keep the observations fixed while changing how information in those observations is represented or modeled.

### 1.1 Directory organization

The notebooks are organized in three numbered stages, each in its own subdirectory. Every notebook writes its outputs into its own directory.

```text
zombienella/
├── README.md                              grammar, derivations, probabilities
├── zombienella_notebook_architecture.md   this document
│
├── 01-observations/
│   ├── 01_generate_observations.ipynb
│   └── observations.csv
│
├── 02-ngrams/
│   ├── 02a_prefix_probabilities.ipynb
│   ├── 02b_markov_ngrams.ipynb
│   ├── probabilities-prefix.csv
│   ├── probabilities-2-gram.csv
│   ├── probabilities-3-gram.csv
│   ├── probabilities-4-gram.csv
│   ├── zombiegpt.html                     interactive sentence generator
│   ├── zombie-head-1.svg                  images used by zombiegpt.html
│   ├── zombie-head-2.svg
│   └── zombienella-importunus.svg
│
└── 03-embeddings/
    ├── 03a_cooccurrence_embeddings.ipynb
    ├── 03b_word2vec_embeddings.ipynb
    ├── cooccurrence-{2,4,6}-matrix.csv
    ├── cooccurrence-{2,4,6}-cosine-similarities.csv
    ├── embeddings-{2,4}-gram-{2,3}d-matrix.csv
    └── embeddings-{2,4}-gram-{2,3}d-cosine-similarity.csv
```

The downstream notebooks in `02-ngrams/` and `03-embeddings/` all read the shared dataset through the relative path:

```text
../01-observations/observations.csv
```

so the notebooks must be executed from their own directories, and the directory structure must be preserved.

### 1.2 Pipeline

```text
Probabilistic Grammar
        |
        v
01-observations/01_generate_observations.ipynb
        |
        | observations.csv
        v
   +----+-------------+----------------+-------------------+
   |                  |                |                   |
   v                  v                v                   v
02a_prefix       02b_markov      03a_cooccurrence     03b_word2vec
probabilities    ngrams          embeddings           embeddings
   |                  |                |                   |
   v                  v                +-- matrices        +-- learned vectors
full-prefix      N-gram                +-- cosine sim.     +-- cosine sim.
probabilities    probabilities         +-- PCA plots       +-- 2D/3D plots
   |                  |
   +--------+---------+
            |
            v
     zombiegpt.html
```

The five notebooks have deliberately different responsibilities:

1. `01` Observation generation: knows the grammar and produces data.
2. `02a` Full-prefix modeling: learns probabilities conditioned on the entire preceding prefix.
3. `02b` N-gram modeling: learns fixed-order conditional probabilities from observations.
4. `03a` Co-occurrence embeddings: represents tokens by explicit counts of the tokens that occur around them.
5. `03b` Word2Vec-style embeddings: learns dense token vectors from target/context pairs.

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

Notebook `01` samples these distributions to generate 850 observations.

---

## 4. Notebook 01 — Observation Generation

### File

```text
01-observations/01_generate_observations.ipynb
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

Its main output, written next to the notebook, is:

```text
01-observations/observations.csv
```

with columns `id` and `sentence`.

The observations are random samples, so empirical frequencies approximate the theoretical grammar distribution but are not expected to be identical to it.

---

## 5. Notebook 02a — Full-Prefix Model

### File

```text
02-ngrams/02a_prefix_probabilities.ipynb
```

This notebook reads `../01-observations/observations.csv` and explores an intentionally impractical model for natural language: the **complete prefix from the beginning of the sentence is the state**.

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
02-ngrams/probabilities-prefix.csv
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

The notebook ends with a comparison against the N-gram approach of Notebook `02b`, which bounds the history to a fixed number of previous tokens.

---

## 6. Notebook 02b — N-gram Markov Model

### File

```text
02-ngrams/02b_markov_ngrams.ipynb
```

This notebook learns a fixed-order language model from `../01-observations/observations.csv`.

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

The output file name reflects the configured value of `N`; running the notebook with `N = 2, 3, 4` produces:

```text
02-ngrams/probabilities-2-gram.csv
02-ngrams/probabilities-3-gram.csv
02-ngrams/probabilities-4-gram.csv
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

### 6.1 ZombieGPT viewer

`02-ngrams/zombiegpt.html` is a standalone chat-like page that loads one of the probability files produced by `02a` and `02b` and generates sentences by sampling from them:

```text
probabilities-2-gram.csv  --+
probabilities-3-gram.csv  --+
probabilities-4-gram.csv  --+--> zombiegpt.html --> generated sentence
probabilities-prefix.csv  --+
```

It fetches the CSVs and the SVG images by relative path, so it must be served from the `02-ngrams/` directory (for example, `python -m http.server` run inside that directory).

---

## 7. Notebook 03a — Co-occurrence Embeddings

### File

```text
03-embeddings/03a_cooccurrence_embeddings.ipynb
```

This notebook changes the question. Instead of asking:

> What token comes next?

it asks:

> Which tokens tend to occur near a given token?

This introduces the distributional intuition behind embeddings.

The notebook reads the same:

```text
../01-observations/observations.csv
```

and does not use the grammar.

### 7.1 Vocabulary

The vocabulary is built from the observations, and the linguistic tokens are:

```text
e, f, l, p, r, s
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
             e   f   l   p   r   s
         +---------------------------
e        | ...
f        | ...
l        | ...
p        | ...
r        | ...
s        | ...
```

where:

\[
C_{ij} =
\text{number of times token }j
\text{ occurs within the context window of token }i
\]

The matrices are saved as:

```text
03-embeddings/cooccurrence-2-matrix.csv
03-embeddings/cooccurrence-4-matrix.csv
03-embeddings/cooccurrence-6-matrix.csv
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
03-embeddings/cooccurrence-2-cosine-similarities.csv
03-embeddings/cooccurrence-4-cosine-similarities.csv
03-embeddings/cooccurrence-6-cosine-similarities.csv
```

with columns `token_1`, `token_2`, `cosine_similarity`.

This makes it possible to compare the same pair of tokens under different definitions of context.

A high cosine similarity means that two tokens have similar **co-occurrence profiles**. It does not automatically mean that they are synonyms.

### 7.5 Two-dimensional visualization

The original vectors have one coordinate for each vocabulary token. PCA reduces these vectors to two dimensions:

```text
6-dimensional token vectors
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

## 8. Notebook 03b — Word2Vec-style Embeddings

### File

```text
03-embeddings/03b_word2vec_embeddings.ipynb
```

This notebook reads `../01-observations/observations.csv` and **learns** dense token vectors instead of counting them. It is a pedagogical implementation written directly in NumPy, without a Word2Vec library, so the vectors and the objective remain visible.

### 8.1 Target/context pairs

As in `03a`, a symmetric window defines the context of each token:

```text
window 2 = 1 previous + 1 next
window 4 = 2 previous + 2 next
```

Every observed `(target, context)` occurrence is a positive example. For each positive, 3 negative contexts are drawn from the noise distribution \(P_n(c)\propto\text{count}(c)^{3/4}\), with fresh negatives at every epoch.

As in the original Word2Vec, negatives are not filtered against the observed pairs. In a six-token language almost every pair is observed (with window 2, `r` co-occurs with every token, itself included), so requiring never-observed negatives leaves some targets with no possible negative.

### 8.2 Logistic objective with negative sampling

Each token has a target vector \(v_w\) and a context vector \(u_c\), as in skip-gram. The probability that a pair is observed is:

\[
P(y=1\mid w,c)=\sigma(v_w\cdot u_c)
\]

The binary cross-entropy is minimized with mini-batch stochastic gradient descent (800 epochs, batch size 64, learning rate 0.05, seed 42), with each batch updated in vectorized NumPy. As in classic Word2Vec, the target vectors (matrix \(W\)) are the resulting embeddings; the context vectors (matrix \(U\)) are also kept, for visualization.

```text
observations
    |
    v
positive pairs (y=1) + negative pairs (y=0)
    |
    v
logistic regression on v_w · u_c
    |
    v
learned target vectors = embeddings
```

### 8.3 Configurations and outputs

Four models are trained:

```text
window 2 × dimension 2
window 2 × dimension 3
window 4 × dimension 2
window 4 × dimension 3
```

The 2-dimensional embeddings are plotted directly, and the 3-dimensional ones in a 3D plot, each token drawn as a line from the origin. Each chart has three panels: the target matrix \(W\), the context matrix \(U\), and their sum \(W+U\) (the GloVe choice; concatenating \([W;U]\) would double the dimension and could not be plotted directly). No PCA is needed because the vectors are already low-dimensional.

For each configuration, the notebook saves the embedding matrix and its cosine-similarity matrix:

```text
03-embeddings/embeddings-{window}-gram-{dim}d-matrix.csv
03-embeddings/embeddings-{window}-gram-{dim}d-cosine-similarity.csv
```

for example `embeddings-2-gram-3d-matrix.csv`.

Comparing `03a` and `03b` contrasts two routes to the same idea:

```text
03a: context counts  --> sparse explicit vectors (one coordinate per token)
03b: context pairs   --> dense learned vectors (chosen dimension)
```

---

## 9. Why the Co-occurrence Experiment Matters

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

This provides a simple bridge toward Word2Vec and other learned embedding methods, which Notebook `03b` takes by learning dense vectors from the same kind of context.

---

## 10. Context Has Different Roles

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

## 11. Comparison of Representations

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

Word2Vec-style:
    representation = learned dense vector of a token
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

## 12. Architectural Separation of Concerns

| Component | Responsibility | Knows grammar? |
|---|---|---:|
| `01-observations/01_generate_observations.ipynb` | Generate observations | Yes |
| `01-observations/observations.csv` | Store observations | No |
| `02-ngrams/02a_prefix_probabilities.ipynb` | Learn full-prefix probabilities | No |
| `02-ngrams/02b_markov_ngrams.ipynb` | Learn fixed-order probabilities | No |
| `02-ngrams/zombiegpt.html` | Generate sentences from learned probabilities | No |
| `03-embeddings/03a_cooccurrence_embeddings.ipynb` | Build explicit distributional vectors | No |
| `03-embeddings/03b_word2vec_embeddings.ipynb` | Learn dense embeddings | No |
| `02-ngrams/probabilities-prefix.csv` | Store full-prefix transitions | No |
| `02-ngrams/probabilities-N-gram.csv` | Store learned transitions | No |
| `03-embeddings/cooccurrence-*-matrix.csv` | Store count-based token vectors | No |
| `03-embeddings/embeddings-*-matrix.csv` | Store learned token vectors | No |
| Cosine-similarity CSVs | Store vector similarities | No |

The common data contract is:

```text
          01-observations/01_generate_observations.ipynb
                              |
                              v
                 01-observations/observations.csv
                              |
       +--------------+-------+-------+----------------+
       |              |               |                |
       v              v               v                v
  02a Prefixes    02b N-grams   03a Co-occurrence  03b Word2Vec
       |              |               |                |
       v              v               v                v
 probabilities   probabilities     vectors          vectors
       |              |               |                |
       +------+-------+               v                v
              |                 similarities     similarities
              v
       zombiegpt.html
```

This is a simple pipeline architecture. The grammar is isolated in the data-generation layer, while the later notebooks operate on observations.

---

## 13. Reproducibility and Randomness

There are two different stochastic processes.

### Dataset generation

Notebook `01` samples grammar productions:

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

The prefix and N-gram notebooks (`02a`, `02b`) and `zombiegpt.html` sample from learned transition probabilities:

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

The co-occurrence matrices, cosine similarities, and PCA representations (`03a`) are deterministic once `observations.csv` is fixed.

### Embedding training

Notebook `03b` initializes vectors randomly, samples negative pairs, and shuffles training examples. A fixed random seed (`RANDOM_SEED = 42`) makes the learned embeddings reproducible.

---

## 14. End-to-End Experimental Loop

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
          +----------------+----------------+-----------------+
          |                |                |                 |
          v                v                v                 v
     Full history    Fixed history    Distributional    Distributional
        Prefix          N-grams          context           context
        (02a)           (02b)            (03a)             (03b)
          |                |                |                 |
          v                v                v                 v
       Prefix           Markov        Co-occurrence     Logistic training
   probabilities    probabilities       matrices        (negative sampling)
          |                |                |                 |
          +-------+--------+                v                 v
                  |                   sparse vectors     dense vectors
                  v                         |                 |
           zombiegpt.html                   v                 v
                                    cosine similarity  cosine similarity
                                    PCA visualization  2D/3D visualization
```

The project can therefore ask two complementary questions:

1. **How much history is required to predict the next token?**
2. **How can contextual behavior be transformed into a representation of a token?**

---

## 15. Suggested Teaching Progression

### Stage 1 — Grammar
Understand the grammar and enumerate its possible sentences.

### Stage 2 — Probability
Assign probabilities to productions and calculate complete-sentence probabilities.

### Stage 3 — Observations (`01`)
Generate 850 observations and compare empirical and theoretical distributions.

### Stage 4 — Bigram model (`02b`, `N = 2`)
Estimate:

\[
P(w_t\mid w_{t-1})
\]

from observations.

### Stage 5 — Higher-order N-grams (`02b`, `N = 3, 4`)
Increase the history:

\[
P(w_t\mid w_{t-2},w_{t-1})
\]

and:

\[
P(w_t\mid w_{t-3},w_{t-2},w_{t-1})
\]

### Stage 6 — Full prefix (`02a`)
Remove the fixed history limit:

\[
P(w_t\mid w_1,\ldots,w_{t-1})
\]

This demonstrates the conceptual ideal of remembering everything.

In the directory organization, the full-prefix notebook comes first (`02a`) because it is the simplest model to state; in this progression it is presented as the limit of increasing `N`. Either order works. `zombiegpt.html` can be used to compare sentences generated by all of these models.

### Stage 7 — Co-occurrence (`03a`)
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

### Stage 11 — Learned embeddings (`03b`)
Use the explicit co-occurrence representation as a conceptual bridge toward methods such as Word2Vec, then train Word2Vec-style embeddings with negative sampling:

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

## 16. Main Architectural Insight

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
