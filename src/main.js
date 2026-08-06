import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import { buildDANN, forwardDomainBranch } from './model/dann.js';
import { assertGrlGradientFlip } from './model/grl.js';
import { loadImageAsTensor } from './data/imageLoader.js';
import { trainLoop } from './training/trainLoop.js';
import { TrainingRunner } from './tutor/runner.js';
import { initMathPanel } from './tutor/mathPanel.js';
import { initUploaders } from './ui/uploaders.js';
import { initPlayerBar } from './ui/playerBar.js';
import { initTheme } from './ui/theme.js';
import { createLossChart } from './viz/lossChart.js';
import { createFeatureScatter } from './viz/featureScatter.js';
import { createAlgoTracker } from './viz/algoTracker.js';
import { createNetworkDiagram } from './viz/networkDiagram.js';

// Prefer WebGPU when available; tfjs falls back to WebGL/CPU automatically
// if the browser lacks WebGPU support or initialization fails.
try {
  await tf.setBackend('webgpu');
} catch {
  await tf.setBackend('webgl');
}
await tf.ready();
console.log(`[tf] backend: ${tf.getBackend()}`);

if (import.meta.env.DEV) {
  assertGrlGradientFlip();
}

initTheme(document.getElementById('theme-toggle'));

const els = {
  uploaders: document.getElementById('uploaders'),
  playerBar: document.getElementById('player-bar'),
  playerToggle: document.getElementById('player-toggle'),
  mathContent: document.getElementById('math-content'),
  mathView: document.getElementById('math-view'),
  mathLegend: document.getElementById('math-legend'),
  tutorCaption: document.getElementById('tutor-caption'),
  algoTrackerBody: document.getElementById('algo-tracker-body'),
  networkSvg: document.getElementById('network-svg'),
  lossChartBody: document.getElementById('loss-chart-body'),
  domainMeterBody: document.getElementById('domain-meter-body'),
  featureScatterBody: document.getElementById('feature-scatter-body'),
  testPanelBody: document.getElementById('test-panel-body'),
  testMatchBody: document.getElementById('test-match-body'),
  datasetWarning: document.getElementById('dataset-warning'),
};

const mathPanel = initMathPanel({
  mathContentEl: els.mathContent,
  captionEl: els.tutorCaption,
  mathLegendEl: els.mathLegend,
});
const algoTracker = createAlgoTracker(els.algoTrackerBody);
const networkDiagram = createNetworkDiagram(els.networkSvg);
const lossChart = createLossChart(els.lossChartBody);
const featureScatter = createFeatureScatter(els.featureScatterBody);
featureScatter.attachMirror(els.testMatchBody);
lossChart.renderEmpty();
featureScatter.renderEmpty();
updateDomainMeter();

// Mutable training session state, rebuilt on Reset / initial dataset ready.
// `currentMode` and `overrides` are read live by the generator (via getMode/
// getOverrides), so toggling them never touches — let alone resets — it.
let session = null; // { featureExtractor, labelPredictor, domainClassifier, sourceTrain, targetTrain, sourceVal, targetVal, batchSize, imageSize, numClasses, classNames }
let currentMode = 'dann';
const overrides = { lambda: null, mu: null };

// Every epoch-end `values` snapshot from the current run, keyed by epoch
// number, so the player can scrub backward through completed epochs (and
// export them as a report) once training is stopped. Cleared on Reset.
// Each entry also carries a `weights` array (cloned tensors for
// featureExtractor/labelPredictor/domainClassifier at that epoch) so the
// "Test a New Image" panel can run inference against the scrubbed epoch's
// model instead of the live (post-training) one.
let epochHistory = [];

// A second, idle set of models with the same architecture as `session`'s —
// loaded with a past epoch's weights while scrubbing, used only for test-panel
// inference. Built once per session so scrubbing doesn't allocate a full model
// on every slider tick.
let snapshotModels = null;
let scrubbedEpoch = null; // null = live/current weights; N = epoch N's snapshot

function captureWeights(session) {
  return {
    featureExtractor: session.featureExtractor.getWeights().map((w) => w.clone()),
    labelPredictor: session.labelPredictor.getWeights().map((w) => w.clone()),
    domainClassifier: session.domainClassifier.getWeights().map((w) => w.clone()),
  };
}

function disposeSnapshotModels() {
  if (!snapshotModels) return;
  snapshotModels.featureExtractor.dispose();
  snapshotModels.labelPredictor.dispose();
  snapshotModels.domainClassifier.dispose();
  snapshotModels = null;
}

const runner = new TrainingRunner({
  onCheckpoint: (checkpoint) => {
    const { stepId, values } = checkpoint;
    if (session) {
      if (values.globalStep !== undefined) session.globalStep = values.globalStep;
      if (values.epoch !== undefined) session.epoch = values.epoch;
    }
    if (runner.tutorialMode) {
      mathPanel.showCheckpoint(stepId);
      algoTracker.highlight(stepId);
      networkDiagram.pulse(stepId, values);
    }
    controlsHandle.updateStats(values);
    if (stepId === 'epoch-end') {
      lossChart.pushEpoch(values);
      updateDomainMeter(values);
      epochHistory.push({ ...values, weights: session ? captureWeights(session) : null });
      if (session) {
        featureScatter.update(session.featureExtractor, session.sourceTrain, session.targetTrain);
      }
    }
  },
  onDone: () => {
    if (session) session.finished = true;
    controlsHandle.setPlaying(false);
    setTestPanelLocked(false);
    if (epochHistory.length > 0) controlsHandle.enableEpochHistory(epochHistory.length);
  },
});

const controlsHandle = initPlayerBar(els.playerBar, {
  onPlay: () => {
    runner.play();
    setTestPanelLocked(true);
    clearScrub();
    document.getElementById('math-panel').scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  },
  onPause: () => {
    runner.pause();
    setTestPanelLocked(false);
    if (epochHistory.length > 0) controlsHandle.enableEpochHistory(epochHistory.length);
  },
  onStep: () => runner.step(),
  onStepEpoch: () => runner.stepEpoch(),
  onReset: () => resetTraining(),
  onModeChange: (m) => {
    currentMode = m;
  },
  onSpeedChange: (v) => runner.setSpeed(v),
  onTutorialToggle: (on) => runner.setTutorialMode(on),
  onNext: () => runner.notifyNext(),
  onScrub: (epochNum) => scrubToEpoch(epochNum),
  onDownloadReport: () => downloadEpochReport(),
  onLambdaOverrideChange: (v) => {
    overrides.lambda = v;
  },
  onMuOverrideChange: (v) => {
    overrides.mu = v;
  },
  onTotalStepsChange: (v) => {
    if (!session) return false;
    // Can't shrink the run past progress already made.
    if (v < session.globalStep) return false;

    const wasFinished = session.finished;
    session.totalSteps = v;
    controlsHandle.setTotals({ totalSteps: v, totalEpochs: v / session.stepsPerEpoch, stepsPerEpoch: session.stepsPerEpoch });

    // The generator returned (done:true) permanently once it ran out of
    // steps — extending totalSteps needs a fresh generator that continues
    // from the current weights/counters rather than restarting training.
    if (wasFinished && v > session.globalStep) {
      session.finished = false;
      runner.attach(buildGeneratorForSession());
    }
    return true;
  },
});

els.playerToggle.addEventListener('click', () => {
  const next = !controlsHandle.isVisible();
  controlsHandle.setVisible(next);
  els.playerToggle.textContent = next ? 'Hide Controls' : 'Show Controls';
  els.playerToggle.setAttribute('aria-pressed', String(next));
});

// Jumps the charts/stats/domain-meter back to a previously completed epoch's
// recorded snapshot. Also loads that epoch's weights into `snapshotModels`
// and sets `scrubbedEpoch` so "Test a New Image" runs inference against the
// scrubbed epoch's model rather than the live (post-training) one. The
// feature scatter itself can't be rewound (it's an expensive PCA over a
// fresh sample), so it's left showing the current/live state.
function scrubToEpoch(epochNum) {
  const snapshot = epochHistory[epochNum - 1];
  if (!snapshot) return;
  controlsHandle.updateStats(snapshot);
  updateDomainMeter(snapshot);
  lossChart.highlightEpoch(epochNum);

  if (snapshot.weights && snapshotModels) {
    snapshotModels.featureExtractor.setWeights(snapshot.weights.featureExtractor);
    snapshotModels.labelPredictor.setWeights(snapshot.weights.labelPredictor);
    snapshotModels.domainClassifier.setWeights(snapshot.weights.domainClassifier);
    scrubbedEpoch = epochNum;
    updateTestPanelScrubHint();
  }
}

// Called when the user resumes Play — scrubbing only makes sense while
// stopped, so live weights take back over for the test panel.
function clearScrub() {
  scrubbedEpoch = null;
  lossChart.highlightEpoch(null);
  updateTestPanelScrubHint();
}

function downloadEpochReport() {
  if (epochHistory.length === 0) return;
  const lines = [
    'DANN Lab — epoch report',
    `generated: ${new Date().toISOString()}`,
    `mode: ${currentMode}`,
    scrubbedEpoch !== null ? `scrubbed to epoch: ${scrubbedEpoch}` : 'scrubbed to epoch: (live)',
    '',
  ];
  for (const v of epochHistory) {
    const marker = v.epoch === scrubbedEpoch ? ' <== scrubbed' : '';
    lines.push(
      `epoch ${v.epoch}\tstep ${v.globalStep}\tlabelLoss ${v.labelLoss?.toFixed(4)}\tdomainLoss ${v.domainLoss?.toFixed(4)}\t` +
        `valAccuracy ${(v.valAccuracy * 100).toFixed(2)}%\ttrainDomainAccuracy ${(v.trainDomainAccuracy * 100).toFixed(2)}%\t` +
        `PAD ${v.pad?.toExponential(3)}\tlambda ${v.lambda?.toFixed(4)}\tmu ${v.mu?.toFixed(6)}${marker}`
    );
  }

  const finalSnapshot =
    scrubbedEpoch !== null ? epochHistory.find((v) => v.epoch === scrubbedEpoch) : epochHistory[epochHistory.length - 1];
  if (finalSnapshot) {
    lines.push('', `overall (epoch ${finalSnapshot.epoch}):`, `macroF1 ${finalSnapshot.macroF1?.toFixed(4)}`);
    if (finalSnapshot.perClassF1) {
      for (const { classIndex, precision, recall, f1 } of finalSnapshot.perClassF1) {
        lines.push(
          `  class ${classIndex}\tprecision ${precision.toFixed(4)}\trecall ${recall.toFixed(4)}\tf1 ${f1.toFixed(4)}`
        );
      }
    }
    if (finalSnapshot.confusionMatrix) {
      lines.push('confusion matrix (rows=true, cols=predicted):');
      for (let row = 0; row < finalSnapshot.confusionMatrix.length; row++) {
        lines.push(`  ${row}: ${finalSnapshot.confusionMatrix[row].join('\t')}`);
      }
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const epochTag = scrubbedEpoch !== null ? `-epoch${scrubbedEpoch}` : '';
  a.download = `dann-epoch-report${epochTag}-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function updateDomainMeter(values = null) {
  const domainAccPct = values ? (values.trainDomainAccuracy * 100).toFixed(1) : '—';
  const padVal = values ? values.pad.toExponential(2) : '—';
  // Domain accuracy near 50% == domain classifier is confused == good for DANN.
  const confusionPct = values ? Math.max(0, 100 - Math.abs(values.trainDomainAccuracy - 0.5) * 200) : 0;
  els.domainMeterBody.innerHTML = `
    <div class="text-xs text-muted">domain classifier accuracy: <b class="text-ink">${domainAccPct}%</b> (50% = fully confused)</div>
    <div class="bg-surface border border-border rounded-md h-3.5 overflow-hidden my-1.5">
      <div class="h-full bg-accent-rose" style="width:${confusionPct}%"></div>
    </div>
    <div class="text-xs text-muted">PAD (proxy A-distance): <b class="text-ink">${padVal}</b></div>
  `;
}

function buildGeneratorForSession() {
  const { featureExtractor, labelPredictor, domainClassifier, sourceTrain, targetTrain, sourceVal, targetVal, batchSize, totalSteps, stepsPerEpoch } = session;
  return trainLoop({
    featureExtractor,
    labelPredictor,
    domainClassifier,
    sourceTrain,
    targetTrain,
    sourceVal,
    targetVal,
    batchSize,
    totalSteps,
    stepsPerEpoch,
    getMode: () => currentMode,
    getOverrides: () => overrides,
    getTotalSteps: () => session.totalSteps,
    initialGlobalStep: session.globalStep ?? 0,
    initialEpoch: session.epoch ?? 0,
  });
}

// Batch size caps at 16 for well-stocked datasets, shrinks (floor 2) so a
// batch never exceeds the smallest class bucket or the target set. Steps
// scale off dataset size so training is ~40 full passes over the smaller
// of source/target, clamped so tiny/huge datasets don't run instantly/forever.
function computeHyperparams(sourceTrain, targetTrain) {
  const classCounts = sourceTrain.classIndices.map((idx) => sourceTrain.buckets.get(idx).length);
  const smallestClassCount = Math.min(...classCounts);
  const batchSize = Math.max(2, Math.min(16, smallestClassCount, targetTrain.totalCount));
  const stepsPerEpoch = Math.max(5, Math.round(Math.min(sourceTrain.totalCount, targetTrain.totalCount) / batchSize));
  const totalSteps = Math.min(4000, Math.max(400, 40 * stepsPerEpoch));
  return { batchSize, stepsPerEpoch, totalSteps };
}

function startSession(payload) {
  const { sourceDataset, targetDataset, imageSize, numClasses, classNames } = payload;

  const preSplitClassCounts = sourceDataset.classIndices.map((idx) => sourceDataset.buckets.get(idx).length);
  const preSplitTargetCount = targetDataset.totalCount;

  const sourceVal = sourceDataset.splitValidation(0.15);
  const targetVal = targetDataset.splitValidation(0.15);

  const { featureExtractor, labelPredictor, domainClassifier } = buildDANN({ imageSize, channels: 3, numClasses });

  const { batchSize, stepsPerEpoch, totalSteps } = computeHyperparams(sourceDataset, targetDataset);

  session = {
    featureExtractor,
    labelPredictor,
    domainClassifier,
    sourceTrain: sourceDataset,
    targetTrain: targetDataset,
    sourceVal,
    targetVal,
    batchSize,
    stepsPerEpoch,
    totalSteps,
    imageSize,
    numClasses,
    classNames,
    globalStep: 0,
    epoch: 0,
    finished: false,
  };

  disposeSnapshotModels();
  snapshotModels = buildDANN({ imageSize, channels: 3, numClasses });
  scrubbedEpoch = null;
  epochHistory = [];

  runner.attach(buildGeneratorForSession());
  controlsHandle.setTotals({ totalSteps, totalEpochs: totalSteps / stepsPerEpoch, stepsPerEpoch });
  controlsHandle.enable();
  initTestPanel();
  updateSplitSummary();
  updateDatasetWarning(preSplitClassCounts, preSplitTargetCount, classNames);
}

function updateSplitSummary() {
  const splitEl = document.getElementById('split-summary');
  const sourceTrainN = session.sourceTrain.totalCount;
  const sourceValN = session.sourceVal.totalCount;
  const targetTrainN = session.targetTrain.totalCount;
  const targetValN = session.targetVal.totalCount;
  splitEl.classList.remove('hidden');
  splitEl.innerHTML = `
    <div class="font-semibold text-ink">Train / validation split (85% / 15%, per class, random)</div>
    <div class="mt-1 text-muted">Source: <b class="text-ink">${sourceTrainN}</b> train / <b class="text-ink">${sourceValN}</b> val</div>
    <div class="text-muted">Target: <b class="text-ink">${targetTrainN}</b> train / <b class="text-ink">${targetValN}</b> val</div>
  `;
}

const MIN_RECOMMENDED_IMAGES = 10;

function updateDatasetWarning(classCounts, targetCount, classNames) {
  const undersizedClasses = classCounts
    .map((count, i) => ({ count, name: classNames[i] ?? `class-${i}` }))
    .filter(({ count }) => count < MIN_RECOMMENDED_IMAGES);
  const targetUndersized = targetCount < MIN_RECOMMENDED_IMAGES;

  if (undersizedClasses.length === 0 && !targetUndersized) {
    els.datasetWarning.classList.add('hidden');
    return;
  }

  const parts = [];
  if (undersizedClasses.length > 0) {
    const list = undersizedClasses.map(({ name, count }) => `${name} (${count})`).join(', ');
    parts.push(`source class${undersizedClasses.length > 1 ? 'es' : ''} ${list}`);
  }
  if (targetUndersized) {
    parts.push(`target domain (${targetCount})`);
  }

  els.datasetWarning.classList.remove('hidden');
  els.datasetWarning.innerHTML = `
    <div class="font-semibold">Small dataset warning</div>
    <div class="mt-1">${parts.join(' and ')} have fewer than ${MIN_RECOMMENDED_IMAGES} images. Training and validation results may be unreliable with so few examples.</div>
  `;
}

function resetTraining() {
  if (!session) return;
  runner.pause();
  controlsHandle.setPlaying(false);
  setTestPanelLocked(false);
  session.featureExtractor.dispose();
  session.labelPredictor.dispose();
  session.domainClassifier.dispose();

  const { featureExtractor, labelPredictor, domainClassifier } = buildDANN({
    imageSize: session.imageSize,
    channels: 3,
    numClasses: session.numClasses,
  });
  session.featureExtractor = featureExtractor;
  session.labelPredictor = labelPredictor;
  session.domainClassifier = domainClassifier;
  session.globalStep = 0;
  session.epoch = 0;
  session.finished = false;

  lossChart.reset();
  featureScatter.renderEmpty();
  updateDomainMeter();
  for (const snap of epochHistory) {
    if (snap.weights) tf.dispose([...snap.weights.featureExtractor, ...snap.weights.labelPredictor, ...snap.weights.domainClassifier]);
  }
  epochHistory = [];
  scrubbedEpoch = null;
  controlsHandle.disableEpochHistory();
  controlsHandle.updateStats({ epoch: 0, globalStep: 0 });
  runner.attach(buildGeneratorForSession());
}

initUploaders(els.uploaders, { onReady: startSession });

// --- Testing panel -------------------------------------------------------
// Wired once a session exists; re-wired (same DOM, fresh handler closures
// over `session`) whenever a new dataset/model is built via startSession.
let testPanelLocked = false;
let setTestPanelLockedUi = () => {};
let updateTestPanelScrubHint = () => {};

function setTestPanelLocked(locked) {
  testPanelLocked = locked;
  setTestPanelLockedUi(locked);
}

function initTestPanel() {
  els.testPanelBody.innerHTML = `
    <label for="test-image-input" class="flex items-center justify-center border border-dashed border-border rounded-lg py-4 px-3 text-xs text-muted cursor-pointer hover:border-accent hover:text-ink transition">
      Drop or choose a test image
    </label>
    <input type="file" id="test-image-input" accept="image/*" class="hidden" />
    <div id="test-lock-hint" class="text-xs text-muted mt-2 hidden">Pause training to test an image.</div>
    <div id="test-scrub-hint" class="text-xs text-accent mt-2 hidden">Testing against epoch <span id="test-scrub-epoch"></span>'s model (scrubbed).</div>
    <div id="test-result" class="text-xs text-muted mt-2.5"></div>
    <div id="test-softmax" class="mt-2"></div>
  `;

  const input = els.testPanelBody.querySelector('#test-image-input');
  const label = els.testPanelBody.querySelector('label[for="test-image-input"]');
  const lockHintEl = els.testPanelBody.querySelector('#test-lock-hint');
  const scrubHintEl = els.testPanelBody.querySelector('#test-scrub-hint');
  const scrubEpochEl = els.testPanelBody.querySelector('#test-scrub-epoch');
  const resultEl = els.testPanelBody.querySelector('#test-result');
  const softmaxEl = els.testPanelBody.querySelector('#test-softmax');

  setTestPanelLockedUi = (locked) => {
    input.disabled = locked;
    label.classList.toggle('opacity-40', locked);
    label.classList.toggle('cursor-not-allowed', locked);
    label.classList.toggle('cursor-pointer', !locked);
    lockHintEl.classList.toggle('hidden', !locked);
  };
  setTestPanelLockedUi(testPanelLocked);

  updateTestPanelScrubHint = () => {
    scrubHintEl.classList.toggle('hidden', scrubbedEpoch === null);
    if (scrubbedEpoch !== null) scrubEpochEl.textContent = scrubbedEpoch;
  };
  updateTestPanelScrubHint();

  async function handleFile(file) {
    if (!file || !session || testPanelLocked) return;

    // While scrubbed, run inference against that epoch's snapshot weights
    // instead of the live (post-training) model.
    const models = scrubbedEpoch !== null && snapshotModels ? snapshotModels : session;

    const tensor = await loadImageAsTensor(file, session.imageSize);
    const batched = tensor.expandDims(0);

    const { labelProbsArr, domainProbArr, features } = tf.tidy(() => {
      const feats = models.featureExtractor.apply(batched);
      const labelProbs = models.labelPredictor.apply(feats);
      const domainProb = forwardDomainBranch(models.domainClassifier, feats, { mode: 'plain', lambda: 0 });
      return { labelProbsArr: labelProbs, domainProbArr: domainProb, features: feats };
    });

    const labelProbsData = await labelProbsArr.data();
    const domainProbData = await domainProbArr.data();
    const predictedIdx = labelProbsData.indexOf(Math.max(...labelProbsData));
    const className = session.classNames[predictedIdx] ?? `class-${predictedIdx}`;
    const domainConfidenceTarget = (domainProbData[0] * 100).toFixed(1);

    resultEl.innerHTML = `Predicted class: <b>${className}</b> &nbsp;|&nbsp; Domain classifier: <b>${domainConfidenceTarget}%</b> target-like`;
    softmaxEl.innerHTML = [...labelProbsData]
      .map((p, i) => {
        const name = session.classNames[i] ?? `class-${i}`;
        const pct = (p * 100).toFixed(1);
        return `<div class="text-xs text-muted mb-1.5">${name}: ${pct}%
          <div class="bg-surface border border-border rounded h-2 overflow-hidden">
            <div class="h-full bg-emerald-500" style="width:${pct}%"></div>
          </div>
        </div>`;
      })
      .join('');

    // The scatter's PCA basis is fit from the live model's last epoch-end
    // sample, so a scrubbed-epoch feature vector wouldn't project onto a
    // comparable basis — skip plotting it rather than showing a misleading
    // position.
    if (scrubbedEpoch === null) {
      const plotted = await featureScatter.plotTestPoint(features);
      if (!plotted) {
        resultEl.innerHTML += '<br /><span class="text-muted">Run at least one epoch to see it plotted in "Where It Lands".</span>';
      }
    } else {
      resultEl.innerHTML += '<br /><span class="text-muted">Feature-space plot reflects the live model only, not the scrubbed epoch.</span>';
    }
    tf.dispose([tensor, batched, labelProbsArr, domainProbArr, features]);
  }

  input.addEventListener('change', () => handleFile(input.files[0]));

  ['dragenter', 'dragover'].forEach((evt) => {
    label.addEventListener(evt, (e) => {
      e.preventDefault();
      label.classList.add('border-accent', 'text-ink');
    });
  });
  ['dragleave', 'dragend'].forEach((evt) => {
    label.addEventListener(evt, () => {
      label.classList.remove('border-accent', 'text-ink');
    });
  });
  label.addEventListener('drop', (e) => {
    e.preventDefault();
    label.classList.remove('border-accent', 'text-ink');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });
}
