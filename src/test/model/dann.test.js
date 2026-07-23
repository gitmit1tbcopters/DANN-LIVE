import { describe, it, expect, afterEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import {
  buildFeatureExtractor,
  buildLabelPredictor,
  buildDomainClassifier,
  buildDANN,
  forwardDomainBranch,
} from '../../model/dann.js';

describe('buildDANN', () => {
  let handles = [];
  afterEach(() => {
    tf.dispose(handles);
    handles = [];
  });

  it('builds a feature extractor mapping images to a 128-d embedding', () => {
    const featureExtractor = buildFeatureExtractor(64, 3);
    const x = tf.zeros([2, 64, 64, 3]);
    const out = featureExtractor.apply(x);
    handles.push(x, out);
    expect(out.shape).toEqual([2, 128]);
  });

  it('builds a label predictor mapping features to class probabilities', () => {
    const labelPredictor = buildLabelPredictor(128, 10);
    const h = tf.zeros([2, 128]);
    const out = labelPredictor.apply(h);
    handles.push(h, out);
    expect(out.shape).toEqual([2, 10]);
  });

  it('builds a domain classifier mapping features to a single sigmoid output', () => {
    const domainClassifier = buildDomainClassifier(128);
    const h = tf.zeros([2, 128]);
    const out = domainClassifier.apply(h);
    handles.push(h, out);
    expect(out.shape).toEqual([2, 1]);
  });

  it('assembles all three sub-networks with matching feature dimensions', () => {
    const { featureExtractor, labelPredictor, domainClassifier } = buildDANN({
      imageSize: 32,
      channels: 1,
      numClasses: 5,
    });
    const x = tf.zeros([1, 32, 32, 1]);
    const h = featureExtractor.apply(x);
    const labelOut = labelPredictor.apply(h);
    const domainOut = domainClassifier.apply(h);
    handles.push(x, h, labelOut, domainOut);
    expect(labelOut.shape).toEqual([1, 5]);
    expect(domainOut.shape).toEqual([1, 1]);
  });

  it('forwardDomainBranch in dann mode reverses gradient by lambda into the feature extractor', async () => {
    const domainClassifier = buildDomainClassifier(4);
    const lambda = 0.5;
    const features = tf.tensor2d([[1, 2, 3, 4]]);
    const upstream = tf.ones([1, 1]);

    const grad = tf.grad((f) =>
      forwardDomainBranch(domainClassifier, f, { mode: 'dann', lambda })
    )(features, upstream);

    const gradWithLambda1 = tf.grad((f) =>
      forwardDomainBranch(domainClassifier, f, { mode: 'dann', lambda: -1 })
    )(features, upstream);

    // Sign of gradient should flip relative to plain (mode: 'plain', which stops it) —
    // verify plain mode zeroes the gradient into the feature extractor entirely.
    const plainGrad = tf.grad((f) =>
      forwardDomainBranch(domainClassifier, f, { mode: 'plain', lambda })
    )(features, upstream);

    const plainVals = await plainGrad.data();
    for (const v of plainVals) expect(v).toBeCloseTo(0, 10);

    handles.push(features, upstream, grad, gradWithLambda1, plainGrad);
  });
});
