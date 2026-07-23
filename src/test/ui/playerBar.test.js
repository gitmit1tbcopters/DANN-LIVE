// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { initPlayerBar } from '../../ui/playerBar.js';

describe('initPlayerBar', () => {
  let containerEl;

  beforeEach(() => {
    document.body.innerHTML = '<div id="player-bar"></div>';
    containerEl = document.getElementById('player-bar');
  });

  it('is visible by default on init', () => {
    initPlayerBar(containerEl, {});
    expect(containerEl.classList.contains('player-bar-hidden')).toBe(false);
    expect(containerEl.getAttribute('aria-hidden')).toBe('false');
  });

  it('setVisible(false) hides the bar', () => {
    const bar = initPlayerBar(containerEl, {});
    bar.setVisible(false);
    expect(containerEl.classList.contains('player-bar-hidden')).toBe(true);
    expect(containerEl.getAttribute('aria-hidden')).toBe('true');
    expect(bar.isVisible()).toBe(false);
  });

  it('setVisible(true) shows the bar again', () => {
    const bar = initPlayerBar(containerEl, {});
    bar.setVisible(false);
    bar.setVisible(true);
    expect(containerEl.classList.contains('player-bar-hidden')).toBe(false);
    expect(bar.isVisible()).toBe(true);
  });

  it('row 2 (secondary) is collapsed by default', () => {
    initPlayerBar(containerEl, {});
    const secondary = containerEl.querySelector('#player-bar-secondary');
    expect(secondary.classList.contains('hidden')).toBe(true);
    const chevron = containerEl.querySelector('#player-bar-expand');
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
  });

  it('expand chevron reveals row 2 and toggles aria-expanded', () => {
    initPlayerBar(containerEl, {});
    const chevron = containerEl.querySelector('#player-bar-expand');
    const secondary = containerEl.querySelector('#player-bar-secondary');

    chevron.click();
    expect(secondary.classList.contains('hidden')).toBe(false);
    expect(chevron.getAttribute('aria-expanded')).toBe('true');

    chevron.click();
    expect(secondary.classList.contains('hidden')).toBe(true);
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
  });

  it('transport buttons stay disabled until enable() is called', () => {
    const bar = initPlayerBar(containerEl, {});
    expect(containerEl.querySelector('#btn-play-pause').disabled).toBe(true);
    bar.enable();
    expect(containerEl.querySelector('#btn-play-pause').disabled).toBe(false);
  });

  it('forwards callbacks to the underlying controls', () => {
    let played = false;
    const bar = initPlayerBar(containerEl, { onPlay: () => { played = true; } });
    bar.enable();
    containerEl.querySelector('#btn-play-pause').click();
    expect(played).toBe(true);
  });

  it('updateStats writes stats across both rows', () => {
    const bar = initPlayerBar(containerEl, {});
    bar.updateStats({ epoch: 5, globalStep: 10, lambda: 0.1, mu: 0.002, valAccuracy: 0.9, trainDomainAccuracy: 0.5, pad: 0.05 });
    expect(containerEl.querySelector('#stat-epoch').textContent).toBe('5');
    expect(containerEl.querySelector('#stat-lambda').textContent).toBe('0.100');
  });
});
