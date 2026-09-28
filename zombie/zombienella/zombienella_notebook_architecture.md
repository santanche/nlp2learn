# ZombieGPT: Architecture of the Probabilistic Language-Model Notebooks

## 1. Overview

The project is organized as a sequence of increasingly sophisticated
language-modeling experiments built around a small fictional language.

The central idea is to keep the **observations fixed** while changing
the **model used to estimate the probability of the next token**.

``` text
Probabilistic Grammar
        |
        v
01_generate_observations.ipynb
        |
        | observations.csv
        v
   +----+-------------------+
   |                        |
   v                        v
02_markov_ngrams.ipynb   03_prefix_probabilities.ipynb
   |                        |
   | probabilities-        | prefix-probabilities.csv
   | N-gram.csv             |
   |                        |
   +-----------+------------+
               v
          ZombieGPT.html
               |
               v
       Step-by-step
       sentence generation
```

The three notebooks have deliberately different responsibilities:

1.  **Observation generation**: knows the grammar and produces data.
2.  **N-gram modeling**: does not need to know the grammar; it learns
    local conditional probabilities from observations.
3.  **Full-prefix modeling**: also does not need to know the grammar; it
    learns probabilities conditioned on the entire preceding prefix.

The web application consumes the probability files and provides an
interactive visualization of generation.

------------------------------------------------------------------------

## 2. The Grammar Layer

The current fictional grammar is:

``` text
S -> s A | s B | s C

A -> F | r F | r r F | r r e
B -> l A
C -> l l A

F -> f e | p e
```

This grammar defines a finite language of 21 possible terminal
sequences.

The grammar is used only by the **observation generator**.

The downstream notebooks intentionally do not import or depend on the
grammar. This separation allows an important experiment:

> Can a language model reconstruct useful transition probabilities from
> observations without having access to the grammar that generated them?

This is analogous to the distinction between a **generative process**
and a **learned statistical model**.

------------------------------------------------------------------------

# 3. Notebook 01 --- Observation Generation

## File

``` text
01_generate_observations.ipynb
```

## Responsibility

The first notebook is the **data-generation layer**.

It contains:

-   the grammar;
-   the production probabilities;
-   the stochastic grammar sampler;
-   the number of observations to generate;
-   the code that writes `observations.csv`.

Its architecture is:

``` text
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

## Input

There is no external input dataset. The notebook internally defines the
grammar and production probabilities.

## Output

The main artifact is:

``` text
observations.csv
```

with one generated sentence per observation.

## Architectural role

This notebook is a **producer**.

It should not contain code for:

-   N-gram estimation;
-   prefix probability estimation;
-   sentence generation from learned probabilities;
-   web-interface behavior.

Keeping these concerns separate makes the experiment easier to
understand and modify.

------------------------------------------------------------------------

# 4. Notebook 02 --- N-gram Markov Model

## File

``` text
02_markov_ngrams.ipynb
```

## Responsibility

The second notebook transforms the observation dataset into a
fixed-order statistical language model.

The configurable parameter is:

``` python
N = 2
```

Possible configurations include:

``` text
N = 2  -> bigram model
N = 3  -> trigram model
N = 4  -> four-gram model
```

The architecture is:

``` text
observations.csv
       |
       v
Tokenization
       |
       v
Sentence boundary markers
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
probabilities-N-gram.csv
```

## 4.1 Sentence boundaries

The notebook introduces `<s>` and `</s>` so the model can learn both the
beginning and end of a sentence.

For example:

``` text
<s> s r r f e </s>
```

produces bigrams:

``` text
<s> s
s r
r r
r f
f e
e </s>
```

## 4.2 N-gram representation

For a configurable `N`, an N-gram contains `N` consecutive tokens.

For example, with `N = 3`:

``` text
<s> s r
s r r
r r f
r f e
f e </s>
```

The model state is the first `N-1` tokens of the N-gram.

Thus:

``` text
s r r
```

represents:

``` text
history = s r
next_token = r
```

## 4.3 Probability estimation

The conditional probability is estimated as:

\[ P(w_t `\mid `{=tex}h) = rac{C(h,w_t)}{C(h)} \]

where `h` is the N-gram history.

For a bigram model:

\[ P(w_t`\mid `{=tex}w\_{t-1}) = rac{C(w\_{t-1},w_t)} {C(w\_{t-1})} \]

## 4.4 Output

The notebook saves:

``` text
probabilities-2-gram.csv
probabilities-3-gram.csv
probabilities-4-gram.csv
```

depending on `N`.

The schema is:

``` text
history
next_token
ngram_count
history_count
probability
```

This file is a compact representation of a Markov transition system:

``` text
history -- probability --> next_token
```

------------------------------------------------------------------------

# 5. Notebook 03 --- Full-Prefix Model

## File

``` text
03_prefix_probabilities.ipynb
```

## Responsibility

The third notebook explores an intentionally impractical model for
natural language:

> The complete prefix from the beginning of the sentence is used as the
> state.

Instead of restricting the history to `N-1` tokens, the history grows
throughout generation.

The architecture is:

``` text
observations.csv
       |
       v
Tokenization
       |
       v
<s> + complete sentence + </s>
       |
       v
Extract every prefix
       |
       v
Count prefix -> next-token pairs
       |
       v
Prefix counts
       |
       v
Conditional probabilities
       |
       v
prefix-probabilities.csv
```

## 5.1 Example

Consider:

``` text
s r r f e
```

After adding boundary markers:

``` text
<s> s r r f e </s>
```

the notebook records:

``` text
<s>             -> s
<s> s           -> r
<s> s r         -> r
<s> s r r       -> f
<s> s r r f     -> e
<s> s r r f e   -> </s>
```

Unlike an N-gram model, the histories have different lengths.

## 5.2 Probability estimation

For every complete history `h`:

\[ P(w`\mid `{=tex}h) = rac{C(h,w)}{C(h)} \]

The output contains:

``` text
history
next_token
combination_count
history_count
probability
```

## 5.3 Output

``` text
prefix-probabilities.csv
```

The name is intentionally different from the N-gram files because there
is no fixed `N`.

------------------------------------------------------------------------

# 6. Comparison of the Two Model Architectures

The most important conceptual difference is the definition of the
**state**.

## N-gram model

``` text
state = last N-1 tokens
```

For example, with a trigram model, after generating:

``` text
s l r r
```

the state is:

``` text
r r
```

## Full-prefix model

``` text
state = entire prefix
```

After generating the same sequence, the state is:

``` text
<s> s l r r
```

The progression is therefore:

``` text
Bigram:
    state = 1 token

Trigram:
    state = 2 tokens

4-gram:
    state = 3 tokens

Full prefix:
    state = all preceding tokens
```

This hierarchy is the central pedagogical idea of the project.

------------------------------------------------------------------------

# 7. Why the Full-Prefix Model Is Normally Impractical

For the fictional language, the number of possible prefixes is very
small.

Natural language is completely different.

If the vocabulary contains `V` tokens, the number of possible sequences
of length `k` is approximately:

\[ V\^k \]

Therefore, as the prefix grows, the number of possible histories grows
combinatorially.

A full-prefix model would need to distinguish potentially enormous
numbers of histories, and most would have very few observations or none
at all.

This is the **sparsity problem**.

N-gram models address this partially by deliberately limiting the amount
of history.

Modern neural language models take a different approach: instead of
storing every possible history explicitly, they learn a representation
of context.

------------------------------------------------------------------------

# 8. Common Data Contract

An important architectural decision is that the notebooks communicate
through files rather than through Python imports.

The central data contract is:

``` text
observations.csv
```

Therefore:

``` text
01_generate_observations.ipynb
```

can be changed without requiring changes to the statistical-model
notebooks, as long as the observation format remains compatible.

Likewise, the probability notebooks produce standardized CSV files that
can be consumed independently by the web application.

This is a simple form of **pipeline architecture**.

------------------------------------------------------------------------

# 9. ZombieGPT Web Application

## File

``` text
ZombieGPT.html
```

The web application is intentionally independent of the notebooks.

Its architecture is:

``` text
                  +-----------------------+
                  |      ZombieGPT UI     |
                  +-----------+-----------+
                              |
                    select probability file
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
       2-gram CSV       3-gram CSV       4-gram CSV
              |               |               |
              +---------------+---------------+
                              |
                              v
                    prefix-probabilities.csv
                              |
                              v
                     transition table
                              |
                              v
                     random sampling
                              |
                              v
                    token-by-token output
```

The application is a **consumer** of the learned models.

------------------------------------------------------------------------

# 10. ZombieGPT State Representation

The application interprets the selected model differently.

``` text
2-gram:
    history = last 1 token

3-gram:
    history = last 2 tokens

4-gram:
    history = last 3 tokens

Prefix model:
    history = entire generated prefix
```

For example, after generating:

``` text
s l r r
```

the models see:

``` text
2-gram:
    r

3-gram:
    r r

4-gram:
    l r r

prefix:
    <s> s l r r
```

This provides a direct visualization of different definitions of
"memory" in a language model.

------------------------------------------------------------------------

# 11. Stochastic Generation

ZombieGPT does not simply select the most probable token.

Instead, it samples from the transition distribution.

If:

``` text
history = s
```

and:

``` text
f -> 0.50
p -> 0.50
```

then the application samples:

\[ w `\sim `{=tex}P(w`\mid `{=tex}s) \]

Consequently, repeated executions can produce different sentences even
with the same model.

The probability model is deterministic; the **sampling process is
stochastic**.

------------------------------------------------------------------------

# 12. Why the Pause in ZombieGPT Matters

The delay before each generated token exposes the generation process:

``` text
history
   |
   v
probability distribution
   |
   v
sample next token
   |
   v
append token
   |
   v
new history
   |
   +---- repeat
```

Instead of seeing only:

``` text
s l r r p e
```

the student sees:

``` text
s
s l
s l r
s l r r
s l r r p
s l r r p e
```

This makes the **autoregressive nature** of language generation
explicit.

------------------------------------------------------------------------

# 13. Architectural Separation of Concerns

  -------------------------------------------------------------------------------------
  Component                          Responsibility                  Knows the grammar?
  ---------------------------------- --------------------- ----------------------------
  `01_generate_observations.ipynb`   Generate observations                          Yes

  `observations.csv`                 Store observations                              No

  `02_markov_ngrams.ipynb`           Learn fixed-order                               No
                                     probabilities         

  `03_prefix_probabilities.ipynb`    Learn full-prefix                               No
                                     probabilities         

  Probability CSVs                   Store learned                                   No
                                     transitions           

  `ZombieGPT.html`                   Interactive                                     No
                                     generation            
  -------------------------------------------------------------------------------------

This separation demonstrates that a model can be trained from
observations without having access to the underlying generative grammar.

------------------------------------------------------------------------

# 14. Reproducibility and Randomness

There are two distinct stochastic processes.

## Dataset generation

Notebook 01 samples grammar productions:

``` text
Grammar probabilities
        |
        v
random production
        |
        v
observation
```

A random seed can make the dataset reproducible.

## Sentence generation

Notebooks 02 and 03, and ZombieGPT, sample from learned transition
probabilities:

``` text
learned probabilities
        |
        v
random next-token selection
        |
        v
generated sentence
```

These are conceptually different uses of randomness.

------------------------------------------------------------------------

# 15. End-to-End Experimental Loop

The complete experiment is:

``` text
             GENERATIVE PROCESS
                    |
                    v
          Probabilistic grammar
                    |
                    v
          850 sampled sentences
                    |
                    v
             observations.csv
                    |
          +---------+---------+
          |                   |
          v                   v
     Fixed history       Full history
       N-grams             Prefix model
          |                   |
          v                   v
   Markov probabilities   Prefix probabilities
          |                   |
          +---------+---------+
                    |
                    v
                ZombieGPT
                    |
                    v
             sampled output
```

The key experimental question is:

> **How does the amount of history retained by the model affect its
> ability to reproduce the structure of the original language?**

That question connects grammar, Markov chains, N-grams, statistical
language models, and eventually neural language models.

------------------------------------------------------------------------

# 16. Suggested Teaching Progression

### Stage 1 --- Grammar

Students understand:

``` text
S -> s A | s B | s C
```

and enumerate possible sentences.

### Stage 2 --- Probability

Students assign probabilities to productions and calculate the
probability of a complete sentence.

### Stage 3 --- Observations

The grammar generates 850 observations.

Students see that empirical frequencies approximate theoretical
probabilities.

### Stage 4 --- Bigram model

The grammar is hidden.

Students estimate:

\[ P(w_t`\mid `{=tex}w\_{t-1}) \]

from observations.

### Stage 5 --- Higher-order N-grams

Students increase the history:

\[ P(w_t`\mid `{=tex}w\_{t-2},w\_{t-1}) \]

and then:

\[ P(w_t`\mid `{=tex}w\_{t-3},w\_{t-2},w\_{t-1}) \]

### Stage 6 --- Full prefix

Students remove the fixed history limit:

\[ P(w_t`\mid `{=tex}w_1,`\ldots`{=tex},w\_{t-1}) \]

This demonstrates the conceptual ideal of remembering everything.

### Stage 7 --- ZombieGPT

The mathematical model becomes interactive.

Students can see the state, probability distribution, sampling, and
generated sequence unfold in real time.

------------------------------------------------------------------------

# 17. Main Architectural Insight

The most important conceptual distinction is not really "bigram versus
trigram".

It is:

> **How much context is represented in the state?**

The progression is:

``` text
                    AMOUNT OF HISTORY

        small                              large
          |                                  |
          v                                  v

      Bigram -> Trigram -> 4-gram -> Full prefix
          |                                  |
          +---------- Markov state ----------+
```

The fictional language makes it possible to experiment with this
progression without the computational complexity of real natural
language.

The notebooks therefore form both a software pipeline and a **conceptual
pipeline for teaching the evolution of language modeling**:

``` text
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
neural representations
      |
      v
modern language models
```
