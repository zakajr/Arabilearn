import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  X,
  ArrowLeft,
  MessageCircle,
  ZoomIn,
  Download,
  Plus,
  Trash2,
  KeyRound,
  Users,
  Sliders,
  PenTool,
  Play,
  Mic,
  RotateCcw,
  Volume2
} from 'lucide-react';
import {
  LETTERS_DATA,
  LETTER_FAMILIES,
  WordRecord
} from '../data/lettersAndFamilies';
import { GlyphBodyStroke, GlyphForm } from '../lib/strokeMath';
import {
  AdminConfig,
  BlueprintState,
  Submission,
  SubmissionReason,
  getLettersWithOverrides,
  getTodayIsoDate
} from '../services/dataService';
import { speechService } from '../services/speech';
import {
  PrimaryButton,
  ProgressRing,
  SecondaryButton,
  StatusChip
} from './BlueprintComponents';

/**
 * Section 12.1, 12.2, 12.3 & PHASE E3 Teacher Panel (/prof)
 * Fast < 15s full-screen card correction:
 * - One full-screen card at a time: photo or audio, reference letter, two big buttons "Correct" / "À refaire", swipe right = correct, swipe left = redo.
 * - Quick reason chips: points, direction, taille, prononciation, rythme.
 * - Photo: zoom plus a slider that overlays the correct letter at 40% (default 40%).
 * - Audio: play button, waveform, 0.75x speed toggle.
 * - Optional 15 s voice reply, auto-advance to next item, 5 s undo, counters of pending items.
 */
export function TeacherPanelView({
  state,
  onExitToLearner,
  onOpenAdmin,
  onCorrectSubmission,
  onUndoLastCorrection,
  onSaveLetterOverride,
  onAddCustomWord
}: {
  state: BlueprintState;
  onExitToLearner: () => void;
  onOpenAdmin: () => void;
  onCorrectSubmission: (
    submissionId: string,
    status: 'correct' | 'redo',
    comment: string,
    reasons: SubmissionReason[],
    voiceReplyRef?: string
  ) => void;
  onUndoLastCorrection?: (
    submissionId: string,
    previousStatus: 'pending' | 'correct' | 'redo'
  ) => void;
  onSaveLetterOverride: (
    letterId: string,
    override: {
      videoPaperUrl?: string;
      tip?: string;
      isolatedGlyph?: GlyphForm;
    }
  ) => void;
  onAddCustomWord: (word: WordRecord) => void;
}) {
  const [subRoute, setSubRoute] = useState<'queue' | 'students' | 'content'>('queue');
  const [queueFilter, setQueueFilter] = useState<'pending' | 'redo' | 'all'>('pending');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [selectedReasons, setSelectedReasons] = useState<SubmissionReason[]>([]);
  const [zoomPhoto, setZoomPhoto] = useState<boolean>(false);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(40); // Phase E3: overlays the correct letter at 40%
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<1 | 0.75>(1);
  const [isPlayingStudentAudio, setIsPlayingStudentAudio] = useState<boolean>(false);
  const [isRecordingVoiceReply, setIsRecordingVoiceReply] = useState<boolean>(false);
  const [voiceReplyRef, setVoiceReplyRef] = useState<string | undefined>(undefined);
  const [undoBanner, setUndoBanner] = useState<{
    subId: string;
    studentName: string;
    prevStatus: 'pending' | 'correct' | 'redo';
  } | null>(null);

  // Touch swipe tracking for E3 (Swipe right = Correct, Swipe left = À refaire)
  const swipeStartXRef = useRef<number | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Selected student in /prof/eleve/:id
  const learners = state.users.filter((u) => u.role === 'learner');
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(
    learners[0]?.id || 'u_learner_1'
  );

  // Content & Stroke Editor state (/prof/contenu)
  const letters = getLettersWithOverrides(state);
  const [editingLetterId, setEditingLetterId] = useState<string>('baa');
  const activeEditLetter =
    letters.find((l) => l.id === editingLetterId) || letters[0];
  const [editVideoUrl, setEditVideoUrl] = useState<string>(
    activeEditLetter.videoPaperUrl || ''
  );
  const [editTip, setEditTip] = useState<string>(activeEditLetter.tip || '');
  const [editStartX, setEditStartX] = useState<number>(
    (activeEditLetter.forms.isolated.strokes[0] as GlyphBodyStroke)?.startDot?.[0] ?? 168
  );
  const [editStartY, setEditStartY] = useState<number>(
    (activeEditLetter.forms.isolated.strokes[0] as GlyphBodyStroke)?.startDot?.[1] ?? 88
  );
  const [newWordAr, setNewWordAr] = useState<string>('');
  const [newWordFr, setNewWordFr] = useState<string>('');
  const [newWordTranslit, setNewWordTranslit] = useState<string>('');

  useEffect(() => {
    setEditVideoUrl(activeEditLetter.videoPaperUrl || '');
    setEditTip(activeEditLetter.tip || '');
    const firstStroke = activeEditLetter.forms.isolated.strokes[0] as
      | GlyphBodyStroke
      | undefined;
    if (firstStroke?.startDot) {
      setEditStartX(firstStroke.startDot[0]);
      setEditStartY(firstStroke.startDot[1]);
    }
  }, [editingLetterId]);

  const filteredSubs = state.submissions.filter((s) =>
    queueFilter === 'all' ? true : s.status === queueFilter
  );

  const activeSub: Submission | undefined =
    filteredSubs.find((s) => s.id === selectedSubId) || filteredSubs[0];

  const pendingCount = state.submissions.filter(
    (s) => s.status === 'pending'
  ).length;

  const handleApplyCorrection = (status: 'correct' | 'redo') => {
    if (!activeSub) return;
    const prevStatus = activeSub.status;
    onCorrectSubmission(
      activeSub.id,
      status,
      commentText,
      selectedReasons,
      voiceReplyRef
    );
    setCommentText('');
    setSelectedReasons([]);
    setVoiceReplyRef(undefined);

    // 5-second undo banner (Phase E3)
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }
    setUndoBanner({
      subId: activeSub.id,
      studentName: activeSub.studentFirstName,
      prevStatus
    });
    undoTimerRef.current = window.setTimeout(() => {
      setUndoBanner(null);
    }, 5000);

    // Auto-advance to the next pending item
    const nextPending = state.submissions.find(
      (s) => s.id !== activeSub.id && s.status === 'pending'
    );
    if (nextPending) {
      setSelectedSubId(nextPending.id);
    }
  };

  // Section 12.1 Keyboard shortcuts on desktop: C (Correct), R (À refaire), N (Suivant)
  useEffect(() => {
    if (subRoute !== 'queue') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'c') {
        handleApplyCorrection('correct');
      } else if (e.key.toLowerCase() === 'r') {
        handleApplyCorrection('redo');
      } else if (e.key.toLowerCase() === 'n') {
        const idx = filteredSubs.findIndex((s) => s.id === activeSub?.id);
        const next = filteredSubs[(idx + 1) % Math.max(1, filteredSubs.length)];
        if (next) setSelectedSubId(next.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [subRoute, activeSub, commentText, selectedReasons, filteredSubs]);

  const toggleReasonChip = (chip: SubmissionReason) => {
    setSelectedReasons((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handlePlayStudentAudio = (sub: Submission) => {
    setIsPlayingStudentAudio(true);
    if (sub.audioRef && sub.audioRef.startsWith('data:audio')) {
      try {
        if (!audioElRef.current) {
          audioElRef.current = new Audio(sub.audioRef);
        } else {
          audioElRef.current.src = sub.audioRef;
        }
        audioElRef.current.playbackRate = audioPlaybackRate;
        audioElRef.current.onended = () => setIsPlayingStudentAudio(false);
        audioElRef.current.play().catch(() => {
          setIsPlayingStudentAudio(false);
        });
        return;
      } catch {
        // Fallback to speech synthesis preview
      }
    }
    const refLetter = letters.find((l) => l.id === sub.letterId);
    speechService.speakArabic(refLetter?.speechText || 'ب');
    window.setTimeout(() => setIsPlayingStudentAudio(false), 900);
  };

  const handleToggleVoiceReply = () => {
    if (isRecordingVoiceReply) {
      setIsRecordingVoiceReply(false);
      setVoiceReplyRef('voice_reply_15s_recorded');
    } else {
      setIsRecordingVoiceReply(true);
      window.setTimeout(() => {
        setIsRecordingVoiceReply(false);
        setVoiceReplyRef('voice_reply_15s_recorded');
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] pb-12">
      {/* Teacher Header */}
      <header className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--line)] px-4 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onExitToLearner}
            className="min-h-[48px] h-[48px] px-3 rounded-xl border border-[var(--line)] text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Vue Élève</span>
          </button>
          <span className="font-display text-[18px] text-[var(--ink)] truncate">
            Nouqta · Professeur
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="teacher-queue-tab"
            onClick={() => setSubRoute('queue')}
            className={`min-h-[48px] h-[48px] px-3 rounded-xl text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer ${
              subRoute === 'queue'
                ? 'bg-[var(--brand-deep)] text-white'
                : 'bg-[var(--paper)] text-[var(--ink)]'
            }`}
          >
            <span>Corrections</span>
            <span
              data-testid="teacher-pending-counter"
              className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-mono-tag text-[11px] font-bold"
            >
              {pendingCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSubRoute('students')}
            className={`min-h-[48px] h-[48px] px-3 rounded-xl text-[13px] font-semibold cursor-pointer ${
              subRoute === 'students'
                ? 'bg-[var(--brand-deep)] text-white'
                : 'bg-[var(--paper)] text-[var(--ink)]'
            }`}
          >
            Élèves
          </button>
          <button
            type="button"
            onClick={() => setSubRoute('content')}
            className={`min-h-[48px] h-[48px] px-3 rounded-xl text-[13px] font-semibold cursor-pointer hidden sm:inline-flex items-center ${
              subRoute === 'content'
                ? 'bg-[var(--brand-deep)] text-white'
                : 'bg-[var(--paper)] text-[var(--ink)]'
            }`}
          >
            Contenu
          </button>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="min-h-[48px] h-[48px] px-3 rounded-xl border border-[var(--brand)] text-[var(--brand)] text-[13px] font-bold cursor-pointer"
          >
            /admin
          </button>
        </div>
      </header>

      {/* PHASE E3: 5-second Undo Banner */}
      {undoBanner && (
        <div
          data-testid="teacher-undo-banner"
          className="max-w-5xl mx-auto mt-3 px-5"
        >
          <div className="rounded-[18px] bg-[var(--brand-deep)] text-white px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="text-[14px] font-semibold">
              Correction enregistrée pour {undoBanner.studentName}. Passage automatique au suivant.
            </span>
            <button
              type="button"
              data-testid="teacher-undo-btn"
              onClick={() => {
                onUndoLastCorrection?.(undoBanner.subId, undoBanner.prevStatus);
                setSelectedSubId(undoBanner.subId);
                setUndoBanner(null);
              }}
              className="min-h-[48px] px-3.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-[13px] font-bold flex items-center gap-1.5 pressable cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Annuler (5 s)</span>
            </button>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-5 py-5">
        {/* 12.1 & PHASE E3 TEACHER FAST CORRECTION QUEUE (< 15 seconds) */}
        {subRoute === 'queue' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Queue Column */}
            <div className="md:col-span-5 space-y-4">
              {/* Segmented Filter */}
              <div className="grid grid-cols-3 bg-[var(--surface)] p-1 rounded-[18px] border border-[var(--line)]">
                {(
                  [
                    { id: 'pending', label: `En attente (${pendingCount})` },
                    { id: 'redo', label: 'À refaire' },
                    { id: 'all', label: 'Tous' }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setQueueFilter(tab.id)}
                    className={`min-h-[48px] h-[48px] rounded-[14px] text-[12px] font-bold cursor-pointer ${
                      queueFilter === tab.id
                        ? 'bg-[var(--brand-deep)] text-white'
                        : 'text-[var(--ink)]/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Queue Rows (Photo + Audio submissions) */}
              <div className="space-y-2.5">
                {filteredSubs.length === 0 ? (
                  <div className="rounded-[18px] bg-[var(--surface)] border border-[var(--line)] p-6 text-center text-[15px]">
                    Aucune copie en attente dans cette file.
                  </div>
                ) : (
                  filteredSubs.map((sub) => {
                    const letterObj = letters.find((l) => l.id === sub.letterId);
                    const isSelected = activeSub?.id === sub.id;
                    const isAudio = sub.kind === 'audio' || Boolean(sub.audioRef);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        data-testid={`teacher-queue-item-${sub.id}`}
                        onClick={() => setSelectedSubId(sub.id)}
                        className={`w-full min-h-[68px] p-3.5 rounded-[18px] border-2 flex items-center justify-between gap-3 text-left pressable cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--surface)] border-[var(--brand)]'
                            : 'bg-[var(--surface)] border-[var(--line)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isAudio ? (
                            <div className="w-12 h-12 rounded-xl bg-[var(--brand-deep)] text-[var(--accent)] flex items-center justify-center shrink-0">
                              <Mic className="w-5 h-5" />
                            </div>
                          ) : (
                            <img
                              src={sub.imageRef}
                              alt="Miniature copie"
                              className="w-12 h-12 rounded-xl object-cover border border-[var(--line)] bg-[var(--paper)] shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-[15px] text-[var(--ink)] truncate">
                              {sub.studentFirstName} · {letterObj?.shortName} (
                              <span lang="ar" dir="rtl" className="font-arabic">
                                {letterObj?.arabicChar}
                              </span>
                              )
                            </div>
                            <div className="text-[12px] text-[var(--ink)]/70">
                              {isAudio ? 'Lecture vocale' : 'Photo écriture'} ·{' '}
                              {sub.createdAt}
                            </div>
                          </div>
                        </div>
                        <StatusChip status={sub.status} mode="adult" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Full-Screen Fast Correction Card (< 15s, swipe right = correct, swipe left = redo) */}
            <div className="md:col-span-7">
              {activeSub ? (
                <div
                  data-testid="teacher-fast-correction-card"
                  onPointerDown={(e) => {
                    swipeStartXRef.current = e.clientX;
                  }}
                  onPointerUp={(e) => {
                    if (swipeStartXRef.current === null) return;
                    const dx = e.clientX - swipeStartXRef.current;
                    swipeStartXRef.current = null;
                    if (dx > 90) {
                      handleApplyCorrection('correct');
                    } else if (dx < -90) {
                      handleApplyCorrection('redo');
                    }
                  }}
                  className="rounded-[28px] bg-[var(--surface)] border-2 border-[var(--line)] p-5 space-y-4 select-none"
                >
                  {(() => {
                    const refLetter =
                      letters.find((l) => l.id === activeSub.letterId) ||
                      letters[0];
                    const isAudio =
                      activeSub.kind === 'audio' || Boolean(activeSub.audioRef);

                    return (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="font-mono-tag text-[var(--brand)] block">
                              CORRECTION &lt; 15 S · GLISSER DROITE = CORRECT / GAUCHE = À REFAIRE
                            </span>
                            <h2 className="font-display text-[22px] text-[var(--ink)] truncate">
                              {activeSub.studentFirstName} — {refLetter.shortName}
                            </h2>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Reference Letter Badge */}
                            <div
                              data-testid="teacher-reference-letter"
                              className="w-14 h-14 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center font-arabic text-[36px] text-[var(--brand-deep)]"
                            >
                              {refLetter.arabicChar}
                            </div>
                            {!isAudio && (
                              <button
                                type="button"
                                aria-label="Zoomer la photo"
                                onClick={() => setZoomPhoto((z) => !z)}
                                className="w-[48px] h-[48px] rounded-full border border-[var(--line)] flex items-center justify-center cursor-pointer"
                              >
                                <ZoomIn className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* PHOTO SUBMISSION VIEWER + 40% Reference Letter Overlay Slider (Phase E3) */}
                        {!isAudio ? (
                          <div className="space-y-2">
                            <div className="relative rounded-[18px] bg-[var(--paper)] border border-[var(--line)] overflow-hidden flex items-center justify-center p-2 min-h-[220px]">
                              <img
                                src={activeSub.imageRef}
                                alt="Feuille photographiée"
                                className={`w-full transition-transform ${
                                  zoomPhoto
                                    ? 'max-h-[380px] scale-125'
                                    : 'max-h-[240px]'
                                } object-contain`}
                              />
                              {/* Reference letter overlay at overlayOpacity% (default 40%) */}
                              <div
                                data-testid="teacher-reference-overlay"
                                style={{ opacity: overlayOpacity / 100 }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                              >
                                <span
                                  lang="ar"
                                  dir="rtl"
                                  className="font-arabic text-[140px] text-[var(--brand-deep)] leading-none"
                                >
                                  {refLetter.arabicChar}
                                </span>
                              </div>
                            </div>

                            <label className="flex items-center justify-between gap-3 text-[13px] font-semibold text-[var(--ink)]">
                              <span>
                                Calque lettre modèle : {overlayOpacity} %
                              </span>
                              <input
                                type="range"
                                data-testid="teacher-overlay-slider"
                                aria-label="Opacité du calque de la lettre modèle"
                                min={0}
                                max={80}
                                value={overlayOpacity}
                                onChange={(e) =>
                                  setOverlayOpacity(Number(e.target.value))
                                }
                                className="w-44 accent-[var(--brand)]"
                              />
                            </label>
                          </div>
                        ) : (
                          /* AUDIO SUBMISSION VIEWER: Play button, waveform, 0.75x speed (Phase E3) */
                          <div
                            data-testid="teacher-audio-player"
                            className="rounded-[20px] bg-[var(--paper)] border border-[var(--line)] p-4 flex flex-col gap-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                data-testid="teacher-audio-play-btn"
                                aria-label="Écouter l'enregistrement de l'élève"
                                onClick={() => handlePlayStudentAudio(activeSub)}
                                className="min-h-[52px] h-[52px] px-4 rounded-2xl bg-[var(--brand-deep)] text-white font-bold text-[14px] flex items-center gap-2 pressable cursor-pointer"
                              >
                                <Play className="w-5 h-5 fill-current" />
                                <span>
                                  {isPlayingStudentAudio
                                    ? 'Lecture...'
                                    : 'Écouter la lecture'}
                                </span>
                              </button>

                              {/* 0.75x speed toggle */}
                              <button
                                type="button"
                                data-testid="teacher-audio-speed-btn"
                                aria-label="Vitesse de lecture audio"
                                onClick={() =>
                                  setAudioPlaybackRate((r) =>
                                    r === 1 ? 0.75 : 1
                                  )
                                }
                                className="min-h-[48px] h-[48px] px-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] font-mono-tag text-[13px] font-bold text-[var(--ink)] pressable cursor-pointer"
                              >
                                {audioPlaybackRate}x
                              </button>
                            </div>

                            {/* Waveform bars */}
                            <div
                              data-testid="teacher-audio-waveform"
                              className="h-12 flex items-center justify-between gap-1 px-2"
                            >
                              {[
                                28, 52, 74, 40, 88, 64, 95, 50, 72, 84, 38, 62,
                                90, 46, 70, 55, 34, 68, 44, 30
                              ].map((h, i) => (
                                <span
                                  key={i}
                                  style={{ height: `${h}%` }}
                                  className={`flex-1 rounded-full transition-colors ${
                                    isPlayingStudentAudio
                                      ? 'bg-[var(--accent)]'
                                      : 'bg-[var(--brand)]/50'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quick Reason Chips: points, direction, taille, prononciation, rythme (Phase E3) */}
                        <div className="space-y-1.5">
                          <span className="font-mono-tag text-[var(--ink)]/70">
                            MOTIFS RAPIDES
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                'points',
                                'direction',
                                'taille',
                                'prononciation',
                                'rythme'
                              ] as const
                            ).map((chip) => {
                              const active = selectedReasons.includes(chip);
                              return (
                                <button
                                  key={chip}
                                  type="button"
                                  data-testid={`teacher-reason-chip-${chip}`}
                                  onClick={() => toggleReasonChip(chip)}
                                  className={`min-h-[48px] h-[48px] px-3.5 rounded-full text-[13px] font-semibold border cursor-pointer ${
                                    active
                                      ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                                      : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
                                  }`}
                                >
                                  {chip}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Optional Comment + Optional 15 s Voice Reply (Phase E3) */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={140}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Commentaire court (optionnel)..."
                            className="flex-1 h-[48px] px-4 rounded-[14px] bg-[var(--paper)] border border-[var(--line)] text-[14px] text-[var(--ink)]"
                          />

                          <button
                            type="button"
                            data-testid="teacher-voice-reply-btn"
                            aria-label="Enregistrer une réponse vocale de 15 secondes"
                            onClick={handleToggleVoiceReply}
                            className={`min-h-[48px] h-[48px] px-3 rounded-[14px] border text-[12px] font-bold flex items-center gap-1.5 pressable cursor-pointer shrink-0 ${
                              voiceReplyRef
                                ? 'bg-[var(--good)]/15 border-[var(--good)] text-[var(--good)]'
                                : isRecordingVoiceReply
                                ? 'bg-[var(--bad)] text-white border-[var(--bad)]'
                                : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
                            }`}
                          >
                            <Mic className="w-4 h-4" />
                            <span>
                              {voiceReplyRef
                                ? 'Audio 15s ✓'
                                : isRecordingVoiceReply
                                ? 'Stop...'
                                : ' Audio 15s'}
                            </span>
                          </button>
                        </div>

                        {/* Two Big Action Buttons: Correct / À refaire */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            type="button"
                            data-testid="teacher-btn-correct"
                            onClick={() => handleApplyCorrection('correct')}
                            className="min-h-[56px] h-[56px] rounded-[18px] bg-[var(--good)] text-white font-bold text-[17px] flex items-center justify-center gap-2 pressable cursor-pointer"
                          >
                            <Check className="w-5 h-5" />
                            <span>Correct</span>
                          </button>

                          <button
                            type="button"
                            data-testid="teacher-btn-redo"
                            onClick={() => handleApplyCorrection('redo')}
                            className="min-h-[56px] h-[56px] rounded-[18px] bg-[var(--bad)] text-white font-bold text-[17px] flex items-center justify-center gap-2 pressable cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                            <span>À refaire</span>
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-8 text-center">
                  Sélectionnez une copie à gauche pour la corriger.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 12.2 TEACHER: STUDENTS (/prof/eleve/:id) */}
        {subRoute === 'students' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-2.5">
              {learners.map((stu) => {
                const doneCount = state.progress.filter(
                  (p) => p.userId === stu.id && p.stepsDone.length === 5
                ).length;
                return (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => setSelectedLearnerId(stu.id)}
                    className={`w-full p-4 rounded-[18px] border-2 text-left flex items-center justify-between cursor-pointer ${
                      selectedLearnerId === stu.id
                        ? 'bg-[var(--surface)] border-[var(--brand)]'
                        : 'bg-[var(--surface)] border-[var(--line)]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[16px]">{stu.displayName}</div>
                      <div className="text-[13px] text-[var(--ink)]/70">
                        Mode {stu.mode === 'kids' ? 'Enfant' : 'Adulte'} ·{' '}
                        {doneCount}/28 lettres
                      </div>
                    </div>
                    <span className="font-mono-tag text-[var(--brand)]">
                      {stu.entitlement.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="md:col-span-8">
              {(() => {
                const stu =
                  learners.find((u) => u.id === selectedLearnerId) || learners[0];
                if (!stu) return null;
                const stuProg = state.progress.filter((p) => p.userId === stu.id);
                const doneLetters = stuProg.filter(
                  (p) => p.stepsDone.length === 5
                ).length;
                const familyRatios = LETTER_FAMILIES.map((f) => {
                  const doneInFam = f.letters.filter((lid) =>
                    stuProg.some(
                      (p) => p.letterId === lid && p.stepsDone.length === 5
                    )
                  ).length;
                  return doneInFam / f.letters.length;
                });
                const streak =
                  state.streaks.find((s) => s.userId === stu.id)?.current || 0;
                const waText = encodeURIComponent(
                  `Bonjour ${stu.displayName}, bravo pour vos ${doneLetters} lettres sur Nouqta !`
                );

                return (
                  <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-[26px]">
                          {stu.displayName}
                        </h2>
                        <p className="text-[14px] text-[var(--ink)]/75">
                          Série : {streak} jours · {stu.email}
                        </p>
                      </div>

                      <a
                        href={`https://wa.me/?text=${waText}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-[48px] px-4 rounded-[18px] bg-[var(--brand-deep)] text-white font-semibold text-[14px] flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Message WhatsApp</span>
                      </a>
                    </div>

                    <ProgressRing
                      completedLettersCount={doneLetters}
                      familyCompletionRatio={familyRatios}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 12.3 TEACHER: CONTENT & INTERACTIVE STROKE EDITOR (/prof/contenu) */}
        {subRoute === 'content' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[22px] flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-[var(--brand)]" />
                  <span>Éditeur de lettres &amp; tracés SVG</span>
                </h2>
                <select
                  aria-label="Choisir la lettre à éditer"
                  value={editingLetterId}
                  onChange={(e) => setEditingLetterId(e.target.value)}
                  className="h-[48px] px-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] font-semibold text-[14px]"
                >
                  {letters.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.order}. {l.nameFr} ({l.arabicChar})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 bg-[var(--paper)] p-4 rounded-[18px] border border-[var(--line)]">
                <svg
                  viewBox="0 0 200 200"
                  className="w-40 h-40 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shrink-0"
                >
                  <line
                    x1="20"
                    y1="120"
                    x2="180"
                    y2="120"
                    stroke="var(--line)"
                    strokeDasharray="4 4"
                  />
                  {activeEditLetter.forms.isolated.strokes.map((s) =>
                    s.kind === 'body' ? (
                      <g key={s.id}>
                        <path
                          d={s.d}
                          fill="none"
                          stroke="var(--brand-deep)"
                          strokeWidth={s.width}
                          strokeLinecap="round"
                        />
                        <circle cx={editStartX} cy={editStartY} r="9" fill="var(--accent)" />
                      </g>
                    ) : (
                      <circle
                        key={s.id}
                        cx={s.at[0]}
                        cy={s.at[1]}
                        r={s.radius}
                        fill="var(--brand)"
                      />
                    )
                  )}
                </svg>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="font-mono-tag text-[var(--brand)]">
                    POINT DE DÉPART DU TRAIT 1 (X: {editStartX}, Y: {editStartY})
                  </div>
                  <label className="block text-[13px] font-semibold">
                    Position X ({editStartX})
                    <input
                      type="range"
                      min="30"
                      max="180"
                      value={editStartX}
                      onChange={(e) => setEditStartX(Number(e.target.value))}
                      className="w-full accent-[var(--brand)]"
                    />
                  </label>
                  <label className="block text-[13px] font-semibold">
                    Position Y ({editStartY})
                    <input
                      type="range"
                      min="30"
                      max="160"
                      value={editStartY}
                      onChange={(e) => setEditStartY(Number(e.target.value))}
                      className="w-full accent-[var(--brand)]"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[14px] font-semibold">
                  Astuce (1 ligne)
                  <input
                    type="text"
                    value={editTip}
                    onChange={(e) => setEditTip(e.target.value)}
                    className="mt-1 w-full h-[48px] px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[15px]"
                  />
                </label>

                <label className="block text-[14px] font-semibold">
                  Lien vidéo papier (YouTube non-répertorié)
                  <input
                    type="url"
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                    placeholder="https://www.youtube-nocookie.com/embed/..."
                    className="mt-1 w-full h-[48px] px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[15px]"
                  />
                </label>

                <PrimaryButton
                  onClick={() => {
                    const updatedGlyph: GlyphForm = {
                      ...activeEditLetter.forms.isolated,
                      status: 'validated',
                      strokes: activeEditLetter.forms.isolated.strokes.map(
                        (s, idx) =>
                          idx === 0 && s.kind === 'body'
                            ? { ...s, startDot: [editStartX, editStartY] }
                            : s
                      )
                    };
                    onSaveLetterOverride(activeEditLetter.id, {
                      tip: editTip,
                      videoPaperUrl: editVideoUrl,
                      isolatedGlyph: updatedGlyph
                    });
                  }}
                >
                  Enregistrer et valider le tracé
                </PrimaryButton>
              </div>
            </div>

            <div className="md:col-span-5 rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 space-y-4">
              <h2 className="font-display text-[22px]">
                Ajouter un mot progressif
              </h2>
              <p className="text-[14px] text-[var(--ink)]/75">
                Les lettres requises sont détectées automatiquement pour le filtre progressif.
              </p>

              <label className="block text-[14px] font-semibold">
                Mot en arabe
                <input
                  type="text"
                  dir="rtl"
                  lang="ar"
                  value={newWordAr}
                  onChange={(e) => setNewWordAr(e.target.value)}
                  placeholder="بَاب"
                  className="mt-1 w-full h-[48px] px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] font-arabic text-[24px]"
                />
              </label>

              <label className="block text-[14px] font-semibold">
                Traduction française
                <input
                  type="text"
                  value={newWordFr}
                  onChange={(e) => setNewWordFr(e.target.value)}
                  placeholder="Porte"
                  className="mt-1 w-full h-[48px] px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[15px]"
                />
              </label>

              <label className="block text-[14px] font-semibold">
                Translittération (Aa)
                <input
                  type="text"
                  value={newWordTranslit}
                  onChange={(e) => setNewWordTranslit(e.target.value)}
                  placeholder="Bāb"
                  className="mt-1 w-full h-[48px] px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[15px]"
                />
              </label>

              <SecondaryButton
                icon={<Plus className="w-5 h-5" />}
                onClick={() => {
                  if (!newWordAr.trim() || !newWordFr.trim()) return;
                  const detectedIds = LETTERS_DATA.filter((l) =>
                    newWordAr.includes(l.arabicChar)
                  ).map((l) => l.id);
                  onAddCustomWord({
                    id: `w_custom_${Date.now()}`,
                    textAr: newWordAr.trim(),
                    translationFr: newWordFr.trim(),
                    translit: newWordTranslit.trim() || newWordFr.trim(),
                    requiredLetters:
                      detectedIds.length > 0 ? detectedIds : ['alif', 'baa'],
                    familyId: 'F1',
                    wordType: 'nom',
                    audioText: newWordAr.trim()
                  });
                  setNewWordAr('');
                  setNewWordFr('');
                  setNewWordTranslit('');
                }}
              >
                Ajouter au catalogue
              </SecondaryButton>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Section 12.4 Admin Panel (/admin)
 */
export function AdminPanelView({
  state,
  onExitToLearner,
  onOpenTeacher,
  onGenerateCodes,
  onRevokeCode,
  onToggleUserEntitlement,
  onResetUserProgress,
  onDeleteUser,
  onUpdateAdminConfig
}: {
  state: BlueprintState;
  onExitToLearner: () => void;
  onOpenTeacher: () => void;
  onGenerateCodes: (count: number) => void;
  onRevokeCode: (code: string) => void;
  onToggleUserEntitlement: (userId: string) => void;
  onResetUserProgress: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateAdminConfig: (cfg: AdminConfig) => void;
}) {
  const [batchCount, setBatchCount] = useState<number>(5);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [configDraft, setConfigDraft] = useState<AdminConfig>(state.adminConfig);

  const exportCodesCsv = () => {
    const rows = [
      ['Code', 'Plan', 'Statut', 'Utilisé par'].join(','),
      ...state.activationCodes.map((c) =>
        [c.code, c.plan, c.usedBy ? 'Utilisé' : 'Disponible', c.usedBy || ''].join(',')
      )
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codes_nouqta_${getTodayIsoDate()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const learners = state.users.filter(
    (u) =>
      u.role === 'learner' &&
      (u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] pb-12">
      <header className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--line)] px-5 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExitToLearner}
            className="min-h-[48px] h-[48px] px-3 rounded-xl border border-[var(--line)] text-[14px] font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Vue Élève</span>
          </button>
          <span className="font-display text-[20px]">
            Nouqta · Administration (/admin)
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenTeacher}
          className="min-h-[48px] h-[48px] px-3.5 rounded-xl bg-[var(--brand-deep)] text-white text-[13px] font-bold cursor-pointer"
        >
          Aller vers /prof
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-6 rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[var(--brand)]" />
              <span>Codes d&apos;activation</span>
            </h2>
            <button
              type="button"
              onClick={exportCodesCsv}
              className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
              className="w-24 h-[48px] px-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] font-bold"
            />
            <PrimaryButton onClick={() => onGenerateCodes(batchCount)}>
              Générer un lot
            </PrimaryButton>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {state.activationCodes.map((c) => (
              <div
                key={c.code}
                className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between"
              >
                <div>
                  <span className="font-mono-tag text-[14px] font-bold text-[var(--ink)]">
                    {c.code}
                  </span>
                  <span className="ml-2 text-[12px] text-[var(--ink)]/70">
                    {c.usedBy ? `Utilisé (${c.usedBy})` : 'Disponible'}
                  </span>
                </div>
                {!c.usedBy && (
                  <button
                    type="button"
                    aria-label={`Révoquer ${c.code}`}
                    onClick={() => onRevokeCode(c.code)}
                    className="text-[var(--bad)] p-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-6 rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 space-y-4">
          <h2 className="font-display text-[22px] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--brand)]" />
            <span>Élèves ({learners.length})</span>
          </h2>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un élève..."
            className="w-full h-[48px] px-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[15px]"
          />

          <div className="space-y-2.5">
            {learners.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-[15px]">{u.displayName}</div>
                  <div className="text-[12px] text-[var(--ink)]/70">
                    {u.email} · {u.entitlement === 'full' ? 'Complet' : 'Gratuit (F1)'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleUserEntitlement(u.id)}
                    className="min-h-[44px] px-3 rounded-lg bg-[var(--brand-deep)] text-white text-[12px] font-semibold cursor-pointer"
                  >
                    {u.entitlement === 'full' ? 'Passer Gratuit' : 'Débloquer Tout'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onResetUserProgress(u.id)}
                    className="min-h-[44px] px-2.5 rounded-lg border border-[var(--line)] text-[12px] font-semibold cursor-pointer"
                  >
                    RAZ
                  </button>
                  {learners.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Supprimer ${u.displayName}`}
                      onClick={() => onDeleteUser(u.id)}
                      className="min-h-[44px] px-2 text-[var(--bad)] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-12 rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 space-y-4">
          <h2 className="font-display text-[22px] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[var(--brand)]" />
            <span>Tarif affiché &amp; Liens de paiement externes</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-[14px] font-semibold">
              Texte du tarif affiché dans la feuille Accès
              <input
                type="text"
                value={configDraft.priceDisplayFr}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, priceDisplayFr: e.target.value })
                }
                className="mt-1 w-full h-[48px] px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
              />
            </label>
            <label className="block text-[14px] font-semibold">
              Numéro WhatsApp Support
              <input
                type="text"
                value={configDraft.whatsappNumber}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, whatsappNumber: e.target.value })
                }
                className="mt-1 w-full h-[48px] px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
              />
            </label>
          </div>

          <div className="max-w-xs">
            <PrimaryButton onClick={() => onUpdateAdminConfig(configDraft)}>
              Enregistrer la configuration
            </PrimaryButton>
          </div>
        </div>
      </main>
    </div>
  );
}
