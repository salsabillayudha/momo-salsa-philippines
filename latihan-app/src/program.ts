// The 16-week program, transcribed from "Program 16 Minggu — Lean Bulk & Glute Development".
// Exercise ids are stable across blocks wherever the movement is the same, so
// "Terakhir" and history carry over when an exercise reappears in a later block.

export type SessionType = 'LA' | 'UP' | 'LB';
export type Kind = 'compound' | 'isolation';

export interface Block {
  id: 1 | 2 | 3;
  name: string;
  weeks: [number, number];
  repRange: [number, number];
  rir: number;
  deloadWeek?: number;
  note: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  range: [number, number];
  kind: Kind;
  cue: string;
  /** label after reps, e.g. "/kaki", "dtk" */
  repUnit?: string;
  /** dumbbell weight is entered per hand */
  perHand?: boolean;
  /** no external load (plank, dead bug): reps/time only */
  noLoad?: boolean;
  /** weight is assistance, so progress by going lighter */
  assisted?: boolean;
  extra?: string;
}

export interface SessionTemplate {
  type: SessionType;
  title: string;
  subtitle: string;
  exercises: Exercise[];
}

export const PROGRAM_START = '2026-09-07'; // Senin, minggu 1
export const TOTAL_WEEKS = 16;

export const BLOCKS: Block[] = [
  {
    id: 1,
    name: 'Foundation',
    weeks: [1, 5],
    repRange: [10, 15],
    rir: 3,
    deloadWeek: 6,
    note: 'Belajar pola gerakan, bangun tendon dan mind-muscle connection. Jangan kejar berat.',
  },
  {
    id: 2,
    name: 'Build',
    weeks: [7, 11],
    repRange: [8, 12],
    rir: 2,
    deloadWeek: 12,
    note: 'Barbell masuk. Istirahat 2 menit di compound. Minta 1 sesi form check ke coach sebelum mulai.',
  },
  {
    id: 3,
    name: 'Intensify',
    weeks: [13, 16],
    repRange: [6, 12],
    rir: 1,
    note: 'Volume glutes naik, intensitas naik. Set terakhir compound boleh sampai mentok.',
  },
];

export const SESSION_ORDER: SessionType[] = ['LA', 'UP', 'LB'];
/** getDay() of the planned training day: Senin, Rabu, Kamis */
export const SESSION_WEEKDAY: Record<SessionType, number> = { LA: 1, UP: 3, LB: 4 };
export const SESSION_NAME: Record<SessionType, string> = { LA: 'LOWER A', UP: 'UPPER', LB: 'LOWER B' };

// Cues, taken from the program and the beginner movement guide.
const CUE = {
  hipThrust: 'Dagu ke dada, rusuk turun. Dorong lewat tumit, remas glutes 1 detik di puncak.',
  rdl: 'Lutut ditekuk sedikit lalu kunci. Dorong pinggul ke belakang, berhenti saat hamstring ketarik.',
  bss: 'Condongin badan ke depan ~30°. 90% berat di kaki depan. Selesaikan satu kaki dulu.',
  abduction: 'Condongin badan ke depan 30–45°. Tahan 1 detik di posisi paling terbuka.',
  legPress: 'Kaki tinggi & lebar di papan. Bokong tetap nempel, jangan kunci lutut.',
  lateral: 'Ringan. Kelingking sedikit lebih tinggi dari jempol, turun 3 detik. Badan diam.',
  row: 'Dada nempel sandaran. Tarik ke pinggang, remas tulang belikat.',
  pushdown: 'Siku nempel di samping badan — cuma lengan bawah yang gerak.',
  press: 'Naikin dumbbell pakai paha. Siku ~45° dari badan.',
  incline: 'Bench 30–45°. Siku ~45° dari badan, turun terkontrol.',
  legCurl: 'Pinggul tetap nempel bantalan. Turunin pelan 2–3 detik.',
  lunge: 'Dua lutut ~90°, lutut belakang hampir nyentuh lantai. Dorong tumit kaki depan.',
  squat: 'Dorong pinggul ke belakang, lutut ikut arah ujung kaki, tumit nempel.',
  kickback: 'Pinggul diam, tendang ke belakang pakai glutes, bukan punggung.',
} as const;

const ex = (
  id: string,
  name: string,
  sets: number,
  range: [number, number],
  kind: Kind,
  cue: string,
  opts: Partial<Exercise> = {},
): Exercise => ({ id, name, sets, range, kind, cue, ...opts });

const TEMPLATES: Record<1 | 2 | 3, Record<SessionType, SessionTemplate>> = {
  1: {
    LA: {
      type: 'LA',
      title: 'LOWER A',
      subtitle: 'Glute focus',
      exercises: [
        ex('glute-bridge', 'Glute bridge', 3, [12, 15], 'compound', 'Dorong lewat tumit, remas bokong 1 detik. Yang naik pinggul, bukan punggung.', { extra: 'bodyweight → barbell ringan' }),
        ex('goblet-squat', 'Goblet squat', 3, [10, 12], 'compound', CUE.squat),
        ex('db-rdl', 'Dumbbell RDL', 3, [10, 12], 'compound', CUE.rdl, { perHand: true }),
        ex('leg-press', 'Leg press', 3, [10, 12], 'compound', CUE.legPress),
        ex('hip-abduction', 'Hip abduction machine', 3, [16, 20], 'isolation', CUE.abduction),
        ex('plank', 'Plank', 3, [24, 30], 'isolation', 'Siku di bawah bahu. Kencangin perut, remas bokong, napas normal.', { noLoad: true, repUnit: 'dtk' }),
      ],
    },
    LB: {
      type: 'LB',
      title: 'LOWER B',
      subtitle: 'Posterior chain + unilateral',
      exercises: [
        ex('hip-thrust-machine', 'Hip thrust (machine / Smith)', 3, [12, 15], 'compound', CUE.hipThrust),
        ex('bulgarian-split-squat', 'Bulgarian split squat', 3, [8, 10], 'compound', CUE.bss, { repUnit: '/kaki', perHand: true, extra: 'bodyweight dulu' }),
        ex('lying-leg-curl', 'Lying leg curl', 3, [10, 12], 'isolation', 'Bantalan tepat di atas tumit. ' + CUE.legCurl),
        ex('walking-lunge', 'Walking lunge', 3, [10, 12], 'compound', CUE.lunge, { repUnit: '/kaki', perHand: true }),
        ex('standing-calf-raise', 'Standing calf raise', 3, [12, 15], 'isolation', 'Turun sampai betis ketarik, jinjit maksimal, tahan 1 detik.'),
        ex('dead-bug', 'Dead bug', 3, [8, 10], 'isolation', 'Punggung bawah nempel lantai terus. Kalau terangkat, kurangi jangkauan.', { noLoad: true, repUnit: '/sisi' }),
      ],
    },
    UP: {
      type: 'UP',
      title: 'UPPER',
      subtitle: 'Push focus',
      exercises: [
        ex('db-chest-press', 'Dumbbell chest press', 3, [10, 12], 'compound', CUE.press, { perHand: true }),
        ex('seated-db-shoulder-press', 'Seated dumbbell shoulder press', 3, [10, 12], 'compound', 'Punggung nempel sandaran. Dorong sampai hampir lurus, jangan kunci siku.', { perHand: true }),
        ex('incline-db-press', 'Incline dumbbell press', 3, [10, 12], 'compound', CUE.incline, { perHand: true }),
        ex('lateral-raise', 'Lateral raise', 3, [12, 15], 'isolation', CUE.lateral, { perHand: true }),
        ex('chest-supported-row', 'Chest-supported row', 2, [10, 12], 'compound', CUE.row + ' Ringan — satu gerakan tarik aja.', { perHand: true }),
        ex('tricep-pushdown', 'Tricep pushdown', 3, [12, 15], 'isolation', CUE.pushdown),
        ex('db-bicep-curl', 'Dumbbell bicep curl', 2, [10, 12], 'isolation', 'Siku nempel di samping badan. Badan jangan ngayun.', { perHand: true }),
      ],
    },
  },
  2: {
    LA: {
      type: 'LA',
      title: 'LOWER A',
      subtitle: 'Glute focus',
      exercises: [
        ex('barbell-hip-thrust', 'Barbell hip thrust', 4, [8, 10], 'compound', CUE.hipThrust),
        ex('squat', 'Barbell / Smith squat', 3, [8, 10], 'compound', CUE.squat),
        ex('barbell-rdl', 'Barbell RDL', 3, [8, 10], 'compound', CUE.rdl),
        ex('leg-press', 'Leg press', 3, [10, 12], 'compound', CUE.legPress),
        ex('cable-kickback', 'Cable kickback', 3, [12, 15], 'isolation', CUE.kickback, { repUnit: '/kaki' }),
        ex('hip-abduction', 'Hip abduction', 3, [16, 20], 'isolation', CUE.abduction, { extra: 'badan condong ke depan' }),
      ],
    },
    LB: {
      type: 'LB',
      title: 'LOWER B',
      subtitle: 'Posterior chain + unilateral',
      exercises: [
        ex('bulgarian-split-squat', 'Bulgarian split squat', 4, [6, 8], 'compound', CUE.bss, { repUnit: '/kaki', perHand: true, extra: 'pakai dumbbell' }),
        ex('b-stance-hip-thrust', 'B-stance hip thrust', 3, [8, 10], 'compound', CUE.hipThrust, { repUnit: '/kaki' }),
        ex('seated-leg-curl', 'Seated leg curl', 4, [8, 10], 'isolation', CUE.legCurl),
        ex('leg-extension', 'Leg extension', 3, [10, 12], 'isolation', 'Duduk mepet sandaran. Tahan 1 detik di atas, turun pelan.'),
        ex('step-up', 'Step-up ke box tinggi', 3, [8, 10], 'compound', 'Dorong lewat tumit kaki di atas box — kaki bawah jangan bantu lompat.', { repUnit: '/kaki', perHand: true }),
        ex('cable-woodchop', 'Cable woodchop', 3, [10, 12], 'isolation', 'Putar dari pinggul dan perut, lengan cuma ngikut.', { repUnit: '/sisi' }),
      ],
    },
    UP: {
      type: 'UP',
      title: 'UPPER',
      subtitle: 'Push',
      exercises: [
        ex('bench-press', 'Barbell / dumbbell bench press', 4, [8, 10], 'compound', 'Tulang belikat dirapatkan, kaki napak. Turun terkontrol ke dada bawah.'),
        ex('overhead-press', 'Overhead press', 4, [8, 10], 'compound', 'Perut & bokong dikencangin, jangan melengkung. Dorong lurus ke atas.'),
        ex('incline-db-press', 'Incline dumbbell press', 3, [8, 10], 'compound', CUE.incline, { perHand: true }),
        ex('lateral-raise', 'Lateral raise', 4, [12, 15], 'isolation', CUE.lateral, { perHand: true, extra: 'drop set di set terakhir' }),
        ex('chest-supported-row', 'Chest-supported row', 2, [8, 10], 'compound', CUE.row, { perHand: true }),
        ex('overhead-tricep-extension', 'Overhead tricep extension', 3, [10, 12], 'isolation', 'Siku nunjuk ke depan dan diam. Turun sampai trisep ketarik.'),
        ex('hammer-curl', 'Hammer curl', 3, [8, 10], 'isolation', 'Telapak saling berhadapan, siku nempel badan.', { perHand: true }),
      ],
    },
  },
  3: {
    LA: {
      type: 'LA',
      title: 'LOWER A',
      subtitle: 'Glute priority',
      exercises: [
        ex('barbell-hip-thrust', 'Barbell hip thrust', 4, [6, 8], 'compound', CUE.hipThrust, { extra: 'berat' }),
        ex('barbell-rdl', 'Barbell RDL', 4, [6, 8], 'compound', CUE.rdl),
        ex('squat', 'Squat (barbell / hack squat)', 3, [6, 8], 'compound', CUE.squat),
        ex('back-extension', 'Back extension', 3, [10, 12], 'isolation', 'Versi glute-biased: punggung agak bulat, dagu ke dada, dorong pinggul ke bantalan.'),
        ex('cable-kickback', 'Cable kickback', 3, [10, 12], 'isolation', CUE.kickback, { repUnit: '/kaki', extra: '+ drop set' }),
        ex('hip-abduction', 'Hip abduction', 3, [16, 20], 'isolation', CUE.abduction, { extra: 'rest-pause' }),
      ],
    },
    LB: {
      type: 'LB',
      title: 'LOWER B',
      subtitle: 'Unilateral + hamstring',
      exercises: [
        ex('bulgarian-split-squat', 'Bulgarian split squat', 4, [6, 8], 'compound', CUE.bss, { repUnit: '/kaki', perHand: true, extra: 'dumbbell berat' }),
        ex('single-leg-hip-thrust', 'Single-leg hip thrust', 4, [8, 10], 'compound', CUE.hipThrust, { repUnit: '/kaki' }),
        ex('db-rdl', 'Dumbbell RDL', 3, [8, 10], 'compound', CUE.rdl, { perHand: true, extra: 'tempo turun 3 detik' }),
        ex('seated-leg-curl', 'Seated leg curl', 4, [8, 10], 'isolation', CUE.legCurl, { extra: '+ drop set' }),
        ex('walking-lunge', 'Walking lunge', 3, [16, 20], 'compound', CUE.lunge, { repUnit: 'langkah', perHand: true }),
        ex('cable-crunch', 'Cable crunch', 3, [12, 15], 'isolation', 'Tarik pakai perut, bukan tangan. Pinggul diam.'),
      ],
    },
    UP: {
      type: 'UP',
      title: 'UPPER',
      subtitle: 'Push',
      exercises: [
        ex('bench-press', 'Bench press', 4, [6, 8], 'compound', 'Tulang belikat dirapatkan, kaki napak. Turun terkontrol ke dada bawah.'),
        ex('overhead-press', 'Overhead press', 4, [6, 8], 'compound', 'Perut & bokong dikencangin, jangan melengkung. Dorong lurus ke atas.'),
        ex('assisted-dips', 'Assisted dips', 3, [6, 8], 'compound', 'Badan agak condong ke depan. Beban = bantuan: makin kecil, makin berat.', { assisted: true }),
        ex('incline-db-press', 'Incline dumbbell press', 3, [8, 10], 'compound', CUE.incline, { perHand: true }),
        ex('lateral-raise', 'Lateral raise', 4, [10, 12], 'isolation', CUE.lateral, { perHand: true, extra: 'myo-reps di set akhir' }),
        ex('chest-supported-row', 'Chest-supported row', 2, [8, 10], 'compound', CUE.row, { perHand: true }),
        ex('tricep-pushdown', 'Tricep pushdown', 3, [10, 12], 'isolation', CUE.pushdown, { extra: '+ drop set' }),
        ex('bicep-curl-21s', 'Bicep curl 21s', 2, [21, 21], 'isolation', '7 bawah → 7 atas → 7 penuh, tanpa jeda.', { perHand: true }),
      ],
    },
  },
};

export interface WeekInfo {
  week: number;
  block: Block;
  deload: boolean;
}

export function weekInfo(week: number): WeekInfo {
  const w = Math.min(TOTAL_WEEKS, Math.max(1, week));
  for (const b of BLOCKS) {
    if (w >= b.weeks[0] && w <= b.weeks[1]) return { week: w, block: b, deload: false };
    if (b.deloadWeek === w) return { week: w, block: b, deload: true };
  }
  return { week: w, block: BLOCKS[0], deload: false };
}

/** Deload: same exercises, 2 sets, weight halved (handled when prefilling). */
export function sessionTemplate(blockId: 1 | 2 | 3, type: SessionType, deload = false): SessionTemplate {
  const t = TEMPLATES[blockId][type];
  if (!deload) return t;
  return { ...t, exercises: t.exercises.map((e) => ({ ...e, sets: Math.min(2, e.sets) })) };
}

/** Every exercise in the program, keyed by id (latest block's definition wins). */
export const ALL_EXERCISES: Map<string, Exercise> = (() => {
  const m = new Map<string, Exercise>();
  for (const b of [1, 2, 3] as const)
    for (const s of SESSION_ORDER) for (const e of TEMPLATES[b][s].exercises) m.set(e.id, e);
  return m;
})();
