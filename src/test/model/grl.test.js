import { describe, it, expect } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { gradientReversal } from '../../model/grl.js';

describe('gradientReversal', () => {
  it('is the identity on the forward pass', async () => {
    const x = tf.tensor1d([1, 2, 3, 4]);
    const y = gradientReversal(x, 0.7);
    expect(await y.array()).toEqual(await x.array());
    tf.dispose([x, y]);
  });

  it('negates and scales the gradient by -lambda on the backward pass', async () => {
    const lambda = 0.7;
    const x = tf.tensor1d([1, 2, 3, 4]);
    const upstream = tf.tensor1d([0.1, 0.2, 0.3, 0.4]);

    const identityGrad = tf.grad((x) => x.mul(1))(x, upstream);
    const grlGrad = tf.grad((x) => gradientReversal(x, lambda))(x, upstream);

    const identityVals = await identityGrad.data();
    const grlVals = await grlGrad.data();

    for (let i = 0; i < identityVals.length; i++) {
      expect(grlVals[i]).toBeCloseTo(-lambda * identityVals[i], 5);
    }

    tf.dispose([x, upstream, identityGrad, grlGrad]);
  });

  it('stops gradient entirely when lambda is 0 (plain-NN mode)', async () => {
    const x = tf.tensor1d([1, 2, 3, 4]);
    const upstream = tf.tensor1d([0.1, 0.2, 0.3, 0.4]);

    const grlGrad = tf.grad((x) => gradientReversal(x, 0))(x, upstream);
    const vals = await grlGrad.data();

    for (const v of vals) expect(v).toBeCloseTo(0, 10);

    tf.dispose([x, upstream, grlGrad]);
  });
});
