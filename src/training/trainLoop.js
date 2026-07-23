import * as tf from '@tensorflow/tfjs';
import { forwardDomainBranch } from '../model/dann.js';
import {
  domainAccuracyFromLogits,
  labelAccuracyFromLogits,
  scalarFromLoss,
  evaluateHeldOutAccuracy,
  evaluateDomainError,
  computePAD,
} from './metrics.js';

// Sec. 5.2.2: lambda_p = 2/(1+exp(-gamma*p)) - 1, gamma = 10.
export function lambdaSchedule(p, gamma = 10) {
  return 2 / (1 + Math.exp(-gamma * p)) - 1;
}

// Sec. 5.2.2: mu_p = mu0 / (1 + alpha*p)^beta.
export function learningRateSchedule(p, mu0 = 0.01, alpha = 10, beta = 0.75) {
  return mu0 / Math.pow(1 + alpha * p, beta);
}

// The single source of truth for both the real training computation and
// the paced code walkthrough. Every `@step <id>` marker below corresponds
// to one yielded checkpoint; parseSteps.js maps these comments to line
// numbers in this same file (imported via Vite `?raw`), so the highlighted
// line in the UI is always the line that just ran.
//
// One call to .next() = one checkpoint, not one full training step — a full
// Algorithm-1 iteration is 7 checkpoints (sample-batch..backward-and-update).
export async function* trainLoop({
  featureExtractor,
  labelPredictor,
  domainClassifier,
  sourceTrain,
  targetTrain,
  sourceVal,
  targetVal,
  batchSize = 32,
  totalSteps = 1000,
  stepsPerEpoch = 50,
  getMode = () => 'dann', // () => 'dann' | 'plain' — read live so mode can flip mid-run without a reset
  getOverrides = () => ({ lambda: null, mu: null }),
}) {
  const optimizer = tf.train.momentum(0.01, 0.9);
  let globalStep = 0;
  let epoch = 0;

  while (globalStep < totalSteps) {
    let yLossValue = 0;
    let dLossValue = 0;
    let domainAccValue = 0;

    for (let s = 0; s < stepsPerEpoch && globalStep < totalSteps; s++, globalStep++) {
      const p = globalStep / totalSteps;
      const overrides = getOverrides() ?? {};
      const mode = getMode();
      const scheduledLambda = mode === 'dann' ? lambdaSchedule(p) : 1;
      const scheduledMu = learningRateSchedule(p);
      const lambda = overrides.lambda ?? scheduledLambda;
      const mu = overrides.mu ?? scheduledMu;
      optimizer.learningRate = mu;

      // @step sample-batch
      // Algorithm 1: draw one labeled source minibatch and one unlabeled target minibatch.
      const { xs: xsSource, ys: ysSource } = sourceTrain.sampleBatch(batchSize);
      const xsTarget = targetTrain.sampleBatch(batchSize);
      yield { stepId: 'sample-batch', values: { epoch, globalStep, batchSize, lambda, mu } };

      // @step forward-source
      // h = G_f(x_source; theta_f) — shared feature extractor applied to the labeled batch.
      const hSourcePreview = tf.tidy(() => featureExtractor.apply(xsSource));
      yield { stepId: 'forward-source', values: { featureShape: hSourcePreview.shape } };

      // @step label-loss
      // L_y = CrossEntropy(G_y(h), y_source) — label predictor loss, source-only (Eq. 10/18 first term).
      const yProbsPreview = tf.tidy(() => labelPredictor.apply(hSourcePreview, { training: true }));
      const yLossPreview = tf.tidy(() => tf.losses.softmaxCrossEntropy(ysSource, yProbsPreview).asScalar());
      yLossValue = await scalarFromLoss(yLossPreview);
      const labelAcc = await labelAccuracyFromLogits(yProbsPreview, ysSource);
      yield { stepId: 'label-loss', values: { labelLoss: yLossValue, labelAccuracy: labelAcc } };
      tf.dispose([yProbsPreview, yLossPreview]);

      // @step forward-target
      // h' = G_f(x_target; theta_f) — same feature extractor applied to the unlabeled target batch.
      const hTargetPreview = tf.tidy(() => featureExtractor.apply(xsTarget));
      yield { stepId: 'forward-target', values: { featureShape: hTargetPreview.shape } };

      // @step grl-reverse
      // R_lambda(h) — identity forward, gradient scaled by -lambda backward (Eq. 16-18).
      // In Plain-NN mode this is tf.stopGradient instead: forward-identical, but zero
      // gradient reaches theta_f, reproducing the paper's Fig. 2 "source only" baseline.
      const domainProbsSourcePreview = tf.tidy(() =>
        forwardDomainBranch(domainClassifier, hSourcePreview, { mode, lambda })
      );
      const domainProbsTargetPreview = tf.tidy(() =>
        forwardDomainBranch(domainClassifier, hTargetPreview, { mode, lambda })
      );
      yield { stepId: 'grl-reverse', values: { lambda, mode } };

      // @step domain-loss
      // L_d = BinaryCrossEntropy(G_d(R(h)), domainLabel) over source (label 0) + target (label 1),
      // matching Eq. 10/18's second and third terms combined.
      const { dLossPreview, domainProbsAll, domainLabelsAll } = tf.tidy(() => {
        const domainProbsAll = tf.concat([domainProbsSourcePreview, domainProbsTargetPreview], 0);
        const domainLabelsAll = tf.concat(
          [tf.zeros([batchSize, 1]), tf.ones([batchSize, 1])],
          0
        );
        const dLossPreview = tf.losses.sigmoidCrossEntropy(domainLabelsAll, domainProbsAll).asScalar();
        return { dLossPreview, domainProbsAll, domainLabelsAll };
      });
      dLossValue = await scalarFromLoss(dLossPreview);
      domainAccValue = await domainAccuracyFromLogits(domainProbsAll, domainLabelsAll);
      yield { stepId: 'domain-loss', values: { domainLoss: dLossValue, domainAccuracy: domainAccValue } };
      tf.dispose([
        hSourcePreview,
        hTargetPreview,
        domainProbsSourcePreview,
        domainProbsTargetPreview,
        dLossPreview,
        domainProbsAll,
        domainLabelsAll,
      ]);

      // @step backward-and-update
      // Single saddle-point update (Eq. 13-15): total = L_y + lambda*L_d, one optimizer
      // step over all params. The GRL (or stopGradient) already fixed the sign/magnitude
      // of dL_d/dtheta_f, so a plain gradient-descent minimize on this sum reproduces
      // theta_f/theta_y/theta_d updates from Eq. 13-15 exactly — see grl.js for the proof.
      optimizer.minimize(() => {
        const hSource = featureExtractor.apply(xsSource);
        const hTarget = featureExtractor.apply(xsTarget);
        const yProbs = labelPredictor.apply(hSource, { training: true });
        const yLoss = tf.losses.softmaxCrossEntropy(ysSource, yProbs).asScalar();

        const dProbsSource = forwardDomainBranch(domainClassifier, hSource, { mode, lambda });
        const dProbsTarget = forwardDomainBranch(domainClassifier, hTarget, { mode, lambda });
        const dProbsAll = tf.concat([dProbsSource, dProbsTarget], 0);
        const dLabelsAll = tf.concat([tf.zeros([batchSize, 1]), tf.ones([batchSize, 1])], 0);
        const dLoss = tf.losses.sigmoidCrossEntropy(dLabelsAll, dProbsAll).asScalar();

        return yLoss.add(dLoss.mul(lambda)) ;
      });
      yield { stepId: 'backward-and-update', values: { epoch, globalStep, lambda, mu } };

      tf.dispose([xsSource, ysSource, xsTarget]);
    }

    // @step epoch-end
    // End-of-epoch bookkeeping: held-out source validation accuracy, domain-classifier
    // generalization error on held-out source+target, and PAD = 2(1-2*epsilon) (Eq. 3).
    const valAccuracy = await evaluateHeldOutAccuracy(featureExtractor, labelPredictor, sourceVal, batchSize);
    const domainError = await evaluateDomainError(featureExtractor, domainClassifier, sourceVal, targetVal, batchSize);
    const pad = computePAD(domainError);
    epoch += 1;
    yield {
      stepId: 'epoch-end',
      values: {
        epoch,
        labelLoss: yLossValue,
        domainLoss: dLossValue,
        trainDomainAccuracy: domainAccValue,
        valAccuracy,
        domainError,
        pad,
      },
    };
  }
}
