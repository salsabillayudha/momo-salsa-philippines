import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type BodyMetric } from '../db';
import { useUnit } from '../hooks';
import { fmtDate, fmtNum, fromUnit, isoDate, toUnit, weekPosition } from '../logic';
import { Stepper } from '../components/Stepper';
import { ConfirmButton } from '../components/ConfirmButton';
import { LineChartBox } from '../components/LineChartBox';

type Key = 'weight' | 'hips' | 'waist' | 'thigh' | 'arm';
const FIELDS: { key: Key; label: string; how: string }[] = [
  { key: 'weight', label: 'Berat', how: 'Rata-rata timbangan pagi minggu ini' },
  { key: 'hips', label: 'Pinggul', how: 'Bagian paling lebar, berdiri rileks' },
  { key: 'waist', label: 'Pinggang', how: 'Sejajar pusar' },
  { key: 'thigh', label: 'Paha', how: '15 cm di atas lutut' },
  { key: 'arm', label: 'Lengan', how: 'Tengah bisep, rileks' },
];

export function BodyScreen() {
  const unit = useUnit();
  const entries = useLiveQuery(() => db.body.orderBy('date').toArray(), []);
  const [date, setDate] = useState(isoDate());
  const [vals, setVals] = useState<Partial<Record<Key, number | null>>>({});
  const [metric, setMetric] = useState<Key>('weight');
  const [saved, setSaved] = useState(false);

  const existing = entries?.find((e) => e.date === date);
  useEffect(() => {
    const e = entries?.find((x) => x.date === date);
    setVals(
      e ? { ...e, weight: e.weight == null ? null : toUnit(e.weight, unit) } : {},
    );
    // load the stored entry when the date (or the data) changes
  }, [date, entries, unit]);

  if (!entries) return <div className="page" />;

  const save = async () => {
    const row: Omit<BodyMetric, 'id'> = { date };
    for (const f of FIELDS) {
      const v = vals[f.key];
      if (v != null && v > 0) row[f.key] = f.key === 'weight' ? fromUnit(v, unit) : v;
    }
    if (existing) await db.body.put({ ...row, id: existing.id });
    else await db.body.add(row as BodyMetric);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const unitOf = (k: Key) => (k === 'weight' ? unit : 'cm');
  const show = (k: Key, v: number) => (k === 'weight' ? toUnit(v, unit) : v);
  const points = entries
    .filter((e) => e[metric] != null)
    .map((e) => ({ x: weekPosition(e.date), y: show(metric, e[metric]!), label: fmtDate(e.date) }));
  const first = points[0]?.y;
  const lastP = points[points.length - 1]?.y;

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="display">Badan</h1>
        <p className="meta">Ukur tiap 2 minggu (minggu 1, 3, 5, …). Meteran jahit lebih jujur dari timbangan.</p>
      </header>

      <div className="chips" role="tablist">
        {FIELDS.map((f) => (
          <button key={f.key} role="tab" aria-selected={metric === f.key} className={`chip${metric === f.key ? ' is-on' : ''}`} onClick={() => setMetric(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {points.length ? (
        <>
          <div className="stat-row">
            <div className="stat">
              <span className="stat__label">Sekarang</span>
              <span className="stat__num num">{fmtNum(lastP, 1)}</span>
              <span className="stat__unit">{unitOf(metric)}</span>
            </div>
            {points.length > 1 && <div className="stat">
              <span className="stat__label">Sejak awal</span>
              <span className="stat__num num">
                {lastP - first > 0 ? '+' : lastP - first < 0 ? '−' : '±'}
                {fmtNum(Math.abs(lastP - first), 1)}
              </span>
              <span className="stat__unit">{unitOf(metric)}</span>
            </div>}
          </div>
          <LineChartBox
            data={points}
            unit={unitOf(metric)}
            xDomain={[1, 17]}
            xTicks={[1, 3, 5, 7, 9, 11, 13, 15]}
            xFormat={(x) => `M${Math.floor(x)}`}
          />
        </>
      ) : (
        <p className="empty">Belum ada data {FIELDS.find((f) => f.key === metric)!.label.toLowerCase()}.</p>
      )}
      {metric === 'weight' && (
        <p className="footnote">
          Awal {fmtNum(toUnit(51.4, unit), 1)} {unit} · target minggu 16: {fmtNum(toUnit(54, unit), 1)}–{fmtNum(toUnit(55, unit), 1)} {unit}. Naik 0,2–0,3 kg/minggu = pas.
        </p>
      )}
      {metric === 'hips' && <p className="footnote">Target: naik jelas. Pinggang relatif tetap.</p>}

      <section className="form">
        <p className="section-label section-label--spaced">{existing ? 'Ubah catatan' : 'Catatan baru'}</p>
        <label className="field">
          <span className="field__label">Tanggal</span>
          <input className="field__input" type="date" value={date} max={isoDate()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        {FIELDS.map((f) => (
          <div key={f.key} className="form__item">
            <Stepper
              size="normal"
              label={f.label}
              suffix={unitOf(f.key)}
              value={vals[f.key] ?? null}
              onChange={(v) => setVals({ ...vals, [f.key]: v })}
              step={f.key === 'weight' ? (unit === 'kg' ? 0.1 : 0.2) : 0.5}
              decimals={1}
            />
            <span className="form__how">{f.how}</span>
          </div>
        ))}
        <button className="btn btn--primary btn--block" onClick={save}>
          {saved ? 'Tersimpan ✓' : existing ? 'Simpan perubahan' : 'Simpan'}
        </button>
      </section>

      {entries.length > 0 && (
        <section>
          <p className="section-label section-label--spaced">Semua catatan</p>
          <ul className="log">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="log__row log__row--body">
                <button className="log__date log__date--btn" onClick={() => (setDate(e.date), window.scrollTo({ top: 0, behavior: 'smooth' }))}>
                  {fmtDate(e.date, { day: 'numeric', month: 'short' })}
                </button>
                <span className="log__sets num">
                  {FIELDS.filter((f) => e[f.key] != null).map((f) => `${f.label[0]} ${fmtNum(show(f.key, e[f.key]!), 1)}`).join(' · ')}
                </span>
                <ConfirmButton className="btn btn--ghost btn--tiny" confirm="Hapus?" onConfirm={() => db.body.delete(e.id)}>
                  ×
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
