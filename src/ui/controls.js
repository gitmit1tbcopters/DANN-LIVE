// Training controls: mode toggle (DANN / Plain-NN), Play/Pause/Step/
// Step-epoch/Reset, speed slider, Tutorial/Free-run toggle + Next button,
// and manual override sliders for lambda/mu. Toggling mode or pacing never
// touches the underlying generator — see runner.js.
//
// Markup is split across two mount points so a player-bar-style container
// can show `primaryEl` (transport + key stats) always and `secondaryEl`
// (mode/overrides/remaining stats) only when expanded.

const BTN = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel';
const ICON_BTN_BASE = 'flex items-center justify-center rounded-full transition-colors text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--deck-bg-to)]';
const ICON_BTN_LG = `${ICON_BTN_BASE} h-11 w-11 text-xl`;
const ICON_BTN_SM = `${ICON_BTN_BASE} h-9 w-9 text-base`;
const ICON_PLAY = `${ICON_BTN_LG} bg-[var(--accent)] enabled:hover:bg-[var(--accent-hover)] focus-visible:ring-[var(--accent)]`;
const ICON_PAUSE = `${ICON_BTN_LG} bg-amber-600 enabled:hover:bg-amber-500 focus-visible:ring-amber-500`;
const ICON_STEP = `${ICON_BTN_SM} bg-[var(--accent-secondary)] enabled:hover:bg-teal-500 focus-visible:ring-[var(--accent-secondary)]`;
const ICON_RESET = `${ICON_BTN_SM} bg-[var(--accent-rose)] enabled:hover:bg-red-500 focus-visible:ring-[var(--accent-rose)]`;
const FIELD_FOCUS = 'accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel rounded-sm';
const BTN_NEXT = 'flex items-center gap-1.5 rounded-full bg-[var(--accent-secondary)] px-4 py-1.5 text-sm font-medium text-white transition-colors enabled:hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-secondary)] focus-visible:ring-offset-2 focus-visible:ring-offset-panel';

export function initControls(primaryEl, secondaryEl, callbacks) {
  let totalEpochs = null;
  let totalSteps = null;
  let stepsPerEpoch = null;

  primaryEl.innerHTML = `
    <div class="flex flex-col items-center gap-2.5">
      <div class="relative flex w-full items-center justify-center gap-3">
        <button type="button" id="btn-reset" class="${ICON_RESET}" disabled title="Reset" aria-label="Reset">&#8634;</button>
        <button type="button" id="btn-step" class="${ICON_STEP}" disabled title="Step" aria-label="Step">&#9199;</button>
        <button type="button" id="btn-play-pause" class="${ICON_PLAY}" disabled title="Play" aria-label="Play">&#9654;</button>
        <button type="button" id="btn-step-epoch" class="${ICON_STEP}" disabled title="Step epoch" aria-label="Step epoch">&#9197;</button>
        <span id="status-running" class="absolute right-0 flex h-3 w-3 hidden" title="Running" aria-label="Running">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
          <span class="relative inline-flex h-3 w-3 rounded-full bg-red-600"></span>
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink">Speed
          <input type="range" id="speed-slider" min="0.1" max="5" step="0.1" value="1" class="${FIELD_FOCUS}" />
          <span id="speed-value" class="text-sm text-muted tabular-nums">1.0x</span>
        </label>
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" id="tutorial-toggle" class="${FIELD_FOCUS}" checked /> Tutorial mode</label>
        <button type="button" id="btn-next" class="${BTN_NEXT}" disabled title="Next step" aria-label="Next step">
          <span aria-hidden="true">&#9197;</span> Next step
        </button>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-4 text-sm text-muted" id="stats-row-primary">
        <span>epoch: <b id="stat-epoch" class="text-ink tabular-nums">0</b>/<input type="number" id="total-epochs-input" min="1" step="1" class="w-14 rounded-md border border-border bg-sunken px-1.5 py-0.5 text-sm text-ink tabular-nums ${FIELD_FOCUS}" disabled /></span>
        <span>step: <b id="stat-step" class="text-ink tabular-nums">0</b>/<input type="number" id="total-steps-input" min="1" step="1" class="w-16 rounded-md border border-border bg-sunken px-1.5 py-0.5 text-sm text-ink tabular-nums ${FIELD_FOCUS}" disabled /></span>
        <span>val acc: <b id="stat-val-acc" class="text-ink tabular-nums">-</b></span>
      </div>
    </div>
  `;

  secondaryEl.innerHTML = `
    <div class="flex flex-col items-center gap-2.5">
      <div class="flex flex-wrap items-center justify-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="radio" name="mode" value="dann" class="${FIELD_FOCUS}" checked /> DANN (adversarial)</label>
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="radio" name="mode" value="plain" class="${FIELD_FOCUS}" /> Plain NN (stop-gradient baseline)</label>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" id="lambda-override-toggle" class="${FIELD_FOCUS}" /> Override lambda</label>
        <input type="range" id="lambda-slider" min="0" max="1" step="0.01" value="0.5" class="${FIELD_FOCUS}" disabled />
        <span id="lambda-value" class="text-sm text-muted tabular-nums">0.50</span>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" id="mu-override-toggle" class="${FIELD_FOCUS}" /> Override mu (learning rate)</label>
        <input type="range" id="mu-slider" min="0.0001" max="0.05" step="0.0001" value="0.01" class="${FIELD_FOCUS}" disabled />
        <span id="mu-value" class="text-sm text-muted tabular-nums">0.0100</span>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-4 text-sm text-muted" id="stats-row-secondary">
        <span>lambda: <b id="stat-lambda" class="text-ink tabular-nums">-</b></span>
        <span>mu: <b id="stat-mu" class="text-ink tabular-nums">-</b></span>
        <span>domain acc: <b id="stat-domain-acc" class="text-ink tabular-nums">-</b></span>
        <span>PAD: <b id="stat-pad" class="text-ink tabular-nums">-</b></span>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3 hidden" id="epoch-scrub-row">
        <label class="flex items-center gap-1.5 text-sm text-ink">Epoch history
          <input type="range" id="epoch-scrub-slider" min="0" max="0" step="1" value="0" class="${FIELD_FOCUS}" disabled />
        </label>
        <span id="epoch-scrub-value" class="text-sm text-muted tabular-nums">–</span>
        <button type="button" id="btn-download-report" class="${BTN}" disabled>Download epoch report</button>
      </div>
    </div>
  `;

  const query = (sel) => primaryEl.querySelector(sel) ?? secondaryEl.querySelector(sel);

  const els = {
    playPause: query('#btn-play-pause'),
    statusRunning: query('#status-running'),
    step: query('#btn-step'),
    stepEpoch: query('#btn-step-epoch'),
    reset: query('#btn-reset'),
    next: query('#btn-next'),
    speedSlider: query('#speed-slider'),
    speedValue: query('#speed-value'),
    tutorialToggle: query('#tutorial-toggle'),
    lambdaToggle: query('#lambda-override-toggle'),
    lambdaSlider: query('#lambda-slider'),
    lambdaValue: query('#lambda-value'),
    muToggle: query('#mu-override-toggle'),
    muSlider: query('#mu-slider'),
    muValue: query('#mu-value'),
    totalStepsInput: query('#total-steps-input'),
    totalEpochsInput: query('#total-epochs-input'),
    epochScrubRow: query('#epoch-scrub-row'),
    epochScrubSlider: query('#epoch-scrub-slider'),
    epochScrubValue: query('#epoch-scrub-value'),
    downloadReportBtn: query('#btn-download-report'),
  };

  let isPlaying = false;

  function setPlaying(playing) {
    isPlaying = playing;
    els.playPause.className = playing ? ICON_PAUSE : ICON_PLAY;
    els.playPause.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
    els.playPause.title = playing ? 'Pause' : 'Play';
    els.playPause.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    els.statusRunning.classList.toggle('hidden', !playing);
    // Total-steps/epochs are only safe to edit while paused — mid-flight
    // edits would shrink/grow the run out from under the in-progress loop.
    els.totalStepsInput.disabled = playing;
    els.totalEpochsInput.disabled = playing;
    // Backtracking only makes sense once training has been stopped —
    // scrubbing mid-run would fight the live epoch-end updates.
    els.epochScrubSlider.disabled = playing || els.epochScrubSlider.max === '0';
  }

  els.playPause.addEventListener('click', () => {
    if (isPlaying) callbacks.onPause?.();
    else callbacks.onPlay?.();
    setPlaying(!isPlaying);
  });
  els.step.addEventListener('click', () => callbacks.onStep?.());
  els.stepEpoch.addEventListener('click', () => callbacks.onStepEpoch?.());
  els.reset.addEventListener('click', () => callbacks.onReset?.());
  els.next.addEventListener('click', () => callbacks.onNext?.());

  secondaryEl.querySelectorAll('input[name="mode"]').forEach((radio) => {
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
    els.next.disabled = !on || els.playPause.disabled;
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
    els.playPause.disabled = false;
    els.step.disabled = false;
    els.stepEpoch.disabled = false;
    els.reset.disabled = false;
    els.next.disabled = !els.tutorialToggle.checked;
    els.totalStepsInput.disabled = isPlaying;
    els.totalEpochsInput.disabled = isPlaying;
  }

  function setTotals({ totalEpochs: epochs, totalSteps: steps, stepsPerEpoch: perEpoch }) {
    totalEpochs = epochs;
    totalSteps = steps;
    if (perEpoch !== undefined) stepsPerEpoch = perEpoch;
    els.totalEpochsInput.value = Math.round(totalEpochs ?? 0);
    els.totalStepsInput.value = Math.round(totalSteps ?? 0);
  }

  els.totalStepsInput.addEventListener('change', () => {
    const v = Math.max(1, Math.round(parseFloat(els.totalStepsInput.value) || 0));
    const accepted = callbacks.onTotalStepsChange?.(v) ?? true;
    els.totalStepsInput.value = accepted ? v : Math.round(totalSteps ?? 0);
  });

  els.totalEpochsInput.addEventListener('change', () => {
    const v = Math.max(1, Math.round(parseFloat(els.totalEpochsInput.value) || 0));
    if (!stepsPerEpoch) {
      els.totalEpochsInput.value = Math.round(totalEpochs ?? 0);
      return;
    }
    const accepted = callbacks.onTotalStepsChange?.(v * stepsPerEpoch) ?? true;
    els.totalEpochsInput.value = accepted ? v : Math.round(totalEpochs ?? 0);
  });

  els.epochScrubSlider.addEventListener('input', () => {
    const v = parseInt(els.epochScrubSlider.value, 10);
    els.epochScrubValue.textContent = `epoch ${v}`;
    callbacks.onScrub?.(v);
  });
  els.downloadReportBtn.addEventListener('click', () => callbacks.onDownloadReport?.());

  // Called once training has stopped and at least one epoch has completed —
  // reveals the scrub slider/report button and sets its range to the epochs
  // actually recorded (1..latestEpoch).
  function enableEpochHistory(latestEpoch) {
    if (latestEpoch < 1) return;
    els.epochScrubRow.classList.remove('hidden');
    els.epochScrubSlider.min = 1;
    els.epochScrubSlider.max = latestEpoch;
    els.epochScrubSlider.value = latestEpoch;
    els.epochScrubSlider.disabled = isPlaying;
    els.epochScrubValue.textContent = `epoch ${latestEpoch}`;
    els.downloadReportBtn.disabled = false;
  }

  function disableEpochHistory() {
    els.epochScrubRow.classList.add('hidden');
    els.epochScrubSlider.disabled = true;
    els.epochScrubSlider.max = '0';
    els.epochScrubValue.textContent = '–';
    els.downloadReportBtn.disabled = true;
  }

  function updateStats(values) {
    if (values.epoch !== undefined) query('#stat-epoch').textContent = values.epoch;
    if (values.globalStep !== undefined) query('#stat-step').textContent = values.globalStep;
    if (values.lambda !== undefined) query('#stat-lambda').textContent = values.lambda.toFixed(3);
    if (values.mu !== undefined) query('#stat-mu').textContent = values.mu.toFixed(5);
    if (values.valAccuracy !== undefined) query('#stat-val-acc').textContent = (values.valAccuracy * 100).toFixed(1) + '%';
    if (values.trainDomainAccuracy !== undefined) query('#stat-domain-acc').textContent = (values.trainDomainAccuracy * 100).toFixed(1) + '%';
    if (values.pad !== undefined) query('#stat-pad').textContent = values.pad.toExponential(2);
  }

  return { enable, updateStats, setTotals, setPlaying, enableEpochHistory, disableEpochHistory, els };
}
