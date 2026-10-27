import { useLiveQuery } from 'dexie-react-hooks';
import { byRecency, db, type SetEntry, type Workout } from '../db';
import { useUnit } from '../hooks';
import { fmtDate, formatSets, toUnit, weekPosition, workingWeight } from '../logic';
import { ALL_EXERCISES, SESSION_NAME } from '../program';
import { LineChartBox } from '../components/LineChartBox';

interface Session {
  workout: Workout;
  sets: SetEntry[];
}

async function sessionsFor(exId: string): Promise<Session[]> {
  const sets = await db.sets.where('exerciseId').equals(exId).toArray();
  const ids = [...new Set(sets.map((s) => s.workoutId))];
  const workouts = (await db.workouts.bulkGet(ids)).filter(Boolean) as Workout[];
  return workouts.sort(byRecency).map((w) => ({
    workout: w,
    sets: sets.filter((s) => s.workoutId === w.id).sort((a, b) => a.setNumber - b.setNumber),
  }));
}

export function ExerciseList() {
  const unit = useUnit();
  const latest = useLiveQuery(async () => {
    const out: Record<string, Session> = {};
    for (const id of ALL_EXERCISES.keys()) {
      const s = await sessionsFor(id);
      if (s[0]) out[id] = s[0];
    }
    return out;
  }, []);
  if (!latest) return <div className="page" />;

  const all = [...ALL_EXERCISES.values()];
  const logged = all.filter((e) => latest[e.id]).sort((a, b) => byRecency(latest[a.id].workout, latest[b.id].workout));
  const rest = all.filter((e) => !latest[e.id]).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="display">Gerakan</h1>
        <p className="meta">Riwayat beban per gerakan.</p>
      </header>
      {logged.length > 0 && (
        <ul className="rows">
          {logged.map((e) => (
            <li key={e.id}>
              <a className="row" href={`#/gerakan/${e.id}`}>
                <span className="row__main">{e.name}</span>
                <span className="row__sub num">{formatSets(latest[e.id].sets, e, unit)}</span>
                <span className="row__aside">{fmtDate(latest[e.id].workout.date, { day: 'numeric', month: 'short' })}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="section-label section-label--spaced">{logged.length ? 'Belum dicatat' : 'Semua gerakan'}</p>
      <ul className="rows rows--quiet">
        {rest.map((e) => (
          <li key={e.id}>
            <a className="row" href={`#/gerakan/${e.id}`}>
              <span className="row__main">{e.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExerciseDetail({ id }: { id: string }) {
  const unit = useUnit();
  const ex = ALL_EXERCISES.get(id);
  const sessions = useLiveQuery(() => sessionsFor(id), [id]);
  if (!ex)
    return (
      <div className="page">
        <a className="back" href="#/gerakan">← Gerakan</a>
        <p className="empty">Gerakan nggak ditemukan.</p>
      </div>
    );
  if (!sessions) return <div className="page" />;

  const chrono = [...sessions].reverse();
  const points = chrono.map((s) => {
    const x = weekPosition(s.workout.date);
    const y = ex.noLoad ? Math.max(...s.sets.map((v) => v.reps)) : toUnit(workingWeight(s.sets, ex), unit);
    return { x, y, label: fmtDate(s.workout.date, { weekday: 'short', day: 'numeric', month: 'short' }) };
  });
  const best = points.length ? Math.max(...points.map((p) => p.y)) : null;
  const yUnit = ex.noLoad ? (ex.repUnit === 'dtk' ? 'dtk' : 'rep') : unit;

  return (
    <div className="page">
      <a className="back" href="#/gerakan">← Gerakan</a>
      <header className="page-head">
        <h1 className="display display--md">{ex.name}</h1>
        <p className="meta">{ex.cue}</p>
      </header>

      {sessions.length === 0 ? (
        <p className="empty">Belum ada catatan untuk gerakan ini.</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat">
              <span className="stat__label">Terakhir</span>
              <span className="stat__num num">{points[points.length - 1].y.toLocaleString('id-ID')}</span>
              <span className="stat__unit">{yUnit}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Tertinggi</span>
              <span className="stat__num num">{best!.toLocaleString('id-ID')}</span>
              <span className="stat__unit">{yUnit}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Sesi</span>
              <span className="stat__num num">{sessions.length}</span>
            </div>
          </div>

          {points.length > 1 && (
            <>
              <p className="section-label">{ex.noLoad ? 'Rep / detik terbaik per sesi' : `Beban kerja per sesi (${unit})`}</p>
              <LineChartBox
                data={points}
                unit={yUnit}
                xDomain={[1, 17]}
                xTicks={[1, 4, 7, 10, 13, 16]}
                xFormat={(x) => `M${Math.floor(x)}`}
              />
            </>
          )}

          <p className="section-label section-label--spaced">Semua set</p>
          <ul className="log">
            {sessions.map((s) => (
              <li key={s.workout.id}>
                <a className="log__row" href={`#/latihan/${s.workout.id}`}>
                  <span className="log__date">
                    {fmtDate(s.workout.date, { day: 'numeric', month: 'short' })}
                    <small>
                      M{s.workout.week} · {SESSION_NAME[s.workout.session]}
                      {s.workout.deload ? ' · deload' : ''}
                    </small>
                  </span>
                  <span className="log__sets num">{formatSets(s.sets, ex, unit)}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
