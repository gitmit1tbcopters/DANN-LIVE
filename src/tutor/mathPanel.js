import katex from 'katex';
import { STEP_MATH, SYMBOL_LEGEND, INITIAL_VALUES } from './mathContent.js';

// Longest-symbol-first so e.g. `\theta_f` outranks a lone `f`, and `G_f`
// outranks a lone `G`. Combined into one alternation and scanned in a
// single pass (rather than sequential .replace calls) so a symbol's own
// wrapper class name can never be re-matched by a later rule. Each match
// gets a `\class{sym-<id>}{...}` wrapper (KaTeX's CSS-class command)
// instead of a baked-in inline hex, so light/dark themes can each define
// their own contrast-tuned color for that class in layout.css.
const COLOR_RULES = [...SYMBOL_LEGEND].sort((a, b) => b.symbol.length - a.symbol.length);
const COLOR_SCAN_RE = new RegExp(
  COLOR_RULES.map(({ symbol }) => {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isBareLetter = /^[a-zA-Z]$/.test(symbol);
    return isBareLetter ? `(?<![a-zA-Z\\\\_{])${escaped}(?![a-zA-Z_}])` : escaped;
  }).join('|'),
  'g'
);
const CLASS_BY_SYMBOL = new Map(COLOR_RULES.map(({ symbol, id }) => [symbol, id]));

function colorizeLatex(latex) {
  return latex.replace(COLOR_SCAN_RE, (m) => `\\htmlClass{sym-${CLASS_BY_SYMBOL.get(m)}}{${m}}`);
}

const STEP_ORDER = [
  'sample-batch',
  'forward-source',
  'label-loss',
  'forward-target',
  'grl-reverse',
  'domain-loss',
  'backward-and-update',
  'epoch-end',
];

const KATEX_OPTS = { throwOnError: false, trust: true, strict: false };

function renderLatex(latex) {
  try {
    return katex.renderToString(colorizeLatex(latex), { ...KATEX_OPTS, displayMode: true });
  } catch {
    return latex;
  }
}

// Math panel mirrors the code panel's job (one block per @step checkpoint
// in trainLoop.js) but shows the paper's equations for that step instead
// of the implementing code, with a step-by-step explanation underneath.
function renderInlineLatex(text) {
  return text.replace(/\\\((.+?)\\\)/g, (_, expr) => katex.renderToString(colorizeLatex(expr), { ...KATEX_OPTS, displayMode: false }));
}

function renderLegend() {
  const rows = SYMBOL_LEGEND
    .map((entry) => `<li><span class="math-legend-symbol">${katex.renderToString(`\\htmlClass{sym-${entry.id}}{${entry.symbol}}`, { ...KATEX_OPTS, displayMode: false })}</span><span class="math-legend-meaning">${renderInlineLatex(entry.meaning)}</span></li>`)
    .join('');
  const initialValues = INITIAL_VALUES
    .map((entry) => `<li><span class="math-legend-symbol">${katex.renderToString(entry.symbol, { ...KATEX_OPTS, displayMode: false })}</span><span class="math-legend-meaning">${katex.renderToString(`= ${entry.value}`, { ...KATEX_OPTS, displayMode: false })}</span></li>`)
    .join('');
  return `
    <details class="math-legend">
      <summary>Symbol legend</summary>
      <ul>${rows}</ul>
    </details>
    <details class="math-legend">
      <summary>Initial values (used in every example below)</summary>
      <ul>${initialValues}</ul>
    </details>
  `;
}

export function initMathPanel({ mathContentEl, captionEl, mathViewEl, mathLegendEl }) {
  mathLegendEl.innerHTML = renderLegend();

  mathContentEl.innerHTML = STEP_ORDER.map((stepId) => {
    const entry = STEP_MATH[stepId];
    const equationsHtml = entry.equations
      .map((eq) => `<div class="math-equation"><span class="math-eq-label">${renderInlineLatex(eq.label)}</span>${renderLatex(eq.latex)}${eq.example ? `<div class="math-example"><span class="math-example-label">Example</span>${renderInlineLatex(eq.example)}</div>` : ''}</div>`)
      .join('');
    const stepsHtml = entry.steps
      .map((s) => `<li>${renderInlineLatex(s)}</li>`)
      .join('');
    return `
      <section class="math-step" data-step="${stepId}">
        <h3 class="math-step-title">${entry.title}</h3>
        ${equationsHtml}
        <ol class="math-step-breakdown">${stepsHtml}</ol>
      </section>
    `;
  }).join('');

  captionEl.innerHTML = '<span class="text-muted">Press Step / Play to walk through Algorithm 1 — the matching equation lights up below.</span>';

  let userScrolledAt = 0;
  let programmaticScroll = false;
  mathViewEl.addEventListener('scroll', () => {
    if (programmaticScroll) return;
    userScrolledAt = Date.now();
  });

  function highlightStep(stepId) {
    mathContentEl.querySelectorAll('.math-step.active-step').forEach((el) => {
      el.classList.remove('active-step');
    });
    const target = mathContentEl.querySelector(`.math-step[data-step="${stepId}"]`);
    if (!target) return;
    target.classList.add('active-step');

    if (Date.now() - userScrolledAt < 4000) return;
    programmaticScroll = true;
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    });
    setTimeout(() => { programmaticScroll = false; }, 600);
  }

  function showCaption(stepId) {
    const narrative = STEP_MATH[stepId];
    if (!narrative) {
      captionEl.innerHTML = '';
      return;
    }
    captionEl.innerHTML = `<strong class="text-accent">${narrative.title}</strong>`;
  }

  function showCheckpoint(stepId) {
    highlightStep(stepId);
    showCaption(stepId);
  }

  return { showCheckpoint };
}
