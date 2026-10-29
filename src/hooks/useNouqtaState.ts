import { useState, useEffect, useRef } from 'react';
import { LearnerMode, t } from '../data/copyDeck';
import {
  FamilyId,
  LETTER_FAMILIES,
  LetterFamily,
  PositionalFormKey,
  QuizQuestion,
  WordRecord,
  filterWordsByUnlockedLetters,
} from '../data/lettersAndFamilies';
import { renderShareCardToCanvas } from '../lib/pdfAndImage';
import {
  BlueprintState,
  StepId,
  getCurrentWeekMondayIso,
  getDailyReviewQueue,
  getLearnedLetterIdsForUser,
  getLettersWithOverrides,
  getTodayIsoDate,
  getTodayLetterForUser,
  getUnlockedLetterIdsForUser,
  getWordsForState,
  isFamilyUnlockedForUser,
  isLetterUnlockedForUser,
  loadBlueprintState,
  saveBlueprintState,
} from '../services/dataService';
import { speechService } from '../services/speech';
import { MainTab } from '../components/BlueprintComponents';
import {
  MiniGameId,
  pickNextNonRepeatingGame,
} from '../components/MiniGamesHub';

export function useNouqtaState() {
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

  // Active 5-step letter lesson modal
  const [activeLesson, setActiveLesson] = useState<{
    letterId: string;
    initialStep?: StepId;
    practiceMode?: boolean;
  } | null>(null);

  // First-run onboarding modal & Home coach-mark
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

  // Bottom sheets state
  const [showHelpSheet, setShowHelpSheet] = useState<boolean>(false);
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

  // Letter Positional Forms sheet ("Formes": isolée, début, milieu, fin)
  const [formesLetterId, setFormesLetterId] = useState<string | null>(null);
  const [selectedFormKey, setSelectedFormKey] =
    useState<PositionalFormKey>('isolated');
  const [formAnimTick, setFormAnimTick] = useState<number>(0);

  // Harakat ("Les voyelles" 3-card mini lesson)
  const [showHarakatLessonSheet, setShowHarakatLessonSheet] =
    useState<boolean>(false);
  const [harakatCardIdx, setHarakatCardIdx] = useState<number>(0);

  // Teacher Code input & Voice Reading Recorder ("Lis à voix haute", <= 30s)
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

  // Album ("Mon cahier") Avant / Maintenant comparison sheet state
  const [albumCompareLetterId, setAlbumCompareLetterId] = useState<
    string | null
  >(null);
  const [albumSliderPct, setAlbumSliderPct] = useState<number>(100);

  // 5 Mini-Games state (never repeat same game twice in a row)
  const [lettresTopSubTab, setLettresTopSubTab] = useState<'lettres' | 'jeux'>(
    'lettres'
  );
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameId>('memoire');
  const [lastPlayedMiniGame, setLastPlayedMiniGame] =
    useState<MiniGameId | null>(null);
  const [gamePlayCount, setGamePlayCount] = useState<number>(0);

  // Ant walking animation between path nodes when a letter is finished
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
    transliteration: mode === 'kids',
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
    userSetting.voiceName,
  ]);

  // Listen to online/offline status
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

  const letters = getLettersWithOverrides(state);
  const todayInfo = getTodayLetterForUser(state, activeUser.id);
  const userProgress = state.progress.filter((p) => p.userId === activeUser.id);
  const streakObj = state.streaks.find((s) => s.userId === activeUser.id) || {
    userId: activeUser.id,
    current: 1,
    best: 1,
    lastActiveDate: getTodayIsoDate(),
    repairUsedWeek: false,
  };
  const userStreak = streakObj.current;
  const bestStreak = streakObj.best;

  const totalStars = userProgress.reduce((sum, p) => sum + (p.stars || 0), 0);
  const completedLettersCount = userProgress.filter(
    (p) => p.stepsDone.length >= 5
  ).length;
  const masteredLettersCount = userProgress.filter((p) => p.box === 5).length;

  // FIX 1b: Keep getUnlockedLetterIdsForUser ONLY for the letter list and padlocks.
  // Use getLearnedLetterIdsForUser for every game generator, quiz, exam, and the Lecture word filter.
  const unlockedLetterIds = getUnlockedLetterIdsForUser(state, activeUser.id);
  const learnedLetterIds = getLearnedLetterIdsForUser(state, activeUser.id);
  const allWords = getWordsForState(state);
  const unlockedWords = filterWordsByUnlockedLetters(allWords, learnedLetterIds);

  const dailyQueue = getDailyReviewQueue(state, activeUser.id);
  const todayIso = getTodayIsoDate();
  const isDailyDoneToday =
    state.dailyChallengeDoneDate[activeUser.id] === todayIso;

  // "3 missions" state for today
  const userMissionsRec = (state.dailyMissionsDone || {})[activeUser.id];
  const todayMissions =
    userMissionsRec && userMissionsRec.dateIso === todayIso
      ? userMissionsRec
      : {
          dateIso: todayIso,
          revoir: false,
          jeu: false,
          tracer: true,
        };
  const missionsDoneCount =
    (todayMissions.revoir ? 1 : 0) +
    (todayMissions.jeu ? 1 : 0) +
    (todayMissions.tracer ? 1 : 0);

  // Weekly Goal calculation
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
      totalStars,
    });
  }, [
    showShareSheet,
    shareIncludeFirstName,
    activeUser.displayName,
    completedLettersCount,
    masteredLettersCount,
    userStreak,
    totalStars,
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
      unlocked: userProgress.some((p) => p.stepsDone.includes('tracer')),
    },
    {
      id: 'trois_jours',
      title: "3 jours d'affilée",
      goal: 'Atteindre une série de 3 jours consécutifs.',
      unlocked: userStreak >= 3 || bestStreak >= 3,
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
      ),
    },
    {
      id: 'premiere_photo',
      title: 'Première photo',
      goal: "Envoyer une première photo d'écriture sur papier.",
      unlocked: state.submissions.some((s) => s.userId === activeUser.id),
    },
    {
      id: 'dix_etoiles',
      title: '10 étoiles',
      goal: 'Cumuler au moins 10 étoiles dans le parcours.',
      unlocked: totalStars >= 10,
    },
    {
      id: 'lettre_maitrisee',
      title: 'Lettre maîtrisée',
      goal: "Amener une lettre jusqu'au statut maîtrisé (étoile d'or, boîte 5).",
      unlocked: userProgress.some((p) => p.box === 5),
    },
    {
      id: 'objectif_hebdo',
      title: 'Objectif hebdo',
      goal: `Atteindre l'objectif de ${weeklyGoalTarget} lettres cette semaine.`,
      unlocked: weeklyGoalReached,
    },
    {
      id: 'premier_mini_jeu',
      title: 'Premier mini-jeu',
      goal: 'Terminer un mini-jeu dans le Défi du jour ou l’onglet Jeux.',
      unlocked: Boolean(
        (state.miniGameDoneUsers || {})[activeUser.id] || isDailyDoneToday
      ),
    },
  ];

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
      ),
    }));
    updateSetting({ transliteration: nextMode === 'kids' });
    showToast(
      nextMode === 'kids' ? 'Mode Enfant activé' : 'Mode Adulte activé',
      'good'
    );
  };

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

  const openDefiMiniGame = (forcedGame?: MiniGameId) => {
    const nextGame =
      forcedGame ||
      pickNextNonRepeatingGame(lastPlayedMiniGame, gamePlayCount);
    setActiveMiniGame(nextGame);
    setLastPlayedMiniGame(nextGame);
    setGamePlayCount((c) => c + 1);
    setShowDailyReviewSheet(true);
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
          stream.getTracks().forEach((tr) => tr.stop());
          const blob = new Blob(chunks, {
            type: mimeType || 'audio/webm',
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
      // Fallback simulated audio capture when mic permission is unavailable
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

  const finishOnboarding = () => {
    setShowOnboardingModal(false);
    setShowCoachMarkOnHome(true);
    setState((prev) => ({
      ...prev,
      onboardingDoneUsers: {
        ...(prev.onboardingDoneUsers || {}),
        [activeUser.id]: true,
      },
    }));
  };

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

  const teacherLink = (state.teacherLinks || {})[activeUser.id] || null;
  const userSubmissions = state.submissions.filter(
    (s) => s.userId === activeUser.id
  );

  return {
    state,
    setState,
    activeTab,
    setActiveTab,
    routeView,
    setRouteView,
    glyphReloadTick,
    setGlyphReloadTick,
    isOffline,
    isSelfTestRoute,
    setIsSelfTestRoute,
    activeLesson,
    setActiveLesson,
    showOnboardingModal,
    setShowOnboardingModal,
    onboardingScreenIdx,
    setOnboardingScreenIdx,
    showCoachMarkOnHome,
    dismissHomeCoachMark,
    showHelpSheet,
    setShowHelpSheet,
    familySheetId,
    setFamilySheetId,
    pickerLetterSheetId,
    setPickerLetterSheetId,
    showAccesSheet,
    setShowAccesSheet,
    showDailyReviewSheet,
    setShowDailyReviewSheet,
    showStreakSheet,
    setShowStreakSheet,
    showShareSheet,
    setShowShareSheet,
    shareIncludeFirstName,
    setShareIncludeFirstName,
    sharePreviewCanvasRef,
    formesLetterId,
    setFormesLetterId,
    selectedFormKey,
    setSelectedFormKey,
    formAnimTick,
    setFormAnimTick,
    showHarakatLessonSheet,
    setShowHarakatLessonSheet,
    harakatCardIdx,
    setHarakatCardIdx,
    teacherCodeDraft,
    setTeacherCodeDraft,
    showTeacherCodeForm,
    setShowTeacherCodeForm,
    showVoiceRecorderSheet,
    setShowVoiceRecorderSheet,
    voiceRecStep,
    setVoiceRecStep,
    voiceParentalConsent,
    setVoiceParentalConsent,
    voiceSecElapsed,
    setVoiceSecElapsed,
    voiceDataUrl,
    setVoiceDataUrl,
    albumCompareLetterId,
    setAlbumCompareLetterId,
    albumSliderPct,
    setAlbumSliderPct,
    lettresTopSubTab,
    setLettresTopSubTab,
    activeMiniGame,
    setActiveMiniGame,
    lastPlayedMiniGame,
    setLastPlayedMiniGame,
    gamePlayCount,
    setGamePlayCount,
    antWalkingFamilyId,
    setAntWalkingFamilyId,
    selectedBadgeGoal,
    setSelectedBadgeGoal,
    activeReadingWord,
    setActiveReadingWord,
    tappedCharIndex,
    setTappedCharIndex,
    activeExam,
    setActiveExam,
    activeUser,
    mode,
    lettersViewType,
    setLettersViewType,
    toast,
    showToast,
    activationInput,
    setActivationInput,
    activationError,
    setActivationError,
    certNameDraft,
    setCertNameDraft,
    parentalHoldProgress,
    parentalUnlocked,
    userSetting,
    updateSetting,
    toggleLearnerMode,
    startParentalHold,
    stopParentalHold,
    openDefiMiniGame,
    startVoiceReadingRecording,
    stopVoiceReadingRecording,
    finishOnboarding,
    letters,
    todayInfo,
    userProgress,
    streakObj,
    userStreak,
    bestStreak,
    totalStars,
    completedLettersCount,
    masteredLettersCount,
    unlockedLetterIds,
    learnedLetterIds,
    allWords,
    unlockedWords,
    dailyQueue,
    todayIso,
    isDailyDoneToday,
    todayMissions,
    missionsDoneCount,
    weeklyGoalTarget,
    weeklyCompletedCount,
    weeklyGoalReached,
    todayFamilyMonoTag,
    nextLockedOrTomorrowLetter,
    badgesList,
    getLetterStatus,
    getFamilyNodeState,
    teacherLink,
    userSubmissions,
  };
}

export type NouqtaAppController = ReturnType<typeof useNouqtaState>;
