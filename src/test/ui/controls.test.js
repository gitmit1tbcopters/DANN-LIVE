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
    expect(primaryEl.querySelector('#btn-play-pause')).not.toBeNull();
    expect(primaryEl.querySelector('#status-running')).not.toBeNull();
    expect(secondaryEl.querySelector('input[name="mode"]')).not.toBeNull();
    expect(primaryEl.querySelector('input[name="mode"]')).toBeNull();
  });

  it('wires callbacks across both containers', () => {
    const onPlay = vi.fn();
    const onModeChange = vi.fn();
    const handle = initControls(primaryEl, secondaryEl, { onPlay, onModeChange });
    handle.enable();

    primaryEl.querySelector('#btn-play-pause').click();
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
    expect(primaryEl.querySelector('#btn-play-pause').disabled).toBe(false);
    expect(primaryEl.querySelector('#btn-next').disabled).toBe(false);

    primaryEl.querySelector('#tutorial-toggle').checked = false;
    primaryEl.querySelector('#tutorial-toggle').dispatchEvent(new Event('change'));
    expect(primaryEl.querySelector('#btn-next').disabled).toBe(true);
  });

  describe('total-steps/total-epochs inputs', () => {
    it('are disabled by default and stay disabled after enable() while playing', () => {
      const handle = initControls(primaryEl, secondaryEl, {});
      expect(primaryEl.querySelector('#total-steps-input').disabled).toBe(true);
      expect(primaryEl.querySelector('#total-epochs-input').disabled).toBe(true);

      handle.enable();
      expect(primaryEl.querySelector('#total-steps-input').disabled).toBe(false);
      expect(primaryEl.querySelector('#total-epochs-input').disabled).toBe(false);

      handle.setPlaying(true);
      expect(primaryEl.querySelector('#total-steps-input').disabled).toBe(true);
      expect(primaryEl.querySelector('#total-epochs-input').disabled).toBe(true);

      handle.setPlaying(false);
      expect(primaryEl.querySelector('#total-steps-input').disabled).toBe(false);
      expect(primaryEl.querySelector('#total-epochs-input').disabled).toBe(false);
    });

    it('setTotals populates both inputs and stores stepsPerEpoch for epoch<->step conversion', () => {
      const handle = initControls(primaryEl, secondaryEl, {});
      handle.setTotals({ totalSteps: 400, totalEpochs: 8, stepsPerEpoch: 50 });

      expect(primaryEl.querySelector('#total-steps-input').value).toBe('400');
      expect(primaryEl.querySelector('#total-epochs-input').value).toBe('8');
    });

    it('changing total-steps-input calls onTotalStepsChange with the raw step value', () => {
      const onTotalStepsChange = vi.fn(() => true);
      const handle = initControls(primaryEl, secondaryEl, { onTotalStepsChange });
      handle.setTotals({ totalSteps: 400, totalEpochs: 8, stepsPerEpoch: 50 });

      const input = primaryEl.querySelector('#total-steps-input');
      input.value = '500';
      input.dispatchEvent(new Event('change'));

      expect(onTotalStepsChange).toHaveBeenCalledWith(500);
      expect(input.value).toBe('500');
    });

    it('reverts total-steps-input to the last accepted value when the callback rejects', () => {
      const onTotalStepsChange = vi.fn(() => false);
      const handle = initControls(primaryEl, secondaryEl, { onTotalStepsChange });
      handle.setTotals({ totalSteps: 400, totalEpochs: 8, stepsPerEpoch: 50 });

      const input = primaryEl.querySelector('#total-steps-input');
      input.value = '100';
      input.dispatchEvent(new Event('change'));

      expect(onTotalStepsChange).toHaveBeenCalledWith(100);
      expect(input.value).toBe('400');
    });

    it('changing total-epochs-input converts to steps via stepsPerEpoch before calling onTotalStepsChange', () => {
      const onTotalStepsChange = vi.fn(() => true);
      const handle = initControls(primaryEl, secondaryEl, { onTotalStepsChange });
      handle.setTotals({ totalSteps: 400, totalEpochs: 8, stepsPerEpoch: 50 });

      const input = primaryEl.querySelector('#total-epochs-input');
      input.value = '10';
      input.dispatchEvent(new Event('change'));

      expect(onTotalStepsChange).toHaveBeenCalledWith(500);
      expect(input.value).toBe('10');
    });

    it('reverts total-epochs-input to the last accepted value when the callback rejects', () => {
      const onTotalStepsChange = vi.fn(() => false);
      const handle = initControls(primaryEl, secondaryEl, { onTotalStepsChange });
      handle.setTotals({ totalSteps: 400, totalEpochs: 8, stepsPerEpoch: 50 });

      const input = primaryEl.querySelector('#total-epochs-input');
      input.value = '2';
      input.dispatchEvent(new Event('change'));

      expect(onTotalStepsChange).toHaveBeenCalledWith(100);
      expect(input.value).toBe('8');
    });
  });
});
