import { useRef, useState } from 'react';
import { exportData, importData } from '../db';
import { setUnit, useUnit } from '../hooks';
import { isoDate, programWeek } from '../logic';
import { BLOCKS, SESSION_ORDER, sessionTemplate, weekInfo } from '../program';

export function ProgramScreen() {
  const current = weekInfo(programWeek(isoDate()));
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="display">Program</h1>
        <p className="meta">16 minggu · 3 hari lifting · double progression.</p>
      </header>

      {BLOCKS.map((b) => (
        <section key={b.id} className={`blk${current.block.id === b.id ? ' is-current' : ''}`}>
          <div className="blk__head">
            <span className="blk__num num">{b.id}</span>
            <div>
              <h2 className="blk__name">{b.name}</h2>
              <p className="meta">
                Minggu {b.weeks[0]}–{b.weeks[1]} · Reps {b.repRange[0]}–{b.repRange[1]} · RIR {b.rir}
              </p>
            </div>
          </div>
          <p className="blk__note">{b.note}</p>
          {SESSION_ORDER.map((s) => {
            const t = sessionTemplate(b.id, s);
            return (
              <div key={s} className="blk__session">
                <h3 className="blk__title">
                  {t.title} <span>— {t.subtitle}</span>
                </h3>
                <table className="rx">
                  <tbody>
                    {t.exercises.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <a href={`#/gerakan/${e.id}`}>{e.name}</a>
                          {e.extra && <small> {e.extra}</small>}
                        </td>
                        <td className="num">
                          {e.sets} × {e.range[0] === e.range[1] ? e.range[0] : `${e.range[0]}–${e.range[1]}`}
                          {e.repUnit && <small>{e.repUnit.startsWith('/') ? e.repUnit : ` ${e.repUnit}`}</small>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {b.deloadWeek && (
            <p className="blk__deload">
              <b>Minggu {b.deloadWeek} = deload.</b> Beban 50%, 2 set. Tetap datang.
            </p>
          )}
        </section>
      ))}

      <section className="blk">
        <h2 className="blk__name">Aturan</h2>
        <ul className="rules">
          <li><b>Double progression.</b> Semua set kena angka atas range → naik beban (+2,5 kg compound, +1 kg isolasi), balik ke angka bawah. Ada set di bawah range → beban sama.</li>
          <li><b>Istirahat.</b> 120 detik compound, 90 detik isolasi. Timer jalan sendiri tiap set dicatat.</li>
          <li><b>Nyeri sendi</b> (lutut, bahu, pinggang) = berhenti. Nyeri otot = normal.</li>
          <li><b>Kehabisan waktu?</b> Prioritaskan 3 gerakan pertama.</li>
        </ul>
      </section>

      <Settings />
    </div>
  );
}

function Settings() {
  const unit = useUnit();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `latihan-${isoDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg(`Diekspor: ${data.workouts.length} sesi, ${data.sets.length} set, ${data.body.length} ukuran badan.`);
  };

  const doImport = async (f: File) => {
    try {
      await importData(JSON.parse(await f.text()));
      setMsg('Data dipulihkan dari cadangan.');
    } catch (e) {
      setMsg(e instanceof Error ? `Gagal: ${e.message}` : 'Gagal membaca file.');
    }
  };

  return (
    <section className="blk settings">
      <h2 className="blk__name">Pengaturan & data</h2>
      <p className="section-label">Satuan beban</p>
      <div className="seg">
        {(['kg', 'lb'] as const).map((u) => (
          <button key={u} className={`seg__btn${unit === u ? ' is-on' : ''}`} onClick={() => setUnit(u)}>
            {u}
          </button>
        ))}
      </div>
      <p className="section-label section-label--spaced">Cadangan</p>
      <p className="meta">Semua data cuma ada di HP ini. Ekspor rutin biar nggak hilang.</p>
      <button className="btn btn--primary btn--block" onClick={doExport}>Ekspor JSON</button>
      <button className="btn btn--ghost btn--block" onClick={() => file.current?.click()}>Impor JSON (ganti semua data)</button>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void doImport(f);
          e.target.value = '';
        }}
      />
      {msg && <p className="note" role="status">{msg}</p>}
    </section>
  );
}
