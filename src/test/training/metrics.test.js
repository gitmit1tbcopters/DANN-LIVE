import { describe, it, expect } from 'vitest';
import { computePAD } from '../../training/metrics.js';

describe('computePAD', () => {
  it('returns 0 when domain classifier error is at chance (0.5)', () => {
    expect(computePAD(0.5)).toBe(0);
  });

  it('returns 2 when domain classifier is perfect (error 0)', () => {
    expect(computePAD(0)).toBe(2);
  });

  it('returns 0.8 for error 0.3 (Eq. 3 worked example)', () => {
    expect(computePAD(0.3)).toBeCloseTo(0.8, 10);
  });

  it('is symmetric around chance error', () => {
    expect(computePAD(0.4)).toBeCloseTo(-computePAD(0.6), 10);
  });
});
