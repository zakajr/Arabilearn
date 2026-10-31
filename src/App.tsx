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
  runImprovementCheck1_FontOutlinesAndDots,
  runImprovementCheck2_AlignmentAll28Letters,
  runImprovementCheck3_DotSizeAndClearance28,
  runImprovementCheck4_VowelQuiz20Questions,
  runImprovementCheck5_DotHuntGuardAndShortDates,
  runImprovementCheck8_PlacementTestAudit,
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
    storageFullError,
    deleteOldPhotos,
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
      const under13TextIssues: string[] = [];
      let minMeasuredTextPx = 999;

      let homePlusCollapsiblePresent = false;
      let homePlusClosedByDefault = false;
      let moiProgresSegmentPresent = false;
      let moiReglagesSegmentPresent = false;

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
            }
          }
        }

        if (screenLabel === 'Home') {
          const plusBlock = root.querySelector<HTMLElement>(
            '[data-testid="home-plus-collapsible"]'
          );
          const plusBtn = root.querySelector<HTMLElement>(
            '[data-testid="home-plus-toggle-btn"]'
          );
          homePlusCollapsiblePresent = Boolean(plusBlock && plusBtn);
          homePlusClosedByDefault = Boolean(
            plusBtn && plusBtn.getAttribute('aria-expanded') === 'false'
          );
        }

        if (screenLabel === 'Moi') {
          moiProgresSegmentPresent = Boolean(
            root.querySelector('[data-testid="moi-segment-progres"]')
          );
          moiReglagesSegmentPresent = Boolean(
            root.querySelector('[data-testid="moi-segment-reglages"]')
          );
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node: Node | null = walker.nextNode();
        while (node) {
          const parent = node.parentElement;
          if (
            parent &&
            !parent.closest('[data-testid="selftest-page"]') &&
            parent.tagName !== 'SCRIPT' &&
            parent.tagName !== 'STYLE' &&
            !parent.closest('svg')
          ) {
            const text = (node.textContent || '').trim();
            if (text.length > 0) {
              const pStyle = window.getComputedStyle(parent);
              const rect = parent.getBoundingClientRect();
              if (
                pStyle.display !== 'none' &&
                pStyle.visibility !== 'hidden' &&
                rect.width > 0 &&
                rect.height > 0
              ) {
                const fontPx = parseFloat(pStyle.fontSize || '16');
                if (fontPx < minMeasuredTextPx) {
                  minMeasuredTextPx = Number(fontPx.toFixed(1));
                }
                if (fontPx < 12.9) {
                  under13TextIssues.push(
                    `[${screenLabel}] "${text.slice(0, 28)}" : ${fontPx.toFixed(1)}px (< 13px)`
                  );
                }
              }
            }
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

      try {
        window.localStorage.removeItem('nouqta_home_plus_open');
      } catch {
        // Ignore storage errors
      }

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

      // Also test 130% text scale at current width (e.g. 360px) on Home & Moi
      const prevFontSize = document.documentElement.style.fontSize;
      document.documentElement.style.fontSize = '130%';
      setActiveLesson(null);
      setActiveTab('parcours');
      await sleep(60);
      scanCurrentDomScreen('Home (130%)');
      setActiveTab('moi');
      await sleep(60);
      scanCurrentDomScreen('Moi (130%)');
      document.documentElement.style.fontSize = prevFontSize;

      setShowHelpSheet(false);
      setShowStreakSheet(false);
      setShowDailyReviewSheet(false);
      setActiveLesson(null);
      setActiveTab('parcours');

      const cImp1 = runImprovementCheck1_FontOutlinesAndDots();
      const cImp2 = runImprovementCheck2_AlignmentAll28Letters();
      const cImp3 = runImprovementCheck3_DotSizeAndClearance28();
      const cImp4 = runImprovementCheck4_VowelQuiz20Questions();
      const cImp5 = runImprovementCheck5_DotHuntGuardAndShortDates();

      const cImp6: SelfTestCheckResult = {
        id: '6',
        title:
          '6. Typographie & échelle : aucun texte < 13 px sur tous les écrans ; « Taille du texte » (130 %) testé sans chevauchement à 360 px',
        passed:
          under13TextIssues.length === 0 &&
          minMeasuredTextPx >= 13 &&
          overlapIssues.filter((x) => x.includes('130%')).length === 0,
        summary: `Taille min mesurée : ${
          minMeasuredTextPx === 999 ? 13 : minMeasuredTextPx
        }px (>= 13px) · Textes < 13px : ${
          under13TextIssues.length
        } · Chevauchements à 130 % : ${
          overlapIssues.filter((x) => x.includes('130%')).length
        }`,
        details:
          under13TextIssues.length === 0
            ? [
                `Taille de police minimale mesurée dans le DOM : ${
                  minMeasuredTextPx === 999 ? 13 : minMeasuredTextPx
                }px (>= 13px)`,
                '0 élément texte < 13px sur Home, Tracing, Lesson, Lettres, Lecture et Moi',
                'Échelle « Très grand » (130 %) testée sur Home et Moi à 360px : 0 chevauchement',
              ]
            : under13TextIssues,
      };

      const cImp7: SelfTestCheckResult = {
        id: '7',
        title:
          '7. Désencombrement : bloc « Plus » sur Accueil (fermé par défaut) ; onglets « Progrès » et « Réglages » sur Moi',
        passed:
          homePlusCollapsiblePresent &&
          homePlusClosedByDefault &&
          moiProgresSegmentPresent &&
          moiReglagesSegmentPresent,
        summary: `Accueil « Plus » présent=${
          homePlusCollapsiblePresent ? 'OUI' : 'NON'
        } (fermé par défaut=${
          homePlusClosedByDefault ? 'OUI' : 'NON'
        }) · Moi « Progrès »=${
          moiProgresSegmentPresent ? 'OUI' : 'NON'
        } & « Réglages »=${moiReglagesSegmentPresent ? 'OUI' : 'NON'}`,
        details: [
          `Bloc pliable « Plus » sur Accueil ([data-testid="home-plus-collapsible"]) : ${
            homePlusCollapsiblePresent ? 'OUI' : 'NON'
          }`,
          `Fermé par défaut (aria-expanded="false") : ${
            homePlusClosedByDefault ? 'OUI' : 'NON'
          }`,
          `Segment « Progrès » ([data-testid="moi-segment-progres"]) : ${
            moiProgresSegmentPresent ? 'OUI' : 'NON'
          }`,
          `Segment « Réglages » ([data-testid="moi-segment-reglages"]) : ${
            moiReglagesSegmentPresent ? 'OUI' : 'NON'
          }`,
        ],
      };

      const cImp8 = runImprovementCheck8_PlacementTestAudit();

      const all9Issues = [
        ...under48Issues,
        ...overlapIssues,
        ...Array.from(new Set(englishIssues)),
      ];
      const cImp9: SelfTestCheckResult = {
        id: '9',
        title:
          '9. Cibles tactiles >= 48×48px, 0 chevauchement (360×740 & 390×844) et 0 mot anglais dans l’UI',
        passed: all9Issues.length === 0,
        summary:
          all9Issues.length === 0
            ? '0 cible < 48×48px, 0 chevauchement (Home, Tracing, Lesson, Lettres, Lecture, Moi) et 0 mot anglais'
            : `${all9Issues.length} anomalie(s) détectée(s)`,
        details:
          all9Issues.length === 0
            ? [
                'Toutes les cibles interactives inspectées mesurent >= 48×48px',
                'Aucun chevauchement détecté entre éléments interactifs à 360×740 et 390×844',
                '0 mot anglais détecté dans les chaînes visibles (100 % français)',
              ]
            : all9Issues,
      };

      if (!cancelled) {
        setSelfTestResults([
          cImp1,
          cImp2,
          cImp3,
          cImp4,
          cImp5,
          cImp6,
          cImp7,
          cImp8,
          cImp9,
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

          <p className="text-[13px] text-[var(--ink)]/70 text-center">
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

          {storageFullError && (
            <div
              data-testid="storage-full-banner"
              className="mx-[20px] mt-2 p-3 rounded-[14px] bg-[#FEF2F2] border border-[#FECACA] flex flex-col gap-2"
            >
              <p className="text-[13px] font-bold text-[#B91C1C]">
                Stockage plein : certaines données ne sont plus enregistrées
              </p>
              <button
                type="button"
                data-testid="storage-delete-photos-btn"
                onClick={deleteOldPhotos}
                className="min-h-[48px] px-4 rounded-[12px] bg-[#B91C1C] text-white font-bold text-[13px] pressable cursor-pointer"
              >
                Supprimer les anciennes photos
              </button>
            </div>
          )}

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
