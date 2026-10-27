import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Unit } from './logic';

export function useUnit(): Unit {
  const s = useLiveQuery(() => db.settings.get('unit'), []);
  return (s?.value as Unit) ?? 'kg';
}

export function setUnit(unit: Unit) {
  return db.settings.put({ key: 'unit', value: unit });
}

// Hash routes: #/  #/latihan/12  #/gerakan  #/gerakan/hip-thrust  #/badan  #/program
export function useRoute(): string[] {
  const read = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => {
      setParts(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

export function go(path: string) {
  location.hash = path;
}
