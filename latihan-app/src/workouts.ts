// Queries and writes shared by the screens.
import { byRecency, db, type SetEntry, type Workout } from './db';
import { evaluate, isoDate, programWeek, type Unit } from './logic';
import { TOTAL_WEEKS, weekInfo, type Exercise, type SessionType } from './program';

export interface LastSession {
  workout: Workout;
  sets: SetEntry[];
}

const before = (a: Workout, b: Workout) => byRecency(a, b) > 0; // a happened before b

/** For each exercise: the most recent session before `current` that has sets for it. */
export async function lastSessions(exerciseIds: string[], current?: Workout): Promise<Record<string, LastSession>> {
  const out: Record<string, LastSession> = {};
  const cache = new Map<number, Workout | undefined>();
  for (const exId of exerciseIds) {
    const sets = await db.sets.where('exerciseId').equals(exId).toArray();
    const byWorkout = new Map<number, SetEntry[]>();
    for (const s of sets) {
      if (current && s.workoutId === current.id) continue;
      (byWorkout.get(s.workoutId) ?? byWorkout.set(s.workoutId, []).get(s.workoutId)!).push(s);
    }
    let best: Workout | undefined;
    for (const wid of byWorkout.keys()) {
      if (!cache.has(wid)) cache.set(wid, await db.workouts.get(wid));
      const w = cache.get(wid);
      if (!w || (current && !before(w, current))) continue;
      if (!best || byRecency(w, best) < 0) best = w;
    }
    if (best) out[exId] = { workout: best, sets: byWorkout.get(best.id)!.sort((a, b) => a.setNumber - b.setNumber) };
  }
  return out;
}

export async function startWorkout(session: SessionType): Promise<number> {
  const date = isoDate();
  const week = Math.min(TOTAL_WEEKS, Math.max(1, programWeek(date)));
  const info = weekInfo(week);
  return db.workouts.add({
    date,
    session,
    week,
    blockId: info.block.id,
    deload: info.deload,
    startedAt: Date.now(),
  } as Workout);
}

/**
 * Re-run double progression for one exercise of a workout and persist it as next
 * session's default. Deload sessions never set a suggestion, and an older workout
 * being edited never overwrites a suggestion that came from a newer one.
 */
export async function refreshSuggestion(workout: Workout, ex: Exercise, unit: Unit) {
  const sets = await db.sets.where('workoutId').equals(workout.id).filter((s) => s.exerciseId === ex.id).toArray();
  const existing = await db.suggestions.get(ex.id);
  const p = workout.deload || ex.noLoad ? null : evaluate(ex, sets, unit);
  if (!p) {
    if (existing?.fromWorkoutId === workout.id) await db.suggestions.delete(ex.id);
    return;
  }
  if (existing && existing.fromWorkoutId !== workout.id) {
    const src = await db.workouts.get(existing.fromWorkoutId);
    if (src && before(workout, src)) return;
  }
  await db.suggestions.put({ exerciseId: ex.id, weightKg: p.nextKg, verdict: p.verdict, fromWorkoutId: workout.id });
}
