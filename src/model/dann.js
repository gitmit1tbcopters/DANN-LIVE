import * as tf from '@tensorflow/tfjs';
import { gradientReversal } from './grl.js';

// Architecture follows the depth pattern of Fig. 4 in Ganin et al. 2016,
// scaled down for 64x64 browser-uploaded images rather than the paper's
// 28x28/32x32 benchmark sets.
export function buildFeatureExtractor(imageSize = 64, channels = 3) {
  return tf.sequential({
    name: 'featureExtractor',
    layers: [
      tf.layers.conv2d({
        inputShape: [imageSize, imageSize, channels],
        filters: 32,
        kernelSize: 5,
        padding: 'same',
        activation: 'relu',
      }),
      tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }),
      tf.layers.conv2d({ filters: 64, kernelSize: 5, padding: 'same', activation: 'relu' }),
      tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }),
      tf.layers.conv2d({ filters: 128, kernelSize: 3, padding: 'same', activation: 'relu' }),
      tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }),
      tf.layers.flatten(),
      tf.layers.dense({ units: 128, activation: 'relu', name: 'embedding' }),
    ],
  });
}

// G_y — label predictor, trained on source-domain samples only.
export function buildLabelPredictor(featureDim = 128, numClasses = 10) {
  return tf.sequential({
    name: 'labelPredictor',
    layers: [
      tf.layers.dense({ inputShape: [featureDim], units: 64, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.5 }),
      tf.layers.dense({ units: numClasses, activation: 'softmax' }),
    ],
  });
}

// G_d — domain classifier, trained on source+target samples via the GRL.
export function buildDomainClassifier(featureDim = 128) {
  return tf.sequential({
    name: 'domainClassifier',
    layers: [
      tf.layers.dense({ inputShape: [featureDim], units: 64, activation: 'relu' }),
      tf.layers.dense({ units: 1, activation: 'sigmoid' }),
    ],
  });
}

export function buildDANN({ imageSize = 64, channels = 3, numClasses = 10 } = {}) {
  const featureExtractor = buildFeatureExtractor(imageSize, channels);
  const labelPredictor = buildLabelPredictor(128, numClasses);
  const domainClassifier = buildDomainClassifier(128);
  return { featureExtractor, labelPredictor, domainClassifier };
}

// Forward composition helper used both in Plain-NN and DANN modes.
// mode: 'dann' routes the domain branch through the GRL (adversarial);
// 'plain' forces lambda to 0 through the same GRL op (-0 * grad == stop-gradient
// — tf.stopGradient isn't part of tfjs's public API), so no gradient reaches
// G_f, reproducing the paper's Fig. 2 "source only" comparison.
export function forwardDomainBranch(domainClassifier, features, { mode, lambda }) {
  const routed = gradientReversal(features, mode === 'dann' ? lambda : 0);
  return domainClassifier.apply(routed);
}
