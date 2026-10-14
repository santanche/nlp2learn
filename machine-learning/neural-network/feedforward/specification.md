I would specify this as a small, interactive **neural network laboratory for comparing three ways of learning a two-dimensional representation of words**. The central idea is to keep the vocabulary and the two-dimensional latent space identical across the three modes, while changing what the network is trained to produce.

This is particularly useful for your NLP course because students can investigate how the training objective affects the learned representation.

The application should run entirely in the browser, use plain JavaScript, HTML, and CSS, and implement the neural networks and gradient calculations explicitly rather than relying on a machine-learning library.

One important design decision: the application should distinguish between the **latent representation learned by the network** and the **target representation it is trained to produce**. In the first mode, the target is the original word; in the other two, it is an arrow-like character sequence or a 3 × 3 image.

# Specification for Codex: Direction Words Neural Network Lab

**Project name:** Direction Embeddings Lab  
**Implementation:** Vanilla JavaScript, HTML, and CSS  
**Execution:** Browser only; no backend, external API, or machine-learning library  
**Primary objective:** Demonstrate how three different training objectives affect a neural network's two-dimensional latent representations of words.

## 1. Vocabulary and training dataset

Use exactly these eight words, in this fixed order:

```javascript
const vocabulary = [
  "north",
  "south",
  "east",
  "west",
  "northeast",
  "northwest",
  "southeast",
  "southwest"
];
```

Represent each input word as an eight-dimensional one-hot vector.

For example:

```text
north      [1,0,0,0,0,0,0,0]
south      [0,1,0,0,0,0,0,0]
east       [0,0,1,0,0,0,0,0]
...
southwest  [0,0,0,0,0,0,0,1]
```

Each training example consists of a word and its target output. The dataset contains eight examples, one per word.

All three modes must use the same vocabulary, the same two-dimensional bottleneck, and the same general encoder–decoder architecture.

### Important pedagogical distinction

These are three different learning tasks, not three different embedding algorithms.

- Mode 1 learns to reconstruct word identity.
- Mode 2 learns to translate word identity into a two-character representation.
- Mode 3 learns to translate word identity into a nine-pixel representation.

The embeddings are learned from the selected task's training objective.

## 2. The three neural network modes

### Mode 1 — Word autoencoder

**Task:** Encode a word into two numbers and reconstruct the original word.

Architecture:

\[
\underbrace{\mathbf{x}\in\mathbb{R}^{8}}_{\text{Input word}}
\longrightarrow
\underbrace{\mathbf{z}\in\mathbb{R}^{2}}_{\text{Embedding}}
\longrightarrow
\underbrace{\hat{\mathbf{x}}\in\mathbb{R}^{8}}_{\text{Reconstructed word}}
\]

Use the following layers:

| Layer | Input dimensions | Output dimensions | Operation |
|---|---:|---:|---|
| Input | — | 8 | One-hot word |
| Encoder | 8 | 2 | Dense + tanh |
| Decoder | 2 | 8 | Dense + softmax |

The output is a probability distribution over the eight words.

For example, the network should learn to reconstruct `north` when the input is `north`.

Training target:

\[
\mathbf{y}=\mathbf{x}
\]

Loss:

\[
\mathcal{L}=-\sum_{i=1}^{8}y_i\log(\hat{x}_i)
\]

Use categorical cross-entropy.

**Expected result:** The network learns eight points in a two-dimensional space that allow it to distinguish and reconstruct the eight words.

Do not expect semantically meaningful arrangements. Since the task only requires reconstructing word identity, the objective does not require similar directions to occupy neighboring points.

### Mode 2 — Word-to-symbol translator

**Task:** Translate each direction word into its specified two-character representation.

Use these exact mappings:

| Input word | Target string |
|---|---|
| north | `\|^` |
| south | `\|v` |
| east | `->` |
| west | `<-` |
| northeast | `/^` |
| northwest | `^\` |
| southeast | `\v` |
| southwest | `v/` |

The backslash characters must be handled correctly in JavaScript strings.

#### Output representation

Use two character positions, each with eight possible symbols:

```javascript
const symbols = ["|", "^", "v", "-", ">", "<", "/", "\\"];
```

Each target character is represented as a one-hot vector of length eight.

For example:

```text
north → "|^"

Position 1: |
Position 2: ^
```

The decoder produces two probability distributions, one for each character position.

Architecture:

\[
\mathbb{R}^{8}
\longrightarrow
\mathbb{R}^{2}
\longrightarrow
\mathbb{R}^{2\times8}
\]

The final output consists of 16 logits, organized as two groups of eight. Apply a separate softmax to each group.

For example, the decoder might predict:

```text
Position 1:
|  0.92
^  0.01
v  0.01
...

Position 2:
^  0.89
|  0.02
v  0.02
...
```

The decoded string is formed by taking the highest-probability symbol at each position.

Training loss:

\[
\mathcal{L}
=
-\sum_{p=1}^{2}
\sum_{j=1}^{8}
y_{p,j}\log(\hat{y}_{p,j})
\]

This is the sum of two categorical cross-entropy losses.

**Expected result:** The network learns to map each word to its corresponding symbol sequence through the two-dimensional bottleneck.

This is a word-to-symbol translator, not a natural-language machine translation system.

### Mode 3 — Word-to-image translator

**Task:** Translate each direction word into a 3 × 3 black-and-white image.

Use exactly the following patterns, with `*` representing black and `_` representing white.

**North**
```text
***
_*_
___
```

**South**
```text
___
_*_
***
```

**East**
```text
__*
_**
__*
```

**West**
```text
*__
**_
*__
```

**Northeast**
```text
_**
_**
___
```

**Northwest**
```text
**_
**_
___
```

**Southeast**
```text
___
_**
_**
```

**Southwest**
```text
___
**_
**_
```

The asterisk and underscore patterns must be implemented exactly as specified.

#### Output representation

Flatten each image into a nine-dimensional vector, using row-major order.

For example, north becomes:

```text
***
_*_
___
```

Flattened representation:

\[
\mathbf{y}_{north}
=
[1,1,1,\;0,1,0,\;0,0,0]
\]

Use 1 for black and 0 for white.

Architecture:

\[
\mathbb{R}^{8}
\longrightarrow
\mathbb{R}^{2}
\longrightarrow
\mathbb{R}^{9}
\]

The decoder produces nine logits, followed by a sigmoid activation for each pixel.

Training loss:

\[
\mathcal{L}
=
-\sum_{i=1}^{9}
\left[
y_i\log(\hat{y}_i)
+
(1-y_i)\log(1-\hat{y}_i)
\right]
\]

Use binary cross-entropy.

For visualization, convert the predicted pixel probabilities to black or white using a threshold of 0.5.

**Expected result:** The network learns to translate each word into its corresponding 3 × 3 image.

The network must use the same encoder architecture as the other modes. Only the decoder's output dimensions and loss function change.

---

## 3. Neural network implementation

Implement the network from scratch using JavaScript arrays or typed arrays.

Do not use TensorFlow.js, Brain.js, or other neural network libraries. The purpose is to expose the calculations.

### Encoder

For input vector \(\mathbf{x}\):

\[
\mathbf{z}=\tanh(W_e\mathbf{x}+\mathbf{b}_e)
\]

Dimensions:

\[
W_e\in\mathbb{R}^{2\times8},
\qquad
\mathbf{b}_e\in\mathbb{R}^{2}
\]

The latent representation is:

\[
\mathbf{z}=[z_1,z_2]
\]

### Decoder

For latent vector \(\mathbf{z}\):

\[
\mathbf{a}=W_d\mathbf{z}+\mathbf{b}_d
\]

The decoder's output activation depends on the selected mode:

| Mode | Decoder output size | Activation |
|---|---:|---|
| Word autoencoder | 8 | Softmax |
| Symbol translator | 16, reshaped into 2 × 8 | Two independent softmax functions |
| Image translator | 9 | Sigmoid |

For the image mode, use the nine sigmoid outputs directly as pixel probabilities.

For the symbol mode, apply softmax independently to each character position.

### Parameter initialization

Initialize weights to small random values, using a seeded pseudorandom number generator.

Biases can start at zero.

Provide a **Reset** control that reinitializes the network using the current seed, making experiments reproducible.

### Training

Implement:

- Forward propagation.
- Loss calculation.
- Backpropagation.
- Gradient descent.
- A training loop over all eight examples.

Use a configurable learning rate and number of epochs.

Default values can be:

- Learning rate: 0.05.
- Epochs per training batch: 100.
- Batch strategy: full-batch gradient descent over all eight examples.

The implementation should calculate gradients for every trainable weight and bias.

Use numerically stable implementations of softmax, sigmoid, and cross-entropy. Clamp probabilities where needed to prevent `log(0)`.

The network should remain small enough to train interactively on a standard laptop CPU.

## 4. User interface

Create a single-page application with a clean, classroom-friendly design.

The interface should have four main regions.

### A. Mode selector

At the top, provide three selectable modes:

1. **Autoencoder:** Word → Word
2. **Symbol Translator:** Word → Two-character symbol
3. **Image Translator:** Word → 3 × 3 image

Changing the mode must change the decoder, target representation, loss function, and output visualization.

Each mode should have a short description of its learning objective.

**Important:** Each mode maintains its own model parameters. Switching modes must not silently reuse weights trained for a different output task.

Provide a clear indication of whether the selected model is untrained, training, or trained.

### B. Vocabulary and training examples

Display all eight words in a table.

The table should contain:

| Word | Target | Embedding | Prediction | Status |
|---|---|---|---|---|
| north | Depends on mode | \((z_1,z_2)\) | Current output | Correct/incorrect |
| south | Depends on mode | \((z_1,z_2)\) | Current output | Correct/incorrect |
| ... | ... | ... | ... | ... |

The target column should show:

- The word itself in autoencoder mode.
- The two-character string in symbol mode.
- A 3 × 3 pixel grid in image mode.

Selecting a word highlights it throughout the interface, including its point in the latent-space chart.

Show the model's predicted output beside the target so students can compare them.

For the image mode, display the target and reconstructed image as actual 3 × 3 grids, not as strings.

### C. Training controls

Provide these controls:

- **Train:** run the configured number of epochs.
- **Step:** perform one training update using all eight examples.
- **Reset:** reinitialize the selected model.
- **Learning rate:** numerical input or slider.
- **Epochs:** number of epochs for the Train action.
- **Random seed:** integer input for reproducibility.

Also provide a training-loss chart that updates during training.

The chart should clearly label its axes:

- X-axis: Epoch.
- Y-axis: Training loss.

The loss should be calculated over the complete dataset, rather than showing the loss of only the last training example.

When the user presses Step, update the loss, embeddings, and predictions immediately.

Training should not freeze the interface. Use a suitable asynchronous training loop or yield periodically to the browser's event loop.

### D. Network inspector

Display the network architecture and its dimensions.

For example, in image mode:

```text
Input
8 neurons
    |
    v
Encoder
8 → 2
    |
    v
Latent space
2 dimensions
    |
    v
Decoder
2 → 9
    |
    v
Sigmoid
    |
    v
3 × 3 reconstructed image
```

Allow students to select a word and inspect:

- Its one-hot input.
- The encoder's pre-activation values.
- Its two-dimensional embedding.
- The decoder's pre-activation values.
- The output probabilities.
- The predicted result.
- The target result.
- The loss for that example.

Where practical, provide a matrix inspector showing the weights of the encoder and decoder.

For the selected word, explain that the encoder extracts the corresponding column of \(W_e\), because the input is one-hot.

This is an especially useful connection between the mathematical representation and the actual implementation.

---

## 5. Latent-space visualization

This is the central visualization of the application.

Display an interactive two-dimensional scatter plot with axes \(z_1\) and \(z_2\).

Plot one point for each of the eight words, using the coordinates produced by the encoder.

Label each point with its word.

Selecting a point should highlight the corresponding word in the vocabulary table and display its prediction.

### Interaction requirements

The chart should support:

- Selecting individual points.
- Displaying the coordinates of a selected point.
- Highlighting the selected point.
- Showing the word associated with each point.
- Updating automatically after training.
- Displaying all eight words simultaneously.

Use SVG or Canvas with plain JavaScript. An external plotting library is not necessary.

The plot should automatically adjust its axis ranges to accommodate the learned embeddings, with some padding around the points.

### Interpreting the geometry

Add a short explanation beneath the chart:

> Each point represents a word's learned two-dimensional embedding. The neural network adjusts these coordinates during training to improve its predictions. Nearby points are geometrically similar, but their proximity does not necessarily imply linguistic or semantic similarity.

This distinction is important in all three modes.

In the autoencoder mode, the model is trained to reconstruct word identity. In the translator modes, it is trained to produce the specified symbols or images.

**Do not manually arrange the embeddings to match the directions.** Their coordinates must come from the actual encoder. The application should visualize the learned result, even if it does not look intuitive.

### Optional but valuable: decode arbitrary points

Allow students to click an empty location in the latent-space plot.

The application should use the selected coordinates directly as the decoder's input:

\[
(z_1,z_2)\longrightarrow\text{Decoder}\longrightarrow\text{Output}
\]

Display the resulting word probabilities, symbol sequence, or 3 × 3 image, depending on the selected mode.

This feature should not require a nearby vocabulary point.

Explain that decoding an arbitrary point may produce an output that does not correspond to any training example. This is an opportunity to discuss the limits of the learned representation.

Do not move or retrain the embeddings when students click the chart.

---

## 6. Output visualization

The application should provide a dedicated output panel whose contents depend on the selected mode.

### Autoencoder mode

Display:

- Input word.
- Reconstructed word.
- Probability assigned to each of the eight possible words.
- Whether the reconstruction is correct.

For example:

```text
Input: north

Predictions:
north      0.91
south      0.02
east       0.01
west       0.01
...
```

These values are illustrative. The application must display actual model outputs.

### Symbol translator mode

Display the target and predicted strings side by side.

```text
Input word: north

Target:    |^
Predicted: |^
```

Also display the probability distribution for each character position.

A prediction is correct only if both characters match the target.

### Image translator mode

Display the target image and predicted image side by side.

For example:

**Target**

```text
***
_*_
___
```

**Prediction**

```text
***
_*_
___
```

Display the probability of each pixel as a number between 0 and 1.

Use a threshold of 0.5 to produce the binary image.

Also calculate pixel accuracy:

\[
\text{Pixel accuracy}
=
\frac{\text{Number of correctly predicted pixels}}{9}
\]

Distinguish between pixel accuracy and exact-image accuracy. A prediction with eight correct pixels has pixel accuracy of \(8/9\), but the image is still incorrect.

## 7. Evaluation and progress indicators

Display a summary of the model's performance:

| Metric | Autoencoder | Symbol translator | Image translator |
|---|---|---|---|
| Exact-match accuracy | Correct words / 8 | Correct strings / 8 | Exact images / 8 |
| Training loss | Cross-entropy | Sum of character losses | Binary cross-entropy |
| Additional metric | — | Character accuracy | Pixel accuracy |

These metrics should be calculated from actual predictions on the eight training examples.

Label them **training performance**, not test performance: all eight examples are used for training, so these results do not measure generalization to unseen words.

The application should not automatically declare a model successful merely because it has completed the requested number of epochs. Show the actual loss and predictions.

## 8. Technical implementation requirements

Use the following project structure:

```text
direction-embeddings-lab/
├── index.html
├── styles.css
├── js/
│   ├── main.js
│   ├── vocabulary.js
│   ├── neural-network.js
│   ├── training.js
│   ├── visualizations.js
│   └── modes.js
└── README.md
```

Responsibilities:

- `index.html`: application structure.
- `styles.css`: responsive layout and styling.
- `vocabulary.js`: eight words and their exact target representations.
- `neural-network.js`: matrix operations, activations, forward propagation, loss, backpropagation, and gradient updates.
- `training.js`: training loop, loss history, and training controls.
- `visualizations.js`: latent-space chart and output rendering.
- `modes.js`: mode-specific configurations, target encodings, losses, and decoding.
- `main.js`: initialization and coordination of the interface.
- `README.md`: execution instructions and a brief explanation of the architecture.

These modules should be implemented only as needed; do not introduce unnecessary abstractions.

### Constraints

1. Use vanilla JavaScript, HTML, and CSS.
2. Do not use external machine-learning libraries.
3. Do not require a backend or an Internet connection to run the application.
4. Do not use a build system or package manager unless genuinely necessary.
5. Keep the implementation small enough for students to inspect.
6. Use the same encoder architecture in all three modes.
7. Keep separate model parameters for each mode.
8. Use a fixed vocabulary and exact target mappings.
9. Make all displayed values and charts reflect actual model calculations.
10. Ensure the interface works on standard desktop browsers.

The application should work by opening `index.html` directly in a browser. If the implementation uses JavaScript modules that require a local HTTP server, document a simple alternative using Python's built-in HTTP server.

## 9. Important mathematical and implementation checks

Ask Codex to verify the following before considering the implementation complete.

**A. Matrix dimensions**

The encoder must always have:

\[
W_e\in\mathbb{R}^{2\times8}
\]

The decoder must have:

\[
W_d\in
\begin{cases}
\mathbb{R}^{8\times2} & \text{Autoencoder}\\
\mathbb{R}^{16\times2} & \text{Symbol translator}\\
\mathbb{R}^{9\times2} & \text{Image translator}
\end{cases}
\]

**B. Training targets**

All eight target mappings must match the specification exactly.

**C. Gradient calculations**

Check the derivatives for tanh, softmax, sigmoid, and the selected loss functions. In particular, the derivative of softmax combined with categorical cross-entropy should be implemented correctly.

**D. Finite-difference gradient test**

Implement a small numerical gradient check for selected weights. Compare the analytical gradients from backpropagation with numerical approximations.

This is particularly valuable because an incorrect gradient can make the application appear to work while preventing the network from learning properly.

**E. Reproducibility**

The same mode, seed, initialization, training settings, and dataset should produce the same results.

**F. Output consistency**

The displayed embeddings must be generated by the encoder, and the displayed predictions must be generated by the corresponding decoder. Do not substitute illustrative coordinates or hardcoded predictions.

---

## 10. Acceptance criteria

The implementation is complete when all of the following work:

- [ ] The user can switch among the three modes.
- [ ] Each mode uses the exact eight-word vocabulary.
- [ ] The autoencoder reconstructs words from their embeddings.
- [ ] The symbol translator learns the specified two-character mappings.
- [ ] The image translator learns the specified 3 × 3 images.
- [ ] Training updates the model parameters and loss.
- [ ] Step performs a single full-batch gradient update.
- [ ] Reset restores the model to its seeded initialization.
- [ ] The two-dimensional latent-space chart displays all eight actual embeddings.
- [ ] Selecting a point identifies the corresponding word.
- [ ] The network inspector displays actual intermediate values.
- [ ] The output panel displays actual predictions.
- [ ] Clicking an arbitrary point in the latent space decodes that point without changing the model.
- [ ] Gradient checks pass within a reasonable numerical tolerance.
- [ ] The application runs in a standard browser without a GPU, backend, or machine-learning library.

### Final recommendation

I would implement the three modes as **one shared neural-network engine with three output configurations**, rather than three independent neural networks with duplicated code.

That design makes the central lesson particularly clear: the encoder architecture and the two-dimensional bottleneck remain the same, while the training objective and decoder output change.

Students can then compare how a network learns representations when it must reconstruct word identity, translate words into symbolic sequences, or produce small images.
