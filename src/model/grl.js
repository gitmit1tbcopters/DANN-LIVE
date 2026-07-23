import * as tf from '@tensorflow/tfjs';

// @step grl-reverse
// Gradient Reversal Layer — Ganin et al. 2016, Eq. 16-18.
// Forward: identity. Backward: gradient multiplied by -lambda.
// tf.customGrad is the only way to express this in TF.js: the Layers API
// has no notion of a layer whose backward pass differs in sign from its
// forward pass, since every built-in op's gradient is derived automatically
// from its forward math.
export function gradientReversal(x, lambda) {
  const grl = tf.customGrad((x, save) => {
    save([x]);
    return {
      value: x.clone(),
      gradFunc: (dy) => [dy.mul(tf.scalar(-lambda))],
    };
  });
  return grl(x);
}

// Dev-mode assertion: confirms the gradient flowing back through the GRL
// is exactly -lambda times the gradient flowing in. Only small scalars are
// read here (mean of tiny tensors), so this is safe to call during real training.
export async function assertGrlGradientFlip(lambda = 0.7) {
  const x = tf.tensor1d([1, 2, 3, 4]);
  const upstream = tf.tensor1d([0.1, 0.2, 0.3, 0.4]);

  const identityGrad = tf.grad((x) => x.mul(1))(x, upstream);
  const grlGrad = tf.grad((x) => gradientReversal(x, lambda))(x, upstream);

  const identityVals = await identityGrad.data();
  const grlVals = await grlGrad.data();

  let ok = true;
  for (let i = 0; i < identityVals.length; i++) {
    const expected = -lambda * identityVals[i];
    if (Math.abs(grlVals[i] - expected) > 1e-5) ok = false;
  }

  console.assert(ok, '[GRL] gradient sign/scale check FAILED', { identityVals, grlVals, lambda });
  if (ok) console.log(`[GRL] gradient check OK: dGRL/dx == -${lambda} * dx for all elements`);

  tf.dispose([x, upstream, identityGrad, grlGrad]);
  return ok;
}
