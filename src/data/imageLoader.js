import * as tf from '@tensorflow/tfjs';

// Decodes a user-uploaded File into an HTMLImageElement.
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// Resizes/crops an image (File, HTMLImageElement, or HTMLCanvasElement) to
// imageSize x imageSize and returns a normalized [0,1] float32 tf.Tensor3D.
export async function loadImageAsTensor(source, imageSize = 64) {
  const img = source instanceof File ? await fileToImage(source) : source;

  const canvas = document.createElement('canvas');
  canvas.width = imageSize;
  canvas.height = imageSize;
  const ctx = canvas.getContext('2d');

  const srcW = img.width ?? img.videoWidth ?? imageSize;
  const srcH = img.height ?? img.videoHeight ?? imageSize;
  const side = Math.min(srcW, srcH);
  const sx = (srcW - side) / 2;
  const sy = (srcH - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, imageSize, imageSize);

  return tf.tidy(() => tf.browser.fromPixels(canvas).toFloat().div(255));
}

// Labeled dataset bucketed by class index — used for the source domain.
export class ClassBucketDataset {
  constructor(imageSize = 64) {
    this.imageSize = imageSize;
    this.buckets = new Map(); // classIndex -> tf.Tensor3D[]
  }

  addExample(classIndex, tensor) {
    if (!this.buckets.has(classIndex)) this.buckets.set(classIndex, []);
    this.buckets.get(classIndex).push(tensor);
  }

  get numClasses() {
    return this.buckets.size;
  }

  get classIndices() {
    return [...this.buckets.keys()].sort((a, b) => a - b);
  }

  get totalCount() {
    let n = 0;
    for (const arr of this.buckets.values()) n += arr.length;
    return n;
  }

  // Splits off a held-out validation fraction per class, returns a new
  // ClassBucketDataset for validation; mutates this dataset to remove those examples.
  splitValidation(valFraction = 0.15) {
    const val = new ClassBucketDataset(this.imageSize);
    for (const [classIndex, arr] of this.buckets.entries()) {
      const shuffled = [...arr];
      tf.util.shuffle(shuffled);
      const nVal = Math.max(1, Math.round(shuffled.length * valFraction));
      const valSlice = shuffled.slice(0, nVal);
      const trainSlice = shuffled.slice(nVal);
      valSlice.forEach((t) => val.addExample(classIndex, t));
      this.buckets.set(classIndex, trainSlice);
    }
    return val;
  }

  // Random batch of size `batchSize`, drawn across all classes, roughly balanced.
  sampleBatch(batchSize) {
    const indices = this.classIndices;
    const numClasses = indices.length;
    return tf.tidy(() => {
      const xsList = [];
      const labelList = [];
      for (let i = 0; i < batchSize; i++) {
        const classIndex = indices[Math.floor(Math.random() * numClasses)];
        const bucket = this.buckets.get(classIndex);
        const tensor = bucket[Math.floor(Math.random() * bucket.length)];
        xsList.push(tensor);
        labelList.push(indices.indexOf(classIndex));
      }
      const xs = tf.stack(xsList);
      const ys = tf.oneHot(tf.tensor1d(labelList, 'int32'), numClasses);
      return { xs, ys };
    });
  }

  dispose() {
    for (const arr of this.buckets.values()) arr.forEach((t) => t.dispose());
    this.buckets.clear();
  }
}

// Unlabeled dataset — used for the target domain. May optionally carry
// ground-truth labels (only ever used for evaluation display, never for training).
export class UnlabeledDataset {
  constructor(imageSize = 64) {
    this.imageSize = imageSize;
    this.tensors = [];
    this.trueLabels = [];
  }

  addExample(tensor, trueLabel = null) {
    this.tensors.push(tensor);
    this.trueLabels.push(trueLabel);
  }

  get totalCount() {
    return this.tensors.length;
  }

  splitValidation(valFraction = 0.15) {
    const val = new UnlabeledDataset(this.imageSize);
    const order = this.tensors.map((_, i) => i);
    tf.util.shuffle(order);
    const nVal = Math.max(1, Math.round(order.length * valFraction));
    const valIdx = new Set(order.slice(0, nVal));
    const keepTensors = [];
    const keepLabels = [];
    order.forEach((i) => {
      if (valIdx.has(i)) val.addExample(this.tensors[i], this.trueLabels[i]);
      else {
        keepTensors.push(this.tensors[i]);
        keepLabels.push(this.trueLabels[i]);
      }
    });
    this.tensors = keepTensors;
    this.trueLabels = keepLabels;
    return val;
  }

  sampleBatch(batchSize) {
    return tf.tidy(() => {
      const xsList = [];
      for (let i = 0; i < batchSize; i++) {
        const idx = Math.floor(Math.random() * this.tensors.length);
        xsList.push(this.tensors[idx]);
      }
      return tf.stack(xsList);
    });
  }

  dispose() {
    this.tensors.forEach((t) => t.dispose());
    this.tensors = [];
    this.trueLabels = [];
  }
}
