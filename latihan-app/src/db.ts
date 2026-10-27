import Dexie, { type EntityTable } from 'dexie';
import type { SessionType } from './program';

export interface Workout {
  id: number;
  /** yyyy-mm-dd, local */
  date: string;
  session: SessionType;
  week: number;
  blockId: 1 | 2 | 3;
  deload: boolean;
  startedAt: number;
  finishedAt?: number;
}

export interface SetEntry {
  id: number;
  workoutId: number;
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  loggedAt: number;
}

export type Verdict = 'naik' | 'tetap' | 'reps';

export interface Suggestion {
  exerciseId: string;
  weightKg: number;
  verdict: Verdict;
  fromWorkoutId: number;
}

export interface BodyMetric {
  id: number;
  date: string;
  weight?: number;
  hips?: number;
  waist?: number;
  thigh?: number;
  arm?: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export const db = new Dexie('latihan') as Dexie & {
  workouts: EntityTable<Workout, 'id'>;
  sets: EntityTable<SetEntry, 'id'>;
  suggestions: EntityTable<Suggestion, 'exerciseId'>;
  body: EntityTable<BodyMetric, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

db.version(1).stores({
  workouts: '++id, date, session, finishedAt',
  sets: '++id, workoutId, exerciseId',
  suggestions: 'exerciseId, fromWorkoutId',
  body: '++id, date',
  settings: 'key',
});

/** Most recent first: by date, then by start time. */
export const byRecency = (a: Workout, b: Workout) =>
  a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1;

export async function deleteWorkout(id: number) {
  await db.transaction('rw', db.workouts, db.sets, db.suggestions, async () => {
    await db.sets.where('workoutId').equals(id).delete();
    await db.suggestions.where('fromWorkoutId').equals(id).delete();
    await db.workouts.delete(id);
  });
}

// ---- export / import ----

export interface Backup {
  app: 'latihan';
  version: 1;
  exportedAt: string;
  workouts: Workout[];
  sets: SetEntry[];
  suggestions: Suggestion[];
  body: BodyMetric[];
  settings: Setting[];
}

export async function exportData(): Promise<Backup> {
  return {
    app: 'latihan',
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts: await db.workouts.toArray(),
    sets: await db.sets.toArray(),
    suggestions: await db.suggestions.toArray(),
    body: await db.body.toArray(),
    settings: await db.settings.toArray(),
  };
}

export async function importData(data: unknown) {
  const b = data as Backup;
  if (!b || b.app !== 'latihan' || !Array.isArray(b.workouts) || !Array.isArray(b.sets))
    throw new Error('Bukan file cadangan Latihan.');
  await db.transaction('rw', [db.workouts, db.sets, db.suggestions, db.body, db.settings], async () => {
    await Promise.all([db.workouts.clear(), db.sets.clear(), db.suggestions.clear(), db.body.clear(), db.settings.clear()]);
    await db.workouts.bulkAdd(b.workouts);
    await db.sets.bulkAdd(b.sets);
    await db.suggestions.bulkAdd(b.suggestions ?? []);
    await db.body.bulkAdd(b.body ?? []);
    await db.settings.bulkAdd(b.settings ?? []);
  });
}
