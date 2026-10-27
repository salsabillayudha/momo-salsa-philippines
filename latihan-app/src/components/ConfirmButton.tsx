import { useEffect, useState, type ReactNode } from 'react';

/** Two-tap confirm instead of a modal: first tap arms, second tap acts. */
export function ConfirmButton({ children, confirm = 'Ketuk lagi untuk yakin', onConfirm, className = 'btn btn--ghost' }: {
  children: ReactNode;
  confirm?: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className={`${className}${armed ? ' is-armed' : ''}`}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirm : children}
    </button>
  );
}
