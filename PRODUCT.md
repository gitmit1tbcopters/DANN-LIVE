# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Educators and presenters who teach domain-adversarial training and want to demonstrate it live in class or talks, running real training on real data in front of an audience rather than narrating a canned animation.

## Product Purpose

DANN Lab is a browser-based trainer for Domain-Adversarial Neural Networks (Ganin et al. 2016). It runs an actual three-headed DANN (feature extractor, label predictor, domain classifier with a gradient reversal layer) end-to-end in the browser via TensorFlow.js, on image data the presenter supplies, and visualizes the training as it happens: loss curves, a PCA feature-space scatter plot showing source/target domain confusion emerging, and an Algorithm 1 pseudocode tracker highlighting the exact step currently executing.

## Positioning

Two mechanisms other explainers can't truthfully claim together: (1) it trains on your own uploaded source/target image data live in-browser — not a pre-baked animation — so the domain confusion you see is real; (2) the Algorithm 1 tracker keeps pseudocode synced line-by-line to the live tensors, making the algorithm legible step by step rather than described in prose. Neither replaces the other — the real training is what's visualized, and the tracker is how it's made legible.

## Operating Context

Used live during a class or talk: presenter uploads/selects source-domain image classes, optionally a target-domain set (falling back to a synthetic domain shift when none is supplied), then runs, pauses, and steps through training while narrating. Includes a training control panel (mode, playback, speed, tutorial toggles, parameter overrides) and a network architecture diagram (G_f, G_y, GRL, G_d) with live node highlighting.

## Capabilities and Constraints

- Client-side only, no backend — all training executes in-browser via TensorFlow.js.
- Works fully offline once loaded — no network dependency during a session, relevant for classroom/demo use without reliable connectivity.
- Image datasets only — source and target domain inputs are user-supplied image classes; other data modalities are out of scope.
- Gradient Reversal Layer implemented via `tf.customGrad` (TensorFlow.js has no native `stopGradient`).
- Diagnostics tracked live: domain classifier accuracy/error, Proxy A-Distance (PAD).
- Docker-based dev setup available alongside local `npm run dev` (Vite).

## Evidence on Hand

None yet — no testimonials, case studies, or third-party demonstrations exist. Do not fabricate any.

## Product Principles

1. The training must be real, not simulated for effect — every visualization reflects actual live tensors, so a presenter can trust what's on screen.
2. The algorithm must stay legible in real time — the pseudocode tracker and architecture diagram exist to make an abstract adversarial process watchable, not just runnable.
3. Zero-setup, zero-dependency-on-network — a presenter must be able to walk into a room with unreliable wifi and still run a live demo.
4. The interface serves live narration — controls (pause, step, speed, parameter override) exist because a presenter talks over the run, not just starts it and waits.

## Accessibility & Inclusion

No product-specific accessibility requirement established yet.
