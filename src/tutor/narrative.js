// Plain-language captions shown in Tutorial mode, one per @step checkpoint
// in trainLoop.js. Each references the specific paper section/equation it
// implements (Ganin et al., "Domain-Adversarial Training of Neural
// Networks", JMLR 2016).
export const STEP_NARRATIVE = {
  'sample-batch': {
    title: 'Draw one source batch, one target batch',
    text: "Algorithm 1 (Sec. 4.2) trains on paired minibatches: labeled examples from the source domain and unlabeled examples from the target domain, sampled independently every step. Only the source batch carries class labels — the target batch is used purely to teach the domain classifier what 'target-domain-looking' features look like.",
  },
  'forward-source': {
    title: 'Feature extractor on the source batch',
    text: 'The shared feature extractor G_f, with parameters theta_f, maps the source images to an embedding h = G_f(x; theta_f). This is the same network the target batch will pass through a moment later — sharing it is what forces the representation to become domain-invariant.',
  },
  'label-loss': {
    title: 'Label prediction loss (source only)',
    text: 'The label predictor G_y consumes h and produces class probabilities; L_y is its cross-entropy against the true source labels — the first term of the saddle-point objective in Eq. 10/18. Target examples never contribute here, since we assume no target labels exist at training time.',
  },
  'forward-target': {
    title: 'Feature extractor on the target batch',
    text: 'The identical G_f is now applied to the unlabeled target batch, producing h\' = G_f(x_target; theta_f). Nothing about G_f changes between this call and the source one above — it is a single shared network with one set of weights.',
  },
  'grl-reverse': {
    title: 'Gradient Reversal Layer',
    text: "R_lambda acts as the identity function going forward (Eq. 16), so it changes nothing about what the domain classifier sees. Its entire effect is in the backward pass (Eq. 17): it flips the sign of the gradient and scales it by lambda_p before it reaches G_f, turning what would be gradient descent on the domain loss into gradient ascent for the feature extractor. In Plain-NN mode this is replaced by stopGradient, which blocks that gradient entirely instead of reversing it.",
  },
  'domain-loss': {
    title: 'Domain classification loss',
    text: 'The domain classifier G_d scores both batches on one binary task: source (label 0) vs. target (label 1). L_d is the binary cross-entropy over the combined batch — the second and third terms of Eq. 10/18. When G_f is doing its adversarial job well, this loss stays high because the features no longer reveal which domain they came from.',
  },
  'backward-and-update': {
    title: 'Saddle-point parameter update',
    text: 'One combined objective, L_y + lambda_p * L_d, is minimized with a single optimizer step over theta_f, theta_y and theta_d together (Eq. 13-15). Because the GRL already negated the domain gradient on the way into G_f, this single minimize call reproduces the paper\'s min-max update exactly: G_y and G_d descend their own losses normally, while G_f is pushed to reduce L_y and simultaneously increase L_d.',
  },
  'epoch-end': {
    title: 'Epoch checkpoint: PAD and validation accuracy',
    text: 'Per Sec. 3.2, Eq. 3, the Proxy A-distance is PAD = 2(1 - 2*epsilon), where epsilon is the domain classifier\'s error rate on held-out source/target data. A shrinking PAD means the two domains are becoming harder to tell apart in feature space — exactly the effect Fig. 2 of the paper shows for DANN versus a source-only baseline.',
  },
};
