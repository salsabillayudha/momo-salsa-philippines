import { useEffect } from 'react';
import { useRoute } from './hooks';
import { Home } from './screens/Home';
import { WorkoutScreen } from './screens/Workout';
import { ExerciseDetail, ExerciseList } from './screens/History';
import { BodyScreen } from './screens/Body';
import { ProgramScreen } from './screens/Program';
import { RestTimerProvider } from './components/RestTimer';

const TABS = [
  { href: '#/', key: '', label: 'Hari ini' },
  { href: '#/gerakan', key: 'gerakan', label: 'Gerakan' },
  { href: '#/badan', key: 'badan', label: 'Badan' },
  { href: '#/program', key: 'program', label: 'Program' },
];

export function App() {
  const [section = '', param] = useRoute();

  useEffect(() => {
    // ask the browser not to evict IndexedDB under storage pressure
    void navigator.storage?.persist?.().catch(() => {});
  }, []);

  let screen;
  if (section === 'latihan' && param) screen = <WorkoutScreen id={Number(param)} />;
  else if (section === 'gerakan') screen = param ? <ExerciseDetail id={param} /> : <ExerciseList />;
  else if (section === 'badan') screen = <BodyScreen />;
  else if (section === 'program') screen = <ProgramScreen />;
  else screen = <Home />;

  const activeTab = section === 'latihan' ? '' : section;

  return (
    <RestTimerProvider>
      <main>{screen}</main>
      <nav className="tabs" aria-label="Navigasi">
        {TABS.map((t) => (
          <a key={t.key} href={t.href} className={`tabs__item${activeTab === t.key ? ' is-on' : ''}`} aria-current={activeTab === t.key ? 'page' : undefined}>
            {t.label}
          </a>
        ))}
      </nav>
    </RestTimerProvider>
  );
}
