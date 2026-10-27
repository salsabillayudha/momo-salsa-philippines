import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fmtClock } from '../logic';

interface Timer {
  endAt: number;
  total: number;
  label: string;
}

interface Ctx {
  timer: Timer | null;
  start: (seconds: number, label: string) => void;
}

const TimerCtx = createContext<Ctx>({ timer: null, start: () => {} });
export const useRestTimer = () => useContext(TimerCtx);

const KEY = 'latihan.rest';
let audio: AudioContext | null = null;

/** Must run inside a tap so iOS lets the sound play later. */
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
}

function beep() {
  if (!audio) return;
  const t0 = audio.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 2 ? 1320 : 880;
    const t = t0 + i * 0.28;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.24);
  }
}

function load(): Timer | null {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Timer | null;
    return t && t.endAt > Date.now() ? t : null;
  } catch {
    return null;
  }
}

function save(t: Timer | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: timer just won't survive a reload */
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<Timer | null>(load);
  const start = useCallback((seconds: number, label: string) => {
    unlockAudio();
    const t = { endAt: Date.now() + seconds * 1000, total: seconds, label };
    save(t);
    setTimer(t);
  }, []);
  return (
    <TimerCtx.Provider value={{ timer, start }}>
      {children}
      <RestBar timer={timer} setTimer={(t) => (save(t), setTimer(t))} />
    </TimerCtx.Provider>
  );
}

function RestBar({ timer, setTimer }: { timer: Timer | null; setTimer: (t: Timer | null) => void }) {
  const [now, setNow] = useState(Date.now());
  const fired = useRef<number | null>(null);
  const [doneAt, setDoneAt] = useState<number | null>(null);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  const remaining = timer ? (timer.endAt - now) / 1000 : 0;

  useEffect(() => {
    if (!timer || remaining > 0 || fired.current === timer.endAt) return;
    fired.current = timer.endAt;
    try {
      navigator.vibrate?.([300, 120, 300, 120, 500]);
    } catch {
      /* not supported */
    }
    beep();
    setDoneAt(Date.now());
    setTimer(null);
  }, [timer, remaining, setTimer]);

  useEffect(() => {
    if (!doneAt) return;
    const id = setTimeout(() => setDoneAt(null), 6000);
    return () => clearTimeout(id);
  }, [doneAt]);

  if (!timer && !doneAt) return null;

  if (!timer)
    return (
      <div className="rest rest--done" role="status" onClick={() => setDoneAt(null)}>
        <span className="rest__label">Istirahat selesai</span>
        <span className="rest__go">Waktunya set berikutnya</span>
      </div>
    );

  const pct = Math.min(100, (1 - remaining / timer.total) * 100);
  return (
    <div className="rest" role="timer" aria-live="off">
      <div className="rest__progress" style={{ width: `${pct}%` }} />
      <div className="rest__info">
        <span className="rest__label">Istirahat · {timer.label}</span>
        <span className="rest__clock num">{fmtClock(remaining)}</span>
      </div>
      <button className="rest__btn" onClick={() => setTimer({ ...timer, endAt: timer.endAt + 30_000, total: timer.total + 30 })}>
        +30
      </button>
      <button className="rest__btn" onClick={() => setTimer(null)}>
        Lewati
      </button>
    </div>
  );
}
