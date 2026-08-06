import * as tf from '@tensorflow/tfjs';

// Proxy A-distance — Ben-David et al., as used in Ganin et al. 2016 Sec. 3.2, Eq. 3.
// domainError is the domain classifier's generalization error (epsilon) on held-out data.
export function computePAD(domainError) {
  return 2 * (1 - 2 * domainError);
}

// Reads a handful of scalars only — never a full tensor. Safe for the
// checkpoint/overlay path per the no-blocking-full-tensor-read requirement.
export async function domainAccuracyFromLogits(domainProbs, domainLabels) {
  const acc = tf.tidy(() => {
    const preds = domainProbs.greaterEqual(0.5).toFloat();
    return preds.equal(domainLabels).mean();
  });
  const value = (await acc.data())[0];
  acc.dispose();
  return value;
}

export async function labelAccuracyFromLogits(labelProbs, labelsOneHot) {
  const acc = tf.tidy(() => {
    const predIdx = labelProbs.argMax(-1);
    const trueIdx = labelsOneHot.argMax(-1);
    return predIdx.equal(trueIdx).toFloat().mean();
  });
  const value = (await acc.data())[0];
  acc.dispose();
  return value;
}

export async function scalarFromLoss(lossTensor) {
  const value = (await lossTensor.data())[0];
  return value;
}

// Evaluates label-predictor accuracy on a held-out split, sampling a few
// batches rather than the whole set (dataset sizes here are small enough
// that a handful of batches covers most of it without blocking on huge reads).
export async function evaluateHeldOutAccuracy(featureExtractor, labelPredictor, dataset, batchSize, numBatches = 3) {
  let total = 0;
  let count = 0;
  for (let b = 0; b < numBatches; b++) {
    if (dataset.totalCount === 0) break;
    const size = Math.min(batchSize, dataset.totalCount);
    const { xs, ys } = dataset.sampleBatch(size);
    const acc = tf.tidy(() => {
      const features = featureExtractor.apply(xs);
      const probs = labelPredictor.apply(features);
      return probs;
    });
    const value = await labelAccuracyFromLogits(acc, ys);
    total += value;
    count += 1;
    tf.dispose([xs, ys, acc]);
  }
  return count > 0 ? total / count : 0;
}

// numClasses x numClasses matrix, rows = true class, cols = predicted class.
export function computeConfusionMatrix(predIndices, trueIndices, numClasses) {
  const matrix = Array.from({ length: numClasses }, () => new Array(numClasses).fill(0));
  for (let i = 0; i < trueIndices.length; i++) {
    matrix[trueIndices[i]][predIndices[i]] += 1;
  }
  return matrix;
}

// Per-class precision/recall/F1 plus macro-averaged F1, from a confusion matrix.
export function computeF1Scores(matrix) {
  const numClasses = matrix.length;
  const perClass = [];
  let macroF1 = 0;
  for (let c = 0; c < numClasses; c++) {
    const tp = matrix[c][c];
    let fp = 0;
    let fn = 0;
    for (let i = 0; i < numClasses; i++) {
      if (i !== c) {
        fp += matrix[i][c];
        fn += matrix[c][i];
      }
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    perClass.push({ classIndex: c, precision, recall, f1 });
    macroF1 += f1;
  }
  macroF1 = numClasses > 0 ? macroF1 / numClasses : 0;
  return { perClass, macroF1 };
}

// Evaluates label-predictor accuracy AND builds a confusion matrix on a held-out
// split, sampling a few batches rather than the whole set. Returns both the
// accuracy scalar and the {matrix, f1} pair so callers needing only accuracy
// (e.g. per-step preview) can ignore the extra fields.
export async function evaluateHeldOutConfusion(featureExtractor, labelPredictor, dataset, batchSize, numClasses, numBatches = 3) {
  const predIndices = [];
  const trueIndices = [];
  let accTotal = 0;
  let accCount = 0;
  for (let b = 0; b < numBatches; b++) {
    if (dataset.totalCount === 0) break;
    const size = Math.min(batchSize, dataset.totalCount);
    const { xs, ys } = dataset.sampleBatch(size);
    const { probs, predIdx, trueIdx } = tf.tidy(() => {
      const features = featureExtractor.apply(xs);
      const probs = labelPredictor.apply(features);
      return { probs, predIdx: probs.argMax(-1), trueIdx: ys.argMax(-1) };
    });
    accTotal += await labelAccuracyFromLogits(probs, ys);
    accCount += 1;
    predIndices.push(...(await predIdx.data()));
    trueIndices.push(...(await trueIdx.data()));
    tf.dispose([xs, ys, probs, predIdx, trueIdx]);
  }
  const matrix = computeConfusionMatrix(predIndices, trueIndices, numClasses);
  const { perClass, macroF1 } = computeF1Scores(matrix);
  return {
    valAccuracy: accCount > 0 ? accTotal / accCount : 0,
    confusionMatrix: matrix,
    perClassF1: perClass,
    macroF1,
  };
}

// Evaluates domain-classifier error on held-out source + target batches,
// used to derive PAD after each epoch.
export async function evaluateDomainError(featureExtractor, domainClassifier, sourceVal, targetVal, batchSize) {
  const size = Math.min(batchSize, sourceVal.totalCount, targetVal.totalCount);
  if (size === 0) return 0.5;

  const { xs: xsSource } = sourceVal.sampleBatch(size);
  const xsTarget = targetVal.sampleBatch(size);

  const { probs, labels } = tf.tidy(() => {
    const hSource = featureExtractor.apply(xsSource);
    const hTarget = featureExtractor.apply(xsTarget);
    const probsSource = domainClassifier.apply(hSource);
    const probsTarget = domainClassifier.apply(hTarget);
    const probs = tf.concat([probsSource, probsTarget], 0);
    const labels = tf.concat([tf.zerosLike(probsSource), tf.onesLike(probsTarget)], 0);
    return { probs, labels };
  });

  const accuracy = await domainAccuracyFromLogits(probs, labels);
  tf.dispose([xsSource, xsTarget, probs, labels]);
  return 1 - accuracy; // domain classifier generalization error, epsilon
}
