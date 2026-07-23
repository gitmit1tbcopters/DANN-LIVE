# DANN Lab

Interactive, browser-based Domain-Adversarial Neural Network trainer, implementing Ganin et al., *"Domain-Adversarial Training of Neural Networks"* (JMLR 2016).

DANN Lab lets you train a shallow DANN entirely client-side (TensorFlow.js — no backend, no server-side training) on synthetic or uploaded image data, and watch every part of the algorithm as it runs:

- **Live training visualizations** — label loss / domain loss curves, a 2D feature-space scatter showing source vs. target features separating (or not) over epochs, and a network diagram highlighting the active layer at each step.
- **Algorithm 1 tracker** — steps through the paper's stochastic training update (batch sampling, forward pass, gradient reversal, domain loss, backward pass, epoch-end Proxy A-distance) in lock-step with the running model.
- **Math tutor panel** — the paper's equations rendered with KaTeX, a symbol legend, the algorithm's actual initial values (Algorithm 1, line 3–4), and one worked numeric example threaded consistently through every step.
- **Data sources** — built-in synthetic 2-domain toy datasets, or upload your own source/target image sets.
- **Light/dark theme**, persisted across sessions.

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Running with Docker (OrbStack)

1. Make sure OrbStack is running.
2. `docker compose up --build`
3. Open `http://localhost:5173`
4. `docker compose down` to stop.

No OrbStack-specific configuration is needed beyond having it running as your Docker daemon — it speaks the standard Docker CLI/API, so this is a normal Docker Compose setup.
