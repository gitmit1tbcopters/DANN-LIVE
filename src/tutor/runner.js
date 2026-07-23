// Drives the trainLoop async generator, one checkpoint (@step yield) at a
// time. This is the only thing that paces execution — there is exactly one
// training loop (trainLoop.js's generator); Free-run and Tutorial mode are
// two different pacing strategies applied to the same generator instance,
// so switching between them never resets training progress.
export class TrainingRunner {
  constructor({ onCheckpoint, baseDelayMs = 600 }) {
    this.onCheckpoint = onCheckpoint;
    this.baseDelayMs = baseDelayMs;
    this.generator = null;
    this.playing = false;
    this.tutorialMode = false;
    this.speed = 1;
    this._advanceResolvers = [];
    this._loopRunning = false;
  }

  // Swaps in a new generator (e.g. on Reset, when a fresh trainLoop() call
  // is made with newly-initialized model weights). Stops any running loop first.
  attach(generator) {
    this.playing = false;
    this.generator = generator;
  }

  setSpeed(multiplier) {
    this.speed = Math.max(0.1, multiplier);
  }

  setTutorialMode(on) {
    this.tutorialMode = on;
    if (!on) this.notifyNext();
  }

  play() {
    this.playing = true;
    this._ensureLoop();
  }

  pause() {
    this.playing = false;
  }

  // Advances exactly one checkpoint, regardless of play/pause/mode state.
  async step() {
    if (!this.generator) return null;
    const { value, done } = await this.generator.next();
    if (!done) this.onCheckpoint(value);
    return { value, done };
  }

  // Advances checkpoints until the epoch-end checkpoint fires (or the
  // generator finishes), calling onCheckpoint for every checkpoint in between.
  async stepEpoch() {
    let result;
    do {
      result = await this.step();
    } while (result && !result.done && result.value.stepId !== 'epoch-end');
    return result;
  }

  // Called by the UI's "Next step" button in Tutorial mode.
  notifyNext() {
    const resolvers = this._advanceResolvers;
    this._advanceResolvers = [];
    resolvers.forEach((resolve) => resolve());
  }

  async _waitForAdvance() {
    if (this.tutorialMode) {
      await new Promise((resolve) => this._advanceResolvers.push(resolve));
    } else {
      await new Promise((resolve) => setTimeout(resolve, this.baseDelayMs / this.speed));
    }
  }

  async _ensureLoop() {
    if (this._loopRunning) return;
    this._loopRunning = true;
    try {
      while (this.playing) {
        const result = await this.step();
        if (!result || result.done) {
          this.playing = false;
          break;
        }
        if (!this.playing) break;
        await this._waitForAdvance();
      }
    } finally {
      this._loopRunning = false;
    }
  }
}
