import { describe, expect, it } from 'vitest';
import { evaluate, formatSets, prefill, programWeek } from './logic';
import { ALL_EXERCISES, sessionTemplate, weekInfo } from './program';

const s = (weightKg: number, ...reps: number[]) => reps.map((r, i) => ({ setNumber: i + 1, weightKg, reps: r }));
const hipThrust = sessionTemplate(2, 'LA').exercises[0]; // 4 × 8–10 compound
const kickback = sessionTemplate(2, 'LA').exercises[4]; // 3 × 12–15 isolation

describe('formatSets', () => {
  it('matches "8kg × 12, 12, 10"', () => {
    expect(formatSets(s(8, 12, 12, 10), {}, 'kg')).toBe('8kg × 12, 12, 10');
  });
  it('groups weight changes and uses comma decimals', () => {
    const sets = [...s(12.5, 10, 10), { setNumber: 3, weightKg: 10, reps: 12 }];
    expect(formatSets(sets, {}, 'kg')).toBe('12,5kg × 10, 10 · 10kg × 12');
  });
  it('shows bodyweight and timed holds', () => {
    expect(formatSets(s(0, 15, 15), {}, 'kg')).toBe('BW × 15, 15');
    expect(formatSets(s(0, 30, 30, 25), { noLoad: true, repUnit: 'dtk' }, 'kg')).toBe('30, 30, 25 dtk');
  });
});

describe('double progression', () => {
  it('waits until all prescribed sets are logged', () => {
    expect(evaluate(hipThrust, s(40, 10, 10, 10), 'kg')).toBeNull();
  });
  it('every set at top → +2.5kg compound', () => {
    expect(evaluate(hipThrust, s(40, 10, 10, 10, 10), 'kg')).toEqual({ verdict: 'naik', fromKg: 40, nextKg: 42.5 });
  });
  it('every set at top → +1kg isolation', () => {
    expect(evaluate(kickback, s(5, 15, 15, 16), 'kg')?.nextKg).toBe(6);
  });
  it('any set below bottom → same weight', () => {
    expect(evaluate(hipThrust, s(40, 10, 9, 8, 7), 'kg')).toEqual({ verdict: 'tetap', fromKg: 40, nextKg: 40 });
  });
  it('inside range → same weight, chase reps', () => {
    expect(evaluate(hipThrust, s(40, 10, 9, 9, 8), 'kg')?.verdict).toBe('reps');
  });
  it('assisted movement progresses by reducing help', () => {
    const dips = ALL_EXERCISES.get('assisted-dips')!;
    expect(evaluate(dips, s(20, 8, 8, 8), 'kg')?.nextKg).toBe(17.5);
  });
});

describe('prefill', () => {
  const base = { ex: hipThrust, setNumber: 1, thisSession: [], currentWorkoutId: 9, deload: false, unit: 'kg' as const };
  it('uses the persisted suggestion first', () => {
    const p = prefill({ ...base, lastSession: s(40, 10, 10, 10, 10), suggestion: { exerciseId: hipThrust.id, weightKg: 42.5, verdict: 'naik', fromWorkoutId: 3 } });
    expect(p).toEqual({ weightKg: 42.5, reps: 8, source: 'saran' });
  });
  it('halves for deload', () => {
    const p = prefill({ ...base, deload: true, lastSession: s(40, 9, 9, 9, 9) });
    expect(p.weightKg).toBe(20);
  });
  it('carries the previous set within a session', () => {
    const p = prefill({ ...base, setNumber: 2, thisSession: s(45, 9), lastSession: s(40, 10, 10, 10, 10) });
    expect(p).toMatchObject({ weightKg: 45, reps: 9 });
  });
});

describe('weeks', () => {
  it('maps dates to program weeks and blocks', () => {
    expect(programWeek('2026-09-07')).toBe(1);
    expect(programWeek('2026-10-27')).toBe(8);
    expect(weekInfo(6)).toMatchObject({ deload: true, block: { id: 1 } });
    expect(weekInfo(12)).toMatchObject({ deload: true, block: { id: 2 } });
    expect(weekInfo(13).block.id).toBe(3);
  });
});
