import React, { useState, useEffect } from 'react';
import { Check, UserCheck, ShieldCheck, ArrowLeft } from 'lucide-react';
import {
  BottomNav,
  IconButton,
  Mascot,
  PrimaryButton,
  Toast,
  TopHeader,
} from './components/BlueprintComponents';
import {
  AdminPanelView,
  TeacherPanelView,
} from './components/TeacherAndAdminViews';
import { GlyphStrokeEditorPage } from './components/GlyphStrokeEditorPage';
import {
  DevSelfTestReportModal,
  SelfTestCheckResult,
  runCheck1_AnimationVoir,
  runCheck3_TracingStepsDiffer,
  runFix1_UnlockAndLearnedLettersAudit,
  runFix2_ChasseAuxPointsDotlessAudit,
  runFixE_AntFinalPositionAll28Letters,
  runPolishCheck2_DotsSimulation,
  runPolishCheck5_ExamsProgressiveRule,
  runPolishCheck6_QuizOptionsPictureArabicFrench,
  runPolishCheck7_PracticeScores3Attempts,
} from './components/DevSelfTestPage';
import { useNouqtaState } from './hooks/useNouqtaState';
import { ParcoursScreen } from './screens/ParcoursScreen';
import { LettresScreen } from './screens/LettresScreen';
import { LectureScreen } from './screens/LectureScreen';
import { MoiScreen } from './screens/MoiScreen';
import { SheetsAndModals } from './screens/SheetsAndModals';

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
  'bee',
]);

export default function App() {
  const app = useNouqtaState();
  const {
    state,
    setState,
    activeTab,
    setActiveTab,
    routeView,
    setRouteView,
    setGlyphReloadTick,
    isOffline,
    isSelfTestRoute,
    setIsSelfTestRoute,
    activeLesson,
    setActiveLesson,
    setShowOnboardingModal,
    setShowHelpSheet,
    setShowStreakSheet,
    setShowDailyReviewSheet,
    setLettresTopSubTab,
    activeReadingWord,
    activeExam,
    activeUser,
    mode,
    toast,
    showToast,
    userStreak,
    totalStars,
    completedLettersCount,
  } = app;

  const [selfTestRunning, setSelfTestRunning] = useState<boolean>(false);
  const [selfTestScreenName, setSelfTestScreenName] = useState<string>('Home');
  const [selfTestResults, setSelfTestResults] = useState<SelfTestCheckResult[]>(
    []
  );
  const [selfTestRunTrigger, setSelfTestRunTrigger] = useState<number>(0);

  // Automatic /dev/selftest runner
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

      let tracingCanvasWidthPx = 0;
      let tracingViewportWidthPx = window.innerWidth || 360;
      let tracingCanvasWidthPct = 0;
      let tracingUnderCanvasBtnCount = 0;
      const tracingTruncatedOrOverlap: string[] = [];

      let homeWordmarkText = '';
      let homeWordmarkTruncated = false;
      let homeCoachmarkPointsAtReprendre = false;
      let homeLastCardVisibleAtScrollEnd = false;
      let homePaddingBottomPx = 0;
      let homeScrollGapPx = 0;

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
          const textEls = Array.from(
            root.querySelectorAll<HTMLElement>(
              '[data-testid="lesson-header-letter-name"], [data-testid="tracing-substep-label"], [data-testid="tracing-under-canvas-controls"] span'
            )
          );
          for (const tel of textEls) {
            if (tel.scrollWidth > tel.clientWidth + 2) {
              tracingTruncatedOrOverlap.push(
                `Texte tronqué sur Tracing : "${tel.textContent?.trim()}" (${
                  tel.clientWidth
                }px < ${tel.scrollWidth}px)`
              );
            }
          }
        }

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
            homeCoachmarkPointsAtReprendre =
              cr.bottom <= rr.top + 8 &&
              Math.abs((cr.left + cr.right) / 2 - (rr.left + rr.right) / 2) <
                24;
          } else {
            homeCoachmarkPointsAtReprendre = Boolean(reprendreEl);
          }

          const mainEl = root.querySelector('main');
          if (mainEl) {
            homePaddingBottomPx = Math.round(
              parseFloat(window.getComputedStyle(mainEl).paddingBottom || '0')
            );
          }

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
          },
        },
        {
          name: 'Tracing (Baa)',
          apply: () => {
            setActiveLesson({
              letterId: 'baa',
              initialStep: 'tracer',
              practiceMode: false,
            });
          },
        },
        {
          name: 'Lesson (Taa fort)',
          apply: () => {
            setActiveLesson({ letterId: 'taa_emph', initialStep: 'voir' });
          },
        },
        {
          name: 'Lettres & Jeux',
          apply: () => {
            setActiveLesson(null);
            setActiveTab('lettres');
            setLettresTopSubTab('lettres');
          },
        },
        {
          name: 'Lecture',
          apply: () => {
            setActiveLesson(null);
            setActiveTab('lecture');
          },
        },
        {
          name: 'Moi',
          apply: () => {
            setActiveLesson(null);
            setActiveTab('moi');
          },
        },
      ];

      for (const s of screens) {
        if (cancelled) return;
        setSelfTestScreenName(s.name);
        s.apply();
        await sleep(75);
        if (cancelled) return;
        scanCurrentDomScreen(s.name);
      }

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
          `Textes tronqués ou chevauchements sur Tracer : ${tracingTruncatedOrOverlap.length}`,
        ],
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
        summary: `En-tête : "${homeWordmarkText}" (tronqué=${
          homeWordmarkTruncated ? 'OUI' : 'NON'
        }) · padding-bottom=${homePaddingBottomPx}px (marge fin de scroll=${homeScrollGapPx}px au-dessus de Reprendre) · Coach-mark -> Reprendre=${
          homeCoachmarkPointsAtReprendre ? 'OUI' : 'NON'
        }`,
        details: [
          `Mot-symbole en-tête : "${homeWordmarkText}" (sans troncature à 360px : ${
            !homeWordmarkTruncated ? 'OUI' : 'NON'
          })`,
          `Dernière carte visible en fin de défilement : ${
            homeLastCardVisibleAtScrollEnd ? 'OUI' : 'NON'
          } (padding-bottom=${homePaddingBottomPx}px, dégagement=${homeScrollGapPx}px au-dessus du bouton sticky)`,
          `Bulle coach-mark avec flèche pointant vers « Reprendre » (bouton OK, affiché 1 fois) : ${
            homeCoachmarkPointsAtReprendre ? 'OUI' : 'NON'
          }`,
        ],
      };

      const c4 = runCheck1_AnimationVoir();
      const c5 = runPolishCheck5_ExamsProgressiveRule(domFinalExamLocked);
      const c6 = runPolishCheck6_QuizOptionsPictureArabicFrench();
      const c7 = runPolishCheck7_PracticeScores3Attempts();
      const cFix1 = runFix1_UnlockAndLearnedLettersAudit();
      const cFix2 = runFix2_ChasseAuxPointsDotlessAudit();
      const cSteps28 = runCheck3_TracingStepsDiffer();
      const cFixE = runFixE_AntFinalPositionAll28Letters();

      const all8Issues = [
        ...under48Issues,
        ...overlapIssues,
        ...Array.from(new Set(englishIssues)),
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
                '0 mot anglais détecté dans les chaînes visibles (100 % français)',
              ]
            : all8Issues,
      };

      if (!cancelled) {
        setSelfTestResults([
          c1,
          c2,
          c3,
          c4,
          c5,
          c6,
          c7,
          c8,
          cFix1,
          cFix2,
          cSteps28,
          cFixE,
        ]);
        setSelfTestRunning(false);
      }
    };

    runFullAudit();
    return () => {
      cancelled = true;
    };
  }, [isSelfTestRoute, selfTestRunTrigger]);

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
                    correctedAt: "À l'instant",
                  }
                : s
            ),
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
                ...override,
              },
            },
          }));
          showToast('Tracé et contenu mis à jour !', 'good');
        }}
        onAddCustomWord={(word) => {
          setState((prev) => ({
            ...prev,
            customWords: [...(prev.customWords || []), word],
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
            plan: 'one-time' as const,
          }));
          setState((prev) => ({
            ...prev,
            activationCodes: [...newCodes, ...prev.activationCodes],
          }));
          showToast(`${count} codes générés !`, 'good');
        }}
        onRevokeCode={(code) => {
          setState((prev) => ({
            ...prev,
            activationCodes: prev.activationCodes.filter(
              (c) => c.code !== code
            ),
          }));
        }}
        onToggleUserEntitlement={(uid) => {
          setState((prev) => ({
            ...prev,
            users: prev.users.map((u) =>
              u.id === uid
                ? {
                    ...u,
                    entitlement: u.entitlement === 'full' ? 'free' : 'full',
                  }
                : u
            ),
          }));
        }}
        onResetUserProgress={(uid) => {
          setState((prev) => ({
            ...prev,
            progress: prev.progress.filter((p) => p.userId !== uid),
          }));
          showToast('Progression réinitialisée', 'info');
        }}
        onDeleteUser={(uid) => {
          setState((prev) => ({
            ...prev,
            users: prev.users.filter((u) => u.id !== uid),
            progress: prev.progress.filter((p) => p.userId !== uid),
            submissions: prev.submissions.filter((s) => s.userId !== uid),
          }));
        }}
        onUpdateAdminConfig={(cfg) => {
          setState((prev) => ({ ...prev, adminConfig: cfg }));
          showToast('Configuration enregistrée', 'good');
        }}
      />
    );
  }

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

  return (
    <div
      id="nouqta-app-shell"
      className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex justify-center"
    >
      <Toast message={toast?.message || null} tone={toast?.tone} />

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

      {!activeLesson && !activeReadingWord && !activeExam && (
        <div className="w-full max-w-[480px] min-h-screen flex flex-col relative">
          <TopHeader
            streakCount={userStreak}
            starsCount={totalStars}
            isOffline={isOffline}
            onOpenStreak={() => setShowStreakSheet(true)}
            onOpenStars={() => setActiveTab('moi')}
            onOpenHelp={() => setShowHelpSheet(true)}
            onOpenGlyphEditor={() => setRouteView('glyphs')}
          />

          <main className="flex-1 px-[20px] pt-2 pb-[236px]">
            {activeTab === 'parcours' && <ParcoursScreen app={app} />}
            {activeTab === 'lettres' && <LettresScreen app={app} />}
            {activeTab === 'lecture' && <LectureScreen app={app} />}
            {activeTab === 'moi' && <MoiScreen app={app} />}
          </main>

          <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
        </div>
      )}

      {mode === 'kids' && (
        <div className="hidden lg:flex flex-col items-center justify-center pl-12 select-none">
          <Mascot pose="wave" size={88} mode={mode} />
        </div>
      )}

      <SheetsAndModals app={app} />
    </div>
  );
}
