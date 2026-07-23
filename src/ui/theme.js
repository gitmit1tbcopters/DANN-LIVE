const STORAGE_KEY = 'dann-lab-theme';

function getStoredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme, buttonEl) {
  document.documentElement.dataset.theme = theme;
  if (buttonEl) {
    buttonEl.textContent = theme === 'light' ? '🌙 Night lamp' : '☀️ Daylight';
    buttonEl.setAttribute('aria-pressed', String(theme === 'light'));
  }
}

export function initTheme(buttonEl) {
  let theme = getStoredTheme();
  applyTheme(theme, buttonEl);

  buttonEl?.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme, buttonEl);
  });
}
