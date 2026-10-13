# Direction Embeddings Lab

Open `index.html` directly in a current browser. The page uses only local HTML, CSS, and vanilla JavaScript; it needs no server, build step, network connection, or machine-learning library.

The lab has three independent models: an eight-word autoencoder, a word-to-symbol translator, and a word-to-image translator. All use the same 8 → 2 tanh encoder and trainable decoder. Training uses full-batch gradient descent with the task's categorical, grouped categorical, or binary cross-entropy loss. The seeded linear-congruential generator makes Reset reproducible for a given mode and seed.

The JavaScript is split by responsibility under `js/`: fixed targets, mode settings, network math and gradients, asynchronous training, rendering, and UI coordination. A central-difference gradient check runs at startup for encoder and decoder weights in all three modes; its maximum relative error is available as a tooltip on the model update/accuracy metric.
