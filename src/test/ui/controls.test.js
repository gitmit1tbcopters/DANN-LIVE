// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initControls } from '../../ui/controls.js';

describe('initControls with split containers', () => {
  let primaryEl, secondaryEl;

  beforeEach(() => {
    document.body.innerHTML = '<div id="primary"></div><div id="secondary"></div>';
    primaryEl = document.getElementById('primary');
    secondaryEl = document.getElementById('secondary');
  });

  it('mounts transport buttons in primaryEl and mode radios in secondaryEl', () => {
    initControls(primaryEl, secondaryEl, {});
    expect(primaryEl.querySelector('#btn-play')).not.toBeNull();
    expect(primaryEl.querySelector('#btn-pause')).not.toBeNull();
    expect(secondaryEl.querySelector('input[name="mode"]')).not.toBeNull();
    expect(primaryEl.querySelector('input[name="mode"]')).toBeNull();
  });

  it('wires callbacks across both containers', () => {
    const onPlay = vi.fn();
    const onModeChange = vi.fn();
    const handle = initControls(primaryEl, secondaryEl, { onPlay, onModeChange });
    handle.enable();

    primaryEl.querySelector('#btn-play').click();
    expect(onPlay).toHaveBeenCalledOnce();

    const plainRadio = secondaryEl.querySelector('input[name="mode"][value="plain"]');
    plainRadio.checked = true;
    plainRadio.dispatchEvent(new Event('change'));
    expect(onModeChange).toHaveBeenCalledWith('plain');
  });

  it('updateStats writes into fields split across both containers', () => {
    const handle = initControls(primaryEl, secondaryEl, {});
    handle.updateStats({ epoch: 3, globalStep: 40, lambda: 0.25, mu: 0.001, valAccuracy: 0.5, trainDomainAccuracy: 0.6, pad: 0.1 });

    expect(primaryEl.querySelector('#stat-epoch').textContent).toBe('3');
    expect(primaryEl.querySelector('#stat-step').textContent).toBe('40');
    expect(secondaryEl.querySelector('#stat-lambda').textContent).toBe('0.250');
    expect(secondaryEl.querySelector('#stat-mu').textContent).toBe('0.00100');
  });

  it('enable() enables transport buttons in primaryEl and next button respects tutorial toggle', () => {
    const handle = initControls(primaryEl, secondaryEl, {});
    handle.enable();
    expect(primaryEl.querySelector('#btn-play').disabled).toBe(false);
    expect(primaryEl.querySelector('#btn-next').disabled).toBe(true);
  });
});
