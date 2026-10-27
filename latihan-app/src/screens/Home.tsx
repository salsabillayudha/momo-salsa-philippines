import { useLiveQuery } from 'dexie-react-hooks';
import { byRecency, db } from '../db';
import { go, useUnit } from '../hooks';
import { fmtDate, formatSets, isoDate, parseISO, programWeek } from '../logic';
import {
  PROGRAM_START, SESSION_NAME, SESSION_ORDER, SESSION_WEEKDAY, TOTAL_WEEKS, sessionTemplate, weekInfo, type SessionType,
} from '../program';
import { lastSessions, startWorkout } from '../workouts';

const DAY = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function Home() {
  const unit = useUnit();
  const today = isoDate();
  const rawWeek = programWeek(today);
  const info = weekInfo(rawWeek);
  const weekday = parseISO(today).getDay();

  const workouts = useLiveQuery(() => db.workouts.toArray(), []);
  if (!workouts) return <div className="page" />;
  workouts.sort(byRecency);

  const active = workouts.find((w) => !w.finishedAt);
  const lastDone = workouts.find((w) => w.finishedAt);
  const thisWeek = workouts.filter((w) => w.week === info.week);
  const doneTypes = new Set(thisWeek.map((w) => w.session));
  const todayType = SESSION_ORDER.find((s) => SESSION_WEEKDAY[s] === weekday);

  const suggested: SessionType | undefined =
    todayType && !doneTypes.has(todayType) ? todayType : SESSION_ORDER.find((s) => !doneTypes.has(s));
  const isTrainingDay = !!todayType && suggested === todayType;

  const begin = async (s: SessionType) => go(`/latihan/${await startWorkout(s)}`);

  return (
    <div className="page home">
      <header className="home-head">
        <p className="eyebrow">{fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <div className="week">
          <span className="week__label">Minggu</span>
          <span className="week__num num">{rawWeek < 1 ? '–' : info.week}</span>
          <span className="week__of num">/ {TOTAL_WEEKS}</span>
        </div>
        <p className="meta">
          {rawWeek < 1
            ? `Program mulai ${fmtDate(PROGRAM_START, { day: 'numeric', month: 'long' })}`
            : rawWeek > TOTAL_WEEKS
              ? 'Program 16 minggu selesai. Waktunya InBody ulang.'
              : info.deload
                ? `Deload · beban 50%, 2 set · setelah Blok ${info.block.id}`
                : `Blok ${info.block.id} — ${info.block.name} · Reps ${info.block.repRange[0]}–${info.block.repRange[1]} · RIR ${info.block.rir}`}
        </p>
        <WeekRuler current={rawWeek} />
      </header>

      {active ? (
        <section className="today">
          <p className="section-label">Lagi berjalan</p>
          <h2 className="display">{SESSION_NAME[active.session]}</h2>
          <p className="meta">Dimulai {fmtDate(active.date)}</p>
          <button className="btn btn--primary btn--block" onClick={() => go(`/latihan/${active.id}`)}>
            Lanjutkan latihan
          </button>
        </section>
      ) : suggested ? (
        <TodayCard
          type={suggested}
          heading={isTrainingDay ? 'Hari ini' : todayType ? 'Berikutnya' : `Hari ini ${DAY[weekday].toLowerCase()} — istirahat`}
          sub={isTrainingDay ? undefined : `Jadwalnya ${DAY[SESSION_WEEKDAY[suggested]]}. Boleh dimulai sekarang.`}
          blockId={info.block.id}
          deload={info.deload}
          unit={unit}
          onStart={() => begin(suggested!)}
        />
      ) : (
        <section className="today">
          <p className="section-label">Minggu ini</p>
          <h2 className="display">Tuntas.</h2>
          <p className="meta">Tiga sesi selesai. Makan, tidur, balik lagi Senin.</p>
        </section>
      )}

      <section className="block-list">
        <p className="section-label">Minggu {info.week}</p>
        <ul className="checklist">
          {SESSION_ORDER.map((s) => {
            const w = thisWeek.find((x) => x.session === s);
            return (
              <li key={s} className={w?.finishedAt ? 'is-done' : ''}>
                <span className="checklist__day">{DAY[SESSION_WEEKDAY[s]].slice(0, 3)}</span>
                <span className="checklist__name">{SESSION_NAME[s]}</span>
                {w ? (
                  <a className="checklist__state" href={`#/latihan/${w.id}`}>{w.finishedAt ? 'selesai →' : 'berjalan →'}</a>
                ) : active ? (
                  <span className="checklist__state">—</span>
                ) : (
                  <button className="checklist__state checklist__start" onClick={() => begin(s)}>mulai</button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {lastDone && (
        <a className="last-workout" href={`#/latihan/${lastDone.id}`}>
          <span className="section-label">Latihan terakhir</span>
          <span className="last-workout__name">{SESSION_NAME[lastDone.session]}</span>
          <span className="meta">{fmtDate(lastDone.date, { weekday: 'long', day: 'numeric', month: 'long' })} · minggu {lastDone.week} →</span>
        </a>
      )}
    </div>
  );
}

function WeekRuler({ current }: { current: number }) {
  return (
    <div className="ruler" aria-hidden>
      {Array.from({ length: TOTAL_WEEKS }, (_, i) => {
        const w = i + 1;
        const wi = weekInfo(w);
        return (
          <span
            key={w}
            className={`ruler__tick${w < current ? ' is-past' : ''}${w === current ? ' is-now' : ''}${wi.deload ? ' is-deload' : ''}${
              w === 7 || w === 13 ? ' is-block' : ''
            }`}
          />
        );
      })}
    </div>
  );
}

function TodayCard({ type, heading, sub, blockId, deload, unit, onStart }: {
  type: SessionType;
  heading: string;
  sub?: string;
  blockId: 1 | 2 | 3;
  deload: boolean;
  unit: ReturnType<typeof useUnit>;
  onStart: () => void;
}) {
  const t = sessionTemplate(blockId, type, deload);
  const last = useLiveQuery(() => lastSessions(t.exercises.map((e) => e.id)), [blockId, type, deload]);
  return (
    <section className="today">
      <p className="section-label">{heading}</p>
      <h2 className="display">{t.title}</h2>
      <p className="meta">{t.subtitle}{sub ? ` · ${sub}` : ''}</p>
      <ol className="preview">
        {t.exercises.map((e) => (
          <li key={e.id}>
            <span className="preview__name">{e.name}</span>
            <span className="preview__rx num">{e.sets}×{e.range[0] === e.range[1] ? e.range[0] : `${e.range[0]}–${e.range[1]}`}</span>
            {last?.[e.id] && <span className="preview__last num">{formatSets(last[e.id].sets, e, unit)}</span>}
          </li>
        ))}
      </ol>
      <button className="btn btn--primary btn--block" onClick={onStart}>
        Mulai {t.title}
      </button>
    </section>
  );
}
