import { LearnerMode } from '../data/copyDeck';
import {
  FamilyId,
  LETTER_FAMILIES,
  LETTERS_DATA,
  LetterRecord,
  PROGRESSIVE_WORDS,
  WordRecord
} from '../data/lettersAndFamilies';
import {
  GlyphForm,
  Point2D,
  sampleSvgPathEqualLength,
  simplifyPointsRDP
} from '../lib/strokeMath';

export type UserRole = 'learner' | 'teacher' | 'admin';
export type StepId = 'voir' | 'ecouter' | 'tracer' | 'ecrire' | 'retenir';

export interface User {
  id: string;
  role: UserRole;
  email: string;
  displayName: string;
  mode: LearnerMode;
  birthYear?: number;
  teacherId?: string;
  createdAt: string;
  entitlement: 'free' | 'full';
}

export interface Progress {
  userId: string;
  letterId: string;
  stepsDone: StepId[];
  box: 0 | 1 | 2 | 3 | 4 | 5; // Sec. 6.6: Box 5 = mastered (gold star)
  nextReviewAt: string; // YYYY-MM-DD
  stars: 0 | 1 | 2 | 3;
  firstDoneAt?: string;
  masteredAt?: string;
  firstTrace?: Point2D[]; // Ramer-Douglas-Peucker simplified, < 2 KB
  bestTrace?: Point2D[];  // Ramer-Douglas-Peucker simplified, < 2 KB
  bestTraceScore?: number;
}

export interface Attempt {
  id: string;
  userId: string;
  letterId: string;
  type: 'trace' | 'quiz';
  score: number;
  passed: boolean;
  reason?: string;
  createdAt: string;
}

export type SubmissionStatus = 'pending' | 'correct' | 'redo';

export type SubmissionReason =
  | 'points'
  | 'direction'
  | 'taille'
  | 'lignes'
  | 'prononciation'
  | 'rythme';

export interface Submission {
  id: string;
  userId: string;
  studentFirstName: string;
  letterId: string;
  wordId?: string;
  kind?: 'photo' | 'audio';
  imageRef?: string;
  audioRef?: string;
  durationSec?: number;
  parentalConsent?: boolean;
  expiresAtIso?: string;
  status: SubmissionStatus;
  reasons?: SubmissionReason[];
  comment?: string;
  voiceReplyRef?: string;
  correctedBy?: string;
  correctedAt?: string;
  createdAt: string;
}

export interface PracticeAttempt {
  id: string;
  date: string;
  score: number;
  points: Point2D[]; // Ramer-Douglas-Peucker simplified, < 2 KB
}

export interface TeacherLinkInfo {
  teacherName: string;
  teacherCode: string;
  whatsapp: string;
}

export interface DailyMissionsProgress {
  dateIso: string;
  revoir: boolean;
  jeu: boolean;
  tracer: boolean;
}

export interface ActivationCode {
  code: string;
  createdBy: string;
  usedBy?: string;
  usedAt?: string;
  expiresAt?: string;
  plan: 'one-time' | 'subscription';
}

export interface Certificate {
  id: string;
  userId: string;
  learnerName: string;
  issuedAt: string;
  serial: string;
}

export interface Streak {
  userId: string;
  current: number;
  best: number;
  lastActiveDate: string;
  repairUsedWeek: boolean;
}

export interface Setting {
  userId: string;
  theme: 'light' | 'dark';
  sound: boolean;
  haptics: boolean;
  animations?: boolean; // Phase A.1: Reglages toggle "Animations" (default on)
  weeklyGoal: 2 | 3 | 5;
  rhythm: 'calme' | 'normal' | 'intensif';
  voiceName: string | null;
  transliteration: boolean;
}

export interface AdminConfig {
  priceDisplayFr: string;
  paypalUrl: string;
  whatsappUrl: string;
  cardUrl: string;
  supportEmail: string;
  whatsappNumber: string;
}

export interface BlueprintState {
  activeUserId: string;
  users: User[];
  progress: Progress[];
  attempts: Attempt[];
  submissions: Submission[];
  offlineUploadQueue?: Submission[]; // Phase F.2: queue for photo/voice uploads when offline
  activationCodes: ActivationCode[];
  certificates: Certificate[];
  streaks: Streak[];
  settings: Setting[];
  readWordIds: Record<string, string[]>; // userId -> completed word IDs
  passedFamilyExams: Record<string, FamilyId[]>; // userId -> passed family exams
  passedFinalExam: Record<string, boolean>;
  dailyChallengeDoneDate: Record<string, string>;
  dailyMissionsDone: Record<string, DailyMissionsProgress>;
  weeklyLettersCompleted: Record<
    string,
    { weekMondayIso: string; letterIds: string[] }
  >;
  miniGameDoneUsers: Record<string, boolean>;
  lastPlayedGameId: Record<string, string>;
  sessionCounter?: number; // Phase F.1: seed = date + sessionCounter
  recentQuizItemKeys?: string[]; // Phase F.1: no item repeated within last 20
  practiceHistory: Record<string, PracticeAttempt[]>; // `${userId}_${letterId}` -> max 10
  onboardingDoneUsers: Record<string, boolean>;
  coachMarkStepUsers: Record<string, number>; // 0 = Commencer, 1..5 = lesson steps, 99 = done
  harakatLessonSeenUsers: Record<string, boolean>;
  teacherLinks: Record<string, TeacherLinkInfo>;
  failedCodeAttempts: Record<string, number[]>; // userId -> timestamps (ms)
  letterOverrides: Record<
    string,
    {
      videoPaperUrl?: string;
      tip?: string;
      isolatedGlyph?: GlyphForm;
    }
  >;
  customWords: WordRecord[];
  adminConfig: AdminConfig;
}

const STORAGE_KEY = 'nouqta_blueprint_v3_state';
export const GLYPH_EDITOR_STORAGE_KEY = 'nouqta_glyph_editor_overrides_v1';

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysToIsoDate(baseIso: string, days: number): string {
  const d = new Date(`${baseIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the ISO date (YYYY-MM-DD) of the Monday of the week for `todayIso` (Phase 3.2 resets Monday).
 */
export function getCurrentWeekMondayIso(todayIso = getTodayIsoDate()): string {
  const d = new Date(`${todayIso}T12:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

/**
 * Section 6.6 Spaced Repetition Review Scheduler:
 * Box 1: +1 day, Box 2: +3 days, Box 3: +7 days, Box 4: +21 days, Box 5: mastered (gold star)
 * Correct answer -> move up one box. Wrong answer -> back to Box 1.
 */
export function advanceReviewBox(
  currentBox: 0 | 1 | 2 | 3 | 4 | 5,
  isCorrect: boolean,
  todayIso = getTodayIsoDate()
): {
  nextBox: 0 | 1 | 2 | 3 | 4 | 5;
  nextReviewAt: string;
  newlyMastered: boolean;
} {
  if (!isCorrect) {
    return {
      nextBox: 1,
      nextReviewAt: addDaysToIsoDate(todayIso, 1),
      newlyMastered: false
    };
  }
  const nextBox = Math.min(5, currentBox + 1) as
    | 1
    | 2
    | 3
    | 4
    | 5;
  const delayMap: Record<number, number> = {
    1: 1,
    2: 3,
    3: 7,
    4: 21,
    5: 90
  };
  return {
    nextBox,
    nextReviewAt: addDaysToIsoDate(todayIso, delayMap[nextBox] ?? 1),
    newlyMastered: nextBox === 5
  };
}

function createSampleHandwritingDataUrl(letterId: string): string {
  const isAlif = letterId === 'alif';
  const strokeItem = (tx: number, ty: number) =>
    isAlif
      ? `<path d="M ${tx} ${ty - 55} Q ${tx - 2} ${ty - 20} ${tx} ${ty}" fill="none" stroke="#07463D" stroke-width="5.5" stroke-linecap="round"/>`
      : `<g>
          <path d="M ${tx + 34} ${ty - 16} C ${tx + 24} ${ty + 4}, ${tx - 24} ${ty + 4}, ${tx - 34} ${ty - 14}" fill="none" stroke="#07463D" stroke-width="5" stroke-linecap="round"/>
          <circle cx="${tx}" cy="${ty + 16}" r="4.5" fill="#07463D"/>
        </g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
    <rect width="600" height="400" fill="#EEF3F0"/>
    <rect x="24" y="24" width="552" height="352" rx="18" fill="#FFFFFF" stroke="#C5D1CC" stroke-width="2"/>
    <line x1="56" y1="165" x2="544" y2="165" stroke="#0B6B5D" stroke-width="2"/>
    <line x1="56" y1="125" x2="544" y2="125" stroke="#C5D1CC" stroke-dasharray="6 6"/>
    <line x1="56" y1="285" x2="544" y2="285" stroke="#0B6B5D" stroke-width="2"/>
    <line x1="56" y1="245" x2="544" y2="245" stroke="#C5D1CC" stroke-dasharray="6 6"/>
    ${[490, 390, 290, 190, 95].map((x) => strokeItem(x, 162)).join('')}
    ${[490, 390, 290].map((x) => strokeItem(x, 282)).join('')}
    <circle cx="520" cy="64" r="16" fill="#07463D"/>
    <rect x="56" y="54" width="160" height="14" rx="7" fill="#C5D1CC"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildSeedTracesForLetter(letterId: string): {
  firstTrace: Point2D[];
  bestTrace: Point2D[];
} {
  const letter = LETTERS_DATA.find((l) => l.id === letterId) || LETTERS_DATA[0];
  const body = letter.forms.isolated.strokes[0];
  const d = body && body.kind === 'body' ? body.d : 'M 100 36 L 100 124';
  const cleanSamples = sampleSvgPathEqualLength(d, 40);
  const wobblySamples = cleanSamples.map((p, idx) => ({
    x: p.x + Math.sin(idx * 0.9) * 5.2,
    y: p.y + Math.cos(idx * 0.8) * 4.5
  }));
  return {
    firstTrace: simplifyPointsRDP(wobblySamples, 1.8),
    bestTrace: simplifyPointsRDP(cleanSamples, 1.5)
  };
}

export function getInitialBlueprintState(): BlueprintState {
  const today = getTodayIsoDate();
  const weekMonday = getCurrentWeekMondayIso(today);
  const alifTraces = buildSeedTracesForLetter('alif');
  const baaTraces = buildSeedTracesForLetter('baa');

  return {
    activeUserId: 'u_learner_1',
    users: [
      {
        id: 'u_learner_1',
        role: 'learner',
        email: 'yasmine@nouqta.fr',
        displayName: 'Yasmine',
        mode: 'adult',
        teacherId: 'u_teacher_1',
        createdAt: '2026-03-01',
        entitlement: 'free'
      },
      {
        id: 'u_kid_1',
        role: 'learner',
        email: 'parent.adam@nouqta.fr',
        displayName: 'Adam',
        mode: 'kids',
        birthYear: 2018,
        teacherId: 'u_teacher_1',
        createdAt: '2026-03-10',
        entitlement: 'full'
      },
      {
        id: 'u_teacher_1',
        role: 'teacher',
        email: 'ustadh.karim@nouqta.fr',
        displayName: 'Oustadh Karim',
        mode: 'adult',
        createdAt: '2026-01-15',
        entitlement: 'full'
      },
      {
        id: 'u_admin_1',
        role: 'admin',
        email: 'admin@nouqta.fr',
        displayName: 'Direction Nouqta',
        mode: 'adult',
        createdAt: '2026-01-01',
        entitlement: 'full'
      }
    ],
    progress: [
      {
        userId: 'u_learner_1',
        letterId: 'alif',
        stepsDone: ['voir', 'ecouter', 'tracer', 'ecrire', 'retenir'],
        box: 5,
        nextReviewAt: addDaysToIsoDate(today, 14),
        stars: 3,
        firstDoneAt: '2026-03-20',
        masteredAt: '2026-03-25',
        firstTrace: alifTraces.firstTrace,
        bestTrace: alifTraces.bestTrace,
        bestTraceScore: 98
      },
      {
        userId: 'u_learner_1',
        letterId: 'baa',
        stepsDone: [],
        box: 0,
        nextReviewAt: today,
        stars: 0
      },
      {
        userId: 'u_kid_1',
        letterId: 'alif',
        stepsDone: ['voir', 'ecouter', 'tracer', 'ecrire', 'retenir'],
        box: 5,
        nextReviewAt: addDaysToIsoDate(today, 10),
        stars: 3,
        firstDoneAt: '2026-03-18',
        masteredAt: '2026-03-24',
        firstTrace: alifTraces.firstTrace,
        bestTrace: alifTraces.bestTrace,
        bestTraceScore: 96
      },
      {
        userId: 'u_kid_1',
        letterId: 'baa',
        stepsDone: ['voir', 'ecouter', 'tracer', 'ecrire', 'retenir'],
        box: 2,
        nextReviewAt: today,
        stars: 3,
        firstDoneAt: '2026-03-22',
        firstTrace: baaTraces.firstTrace,
        bestTrace: baaTraces.bestTrace,
        bestTraceScore: 95
      }
    ],
    attempts: [],
    submissions: [
      {
        id: 'sub_1',
        userId: 'u_learner_1',
        studentFirstName: 'Yasmine',
        letterId: 'alif',
        imageRef: createSampleHandwritingDataUrl('alif'),
        status: 'correct',
        comment: 'Tige bien droite et posée sur la ligne.',
        correctedBy: 'u_teacher_1',
        correctedAt: 'Hier',
        createdAt: 'Hier'
      },
      {
        id: 'sub_3',
        userId: 'u_kid_1',
        studentFirstName: 'Adam',
        letterId: 'baa',
        kind: 'photo',
        imageRef: createSampleHandwritingDataUrl('baa'),
        status: 'pending',
        createdAt: 'Il y a 25 min'
      },
      {
        id: 'sub_4_audio',
        userId: 'u_learner_1',
        studentFirstName: 'Yasmine',
        letterId: 'baa',
        kind: 'audio',
        imageRef: '',
        audioRef: 'data:audio/webm;base64,NOUQTA_SEED_AUDIO',
        durationSec: 12,
        parentalConsent: true,
        status: 'pending',
        createdAt: 'Il y a 10 min'
      }
    ],
    activationCodes: [
      {
        code: 'NOUQTA-2026',
        createdBy: 'u_admin_1',
        plan: 'one-time'
      },
      {
        code: 'ALIF-2026',
        createdBy: 'u_admin_1',
        plan: 'one-time'
      },
      {
        code: 'ZELLIGE-100',
        createdBy: 'u_admin_1',
        plan: 'one-time'
      }
    ],
    certificates: [],
    streaks: [
      {
        userId: 'u_learner_1',
        current: 4,
        best: 7,
        lastActiveDate: today,
        repairUsedWeek: false
      },
      {
        userId: 'u_kid_1',
        current: 3,
        best: 5,
        lastActiveDate: today,
        repairUsedWeek: false
      }
    ],
    settings: [
      {
        userId: 'u_learner_1',
        theme: 'light',
        sound: true,
        haptics: true,
        animations: true,
        weeklyGoal: 3,
        rhythm: 'normal',
        voiceName: null,
        transliteration: false
      },
      {
        userId: 'u_kid_1',
        theme: 'light',
        sound: true,
        haptics: true,
        animations: true,
        weeklyGoal: 3,
        rhythm: 'calme',
        voiceName: null,
        transliteration: true
      }
    ],
    readWordIds: {
      u_learner_1: ['w_ab'],
      u_kid_1: ['w_ab', 'w_baab']
    },
    passedFamilyExams: {
      u_learner_1: [],
      u_kid_1: []
    },
    passedFinalExam: {},
    dailyChallengeDoneDate: {},
    dailyMissionsDone: {
      u_learner_1: {
        dateIso: today,
        revoir: true,
        jeu: false,
        tracer: false
      },
      u_kid_1: {
        dateIso: today,
        revoir: true,
        jeu: false,
        tracer: false
      }
    },
    weeklyLettersCompleted: {
      u_learner_1: { weekMondayIso: weekMonday, letterIds: ['alif'] },
      u_kid_1: { weekMondayIso: weekMonday, letterIds: ['alif', 'baa'] }
    },
    miniGameDoneUsers: {},
    lastPlayedGameId: {},
    practiceHistory: {
      u_learner_1_alif: [
        {
          id: 'prac_seed_1',
          date: '2026-03-20',
          score: 88,
          points: alifTraces.firstTrace
        },
        {
          id: 'prac_seed_2',
          date: '2026-03-25',
          score: 98,
          points: alifTraces.bestTrace
        }
      ],
      u_kid_1_alif: [
        {
          id: 'prac_seed_3',
          date: '2026-03-24',
          score: 96,
          points: alifTraces.bestTrace
        }
      ]
    },
    onboardingDoneUsers: {
      u_learner_1: true,
      u_kid_1: true
    },
    coachMarkStepUsers: {
      u_learner_1: 99,
      u_kid_1: 99
    },
    harakatLessonSeenUsers: {},
    teacherLinks: {
      u_learner_1: {
        teacherName: 'Oustadh Karim',
        teacherCode: 'PROF-KARIM',
        whatsapp: '+33600000000'
      },
      u_kid_1: {
        teacherName: 'Oustadh Karim',
        teacherCode: 'PROF-KARIM',
        whatsapp: '+33600000000'
      }
    },
    failedCodeAttempts: {},
    letterOverrides: {},
    customWords: [],
    adminConfig: {
      priceDisplayFr: 'Accès complet à vie — 39 € (paiement unique)',
      paypalUrl: 'https://www.paypal.com',
      whatsappUrl:
        'https://wa.me/33600000000?text=Bonjour%20Nouqta%2C%20je%20souhaite%20un%20code%20d%27activation',
      cardUrl: 'https://checkout.stripe.com',
      supportEmail: 'contact@nouqta.fr',
      whatsappNumber: '+33 6 00 00 00 00'
    }
  };
}

export function loadBlueprintState(): BlueprintState {
  if (typeof window === 'undefined') return getInitialBlueprintState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialBlueprintState();
    const parsed = JSON.parse(raw) as BlueprintState;
    if (!parsed.users || !parsed.progress) return getInitialBlueprintState();
    const initial = getInitialBlueprintState();
    return {
      ...initial,
      ...parsed,
      dailyMissionsDone: {
        ...initial.dailyMissionsDone,
        ...(parsed.dailyMissionsDone || {})
      },
      practiceHistory: {
        ...initial.practiceHistory,
        ...(parsed.practiceHistory || {})
      },
      teacherLinks: {
        ...initial.teacherLinks,
        ...(parsed.teacherLinks || {})
      }
    };
  } catch {
    return getInitialBlueprintState();
  }
}

export function saveBlueprintState(state: BlueprintState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * PHASE 3.6 LETTER ALBUM ("Mon cahier"):
 * Stores the learner's FIRST successful trace and BEST trace as simplified point arrays
 * (Ramer-Douglas-Peucker, strictly under 2 KB each).
 */
export function saveLearnerTraceForAlbum(
  state: BlueprintState,
  userId: string,
  letterId: string,
  rawPoints: Point2D[],
  coverageScore = 90
): BlueprintState {
  if (rawPoints.length < 2) return state;
  const simplified = simplifyPointsRDP(rawPoints, 1.8);
  const existing = state.progress.find(
    (p) => p.userId === userId && p.letterId === letterId
  );

  if (!existing) {
    const newProg: Progress = {
      userId,
      letterId,
      stepsDone: [],
      box: 0,
      nextReviewAt: getTodayIsoDate(),
      stars: 0,
      firstTrace: simplified,
      bestTrace: simplified,
      bestTraceScore: coverageScore
    };
    return {
      ...state,
      progress: [...state.progress, newProg]
    };
  }

  const firstTrace =
    existing.firstTrace && existing.firstTrace.length >= 2
      ? existing.firstTrace
      : simplified;
  const isBetter =
    !existing.bestTrace ||
    existing.bestTrace.length < 2 ||
    coverageScore >= (existing.bestTraceScore ?? 0);

  const updated: Progress = {
    ...existing,
    firstTrace,
    bestTrace: isBetter ? simplified : existing.bestTrace,
    bestTraceScore: isBetter
      ? Math.max(coverageScore, existing.bestTraceScore ?? 0)
      : existing.bestTraceScore
  };

  return {
    ...state,
    progress: state.progress.map((p) =>
      p.userId === userId && p.letterId === letterId ? updated : p
    )
  };
}

/**
 * PHASE C1 CALLIGRAPHY PRACTICE WITH HISTORY:
 * Saves a practice attempt (RDP-simplified < 2 KB) with date and score %.
 * Keeps the last 10 attempts per letter, and feeds the best attempt into "Mon cahier".
 */
export function savePracticeAttemptToHistory(
  state: BlueprintState,
  userId: string,
  letterId: string,
  rawPoints: Point2D[],
  scorePercent: number,
  dateIso = getTodayIsoDate()
): BlueprintState {
  if (rawPoints.length < 2) return state;
  const simplified = simplifyPointsRDP(rawPoints, 1.8);
  const key = `${userId}_${letterId}`;
  const prevList = state.practiceHistory?.[key] || [];
  const nextAttempt: PracticeAttempt = {
    id: `prac_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: dateIso,
    score: Math.round(scorePercent),
    points: simplified
  };
  const updatedList = [...prevList, nextAttempt].slice(-10); // Keep last 10 attempts per letter

  const afterAlbum = saveLearnerTraceForAlbum(
    state,
    userId,
    letterId,
    simplified,
    Math.round(scorePercent)
  );

  return {
    ...afterAlbum,
    practiceHistory: {
      ...(afterAlbum.practiceHistory || {}),
      [key]: updatedList
    }
  };
}

/**
 * PHASE B5: Marks one of the 3 daily missions ('revoir' | 'jeu' | 'tracer') completed for today.
 */
export function markDailyMissionDone(
  state: BlueprintState,
  userId: string,
  mission: 'revoir' | 'jeu' | 'tracer',
  todayIso = getTodayIsoDate()
): BlueprintState {
  const prev = state.dailyMissionsDone?.[userId];
  const base: DailyMissionsProgress =
    prev && prev.dateIso === todayIso
      ? prev
      : { dateIso: todayIso, revoir: false, jeu: false, tracer: false };
  const next: DailyMissionsProgress = {
    ...base,
    [mission]: true
  };
  const allThreeDone = next.revoir && next.jeu && next.tracer;
  return {
    ...state,
    dailyMissionsDone: {
      ...(state.dailyMissionsDone || {}),
      [userId]: next
    },
    dailyChallengeDoneDate: allThreeDone
      ? {
          ...(state.dailyChallengeDoneDate || {}),
          [userId]: todayIso
        }
      : state.dailyChallengeDoneDate
  };
}

let inMemoryGlyphOverrides: Record<string, GlyphForm> = {};

/**
 * PHASE E: Loads saved glyph overrides from localStorage (/dev/glyphs).
 * Prioritizes Validé ('valide' | 'validated') and saved overrides across reloads.
 */
export function loadGlyphEditorOverrides(): Record<string, GlyphForm> {
  if (typeof window === 'undefined') {
    return { ...inMemoryGlyphOverrides };
  }
  try {
    const raw = window.localStorage.getItem(GLYPH_EDITOR_STORAGE_KEY);
    if (!raw) return { ...inMemoryGlyphOverrides };
    const parsed = JSON.parse(raw) as Record<string, GlyphForm>;
    return parsed && typeof parsed === 'object'
      ? { ...inMemoryGlyphOverrides, ...parsed }
      : { ...inMemoryGlyphOverrides };
  } catch {
    return { ...inMemoryGlyphOverrides };
  }
}

export function saveGlyphEditorOverride(
  letterId: string,
  glyph: GlyphForm
): Record<string, GlyphForm> {
  const current = loadGlyphEditorOverrides();
  const next: Record<string, GlyphForm> = {
    ...current,
    [letterId]: glyph
  };
  inMemoryGlyphOverrides = { ...next };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(GLYPH_EDITOR_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

export function clearGlyphEditorOverride(letterId?: string): void {
  if (!letterId) {
    inMemoryGlyphOverrides = {};
  } else {
    delete inMemoryGlyphOverrides[letterId];
  }
  if (typeof window === 'undefined') return;
  try {
    if (!letterId) {
      window.localStorage.removeItem(GLYPH_EDITOR_STORAGE_KEY);
    } else {
      const current = loadGlyphEditorOverrides();
      delete current[letterId];
      window.localStorage.setItem(
        GLYPH_EDITOR_STORAGE_KEY,
        JSON.stringify(current)
      );
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns all 28 letters merged with /dev/glyphs localStorage overrides (Validé loaded first)
 * and any teacher/admin state overrides.
 */
export function getLettersWithOverrides(state?: BlueprintState): LetterRecord[] {
  const editorOverrides = loadGlyphEditorOverrides();
  return LETTERS_DATA.map((l) => {
    const ov = state?.letterOverrides?.[l.id];
    const editorGlyph = editorOverrides[l.id];
    const resolvedGlyph = editorGlyph ?? ov?.isolatedGlyph ?? l.forms.isolated;
    const dotStrokes = resolvedGlyph.strokes.filter((s) => s.kind === 'dot');
    return {
      ...l,
      videoPaperUrl: ov?.videoPaperUrl ?? l.videoPaperUrl,
      tip: ov?.tip ?? l.tip,
      dots: {
        count: resolvedGlyph.dotRule?.count ?? dotStrokes.length,
        position:
          resolvedGlyph.dotRule?.position === 'inside'
            ? 'below'
            : resolvedGlyph.dotRule?.position ?? l.dots.position
      },
      forms: {
        ...l.forms,
        isolated: resolvedGlyph
      }
    };
  });
}

/**
 * Creates a clean brand-new learner state with zero completed steps (for Mandatory Self-Check #4).
 */
export function createBrandNewLearnerState(): BlueprintState {
  const base = getInitialBlueprintState();
  const newUserId = 'u_new_learner';
  return {
    ...base,
    activeUserId: newUserId,
    users: [
      ...base.users,
      {
        id: newUserId,
        role: 'learner',
        email: 'nouveau@nouqta.fr',
        displayName: 'Nouvel Apprenant',
        mode: 'adult',
        createdAt: getTodayIsoDate(),
        entitlement: 'free'
      }
    ],
    progress: [],
    settings: [
      ...base.settings,
      {
        userId: newUserId,
        theme: 'light',
        sound: true,
        haptics: true,
        animations: true,
        weeklyGoal: 3,
        rhythm: 'normal',
        voiceName: null,
        transliteration: false
      }
    ]
  };
}

export function isFamilyUnlockedForUser(
  state: BlueprintState,
  userId: string,
  familyId: FamilyId
): boolean {
  if (familyId === 'F1') return true;
  const user = state.users.find((u) => u.id === userId);
  if (!user) return false;
  if (user.entitlement !== 'full') return false;

  const famIndex = LETTER_FAMILIES.findIndex((f) => f.id === familyId);
  if (famIndex <= 0) return true;
  const prevFamily = LETTER_FAMILIES[famIndex - 1];
  const passedExams = state.passedFamilyExams[userId] || [];
  if (passedExams.includes(prevFamily.id)) return true;

  const allPrevLettersDone = prevFamily.letters.every((lid) => {
    const prog = state.progress.find(
      (p) => p.userId === userId && p.letterId === lid
    );
    return prog && prog.stepsDone.length === 5;
  });

  return allPrevLettersDone || user.entitlement === 'full';
}

export function isLetterUnlockedForUser(
  state: BlueprintState,
  userId: string,
  letterId: string
): boolean {
  const letter = LETTERS_DATA.find((l) => l.id === letterId);
  if (!letter) return false;
  if (!isFamilyUnlockedForUser(state, userId, letter.family)) return false;

  const fam = LETTER_FAMILIES.find((f) => f.id === letter.family);
  if (!fam) return false;
  const idxInFam = fam.letters.indexOf(letterId);
  if (idxInFam <= 0) return true;

  const existingProg = state.progress.find(
    (p) => p.userId === userId && p.letterId === letterId
  );
  if (existingProg && existingProg.stepsDone.length > 0) return true;

  const prevLetterId = fam.letters[idxInFam - 1];
  const prevProg = state.progress.find(
    (p) => p.userId === userId && p.letterId === prevLetterId
  );
  return Boolean(prevProg && prevProg.stepsDone.length >= 5);
}

/**
 * Returns the list of letter IDs that the learner has unlocked or completed (for Section 6.4 progressive vocabulary filtering).
 */
export function getUnlockedLetterIdsForUser(
  state: BlueprintState,
  userId: string
): string[] {
  return LETTERS_DATA.filter((l) =>
    isLetterUnlockedForUser(state, userId, l.id)
  ).map((l) => l.id);
}

/**
 * Returns the current active "Today" letter for the learner on Parcours.
 */
export function getTodayLetterForUser(
  state: BlueprintState,
  userId: string
): {
  letter: LetterRecord;
  progress: Progress;
  isFirstRun: boolean;
} {
  const letters = getLettersWithOverrides(state);
  const userProg = state.progress.filter((p) => p.userId === userId);
  const isFirstRun = userProg.length === 0;

  for (const letter of letters) {
    if (!isLetterUnlockedForUser(state, userId, letter.id)) continue;
    const prog = userProg.find((p) => p.letterId === letter.id);
    if (!prog || prog.stepsDone.length < 5) {
      return {
        letter,
        progress: prog || {
          userId,
          letterId: letter.id,
          stepsDone: [],
          box: 0,
          nextReviewAt: getTodayIsoDate(),
          stars: 0
        },
        isFirstRun
      };
    }
  }

  const first = letters[0];
  return {
    letter: first,
    progress: userProg.find((p) => p.letterId === first.id) || {
      userId,
      letterId: first.id,
      stepsDone: [],
      box: 0,
      nextReviewAt: getTodayIsoDate(),
      stars: 0
    },
    isFirstRun
  };
}

export function getDailyReviewQueue(
  state: BlueprintState,
  userId: string,
  todayIso = getTodayIsoDate()
): LetterRecord[] {
  const letters = getLettersWithOverrides(state);
  const dueProgress = state.progress
    .filter(
      (p) =>
        p.userId === userId &&
        p.stepsDone.length >= 5 &&
        p.nextReviewAt <= todayIso
    )
    .slice(0, 5);

  return dueProgress
    .map((p) => letters.find((l) => l.id === p.letterId))
    .filter((l): l is LetterRecord => Boolean(l));
}

/**
 * Records completion of one of the 5 steps ('voir' | 'ecouter' | 'tracer' | 'ecrire' | 'retenir')
 * and updates streak, weekly goal progress, & review scheduling.
 */
export function markStepCompleted(
  state: BlueprintState,
  userId: string,
  letterId: string,
  step: StepId,
  quizStars?: 0 | 1 | 2 | 3
): BlueprintState {
  const today = getTodayIsoDate();
  const weekMonday = getCurrentWeekMondayIso(today);
  const existing = state.progress.find(
    (p) => p.userId === userId && p.letterId === letterId
  );

  const stepsDone: StepId[] = existing
    ? Array.from(new Set([...existing.stepsDone, step]))
    : [step];

  const isFinishingLoop = step === 'retenir' || stepsDone.length === 5;
  const nextBox =
    existing?.box && existing.box > 0
      ? existing.box
      : isFinishingLoop
      ? 1
      : 0;

  // Ensure trace data exists for album when finishing or tracing
  const fallbackTraces =
    !existing?.firstTrace && (step === 'tracer' || isFinishingLoop)
      ? buildSeedTracesForLetter(letterId)
      : undefined;

  const updatedProg: Progress = {
    userId,
    letterId,
    stepsDone,
    box: nextBox as 0 | 1 | 2 | 3 | 4 | 5,
    nextReviewAt: existing?.nextReviewAt || addDaysToIsoDate(today, 1),
    stars:
      typeof quizStars === 'number'
        ? (Math.max(existing?.stars || 0, quizStars) as 0 | 1 | 2 | 3)
        : existing?.stars || 0,
    firstDoneAt:
      existing?.firstDoneAt || (isFinishingLoop ? today : undefined),
    masteredAt: existing?.masteredAt,
    firstTrace: existing?.firstTrace || fallbackTraces?.firstTrace,
    bestTrace: existing?.bestTrace || fallbackTraces?.bestTrace,
    bestTraceScore: existing?.bestTraceScore ?? (fallbackTraces ? 94 : undefined)
  };

  const progressList = existing
    ? state.progress.map((p) =>
        p.userId === userId && p.letterId === letterId ? updatedProg : p
      )
    : [...state.progress, updatedProg];

  // Update weekly letters completed (resets Monday, Phase 3.2)
  const prevWeekly = state.weeklyLettersCompleted?.[userId];
  const baseWeeklyIds =
    prevWeekly && prevWeekly.weekMondayIso === weekMonday
      ? prevWeekly.letterIds
      : [];
  const nextWeeklyIds = isFinishingLoop
    ? Array.from(new Set([...baseWeeklyIds, letterId]))
    : baseWeeklyIds;

  // Update streak
  const existingStreak = state.streaks.find((s) => s.userId === userId);
  let streaks = state.streaks;
  if (!existingStreak) {
    streaks = [
      ...state.streaks,
      {
        userId,
        current: 1,
        best: 1,
        lastActiveDate: today,
        repairUsedWeek: false
      }
    ];
  } else if (existingStreak.lastActiveDate !== today) {
    const nextCurrent = existingStreak.current + 1;
    streaks = state.streaks.map((s) =>
      s.userId === userId
        ? {
            ...s,
            current: nextCurrent,
            best: Math.max(s.best, nextCurrent),
            lastActiveDate: today
          }
        : s
    );
  }

  return {
    ...state,
    progress: progressList,
    streaks,
    weeklyLettersCompleted: {
      ...(state.weeklyLettersCompleted || {}),
      [userId]: {
        weekMondayIso: weekMonday,
        letterIds: nextWeeklyIds
      }
    }
  };
}

export function redeemActivationCode(
  state: BlueprintState,
  userId: string,
  rawCode: string,
  nowMs = Date.now()
): {
  nextState: BlueprintState;
  ok: boolean;
  errorFr?: string;
} {
  const oneHourAgo = nowMs - 3600 * 1000;
  const recentFailures = (state.failedCodeAttempts[userId] || []).filter(
    (ts) => ts > oneHourAgo
  );

  if (recentFailures.length >= 5) {
    return {
      nextState: state,
      ok: false,
      errorFr: 'Trop de tentatives. Réessayez dans une heure.'
    };
  }

  const normalized = rawCode.trim().toUpperCase();
  const codeRecord = state.activationCodes.find(
    (c) => c.code.toUpperCase() === normalized
  );

  const today = getTodayIsoDate();
  const isExpired =
    codeRecord?.expiresAt && codeRecord.expiresAt < today;

  if (!codeRecord || codeRecord.usedBy || isExpired) {
    return {
      nextState: {
        ...state,
        failedCodeAttempts: {
          ...state.failedCodeAttempts,
          [userId]: [...recentFailures, nowMs]
        }
      },
      ok: false,
      errorFr: "Ce code n'est pas valide"
    };
  }

  const nextState: BlueprintState = {
    ...state,
    users: state.users.map((u) =>
      u.id === userId ? { ...u, entitlement: 'full' } : u
    ),
    activationCodes: state.activationCodes.map((c) =>
      c.code.toUpperCase() === normalized
        ? { ...c, usedBy: userId, usedAt: today }
        : c
    )
  };

  return {
    nextState,
    ok: true
  };
}

export function getWordsForState(state: BlueprintState): WordRecord[] {
  return [...PROGRESSIVE_WORDS, ...(state.customWords || [])];
}
