import * as tf from '@tensorflow/tfjs';
import { UnlabeledDataset } from './imageLoader.js';

// Fallback target-domain generator, used only when the user does not upload
// a separate target-domain image set. Mirrors the MNIST -> MNIST-M recipe
// from Ganin et al. 2016 (Sec. 5.1.1): I_out[i,j,k] = |I1[i,j,k] - I2[i,j,k]|,
// where I1 is the source digit and I2 is a photo-like color patch. Since we
// can't fetch the original BSDS500 photo crops offline, I2 is generated
// procedurally as a smooth random-color gradient patch, then a handful of
// additional shifts (color cast, contrast, noise, rotation) are layered on
// top so the shift is visible and non-trivial even on already-colorful inputs.

function randomColorPatch(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, size, size);
  const c1 = [Math.random() * 255, Math.random() * 255, Math.random() * 255];
  const c2 = [Math.random() * 255, Math.random() * 255, Math.random() * 255];
  grad.addColorStop(0, `rgb(${c1[0]},${c1[1]},${c1[2]})`);
  grad.addColorStop(1, `rgb(${c2[0]},${c2[1]},${c2[2]})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return tf.tidy(() => tf.browser.fromPixels(canvas).toFloat().div(255));
}

function toRGB(tensor) {
  // tensor: [H,W,1] or [H,W,3] float in [0,1] -> [H,W,3]
  if (tensor.shape[2] === 3) return tensor.clone();
  return tf.tidy(() => tf.tile(tensor, [1, 1, 3]));
}

function colorCast(tensor) {
  return tf.tidy(() => {
    const shift = tf.tensor1d([
      0.7 + Math.random() * 0.6,
      0.7 + Math.random() * 0.6,
      0.7 + Math.random() * 0.6,
    ]);
    return tensor.mul(shift).clipByValue(0, 1);
  });
}

function addNoise(tensor, amount = 0.08) {
  return tf.tidy(() => {
    const noise = tf.randomUniform(tensor.shape, -amount, amount);
    return tensor.add(noise).clipByValue(0, 1);
  });
}

function adjustContrast(tensor, factor = 1.3) {
  return tf.tidy(() => tensor.sub(0.5).mul(factor).add(0.5).clipByValue(0, 1));
}

function rotateSmall(tensor) {
  return tf.tidy(() => {
    const batched = tensor.expandDims(0);
    const radians = (Math.random() * 30 - 15) * (Math.PI / 180);
    const rotated = tf.image.rotateWithOffset(batched, radians, 0.5, 0.5);
    return rotated.squeeze([0]);
  });
}

// Applies the MNIST-M-style absolute-difference blend plus a random subset
// of secondary shifts, returning a new tensor (input tensor is left untouched).
export function domainShiftImage(sourceTensor, imageSize) {
  return tf.tidy(() => {
    const rgb = toRGB(sourceTensor);
    const patch = randomColorPatch(imageSize);
    let out = rgb.sub(patch).abs();

    if (Math.random() < 0.6) out = colorCast(out);
    if (Math.random() < 0.5) out = adjustContrast(out);
    if (Math.random() < 0.5) out = addNoise(out);
    if (Math.random() < 0.4) out = rotateSmall(out);

    return out.clipByValue(0, 1);
  });
}

// Builds a synthetic target-domain dataset from an existing labeled source
// dataset (a ClassBucketDataset). True labels are carried along only for
// evaluation/visualization — training code must never read them.
export function generateSyntheticTargetDataset(sourceDataset, imageSize) {
  const target = new UnlabeledDataset(imageSize);
  for (const classIndex of sourceDataset.classIndices) {
    const bucket = sourceDataset.buckets.get(classIndex);
    for (const sourceTensor of bucket) {
      const shifted = domainShiftImage(sourceTensor, imageSize);
      target.addExample(shifted, classIndex);
    }
  }
  return target;
}
