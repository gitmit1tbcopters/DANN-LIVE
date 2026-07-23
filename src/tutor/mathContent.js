// Symbol legend shown once at the top of the "Live Training Math" panel,
// so readers unfamiliar with the paper's notation (Ganin et al., JMLR 2016)
// can look up any symbol used in the per-step equations below. Each entry's
// `id` becomes a CSS class (`.sym-<id>`, see layout.css) so the same symbol
// gets one color in dark mode and a separately-tuned, higher-contrast color
// in light mode, instead of a single inline hex baked in at render time.
export const SYMBOL_LEGEND = [
  { id: 'x', symbol: '\\mathbf{x}', meaning: 'input image' },
  { id: 'y', symbol: 'y', meaning: 'true class label (source only)' },
  { id: 'd', symbol: 'd', meaning: 'domain label: 0 = source, 1 = target' },
  { id: 'gf', symbol: 'G_f', meaning: 'feature extractor network' },
  { id: 'thetaf', symbol: '\\theta_f', meaning: 'feature extractor parameters (\\(\\mathbf{W}, \\mathbf{b}\\) in the shallow case)' },
  { id: 'h', symbol: 'h', meaning: 'feature representation, \\(h = G_f(\\mathbf{x})\\)' },
  { id: 'gy', symbol: 'G_y', meaning: 'label predictor network' },
  { id: 'thetay', symbol: '\\theta_y', meaning: 'label predictor parameters (\\(\\mathbf{V}, \\mathbf{c}\\) in the shallow case)' },
  { id: 'ly', symbol: '\\mathcal{L}_y', meaning: 'label prediction loss (cross-entropy, source only)' },
  { id: 'gd', symbol: 'G_d', meaning: 'domain classifier network' },
  { id: 'thetad', symbol: '\\theta_d', meaning: 'domain classifier parameters (\\(\\mathbf{u}, z\\) in the shallow case)' },
  { id: 'ld', symbol: '\\mathcal{L}_d', meaning: 'domain classification loss (binary cross-entropy)' },
  { id: 'lambda', symbol: '\\lambda', meaning: 'domain-loss trade-off weight' },
  { id: 'divergence', symbol: '\\mathcal{H}', meaning: '\\(\\mathcal{H}\\)-divergence hypothesis class' },
  { id: 'pad', symbol: '\\mathcal{A}', meaning: '\\(\\mathcal{A}\\)-distance (PAD)' },
];

// Fixed initial values reused by every worked example below, so the numbers
// carry over unchanged from one training step to the next instead of each
// equation inventing its own. Follows Algorithm 1 (paper, p.10, line 3-4):
// W, V <- random_init(D); b, c, u, z <- 0. The paper does not fix concrete
// entries for W, V (only "random_init"), so a small illustrative matrix is
// used for each here; every bias/offset term is exactly 0 as prescribed.
export const INITIAL_VALUES = [
  { symbol: '\\mathbf{W}', value: '\\begin{bmatrix}2 & 0\\\\ 0 & 2\\end{bmatrix}\\ \\text{(random\\_init)}' },
  { symbol: '\\mathbf{b}', value: '[0,\\,0]' },
  { symbol: '\\mathbf{V}', value: '\\begin{bmatrix}1 & 1\\\\ 0 & -1\\\\ -1 & 0\\end{bmatrix}\\ \\text{(random\\_init)}' },
  { symbol: '\\mathbf{c}', value: '[0,\\,0,\\,0]' },
  { symbol: '\\mathbf{u}', value: '[0,\\,0]' },
  { symbol: 'z', value: '0' },
];

// Mirrors the code panel's job (one block per @step checkpoint in
// trainLoop.js) but shows the paper's equations for that step instead of the
// implementing code, with a step-by-step explanation underneath. Every
// "example" field continues one running numeric example (source image
// x_i = [1, 0] labeled "7"; target image x_j = [0.5, 0.5], unlabeled) so a
// reader can follow the same numbers from batch sampling all the way to
// the backward pass, rather than each step introducing fresh numbers.
export const STEP_MATH = {
  'sample-batch': {
    title: 'Draw one source batch, one target batch',
    equations: [
      {
        label: 'Eq. (Sec. 4.2)',
        latex: 'S = \\{(\\mathbf{x}_i, y_i)\\}_{i=1}^{n} \\sim (\\mathcal{D}_S)^n \\qquad T = \\{\\mathbf{x}_i\\}_{i=n+1}^{N} \\sim (\\mathcal{D}_T^X)^{n\'}',
        example: 'Say n=1, n\'=1. \\(S = \\{(\\mathbf{x}_i,\\,y_i)\\} = \\{([1,\\,0],\\,\\text{"7"})\\}\\) — one labeled digit crop, class index \\(y_i=0\\). \\(T = \\{\\mathbf{x}_j\\} = \\{[0.5,\\,0.5]\\}\\) — one unlabeled photo. These two images are carried through every step below.',
      },
    ],
    steps: [
      'S is the labeled source sample: n pairs of (image, class label), drawn i.i.d. from the source distribution \\(\\mathcal{D}_S\\).',
      'T is the unlabeled target sample: n\' images only, drawn i.i.d. from the marginal target distribution \\(\\mathcal{D}_T^X\\) (no labels observed).',
      'Algorithm 1 samples one mini-batch pair \\((\\mathbf{x}_i, y_i)\\) from S and \\(\\mathbf{x}_j\\) from T for each stochastic step.',
    ],
  },
  'forward-source': {
    title: 'Feature extractor on the source batch',
    equations: [
      {
        label: 'Eq. 4',
        latex: 'G_f(\\mathbf{x}; \\mathbf{W}, \\mathbf{b}) = \\operatorname{sigm}(\\mathbf{W}\\mathbf{x} + \\mathbf{b})',
        example: '\\(\\mathbf{x}_i=[1,\\,0]\\), \\(\\mathbf{W}=\\begin{bmatrix}2 & 0\\\\ 0 & 2\\end{bmatrix}\\), \\(\\mathbf{b}=[0,\\,0]\\): \\(\\mathbf{Wx}_i+\\mathbf{b}=[2,\\,0]\\), \\(\\operatorname{sigm}(2)\\approx0.88\\), \\(\\operatorname{sigm}(0)=0.5\\), so \\(h = G_f(\\mathbf{x}_i) \\approx [0.88,\\,0.5]\\).',
      },
    ],
    steps: [
      '\\(G_f\\) maps the raw image \\(\\mathbf{x}_i\\) to a D-dimensional feature vector \\(h = G_f(\\mathbf{x}_i)\\).',
      'In the shallow (linear) case this is one affine map through \\(\\mathbf{W}, \\mathbf{b}\\) followed by a sigmoid; deeper nets stack several such layers inside \\(G_f\\).',
      'The same \\(h\\) feeds both the label predictor (next step) and, on the target side, the domain classifier.',
    ],
  },
  'label-loss': {
    title: 'Label prediction loss (source only)',
    equations: [
      {
        label: 'Eq. 5 (softmax)',
        latex: 'G_y(G_f(\\mathbf{x}); \\mathbf{V}, \\mathbf{c}) = \\operatorname{softmax}(\\mathbf{V}h + \\mathbf{c})',
        example: 'Continuing with \\(h\\approx[0.88,\\,0.5]\\), \\(\\mathbf{V}=\\begin{bmatrix}1 & 1\\\\ 0 & -1\\\\ -1 & 0\\end{bmatrix}\\), \\(\\mathbf{c}=[0,\\,0,\\,0]\\) (3 classes): \\(\\mathbf{V}h+\\mathbf{c}=[1.38,\\,-0.5,\\,-0.88]\\). \\(e^{1.38}{:}e^{-0.5}{:}e^{-0.88} \\approx 3.97{:}0.61{:}0.41\\), so \\(\\operatorname{softmax} \\approx [0.80,\\,0.12,\\,0.08]\\) — class 0 gets 80%.',
      },
      {
        label: 'Eq. 2 (label loss)',
        latex: '\\mathcal{L}_y\\big(G_y(G_f(\\mathbf{x}_i)), y_i\\big) = \\log \\frac{1}{G_y(G_f(\\mathbf{x}_i))_{y_i}}',
        example: 'True label class 0, model gave it probability 0.80: \\(\\mathcal{L}_y = \\log(1/0.80) \\approx 0.22\\). Had the model instead given only 0.1 to the true class, the loss would jump to \\(\\log(1/0.1) \\approx 2.30\\) — wrong-and-confident is penalized much harder.',
      },
    ],
    steps: [
      'The label predictor \\(G_y\\) turns \\(h = G_f(\\mathbf{x}_i)\\) into class probabilities via softmax.',
      '\\(\\mathcal{L}_y\\) is the negative log-probability assigned to the true label \\(y_i\\) — ordinary cross-entropy.',
      'Only source examples carry a label, so this loss is computed on the source batch alone. It is the first term of the saddle-point objective E in Eq. 10 / Eq. 18.',
    ],
  },
  'forward-target': {
    title: 'Feature extractor on the target batch',
    equations: [
      {
        label: 'Eq. 4 (reused)',
        latex: "G_f(\\mathbf{x}_j; \\mathbf{W}, \\mathbf{b}) = \\operatorname{sigm}(\\mathbf{W}\\mathbf{x}_j + \\mathbf{b}) \\;=\\; h'",
        example: 'Same \\(\\mathbf{W}=\\begin{bmatrix}2 & 0\\\\ 0 & 2\\end{bmatrix}\\), \\(\\mathbf{b}=[0,\\,0]\\) as before, now on the target image \\(\\mathbf{x}_j=[0.5,\\,0.5]\\): \\(\\mathbf{Wx}_j+\\mathbf{b}=[1,\\,1]\\), so \\(h\'=[\\operatorname{sigm}(1),\\,\\operatorname{sigm}(1)]\\approx[0.73,\\,0.73]\\).',
      },
    ],
    steps: [
      'The identical \\(G_f\\) — same \\(\\mathbf{W}, \\mathbf{b}\\) just used on the source batch — is now applied to the unlabeled target image \\(\\mathbf{x}_j\\).',
      'This produces \\(h\'\\), the target feature vector. Unlike the source path, \\(h\'\\) never reaches \\(G_y\\) — there is no target label to predict.',
      '\\(h\'\\) is what the domain classifier will see next, after passing through the gradient reversal layer.',
    ],
  },
  'grl-reverse': {
    title: 'Gradient reversal layer',
    equations: [
      {
        label: 'Eq. 16 (forward)',
        latex: '\\mathcal{R}(h) = h',
        example: 'Forward pass is the identity: \\(h\'=[0.73,\\,0.73]\\) passes through unchanged, \\(\\mathcal{R}(h\')=[0.73,\\,0.73]\\). \\(G_d\\) sees exactly the same features \\(G_f\\) produced.',
      },
      {
        label: 'Eq. 17 (backward)',
        latex: '\\frac{d\\mathcal{R}}{dh} = -\\mathbf{I}',
        example: 'If the gradient arriving from \\(\\mathcal{L}_d\\) were \\([0.2,\\,-0.1]\\), the GRL flips its sign to \\([-0.2,\\,0.1]\\) before it continues backward into \\(G_f\\).',
      },
    ],
    steps: [
      'On the forward pass the GRL is transparent — it copies its input straight through, so \\(G_d\\) trains normally on whatever features \\(G_f\\) currently produces.',
      'On the backward pass it multiplies the incoming gradient by \\(-\\mathbf{I}\\), i.e. the sign is flipped, before continuing into \\(G_f\\).',
      'This single "pseudo-function" lets standard SGD/backprop implement the min–max saddle point of Eq. 11–12 without a separate maximization step. (Plain-NN mode replaces the sign flip with a hard gradient stop.)',
    ],
  },
  'domain-loss': {
    title: 'Domain classification loss',
    equations: [
      {
        label: 'Eq. 7',
        latex: 'G_d(G_f(\\mathbf{x}); \\mathbf{u}, z) = \\operatorname{sigm}(\\mathbf{u}^\\top G_f(\\mathbf{x}) + z)',
        example: 'At initialization \\(\\mathbf{u}=[0,\\,0]\\), \\(z=0\\) (Algorithm 1, line 4), so regardless of \\(h\'=[0.73,\\,0.73]\\): \\(\\mathbf{u}^\\top h\' = 0\\), \\(G_d(h\')=\\operatorname{sigm}(0)=0.5\\) — before any training, the classifier is completely unsure whether this came from source or target.',
      },
      {
        label: 'Eq. 3 (domain loss)',
        latex: '\\mathcal{L}_d\\big(G_d(G_f(\\mathbf{x}_i)), d_i\\big) = d_i \\log \\frac{1}{G_d(G_f(\\mathbf{x}_i))} + (1-d_i) \\log \\frac{1}{1-G_d(G_f(\\mathbf{x}_i))}',
        example: 'For the target example (\\(d_j{=}1\\)) with \\(G_d(h\')=0.5\\): only the first term survives, \\(\\mathcal{L}_d = \\log(1/0.5) = \\log 2 \\approx 0.69\\) — the maximum possible binary cross-entropy, meaning the features gave the domain classifier no useful signal at all.',
      },
    ],
    steps: [
      '\\(G_d\\) is a logistic regressor predicting whether a feature vector came from source (\\(d=0\\)) or target (\\(d=1\\)).',
      '\\(\\mathcal{L}_d\\) is binary cross-entropy, computed on both source and target examples.',
      'The adversarial part of DANN comes from how \\(G_f\\) and \\(G_d\\) are updated with respect to this same loss (next step) — \\(G_d\\) wants to minimize it, \\(G_f\\) is pushed to maximize it.',
    ],
  },
  'backward-and-update': {
    title: 'Backward pass and parameter update',
    equations: [
      {
        label: 'Eq. 13',
        latex: '\\theta_f \\leftarrow \\theta_f - \\mu\\left(\\frac{\\partial \\mathcal{L}_y^i}{\\partial \\theta_f} - \\lambda \\frac{\\partial \\mathcal{L}_d^i}{\\partial \\theta_f}\\right)',
        example: 'With \\(\\mu=0.1\\), \\(\\lambda=0.5\\), \\(\\partial\\mathcal{L}_y/\\partial\\theta_f = 0.4\\), \\(\\partial\\mathcal{L}_d/\\partial\\theta_f = 0.2\\): \\(\\theta_f \\leftarrow \\theta_f - 0.1(0.4 - 0.5\\times0.2) = \\theta_f - 0.03\\).',
      },
      {
        label: 'Eq. 14',
        latex: '\\theta_y \\leftarrow \\theta_y - \\mu \\frac{\\partial \\mathcal{L}_y^i}{\\partial \\theta_y}',
        example: 'With \\(\\mu=0.1\\), \\(\\partial\\mathcal{L}_y/\\partial\\theta_y = 0.6\\): \\(\\theta_y \\leftarrow \\theta_y - 0.1\\times0.6 = \\theta_y - 0.06\\) — ordinary gradient descent, no sign trick.',
      },
      {
        label: 'Eq. 15',
        latex: '\\theta_d \\leftarrow \\theta_d - \\mu\\lambda \\frac{\\partial \\mathcal{L}_d^i}{\\partial \\theta_d}',
        example: 'With \\(\\mu=0.1\\), \\(\\lambda=0.5\\), \\(\\partial\\mathcal{L}_d/\\partial\\theta_d = 0.2\\): \\(\\theta_d \\leftarrow \\theta_d - 0.1\\times0.5\\times0.2 = \\theta_d - 0.01\\) — also ordinary descent, just scaled by \\(\\lambda\\).',
      },
    ],
    steps: [
      'All three equations look like ordinary SGD descent — the trick is entirely in the sign of the \\(\\theta_f\\) update.',
      '\\(\\theta_y\\) (label predictor) and \\(\\theta_d\\) (domain classifier) each descend their own loss normally, as usual gradient descent would.',
      '\\(\\theta_f\\) (feature extractor) is pushed to *decrease* \\(\\mathcal{L}_y\\) while simultaneously pushed to *increase* \\(\\mathcal{L}_d\\) — the minus sign in front of \\(\\lambda \\partial\\mathcal{L}_d/\\partial\\theta_f\\) is the adversarial part.',
      'Because the GRL already negated \\(\\partial\\mathcal{L}_d/\\partial\\theta_f\\) on the way backward (Eq. 17), a single combined loss \\(\\mathcal{L}_y + \\lambda\\mathcal{L}_d\\) minimized by one ordinary optimizer step reproduces Eq. 13–15 exactly — the code\'s single `minimize()` call.',
    ],
  },
  'epoch-end': {
    title: 'Epoch checkpoint: Proxy A-distance',
    equations: [
      {
        label: 'Eq. 1 (\\(\\mathcal{H}\\)-divergence)',
        latex: 'd_{\\mathcal{H}}(\\mathcal{D}_S^X, \\mathcal{D}_T^X) = 2\\left(1 - \\min_{\\eta\\in\\mathcal{H}}\\left[\\frac{1}{n}\\sum_{i=1}^{n} I[\\eta(\\mathbf{x}_i){=}0] + \\frac{1}{n\'}\\sum_{i=n+1}^{N} I[\\eta(\\mathbf{x}_i){=}1]\\right]\\right)',
        example: 'With n=n\'=4 and the best domain-discriminating \\(\\eta\\) still misclassifying 1 of 4 on each side: \\(\\tfrac{1}{4}+\\tfrac{1}{4}=0.5\\) error sum, so \\(d_{\\mathcal{H}} = 2(1-0.5) = 1\\).',
      },
      {
        label: 'Eq. 3 (PAD)',
        latex: '\\hat{d}_{\\mathcal{A}} = 2(1 - 2\\epsilon)',
        example: 'A held-out domain classifier with test error \\(\\epsilon=0.3\\) (30% of source vs. target images misclassified) gives \\(\\hat{d}_{\\mathcal{A}} = 2(1-2\\times0.3) = 2\\times0.4 = 0.8\\) PAD — DANN\'s goal is to shrink this over training.',
      },
    ],
    steps: [
      'PAD (proxy \\(\\mathcal{A}\\)-distance) is computed from a held-out domain classifier\'s error rate \\(\\epsilon\\), standing in for the \\(\\mathcal{H}\\)-divergence instead of the intractable min over all hypotheses in Eq. 1.',
      'PAD ranges from 0 (domains fully overlap, \\(\\epsilon = 0.5\\)) to 2 (domains perfectly separable, \\(\\epsilon = 0\\)). Shrinking PAD across epochs is the paper\'s Fig. 2 evidence that DANN is making source and target features harder to tell apart.',
    ],
  },
};
