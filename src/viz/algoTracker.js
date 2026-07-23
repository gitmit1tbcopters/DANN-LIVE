// Small live view of Algorithm 1 (Sec. 4.2 of the paper), highlighting
// whichever line the current checkpoint corresponds to.
import { STEP_NARRATIVE } from '../tutor/narrative.js';

const ALGO_LINES = [
  { stepId: 'sample-batch', text: 'sample minibatch: source (x, y) + target (x\')' },
  { stepId: 'forward-source', text: 'h <- G_f(x; theta_f)' },
  { stepId: 'label-loss', text: 'L_y <- loss(G_y(h), y)' },
  { stepId: 'forward-target', text: 'h\' <- G_f(x\'; theta_f)' },
  { stepId: 'grl-reverse', text: 'r <- R_lambda(h), r\' <- R_lambda(h\')' },
  { stepId: 'domain-loss', text: 'L_d <- loss(G_d(r), 0) + loss(G_d(r\'), 1)' },
  { stepId: 'backward-and-update', text: 'theta <- theta - mu * grad(L_y + lambda*L_d)' },
  { stepId: 'epoch-end', text: 'epoch end: eval PAD = 2(1-2*epsilon), val accuracy' },
];

export function createAlgoTracker(containerEl) {
  containerEl.innerHTML = `<ol class="algo-list">${ALGO_LINES.map(
    (l) => `<li data-step="${l.stepId}" title="${(STEP_NARRATIVE[l.stepId]?.text ?? '').replace(/"/g, '&quot;')}"><code>${l.text}</code></li>`
  ).join('')}</ol>`;

  function highlight(stepId) {
    containerEl.querySelectorAll('li').forEach((el) => {
      el.classList.toggle('active-line', el.dataset.step === stepId);
    });
  }

  return { highlight };
}
