import type { SetEntry, Suggestion, Verdict } from './db';
import { PROGRAM_START, type Exercise } from './program';

// ---- dates ----

export function isoDate(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Program week (1-based, unclamped) for a date. Week 1 starts on PROGRAM_START. */
export function programWeek(date: string, start = PROGRAM_START): number {
  const days = Math.round((parseISO(date).getTime() - parseISO(start).getTime()) / 86_400_000);
  return Math.floor(days / 7) + 1;
}

/** Fractional week for charting: 1.0 = Senin minggu 1, 1.86 = Minggu minggu 1. */
export function weekPosition(date: string, start = PROGRAM_START): number {
  return 1 + (parseISO(date).getTime() - parseISO(start).getTime()) / (7 * 86_400_000);
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return parseISO(iso).toLocaleDateString('id-ID', opts).replace(/\./g, '');
}

// ---- units ----

export type Unit = 'kg' | 'lb';
const LB_PER_KG = 2.2046226218;

export function toUnit(kg: number, unit: Unit): number {
  if (unit === 'kg') return Math.round(kg * 100) / 100;
  return Math.round(kg * LB_PER_KG * 2) / 2;
}

export function fromUnit(v: number, unit: Unit): number {
  return unit === 'kg' ? v : v / LB_PER_KG;
}

/** 12.5 → "12,5"; 8 → "8" */
export function fmtNum(n: number, maxDecimals = 2): string {
  return n.toLocaleString('id-ID', { maximumFractionDigits: maxDecimals, useGrouping: false });
}

export function fmtWeight(kg: number, unit: Unit): string {
  return fmtNum(toUnit(kg, unit));
}

export function weightStep(unit: Unit) {
  return unit === 'kg' ? 1 : 2.5;
}

/** Double-progression jump, in kg: +2,5 kg compound / +1 kg isolation (5 / 2,5 lb). */
export function increment(ex: Exercise, unit: Unit): number {
  const inUnit = unit === 'kg' ? (ex.kind === 'compound' ? 2.5 : 1) : ex.kind === 'compound' ? 5 : 2.5;
  return fromUnit(inUnit, unit);
}

export function restSeconds(ex: Exercise) {
  return ex.kind === 'compound' ? 120 : 90;
}

// ---- "Terakhir: 8kg × 12, 12, 10" ----

type SetLike = Pick<SetEntry, 'setNumber' | 'weightKg' | 'reps'>;

export function formatSets(sets: SetLike[], ex: Pick<Exercise, 'noLoad' | 'repUnit'>, unit: Unit): string {
  const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  if (!sorted.length) return '';
  if (ex.noLoad) {
    const tail = ex.repUnit === 'dtk' ? ' dtk' : '';
    return sorted.map((s) => s.reps).join(', ') + tail;
  }
  const groups: { w: number; reps: number[] }[] = [];
  for (const s of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.w === s.weightKg) last.reps.push(s.reps);
    else groups.push({ w: s.weightKg, reps: [s.reps] });
  }
  return groups
    .map((g) => `${g.w === 0 ? 'BW' : fmtWeight(g.w, unit) + unit} × ${g.reps.join(', ')}`)
    .join(' · ');
}

// ---- double progression ----

export interface Progression {
  verdict: Verdict;
  /** the weight the sets were done with */
  fromKg: number;
  /** prefilled next session */
  nextKg: number;
}

/** Heaviest set's weight (lightest for assisted movements, where weight is help). */
export function workingWeight(sets: SetLike[], ex: Pick<Exercise, 'assisted'>): number {
  const ws = sets.map((s) => s.weightKg);
  return ex.assisted ? Math.min(...ws) : Math.max(...ws);
}

/**
 * Called once all prescribed sets are logged.
 * - every set at the TOP of the range → add weight
 * - any set below the BOTTOM → same weight
 * - otherwise → same weight, chase reps
 */
export function evaluate(ex: Exercise, sets: SetLike[], unit: Unit): Progression | null {
  if (sets.length < ex.sets) return null;
  const [bottom, top] = ex.range;
  const from = workingWeight(sets, ex);
  if (sets.every((s) => s.reps >= top)) {
    const inc = increment(ex, unit);
    const next = ex.assisted ? Math.max(0, from - inc) : from + inc;
    return { verdict: 'naik', fromKg: from, nextKg: ex.noLoad ? 0 : next };
  }
  if (sets.some((s) => s.reps < bottom)) return { verdict: 'tetap', fromKg: from, nextKg: from };
  return { verdict: 'reps', fromKg: from, nextKg: from };
}

// ---- prefill for the next set ----

export interface Prefill {
  weightKg: number | null;
  reps: number;
  source: 'set-sebelumnya' | 'saran' | 'terakhir' | 'kosong';
}

export function roundToStep(kg: number, unit: Unit): number {
  const step = unit === 'kg' ? 0.5 : 1;
  return fromUnit(Math.round(toUnit(kg, unit) / step) * step, unit);
}

export function prefill(opts: {
  ex: Exercise;
  setNumber: number;
  thisSession: SetLike[];
  lastSession: SetLike[];
  suggestion?: Suggestion;
  currentWorkoutId: number;
  deload: boolean;
  unit: Unit;
}): Prefill {
  const { ex, setNumber, thisSession, lastSession, suggestion, currentWorkoutId, deload, unit } = opts;
  const prev = [...thisSession].sort((a, b) => b.setNumber - a.setNumber)[0];
  if (prev) return { weightKg: prev.weightKg, reps: prev.reps, source: 'set-sebelumnya' };

  const bottom = ex.range[0];
  const lastSameSet = lastSession.find((s) => s.setNumber === setNumber) ?? lastSession[lastSession.length - 1];
  const half = (kg: number) => (deload ? roundToStep(kg * 0.5, unit) : kg);

  if (suggestion && suggestion.fromWorkoutId !== currentWorkoutId) {
    const reps = suggestion.verdict === 'naik' || !lastSameSet ? bottom : lastSameSet.reps;
    return { weightKg: half(suggestion.weightKg), reps, source: 'saran' };
  }
  if (lastSession.length) {
    return { weightKg: half(workingWeight(lastSession, ex)), reps: lastSameSet.reps, source: 'terakhir' };
  }
  return { weightKg: ex.noLoad ? 0 : null, reps: bottom, source: 'kosong' };
}

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
