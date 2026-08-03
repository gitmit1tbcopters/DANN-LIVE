// Small live view of Algorithm 1 (Sec. 4.2 of the paper), highlighting
// whichever line the current checkpoint corresponds to.
import { STEP_NARRATIVE } from '../tutor/narrative.js';

const ALGO_LINES = [
  { text: '# --- schedules, computed once per step (p = training progress, 0->1) ---' },
  { text: 'lambda <- 2 / (1 + exp(-gamma * p)) - 1   # gamma = 10' },
  { text: 'mu <- mu_0 / (1 + alpha * p)^beta         # mu_0=0.01, alpha=10, beta=0.75' },
  { text: '# --- minibatch step ---' },
  { stepId: 'sample-batch', text: "minibatch: source (x, y) + target (x')" },
  { stepId: 'forward-source', text: 'h <- G_f(x; theta_f)               # source features' },
  { stepId: 'label-loss', text: 'y_pred <- G_y(h; theta_y)          # label prediction, uses theta_y explicitly' },
  { stepId: 'label-loss', text: 'L_y <- loss(y_pred, y)             # source only, depends on theta_f AND theta_y' },
  { stepId: 'forward-target', text: "h' <- G_f(x'; theta_f)              # target features" },
  { stepId: 'grl-reverse', text: 'r <- R(h)                          # GRL, source side: identity fwd, -I backward' },
  { stepId: 'grl-reverse', text: "r' <- R(h')                         # GRL, target side" },
  { stepId: 'domain-loss', text: 'd_pred_src <- G_d(r; theta_d)      # domain prediction, uses theta_d explicitly' },
  { stepId: 'domain-loss', text: "d_pred_tgt <- G_d(r'; theta_d)" },
  { stepId: 'domain-loss', text: 'L_d <- loss(d_pred_src, 0) + loss(d_pred_tgt, 1)  # depends on theta_f (via GRL) AND theta_d' },
  { stepId: 'backward-and-update', text: '# one combined backward pass -- GRL handles the sign, no manual split' },
  { stepId: 'backward-and-update', text: 'total_loss <- L_y + lambda * L_d(theta_f, theta_y, theta_d)' },
  { stepId: 'backward-and-update', text: '<- (theta_f, theta_y, theta_d) - mu * grad(total_loss)' },
  { stepId: 'epoch-end', text: 'epoch end: eval PAD = 2(1-2*epsilon), val accuracy' },
];

function renderLine(text) {
  if (text.startsWith('#')) return `<span class="algo-comment">${text}</span>`;
  const hashIdx = text.indexOf('#');
  if (hashIdx === -1) return `<span class="algo-code">${text}</span>`;
  const code = text.slice(0, hashIdx).replace(/\s+$/, '');
  const comment = text.slice(hashIdx);
  return `<span class="algo-code">${code}</span>  <span class="algo-comment">${comment}</span>`;
}

export function createAlgoTracker(containerEl) {
  containerEl.innerHTML = `<ol class="algo-list">${ALGO_LINES.map(
    (l) => `<li${l.stepId ? ` data-step="${l.stepId}"` : ''} title="${(STEP_NARRATIVE[l.stepId]?.text ?? '').replace(/"/g, '&quot;')}"><code>${renderLine(l.text)}</code></li>`
  ).join('')}</ol>`;

  function highlight(stepId) {
    containerEl.querySelectorAll('li').forEach((el) => {
      el.classList.toggle('active-line', el.dataset.step === stepId);
    });
  }

  return { highlight };
}
