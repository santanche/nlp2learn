# Teaching Self-Attention with a Small Symbolic System

## Purpose

Develop a practical, inspectable introduction to encoder networks and
the attention mechanism without starting with the scale and ambiguity of
natural language or the complexity of BERT.

The recommended approach is to begin with a tiny symbolic sequence
system, train a single-head self-attention model on a controlled
context-dependent task, and then progressively move toward biologically
inspired sequences.

## Conclusions

-   Natural language is too large and variable for a first hands-on
    attention implementation.
-   A restricted symbolic domain makes the training examples,
    vocabulary, labels, and learned attention patterns easier to
    inspect.
-   A synthetic genetic-code-inspired sequence is a motivating bridge to
    biology, but the first experiment should be deliberately artificial
    rather than presented as a faithful model of translation.
-   The core teaching objective is to show that a token's representation
    can incorporate information from other tokens in its sequence.
-   Begin with one self-attention head and one layer. Add Transformer
    components only after students understand the attention calculation
    and its learned behavior.

## Rationale

A good introductory task should have:

1.  **A small vocabulary:** every token can be inspected and understood.
2.  **Controlled context variation:** keep a token fixed while changing
    its surrounding symbols.
3.  **A known target:** make it clear what the model is expected to
    learn.
4.  **A simple dataset generator:** produce training and test examples
    from explicit rules.
5.  **Visible intermediate values:** expose embeddings, queries, keys,
    values, attention scores, attention weights, and contextualized
    representations.
6.  **A task where context matters:** the label should not be
    recoverable from the target token alone.

This allows students to distinguish token identity from contextual
representation and to examine whether training changes attention in ways
that support the task.

## Recommended starting domain: a tiny symbolic code

Use six symbols:

  Symbol   Role
  -------- ---------------------------------
  `S`      Sequence start
  `A`      Symbol A
  `B`      Symbol B
  `C`      Symbol C
  `X`      Context-sensitive target symbol
  `E`      Sequence end

Example sequences:

``` text
S A X B E
S A X C E
S B X A E
S B X C E
```

Define a binary label based on the token immediately preceding `X`:

  Context around `X`     Label
  -------------------- -------
  `A X B`                    0
  `A X C`                    0
  `B X A`                    1
  `B X C`                    1

The classification target is associated with the context of `X`, not
with the identity of `X` itself. For a stronger demonstration, expand
the grammar to generate many combinations and ensure the train/test
split tests generalization to combinations not seen during training.

### Important design note

In this minimal example, the preceding token alone determines the label.
That makes it a useful first task, but it does not guarantee that
attention is the only or uniquely learned solution: a model may solve it
through other learned features or positional information. To make
attention behavior more diagnostic, use a follow-up task where the
relevant cue is farther away, distractor symbols are inserted, or the
cue's position varies.

## Model and training plan

Start with a small encoder:

  Component                         Suggested value
  ------------------------------- -----------------
  Vocabulary                              6 symbols
  Embedding dimension                             4
  Attention heads                                 1
  Encoder layers                                  1
  Feed-forward hidden dimension                   8
  Output classes                                  2

The initial notebook can implement scaled dot-product self-attention
explicitly:

\[ Q=XW_Q,`\quad `{=tex}K=XW_K,`\quad `{=tex}V=XW_V \]

\[
A=`\operatorname{softmax}`{=tex}`\left`{=tex}(`\frac{QK^\top}{\sqrt{d_k}}`{=tex}`\right`{=tex})
\]

\[ H=AV \]

Use the contextualized representation at the `X` position (or a
designated sequence position) for classification.

### Suggested notebook stages

1.  Generate a synthetic dataset from explicit sequence rules.
2.  Encode symbols as token IDs and initialize embeddings.
3.  Compute Q, K, V, attention scores, attention weights, and outputs
    without training.
4.  Add a classification head and train with cross-entropy and
    backpropagation.
5.  Visualize attention matrices before and after training.
6.  Compare the contextualized representation of `X` across different
    contexts.
7.  Introduce distractors or variable cue positions to test whether the
    model uses context robustly.
8.  Extend the model with residual connections, layer normalization, and
    a feed-forward block to form a tiny Transformer encoder.

PyTorch is recommended for training and automatic differentiation, while
the attention calculation itself can be written out explicitly for
pedagogical transparency. A NumPy-only version is also possible for a
fully manual exercise.

## Biological progression

Once the symbolic task is understood, replace the artificial symbols
with a simplified codon-inspired alphabet and sequence patterns
containing start, coding, and stop markers. Keep the biological claims
modest: the initial system is a teaching abstraction, not a realistic
translation model.

Possible next tasks include:

-   Predicting a masked symbol or codon from surrounding sequence.
-   Classifying short synthetic sequences by a rule that depends on
    distant context.
-   Comparing representations of the same symbol in different sequence
    contexts.

Only after these steps should the project move to real nucleotide or
protein sequences and biologically meaningful labels.

## Recommended resources

### Small, interactive educational example

-   **FemtoGPT** --- interactive Transformer demonstration using a tiny
    vocabulary. Useful for observing how context affects token
    representations and predictions.\
    https://thierrydutoit.github.io/iDSP/FemtoGPT.htm

### DNA self-attention research reference

-   **Nucleic Transformer** --- research example applying self-attention
    to DNA sequences. Useful as a bridge from synthetic sequences to
    biological sequence modeling.\
    https://pmc.ncbi.nlm.nih.gov/articles/PMC10863451/

### Codon-level encoder research reference

-   **CodonTransformer** --- more advanced encoder model using codon and
    amino-acid representations with contextual information. Best treated
    as a later-stage reference rather than a first implementation.\
    https://www.nature.com/articles/s41467-025-58588-7

## Final recommendation

Build a Jupyter notebook around the six-symbol context-classification
task, using a single-head, single-layer self-attention model. Make every
intermediate tensor and attention matrix inspectable. Then add a harder
context task and transition to a simplified codon-inspired sequence.
This sequence of exercises keeps the first implementation small while
preserving a clear path toward biological encoder models.
