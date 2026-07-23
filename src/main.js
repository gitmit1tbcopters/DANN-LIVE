import * as tf from '@tensorflow/tfjs';
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
};

const mathPanel = initMathPanel({
  mathContentEl: els.mathContent,
  captionEl: els.tutorCaption,
  mathViewEl: els.mathView,
  mathLegendEl: els.mathLegend,
});
const algoTracker = createAlgoTracker(els.algoTrackerBody);
const networkDiagram = createNetworkDiagram(els.networkSvg);
const lossChart = createLossChart(els.lossChartBody);
const featureScatter = createFeatureScatter(els.featureScatterBody);

// Mutable training session state, rebuilt on Reset / initial dataset ready.
// `currentMode` and `overrides` are read live by the generator (via getMode/
// getOverrides), so toggling them never touches — let alone resets — it.
let session = null; // { featureExtractor, labelPredictor, domainClassifier, sourceTrain, targetTrain, sourceVal, targetVal, batchSize, imageSize, numClasses, classNames }
let currentMode = 'dann';
const overrides = { lambda: null, mu: null };

const runner = new TrainingRunner({
  onCheckpoint: (checkpoint) => {
    const { stepId, values } = checkpoint;
    mathPanel.showCheckpoint(stepId);
    algoTracker.highlight(stepId);
    networkDiagram.pulse(stepId, values);
    controlsHandle.updateStats(values);
    if (stepId === 'epoch-end') {
      lossChart.pushEpoch(values);
      updateDomainMeter(values);
      if (session) {
        featureScatter.update(session.featureExtractor, session.sourceTrain, session.targetTrain);
      }
    }
  },
});

const controlsHandle = initPlayerBar(els.playerBar, {
  onPlay: () => runner.play(),
  onPause: () => runner.pause(),
  onStep: () => runner.step(),
  onStepEpoch: () => runner.stepEpoch(),
  onReset: () => resetTraining(),
  onModeChange: (m) => {
    currentMode = m;
  },
  onSpeedChange: (v) => runner.setSpeed(v),
  onTutorialToggle: (on) => runner.setTutorialMode(on),
  onNext: () => runner.notifyNext(),
  onLambdaOverrideChange: (v) => {
    overrides.lambda = v;
  },
  onMuOverrideChange: (v) => {
    overrides.mu = v;
  },
});

els.playerToggle.addEventListener('click', () => {
  const next = !controlsHandle.isVisible();
  controlsHandle.setVisible(next);
  els.playerToggle.textContent = next ? 'Hide Controls' : 'Show Controls';
  els.playerToggle.setAttribute('aria-pressed', String(next));
});

function updateDomainMeter(values) {
  const domainAccPct = (values.trainDomainAccuracy * 100).toFixed(1);
  const padVal = values.pad.toFixed(3);
  // Domain accuracy near 50% == domain classifier is confused == good for DANN.
  const confusionPct = Math.max(0, 100 - Math.abs(values.trainDomainAccuracy - 0.5) * 200);
  els.domainMeterBody.innerHTML = `
    <div class="text-xs text-muted">domain classifier accuracy: <b class="text-ink">${domainAccPct}%</b> (50% = fully confused)</div>
    <div class="bg-surface border border-border rounded-md h-3.5 overflow-hidden my-1.5">
      <div class="h-full bg-accent-rose" style="width:${confusionPct}%"></div>
    </div>
    <div class="text-xs text-muted">PAD (proxy A-distance): <b class="text-ink">${padVal}</b></div>
  `;
}

function buildGeneratorForSession() {
  const { featureExtractor, labelPredictor, domainClassifier, sourceTrain, targetTrain, sourceVal, targetVal, batchSize } = session;
  return trainLoop({
    featureExtractor,
    labelPredictor,
    domainClassifier,
    sourceTrain,
    targetTrain,
    sourceVal,
    targetVal,
    batchSize,
    totalSteps: 2000,
    stepsPerEpoch: 25,
    getMode: () => currentMode,
    getOverrides: () => overrides,
  });
}

function startSession(payload) {
  const { sourceDataset, targetDataset, imageSize, numClasses, classNames } = payload;

  const sourceVal = sourceDataset.splitValidation(0.15);
  const targetVal = targetDataset.splitValidation(0.15);

  const { featureExtractor, labelPredictor, domainClassifier } = buildDANN({ imageSize, channels: 3, numClasses });

  session = {
    featureExtractor,
    labelPredictor,
    domainClassifier,
    sourceTrain: sourceDataset,
    targetTrain: targetDataset,
    sourceVal,
    targetVal,
    batchSize: 16,
    imageSize,
    numClasses,
    classNames,
  };

  runner.attach(buildGeneratorForSession());
  controlsHandle.enable();
  initTestPanel();
  updateSplitSummary();
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

function resetTraining() {
  if (!session) return;
  runner.pause();
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

  lossChart.reset();
  runner.attach(buildGeneratorForSession());
}

initUploaders(els.uploaders, { onReady: startSession });

// --- Testing panel -------------------------------------------------------
// Wired once a session exists; re-wired (same DOM, fresh handler closures
// over `session`) whenever a new dataset/model is built via startSession.
function initTestPanel() {
  els.testPanelBody.innerHTML = `
    <label for="test-image-input" class="flex items-center justify-center border border-dashed border-border rounded-lg py-4 px-3 text-xs text-muted cursor-pointer hover:border-accent hover:text-ink transition">
      Drop or choose a test image
    </label>
    <input type="file" id="test-image-input" accept="image/*" class="hidden" />
    <div id="test-result" class="text-xs text-muted mt-2.5"></div>
    <div id="test-softmax" class="mt-2"></div>
  `;

  const input = els.testPanelBody.querySelector('#test-image-input');
  const label = els.testPanelBody.querySelector('label[for="test-image-input"]');
  const resultEl = els.testPanelBody.querySelector('#test-result');
  const softmaxEl = els.testPanelBody.querySelector('#test-softmax');

  async function handleFile(file) {
    if (!file || !session) return;

    const tensor = await loadImageAsTensor(file, session.imageSize);
    const batched = tensor.expandDims(0);

    const { labelProbsArr, domainProbArr, features } = tf.tidy(() => {
      const feats = session.featureExtractor.apply(batched);
      const labelProbs = session.labelPredictor.apply(feats);
      const domainProb = forwardDomainBranch(session.domainClassifier, feats, { mode: 'plain', lambda: 0 });
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

    featureScatter.plotTestPoint(features);
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
