import { useEffect, useRef, useState } from 'react';
import { fmtNum } from '../logic';

interface Props {
  label: string;
  suffix?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min?: number;
  decimals?: number;
  size?: 'hero' | 'normal';
  placeholder?: string;
}

/** − [ big number, typeable ] +  — every target ≥ 48px. */
export function Stepper({ label, suffix, value, onChange, step, min = 0, decimals = 2, size = 'hero', placeholder = '–' }: Props) {
  const [text, setText] = useState(value == null ? '' : fmtNum(value, decimals));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value == null ? '' : fmtNum(value, decimals));
  }, [value, decimals]);

  const bump = (dir: 1 | -1) => {
    const base = value ?? 0;
    const next = Math.max(min, Math.round((base + dir * step) * 100) / 100);
    onChange(next);
  };

  return (
    <div className={`stepper stepper--${size}`}>
      <span className="stepper__label">
        {label}
        {suffix && <em> {suffix}</em>}
      </span>
      <div className="stepper__row">
        <button type="button" className="stepper__btn" aria-label={`Kurangi ${label}`} onClick={() => bump(-1)}>
          −
        </button>
        <input
          className="stepper__input num"
          inputMode={decimals ? 'decimal' : 'numeric'}
          enterKeyHint="done"
          aria-label={label}
          placeholder={placeholder}
          value={text}
          onFocus={(e) => {
            focused.current = true;
            e.currentTarget.select();
          }}
          onBlur={() => {
            focused.current = false;
            setText(value == null ? '' : fmtNum(value, decimals));
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,]/g, '');
            setText(raw);
            if (raw === '') return onChange(null);
            const n = Number(raw.replace(',', '.'));
            if (Number.isFinite(n)) onChange(decimals ? n : Math.round(n));
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <button type="button" className="stepper__btn" aria-label={`Tambah ${label}`} onClick={() => bump(1)}>
          +
        </button>
      </div>
    </div>
  );
}
