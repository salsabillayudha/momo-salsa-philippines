import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteWorkout, type SetEntry, type Suggestion, type Workout as W } from '../db';
import { go, useUnit } from '../hooks';
import {
  evaluate, fmtDate, fmtWeight, formatSets, fromUnit, increment, prefill, restSeconds, toUnit, weightStep, type Unit,
} from '../logic';
import { BLOCKS, sessionTemplate, type Exercise } from '../program';
import { lastSessions, refreshSuggestion, type LastSession } from '../workouts';
import { Stepper } from '../components/Stepper';
import { ConfirmButton } from '../components/ConfirmButton';
import { useRestTimer } from '../components/RestTimer';

export function WorkoutScreen({ id }: { id: number }) {
  const unit = useUnit();
  const workout = useLiveQuery(() => db.workouts.get(id), [id]);
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(id).toArray(), [id]);
  const template = workout ? sessionTemplate(workout.blockId, workout.session, workout.deload) : null;
  const exIds = template?.exercises.map((e) => e.id) ?? [];
  const last = useLiveQuery(() => (workout ? lastSessions(exIds, workout) : undefined), [workout, exIds.join()]);
  const suggestions = useLiveQuery(
    async () => {
      const list = await db.suggestions.bulkGet(exIds);
      return Object.fromEntries(list.filter(Boolean).map((s) => [s!.exerciseId, s!])) as Record<string, Suggestion>;
    },
    [exIds.join()],
  );

  const setsByEx = useMemo(() => {
    const m: Record<string, SetEntry[]> = {};
    for (const s of sets ?? []) (m[s.exerciseId] ??= []).push(s);
    for (const k in m) m[k].sort((a, b) => a.setNumber - b.setNumber);
    return m;
  }, [sets]);

  const [open, setOpen] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (opened || !template || !sets) return;
    const next = template.exercises.find((e) => (setsByEx[e.id]?.length ?? 0) < e.sets);
    setOpen(workout?.finishedAt ? null : (next?.id ?? null));
    setOpened(true);
  }, [opened, template, sets, setsByEx, workout]);

  if (workout === undefined || !sets || !last || !suggestions) return <div className="page" />;
  if (!workout || !template) return <Missing />;

  const block = BLOCKS.find((b) => b.id === workout.blockId)!;
  const done = template.exercises.filter((e) => (setsByEx[e.id]?.length ?? 0) >= e.sets).length;
  const total = sets.length;

  return (
    <div className="page workout">
      <a className="back" href="#/">← Beranda</a>
      <header className="wk-head">
        <p className="eyebrow">
          {fmtDate(workout.date, { weekday: 'long', day: 'numeric', month: 'long' })}
          {workout.finishedAt ? ' · selesai' : ''}
        </p>
        <h1 className="display">{template.title}</h1>
        <p className="meta">
          Minggu <b className="num">{workout.week}</b> · Blok {block.id} {block.name} · RIR {block.rir}
        </p>
        {workout.deload && <p className="deload">Deload — beban 50%, 2 set. Tetap datang.</p>}
        <p className="meta">
          <span className="num">{done}</span>/{template.exercises.length} gerakan · <span className="num">{total}</span> set
        </p>
      </header>

      <ol className="ex-list">
        {template.exercises.map((ex, i) => (
          <ExerciseItem
            key={ex.id}
            index={i + 1}
            ex={ex}
            workout={workout}
            sets={setsByEx[ex.id] ?? []}
            last={last[ex.id]}
            suggestion={suggestions[ex.id]}
            unit={unit}
            open={open === ex.id}
            onToggle={() => setOpen(open === ex.id ? null : ex.id)}
            onNext={() => {
              const next = template.exercises.slice(i + 1).find((e) => (setsByEx[e.id]?.length ?? 0) < e.sets);
              setOpen(next?.id ?? null);
              if (next) setTimeout(() => document.getElementById(`ex-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
            }}
          />
        ))}
      </ol>

      <footer className="wk-foot">
        {!workout.finishedAt ? (
          <button
            className="btn btn--primary btn--block"
            onClick={async () => {
              await db.workouts.update(workout.id, { finishedAt: Date.now() });
              go('/');
            }}
          >
            Selesai latihan
          </button>
        ) : (
          <button className="btn btn--ghost btn--block" onClick={() => db.workouts.update(workout.id, { finishedAt: undefined })}>
            Buka lagi sesi ini
          </button>
        )}
        <ConfirmButton
          className="btn btn--ghost btn--block btn--danger"
          confirm={total ? `Hapus ${total} set? Ketuk lagi` : 'Ketuk lagi untuk batal'}
          onConfirm={async () => {
            await deleteWorkout(workout.id);
            go('/');
          }}
        >
          {total ? 'Hapus sesi ini' : 'Batalkan sesi'}
        </ConfirmButton>
      </footer>
    </div>
  );
}

function Missing() {
  return (
    <div className="page">
      <a className="back" href="#/">← Beranda</a>
      <p className="empty">Sesi ini nggak ada lagi.</p>
    </div>
  );
}

const repsLabel = (ex: Exercise) =>
  `${ex.sets} × ${ex.range[0] === ex.range[1] ? ex.range[0] : `${ex.range[0]}–${ex.range[1]}`}${ex.repUnit ? (ex.repUnit.startsWith('/') ? ex.repUnit : ' ' + ex.repUnit) : ''}`;

function ExerciseItem(props: {
  index: number;
  ex: Exercise;
  workout: W;
  sets: SetEntry[];
  last?: LastSession;
  suggestion?: Suggestion;
  unit: Unit;
  open: boolean;
  onToggle: () => void;
  onNext: () => void;
}) {
  const { index, ex, sets, last, unit, open, onToggle } = props;
  const complete = sets.length >= ex.sets;
  const lastText = last ? formatSets(last.sets, ex, unit) : null;

  return (
    <li id={`ex-${ex.id}`} className={`ex${open ? ' is-open' : ''}${complete ? ' is-done' : ''}`}>
      <button className="ex__head" onClick={onToggle} aria-expanded={open}>
        <span className="ex__idx num">{String(index).padStart(2, '0')}</span>
        <span className="ex__title">
          <span className="ex__name">{ex.name}</span>
          <span className="ex__rx">
            {repsLabel(ex)}
            {ex.extra ? ` · ${ex.extra}` : ''}
          </span>
          {!open && lastText && <span className="ex__last-mini">Terakhir: {lastText}</span>}
        </span>
        <span className="ex__count num">{complete ? '✓' : `${sets.length}/${ex.sets}`}</span>
      </button>
      {open && <ExerciseLogger {...props} lastText={lastText} />}
    </li>
  );
}

function ExerciseLogger({
  ex, workout, sets, last, suggestion, unit, onNext, lastText,
}: Parameters<typeof ExerciseItem>[0] & { lastText: string | null }) {
  const { start } = useRestTimer();
  const [editing, setEditing] = useState<SetEntry | null>(null);
  const setNumber = editing ? editing.setNumber : sets.length + 1;

  const pf = useMemo(
    () =>
      prefill({
        ex, setNumber, thisSession: sets, lastSession: last?.sets ?? [], suggestion,
        currentWorkoutId: workout.id, deload: workout.deload, unit,
      }),
    // only recompute when the set we're about to log changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ex.id, setNumber, sets.length, last, suggestion?.weightKg, suggestion?.fromWorkoutId, workout.deload, unit],
  );

  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(null);
  useEffect(() => {
    if (editing) {
      setWeight(toUnit(editing.weightKg, unit));
      setReps(editing.reps);
    } else {
      setWeight(pf.weightKg == null ? null : toUnit(pf.weightKg, unit));
      setReps(pf.reps);
    }
  }, [pf, editing, unit]);

  const progression = workout.deload ? null : evaluate(ex, sets, unit);
  const canLog = reps != null && reps > 0 && (ex.noLoad || weight != null);

  const log = async () => {
    if (!canLog) return;
    const weightKg = ex.noLoad ? 0 : fromUnit(weight ?? 0, unit);
    if (editing) {
      await db.sets.update(editing.id, { weightKg, reps: reps! });
      setEditing(null);
    } else {
      await db.sets.add({
        workoutId: workout.id, exerciseId: ex.id, setNumber, weightKg, reps: reps!, loggedAt: Date.now(),
      } as SetEntry);
      if (!workout.finishedAt) start(restSeconds(ex), ex.name);
    }
    await refreshSuggestion(workout, ex, unit);
  };

  const remove = async (s: SetEntry) => {
    await db.transaction('rw', db.sets, async () => {
      await db.sets.delete(s.id);
      for (const later of sets.filter((x) => x.setNumber > s.setNumber))
        await db.sets.update(later.id, { setNumber: later.setNumber - 1 });
    });
    setEditing(null);
    await refreshSuggestion(workout, ex, unit);
  };

  const sugg = suggestion && suggestion.fromWorkoutId !== workout.id ? suggestion : undefined;

  return (
    <div className="logger">
      <p className="cue">{ex.cue}</p>

      {/* The reason this app exists: last time's numbers, right above the input. */}
      <div className="last">
        {lastText ? (
          <>
            <p className="last__line">
              <span className="last__label">Terakhir:</span> <span className="num">{lastText}</span>
            </p>
            <p className="last__date">
              {fmtDate(last!.workout.date)}
              {last!.workout.deload ? ' · deload' : ''}
              {sugg && !ex.noLoad && (
                <>
                  {' · '}
                  <span className={`tag tag--${sugg.verdict}`}>
                    {sugg.verdict === 'naik' ? `naik → ${fmtWeight(sugg.weightKg, unit)}${unit}` : `tetap ${fmtWeight(sugg.weightKg, unit)}${unit}`}
                  </span>
                </>
              )}
            </p>
          </>
        ) : (
          <p className="last__line last__line--none">Belum ada catatan. Pilih beban yang masih sisa 2–3 rep.</p>
        )}
      </div>

      {sets.length > 0 && (
        <ol className="sets">
          {sets.map((s) => (
            <li key={s.id}>
              <button className={`set${editing?.id === s.id ? ' is-editing' : ''}`} onClick={() => setEditing(editing?.id === s.id ? null : s)}>
                <span className="set__n">Set {s.setNumber}</span>
                <span className="set__val num">
                  {ex.noLoad ? (
                    <>
                      {s.reps}
                      <small>{ex.repUnit === 'dtk' ? ' dtk' : ' rep'}</small>
                    </>
                  ) : (
                    <>
                      {s.weightKg === 0 ? 'BW' : fmtWeight(s.weightKg, unit)}
                      <small>{s.weightKg === 0 ? '' : unit}</small>
                      <span className="set__x">×</span>
                      {s.reps}
                    </>
                  )}
                </span>
                <span className={`set__mark ${s.reps >= ex.range[1] ? 'is-top' : s.reps < ex.range[0] ? 'is-low' : ''}`} aria-hidden>
                  {s.reps >= ex.range[1] ? '▲' : s.reps < ex.range[0] ? '▼' : ''}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {progression && !editing && <Verdict ex={ex} p={progression} unit={unit} />}

      <div className="entry">
        <p className="entry__title">
          {editing ? `Ubah set ${editing.setNumber}` : setNumber > ex.sets ? `Set tambahan (${setNumber})` : `Set ${setNumber} dari ${ex.sets}`}
          {!editing && pf.source === 'saran' && <span className="entry__hint"> · beban dari saran</span>}
          {!editing && workout.deload && pf.source !== 'set-sebelumnya' && pf.source !== 'kosong' && <span className="entry__hint"> · 50% deload</span>}
        </p>
        <div className={`entry__inputs${ex.noLoad ? ' entry__inputs--single' : ''}`}>
          {!ex.noLoad && (
            <Stepper
              label="Beban"
              suffix={ex.perHand ? `${unit}/tangan` : unit}
              value={weight}
              onChange={setWeight}
              step={weightStep(unit)}
            />
          )}
          <Stepper
            label={ex.repUnit === 'dtk' ? 'Detik' : 'Reps'}
            suffix={`${ex.range[0]}–${ex.range[1]}`}
            value={reps}
            onChange={setReps}
            step={ex.repUnit === 'dtk' ? 5 : 1}
            decimals={0}
          />
        </div>
        <button className="btn btn--primary btn--block btn--log" disabled={!canLog} onClick={log}>
          {editing ? 'Simpan perubahan' : setNumber > ex.sets ? 'Catat set tambahan' : `Catat set ${setNumber}`}
        </button>
        {editing && (
          <div className="entry__row">
            <button className="btn btn--ghost" onClick={() => setEditing(null)}>Batal</button>
            <ConfirmButton className="btn btn--ghost btn--danger" confirm="Ketuk lagi untuk hapus" onConfirm={() => remove(editing)}>
              Hapus set {editing.setNumber}
            </ConfirmButton>
          </div>
        )}
        {sets.length >= ex.sets && !editing && (
          <button className="btn btn--ghost btn--block" onClick={onNext}>Gerakan berikutnya →</button>
        )}
        <a className="entry__history" href={`#/gerakan/${ex.id}`}>Riwayat {ex.name} →</a>
      </div>
    </div>
  );
}

function Verdict({ ex, p, unit }: { ex: Exercise; p: NonNullable<ReturnType<typeof evaluate>>; unit: Unit }) {
  const inc = fmtWeight(increment(ex, unit), unit);
  if (ex.noLoad)
    return (
      <div className={`verdict verdict--${p.verdict}`}>
        <p className="verdict__head">{p.verdict === 'naik' ? 'Semua set di atas range' : 'Pertahanin'}</p>
        <p className="verdict__body">
          {p.verdict === 'naik' ? 'Sesi depan tahan lebih lama atau pelan-in tempo.' : 'Kejar angka atas range sesi depan.'}
        </p>
      </div>
    );
  if (p.verdict === 'naik')
    return (
      <div className="verdict verdict--naik">
        <p className="verdict__head">Naikin beban sesi depan</p>
        <p className="verdict__body">
          <span className="num verdict__num">
            {p.fromKg === 0 ? 'BW' : fmtWeight(p.fromKg, unit)} → {fmtWeight(p.nextKg, unit)}
            {unit}
          </span>
          <span>
            {ex.assisted ? `bantuan −${inc}${unit}` : `+${inc}${unit} ${ex.kind === 'compound' ? 'compound' : 'isolasi'}`} · balik ke {ex.range[0]} rep
          </span>
        </p>
      </div>
    );
  return (
    <div className={`verdict verdict--${p.verdict}`}>
      <p className="verdict__head">{p.verdict === 'tetap' ? 'Beban sama sesi depan' : 'Beban sama, tambah reps'}</p>
      <p className="verdict__body">
        <span className="num verdict__num">
          {p.fromKg === 0 ? 'BW' : `${fmtWeight(p.fromKg, unit)}${unit}`}
        </span>
        <span>
          {p.verdict === 'tetap'
            ? `ada set di bawah ${ex.range[0]} rep`
            : `kejar ${ex.range[1]} rep di semua set`}
        </span>
      </p>
    </div>
  );
}
