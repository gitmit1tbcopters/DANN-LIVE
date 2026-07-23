// Training controls: mode toggle (DANN / Plain-NN), Play/Pause/Step/
// Step-epoch/Reset, speed slider, Tutorial/Free-run toggle + Next button,
// and manual override sliders for lambda/mu. Toggling mode or pacing never
// touches the underlying generator — see runner.js.

const BTN = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel';
const FIELD_FOCUS = 'accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel rounded-sm';

export function initControls(containerEl, callbacks) {
  containerEl.innerHTML = `
    <div class="flex flex-col gap-2.5">
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="radio" name="mode" value="dann" class="${FIELD_FOCUS}" checked /> DANN (adversarial)</label>
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="radio" name="mode" value="plain" class="${FIELD_FOCUS}" /> Plain NN (stop-gradient baseline)</label>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button type="button" id="btn-play" class="${BTN}" disabled>Play</button>
        <button type="button" id="btn-pause" class="${BTN}" disabled>Pause</button>
        <button type="button" id="btn-step" class="${BTN}" disabled>Step</button>
        <button type="button" id="btn-step-epoch" class="${BTN}" disabled>Step epoch</button>
        <button type="button" id="btn-reset" class="${BTN}" disabled>Reset</button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink">Speed
          <input type="range" id="speed-slider" min="0.1" max="5" step="0.1" value="1" class="${FIELD_FOCUS}" />
          <span id="speed-value" class="text-sm text-muted tabular-nums">1.0x</span>
        </label>
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" id="tutorial-toggle" class="${FIELD_FOCUS}" /> Tutorial mode</label>
        <button type="button" id="btn-next" class="${BTN}" disabled>Next step</button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" id="lambda-override-toggle" class="${FIELD_FOCUS}" /> Override lambda</label>
        <input type="range" id="lambda-slider" min="0" max="1" step="0.01" value="0.5" class="${FIELD_FOCUS}" disabled />
        <span id="lambda-value" class="text-sm text-muted tabular-nums">0.50</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" id="mu-override-toggle" class="${FIELD_FOCUS}" /> Override mu (learning rate)</label>
        <input type="range" id="mu-slider" min="0.0001" max="0.05" step="0.0001" value="0.01" class="${FIELD_FOCUS}" disabled />
        <span id="mu-value" class="text-sm text-muted tabular-nums">0.0100</span>
      </div>

      <div class="flex flex-wrap items-center gap-4 text-sm text-muted" id="stats-row">
        <span>epoch: <b id="stat-epoch" class="text-ink tabular-nums">0</b></span>
        <span>step: <b id="stat-step" class="text-ink tabular-nums">0</b></span>
        <span>lambda: <b id="stat-lambda" class="text-ink tabular-nums">-</b></span>
        <span>mu: <b id="stat-mu" class="text-ink tabular-nums">-</b></span>
        <span>val acc: <b id="stat-val-acc" class="text-ink tabular-nums">-</b></span>
        <span>domain acc: <b id="stat-domain-acc" class="text-ink tabular-nums">-</b></span>
        <span>PAD: <b id="stat-pad" class="text-ink tabular-nums">-</b></span>
      </div>
    </div>
  `;

  const els = {
    play: containerEl.querySelector('#btn-play'),
    pause: containerEl.querySelector('#btn-pause'),
    step: containerEl.querySelector('#btn-step'),
    stepEpoch: containerEl.querySelector('#btn-step-epoch'),
    reset: containerEl.querySelector('#btn-reset'),
    next: containerEl.querySelector('#btn-next'),
    speedSlider: containerEl.querySelector('#speed-slider'),
    speedValue: containerEl.querySelector('#speed-value'),
    tutorialToggle: containerEl.querySelector('#tutorial-toggle'),
    lambdaToggle: containerEl.querySelector('#lambda-override-toggle'),
    lambdaSlider: containerEl.querySelector('#lambda-slider'),
    lambdaValue: containerEl.querySelector('#lambda-value'),
    muToggle: containerEl.querySelector('#mu-override-toggle'),
    muSlider: containerEl.querySelector('#mu-slider'),
    muValue: containerEl.querySelector('#mu-value'),
  };

  els.play.addEventListener('click', () => callbacks.onPlay?.());
  els.pause.addEventListener('click', () => callbacks.onPause?.());
  els.step.addEventListener('click', () => callbacks.onStep?.());
  els.stepEpoch.addEventListener('click', () => callbacks.onStepEpoch?.());
  els.reset.addEventListener('click', () => callbacks.onReset?.());
  els.next.addEventListener('click', () => callbacks.onNext?.());

  containerEl.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) callbacks.onModeChange?.(e.target.value);
    });
  });

  els.speedSlider.addEventListener('input', () => {
    const v = parseFloat(els.speedSlider.value);
    els.speedValue.textContent = `${v.toFixed(1)}x`;
    callbacks.onSpeedChange?.(v);
  });

  els.tutorialToggle.addEventListener('change', () => {
    const on = els.tutorialToggle.checked;
    els.next.disabled = !on || els.play.disabled;
    callbacks.onTutorialToggle?.(on);
  });

  els.lambdaToggle.addEventListener('change', () => {
    els.lambdaSlider.disabled = !els.lambdaToggle.checked;
    callbacks.onLambdaOverrideChange?.(els.lambdaToggle.checked ? parseFloat(els.lambdaSlider.value) : null);
  });
  els.lambdaSlider.addEventListener('input', () => {
    els.lambdaValue.textContent = parseFloat(els.lambdaSlider.value).toFixed(2);
    if (els.lambdaToggle.checked) callbacks.onLambdaOverrideChange?.(parseFloat(els.lambdaSlider.value));
  });

  els.muToggle.addEventListener('change', () => {
    els.muSlider.disabled = !els.muToggle.checked;
    callbacks.onMuOverrideChange?.(els.muToggle.checked ? parseFloat(els.muSlider.value) : null);
  });
  els.muSlider.addEventListener('input', () => {
    els.muValue.textContent = parseFloat(els.muSlider.value).toFixed(4);
    if (els.muToggle.checked) callbacks.onMuOverrideChange?.(parseFloat(els.muSlider.value));
  });

  function enable() {
    els.play.disabled = false;
    els.pause.disabled = false;
    els.step.disabled = false;
    els.stepEpoch.disabled = false;
    els.reset.disabled = false;
    els.next.disabled = !els.tutorialToggle.checked;
  }

  function updateStats(values) {
    if (values.epoch !== undefined) containerEl.querySelector('#stat-epoch').textContent = values.epoch;
    if (values.globalStep !== undefined) containerEl.querySelector('#stat-step').textContent = values.globalStep;
    if (values.lambda !== undefined) containerEl.querySelector('#stat-lambda').textContent = values.lambda.toFixed(3);
    if (values.mu !== undefined) containerEl.querySelector('#stat-mu').textContent = values.mu.toFixed(5);
    if (values.valAccuracy !== undefined) containerEl.querySelector('#stat-val-acc').textContent = (values.valAccuracy * 100).toFixed(1) + '%';
    if (values.trainDomainAccuracy !== undefined) containerEl.querySelector('#stat-domain-acc').textContent = (values.trainDomainAccuracy * 100).toFixed(1) + '%';
    if (values.pad !== undefined) containerEl.querySelector('#stat-pad').textContent = values.pad.toFixed(3);
  }

  return { enable, updateStats, els };
}
