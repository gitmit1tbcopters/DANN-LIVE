import { describe, it, expect, afterEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { ClassBucketDataset, UnlabeledDataset } from '../../data/imageLoader.js';

function fakeTensor() {
  return tf.zeros([4, 4, 3]);
}

describe('ClassBucketDataset', () => {
  let dataset;

  afterEach(() => {
    dataset?.dispose();
  });

  it('tracks class indices and total count as examples are added', () => {
    dataset = new ClassBucketDataset(4);
    dataset.addExample(0, fakeTensor());
    dataset.addExample(0, fakeTensor());
    dataset.addExample(1, fakeTensor());

    expect(dataset.numClasses).toBe(2);
    expect(dataset.classIndices).toEqual([0, 1]);
    expect(dataset.totalCount).toBe(3);
  });

  it('sampleBatch returns one-hot labels matching numClasses', () => {
    dataset = new ClassBucketDataset(4);
    dataset.addExample(0, fakeTensor());
    dataset.addExample(1, fakeTensor());
    dataset.addExample(2, fakeTensor());

    const { xs, ys } = dataset.sampleBatch(5);
    expect(xs.shape).toEqual([5, 4, 4, 3]);
    expect(ys.shape).toEqual([5, 3]);
    tf.dispose([xs, ys]);
  });

  it('splitValidation removes examples from the source dataset and returns them in a val set', () => {
    dataset = new ClassBucketDataset(4);
    for (let i = 0; i < 10; i++) dataset.addExample(0, fakeTensor());

    const originalCount = dataset.totalCount;
    const val = dataset.splitValidation(0.2);

    expect(val.totalCount).toBeGreaterThan(0);
    expect(dataset.totalCount + val.totalCount).toBe(originalCount);

    val.dispose();
  });

  it('dispose clears all buckets', () => {
    dataset = new ClassBucketDataset(4);
    dataset.addExample(0, fakeTensor());
    dataset.dispose();
    expect(dataset.totalCount).toBe(0);
    expect(dataset.numClasses).toBe(0);
  });
});

describe('UnlabeledDataset', () => {
  let dataset;

  afterEach(() => {
    dataset?.dispose();
  });

  it('tracks total count and optional true labels', () => {
    dataset = new UnlabeledDataset(4);
    dataset.addExample(fakeTensor(), 0);
    dataset.addExample(fakeTensor());

    expect(dataset.totalCount).toBe(2);
    expect(dataset.trueLabels).toEqual([0, null]);
  });

  it('sampleBatch stacks the requested number of tensors', () => {
    dataset = new UnlabeledDataset(4);
    dataset.addExample(fakeTensor());
    dataset.addExample(fakeTensor());

    const xs = dataset.sampleBatch(3);
    expect(xs.shape).toEqual([3, 4, 4, 3]);
    tf.dispose(xs);
  });

  it('splitValidation preserves total example count across both sets', () => {
    dataset = new UnlabeledDataset(4);
    for (let i = 0; i < 10; i++) dataset.addExample(fakeTensor(), i);

    const originalCount = dataset.totalCount;
    const val = dataset.splitValidation(0.3);

    expect(dataset.totalCount + val.totalCount).toBe(originalCount);
    val.dispose();
  });
});
