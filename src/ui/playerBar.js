// Media-player-style overlay bar for training controls. Owns the bar chrome
// (fixed positioning, row1/row2 split, expand/collapse, show/hide) and
// mounts initControls inside it. Controls' own callback contract and
// enable()/updateStats() behavior are untouched — see controls.js.

import { initControls } from './controls.js';

const CHIP_BTN = 'flex items-center justify-center rounded-full h-9 w-9 text-lg text-white transition-colors enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deck-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--deck-bg-to)]';

export function initPlayerBar(containerEl, callbacks) {
  containerEl.setAttribute('aria-hidden', 'false');
  containerEl.className = `${containerEl.className} fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-gradient-to-r from-[var(--deck-bg-from)] to-[var(--deck-bg-to)] px-6 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]`.trim();

  containerEl.innerHTML = `
    <div class="mx-auto flex max-w-[1800px] flex-col gap-2">
      <div class="flex items-center gap-4">
        <div id="player-bar-primary" class="flex-1"></div>
        <button
          type="button"
          id="player-bar-expand"
          aria-expanded="false"
          aria-controls="player-bar-secondary"
          class="${CHIP_BTN}"
          title="Show more controls"
        >&#9662;</button>
      </div>
      <div id="player-bar-secondary" class="hidden border-t border-white/10 pt-2.5"></div>
    </div>
  `;

  const primaryEl = containerEl.querySelector('#player-bar-primary');
  const secondaryEl = containerEl.querySelector('#player-bar-secondary');
  const chevron = containerEl.querySelector('#player-bar-expand');

  const controls = initControls(primaryEl, secondaryEl, callbacks);

  chevron.addEventListener('click', () => {
    const expanded = chevron.getAttribute('aria-expanded') === 'true';
    chevron.setAttribute('aria-expanded', String(!expanded));
    secondaryEl.classList.toggle('hidden', expanded);
    chevron.innerHTML = expanded ? '&#9662;' : '&#9652;';
  });

  let visible = true;

  function setVisible(next) {
    visible = next;
    containerEl.classList.toggle('player-bar-hidden', !visible);
    containerEl.setAttribute('aria-hidden', String(!visible));
  }

  function isVisible() {
    return visible;
  }

  return { setVisible, isVisible, enable: controls.enable, updateStats: controls.updateStats, els: controls.els };
}
