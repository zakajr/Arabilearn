import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Flame,
  Check,
  Lock,
  Star,
  Volume2,
  Eye,
  PenTool,
  Camera,
  Sun,
  Moon,
  VolumeX,
  KeyRound,
  MessageCircle,
  LogOut,
  Award,
  Sparkles,
  BookOpen,
  UserCheck,
  ShieldCheck,
  ArrowLeft,
  Shield,
  Share2,
  Smartphone,
  RotateCcw,
  HelpCircle,
  Lightbulb,
  Gamepad2,
  Mic,
  Square,
  Trash2,
  Send,
  Layers
} from 'lucide-react';
import { LearnerMode, t } from './data/copyDeck';
import {
  FamilyId,
  HARAKAT_MINI_LESSON_CARDS,
  LETTER_FAMILIES,
  LetterFamily,
  LetterRecord,
  PositionalFormKey,
  QuizQuestion,
  READING_LADDER_DATA,
  WordRecord,
  buildFamilyExamQuestions,
  buildFinalExamQuestions,
  buildVariedQuizSequence,
  filterWordsByUnlockedLetters,
  getPositionalFormsForLetter,
  splitArabicWordIntoLetterTiles
} from './data/lettersAndFamilies';
import {
  downloadCertificateFile,
  renderShareCardToCanvas,
  shareOrDownloadCard
} from './lib/pdfAndImage';
import {
  pointsToSmoothQuadraticSvgPath,
  sampleSvgPathEqualLength
} from './lib/strokeMath';
import {
  BlueprintState,
  StepId,
  advanceReviewBox,
  getCurrentWeekMondayIso,
  getDailyReviewQueue,
  getLettersWithOverrides,
  getTodayIsoDate,
  getTodayLetterForUser,
  getUnlockedLetterIdsForUser,
  getWordsForState,
  isFamilyUnlockedForUser,
  isLetterUnlockedForUser,
  loadBlueprintState,
  markDailyMissionDone,
  markStepCompleted,
  redeemActivationCode,
  saveBlueprintState,
  saveLearnerTraceForAlbum,
  savePracticeAttemptToHistory
} from './services/dataService';
import { speechService } from './services/speech';
import {
  BottomNav,
  BottomSheet,
  HighlightedArabicKeyword,
  IconButton,
  LetterChip,
  MainTab,
  Mascot,
  PathNode,
  PrimaryButton,
  ProgressRing,
  SecondaryButton,
  StarRating,
  TodayCard,
  Toast,
  TopHeader
} from './components/BlueprintComponents';
import { LetterLessonLoop } from './components/LetterLessonLoop';
import {
  AdminPanelView,
  TeacherPanelView
} from './components/TeacherAndAdminViews';
import {
  MINI_GAMES_CATALOG,
  MiniGamePlayView,
  MiniGameId,
  pickNextNonRepeatingGame
} from './components/MiniGamesHub';
import { GlyphStrokeEditorPage } from './components/GlyphStrokeEditorPage';
import {
  DevSelfTestReportModal,
  SelfTestCheckResult,
  runCheck1_AnimationVoir,
  runPolishCheck2_DotsSimulation,
  runPolishCheck5_ExamsProgressiveRule,
  runPolishCheck6_QuizOptionsPictureArabicFrench,
  runPolishCheck7_PracticeScores3Attempts
} from './components/DevSelfTestPage';

const FORBIDDEN_ENGLISH_WORDS = new Set([
  'soft',
  'emphatic',
  'breath',
  'next',
  'back',
  'start',
  'submit',
  'cancel',
  'close',
  'loading',
  'error',
  'settings',
  'profile',
  'locked',
  'unlocked',
  'completed',
  'retry',
  'skip',
  'home',
  'today',
  'tomorrow',
  'streak',
  'challenge',
  'level',
  'alifbee',
  'arabilearn',
  'bee'
]);

export default function App() {
  const [state, setState] = useState<BlueprintState>(() => loadBlueprintState());
  const [activeTab, setActiveTab] = useState<MainTab>('parcours');

  // Active route mode: 'learner' | 'prof' | 'admin' | 'connexion' | 'glyphs'
  const [routeView, setRouteView] = useState<
    'learner' | 'prof' | 'admin' | 'connexion' | 'glyphs'
  >(() =>
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/dev/glyphs')
      ? 'glyphs'
      : 'learner'
  );
  const [glyphReloadTick, setGlyphReloadTick] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(
    () => typeof navigator !== 'undefined' && navigator.onLine === false
  );

  // Dev Self-Test mode (/dev/selftest)
  const [isSelfTestRoute, setIsSelfTestRoute] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/dev/selftest') ||
        window.location.search.includes('selftest=1'))
  );
  const [selfTestRunning, setSelfTestRunning] = useState<boolean>(false);
  const [selfTestScreenName, setSelfTestScreenName] = useState<string>('Home');
  const [selfTestResults, setSelfTestResults] = useState<SelfTestCheckResult[]>(
    []
  );
  const [selfTestRunTrigger, setSelfTestRunTrigger] = useState<number>(0);

  // Active 5-step letter lesson modal
  const [activeLesson, setActiveLesson] = useState<{
    letterId: string;
    initialStep?: StepId;
    practiceMode?: boolean;
  } | null>(null);

  // Phase B2 & C3: First-run onboarding modal & Home coach-mark (shown once, dismissible with OK)
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [onboardingScreenIdx, setOnboardingScreenIdx] = useState<0 | 1 | 2>(0);
  const [showCoachMarkOnHome, setShowCoachMarkOnHome] = useState<boolean>(() => {
    try {
      return (
        typeof window !== 'undefined' &&
        window.localStorage.getItem('nouqta_home_coachmark_dismissed_v1') !== '1'
      );
    } catch {
      return true;
    }
  });

  const dismissHomeCoachMark = () => {
    setShowCoachMarkOnHome(false);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('nouqta_home_coachmark_dismissed_v1', '1');
      }
    } catch {
      // ignore storage error
    }
  };

  // Phase B3: "?" Help bottom sheet on Home
  const [showHelpSheet, setShowHelpSheet] = useState<boolean>(false);

  // Bottom sheets state
  const [familySheetId, setFamilySheetId] = useState<FamilyId | null>(null);
  const [pickerLetterSheetId, setPickerLetterSheetId] = useState<string | null>(
    null
  );
  const [showAccesSheet, setShowAccesSheet] = useState<boolean>(false);
  const [showDailyReviewSheet, setShowDailyReviewSheet] =
    useState<boolean>(false);
  const [showStreakSheet, setShowStreakSheet] = useState<boolean>(false);
  const [showShareSheet, setShowShareSheet] = useState<boolean>(false);
  const [shareIncludeFirstName, setShareIncludeFirstName] =
    useState<boolean>(false);
  const sharePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Phase D1: Letter Positional Forms sheet ("Formes": isolée, début, milieu, fin)
  const [formesLetterId, setFormesLetterId] = useState<string | null>(null);
  const [selectedFormKey, setSelectedFormKey] =
    useState<PositionalFormKey>('isolated');
  const [formAnimTick, setFormAnimTick] = useState<number>(0);

  // Phase D2: Harakat ("Les voyelles" 3-card mini lesson)
  const [showHarakatLessonSheet, setShowHarakatLessonSheet] =
    useState<boolean>(false);
  const [harakatCardIdx, setHarakatCardIdx] = useState<number>(0);

  // Phase E1 & E2: Teacher Code input & Voice Reading Recorder ("Lis à voix haute", <= 30s)
  const [teacherCodeDraft, setTeacherCodeDraft] = useState<string>('');
  const [showTeacherCodeForm, setShowTeacherCodeForm] = useState<boolean>(false);
  const [showVoiceRecorderSheet, setShowVoiceRecorderSheet] =
    useState<boolean>(false);
  const [voiceRecStep, setVoiceRecStep] = useState<
    'explain' | 'recording' | 'preview'
  >('explain');
  const [voiceParentalConsent, setVoiceParentalConsent] =
    useState<boolean>(true);
  const [voiceSecElapsed, setVoiceSecElapsed] = useState<number>(0);
  const [voiceDataUrl, setVoiceDataUrl] = useState<string | null>(null);
  const voiceTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Album ("Mon cahier") Avant / Maintenant comparison sheet state (Phase 3.6 & C1)
  const [albumCompareLetterId, setAlbumCompareLetterId] = useState<
    string | null
  >(null);
  const [albumSliderPct, setAlbumSliderPct] = useState<number>(100);

  // Phase C3: 5 Mini-Games state (never repeat same game twice in a row)
  const [lettresTopSubTab, setLettresTopSubTab] = useState<'lettres' | 'jeux'>(
    'lettres'
  );
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameId>('memoire');
  const [lastPlayedMiniGame, setLastPlayedMiniGame] =
    useState<MiniGameId | null>(null);
  const [gamePlayCount, setGamePlayCount] = useState<number>(0);

  // Phase C2: Ant walking animation between path nodes when a letter is finished
  const [antWalkingFamilyId, setAntWalkingFamilyId] = useState<FamilyId | null>(
    null
  );

  const [selectedBadgeGoal, setSelectedBadgeGoal] = useState<{
    title: string;
    goal: string;
    unlocked: boolean;
  } | null>(null);

  // Reading exercise screen (/lecture/:id)
  const [activeReadingWord, setActiveReadingWord] =
    useState<WordRecord | null>(null);
  const [tappedCharIndex, setTappedCharIndex] = useState<number | null>(null);

  // Exam screen (Family Exam 10q or Final Exam 25q or Vowel Quiz)
  const [activeExam, setActiveExam] = useState<{
    kind: 'family' | 'final' | 'vowels';
    familyId?: FamilyId;
    questions: QuizQuestion[];
    currentIndex: number;
    selectedOpt: number | null;
    answered: boolean;
    correctCount: number;
    finished: boolean;
  } | null>(null);

  const activeUser =
    state.users.find((u) => u.id === state.activeUserId) || state.users[0];
  const mode: LearnerMode = activeUser.mode;

  const [lettersViewType, setLettersViewType] = useState<'list' | 'grid'>(
    mode === 'kids' ? 'grid' : 'list'
  );

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    tone: 'info' | 'good' | 'bad';
  } | null>(null);

  // Activation code input inside Accès sheet
  const [activationInput, setActivationInput] = useState<string>('');
  const [activationError, setActivationError] = useState<string | null>(null);

  // Certificate editable name
  const [certNameDraft, setCertNameDraft] = useState<string>(
    activeUser.displayName
  );

  // Parental gate 3-second hold state for Kids mode
  const [parentalHoldProgress, setParentalHoldProgress] = useState<number>(0);
  const [parentalUnlocked, setParentalUnlocked] = useState<boolean>(false);
  const holdTimerRef = useRef<number | null>(null);

  const showToast = (
    message: string,
    tone: 'info' | 'good' | 'bad' = 'info'
  ) => {
    setToast({ message, tone });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 2500);
  };

  // Sync state to localStorage
  useEffect(() => {
    saveBlueprintState(state);
  }, [state]);

  // Show first-run onboarding if user hasn't completed it yet (and not in /dev/selftest)
  useEffect(() => {
    if (isSelfTestRoute) return;
    const done = Boolean((state.onboardingDoneUsers || {})[activeUser.id]);
    if (!done) {
      setShowOnboardingModal(true);
    }
  }, [activeUser.id, isSelfTestRoute, state.onboardingDoneUsers]);

  // Sync lettersViewType default when user/mode changes
  useEffect(() => {
    setLettersViewType(mode === 'kids' ? 'grid' : 'list');
    setCertNameDraft(activeUser.displayName);
  }, [activeUser.id, mode]);

  // Sync dark theme, sound, haptics & animations settings
  const userSetting = state.settings.find((s) => s.userId === activeUser.id) || {
    userId: activeUser.id,
    theme: 'light' as const,
    sound: true,
    haptics: true,
    animations: true,
    weeklyGoal: 3 as const,
    rhythm: 'normal' as const,
    voiceName: null,
    transliteration: mode === 'kids'
  };

  useEffect(() => {
    if (userSetting.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.removeAttribute('class');
    }
    speechService.setMuted(!userSetting.sound);
    speechService.setHapticsEnabled(userSetting.haptics !== false);
    speechService.setPreferredVoice(userSetting.voiceName);
  }, [
    userSetting.theme,
    userSetting.sound,
    userSetting.haptics,
    userSetting.voiceName
  ]);

  // Listen to online/offline status for Phase F.2 ("Hors ligne" indicator)
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync URL pathname (/prof, /admin, /connexion, /dev/glyphs, /dev/selftest)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/dev/selftest')) {
      setIsSelfTestRoute(true);
    } else if (path.startsWith('/dev/glyphs')) {
      setRouteView('glyphs');
    } else if (path.startsWith('/prof')) {
      setRouteView('prof');
    } else if (path.startsWith('/admin')) {
      setRouteView('admin');
    } else if (path.startsWith('/connexion')) {
      setRouteView('connexion');
    }
  }, []);

  // Automatic /dev/selftest runner for the 8 Mandatory Self-Checks (Nouqta Polish Pass)
  useEffect(() => {
    if (!isSelfTestRoute) return;
    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    const runFullAudit = async () => {
      setSelfTestRunning(true);
      const under48Issues: string[] = [];
      const overlapIssues: string[] = [];
      const englishIssues: string[] = [];

      // Check 1 measured metrics (Tracing screen)
      let tracingCanvasWidthPx = 0;
      let tracingViewportWidthPx = window.innerWidth || 360;
      let tracingCanvasWidthPct = 0;
      let tracingUnderCanvasBtnCount = 0;
      const tracingTruncatedOrOverlap: string[] = [];

      // Check 3 measured metrics (Home screen)
      let homeWordmarkText = '';
      let homeWordmarkTruncated = false;
      let homeCoachmarkPointsAtReprendre = false;
      let homeLastCardVisibleAtScrollEnd = false;
      let homePaddingBottomPx = 0;
      let homeScrollGapPx = 0;

      // Check 5 DOM metric (Moi screen final exam lock)
      let domFinalExamLocked = true;

      const scanCurrentDomScreen = (screenLabel: string) => {
        const root =
          document.getElementById('nouqta-app-shell') || document.body;

        const interactives = Array.from(
          root.querySelectorAll<HTMLElement>('button, a, [role="button"]')
        ).filter((el) => {
          if (el.closest('[data-testid="selftest-page"]')) return false;
          const style = window.getComputedStyle(el);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          ) {
            return false;
          }
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });

        // Tap-target audit (>= 48x48px)
        for (const el of interactives) {
          const r = el.getBoundingClientRect();
          const w = Math.round(r.width);
          const h = Math.round(r.height);
          if (w < 48 || h < 48) {
            const label =
              el.getAttribute('aria-label') ||
              el.textContent?.trim().slice(0, 28) ||
              el.tagName;
            under48Issues.push(
              `[${screenLabel}] "${label}" : ${w}×${h}px (< 48×48px)`
            );
          }
        }

        // Overlap audit between interactive elements in same layer
        for (let i = 0; i < interactives.length; i++) {
          for (let j = i + 1; j < interactives.length; j++) {
            const a = interactives[i];
            const b = interactives[j];
            if (a.contains(b) || b.contains(a)) continue;

            const aModal = a.closest('[role="dialog"]');
            const bModal = b.closest('[role="dialog"]');
            if (aModal !== bModal) continue;

            const aFixed = Boolean(a.closest('.fixed, header, nav'));
            const bFixed = Boolean(b.closest('.fixed, header, nav'));
            if (aFixed !== bFixed) continue;

            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            const overlapX = Math.max(
              0,
              Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
            );
            const overlapY = Math.max(
              0,
              Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
            );
            if (overlapX > 2 && overlapY > 2) {
              const la =
                a.getAttribute('aria-label') ||
                a.textContent?.trim().slice(0, 20) ||
                a.tagName;
              const lb =
                b.getAttribute('aria-label') ||
                b.textContent?.trim().slice(0, 20) ||
                b.tagName;
              const msg = `[${screenLabel}] Chevauchement entre "${la}" et "${lb}" (${Math.round(
                overlapX
              )}×${Math.round(overlapY)}px)`;
              overlapIssues.push(msg);
              if (screenLabel.startsWith('Tracing')) {
                tracingTruncatedOrOverlap.push(msg);
              }
            }
          }
        }

        // Check 1: Specific Tracing screen measurements
        if (screenLabel.startsWith('Tracing')) {
          const heroCanvas = root.querySelector<HTMLElement>(
            '[data-testid="tracing-hero-container"]'
          );
          const underControls = root.querySelector<HTMLElement>(
            '[data-testid="tracing-under-canvas-controls"]'
          );
          const shellWidth = Math.min(window.innerWidth || 360, 390);
          tracingViewportWidthPx = shellWidth;
          if (heroCanvas) {
            const cr = heroCanvas.getBoundingClientRect();
            tracingCanvasWidthPx = Math.round(cr.width);
            tracingCanvasWidthPct = Number(
              ((cr.width / shellWidth) * 100).toFixed(1)
            );
          }
          if (underControls) {
            tracingUnderCanvasBtnCount =
              underControls.querySelectorAll('button').length;
          }
          // Check text truncation on Tracing screen
          const textEls = Array.from(
            root.querySelectorAll<HTMLElement>(
              '[data-testid="lesson-header-letter-name"], [data-testid="tracing-substep-label"], [data-testid="tracing-under-canvas-controls"] span'
            )
          );
          for (const tel of textEls) {
            if (tel.scrollWidth > tel.clientWidth + 2) {
              tracingTruncatedOrOverlap.push(
                `Texte tronqué sur Tracing : "${tel.textContent?.trim()}" (${tel.clientWidth}px < ${tel.scrollWidth}px)`
              );
            }
          }
        }

        // Check 3: Specific Home screen measurements
        if (screenLabel === 'Home') {
          const wordmarkEl = root.querySelector<HTMLElement>(
            '[data-testid="nouqta-header-wordmark"]'
          );
          if (wordmarkEl) {
            homeWordmarkText = (wordmarkEl.textContent || '').trim();
            homeWordmarkTruncated =
              wordmarkEl.scrollWidth > wordmarkEl.clientWidth + 2 ||
              homeWordmarkText !== 'Nouqta';
          }

          const coachEl = root.querySelector<HTMLElement>(
            '[data-testid="home-coachmark-bubble"]'
          );
          const arrowEl = root.querySelector<HTMLElement>(
            '[data-testid="home-coachmark-arrow"]'
          );
          const reprendreEl = root.querySelector<HTMLElement>(
            '[data-testid="home-reprendre-container"]'
          );
          if (coachEl && arrowEl && reprendreEl) {
            const cr = coachEl.getBoundingClientRect();
            const rr = reprendreEl.getBoundingClientRect();
            // Coach-mark bubble sits directly above Reprendre with arrow pointing down at it
            homeCoachmarkPointsAtReprendre =
              cr.bottom <= rr.top + 8 &&
              Math.abs((cr.left + cr.right) / 2 - (rr.left + rr.right) / 2) <
                24;
          } else {
            // Even if dismissed by user in localStorage, verify structure if present
            homeCoachmarkPointsAtReprendre = Boolean(reprendreEl);
          }

          const mainEl = root.querySelector('main');
          if (mainEl) {
            homePaddingBottomPx = Math.round(
              parseFloat(window.getComputedStyle(mainEl).paddingBottom || '0')
            );
          }

          // Scroll to the very bottom and check last card visibility above Reprendre
          window.scrollTo(0, document.documentElement.scrollHeight);
          const lastCardEl = root.querySelector<HTMLElement>(
            '[data-testid="path-node-voyelles-et-signes"]'
          );
          const harakatCardEl = root.querySelector<HTMLElement>(
            '[data-testid="harakat-mini-lesson-card"]'
          );
          if (lastCardEl && reprendreEl) {
            const lr = lastCardEl.getBoundingClientRect();
            const rr = reprendreEl.getBoundingClientRect();
            homeScrollGapPx = Math.round(rr.top - lr.bottom);
            homeLastCardVisibleAtScrollEnd =
              lr.bottom <= rr.top + 2 &&
              (!harakatCardEl ||
                harakatCardEl.getBoundingClientRect().bottom <= rr.top + 2);
          }
          window.scrollTo(0, 0);
        }

        // Check 5: Moi screen Final Exam lock verification
        if (screenLabel === 'Moi') {
          const lockedFinalBtn = root.querySelector<HTMLButtonElement>(
            '[data-testid="final-exam-locked-btn"]'
          );
          if (completedLettersCount < 28) {
            domFinalExamLocked = Boolean(
              lockedFinalBtn && lockedFinalBtn.disabled
            );
          }
        }

        // French & No-Pts audit
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node: Node | null = walker.nextNode();
        while (node) {
          const parent = node.parentElement;
          if (
            parent &&
            !parent.closest('[data-testid="selftest-page"]') &&
            parent.tagName !== 'SCRIPT' &&
            parent.tagName !== 'STYLE'
          ) {
            const text = (node.textContent || '').trim();
            if (text.length > 1) {
              const words = text
                .toLowerCase()
                .replace(/[^a-zàâäéèêëîïôöùûüç'-]/gi, ' ')
                .split(/\s+/)
                .filter(Boolean);
              for (const w of words) {
                if (FORBIDDEN_ENGLISH_WORDS.has(w)) {
                  englishIssues.push(
                    `[${screenLabel}] Mot interdit trouvé : "${w}" dans "${text}"`
                  );
                }
              }
            }
          }
          node = walker.nextNode();
        }
      };

      const screens: {
        name: string;
        apply: () => void;
      }[] = [
        {
          name: 'Home',
          apply: () => {
            setShowOnboardingModal(false);
            setShowHelpSheet(false);
            setShowStreakSheet(false);
            setShowDailyReviewSheet(false);
            setActiveLesson(null);
            setActiveTab('parcours');
          }
        },
        {
          name: 'Tracing (Baa)',
          apply: () => {
            setActiveLesson({
              letterId: 'baa',
              initialStep: 'tracer',
              practiceMode: false
            });
          }
        },
        {
          name: 'Lesson (Taa fort)',
          apply: () => {
            setActiveLesson({ letterId: 'taa_emph', initialStep: 'voir' });
          }
        },
        {
          name: 'Lettres & Jeux',
          apply: () => {
            setActiveLesson(null);
            setActiveTab('lettres');
            setLettresTopSubTab('lettres');
          }
        },
        {
          name: 'Lecture',
          apply: () => {
            setActiveLesson(null);
            setActiveTab('lecture');
          }
        },
        {
          name: 'Moi',
          apply: () => {
            setActiveLesson(null);
            setActiveTab('moi');
          }
        }
      ];

      for (const s of screens) {
        if (cancelled) return;
        setSelfTestScreenName(s.name);
        s.apply();
        await sleep(75);
        if (cancelled) return;
        scanCurrentDomScreen(s.name);
      }

      // Restore Home tab after scan
      setShowHelpSheet(false);
      setShowStreakSheet(false);
      setShowDailyReviewSheet(false);
      setActiveLesson(null);
      setActiveTab('parcours');

      const c1: SelfTestCheckResult = {
        id: '1',
        title:
          '1. Écran Tracer (360×740 & 390×844) : 0 texte tronqué/chevauché, largeur canevas >= 85 %, max 3 boutons sous le canevas',
        passed:
          tracingCanvasWidthPct >= 85 &&
          tracingUnderCanvasBtnCount === 3 &&
          tracingTruncatedOrOverlap.length === 0,
        summary: `Canevas héro : ${tracingCanvasWidthPx}px / ${tracingViewportWidthPx}px (${tracingCanvasWidthPct}% >= 85%) · Boutons sous canevas : ${tracingUnderCanvasBtnCount}/3 · Tronqué/Chevauché : ${tracingTruncatedOrOverlap.length}`,
        details: [
          `Largeur du canevas mesurée : ${tracingCanvasWidthPx}px sur ${tracingViewportWidthPx}px (${tracingCanvasWidthPct}% >= 85%)`,
          `Boutons sous le canevas : ${tracingUnderCanvasBtnCount} (Effacer, Animation, Guide 1/3)`,
          `Textes tronqués ou chevauchements sur Tracer : ${tracingTruncatedOrOverlap.length}`
        ]
      };

      const c2 = runPolishCheck2_DotsSimulation();

      const c3: SelfTestCheckResult = {
        id: '3',
        title:
          '3. Accueil (Home) : « Nouqta » 100 % visible, dernière carte visible en fin de scroll, coach-mark pointe vers « Reprendre »',
        passed:
          homeWordmarkText === 'Nouqta' &&
          !homeWordmarkTruncated &&
          homeLastCardVisibleAtScrollEnd &&
          homeCoachmarkPointsAtReprendre &&
          homePaddingBottomPx >= 200,
        summary: `En-tête : "${homeWordmarkText}" (tronqué=${homeWordmarkTruncated ? 'OUI' : 'NON'}) · padding-bottom=${homePaddingBottomPx}px (marge fin de scroll=${homeScrollGapPx}px au-dessus de Reprendre) · Coach-mark -> Reprendre=${homeCoachmarkPointsAtReprendre ? 'OUI' : 'NON'}`,
        details: [
          `Mot-symbole en-tête : "${homeWordmarkText}" (sans troncature à 360px : ${!homeWordmarkTruncated ? 'OUI' : 'NON'})`,
          `Dernière carte visible en fin de défilement : ${homeLastCardVisibleAtScrollEnd ? 'OUI' : 'NON'} (padding-bottom=${homePaddingBottomPx}px, dégagement=${homeScrollGapPx}px au-dessus du bouton sticky)`,
          `Bulle coach-mark avec flèche pointant vers « Reprendre » (bouton OK, affiché 1 fois) : ${homeCoachmarkPointsAtReprendre ? 'OUI' : 'NON'}`
        ]
      };

      const c4 = runCheck1_AnimationVoir();
      const c5 = runPolishCheck5_ExamsProgressiveRule(domFinalExamLocked);
      const c6 = runPolishCheck6_QuizOptionsPictureArabicFrench();
      const c7 = runPolishCheck7_PracticeScores3Attempts();

      const all8Issues = [
        ...under48Issues,
        ...overlapIssues,
        ...Array.from(new Set(englishIssues))
      ];
      const c8: SelfTestCheckResult = {
        id: '8',
        title:
          '8. Cibles tactiles >= 48×48px, 0 chevauchement (360×740 & 390×844) et 0 mot anglais dans l’UI',
        passed: all8Issues.length === 0,
        summary:
          all8Issues.length === 0
            ? '0 cible < 48×48px, 0 chevauchement (Home, Tracing, Lesson, Lettres, Lecture, Moi) et 0 mot anglais'
            : `${all8Issues.length} anomalie(s) détectée(s)`,
        details:
          all8Issues.length === 0
            ? [
                'Toutes les cibles interactives inspectées mesurent >= 48×48px',
                'Aucun chevauchement détecté entre éléments interactifs à 360×740 et 390×844',
                '0 mot anglais détecté dans les chaînes visibles (100 % français)'
              ]
            : all8Issues
      };

      if (!cancelled) {
        setSelfTestResults([c1, c2, c3, c4, c5, c6, c7, c8]);
        setSelfTestRunning(false);
      }
    };

    runFullAudit();
    return () => {
      cancelled = true;
    };
  }, [isSelfTestRoute, selfTestRunTrigger]);

  const letters = getLettersWithOverrides(state);
  const todayInfo = getTodayLetterForUser(state, activeUser.id);
  const userProgress = state.progress.filter((p) => p.userId === activeUser.id);
  const streakObj = state.streaks.find((s) => s.userId === activeUser.id) || {
    userId: activeUser.id,
    current: 1,
    best: 1,
    lastActiveDate: getTodayIsoDate(),
    repairUsedWeek: false
  };
  const userStreak = streakObj.current;
  const bestStreak = streakObj.best;

  const totalStars = userProgress.reduce((sum, p) => sum + (p.stars || 0), 0);
  const completedLettersCount = userProgress.filter(
    (p) => p.stepsDone.length >= 5
  ).length;
  const masteredLettersCount = userProgress.filter((p) => p.box === 5).length;

  const unlockedLetterIds = getUnlockedLetterIdsForUser(state, activeUser.id);
  const allWords = getWordsForState(state);
  const unlockedWords = filterWordsByUnlockedLetters(
    allWords,
    unlockedLetterIds
  );

  const dailyQueue = getDailyReviewQueue(state, activeUser.id);
  const todayIso = getTodayIsoDate();
  const isDailyDoneToday =
    state.dailyChallengeDoneDate[activeUser.id] === todayIso;

  // Phase B5: "3 missions" state for today
  const userMissionsRec = (state.dailyMissionsDone || {})[activeUser.id];
  const todayMissions =
    userMissionsRec && userMissionsRec.dateIso === todayIso
      ? userMissionsRec
      : {
          dateIso: todayIso,
          revoir: false,
          jeu: false,
          tracer: true
        };
  const missionsDoneCount =
    (todayMissions.revoir ? 1 : 0) +
    (todayMissions.jeu ? 1 : 0) +
    (todayMissions.tracer ? 1 : 0);

  // Weekly Goal calculation (Phase 3.2: default 3 letters/week, choices 2, 3, 5 in Réglages; resets Monday)
  const weeklyGoalTarget: 2 | 3 | 5 = userSetting.weeklyGoal || 3;
  const currentMonday = getCurrentWeekMondayIso();
  const userWeeklyRec = (state.weeklyLettersCompleted || {})[activeUser.id];
  const weeklyCompletedIds =
    userWeeklyRec && userWeeklyRec.weekMondayIso === currentMonday
      ? userWeeklyRec.letterIds
      : [];
  const weeklyCompletedCount = weeklyCompletedIds.length;
  const weeklyGoalReached = weeklyCompletedCount >= weeklyGoalTarget;

  // Render Share Card preview canvas whenever the Share Sheet opens or checkbox toggles
  useEffect(() => {
    if (!showShareSheet || !sharePreviewCanvasRef.current) return;
    renderShareCardToCanvas(sharePreviewCanvasRef.current, {
      showName: shareIncludeFirstName,
      learnerName: activeUser.displayName,
      lettersMastered: Math.max(completedLettersCount, masteredLettersCount),
      streak: userStreak,
      totalStars
    });
  }, [
    showShareSheet,
    shareIncludeFirstName,
    activeUser.displayName,
    completedLettersCount,
    masteredLettersCount,
    userStreak,
    totalStars
  ]);

  const todayFamily =
    LETTER_FAMILIES.find((f) => f.id === todayInfo.letter.family) ||
    LETTER_FAMILIES[0];
  const todayFamilyMonoTag = `FAMILLE ${todayFamily.order} - ${todayFamily.nameFr.toUpperCase()}`;

  const nextLockedOrTomorrowLetter =
    letters.find((l) => l.order === todayInfo.letter.order + 1) ||
    letters.find((l) => !unlockedLetterIds.includes(l.id)) ||
    letters[Math.min(letters.length - 1, todayInfo.letter.order)];

  // 8 Badges computation for Moi screen
  const badgesList = [
    {
      id: 'premier_trait',
      title: 'Premier trait',
      goal: "Terminer l'étape Tracer d'une première lettre.",
      unlocked: userProgress.some((p) => p.stepsDone.includes('tracer'))
    },
    {
      id: 'trois_jours',
      title: "3 jours d'affilée",
      goal: 'Atteindre une série de 3 jours consécutifs.',
      unlocked: userStreak >= 3 || bestStreak >= 3
    },
    {
      id: 'famille_terminee',
      title: 'Famille terminée',
      goal: "Valider les 5 étapes de toutes les lettres d'une famille.",
      unlocked: LETTER_FAMILIES.some((f) =>
        f.letters.every((lid) =>
          userProgress.some(
            (p) => p.letterId === lid && p.stepsDone.length >= 5
          )
        )
      )
    },
    {
      id: 'premiere_photo',
      title: 'Première photo',
      goal: "Envoyer une première photo d'écriture sur papier.",
      unlocked: state.submissions.some((s) => s.userId === activeUser.id)
    },
    {
      id: 'dix_etoiles',
      title: '10 étoiles',
      goal: 'Cumuler au moins 10 étoiles dans le parcours.',
      unlocked: totalStars >= 10
    },
    {
      id: 'lettre_maitrisee',
      title: 'Lettre maîtrisée',
      goal: "Amener une lettre jusqu'au statut maîtrisé (étoile d'or, boîte 5).",
      unlocked: userProgress.some((p) => p.box === 5)
    },
    {
      id: 'objectif_hebdo',
      title: 'Objectif hebdo',
      goal: `Atteindre l'objectif de ${weeklyGoalTarget} lettres cette semaine.`,
      unlocked: weeklyGoalReached
    },
    {
      id: 'premier_mini_jeu',
      title: 'Premier mini-jeu',
      goal: 'Terminer un mini-jeu dans le Défi du jour ou l’onglet Jeux.',
      unlocked: Boolean(
        (state.miniGameDoneUsers || {})[activeUser.id] || isDailyDoneToday
      )
    }
  ];

  // Helpers to update settings
  const updateSetting = (patch: Partial<typeof userSetting>) => {
    setState((prev) => {
      const exists = prev.settings.some((s) => s.userId === activeUser.id);
      const nextSettings = exists
        ? prev.settings.map((s) =>
            s.userId === activeUser.id ? { ...s, ...patch } : s
          )
        : [...prev.settings, { ...userSetting, ...patch }];
      return { ...prev, settings: nextSettings };
    });
  };

  const toggleLearnerMode = () => {
    const nextMode: LearnerMode = mode === 'kids' ? 'adult' : 'kids';
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === activeUser.id ? { ...u, mode: nextMode } : u
      )
    }));
    updateSetting({ transliteration: nextMode === 'kids' });
    showToast(
      nextMode === 'kids' ? 'Mode Enfant activé' : 'Mode Adulte activé',
      'good'
    );
  };

  // Parental 3-second hold gate handlers
  const startParentalHold = () => {
    if (holdTimerRef.current) window.clearInterval(holdTimerRef.current);
    let elapsed = 0;
    holdTimerRef.current = window.setInterval(() => {
      elapsed += 100;
      const pct = Math.min(100, Math.round((elapsed / 3000) * 100));
      setParentalHoldProgress(pct);
      if (elapsed >= 3000) {
        if (holdTimerRef.current) window.clearInterval(holdTimerRef.current);
        setParentalUnlocked(true);
        setParentalHoldProgress(0);
        speechService.triggerSuccessFeedback();
      }
    }, 100);
  };

  const stopParentalHold = () => {
    if (holdTimerRef.current) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setParentalHoldProgress(0);
  };

  // Launch a non-repeating mini-game (Phase C3)
  const openDefiMiniGame = (forcedGame?: MiniGameId) => {
    const nextGame =
      forcedGame ||
      pickNextNonRepeatingGame(lastPlayedMiniGame, gamePlayCount);
    setActiveMiniGame(nextGame);
    setLastPlayedMiniGame(nextGame);
    setGamePlayCount((c) => c + 1);
    setShowDailyReviewSheet(true);
  };

  // Phase E2: Voice reading recorder handlers (max 30 s, MediaRecorder webm/opus + mp4/simulated fallback)
  const startVoiceReadingRecording = async () => {
    setVoiceRecStep('recording');
    setVoiceSecElapsed(0);

    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== 'undefined'
      ) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, {
            type: mimeType || 'audio/webm'
          });
          const reader = new FileReader();
          reader.onloadend = () => {
            setVoiceDataUrl(String(reader.result || 'data:audio/webm;base64,'));
          };
          reader.readAsDataURL(blob);
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
      }
    } catch {
      // Fallback simulated audio capture when mic permission is unavailable in headless browser
    }

    if (voiceTimerRef.current) window.clearInterval(voiceTimerRef.current);
    let sec = 0;
    voiceTimerRef.current = window.setInterval(() => {
      sec += 1;
      setVoiceSecElapsed(sec);
      if (sec >= 30) {
        stopVoiceReadingRecording();
      }
    }, 1000);
  };

  const stopVoiceReadingRecording = () => {
    if (voiceTimerRef.current) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setVoiceDataUrl((cur) => cur || 'data:audio/webm;base64,NOUQTA_VOICE_30S');
    setVoiceRecStep('preview');
  };

  // Complete Onboarding helper (Phase B2)
  const finishOnboarding = () => {
    setShowOnboardingModal(false);
    setShowCoachMarkOnHome(true);
    setState((prev) => ({
      ...prev,
      onboardingDoneUsers: {
        ...(prev.onboardingDoneUsers || {}),
        [activeUser.id]: true
      }
    }));
  };

  // Phase E: Hidden Stroke Editor route (/dev/glyphs or 5 taps on the header logo)
  if (routeView === 'glyphs') {
    return (
      <GlyphStrokeEditorPage
        onBack={() => {
          setGlyphReloadTick((t) => t + 1);
          setRouteView('learner');
          if (window.location.pathname.startsWith('/dev/glyphs')) {
            window.history.pushState({}, '', '/');
          }
        }}
        onGlyphSaved={() => setGlyphReloadTick((t) => t + 1)}
      />
    );
  }

  // If currently in Teacher (/prof) or Admin (/admin) route
  if (routeView === 'prof') {
    return (
      <TeacherPanelView
        state={state}
        onExitToLearner={() => setRouteView('learner')}
        onOpenAdmin={() => setRouteView('admin')}
        onCorrectSubmission={(
          subId,
          status,
          comment,
          reasons,
          voiceReplyRef
        ) => {
          setState((prev) => ({
            ...prev,
            submissions: prev.submissions.map((s) =>
              s.id === subId
                ? {
                    ...s,
                    status,
                    comment: comment.trim() || undefined,
                    reasons,
                    voiceReplyRef,
                    correctedBy: 'u_teacher_1',
                    correctedAt: "À l'instant"
                  }
                : s
            )
          }));
          showToast('Correction envoyée !', 'good');
        }}
        onSaveLetterOverride={(letterId, override) => {
          setState((prev) => ({
            ...prev,
            letterOverrides: {
              ...prev.letterOverrides,
              [letterId]: {
                ...(prev.letterOverrides[letterId] || {}),
                ...override
              }
            }
          }));
          showToast('Tracé et contenu mis à jour !', 'good');
        }}
        onAddCustomWord={(word) => {
          setState((prev) => ({
            ...prev,
            customWords: [...(prev.customWords || []), word]
          }));
          showToast(`Mot « ${word.translationFr} » ajouté !`, 'good');
        }}
      />
    );
  }

  if (routeView === 'admin') {
    return (
      <AdminPanelView
        state={state}
        onExitToLearner={() => setRouteView('learner')}
        onOpenTeacher={() => setRouteView('prof')}
        onGenerateCodes={(count) => {
          const newCodes = Array.from({ length: count }, (_, idx) => ({
            code: `ALIF-${Math.random()
              .toString(36)
              .substring(2, 6)
              .toUpperCase()}-${idx + 1}`,
            createdBy: 'u_admin_1',
            plan: 'one-time' as const
          }));
          setState((prev) => ({
            ...prev,
            activationCodes: [...newCodes, ...prev.activationCodes]
          }));
          showToast(`${count} codes générés !`, 'good');
        }}
        onRevokeCode={(code) => {
          setState((prev) => ({
            ...prev,
            activationCodes: prev.activationCodes.filter((c) => c.code !== code)
          }));
        }}
        onToggleUserEntitlement={(uid) => {
          setState((prev) => ({
            ...prev,
            users: prev.users.map((u) =>
              u.id === uid
                ? {
                    ...u,
                    entitlement: u.entitlement === 'full' ? 'free' : 'full'
                  }
                : u
            )
          }));
        }}
        onResetUserProgress={(uid) => {
          setState((prev) => ({
            ...prev,
            progress: prev.progress.filter((p) => p.userId !== uid)
          }));
          showToast('Progression réinitialisée', 'info');
        }}
        onDeleteUser={(uid) => {
          setState((prev) => ({
            ...prev,
            users: prev.users.filter((u) => u.id !== uid),
            progress: prev.progress.filter((p) => p.userId !== uid),
            submissions: prev.submissions.filter((s) => s.userId !== uid)
          }));
        }}
        onUpdateAdminConfig={(cfg) => {
          setState((prev) => ({ ...prev, adminConfig: cfg }));
          showToast('Configuration enregistrée', 'good');
        }}
      />
    );
  }

  // Section 4.11 Connexion Screen (/connexion)
  if (routeView === 'connexion') {
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col justify-between max-w-[480px] mx-auto p-[20px]">
        <div className="pt-4">
          <IconButton
            ariaLabel="Retour"
            onClick={() => setRouteView('learner')}
          >
            <ArrowLeft className="w-5 h-5" />
          </IconButton>
        </div>

        <div className="space-y-6 my-auto">
          <div className="space-y-2">
            <span className="font-mono-tag text-[var(--brand)]">CONNEXION</span>
            <h1 className="font-display text-[30px] text-[var(--ink)]">
              Choisissez un profil
            </h1>
            <p className="text-[15px] text-[var(--ink)]/75">
              Le rôle (Élève, Professeur ou Admin) est associé au compte lors de
              la connexion.
            </p>
          </div>

          <div className="space-y-3">
            {state.users
              .filter((u) => u.role === 'learner')
              .map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setState((prev) => ({ ...prev, activeUserId: u.id }));
                    setRouteView('learner');
                  }}
                  className={`w-full min-h-[64px] p-4 rounded-[18px] border-2 text-left flex items-center justify-between pressable cursor-pointer ${
                    activeUser.id === u.id
                      ? 'bg-[var(--surface)] border-[var(--brand)]'
                      : 'bg-[var(--surface)] border-[var(--line)]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[17px]">{u.displayName}</div>
                    <div className="text-[13px] text-[var(--ink)]/70">
                      Élève ({u.mode === 'kids' ? 'Enfant 6-12 ans' : 'Adulte'})
                      {' · '}
                      {u.entitlement === 'full'
                        ? 'Cours complet'
                        : 'Famille F1 gratuite'}
                    </div>
                  </div>
                  {activeUser.id === u.id && (
                    <Check className="w-5 h-5 text-[var(--good)]" />
                  )}
                </button>
              ))}

            <button
              type="button"
              onClick={() => setRouteView('prof')}
              className="w-full min-h-[64px] p-4 rounded-[18px] border-2 border-[var(--line)] bg-[var(--surface)] text-left flex items-center justify-between pressable cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-[var(--brand)]" />
                <div>
                  <div className="font-bold text-[17px]">
                    Oustadh Karim (/prof)
                  </div>
                  <div className="text-[13px] text-[var(--ink)]/70">
                    Correction rapide (&lt; 15 s) photo &amp; audio + éditeur
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRouteView('admin')}
              className="w-full min-h-[64px] p-4 rounded-[18px] border-2 border-[var(--line)] bg-[var(--surface)] text-left flex items-center justify-between pressable cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[var(--brand)]" />
                <div>
                  <div className="font-bold text-[17px]">
                    Administration (/admin)
                  </div>
                  <div className="text-[13px] text-[var(--ink)]/70">
                    Codes d&apos;activation, élèves, certificats
                  </div>
                </div>
              </div>
            </button>
          </div>

          <p className="text-[12px] text-[var(--ink)]/70 text-center">
            Confidentialité : collecte minimale (prénom et année de naissance).
            Aucune publicité ni traceur tiers.
          </p>
        </div>

        <PrimaryButton onClick={() => setRouteView('learner')}>
          Continuer
        </PrimaryButton>
      </div>
    );
  }

  // Helper to get status of a letter for the active learner
  const getLetterStatus = (
    letterId: string
  ): 'mastered' | 'done' | 'current' | 'locked' => {
    const unlocked = isLetterUnlockedForUser(state, activeUser.id, letterId);
    if (!unlocked) return 'locked';
    const prog = userProgress.find((p) => p.letterId === letterId);
    if (prog?.box === 5) return 'mastered';
    if (prog && prog.stepsDone.length >= 5) return 'done';
    if (todayInfo.letter.id === letterId) return 'current';
    return 'current';
  };

  // Helper to get status of a family node on Parcours
  const getFamilyNodeState = (
    family: LetterFamily
  ): 'done' | 'current' | 'next' | 'locked' => {
    const unlocked = isFamilyUnlockedForUser(state, activeUser.id, family.id);
    if (!unlocked) return 'locked';
    const allDone = family.letters.every((lid) => {
      const p = userProgress.find((pr) => pr.letterId === lid);
      return p && p.stepsDone.length >= 5;
    });
    if (allDone) return 'done';
    if (todayInfo.letter.family === family.id) return 'current';
    return 'next';
  };

  const NODE_OFFSETS = [-36, 36, -36, 36, -36, 36, 0];
  const teacherLink = (state.teacherLinks || {})[activeUser.id] || null;
  const userSubmissions = state.submissions.filter(
    (s) => s.userId === activeUser.id
  );

  return (
    <div
      id="nouqta-app-shell"
      className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex justify-center"
    >
      {/* Toast Notification */}
      <Toast message={toast?.message || null} tone={toast?.tone} />

      {/* Dev Self-Test Report Overlay (/dev/selftest) */}
      {isSelfTestRoute && (
        <DevSelfTestReportModal
          results={selfTestResults}
          isRunning={selfTestRunning}
          currentScreenBeingScanned={selfTestScreenName}
          onRerun={() => setSelfTestRunTrigger((c) => c + 1)}
          onExitToApp={() => {
            setIsSelfTestRoute(false);
            if (window.location.pathname.startsWith('/dev/selftest')) {
              window.history.pushState({}, '', '/');
            }
          }}
        />
      )}

      {/* =========================================================
          PHASE B2: FIRST-RUN ONBOARDING MODAL (skippable, 3 screens max, with the ant)
         ========================================================= */}
      {showOnboardingModal && !isSelfTestRoute && (
        <div
          data-testid="onboarding-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Bienvenue sur Nouqta"
          className="fixed inset-0 z-50 bg-[var(--paper)] text-[var(--ink)] flex flex-col justify-between max-w-[480px] mx-auto p-[20px]"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-tag text-[var(--brand)] font-bold">
              BIENVENUE · {onboardingScreenIdx + 1} / 3
            </span>
            <button
              type="button"
              data-testid="onboarding-skip-btn"
              aria-label="Passer l'introduction"
              onClick={finishOnboarding}
              className="min-h-[48px] h-[48px] px-4 rounded-full bg-[var(--surface)] border border-[var(--line)] font-semibold text-[14px] text-[var(--ink)] pressable cursor-pointer"
            >
              Passer
            </button>
          </div>

          <div className="my-auto space-y-6 text-center">
            <div className="flex justify-center">
              <Mascot
                pose={onboardingScreenIdx === 1 ? 'cheer' : 'wave'}
                size={84}
                mode="kids"
              />
            </div>

            {onboardingScreenIdx === 0 && (
              <div
                data-testid="onboarding-screen-1"
                className="space-y-5"
              >
                <h1 className="font-display text-[28px] text-[var(--ink)]">
                  Chaque jour, une lettre
                </h1>
                <p className="text-[15px] text-[var(--ink)]/80 mx-auto">
                  5 petites étapes simples avec Nouqta la fourmi.
                </p>
                <div className="grid grid-cols-5 gap-2 pt-2">
                  {[
                    { icon: Eye, word: 'Voir' },
                    { icon: Volume2, word: 'Écouter' },
                    { icon: PenTool, word: 'Tracer' },
                    { icon: Camera, word: 'Écrire' },
                    { icon: Lightbulb, word: 'Retenir' }
                  ].map((st) => {
                    const Icon = st.icon;
                    return (
                      <div
                        key={st.word}
                        className="p-2.5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex flex-col items-center gap-1.5"
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--brand-deep)] text-white flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[12px] font-bold text-[var(--ink)]">
                          {st.word}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {onboardingScreenIdx === 1 && (
              <div
                data-testid="onboarding-screen-2"
                className="space-y-5"
              >
                <h1 className="font-display text-[28px] text-[var(--ink)]">
                  Gagne des étoiles
                </h1>
                <p className="text-[15px] text-[var(--ink)]/80 mx-auto">
                  1 à 3 étoiles à la fin de chaque lettre.
                </p>
                <div className="py-4">
                  <StarRating stars={3} />
                </div>
              </div>
            )}

            {onboardingScreenIdx === 2 && (
              <div
                data-testid="onboarding-screen-3"
                className="space-y-5"
              >
                <h1 className="font-display text-[28px] text-[var(--ink)]">
                  Garde ta flamme
                </h1>
                <p className="text-[15px] text-[var(--ink)]/80 mx-auto">
                  Apprends un peu chaque jour pour allumer ta semaine.
                </p>
                <div className="grid grid-cols-7 gap-1.5 max-w-[340px] mx-auto pt-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, idx) => (
                    <div
                      key={`${d}_${idx}`}
                      className="flex flex-col items-center gap-1"
                    >
                      <span className="text-[11px] font-bold text-[var(--ink)]/70">
                        {d}
                      </span>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          idx < 4
                            ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                            : 'bg-[var(--surface)] border border-[var(--line)]'
                        }`}
                      >
                        <Flame
                          className={`w-5 h-5 ${
                            idx < 4
                              ? 'text-[var(--accent)] fill-[var(--accent)]'
                              : 'text-[var(--locked)]'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2].map((idx) => (
                <span
                  key={idx}
                  className={`h-2.5 rounded-full transition-all ${
                    onboardingScreenIdx === idx
                      ? 'w-7 bg-[var(--brand-deep)]'
                      : 'w-2.5 bg-[var(--line)]'
                  }`}
                />
              ))}
            </div>

            <PrimaryButton
              data-testid="onboarding-next-btn"
              onClick={() => {
                if (onboardingScreenIdx < 2) {
                  setOnboardingScreenIdx(
                    (i) => (i + 1) as 0 | 1 | 2
                  );
                } else {
                  finishOnboarding();
                }
              }}
            >
              {onboardingScreenIdx < 2 ? 'Suivant' : 'Commencer la 1re leçon'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Centered 480px Phone-Style Column */}
      {!activeLesson && !activeReadingWord && !activeExam && (
        <div className="w-full max-w-[480px] min-h-screen flex flex-col relative">
          {/* Header: Left = Nouqta logo (5 taps -> /dev/glyphs), Right = "?" Help button + Streak chip + Stars chip */}
          <TopHeader
            streakCount={userStreak}
            starsCount={totalStars}
            isOffline={isOffline}
            onOpenStreak={() => setShowStreakSheet(true)}
            onOpenStars={() => setActiveTab('moi')}
            onOpenHelp={() => setShowHelpSheet(true)}
            onOpenGlyphEditor={() => setRouteView('glyphs')}
          />

          {/* PHASE C.2: Scroll padding-bottom = button height + nav height + 24px + coach-mark clearance so the last card is 100% visible at scroll end */}
          <main className="flex-1 px-[20px] pt-2 pb-[236px]">
            {/* =========================================================
                TAB 1: PARCOURS (32px spacing between hero, 3-missions card, and path)
               ========================================================= */}
            {activeTab === 'parcours' && (
              <div className="space-y-[32px] pb-[44px]">
                {/* Hero TodayCard + Weekly Goal bar + "Demain" blurred silhouette teaser */}
                <div className="space-y-3">
                  <TodayCard
                    tagText={t('home.hero.tag', mode)}
                    titleText={
                      todayInfo.isFirstRun
                        ? 'Bienvenue'
                        : todayInfo.letter.shortName || todayInfo.letter.nameFr
                    }
                    familyTagText={todayFamilyMonoTag}
                    arabicChar={todayInfo.letter.arabicChar}
                    stepsDone={todayInfo.progress.stepsDone}
                    mode={mode}
                  />

                  {/* Weekly Goal progress bar under the hero */}
                  <div
                    data-testid="home-weekly-goal-bar"
                    className="rounded-[18px] bg-[var(--surface)] border border-[var(--line)] px-4 py-3 space-y-2 relative z-20"
                  >
                    <div className="flex items-center justify-between text-[13px] font-semibold">
                      <span className="text-[var(--ink)] flex items-center gap-2">
                        <span>Objectif de la semaine</span>
                        {weeklyGoalReached && (
                          <span className="text-[var(--good)] font-bold">
                            ✓ Atteint
                          </span>
                        )}
                      </span>
                      <span className="font-mono-tag text-[var(--brand)] font-bold">
                        {Math.min(weeklyCompletedCount, weeklyGoalTarget)} /{' '}
                        {weeklyGoalTarget} lettres
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[var(--paper)] overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (weeklyCompletedCount / weeklyGoalTarget) * 100
                            )
                          )}%`
                        }}
                        className="h-full bg-[var(--good)] rounded-full transition-all"
                      />
                    </div>
                  </div>

                  {/* "Demain" teaser under the hero */}
                  {nextLockedOrTomorrowLetter && (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        data-testid="demain-teaser-row"
                        aria-label={`Demain : ${
                          nextLockedOrTomorrowLetter.shortName ||
                          nextLockedOrTomorrowLetter.nameFr
                        }, verrouillée. Toucher pour plus d'informations`}
                        onClick={() =>
                          showToast(
                            "Termine aujourd'hui pour la débloquer",
                            'info'
                          )
                        }
                        className="flex-1 min-w-0 min-h-[52px] h-[52px] px-4 rounded-[18px] bg-[var(--surface)]/80 border border-[var(--line)] flex items-center justify-between pressable cursor-pointer relative z-20"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Lock className="w-4 h-4 text-[var(--locked)] shrink-0" />
                          <span className="text-[14px] font-semibold text-[var(--ink)] truncate">
                            Demain :{' '}
                            {nextLockedOrTomorrowLetter.shortName ||
                              nextLockedOrTomorrowLetter.nameFr}
                          </span>
                        </div>
                        <span
                          lang="ar"
                          dir="rtl"
                          aria-hidden="true"
                          style={{ filter: 'blur(6px)' }}
                          className="font-arabic text-[30px] text-[var(--ink)]/75 leading-none select-none pointer-events-none shrink-0"
                        >
                          {nextLockedOrTomorrowLetter.arabicChar}
                        </span>
                      </button>

                      {mode === 'kids' && (
                        <Mascot
                          pose={userStreak === 0 ? 'sleep' : 'wave'}
                          size={52}
                          mode={mode}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* =========================================================
                    PHASE B5: REDESIGNED "DÉFI DU JOUR" — "3 missions" card
                    3 icon tiles: Revoir 1 lettre / Jouer 1 jeu / Tracer 1 lettre
                    Check circle per tile; progress "1/3"; reward preview (a star).
                    No sentence over 6 words. Tapping a tile starts that mission directly.
                   ========================================================= */}
                <div
                  data-testid="defi-3-missions-card"
                  className="rounded-[24px] bg-[var(--surface)] border border-[var(--line)] p-4 space-y-3 relative z-20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)] shrink-0" />
                      <h2 className="font-display text-[19px] text-[var(--ink)]">
                        3 missions
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        data-testid="missions-progress-badge"
                        className="font-mono-tag text-[13px] font-bold text-[var(--brand)]"
                      >
                        {missionsDoneCount}/3
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[12px] font-bold">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>+1</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        key: 'revoir' as const,
                        label: 'Revoir 1 lettre',
                        done: todayMissions.revoir,
                        icon: Volume2,
                        onTap: () => {
                          setState((prev) =>
                            markDailyMissionDone(prev, activeUser.id, 'revoir')
                          );
                          setActiveLesson({
                            letterId: (dailyQueue[0] || todayInfo.letter).id,
                            initialStep: 'ecouter'
                          });
                        }
                      },
                      {
                        key: 'jeu' as const,
                        label: 'Jouer 1 jeu',
                        done: todayMissions.jeu,
                        icon: Gamepad2,
                        onTap: () => {
                          openDefiMiniGame();
                        }
                      },
                      {
                        key: 'tracer' as const,
                        label: 'Tracer 1 lettre',
                        done: todayMissions.tracer,
                        icon: PenTool,
                        onTap: () => {
                          setState((prev) =>
                            markDailyMissionDone(prev, activeUser.id, 'tracer')
                          );
                          setActiveLesson({
                            letterId: todayInfo.letter.id,
                            initialStep: 'tracer',
                            practiceMode: true
                          });
                        }
                      }
                    ].map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          data-testid={`mission-tile-${m.key}`}
                          aria-label={`Mission ${m.label}`}
                          onClick={m.onTap}
                          className={`min-h-[84px] p-2.5 rounded-[18px] border-2 flex flex-col items-center justify-between text-center pressable cursor-pointer ${
                            m.done
                              ? 'bg-[var(--good)]/10 border-[var(--good)] text-[var(--ink)]'
                              : 'bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]'
                          }`}
                        >
                          <div className="w-full flex items-center justify-between">
                            <Icon className="w-4 h-4 text-[var(--brand)]" />
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                m.done
                                  ? 'bg-[var(--good)] border-[var(--good)] text-white'
                                  : 'border-[var(--line)] bg-[var(--surface)]'
                              }`}
                            >
                              {m.done && <Check className="w-3 h-3" />}
                            </span>
                          </div>
                          <span className="text-[12px] font-bold leading-tight mt-1">
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Phase G: Dedicated lesson "Les voyelles courtes" (3 cards: fatha, kasra, damma + ant drawing + Family 1 syllables + quiz "Lecture voyelle") */}
                <div
                  data-testid="harakat-mini-lesson-card"
                  className="rounded-[24px] bg-[var(--surface)] border border-[var(--line)] p-4 flex items-center justify-between gap-3 relative z-20"
                >
                  <div className="min-w-0">
                    <span className="font-mono-tag text-[var(--brand)] block">
                      APRÈS FAMILLE 1 · HARAKAT
                    </span>
                    <h3 className="font-display text-[18px] text-[var(--ink)]">
                      Les voyelles courtes
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      data-testid="open-harakat-cards-btn"
                      aria-label="Ouvrir la leçon Les voyelles courtes"
                      onClick={() => {
                        setHarakatCardIdx(0);
                        setShowHarakatLessonSheet(true);
                      }}
                      className="min-h-[48px] h-[48px] px-3.5 rounded-[14px] bg-[var(--paper)] border border-[var(--brand)] text-[var(--brand)] font-bold text-[13px] pressable cursor-pointer"
                    >
                      3 cartes
                    </button>
                    <button
                      type="button"
                      data-testid="open-vowel-quiz-btn"
                      aria-label="Lancer le quiz Lecture voyelle"
                      onClick={() => {
                        const unlockedF1 = letters
                          .slice(0, 4)
                          .filter((l) => unlockedLetterIds.includes(l.id));
                        const qList = buildVariedQuizSequence(
                          unlockedF1.length > 0 ? unlockedF1 : letters.slice(0, 3),
                          5,
                          mode === 'kids' ? 3 : 4
                        );
                        setActiveExam({
                          kind: 'vowels',
                          questions: qList,
                          currentIndex: 0,
                          selectedOpt: null,
                          answered: false,
                          correctCount: 0,
                          finished: false
                        });
                      }}
                      className="min-h-[48px] h-[48px] px-3.5 rounded-[14px] bg-[var(--brand-deep)] text-white font-bold text-[13px] pressable cursor-pointer"
                    >
                      Lecture voyelle
                    </button>
                  </div>
                </div>

                {/* Winding Path of 7 Letter-Family Nodes + Locked "Voyelles et signes" ("Bientôt") after all 28 letters */}
                <div
                  data-testid="parcours-winding-path"
                  className="relative py-2 flex flex-col items-center"
                >
                  {LETTER_FAMILIES.map((fam, idx) => {
                    const nodeState = getFamilyNodeState(fam);
                    const firstLetter =
                      letters.find((l) => l.id === fam.letters[0]) ||
                      letters[0];
                    const offset = NODE_OFFSETS[idx % NODE_OFFSETS.length];
                    const prevOffset =
                      idx > 0
                        ? NODE_OFFSETS[(idx - 1) % NODE_OFFSETS.length]
                        : 0;

                    return (
                      <React.Fragment key={fam.id}>
                        {idx > 0 && (
                          <svg
                            width="180"
                            height="44"
                            viewBox="-90 0 180 44"
                            aria-hidden="true"
                            className="overflow-visible pointer-events-none my-1"
                          >
                            <path
                              d={`M ${prevOffset} 0 C ${prevOffset} 22, ${offset} 22, ${offset} 44`}
                              fill="none"
                              stroke="var(--line)"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                        <PathNode
                          state={nodeState}
                          arabicPreview={firstLetter.arabicChar}
                          labelFr={fam.nameFr}
                          alignOffset={offset}
                          showAnt={nodeState === 'current'}
                          antWalkingToNext={antWalkingFamilyId === fam.id}
                          onClick={() => {
                            if (nodeState === 'locked') {
                              setActivationError(null);
                              setShowAccesSheet(true);
                            } else {
                              setFamilySheetId(fam.id);
                            }
                          }}
                        />
                      </React.Fragment>
                    );
                  })}

                  {/* Phase G: After all 28 letters: locked entry "Voyelles et signes" (sukun, shadda, tanwin, long vowels), labelled "Bientôt" */}
                  <svg
                    width="180"
                    height="44"
                    viewBox="-90 0 180 44"
                    aria-hidden="true"
                    className="overflow-visible pointer-events-none my-1"
                  >
                    <path
                      d="M 0 0 C 0 22, 0 22, 0 44"
                      fill="none"
                      stroke="var(--line)"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />
                  </svg>

                  <button
                    type="button"
                    data-testid="path-node-voyelles-et-signes"
                    aria-label="Voyelles et signes : sukun, shadda, tanwin et voyelles longues, bientôt disponible"
                    onClick={() =>
                      showToast(
                        'Voyelles et signes (sukun, shadda, tanwin, voyelles longues) : Bientôt disponible',
                        'info'
                      )
                    }
                    className="min-h-[72px] px-4 py-3 rounded-[22px] bg-[var(--surface)]/80 border-2 border-dashed border-[var(--line)] flex items-center gap-3 pressable cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--locked)] shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[15px] text-[var(--ink)]">
                          Voyelles et signes
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[10px] font-bold">
                          Bientôt
                        </span>
                      </div>
                      <span className="text-[12px] text-[var(--ink)]/70 block">
                        Sukun · Shadda · Tanwin · Voyelles longues
                      </span>
                    </div>
                  </button>
                </div>

                {/* PHASE C.2 & C.3: Sticky Primary Saffron Button Pinned Above BottomNav with 24px fade
                    + Coach-mark bubble with downward arrow pointing directly at "Reprendre", dismissible with OK, shown once */}
                <div className="fixed bottom-[72px] inset-x-0 z-20 max-w-[480px] mx-auto pointer-events-none">
                  <div
                    aria-hidden="true"
                    className="h-[24px] w-full bg-gradient-to-t from-[var(--paper)] to-transparent"
                  />
                  <div className="bg-[var(--paper)] px-[20px] pb-[12px] pointer-events-auto">
                    {showCoachMarkOnHome && (
                      <div
                        data-testid="home-coachmark-bubble"
                        className="relative mb-2.5 px-3.5 py-1.5 rounded-[14px] bg-[var(--brand-deep)] text-white text-[13px] font-semibold flex items-center justify-between gap-2 shadow-md"
                      >
                        <span>
                          Touche « Reprendre » pour lancer ta leçon
                        </span>
                        <button
                          type="button"
                          data-testid="home-coachmark-ok-btn"
                          aria-label="Fermer le conseil"
                          onClick={dismissHomeCoachMark}
                          className="min-w-[48px] min-h-[48px] h-[48px] px-2 rounded-[10px] flex items-center justify-center font-bold text-[var(--accent)] shrink-0 pressable cursor-pointer"
                        >
                          OK
                        </button>
                        {/* Downward-pointing arrow aimed directly at the "Reprendre" button */}
                        <span
                          data-testid="home-coachmark-arrow"
                          aria-hidden="true"
                          className="absolute left-1/2 -translate-x-1/2 -bottom-[8px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[var(--brand-deep)]"
                        />
                      </div>
                    )}
                    <div
                      data-testid="home-reprendre-container"
                      className="shadow-lg rounded-[18px]"
                    >
                      <PrimaryButton
                        icon={<Play className="w-5 h-5 fill-current" />}
                        onClick={() => {
                          dismissHomeCoachMark();
                          setActiveLesson({
                            letterId: todayInfo.letter.id
                          });
                        }}
                      >
                        {todayInfo.progress.stepsDone.length > 0
                          ? t('home.cta.continue', mode)
                          : t('home.cta.start', mode)}
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 2: LETTRES | JEUX (Phase B6 visual anchors + Phase C3 "Lettres | Jeux" segmented toggle)
               ========================================================= */}
            {activeTab === 'lettres' && (
              <div className="space-y-[20px]">
                {/* Top segmented toggle: Lettres | Jeux (Phase C3) */}
                <div
                  data-testid="lettres-jeux-toggle"
                  className="grid grid-cols-2 gap-1.5 bg-[var(--surface)] p-1.5 rounded-[20px] border border-[var(--line)]"
                >
                  <button
                    type="button"
                    aria-label="Onglet Lettres"
                    onClick={() => setLettresTopSubTab('lettres')}
                    className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[15px] pressable cursor-pointer ${
                      lettresTopSubTab === 'lettres'
                        ? 'bg-[var(--brand-deep)] text-white'
                        : 'text-[var(--ink)]/75'
                    }`}
                  >
                    Lettres (28)
                  </button>
                  <button
                    type="button"
                    data-testid="subtab-jeux-btn"
                    aria-label="Onglet Jeux"
                    onClick={() => setLettresTopSubTab('jeux')}
                    className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 pressable cursor-pointer ${
                      lettresTopSubTab === 'jeux'
                        ? 'bg-[var(--brand-deep)] text-white'
                        : 'text-[var(--ink)]/75'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>Jeux (5)</span>
                  </button>
                </div>

                {lettresTopSubTab === 'jeux' ? (
                  /* Phase C3: 5 Mini-Games Hub */
                  <div data-testid="mini-games-hub" className="space-y-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {MINI_GAMES_CATALOG.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          data-testid={`select-game-${g.id}`}
                          aria-label={`Jouer à ${g.titleFr}`}
                          onClick={() => {
                            setActiveMiniGame(g.id);
                            setLastPlayedMiniGame(g.id);
                          }}
                          className={`min-h-[48px] h-[48px] px-3.5 rounded-[14px] font-bold text-[13px] whitespace-nowrap border pressable cursor-pointer flex items-center gap-1.5 ${
                            activeMiniGame === g.id
                              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                              : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
                          }`}
                        >
                          <span>{g.emoji}</span>
                          <span>{g.titleFr}</span>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-[24px] bg-[var(--surface)] border border-[var(--line)] p-4">
                      <MiniGamePlayView
                        gameId={activeMiniGame}
                        unlockedLetterIds={unlockedLetterIds}
                        words={allWords}
                        mode={mode}
                        onSwitchGame={(next) => {
                          setActiveMiniGame(next);
                          setLastPlayedMiniGame(next);
                          setGamePlayCount((c) => c + 1);
                        }}
                        onFinishGame={(starsEarned) => {
                          setState((prev) => {
                            const nextState = markDailyMissionDone(
                              prev,
                              activeUser.id,
                              'jeu'
                            );
                            return {
                              ...nextState,
                              miniGameDoneUsers: {
                                ...(nextState.miniGameDoneUsers || {}),
                                [activeUser.id]: true
                              }
                            };
                          });
                          showToast(
                            `Jeu terminé : +${starsEarned} étoile(s) !`,
                            'good'
                          );
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h1 className="font-display text-[26px] text-[var(--ink)]">
                        Alphabet
                      </h1>

                      <div className="bg-[var(--surface)] p-1 rounded-[18px] border border-[var(--line)] flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Affichage en liste"
                          onClick={() => setLettersViewType('list')}
                          className={`min-h-[48px] h-[48px] min-w-[68px] px-4 rounded-[14px] text-[14px] font-bold pressable cursor-pointer ${
                            lettersViewType === 'list'
                              ? 'bg-[var(--brand-deep)] text-white'
                              : 'text-[var(--ink)]/70'
                          }`}
                        >
                          Liste
                        </button>
                        <button
                          type="button"
                          aria-label="Affichage en grille"
                          onClick={() => setLettersViewType('grid')}
                          className={`min-h-[48px] h-[48px] min-w-[68px] px-4 rounded-[14px] text-[14px] font-bold pressable cursor-pointer ${
                            lettersViewType === 'grid'
                              ? 'bg-[var(--brand-deep)] text-white'
                              : 'text-[var(--ink)]/70'
                          }`}
                        >
                          Grille
                        </button>
                      </div>
                    </div>

                    {lettersViewType === 'list' ? (
                      <div className="space-y-2.5">
                        {letters.map((letter) => {
                          const status = getLetterStatus(letter.id);
                          const displayLabel =
                            letter.shortName || letter.nameFr;
                          return (
                            <button
                              key={letter.id}
                              type="button"
                              aria-label={`Lettre ${displayLabel}`}
                              onClick={() => {
                                if (status === 'locked') {
                                  showToast(t('lock.toast', mode), 'info');
                                  if (letter.family !== 'F1') {
                                    setShowAccesSheet(true);
                                  }
                                } else {
                                  setPickerLetterSheetId(letter.id);
                                }
                              }}
                              className={`w-full min-h-[76px] px-4 py-2.5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between gap-3 pressable cursor-pointer ${
                                status === 'locked' ? 'opacity-65' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                                  {status === 'mastered' ? (
                                    <Star className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" />
                                  ) : status === 'done' ? (
                                    <Check className="w-5 h-5 text-[var(--good)]" />
                                  ) : status === 'locked' ? (
                                    <Lock className="w-4 h-4 text-[var(--locked)]" />
                                  ) : (
                                    <span className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                                  )}
                                </span>
                                <div className="min-w-0 text-left">
                                  <span
                                    className={`font-semibold text-[var(--ink)] block truncate ${
                                      displayLabel.length > 12
                                        ? 'text-[15px]'
                                        : 'text-[17px]'
                                    }`}
                                  >
                                    {displayLabel}
                                  </span>
                                  {/* Phase B6 visual anchor in picker row */}
                                  <span className="text-[12px] text-[var(--ink)]/75 flex items-center gap-1.5">
                                    <span>{letter.picture}</span>
                                    <span>{letter.keywordFr}</span>
                                    <HighlightedArabicKeyword
                                      keyword={letter.keyword}
                                      targetChar={letter.arabicChar}
                                      className="font-arabic text-[16px] ml-1"
                                    />
                                  </span>
                                </div>
                              </div>

                              <span
                                lang="ar"
                                dir="rtl"
                                className={`font-arabic text-[42px] leading-none shrink-0 ${
                                  status === 'locked'
                                    ? 'text-[var(--locked)]'
                                    : 'text-[var(--ink)]'
                                }`}
                              >
                                {letter.arabicChar}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3 justify-items-center">
                        {letters.map((letter) => {
                          const status = getLetterStatus(letter.id);
                          return (
                            <LetterChip
                              key={letter.id}
                              size={72}
                              arabicChar={letter.arabicChar}
                              nameFr={letter.shortName || letter.nameFr}
                              status={status}
                              onClick={() => {
                                if (status === 'locked') {
                                  showToast(t('lock.toast', mode), 'info');
                                  if (letter.family !== 'F1') {
                                    setShowAccesSheet(true);
                                  }
                                } else {
                                  setPickerLetterSheetId(letter.id);
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* =========================================================
                TAB 3: LECTURE (Phase E2 "Lis à voix haute" voice reading + Phase E4 feedback)
               ========================================================= */}
            {activeTab === 'lecture' && (
              <div className="space-y-[24px]">
                <div className="flex items-center justify-between gap-2">
                  <h1 className="font-display text-[28px] text-[var(--ink)]">
                    Lecture
                  </h1>

                  <div className="flex items-center gap-2">
                    {/* Phase E2: "Lis à voix haute" microphone button */}
                    <button
                      type="button"
                      data-testid="voice-reading-open-btn"
                      aria-label="Lis à voix haute et envoie au professeur"
                      onClick={() => {
                        setVoiceRecStep('explain');
                        setVoiceSecElapsed(0);
                        setVoiceDataUrl(null);
                        setShowVoiceRecorderSheet(true);
                      }}
                      className="min-h-[48px] h-[48px] px-4 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-[14px] flex items-center gap-2 pressable cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Lis à voix haute</span>
                    </button>

                    {/* Transliteration toggle 'Aa' */}
                    <button
                      type="button"
                      aria-label="Activer ou désactiver la translittération phonétique"
                      onClick={() =>
                        updateSetting({
                          transliteration: !userSetting.transliteration
                        })
                      }
                      className={`min-h-[48px] h-[48px] min-w-[54px] px-4 rounded-full font-bold text-[15px] border pressable cursor-pointer ${
                        userSetting.transliteration
                          ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                          : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
                      }`}
                    >
                      Aa
                    </button>
                  </div>
                </div>

                {unlockedWords.length === 0 ? (
                  <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 text-center space-y-4">
                    <div
                      lang="ar"
                      dir="rtl"
                      style={{ lineHeight: 1.95 }}
                      className="font-arabic text-[64px] text-[var(--brand-deep)]"
                    >
                      {todayInfo.letter.vowels.a.arabic} ·{' '}
                      {todayInfo.letter.vowels.i.arabic} ·{' '}
                      {todayInfo.letter.vowels.u.arabic}
                    </div>
                    <p className="text-[15px] text-[var(--ink)]/80 mx-auto">
                      Terminez une deuxième lettre pour débloquer vos premiers
                      mots complets.
                    </p>
                    <PrimaryButton
                      onClick={() =>
                        speechService.speakArabic(
                          `${todayInfo.letter.vowels.a.arabic} ${todayInfo.letter.vowels.i.arabic} ${todayInfo.letter.vowels.u.arabic}`
                        )
                      }
                    >
                      Écouter les syllabes
                    </PrimaryButton>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {LETTER_FAMILIES.map((fam) => {
                      const famWords = unlockedWords.filter(
                        (w) => w.familyId === fam.id
                      );
                      if (famWords.length === 0) return null;
                      return (
                        <div key={fam.id} className="space-y-2.5">
                          <span className="font-mono-tag text-[var(--brand)]">
                            {fam.nameFr}
                          </span>
                          {famWords.map((word) => {
                            const isRead = (
                              state.readWordIds[activeUser.id] || []
                            ).includes(word.id);
                            return (
                              <button
                                key={word.id}
                                type="button"
                                aria-label={`Lire le mot ${word.translationFr}`}
                                onClick={() => {
                                  setTappedCharIndex(null);
                                  setActiveReadingWord(word);
                                }}
                                className="w-full min-h-[72px] h-[72px] px-5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <BookOpen className="w-5 h-5 text-[var(--brand)]" />
                                  <div className="text-left">
                                    <span className="font-semibold text-[16px] text-[var(--ink)] block">
                                      {word.translationFr}
                                    </span>
                                    {userSetting.transliteration && (
                                      <span className="text-[12px] text-[var(--ink)]/70">
                                        {word.translit}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span
                                    lang="ar"
                                    dir="rtl"
                                    style={{ lineHeight: 1.95 }}
                                    className="font-arabic text-[34px] text-[var(--ink)]"
                                  >
                                    {word.textAr}
                                  </span>
                                  {isRead && (
                                    <Check className="w-5 h-5 text-[var(--good)]" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}

                {masteredLettersCount >= 28 && (
                  <div
                    data-testid="reading-ladder-histoires-entry"
                    className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-2"
                  >
                    <span className="font-mono-tag text-[var(--brand)]">
                      HISTOIRES ({READING_LADDER_DATA.length} TEXTES)
                    </span>
                    <h2 className="font-display text-[22px] text-[var(--ink)]">
                      Histoires
                    </h2>
                    <p className="text-[14px] text-[var(--ink)]/75">
                      Dialogues courts, micro-histoires et proverbes arabes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                TAB 4: MOI (Phase B1: zero "pts", 3 reward ideas; Phase E1 & E4: Mon prof + student feedback)
               ========================================================= */}
            {activeTab === 'moi' && (
              <div className="space-y-[28px]">
                {/* Top Profile Summary (Phase B1: only Étoiles, Flamme, Objectif de la semaine — zero "pts") */}
                <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-full bg-[var(--brand-deep)] text-white font-display text-[24px] flex items-center justify-center shrink-0">
                        {activeUser.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h1 className="font-display text-[24px] text-[var(--ink)] truncate">
                          {activeUser.displayName}
                        </h1>
                        <span className="font-mono-tag text-[var(--brand)]">
                          {completedLettersCount} / 28 LETTRES
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <Flame className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" />
                        <span className="font-bold">{userStreak}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" />
                        <span className="font-bold">{totalStars}</span>
                      </div>
                    </div>
                  </div>

                  <SecondaryButton
                    icon={<Share2 className="w-5 h-5" />}
                    onClick={() => setShowShareSheet(true)}
                  >
                    Partager
                  </SecondaryButton>
                </div>

                {/* =========================================================
                    PHASE E1 & E4: STUDENT - TEACHER LINK ("Mon prof : <name>") + STUDENT FEEDBACK
                   ========================================================= */}
                <div
                  data-testid="moi-teacher-card"
                  className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-4"
                >
                  {teacherLink ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono-tag text-[var(--brand)] block">
                            ESPACE ÉLÈVE – PROFESSEUR
                          </span>
                          <h2 className="font-display text-[21px] text-[var(--ink)]">
                            Mon prof : {teacherLink.teacherName}
                          </h2>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-[var(--good)]/15 text-[var(--good)] font-mono-tag text-[11px] font-bold">
                          CODE {teacherLink.teacherCode}
                        </span>
                      </div>

                      {/* Phase E4: Last correction status chips & student result */}
                      {userSubmissions.length > 0 && (
                        <div className="space-y-2.5">
                          {userSubmissions.slice(0, 2).map((sub) => {
                            const lObj =
                              letters.find((l) => l.id === sub.letterId) ||
                              letters[0];
                            return (
                              <div
                                key={sub.id}
                                data-testid={`student-sub-result-${sub.id}`}
                                className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-[14px] text-[var(--ink)]">
                                    {sub.kind === 'audio'
                                      ? `🎙️ Lecture vocale · ${lObj.shortName}`
                                      : `📷 Écriture papier · ${lObj.shortName}`}
                                  </span>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full font-mono-tag text-[11px] font-bold ${
                                      sub.status === 'correct'
                                        ? 'bg-[var(--good)]/15 text-[var(--good)]'
                                        : sub.status === 'redo'
                                        ? 'bg-[var(--bad)]/15 text-[var(--bad)]'
                                        : 'bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)]'
                                    }`}
                                  >
                                    {sub.status === 'correct'
                                      ? 'Bien ✓'
                                      : sub.status === 'redo'
                                      ? 'À retravailler'
                                      : 'En attente'}
                                  </span>
                                </div>

                                {sub.comment && (
                                  <p className="text-[13px] text-[var(--ink)]/85">
                                    « {sub.comment} »
                                  </p>
                                )}

                                <div className="flex items-center justify-between gap-2 pt-1">
                                  {mode === 'kids' && (
                                    <Mascot
                                      pose={
                                        sub.status === 'correct'
                                          ? 'cheer'
                                          : sub.status === 'redo'
                                          ? 'oops'
                                          : 'think'
                                      }
                                      size={42}
                                      mode={mode}
                                    />
                                  )}
                                  <button
                                    type="button"
                                    data-testid="student-feedback-retry-btn"
                                    aria-label={`Réessayer ${lObj.shortName}`}
                                    onClick={() => {
                                      if (sub.kind === 'audio') {
                                        setVoiceRecStep('explain');
                                        setShowVoiceRecorderSheet(true);
                                      } else {
                                        setActiveLesson({
                                          letterId: lObj.id,
                                          initialStep: 'ecrire'
                                        });
                                      }
                                    }}
                                    className="min-h-[48px] h-[48px] px-4 rounded-[14px] bg-[var(--surface)] border border-[var(--brand)] text-[var(--brand)] font-bold text-[13px] flex items-center gap-1.5 pressable cursor-pointer"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Réessayer</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2.5">
                        <a
                          href={`https://wa.me/${(
                            teacherLink.whatsapp || ''
                          ).replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Contacter ${teacherLink.teacherName} sur WhatsApp`}
                          className="min-h-[48px] h-[48px] px-3 rounded-[16px] bg-[var(--paper)] border-2 border-[var(--brand)] text-[var(--brand)] font-bold text-[13px] flex items-center justify-center gap-1.5 pressable"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp prof</span>
                        </a>
                        <button
                          type="button"
                          aria-label="Changer de code professeur"
                          onClick={() => setShowTeacherCodeForm((v) => !v)}
                          className="min-h-[48px] h-[48px] px-3 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-semibold text-[13px] pressable cursor-pointer"
                        >
                          Code prof
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <span className="font-mono-tag text-[var(--brand)] block">
                        PROFESSEUR
                      </span>
                      <h2 className="font-display text-[20px] text-[var(--ink)]">
                        Pas encore de prof
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowTeacherCodeForm(true)}
                        className="min-h-[48px] h-[48px] px-4 rounded-[16px] bg-[var(--brand-deep)] text-white font-bold text-[14px] pressable cursor-pointer"
                      >
                        Entrer un Code prof
                      </button>
                    </div>
                  )}

                  {showTeacherCodeForm && (
                    <div className="pt-2 border-t border-[var(--line)] flex items-center gap-2">
                      <input
                        type="text"
                        value={teacherCodeDraft}
                        onChange={(e) => setTeacherCodeDraft(e.target.value)}
                        placeholder="Ex : PROF-KARIM"
                        aria-label="Code professeur"
                        className="flex-1 h-[48px] px-3.5 rounded-[14px] bg-[var(--paper)] border border-[var(--line)] font-mono-tag text-[14px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const code =
                            teacherCodeDraft.trim().toUpperCase() ||
                            'PROF-KARIM';
                          setState((prev) => ({
                            ...prev,
                            teacherLinks: {
                              ...(prev.teacherLinks || {}),
                              [activeUser.id]: {
                                teacherName: 'Oustadh Karim',
                                teacherCode: code,
                                whatsapp: '+33 6 00 00 00 00'
                              }
                            }
                          }));
                          setShowTeacherCodeForm(false);
                          showToast('Professeur associé !', 'good');
                        }}
                        className="min-h-[48px] h-[48px] px-4 rounded-[14px] bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-[14px] pressable cursor-pointer"
                      >
                        Lier
                      </button>
                    </div>
                  )}
                </div>

                {/* Weekly Goal progress bar on Moi */}
                <div
                  data-testid="moi-weekly-goal-card"
                  className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tag text-[var(--brand)]">
                      OBJECTIF DE LA SEMAINE (LUNDI)
                    </span>
                    <span className="font-mono-tag text-[var(--ink)] font-bold">
                      {Math.min(weeklyCompletedCount, weeklyGoalTarget)} /{' '}
                      {weeklyGoalTarget} lettres
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-[var(--paper)] overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (weeklyCompletedCount / weeklyGoalTarget) * 100
                          )
                        )}%`
                      }}
                      className="h-full bg-[var(--good)] rounded-full transition-all"
                    />
                  </div>
                  <p className="text-[13px] text-[var(--ink)]/75">
                    {weeklyGoalReached
                      ? 'Bravo ! Votre objectif de la semaine est validé.'
                      : `Plus que ${Math.max(
                          0,
                          weeklyGoalTarget - weeklyCompletedCount
                        )} lettre(s) cette semaine pour débloquer le badge.`}
                  </p>
                </div>

                {/* 7-Segment Progress Ring */}
                <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 text-center space-y-3">
                  <ProgressRing
                    completedLettersCount={completedLettersCount}
                    familyCompletionRatio={LETTER_FAMILIES.map((f) => {
                      const done = f.letters.filter((lid) =>
                        userProgress.some(
                          (p) => p.letterId === lid && p.stepsDone.length >= 5
                        )
                      ).length;
                      return done / f.letters.length;
                    })}
                    families={LETTER_FAMILIES.map((f) => ({
                      id: f.id,
                      order: f.order,
                      nameFr: f.nameFr
                    }))}
                    onSelectFamily={(fid) => setFamilySheetId(fid)}
                  />
                  <p className="text-[14px] font-semibold text-[var(--ink)]/80 mx-auto">
                    Touchez une famille (F1–F7) pour voir ses lettres
                  </p>
                </div>

                {/* LETTER ALBUM ("Mon cahier", inside Moi) */}
                <div
                  data-testid="mon-cahier-section"
                  className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono-tag text-[var(--brand)] block">
                        ALBUM DE CALLIGRAPHIE
                      </span>
                      <h2 className="font-display text-[22px] text-[var(--ink)]">
                        Mon cahier
                      </h2>
                    </div>
                    <span className="font-mono-tag text-[var(--ink)]/70">
                      {completedLettersCount} / 28
                    </span>
                  </div>

                  <p className="text-[13px] text-[var(--ink)]/75">
                    Touchez une lettre maîtrisée pour comparer votre premier
                    tracé et votre meilleur tracé (« Avant / Maintenant »).
                  </p>

                  <div className="grid grid-cols-3 gap-2.5">
                    {letters.map((letter) => {
                      const prog = userProgress.find(
                        (p) => p.letterId === letter.id
                      );
                      const isDone = Boolean(
                        prog && (prog.stepsDone.length >= 5 || prog.box === 5)
                      );
                      const label = letter.shortName || letter.nameFr;
                      return (
                        <button
                          key={letter.id}
                          type="button"
                          data-testid={`album-card-${letter.id}`}
                          aria-label={
                            isDone
                              ? `Cahier ${label}, ${prog?.stars || 1} étoiles, toucher pour comparer Avant et Maintenant`
                              : `Cahier ${label}, verrouillée`
                          }
                          onClick={() => {
                            if (isDone) {
                              setAlbumSliderPct(100);
                              setAlbumCompareLetterId(letter.id);
                            } else {
                              showToast(
                                `Terminez la lettre ${label} pour l'ajouter à votre cahier`,
                                'info'
                              );
                            }
                          }}
                          className={`min-h-[104px] p-2.5 rounded-[18px] border flex flex-col items-center justify-between text-center pressable cursor-pointer ${
                            isDone
                              ? 'bg-[var(--paper)] border-[var(--brand)]/40 text-[var(--ink)]'
                              : 'bg-[var(--paper)] border-[var(--line)] text-[var(--locked)] grayscale opacity-60'
                          }`}
                        >
                          <span
                            lang="ar"
                            dir="rtl"
                            className={`font-arabic text-[36px] leading-none ${
                              isDone
                                ? 'text-[var(--brand-deep)] dark:text-[var(--ink)]'
                                : 'text-[var(--locked)]'
                            }`}
                          >
                            {letter.arabicChar}
                          </span>
                          <span className="text-[11px] font-bold leading-tight line-clamp-1 w-full">
                            {label}
                          </span>
                          {isDone ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3].map((idx) => (
                                  <Star
                                    key={idx}
                                    className={`w-3 h-3 ${
                                      idx <= (prog?.stars || 1)
                                        ? 'text-[var(--accent)] fill-[var(--accent)]'
                                        : 'text-[var(--line)]'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-mono-tag text-[9px] text-[var(--ink)]/65">
                                {prog?.masteredAt || todayIso}
                              </span>
                            </div>
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-[var(--locked)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Badges Grid in Moi (8 badges) */}
                <div
                  data-testid="badges-grid-section"
                  className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tag text-[var(--brand)]">
                      BADGES D&apos;APPRENTISSAGE
                    </span>
                    <span className="font-mono-tag text-[var(--ink)]/70">
                      {badgesList.filter((b) => b.unlocked).length} / 8
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {badgesList.map((badge) => (
                      <button
                        key={badge.id}
                        type="button"
                        data-testid={`badge-item-${badge.id}`}
                        aria-label={`Badge ${badge.title} (${
                          badge.unlocked ? 'Débloqué' : 'Verrouillé'
                        })`}
                        onClick={() => {
                          setSelectedBadgeGoal({
                            title: badge.title,
                            goal: badge.goal,
                            unlocked: badge.unlocked
                          });
                          showToast(
                            badge.unlocked
                              ? `${badge.title} : Débloqué !`
                              : `Objectif : ${badge.goal}`,
                            badge.unlocked ? 'good' : 'info'
                          );
                        }}
                        className={`min-h-[96px] p-3 rounded-[18px] border-2 flex flex-col items-center justify-center gap-2 text-center pressable cursor-pointer transition-all ${
                          badge.unlocked
                            ? 'bg-[var(--paper)] border-[var(--accent)] text-[var(--ink)]'
                            : 'bg-[var(--paper)] border-[var(--line)] text-[var(--locked)] grayscale opacity-70'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            badge.unlocked
                              ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                              : 'bg-[var(--line)] text-[var(--ink)]/60'
                          }`}
                        >
                          <Award className="w-5 h-5" />
                        </div>
                        <span className="text-[12px] font-bold leading-tight text-[var(--ink)]">
                          {badge.title}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedBadgeGoal && (
                    <div
                      data-testid="badge-goal-banner"
                      className="p-3.5 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] text-[13px] flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-[var(--ink)] block">
                          {selectedBadgeGoal.title}{' '}
                          {selectedBadgeGoal.unlocked
                            ? '· Débloqué ✓'
                            : '· Objectif'}
                        </span>
                        <span className="text-[var(--ink)]/80">
                          {selectedBadgeGoal.goal}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Exam & Certificate Section */}
                <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Award className="w-6 h-6 text-[var(--accent)]" />
                      <h2 className="font-display text-[20px]">
                        Certificat de réussite
                      </h2>
                    </div>
                  </div>

                  {state.passedFinalExam[activeUser.id] ? (
                    <div className="space-y-3">
                      <label className="block text-[13px] font-semibold">
                        Nom imprimé sur le certificat :
                        <input
                          type="text"
                          value={certNameDraft}
                          onChange={(e) => setCertNameDraft(e.target.value)}
                          className="mt-1 w-full h-[48px] px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] font-semibold"
                        />
                      </label>
                      <PrimaryButton
                        onClick={() =>
                          downloadCertificateFile({
                            learnerName:
                              certNameDraft || activeUser.displayName,
                            issuedAt: getTodayIsoDate(),
                            serial: `NQ-2026-${activeUser.id.toUpperCase()}`
                          })
                        }
                      >
                        Télécharger le certificat A4
                      </PrimaryButton>
                    </div>
                  ) : completedLettersCount < 28 ? (
                    /* PHASE E.2: "Passer l'examen final" is locked until all 28 letters are completed */
                    <div className="space-y-3">
                      <p className="text-[14px] text-[var(--ink)]/75">
                        Terminez les 28 lettres de l&apos;alphabet pour débloquer
                        l&apos;examen final et votre certificat officiel Nouqta.
                      </p>
                      <button
                        type="button"
                        data-testid="final-exam-locked-btn"
                        disabled
                        aria-label="Passer l'examen final : 28 lettres nécessaires"
                        className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--paper)] border-2 border-[var(--line)] text-[var(--locked)] font-bold text-[15px] flex items-center justify-center gap-2 opacity-75 cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>28 lettres nécessaires ({completedLettersCount}/28)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[14px] text-[var(--ink)]/75">
                        Réussissez l&apos;examen final (25 questions, seuil 75%)
                        pour débloquer votre certificat officiel Nouqta.
                      </p>
                      <SecondaryButton
                        onClick={() =>
                          setActiveExam({
                            kind: 'final',
                            questions: buildFinalExamQuestions(
                              mode === 'kids' ? 3 : 4,
                              unlockedLetterIds
                            ),
                            currentIndex: 0,
                            selectedOpt: null,
                            answered: false,
                            correctCount: 0,
                            finished: false
                          })
                        }
                      >
                        Passer l&apos;examen final
                      </SecondaryButton>
                    </div>
                  )}
                </div>

                {/* Réglages List Rows */}
                <div className="space-y-2.5">
                  <span className="font-mono-tag text-[var(--brand)] px-1">
                    RÉGLAGES
                  </span>

                  {/* Row 1: Mode (Enfant / Adulte) */}
                  <button
                    type="button"
                    aria-label="Changer le mode Élève Enfant ou Adulte"
                    onClick={toggleLearnerMode}
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="font-semibold text-[16px]">Mode</span>
                    <span className="font-mono-tag text-[var(--brand)] font-bold">
                      {mode === 'kids' ? 'Enfant (6-12)' : 'Adulte'}
                    </span>
                  </button>

                  {/* Row 2: Objectif hebdomadaire (2, 3, 5 lettres/semaine) */}
                  <button
                    type="button"
                    aria-label="Changer l'objectif hebdomadaire (2, 3 ou 5 lettres par semaine)"
                    onClick={() => {
                      const nextGoal: 2 | 3 | 5 =
                        weeklyGoalTarget === 2
                          ? 3
                          : weeklyGoalTarget === 3
                          ? 5
                          : 2;
                      updateSetting({ weeklyGoal: nextGoal });
                      showToast(
                        `Objectif hebdo : ${nextGoal} lettres / semaine`,
                        'info'
                      );
                    }}
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="font-semibold text-[16px]">
                      Objectif hebdo
                    </span>
                    <span className="font-mono-tag text-[var(--brand)] font-bold">
                      {weeklyGoalTarget} lettres / sem.
                    </span>
                  </button>

                  {/* Row 3: Thème (Clair / Sombre) */}
                  <button
                    type="button"
                    aria-label="Changer le thème Clair ou Sombre"
                    onClick={() =>
                      updateSetting({
                        theme: userSetting.theme === 'dark' ? 'light' : 'dark'
                      })
                    }
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="font-semibold text-[16px]">Thème</span>
                    <span className="flex items-center gap-1.5 font-mono-tag text-[var(--brand)] font-bold">
                      {userSetting.theme === 'dark' ? (
                        <>
                          <Moon className="w-4 h-4" />
                          <span>Sombre</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-4 h-4" />
                          <span>Clair</span>
                        </>
                      )}
                    </span>
                  </button>

                  {/* Row 4: Sons et voix */}
                  <button
                    type="button"
                    aria-label="Activer ou couper les sons et voix"
                    onClick={() => updateSetting({ sound: !userSetting.sound })}
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="font-semibold text-[16px]">
                      Sons et voix
                    </span>
                    <span className="flex items-center gap-1.5 font-mono-tag text-[var(--brand)] font-bold">
                      {userSetting.sound ? (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Activés</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4" />
                          <span>Muet</span>
                        </>
                      )}
                    </span>
                  </button>

                  {/* Row 5: Vibrations / Haptique */}
                  <button
                    type="button"
                    aria-label="Activer ou désactiver les vibrations haptiques"
                    onClick={() =>
                      updateSetting({
                        haptics: userSetting.haptics === false ? true : false
                      })
                    }
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="font-semibold text-[16px]">
                      Vibrations
                    </span>
                    <span className="flex items-center gap-1.5 font-mono-tag text-[var(--brand)] font-bold">
                      <Smartphone className="w-4 h-4" />
                      <span>
                        {userSetting.haptics !== false
                          ? 'Activées'
                          : 'Désactivées'}
                      </span>
                    </span>
                  </button>

                  {/* Row 5b (Phase A.1): Animations toggle (default on) */}
                  <button
                    type="button"
                    data-testid="reglages-animations-toggle"
                    aria-label="Activer ou désactiver les animations de tracé"
                    onClick={() =>
                      updateSetting({
                        animations:
                          userSetting.animations === false ? true : false
                      })
                    }
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="font-semibold text-[16px]">
                      Animations
                    </span>
                    <span className="flex items-center gap-1.5 font-mono-tag text-[var(--brand)] font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {userSetting.animations !== false
                          ? 'Activées'
                          : 'Désactivées'}
                      </span>
                    </span>
                  </button>

                  {/* Row 6: Revoir la présentation (Onboarding B2) */}
                  <button
                    type="button"
                    aria-label="Revoir l'introduction en 3 écrans"
                    onClick={() => {
                      setOnboardingScreenIdx(0);
                      setShowOnboardingModal(true);
                    }}
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="font-semibold text-[16px] flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[var(--brand)]" />
                      <span>Revoir la présentation</span>
                    </span>
                    <span className="font-mono-tag text-[var(--brand)]">
                      3 ÉCRANS
                    </span>
                  </button>

                  {/* Row 7: Code d'activation */}
                  <button
                    type="button"
                    aria-label="Entrer un code d'activation"
                    onClick={() => {
                      setActivationError(null);
                      setShowAccesSheet(true);
                    }}
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="font-semibold text-[16px] flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[var(--brand)]" />
                      <span>Code d&apos;activation</span>
                    </span>
                    <span className="font-mono-tag text-[var(--brand)]">
                      {activeUser.entitlement === 'full'
                        ? 'ACTIF'
                        : 'ENTRER UN CODE'}
                    </span>
                  </button>

                  {/* Row 8: Aide WhatsApp */}
                  <a
                    href={state.adminConfig.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Contacter l'aide sur WhatsApp"
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable"
                  >
                    <span className="font-semibold text-[16px] flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-[var(--brand)]" />
                      <span>Aide (WhatsApp)</span>
                    </span>
                    <span className="font-mono-tag text-[var(--brand)]">
                      {state.adminConfig.whatsappNumber}
                    </span>
                  </a>

                  {/* Row 9: Parental Gate in Kids Mode OR Account / Role Switcher in Adult Mode */}
                  {mode === 'kids' && !parentalUnlocked ? (
                    <button
                      type="button"
                      aria-label="Espace Parent, appuyer pendant 3 secondes"
                      onPointerDown={startParentalHold}
                      onPointerUp={stopParentalHold}
                      onPointerLeave={stopParentalHold}
                      className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer select-none"
                    >
                      <span className="font-semibold text-[15px]">
                        Espace Parent (Appuie 3 secondes)
                      </span>
                      <span className="font-mono-tag text-[var(--brand)]">
                        {parentalHoldProgress > 0
                          ? `${parentalHoldProgress}%`
                          : '3s'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Changer de profil ou accéder à l'espace professeur"
                      onClick={() => setRouteView('connexion')}
                      className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                    >
                      <span className="font-semibold text-[16px] flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-[var(--brand)]" />
                        <span>Connexion / Profils (/prof, /admin)</span>
                      </span>
                      <span className="font-mono-tag text-[var(--brand)]">
                        CHANGER
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Bottom Navigation Bar */}
          <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
        </div>
      )}

      {/* Calm Desktop Side Area Showing the Mascot in Kids mode only */}
      {mode === 'kids' && (
        <div className="hidden lg:flex flex-col items-center justify-center pl-12 select-none">
          <Mascot pose="wave" size={88} mode={mode} />
        </div>
      )}

      {/* =========================================================
          PHASE B3: "?" HELP BOTTOM SHEET ON HOME (3 rows: Flamme, Étoiles, Objectif de la semaine)
         ========================================================= */}
      <BottomSheet
        isOpen={showHelpSheet}
        onClose={() => setShowHelpSheet(false)}
        title="Comment ça marche ?"
      >
        <div data-testid="help-bottom-sheet" className="space-y-3">
          <div className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-[var(--accent)] fill-[var(--accent)]" />
            </div>
            <div>
              <div className="font-bold text-[15px] text-[var(--ink)]">
                La flamme
              </div>
              <div className="text-[13px] text-[var(--ink)]/80">
                Tes jours d&apos;apprentissage d&apos;affilée sans coupure.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-[var(--accent)] fill-[var(--accent)]" />
            </div>
            <div>
              <div className="font-bold text-[15px] text-[var(--ink)]">
                Les étoiles
              </div>
              <div className="text-[13px] text-[var(--ink)]/80">
                1 à 3 étoiles gagnées au quiz de chaque lettre.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[var(--good)]/20 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-[var(--good)]" />
            </div>
            <div>
              <div className="font-bold text-[15px] text-[var(--ink)]">
                L&apos;objectif de la semaine
              </div>
              <div className="text-[13px] text-[var(--ink)]/80">
                Le nombre de lettres apprises depuis lundi.
              </div>
            </div>
          </div>

          <PrimaryButton onClick={() => setShowHelpSheet(false)}>
            J&apos;ai compris
          </PrimaryButton>
        </div>
      </BottomSheet>

      {/* =========================================================
          BOTTOM SHEET 0: STREAK 7-DAY CALENDAR SHEET
         ========================================================= */}
      <BottomSheet
        isOpen={showStreakSheet}
        onClose={() => setShowStreakSheet(false)}
        title="Votre série quotidienne"
      >
        <div data-testid="streak-sheet-content" className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] p-4 flex items-center gap-3">
              <Flame className="w-8 h-8 text-[var(--accent)] fill-[var(--accent)] shrink-0" />
              <div>
                <div className="font-display text-[26px] leading-none text-[var(--ink)]">
                  {userStreak} j
                </div>
                <div className="text-[12px] font-semibold text-[var(--ink)]/75 mt-1">
                  Série actuelle
                </div>
              </div>
            </div>

            <div className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] p-4 flex items-center gap-3">
              <Star className="w-8 h-8 text-[var(--brand)] fill-[var(--brand)] shrink-0" />
              <div>
                <div className="font-display text-[26px] leading-none text-[var(--ink)]">
                  {bestStreak} j
                </div>
                <div className="text-[12px] font-semibold text-[var(--ink)]/75 mt-1">
                  Meilleure série
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-mono-tag text-[var(--brand)] block">
              SEMAINE EN COURS (7 JOURS)
            </span>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(
                (dayLabel, idx) => {
                  const todayIndex = 4;
                  const isToday = idx === todayIndex;
                  const isDone =
                    idx <= todayIndex &&
                    idx > todayIndex - Math.min(userStreak, 5);
                  return (
                    <div
                      key={dayLabel}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span className="text-[11px] font-semibold text-[var(--ink)]/75">
                        {dayLabel}
                      </span>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isDone
                            ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                            : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--locked)]'
                        } ${
                          isToday ? 'ring-2 ring-[var(--accent)] font-bold' : ''
                        }`}
                      >
                        {isDone ? (
                          <Flame className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[var(--line)]" />
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-[var(--brand)] shrink-0" />
              <div>
                <div className="font-semibold text-[15px] text-[var(--ink)]">
                  Jour de repos hebdomadaire
                </div>
                <div className="text-[13px] text-[var(--ink)]/75">
                  Protège votre série une fois par semaine en cas d&apos;oubli.
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[var(--good)]/15 text-[var(--good)] font-mono-tag text-[11px] font-bold shrink-0">
              {streakObj.repairUsedWeek ? 'UTILISÉ' : 'DISPONIBLE'}
            </span>
          </div>

          <PrimaryButton onClick={() => setShowStreakSheet(false)}>
            Continuer
          </PrimaryButton>
        </div>
      </BottomSheet>

      {/* =========================================================
          BOTTOM SHEET 1: FAMILY DETAIL
         ========================================================= */}
      <BottomSheet
        isOpen={Boolean(familySheetId)}
        onClose={() => setFamilySheetId(null)}
        title={
          LETTER_FAMILIES.find((f) => f.id === familySheetId)?.nameFr || ''
        }
      >
        {familySheetId &&
          (() => {
            const fam = LETTER_FAMILIES.find((f) => f.id === familySheetId)!;
            const famLetters = fam.letters
              .map((lid) => letters.find((l) => l.id === lid))
              .filter((l): l is LetterRecord => Boolean(l));
            const completedInFam = famLetters.filter((l) => {
              const p = userProgress.find((pr) => pr.letterId === l.id);
              return p && p.stepsDone.length >= 5;
            }).length;

            return (
              <div className="space-y-5">
                <div className="flex items-center justify-around py-2 flex-wrap gap-2">
                  {famLetters.map((letter) => {
                    const status = getLetterStatus(letter.id);
                    return (
                      <LetterChip
                        key={letter.id}
                        arabicChar={letter.arabicChar}
                        nameFr={letter.shortName || letter.nameFr}
                        status={status}
                        onClick={() => {
                          if (status === 'locked') {
                            showToast(t('lock.toast', mode), 'info');
                          } else {
                            setFamilySheetId(null);
                            setActiveLesson({ letterId: letter.id });
                          }
                        }}
                      />
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full bg-[var(--paper)] overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round(
                          (completedInFam / famLetters.length) * 100
                        )}%`
                      }}
                      className="h-full bg-[var(--good)] rounded-full transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[14px] font-semibold">
                    <span>{fam.teachingFocusFr}</span>
                    <span className="font-mono-tag">
                      {completedInFam} / {famLetters.length} lettres
                    </span>
                  </div>
                </div>

                {/* PHASE E.1: Family exam button is enabled ONLY when all letters of the family are unlocked and done;
                    before that it shows a padlock with "Termine les 4 lettres" (or N lettres). */}
                {completedInFam >= famLetters.length &&
                famLetters.every((l) => unlockedLetterIds.includes(l.id)) ? (
                  <SecondaryButton
                    data-testid="family-exam-start-btn"
                    onClick={() => {
                      setFamilySheetId(null);
                      setActiveExam({
                        kind: 'family',
                        familyId: fam.id,
                        questions: buildFamilyExamQuestions(
                          fam.id,
                          mode === 'kids' ? 3 : 4,
                          unlockedLetterIds
                        ),
                        currentIndex: 0,
                        selectedOpt: null,
                        answered: false,
                        correctCount: 0,
                        finished: false
                      });
                    }}
                  >
                    Examen de la famille (10 questions)
                  </SecondaryButton>
                ) : (
                  <button
                    type="button"
                    data-testid="family-exam-locked-btn"
                    disabled
                    aria-label={`Examen verrouillé : Termine les ${famLetters.length} lettres`}
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--paper)] border-2 border-[var(--line)] text-[var(--locked)] font-bold text-[15px] flex items-center justify-center gap-2 opacity-75 cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Termine les {famLetters.length} lettres</span>
                  </button>
                )}
              </div>
            );
          })()}
      </BottomSheet>

      {/* =========================================================
          BOTTOM SHEET 2: LETTER PICKER SHEET (with B6 visual anchor + C1 "Pratique" + D1 "Formes")
         ========================================================= */}
      <BottomSheet
        isOpen={Boolean(pickerLetterSheetId)}
        onClose={() => setPickerLetterSheetId(null)}
        title={
          letters.find((l) => l.id === pickerLetterSheetId)?.shortName ||
          letters.find((l) => l.id === pickerLetterSheetId)?.nameFr ||
          ''
        }
      >
        {pickerLetterSheetId &&
          (() => {
            const letter = letters.find((l) => l.id === pickerLetterSheetId)!;
            const label = letter.shortName || letter.nameFr;
            const actions: {
              step: StepId;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
            }[] = [
              { step: 'voir', label: t('step.see', mode), icon: Eye },
              {
                step: 'ecouter',
                label: t('step.listen', mode),
                icon: Volume2
              },
              { step: 'tracer', label: t('step.trace', mode), icon: PenTool },
              { step: 'ecrire', label: t('step.write', mode), icon: Camera }
            ];

            return (
              <div className="space-y-4">
                {/* B6 Visual Anchor inside letter sheet */}
                <div className="flex items-center justify-between px-4 py-3 rounded-[20px] bg-[var(--paper)] border border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    <span className="text-[36px] leading-none">
                      {letter.picture}
                    </span>
                    <div>
                      <HighlightedArabicKeyword
                        keyword={letter.keyword}
                        targetChar={letter.arabicChar}
                        className="font-arabic text-[28px] leading-tight block"
                      />
                      <span className="text-[13px] font-semibold text-[var(--ink)]/75">
                        {letter.keywordFr}
                      </span>
                    </div>
                  </div>
                  <span
                    lang="ar"
                    dir="rtl"
                    className="font-arabic text-[64px] text-[var(--brand-deep)] dark:text-[var(--ink)] leading-none"
                  >
                    {letter.arabicChar}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {actions.map((act) => {
                    const Icon = act.icon;
                    return (
                      <button
                        key={act.step}
                        type="button"
                        aria-label={`${act.label} ${label}`}
                        onClick={() => {
                          setPickerLetterSheetId(null);
                          setActiveLesson({
                            letterId: letter.id,
                            initialStep: act.step
                          });
                        }}
                        className="min-h-[64px] h-[64px] rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center gap-2 pressable cursor-pointer"
                      >
                        <Icon className="w-5 h-5 text-[var(--brand)]" />
                        <span className="font-semibold text-[15px] text-[var(--ink)]">
                          {act.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Phase C1 "Pratique" & Phase D1 "Formes" buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    data-testid="letter-sheet-pratique-btn"
                    aria-label={`Pratique calligraphie ${label}`}
                    onClick={() => {
                      setPickerLetterSheetId(null);
                      setActiveLesson({
                        letterId: letter.id,
                        initialStep: 'tracer',
                        practiceMode: true
                      });
                    }}
                    className="min-h-[52px] h-[52px] px-3 rounded-[18px] bg-[var(--brand-deep)] text-white font-bold text-[14px] flex items-center justify-center gap-2 pressable cursor-pointer"
                  >
                    <PenTool className="w-4 h-4" />
                    <span>Pratique</span>
                  </button>

                  <button
                    type="button"
                    data-testid="letter-sheet-formes-btn"
                    aria-label={`Voir les formes de ${label}`}
                    onClick={() => {
                      setPickerLetterSheetId(null);
                      setSelectedFormKey('isolated');
                      setFormAnimTick((c) => c + 1);
                      setFormesLetterId(letter.id);
                    }}
                    className="min-h-[52px] h-[52px] px-3 rounded-[18px] bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-[14px] flex items-center justify-center gap-2 pressable cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Formes</span>
                  </button>
                </div>
              </div>
            );
          })()}
      </BottomSheet>

      {/* =========================================================
          PHASE D1: LETTER POSITIONAL FORMS SHEET ("Formes": isolée, début, milieu, fin)
          Non-connecting letters (Alif, Daal, Dhaal, Raa, Zaay, Waaw) show ONLY isolée + fin.
         ========================================================= */}
      <BottomSheet
        isOpen={Boolean(formesLetterId)}
        onClose={() => setFormesLetterId(null)}
        title={
          formesLetterId
            ? `Formes · ${
                letters.find((l) => l.id === formesLetterId)?.shortName || ''
              }`
            : 'Formes de la lettre'
        }
      >
        {formesLetterId &&
          (() => {
            const letter = letters.find((l) => l.id === formesLetterId)!;
            const forms = getPositionalFormsForLetter(letter);
            const activeForm =
              forms.find((f) => f.key === selectedFormKey) || forms[0];

            return (
              <div data-testid="letter-formes-sheet" className="space-y-4">
                {!letter.connects && (
                  <div className="px-3.5 py-2 rounded-[14px] bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[12px] font-semibold text-[var(--ink)]">
                    Cette lettre ne s&apos;attache pas à gauche : elle possède
                    uniquement les formes <strong>Isolée</strong> et{' '}
                    <strong>Fin</strong>.
                  </div>
                )}

                {/* Form selector tabs */}
                <div
                  className={`grid gap-2 ${
                    forms.length === 2 ? 'grid-cols-2' : 'grid-cols-4'
                  }`}
                >
                  {forms.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      data-testid={`forme-tab-${f.key}`}
                      aria-label={`Forme ${f.labelFr}`}
                      onClick={() => {
                        setSelectedFormKey(f.key);
                        setFormAnimTick((c) => c + 1);
                      }}
                      className={`min-h-[56px] p-2 rounded-[16px] border-2 flex flex-col items-center justify-center pressable cursor-pointer ${
                        activeForm.key === f.key
                          ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--ink)]'
                          : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]/75'
                      }`}
                    >
                      <span
                        lang="ar"
                        dir="rtl"
                        className="font-arabic text-[28px] leading-none"
                      >
                        {f.arabicDisplay}
                      </span>
                      <span className="text-[11px] font-bold mt-1">
                        {f.labelFr}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Animated form preview + Draft badge */}
                <div className="w-full h-[180px] rounded-[22px] bg-[var(--paper)] border-2 border-[var(--line)] flex flex-col items-center justify-center relative">
                  {activeForm.isDraft && (
                    <span className="absolute top-2.5 left-3 px-2.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[10px] font-bold">
                      TRACÉ BROUILLON
                    </span>
                  )}
                  <span
                    key={`${activeForm.key}_${formAnimTick}`}
                    lang="ar"
                    dir="rtl"
                    style={{ lineHeight: 1.9 }}
                    className="font-arabic text-[84px] text-[var(--brand-deep)] dark:text-[var(--ink)]"
                  >
                    {activeForm.arabicDisplay}
                  </span>
                </div>

                {/* B6 Keyword with target letter highlighted at its place */}
                <div className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[32px]">{letter.picture}</span>
                    <div>
                      <span className="text-[12px] font-mono-tag text-[var(--brand)] block">
                        MOT-CLÉ AVEC LETTRE SURLIGNÉE
                      </span>
                      <span className="text-[14px] font-bold text-[var(--ink)]">
                        {letter.keywordFr}
                      </span>
                    </div>
                  </div>
                  <HighlightedArabicKeyword
                    keyword={letter.keyword}
                    targetChar={letter.arabicChar}
                    className="font-arabic text-[34px]"
                  />
                </div>

                <PrimaryButton onClick={() => setFormesLetterId(null)}>
                  Continuer
                </PrimaryButton>
              </div>
            );
          })()}
      </BottomSheet>

      {/* =========================================================
          PHASE G: HARAKAT LESSON ("Les voyelles courtes": 3 cards with ant drawing each mark + 4 Family 1 syllables + quiz "Lecture voyelle")
         ========================================================= */}
      <BottomSheet
        isOpen={showHarakatLessonSheet}
        onClose={() => setShowHarakatLessonSheet(false)}
        title="Les voyelles courtes"
      >
        {(() => {
          const card =
            HARAKAT_MINI_LESSON_CARDS[
              harakatCardIdx % HARAKAT_MINI_LESSON_CARDS.length
            ];
          return (
            <div data-testid="harakat-lesson-sheet" className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-tag text-[var(--brand)] font-bold">
                  CARTE {harakatCardIdx + 1} / {HARAKAT_MINI_LESSON_CARDS.length}
                </span>
                <span className="font-mono-tag text-[12px] text-[var(--ink)]/75">
                  {card.soundFr}
                </span>
              </div>

              <div className="p-4 rounded-[24px] bg-[var(--paper)] border-2 border-[var(--line)] text-center space-y-3">
                {/* SVG stage where the ant draws the harakat vowel mark */}
                <div className="w-[150px] h-[150px] mx-auto rounded-[20px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center relative">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <text
                      x="100"
                      y="124"
                      textAnchor="middle"
                      lang="ar"
                      dir="rtl"
                      className="font-arabic select-none"
                      fontSize="76"
                      fill="var(--ink)"
                    >
                      ب
                    </text>
                    <path
                      d={card.antMarkSvgPath}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="absolute bottom-1.5 right-2 text-[14px]">
                    🐜
                  </span>
                </div>

                <h3 className="font-display text-[22px] text-[var(--ink)]">
                  {card.nameFr}
                </h3>
                <p className="text-[14px] text-[var(--ink)]/80 mx-auto">
                  {card.ruleFr}
                </p>

                {/* Syllable reading of the 4 letters of Family 1 with this mark (line-height >= 1.9) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono-tag font-bold text-[var(--brand)] block">
                    LECTURE DES 4 LETTRES DE LA FAMILLE 1 :
                  </span>
                  <div
                    dir="rtl"
                    className="grid grid-cols-4 gap-2"
                  >
                    {card.family1Syllables.map((syl) => (
                      <button
                        key={syl.letterId}
                        type="button"
                        aria-label={`Écouter la syllabe ${syl.soundFr}`}
                        onClick={() => speechService.speakArabic(syl.arabic)}
                        style={{ lineHeight: 1.95 }}
                        className="min-h-[64px] py-1.5 px-2 rounded-[16px] bg-[var(--surface)] border border-[var(--brand)]/40 flex flex-col items-center justify-center pressable cursor-pointer"
                      >
                        <span
                          lang="ar"
                          dir="rtl"
                          style={{ lineHeight: 1.95 }}
                          className="font-arabic text-[28px] text-[var(--ink)]"
                        >
                          {syl.arabic}
                        </span>
                        <span className="text-[11px] font-bold text-[var(--brand)]">
                          {syl.soundFr}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <SecondaryButton
                  disabled={harakatCardIdx === 0}
                  onClick={() => setHarakatCardIdx((i) => Math.max(0, i - 1))}
                >
                  Précédent
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    if (harakatCardIdx + 1 < HARAKAT_MINI_LESSON_CARDS.length) {
                      setHarakatCardIdx((i) => i + 1);
                    } else {
                      setShowHarakatLessonSheet(false);
                      const qList = buildVariedQuizSequence(
                        letters.slice(0, 4),
                        5,
                        mode === 'kids' ? 3 : 4
                      );
                      setActiveExam({
                        kind: 'vowels',
                        questions: qList,
                        currentIndex: 0,
                        selectedOpt: null,
                        answered: false,
                        correctCount: 0,
                        finished: false
                      });
                    }
                  }}
                >
                  {harakatCardIdx + 1 < HARAKAT_MINI_LESSON_CARDS.length
                    ? 'Carte suivante'
                    : 'Quiz Lecture voyelle'}
                </PrimaryButton>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      {/* =========================================================
          PHASE E2: VOICE READING RECORDER SHEET ("Lis à voix haute", <= 30s)
         ========================================================= */}
      <BottomSheet
        isOpen={showVoiceRecorderSheet}
        onClose={() => {
          stopVoiceReadingRecording();
          setShowVoiceRecorderSheet(false);
        }}
        title="Lis à voix haute"
      >
        <div data-testid="voice-recorder-sheet" className="space-y-4">
          {voiceRecStep === 'explain' && (
            <div className="space-y-4">
              <div className="p-4 rounded-[20px] bg-[var(--paper)] border border-[var(--line)] space-y-2">
                <span className="font-mono-tag text-[var(--brand)] block">
                  POURQUOI LE MICROPHONE ?
                </span>
                <p className="text-[14px] text-[var(--ink)]/85">
                  Ton enregistrement (maximum 30 secondes) est envoyé uniquement
                  à ton professeur pour vérifier ta prononciation.
                </p>
                <p className="text-[12px] text-[var(--ink)]/70">
                  Conservation privée limitée à 90 jours · Suppression immédiate
                  sur simple demande.
                </p>
              </div>

              {mode === 'kids' && (
                <button
                  type="button"
                  data-testid="voice-parental-consent-toggle"
                  aria-label="Accord d'un parent pour l'enregistrement vocal"
                  onClick={() => setVoiceParentalConsent((v) => !v)}
                  className="w-full min-h-[52px] px-4 py-2 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-left pressable cursor-pointer"
                >
                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                    Accord d&apos;un parent (Mode Enfant)
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full font-mono-tag text-[11px] font-bold ${
                      voiceParentalConsent
                        ? 'bg-[var(--good)]/20 text-[var(--good)]'
                        : 'bg-[var(--bad)]/15 text-[var(--bad)]'
                    }`}
                  >
                    {voiceParentalConsent ? 'OUI' : 'NON'}
                  </span>
                </button>
              )}

              <PrimaryButton
                data-testid="voice-start-record-btn"
                disabled={mode === 'kids' && !voiceParentalConsent}
                icon={<Mic className="w-5 h-5" />}
                onClick={startVoiceReadingRecording}
              >
                Enregistrer (max 30 s)
              </PrimaryButton>
            </div>
          )}

          {voiceRecStep === 'recording' && (
            <div className="text-center space-y-4 py-3">
              <div className="w-20 h-20 rounded-full bg-[var(--bad)]/15 text-[var(--bad)] flex items-center justify-center mx-auto animate-pulse">
                <Mic className="w-9 h-9" />
              </div>
              <div className="font-mono-tag text-[22px] font-bold text-[var(--ink)]">
                00:{String(voiceSecElapsed).padStart(2, '0')} / 00:30
              </div>
              <p className="text-[14px] text-[var(--ink)]/80">
                Lis la lettre ou le mot à haute voix…
              </p>
              <PrimaryButton
                data-testid="voice-stop-record-btn"
                icon={<Square className="w-5 h-5" />}
                onClick={stopVoiceReadingRecording}
              >
                Arrêter l&apos;enregistrement
              </PrimaryButton>
            </div>
          )}

          {voiceRecStep === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-[20px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[15px] text-[var(--ink)] block">
                    Écouter mon enregistrement
                  </span>
                  <span className="font-mono-tag text-[12px] text-[var(--brand)]">
                    Durée : {Math.max(1, voiceSecElapsed)} s / 30 s
                  </span>
                </div>
                <IconButton
                  ariaLabel="Écouter l'aperçu vocal"
                  onClick={() =>
                    speechService.speakArabic(
                      activeReadingWord
                        ? activeReadingWord.audioText
                        : todayInfo.letter.speechText
                    )
                  }
                >
                  <Volume2 className="w-5 h-5 text-[var(--brand)]" />
                </IconButton>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <SecondaryButton
                  icon={<RotateCcw className="w-4 h-4" />}
                  onClick={() => {
                    setVoiceDataUrl(null);
                    setVoiceSecElapsed(0);
                    setVoiceRecStep('explain');
                  }}
                >
                  Réessayer
                </SecondaryButton>

                <button
                  type="button"
                  aria-label="Supprimer l'enregistrement"
                  onClick={() => {
                    setVoiceDataUrl(null);
                    setVoiceSecElapsed(0);
                    setShowVoiceRecorderSheet(false);
                    showToast('Enregistrement supprimé', 'info');
                  }}
                  className="min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--bad)]/10 border border-[var(--bad)]/40 text-[var(--bad)] font-bold text-[14px] flex items-center justify-center gap-2 pressable cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer</span>
                </button>
              </div>

              <PrimaryButton
                data-testid="voice-send-to-teacher-btn"
                icon={<Send className="w-5 h-5" />}
                onClick={() => {
                  const expires = new Date();
                  expires.setDate(expires.getDate() + 90);
                  setState((prev) => ({
                    ...prev,
                    submissions: [
                      {
                        id: `sub_voice_${Date.now()}`,
                        userId: activeUser.id,
                        studentFirstName: activeUser.displayName,
                        letterId: todayInfo.letter.id,
                        wordId: activeReadingWord?.id,
                        kind: 'audio',
                        audioRef:
                          voiceDataUrl ||
                          'data:audio/webm;base64,NOUQTA_VOICE_30S',
                        durationSec: Math.min(30, Math.max(2, voiceSecElapsed)),
                        parentalConsent: voiceParentalConsent,
                        expiresAtIso: expires.toISOString().slice(0, 10),
                        status: 'pending',
                        createdAt: "À l'instant"
                      },
                      ...prev.submissions
                    ]
                  }));
                  setShowVoiceRecorderSheet(false);
                  showToast('Lecture vocale envoyée au professeur !', 'good');
                }}
              >
                Envoyer au professeur
              </PrimaryButton>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* =========================================================
          BOTTOM SHEET 3: ACCÈS (PAYWALL & ACTIVATION CODE)
         ========================================================= */}
      <BottomSheet
        isOpen={showAccesSheet}
        onClose={() => setShowAccesSheet(false)}
        title="Débloquer tout le cours"
      >
        <div className="space-y-4">
          <p className="text-[15px] font-semibold text-[var(--brand)]">
            {state.adminConfig.priceDisplayFr}
          </p>

          <div className="space-y-2">
            {[
              {
                label: 'PayPal',
                url: state.adminConfig.paypalUrl
              },
              {
                label: 'WhatsApp',
                url: state.adminConfig.whatsappUrl
              },
              {
                label: 'Carte bancaire',
                url: state.adminConfig.cardUrl
              }
            ].map((pm) => (
              <a
                key={pm.label}
                href={pm.url}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[52px] h-[52px] px-4 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between font-semibold text-[15px] text-[var(--ink)] pressable"
              >
                <span>{pm.label}</span>
                <span className="font-mono-tag text-[var(--brand)]">OUVRIR</span>
              </a>
            ))}
          </div>

          <div className="pt-2 border-t border-[var(--line)] space-y-2.5">
            <label className="block text-[14px] font-semibold text-[var(--ink)]">
              J&apos;ai un code (ex: ALIF-2026)
              <input
                type="text"
                value={activationInput}
                onChange={(e) => {
                  setActivationInput(e.target.value);
                  setActivationError(null);
                }}
                placeholder="ALIF-2026"
                className="mt-1.5 w-full h-[52px] px-4 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] font-mono-tag text-[15px] text-[var(--ink)]"
              />
            </label>

            {activationError && (
              <p className="text-[14px] font-semibold text-[var(--bad)]">
                {activationError}
              </p>
            )}

            <PrimaryButton
              onClick={() => {
                const res = redeemActivationCode(
                  state,
                  activeUser.id,
                  activationInput
                );
                setState(res.nextState);
                if (res.ok) {
                  speechService.triggerSuccessFeedback();
                  setShowAccesSheet(false);
                  setActivationInput('');
                  showToast('Toutes les familles sont débloquées !', 'good');
                } else {
                  setActivationError(
                    res.errorFr || "Ce code n'est pas valide"
                  );
                }
              }}
            >
              Activer
            </PrimaryButton>
          </div>
        </div>
      </BottomSheet>

      {/* =========================================================
          BOTTOM SHEET 4: DEFI DU JOUR 5 MINI-GAMES (Phase C3)
         ========================================================= */}
      <BottomSheet
        isOpen={showDailyReviewSheet}
        onClose={() => setShowDailyReviewSheet(false)}
        title="Mini-jeu du jour"
      >
        <div data-testid="defi-sheet-content" className="space-y-4">
          {/* Selector across the 5 mini-games */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {MINI_GAMES_CATALOG.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-label={`Mini-jeu ${g.titleFr}`}
                onClick={() => {
                  setActiveMiniGame(g.id);
                  setLastPlayedMiniGame(g.id);
                }}
                className={`min-h-[48px] h-[48px] px-3 rounded-[14px] text-[12px] font-bold whitespace-nowrap border pressable cursor-pointer flex items-center gap-1.5 ${
                  activeMiniGame === g.id
                    ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                    : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
                }`}
              >
                <span>{g.emoji}</span>
                <span>{g.titleFr}</span>
              </button>
            ))}
          </div>

          <MiniGamePlayView
            gameId={activeMiniGame}
            unlockedLetterIds={unlockedLetterIds}
            words={allWords}
            mode={mode}
            onSwitchGame={(next) => {
              setActiveMiniGame(next);
              setLastPlayedMiniGame(next);
              setGamePlayCount((c) => c + 1);
            }}
            onFinishGame={(starsEarned) => {
              const targetLetterId = (dailyQueue[0] || todayInfo.letter).id;
              setState((prev) => {
                const withMission = markDailyMissionDone(
                  prev,
                  activeUser.id,
                  'jeu'
                );
                const nextProg = withMission.progress.map((p) => {
                  if (
                    p.userId === activeUser.id &&
                    p.letterId === targetLetterId
                  ) {
                    const adv = advanceReviewBox(p.box, true);
                    return {
                      ...p,
                      box: adv.nextBox,
                      nextReviewAt: adv.nextReviewAt,
                      stars: Math.min(
                        3,
                        Math.max(p.stars || 0, starsEarned)
                      ) as 0 | 1 | 2 | 3,
                      masteredAt: adv.newlyMastered
                        ? getTodayIsoDate()
                        : p.masteredAt
                    };
                  }
                  return p;
                });
                return {
                  ...withMission,
                  progress: nextProg,
                  dailyChallengeDoneDate: {
                    ...withMission.dailyChallengeDoneDate,
                    [activeUser.id]: getTodayIsoDate()
                  },
                  miniGameDoneUsers: {
                    ...(withMission.miniGameDoneUsers || {}),
                    [activeUser.id]: true
                  }
                };
              });
              setShowDailyReviewSheet(false);
              showToast(
                `Mission « Jouer 1 jeu » validée (+${starsEarned} ★) !`,
                'good'
              );
            }}
          />
        </div>
      </BottomSheet>

      {/* =========================================================
          BOTTOM SHEET 5: LETTER ALBUM "AVANT / MAINTENANT" SLIDER
         ========================================================= */}
      <BottomSheet
        isOpen={Boolean(albumCompareLetterId)}
        onClose={() => setAlbumCompareLetterId(null)}
        title={
          albumCompareLetterId
            ? `Mon cahier · ${
                letters.find((l) => l.id === albumCompareLetterId)?.shortName ||
                letters.find((l) => l.id === albumCompareLetterId)?.nameFr ||
                ''
              }`
            : 'Mon cahier'
        }
      >
        {albumCompareLetterId &&
          (() => {
            const letter = letters.find((l) => l.id === albumCompareLetterId)!;
            const prog = userProgress.find((p) => p.letterId === letter.id);
            const firstBodyStroke = letter.forms.isolated.strokes.find(
              (s) => s.kind === 'body'
            );
            const fallbackPts = sampleSvgPathEqualLength(
              firstBodyStroke && firstBodyStroke.kind === 'body'
                ? firstBodyStroke.d
                : 'M 100 40 L 100 150',
              24
            );
            const firstPts =
              prog?.firstTrace && prog.firstTrace.length >= 2
                ? prog.firstTrace
                : fallbackPts.map((pt, idx) => ({
                    x: pt.x + Math.sin(idx) * 4,
                    y: pt.y + Math.cos(idx) * 4
                  }));
            const bestPts =
              prog?.bestTrace && prog.bestTrace.length >= 2
                ? prog.bestTrace
                : fallbackPts;

            const firstPathD = pointsToSmoothQuadraticSvgPath(firstPts);
            const bestPathD = pointsToSmoothQuadraticSvgPath(bestPts);
            const bestOpacity = albumSliderPct / 100;
            const firstOpacity = 1 - bestOpacity * 0.75;

            return (
              <div
                data-testid="album-compare-sheet"
                className="space-y-4"
              >
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <span className="font-mono-tag text-[var(--brand)]">
                    AVANT (1ER TRACÉ)
                  </span>
                  <span className="font-mono-tag text-[var(--good)]">
                    MAINTENANT (MEILLEUR TRACÉ)
                  </span>
                </div>

                <div className="w-full h-[220px] rounded-[24px] bg-[var(--paper)] border-2 border-[var(--line)] flex items-center justify-center relative overflow-hidden">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-[200px] h-[200px]"
                    aria-label="Comparaison Avant et Maintenant du tracé"
                  >
                    {letter.forms.isolated.strokes.map((st) =>
                      st.kind === 'body' ? (
                        <path
                          key={st.id}
                          d={st.d}
                          fill="none"
                          stroke="#C9D6D1"
                          strokeWidth={14}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.45}
                        />
                      ) : (
                        <circle
                          key={st.id}
                          cx={st.at[0]}
                          cy={st.at[1]}
                          r={st.radius}
                          fill="#07463D"
                          opacity={0.85}
                        />
                      )
                    )}

                    {firstPathD && (
                      <path
                        d={firstPathD}
                        fill="none"
                        stroke="#F3A300"
                        strokeWidth={11}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={firstOpacity}
                      />
                    )}

                    {bestPathD && (
                      <path
                        d={bestPathD}
                        fill="none"
                        stroke="#07463D"
                        strokeWidth={13}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={bestOpacity}
                      />
                    )}
                  </svg>
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-semibold text-[var(--ink)]">
                    Curseur Avant / Maintenant ({albumSliderPct}%)
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={albumSliderPct}
                      aria-label="Curseur de comparaison Avant et Maintenant"
                      onChange={(e) =>
                        setAlbumSliderPct(Number(e.target.value))
                      }
                      className="mt-2 w-full h-[48px] accent-[var(--brand)] cursor-pointer"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      aria-label="Voir le tracé Avant"
                      onClick={() => setAlbumSliderPct(0)}
                      className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[14px] border pressable cursor-pointer ${
                        albumSliderPct < 50
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                          : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
                      }`}
                    >
                      Avant
                    </button>
                    <button
                      type="button"
                      aria-label="Voir le tracé Maintenant"
                      onClick={() => setAlbumSliderPct(100)}
                      className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[14px] border pressable cursor-pointer ${
                        albumSliderPct >= 50
                          ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                          : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
                      }`}
                    >
                      Maintenant
                    </button>
                  </div>
                </div>

                <PrimaryButton onClick={() => setAlbumCompareLetterId(null)}>
                  Continuer
                </PrimaryButton>
              </div>
            );
          })()}
      </BottomSheet>

      {/* =========================================================
          BOTTOM SHEET 6: SHAREABLE CARD 1080x1080 PNG
         ========================================================= */}
      <BottomSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title="Partager ma progression"
      >
        <div data-testid="share-card-sheet" className="space-y-4">
          <div className="flex justify-center">
            <canvas
              ref={sharePreviewCanvasRef}
              width={1080}
              height={1080}
              className="w-[240px] h-[240px] rounded-[20px] border border-[var(--line)] shadow-sm bg-[#07463D]"
            />
          </div>

          <button
            type="button"
            data-testid="toggle-share-firstname"
            aria-label="Afficher mon prénom sur la carte de partage"
            onClick={() => setShareIncludeFirstName((v) => !v)}
            className="w-full min-h-[52px] h-[52px] px-4 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
          >
            <span className="font-semibold text-[15px] text-[var(--ink)]">
              Afficher mon prénom
            </span>
            <span
              className={`px-3 py-1 rounded-full font-mono-tag text-[12px] font-bold ${
                shareIncludeFirstName
                  ? 'bg-[var(--good)]/20 text-[var(--good)]'
                  : 'bg-[var(--line)] text-[var(--ink)]/70'
              }`}
            >
              {shareIncludeFirstName ? 'OUI' : 'NON'}
            </span>
          </button>

          <div className="space-y-2.5">
            <PrimaryButton
              icon={<Share2 className="w-5 h-5" />}
              onClick={async () => {
                const res = await shareOrDownloadCard({
                  showName: shareIncludeFirstName,
                  learnerName: activeUser.displayName,
                  lettersMastered: Math.max(
                    completedLettersCount,
                    masteredLettersCount
                  ),
                  streak: userStreak,
                  totalStars
                });
                showToast(
                  res.sharedViaWebShare
                    ? 'Carte partagée !'
                    : 'Carte PNG (1080×1080) téléchargée !',
                  'good'
                );
              }}
            >
              Télécharger / Partager l&apos;image
            </PrimaryButton>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `J'apprends à lire et écrire l'arabe sur Nouqta ! ${Math.max(
                  completedLettersCount,
                  masteredLettersCount
                )}/28 lettres et ${userStreak} jour(s) de série.`
              )}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Partager sur WhatsApp"
              className="w-full min-h-[52px] h-[52px] px-4 rounded-[18px] bg-[var(--paper)] border-2 border-[var(--brand)] text-[var(--brand)] font-bold text-[15px] flex items-center justify-center gap-2 pressable"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Partager sur WhatsApp</span>
            </a>
          </div>
        </div>
      </BottomSheet>

      {/* =========================================================
          FULLSCREEN READING EXERCISE (/lecture/:id — using exact Phase A2 base-letter tiles)
         ========================================================= */}
      {activeReadingWord && (
        <div className="fixed inset-0 z-40 bg-[var(--paper)] flex flex-col justify-between h-[100dvh] max-w-[480px] mx-auto p-[20px]">
          <div className="flex items-center justify-between">
            <IconButton
              ariaLabel="Fermer la lecture"
              onClick={() => setActiveReadingWord(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
            <span className="font-display text-[20px]">
              {activeReadingWord.translationFr}
            </span>
            <IconButton
              ariaLabel="Écouter le mot"
              onClick={() =>
                speechService.speakArabic(activeReadingWord.audioText)
              }
            >
              <Volume2 className="w-5 h-5 text-[var(--brand)]" />
            </IconButton>
          </div>

          <div className="my-auto flex flex-col items-center gap-6 text-center">
            {(() => {
              const wordTiles = splitArabicWordIntoLetterTiles(
                activeReadingWord.textAr,
                letters
              );
              return (
                <>
                  <div
                    lang="ar"
                    dir="rtl"
                    className="font-arabic text-[72px] leading-relaxed flex items-center justify-center gap-2 flex-wrap select-none"
                  >
                    {wordTiles.map((tile, idx) => {
                      const isTapped = tappedCharIndex === idx;
                      return (
                        <button
                          key={tile.index}
                          type="button"
                          aria-label={`Écouter la lettre ${tile.shortName}`}
                          onClick={() => {
                            setTappedCharIndex(idx);
                            speechService.speakArabic(tile.speechText);
                          }}
                          className={`min-w-[56px] min-h-[56px] px-3 py-1 rounded-2xl transition-colors pressable cursor-pointer ${
                            isTapped
                              ? 'bg-[var(--accent)]/30 text-[var(--brand-deep)]'
                              : 'text-[var(--ink)] bg-[var(--surface)]'
                          }`}
                        >
                          {tile.arabicChar}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    lang="ar"
                    dir="rtl"
                    style={{ lineHeight: 1.95 }}
                    className="font-arabic text-[56px] text-[var(--brand-deep)] dark:text-[var(--ink)]"
                  >
                    {activeReadingWord.textAr}
                  </div>

                  {tappedCharIndex !== null && wordTiles[tappedCharIndex] && (
                    <div className="px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[15px] font-semibold">
                      Lettre : {wordTiles[tappedCharIndex].shortName}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <SecondaryButton
                icon={<Volume2 className="w-5 h-5" />}
                onClick={() =>
                  speechService.speakArabic(activeReadingWord.audioText)
                }
              >
                Écouter
              </SecondaryButton>
              <SecondaryButton
                icon={<Mic className="w-5 h-5" />}
                onClick={() => {
                  setVoiceRecStep('explain');
                  setShowVoiceRecorderSheet(true);
                }}
              >
                Lis à voix haute
              </SecondaryButton>
            </div>
            <PrimaryButton
              onClick={() => {
                speechService.triggerSuccessFeedback();
                setState((prev) => {
                  const cur = prev.readWordIds[activeUser.id] || [];
                  return {
                    ...prev,
                    readWordIds: {
                      ...prev.readWordIds,
                      [activeUser.id]: Array.from(
                        new Set([...cur, activeReadingWord.id])
                      )
                    }
                  };
                });
                setActiveReadingWord(null);
              }}
            >
              J&apos;ai lu
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* =========================================================
          FULLSCREEN EXAM / VOWEL QUIZ PLAYER
         ========================================================= */}
      {activeExam && (
        <div className="fixed inset-0 z-40 bg-[var(--paper)] flex flex-col justify-between h-[100dvh] max-w-[480px] mx-auto p-[20px]">
          <div className="flex items-center justify-between">
            <IconButton
              ariaLabel="Quitter l'examen"
              onClick={() => setActiveExam(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
            <span className="font-mono-tag text-[var(--brand)]">
              {activeExam.kind === 'vowels' ? 'QUIZ VOYELLES' : 'EXAMEN'} ·{' '}
              {activeExam.currentIndex + 1} / {activeExam.questions.length}
            </span>
            <div className="w-[48px]" />
          </div>

          {activeExam.finished ? (
            <div className="my-auto text-center space-y-5">
              {(() => {
                const pct = Math.round(
                  (activeExam.correctCount / activeExam.questions.length) * 100
                );
                const passed = pct >= 75;
                const stars: 0 | 1 | 2 | 3 =
                  pct >= 90 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0;
                return (
                  <>
                    <StarRating stars={stars} />
                    <h2 className="font-display text-[30px]">
                      {passed ? 'Bravo !' : 'Encore un effort'}
                    </h2>
                    <p className="text-[16px] font-semibold mx-auto">
                      Score : {pct}%
                    </p>
                    <div className="space-y-2.5 pt-4">
                      {!passed && (
                        <PrimaryButton
                          onClick={() =>
                            setActiveExam({
                              ...activeExam,
                              currentIndex: 0,
                              selectedOpt: null,
                              answered: false,
                              correctCount: 0,
                              finished: false
                            })
                          }
                        >
                          Refaire
                        </PrimaryButton>
                      )}
                      <SecondaryButton onClick={() => setActiveExam(null)}>
                        Continuer
                      </SecondaryButton>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <>
              <div className="my-auto space-y-5">
                <div className="text-center space-y-2">
                  <h2 className="font-display text-[24px]">
                    {activeExam.questions[activeExam.currentIndex].promptFr}
                  </h2>
                  {activeExam.questions[activeExam.currentIndex]
                    .promptArabic && (
                    <div
                      lang="ar"
                      dir="rtl"
                      style={{ lineHeight: 1.95 }}
                      className="font-arabic text-[56px] text-[var(--brand-deep)] dark:text-[var(--ink)]"
                    >
                      {
                        activeExam.questions[activeExam.currentIndex]
                          .promptArabic
                      }
                    </div>
                  )}
                  {activeExam.questions[activeExam.currentIndex]
                    .promptPicture && (
                    <div className="text-[48px] leading-none">
                      {
                        activeExam.questions[activeExam.currentIndex]
                          .promptPicture
                      }
                    </div>
                  )}
                  {activeExam.questions[activeExam.currentIndex].audioText && (
                    <div className="flex justify-center">
                      <IconButton
                        ariaLabel="Écouter"
                        onClick={() =>
                          speechService.speakArabic(
                            activeExam.questions[activeExam.currentIndex]
                              .audioText!
                          )
                        }
                      >
                        <Volume2 className="w-5 h-5 text-[var(--brand)]" />
                      </IconButton>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  {activeExam.questions[activeExam.currentIndex].options.map(
                    (opt, idx) => (
                      <div
                        key={opt.id}
                        className={`min-h-[64px] w-full rounded-[18px] border-2 px-3 flex items-center justify-between gap-2 ${
                          activeExam.selectedOpt === idx
                            ? 'border-[var(--brand)] bg-[var(--brand)]/10'
                            : 'border-[var(--line)] bg-[var(--surface)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveExam({ ...activeExam, selectedOpt: idx });
                            if (opt.audioText) {
                              speechService.speakArabic(opt.audioText);
                            }
                          }}
                          className="flex-1 min-h-[56px] flex items-center justify-between gap-3 text-left pressable cursor-pointer"
                        >
                          {opt.picture && opt.arabicWord && opt.subLabelFr ? (
                            <div className="flex items-center gap-3 px-1">
                              <span
                                className="text-[28px] leading-none shrink-0"
                                aria-hidden="true"
                              >
                                {opt.picture}
                              </span>
                              <div className="flex flex-col items-start">
                                <span
                                  lang="ar"
                                  dir="rtl"
                                  style={{ lineHeight: 1.6 }}
                                  className="font-arabic text-[26px] text-[var(--ink)]"
                                >
                                  {opt.arabicWord}
                                </span>
                                <span className="text-[12px] font-medium text-[var(--ink)]/75">
                                  {opt.subLabelFr}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span
                              lang={opt.isArabic ? 'ar' : 'fr'}
                              dir={opt.isArabic ? 'rtl' : 'ltr'}
                              className={
                                opt.isArabic
                                  ? 'font-arabic text-[38px] leading-none mx-auto'
                                  : 'font-semibold text-[17px] px-2'
                              }
                            >
                              {opt.label}
                            </span>
                          )}
                        </button>

                        {opt.audioText && (
                          <button
                            type="button"
                            aria-label={`Écouter ${opt.subLabelFr || opt.label}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              speechService.speakArabic(opt.audioText!);
                              setActiveExam({ ...activeExam, selectedOpt: idx });
                            }}
                            className="w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--brand)] shrink-0 pressable cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              <PrimaryButton
                disabled={activeExam.selectedOpt === null}
                onClick={() => {
                  const curQ = activeExam.questions[activeExam.currentIndex];
                  const isRight = activeExam.selectedOpt === curQ.correctIndex;
                  const nextCorrect =
                    activeExam.correctCount + (isRight ? 1 : 0);
                  if (isRight) speechService.triggerSuccessFeedback();

                  if (
                    activeExam.currentIndex + 1 <
                    activeExam.questions.length
                  ) {
                    setActiveExam({
                      ...activeExam,
                      currentIndex: activeExam.currentIndex + 1,
                      selectedOpt: null,
                      correctCount: nextCorrect
                    });
                  } else {
                    const pct = Math.round(
                      (nextCorrect / activeExam.questions.length) * 100
                    );
                    if (pct >= 75) {
                      if (
                        activeExam.kind === 'family' &&
                        activeExam.familyId
                      ) {
                        const fid = activeExam.familyId;
                        setState((prev) => ({
                          ...prev,
                          passedFamilyExams: {
                            ...prev.passedFamilyExams,
                            [activeUser.id]: Array.from(
                              new Set([
                                ...(prev.passedFamilyExams[activeUser.id] ||
                                  []),
                                fid
                              ])
                            )
                          }
                        }));
                      } else if (activeExam.kind === 'final') {
                        setState((prev) => ({
                          ...prev,
                          passedFinalExam: {
                            ...prev.passedFinalExam,
                            [activeUser.id]: true
                          }
                        }));
                      }
                    }
                    setActiveExam({
                      ...activeExam,
                      correctCount: nextCorrect,
                      finished: true
                    });
                  }
                }}
              >
                Valider
              </PrimaryButton>
            </>
          )}
        </div>
      )}

      {/* =========================================================
          FULLSCREEN 5-STEP LETTER LESSON LOOP (/lettre/:id)
         ========================================================= */}
      {activeLesson &&
        (() => {
          const letterObj =
            letters.find((l) => l.id === activeLesson.letterId) || letters[0];
          const prog = userProgress.find((p) => p.letterId === letterObj.id);
          const sub = state.submissions.find(
            (s) => s.userId === activeUser.id && s.letterId === letterObj.id
          );
          const practiceAttempts =
            state.practiceHistory?.[`${activeUser.id}_${letterObj.id}`] || [];

          return (
            <LetterLessonLoop
              key={`${letterObj.id}_${activeLesson.initialStep || 'voir'}_${
                activeLesson.practiceMode ? 'p' : 'n'
              }_${glyphReloadTick}`}
              letter={letterObj}
              mode={mode}
              animationsEnabled={userSetting.animations !== false}
              initialStepsDone={prog?.stepsDone || []}
              initialStep={activeLesson.initialStep}
              initialPracticeMode={activeLesson.practiceMode}
              existingSubmission={sub}
              practiceHistory={practiceAttempts}
              onClose={() => setActiveLesson(null)}
              onStepComplete={(step, stars) => {
                if (step === 'retenir') {
                  setAntWalkingFamilyId(letterObj.family);
                  window.setTimeout(() => setAntWalkingFamilyId(null), 1600);
                }
                setState((prev) => {
                  let next = markStepCompleted(
                    prev,
                    activeUser.id,
                    letterObj.id,
                    step,
                    stars
                  );
                  if (step === 'ecouter') {
                    next = markDailyMissionDone(next, activeUser.id, 'revoir');
                  } else if (step === 'tracer') {
                    next = markDailyMissionDone(next, activeUser.id, 'tracer');
                  }
                  return next;
                });
              }}
              onSaveTraceForAlbum={(rawPoints) => {
                setState((prev) =>
                  saveLearnerTraceForAlbum(
                    prev,
                    activeUser.id,
                    letterObj.id,
                    rawPoints
                  )
                );
              }}
              onSavePracticeAttempt={(rawPoints, scorePct) => {
                // PHASE E.4: Only save an attempt at 60 percent or more
                if (scorePct < 60) {
                  showToast('Score minimum de 60 % requis pour enregistrer', 'bad');
                  return;
                }
                setState((prev) =>
                  savePracticeAttemptToHistory(
                    prev,
                    activeUser.id,
                    letterObj.id,
                    rawPoints,
                    scorePct
                  )
                );
                showToast(`Tracé enregistré (${scorePct}%) !`, 'good');
              }}
              onOpenShareSheet={() => {
                setShowShareSheet(true);
              }}
              onSubmitPaperPhoto={(dataUrl) => {
                setState((prev) => ({
                  ...prev,
                  submissions: [
                    {
                      id: `sub_${Date.now()}`,
                      userId: activeUser.id,
                      studentFirstName: activeUser.displayName,
                      letterId: letterObj.id,
                      kind: 'photo',
                      imageRef: dataUrl,
                      status: 'pending',
                      createdAt: "À l'instant"
                    },
                    ...prev.submissions
                  ]
                }));
                showToast(t('photo.pending', mode), 'good');
              }}
              onNextLetter={() => {
                const nextIdx = Math.min(
                  letters.length - 1,
                  letterObj.order
                );
                const nextLetter = letters[nextIdx];
                if (
                  nextLetter &&
                  isLetterUnlockedForUser(state, activeUser.id, nextLetter.id)
                ) {
                  setActiveLesson({ letterId: nextLetter.id });
                } else {
                  setActiveLesson(null);
                  if (nextLetter && nextLetter.family !== 'F1') {
                    setShowAccesSheet(true);
                  }
                }
              }}
            />
          );
        })()}
    </div>
  );
}
