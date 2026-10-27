import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  X,
  Mic,
  Award,
  Crown,
  Send,
  Headphones
} from 'lucide-react';
import {
  Lesson,
  LessonSection,
  ExerciseStep,
  ARABIC_ALPHABET
} from '../data/curriculum';
import {
  validateExerciseStep,
  calculateSectionOutcome,
  StudentProfile,
  CalligraphyEvaluationResult
} from '../utils/learningLogic';
import { audioEngine } from '../utils/audioEngine';
import {
  ColoredArabic,
  AudioWaveform,
  decomposeArabicIntoSyllables
} from './ColoredArabic';
import { CalligraphyCanvas } from './CalligraphyCanvas';

interface InteractiveLessonPlayerProps {
  lesson: Lesson;
  section: LessonSection;
  student: StudentProfile;
  onClose: () => void;
  onCompleteSection: (
    lessonId: string,
    sectionId: string,
    accuracy: number,
    honeyEarned: number,
    durationFormatted: string,
    masteredLetters: string[]
  ) => void;
  onSubmitToTeacher: (payload: {
    lessonId: string;
    lessonTitle: string;
    type: 'exercise' | 'question' | 'pronunciation';
    promptTitle: string;
    arabicTarget?: string;
    studentResponseText: string;
    hasAudioRecording: boolean;
    audioDurationSec?: number;
    audioDataUrl?: string;
  }) => void;
  onOpenPremiumModal: () => void;
}

export const InteractiveLessonPlayer: React.FC<InteractiveLessonPlayerProps> = ({
  lesson,
  section,
  student,
  onClose,
  onCompleteSection,
  onSubmitToTeacher,
  onOpenPremiumModal
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [booleanChoice, setBooleanChoice] = useState<boolean | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [selectedMultiIds, setSelectedMultiIds] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [activeLeftPairId, setActiveLeftPairId] = useState<string | null>(null);
  const [calligraphyEval, setCalligraphyEval] = useState<
    CalligraphyEvaluationResult | undefined
  >(undefined);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [shakeWrong, setShakeWrong] = useState<boolean>(false);

  const [checkedState, setCheckedState] = useState<{
    checked: boolean;
    isCorrect: boolean;
    message: string;
  }>({ checked: false, isCorrect: false, message: '' });

  const [correctStepsCount, setCorrectStepsCount] = useState<number>(0);
  const [startTime] = useState<number>(() => Date.now());
  const [completionSummary, setCompletionSummary] = useState<{
    accuracy: number;
    honeyEarned: number;
    durationFormatted: string;
    passed: boolean;
  } | null>(null);

  const [showCoachDrawer, setShowCoachDrawer] = useState(false);
  const [coachNoteText, setCoachNoteText] = useState('');
  const [recordedAudioSec, setRecordedAudioSec] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | undefined>(undefined);
  const [isRecordingSim, setIsRecordingSim] = useState<boolean>(false);
  const [isComparingAudio, setIsComparingAudio] = useState<boolean>(false);
  const [coachSentToast, setCoachSentToast] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const steps = section.steps;
  const currentStep: ExerciseStep | undefined = steps[stepIndex];
  const progressPercent = Math.round(
    ((stepIndex + (checkedState.checked ? 1 : 0)) / steps.length) * 100
  );

  const playArabicSound = (text: string) => {
    setIsSpeaking(true);
    audioEngine.speakArabic(text, {
      rate: 0.85,
      onEnd: () => setIsSpeaking(false)
    });
  };

  useEffect(() => {
    setBooleanChoice(undefined);
    setSelectedId(undefined);
    setSelectedMultiIds([]);
    setMatchedPairs({});
    setActiveLeftPairId(null);
    setCalligraphyEval(undefined);
    setCheckedState({ checked: false, isCorrect: false, message: '' });
    setShakeWrong(false);

    if (currentStep) {
      const targetAudio =
        currentStep.audioText ||
        currentStep.targetAudio ||
        currentStep.booleanPromptAudio ||
        currentStep.letterArabic ||
        currentStep.targetArabic;
      if (targetAudio) {
        const timer = setTimeout(() => {
          playArabicSound(targetAudio);
        }, 220);
        return () => clearTimeout(timer);
      }
    }
  }, [stepIndex, currentStep?.id]);

  const toggleMultiSelect = (id: string, arabicText?: string) => {
    if (checkedState.checked) return;
    if (arabicText) {
      playArabicSound(arabicText);
    }
    setSelectedMultiIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePairLeftClick = (leftId: string, arabicText: string) => {
    if (checkedState.checked) return;
    playArabicSound(arabicText);
    setActiveLeftPairId(leftId);
  };

  const handlePairRightClick = (rightArabic: string) => {
    if (checkedState.checked) return;
    playArabicSound(rightArabic);
    if (!activeLeftPairId) return;
    setMatchedPairs(prev => ({
      ...prev,
      [activeLeftPairId]: rightArabic
    }));
    setActiveLeftPairId(null);
  };

  const handleCheckStep = () => {
    if (!currentStep) return;

    const result = validateExerciseStep(currentStep, {
      booleanChoice,
      selectedId,
      selectedMultiIds,
      matchedPairs,
      tracedCoverage: calligraphyEval?.overallScore ?? 0,
      calligraphyEvaluation: calligraphyEval
    });

    audioEngine.playFeedbackChime(result.isCorrect);
    if (!result.isCorrect) {
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 500);
    }
    setCheckedState({
      checked: true,
      isCorrect: result.isCorrect,
      message: result.feedbackMessage
    });

    if (result.isCorrect) {
      setCorrectStepsCount(prev => prev + 1);
    }
  };

  const handleRetryCurrentStep = () => {
    setCheckedState({ checked: false, isCorrect: false, message: '' });
  };

  const handleNextStep = () => {
    if (stepIndex + 1 < steps.length) {
      setStepIndex(prev => prev + 1);
    } else {
      const elapsedSeconds = Math.max(12, Math.round((Date.now() - startTime) / 1000));
      const outcome = calculateSectionOutcome(
        correctStepsCount,
        steps.length,
        elapsedSeconds
      );
      audioEngine.playFeedbackChime(true);
      setCompletionSummary(outcome);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCoachDrawer || completionSummary || !currentStep) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.code === 'Space') {
        e.preventDefault();
        const targetAudio =
          currentStep.audioText ||
          currentStep.targetAudio ||
          currentStep.booleanPromptAudio ||
          currentStep.letterArabic ||
          currentStep.targetArabic;
        if (targetAudio) playArabicSound(targetAudio);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (checkedState.checked) {
          handleNextStep();
        } else {
          handleCheckStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Microphone recording with fallback
  const handleStartStopVoiceRecord = async () => {
    if (isRecordingSim) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingSim(false);
      setRecordedAudioSec(prev => Math.max(3, prev));
      return;
    }

    setRecordedAudioSec(0);
    setRecordedAudioUrl(undefined);
    setIsRecordingSim(true);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = event => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedAudioUrl(url);
          stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
      }
    } catch {
      // Simulated fallback
    }
  };

  useEffect(() => {
    if (!isRecordingSim) return;
    const interval = setInterval(() => {
      setRecordedAudioSec(prev => {
        if (prev >= 8) {
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== 'inactive'
          ) {
            mediaRecorderRef.current.stop();
          }
          setIsRecordingSim(false);
          return 8;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecordingSim]);

  const handleCompareVoice = () => {
    if (!currentStep) return;
    const target =
      currentStep.audioText ||
      currentStep.targetAudio ||
      currentStep.letterArabic ||
      currentStep.targetArabic ||
      'بَ';
    setIsComparingAudio(true);
    audioEngine.speakArabic(target, {
      rate: 0.82,
      onEnd: () => {
        if (recordedAudioUrl) {
          const audio = new Audio(recordedAudioUrl);
          audio.onended = () => setIsComparingAudio(false);
          audio.onerror = () => setIsComparingAudio(false);
          audio.play().catch(() => setIsComparingAudio(false));
        } else {
          setTimeout(() => {
            audioEngine.playFeedbackChime(true);
            setIsComparingAudio(false);
          }, 450);
        }
      }
    });
  };

  const handleSendToCoach = () => {
    if (!currentStep) return;
    if (!student.isPremium) {
      onOpenPremiumModal();
      return;
    }
    const text =
      coachNoteText.trim() ||
      `Exercice « ${currentStep.titleFr} » (${
        currentStep.letterArabic || currentStep.targetArabic || ''
      }).`;
    onSubmitToTeacher({
      lessonId: lesson.id,
      lessonTitle: `${lesson.titleFr} · ${section.titleFr}`,
      type: recordedAudioSec > 0 ? 'pronunciation' : 'exercise',
      promptTitle: currentStep.titleFr,
      arabicTarget:
        currentStep.letterArabic ||
        currentStep.targetArabic ||
        currentStep.booleanDisplayedArabic,
      studentResponseText: text,
      hasAudioRecording: recordedAudioSec > 0,
      audioDurationSec: recordedAudioSec > 0 ? recordedAudioSec : undefined,
      audioDataUrl: recordedAudioUrl
    });
    setCoachNoteText('');
    setRecordedAudioSec(0);
    setCoachSentToast(true);
    setTimeout(() => {
      setCoachSentToast(false);
      setShowCoachDrawer(false);
    }, 1200);
  };

  if (completionSummary) {
    const masteredLetters = steps
      .map(s => {
        const found = ARABIC_ALPHABET.find(l => l.arabic === s.letterArabic);
        return found?.id;
      })
      .filter((id): id is string => Boolean(id));

    return (
      <div className="fixed inset-0 z-50 bg-[#FAF6EE]/95 dark:bg-[#0B1120]/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#131B2E] rounded-3xl border border-[#E2D9C5] dark:border-[#2A3654] shadow-2xl p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 mx-auto flex items-center justify-center mb-4">
            <Award className="w-8 h-8 text-[#C87D20]" />
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#131B2E] dark:text-[#F8FAFC] mb-1">
            Étape validée !
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6478] dark:text-[#9AA6B8] mb-6">
            {section.titleFr}
          </p>

          <div className="grid grid-cols-3 gap-2.5 mb-6 font-mono tabular-nums">
            <div className="bg-[#FAF6EE] dark:bg-[#0B1120] rounded-2xl p-3 border border-[#E2D9C5] dark:border-[#2A3654]">
              <div className="text-lg font-bold text-[#C87D20]">
                +{completionSummary.honeyEarned}
              </div>
              <div className="text-[11px] font-sans text-[#5A6478] dark:text-[#9AA6B8]">
                Points
              </div>
            </div>
            <div className="bg-[#FAF6EE] dark:bg-[#0B1120] rounded-2xl p-3 border border-[#E2D9C5] dark:border-[#2A3654]">
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {completionSummary.accuracy}%
              </div>
              <div className="text-[11px] font-sans text-[#5A6478] dark:text-[#9AA6B8]">
                Précision
              </div>
            </div>
            <div className="bg-[#FAF6EE] dark:bg-[#0B1120] rounded-2xl p-3 border border-[#E2D9C5] dark:border-[#2A3654]">
              <div className="text-lg font-bold text-[#131B2E] dark:text-white">
                {completionSummary.durationFormatted}
              </div>
              <div className="text-[11px] font-sans text-[#5A6478] dark:text-[#9AA6B8]">
                Temps
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onCompleteSection(
                lesson.id,
                section.id,
                completionSummary.accuracy,
                completionSummary.honeyEarned,
                completionSummary.durationFormatted,
                masteredLetters
              )
            }
            className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-[#131B2E] hover:bg-[#1E293B] dark:bg-[#C87D20] dark:hover:bg-amber-600 text-white font-semibold text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continuer</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (!currentStep) return null;

  const letterInfo = ARABIC_ALPHABET.find(
    l => l.arabic === currentStep.letterArabic
  );

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] bg-[#FAF6EE] dark:bg-[#0B1120] flex flex-col justify-between overflow-hidden">
      {/* Compact 52px Top Bar (Mobile-First 15% Sticky Cap) */}
      <header className="bg-white dark:bg-[#131B2E] border-b border-[#E2D9C5] dark:border-[#2A3654] px-3 sm:px-5 h-14 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Quitter la leçon"
          className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[#FAF6EE] dark:hover:bg-[#1E293B] flex items-center justify-center text-[#5A6478] dark:text-[#9AA6B8] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 max-w-md flex items-center gap-3">
          <div className="flex-1 h-2 bg-[#E2D9C5] dark:bg-[#2A3654] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#059669] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono tabular-nums text-xs font-semibold text-[#5A6478] dark:text-[#9AA6B8]">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowCoachDrawer(v => !v)}
          className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-[#E2D9C5] dark:border-[#2A3654] bg-[#FAF6EE] dark:bg-[#182238] text-[#131B2E] dark:text-amber-300 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Mic className="w-3.5 h-3.5 text-[#C87D20]" />
          <span>Coach</span>
        </button>
      </header>

      {/* Main Scrollable Stage — Fitted for Mobile Viewports */}
      <div
        className={`flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-5 flex flex-col items-center justify-center max-w-xl mx-auto w-full ${
          shakeWrong ? 'animate-shake' : ''
        }`}
      >
        <div className="w-full text-center mb-3">
          <h1 className="font-display text-lg sm:text-2xl font-bold text-[#131B2E] dark:text-[#F8FAFC] leading-snug">
            {currentStep.titleFr}
          </h1>
          {currentStep.instructionFr && (
            <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8] mt-0.5">
              {currentStep.instructionFr}
            </p>
          )}
        </div>

        <div className="w-full flex flex-col items-center justify-center">
          {/* 1. LEARN LETTER or DISTINGUISH */}
          {(currentStep.type === 'learn-letter' ||
            currentStep.type === 'distinguish') && (
            <div className="w-full max-w-md bg-white dark:bg-[#131B2E] rounded-3xl border border-[#E2D9C5] dark:border-[#2A3654] p-4 sm:p-6 flex flex-col items-center text-center gap-3.5">
              {currentStep.distinguishCards ? (
                <div className="grid grid-cols-3 gap-2.5 w-full">
                  {currentStep.distinguishCards.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => playArabicSound(c.arabic)}
                      className="p-3 sm:p-4 rounded-2xl bg-[#FAF6EE] dark:bg-[#0B1120] border border-[#E2D9C5] dark:border-[#2A3654] hover:border-[#C87D20] flex flex-col items-center gap-1.5 cursor-pointer"
                    >
                      <span
                        dir="rtl"
                        lang="ar"
                        className="font-arabic text-4xl sm:text-5xl text-[#131B2E] dark:text-[#F8FAFC]"
                      >
                        <ColoredArabic text={c.arabic} />
                      </span>
                      <span className="text-[11px] font-semibold text-[#5A6478] dark:text-[#9AA6B8]">
                        {c.ruleFr}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      playArabicSound(
                        currentStep.audioText || currentStep.letterArabic || 'ب'
                      )
                    }
                    aria-label="Écouter la lettre"
                    className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-[#FAF6EE] dark:bg-[#0B1120] border-2 border-[#E2D9C5] dark:border-[#2A3654] hover:border-[#C87D20] flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    <span
                      dir="rtl"
                      lang="ar"
                      className="font-arabic text-5xl sm:text-6xl text-[#131B2E] dark:text-[#F8FAFC] select-none leading-none px-2"
                    >
                      <ColoredArabic text={currentStep.letterArabic || ''} />
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C87D20]">
                      <Volume2 className="w-4 h-4" />
                      <span>Écouter</span>
                      <AudioWaveform active={isSpeaking} />
                    </span>
                  </button>

                  {/* 4 positional forms for alphabet letters */}
                  {letterInfo && (
                    <div dir="rtl" className="grid grid-cols-4 gap-2 w-full">
                      {[
                        { label: 'Isolée', form: letterInfo.forms.isolated },
                        { label: 'Début', form: letterInfo.forms.initial },
                        { label: 'Milieu', form: letterInfo.forms.medial },
                        { label: 'Fin', form: letterInfo.forms.final }
                      ].map(pos => (
                        <button
                          key={pos.label}
                          type="button"
                          onClick={() => playArabicSound(letterInfo.arabic)}
                          className="p-2 rounded-xl bg-[#FAF6EE] dark:bg-[#0B1120] border border-[#E2D9C5] dark:border-[#2A3654] hover:border-[#C87D20] cursor-pointer"
                        >
                          <div
                            lang="ar"
                            className="font-arabic text-2xl text-[#131B2E] dark:text-[#F8FAFC]"
                          >
                            {pos.form}
                          </div>
                          <div
                            dir="ltr"
                            className="text-[10px] text-[#5A6478] dark:text-[#9AA6B8]"
                          >
                            {pos.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Syllable Harakât pills for vocalized words */}
                  {!letterInfo && currentStep.letterArabic && (
                    <div
                      dir="rtl"
                      className="flex flex-wrap items-center justify-center gap-2"
                    >
                      {decomposeArabicIntoSyllables(currentStep.letterArabic).map(
                        (syl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => playArabicSound(syl.grapheme)}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#FAF6EE] dark:bg-[#0B1120] border border-[#E2D9C5] dark:border-[#2A3654] flex items-center gap-2 cursor-pointer"
                          >
                            <span
                              lang="ar"
                              className="font-arabic text-2xl text-[#131B2E] dark:text-[#F8FAFC]"
                            >
                              {syl.grapheme}
                            </span>
                            <span
                              dir="ltr"
                              className={`text-[10px] font-bold ${syl.colorClass}`}
                            >
                              {syl.vowelNameFr}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </>
              )}

              {currentStep.phoneticExplanationFr && (
                <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8] leading-relaxed">
                  {currentStep.phoneticExplanationFr}
                </p>
              )}
            </div>
          )}

          {/* 2. WRITE LETTER (Real Pixel-Mask Calligraphic Canvas) */}
          {currentStep.type === 'write-letter' && (
            <CalligraphyCanvas
              targetArabic={currentStep.letterArabic || 'ب'}
              compact
              onEvaluationChange={setCalligraphyEval}
            />
          )}

          {/* 3. LISTEN BOOLEAN */}
          {currentStep.type === 'listen-boolean' && (
            <div className="w-full max-w-sm flex flex-col items-center gap-4">
              <div className="w-40 h-40 bg-white dark:bg-[#131B2E] rounded-3xl border border-[#E2D9C5] dark:border-[#2A3654] flex flex-col items-center justify-center">
                <span
                  dir="rtl"
                  lang="ar"
                  className="font-arabic text-6xl text-[#131B2E] dark:text-[#F8FAFC] select-none"
                >
                  <ColoredArabic
                    text={
                      currentStep.booleanDisplayedArabic ||
                      currentStep.letterArabic ||
                      ''
                    }
                  />
                </span>
                <button
                  type="button"
                  onClick={() =>
                    playArabicSound(
                      currentStep.booleanPromptAudio ||
                        currentStep.booleanDisplayedArabic ||
                        ''
                    )
                  }
                  className="mt-3 min-h-[40px] px-4 py-1.5 rounded-xl bg-[#131B2E] dark:bg-[#C87D20] text-white flex items-center gap-2 text-xs font-semibold cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Écouter</span>
                  <AudioWaveform active={isSpeaking} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={() => !checkedState.checked && setBooleanChoice(false)}
                  className={`min-h-[52px] py-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
                    booleanChoice === false
                      ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                      : 'border-[#E2D9C5] dark:border-[#2A3654] bg-white dark:bg-[#131B2E] text-[#131B2E] dark:text-[#F8FAFC]'
                  }`}
                >
                  <XCircle className="w-5 h-5 text-rose-500" />
                  <span>Faux</span>
                </button>

                <button
                  type="button"
                  onClick={() => !checkedState.checked && setBooleanChoice(true)}
                  className={`min-h-[52px] py-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer ${
                    booleanChoice === true
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'border-[#E2D9C5] dark:border-[#2A3654] bg-white dark:bg-[#131B2E] text-[#131B2E] dark:text-[#F8FAFC]'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Vrai</span>
                </button>
              </div>
            </div>
          )}

          {/* 4A. CHOOSE SOUND */}
          {currentStep.type === 'choose-sound' && currentStep.soundOptions && (
            <div className="w-full max-w-md flex flex-col items-center gap-4">
              {currentStep.targetArabic && (
                <div className="w-28 h-28 rounded-3xl bg-white dark:bg-[#131B2E] border border-[#E2D9C5] dark:border-[#2A3654] flex items-center justify-center">
                  <span
                    dir="rtl"
                    lang="ar"
                    className="font-arabic text-5xl text-[#131B2E] dark:text-[#F8FAFC]"
                  >
                    <ColoredArabic text={currentStep.targetArabic} />
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 w-full">
                {currentStep.soundOptions.map((opt, idx) => {
                  const isSelected = selectedId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (checkedState.checked) return;
                        setSelectedId(opt.id);
                        playArabicSound(opt.audioText);
                      }}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[92px] relative ${
                        isSelected
                          ? 'border-[#C87D20] bg-amber-50/70 dark:bg-amber-950/30'
                          : 'border-[#E2D9C5] dark:border-[#2A3654] bg-white dark:bg-[#131B2E]'
                      }`}
                    >
                      <span className="absolute top-2 left-2.5 font-mono text-[10px] text-[#5A6478]">
                        {idx + 1}
                      </span>
                      <Volume2 className="w-5 h-5 text-[#C87D20]" />
                      <span className="font-mono text-xs font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                        {opt.labelPhonetic}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4B. LISTEN DIACRITIC */}
          {currentStep.type === 'listen-diacritic' &&
            currentStep.diacriticOptions && (
              <div className="w-full max-w-md flex flex-col items-center gap-4">
                {currentStep.targetAudio && (
                  <button
                    type="button"
                    onClick={() => playArabicSound(currentStep.targetAudio!)}
                    aria-label="Écouter le son cible"
                    className="w-16 h-16 rounded-2xl bg-[#131B2E] dark:bg-[#C87D20] text-white shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-6 h-6" />
                    <AudioWaveform active={isSpeaking} />
                  </button>
                )}

                <div className="grid grid-cols-3 gap-2.5 w-full">
                  {currentStep.diacriticOptions.map(opt => {
                    const isSelected = selectedId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          !checkedState.checked && setSelectedId(opt.id)
                        }
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer min-h-[104px] ${
                          isSelected
                            ? 'border-[#C87D20] bg-amber-50/70 dark:bg-amber-950/30'
                            : 'border-[#E2D9C5] dark:border-[#2A3654] bg-white dark:bg-[#131B2E]'
                        }`}
                      >
                        <span
                          dir="rtl"
                          lang="ar"
                          className="font-arabic text-4xl text-[#C87D20]"
                        >
                          {opt.symbol}
                        </span>
                        <span className="text-xs font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                          {opt.nameFr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* 4C. MULTIPLE CHOICE */}
          {currentStep.type === 'multiple-choice' && currentStep.mcOptions && (
            <div className="w-full max-w-md flex flex-col items-center gap-3.5">
              {currentStep.questionFr && (
                <p className="text-xs sm:text-sm font-semibold text-[#131B2E] dark:text-[#F8FAFC] text-center">
                  {currentStep.questionFr}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                {currentStep.mcOptions.map(opt => {
                  const isSelected = selectedId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (checkedState.checked) return;
                        setSelectedId(opt.id);
                        if (opt.arabic) playArabicSound(opt.arabic);
                      }}
                      className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[84px] ${
                        isSelected
                          ? 'border-[#C87D20] bg-amber-50/70 dark:bg-amber-950/30'
                          : 'border-[#E2D9C5] dark:border-[#2A3654] bg-white dark:bg-[#131B2E]'
                      }`}
                    >
                      {opt.arabic && (
                        <span
                          dir="rtl"
                          lang="ar"
                          className="font-arabic text-3xl text-[#131B2E] dark:text-[#F8FAFC]"
                        >
                          <ColoredArabic text={opt.arabic} />
                        </span>
                      )}
                      <span className="text-xs font-semibold text-[#131B2E] dark:text-[#F8FAFC] text-center">
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. MULTI-SELECT DIACRITIC */}
          {currentStep.type === 'multi-select-diacritic' &&
            currentStep.tileOptions && (
              <div className="w-full max-w-md">
                <div className="grid grid-cols-3 gap-2.5">
                  {currentStep.tileOptions.map(opt => {
                    const isSelected = selectedMultiIds.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleMultiSelect(opt.id, opt.audioText)}
                        className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[92px] ${
                          isSelected
                            ? 'border-[#131B2E] dark:border-[#C87D20] bg-[#131B2E] text-white'
                            : 'border-[#E2D9C5] dark:border-[#2A3654] bg-white dark:bg-[#131B2E] text-[#131B2E] dark:text-[#F8FAFC]'
                        }`}
                      >
                        <span
                          dir="rtl"
                          lang="ar"
                          className="font-arabic text-4xl leading-none"
                        >
                          <ColoredArabic text={opt.arabic} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* 6. MATCH PAIRS */}
          {currentStep.type === 'match-pairs' && currentStep.pairs && (
            <div className="w-full max-w-md grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                {currentStep.pairs.map(pair => {
                  const isMatched = Boolean(matchedPairs[pair.id]);
                  const isActive = activeLeftPairId === pair.id;
                  return (
                    <button
                      key={pair.id}
                      type="button"
                      onClick={() => handlePairLeftClick(pair.id, pair.leftAudio)}
                      className={`min-h-[52px] p-3 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#C87D20] bg-amber-50 dark:bg-amber-950/40'
                          : isMatched
                          ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30'
                          : 'border-[#E2D9C5] dark:border-[#2A3654] bg-white dark:bg-[#131B2E]'
                      }`}
                    >
                      <Volume2 className="w-4 h-4 text-[#C87D20] shrink-0" />
                      <span className="text-xs font-bold text-[#131B2E] dark:text-[#F8FAFC] text-right">
                        {pair.leftLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2">
                {[...currentStep.pairs].reverse().map(pair => {
                  const isUsed = Object.values(matchedPairs).includes(
                    pair.rightArabic
                  );
                  return (
                    <button
                      key={pair.id + '-r'}
                      type="button"
                      onClick={() => handlePairRightClick(pair.rightArabic)}
                      className={`min-h-[52px] p-3 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                        isUsed
                          ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30'
                          : 'border-[#E2D9C5] dark:border-[#2A3654] bg-white dark:bg-[#131B2E] hover:border-[#C87D20]'
                      }`}
                    >
                      <span
                        dir="rtl"
                        lang="ar"
                        className="font-arabic text-3xl text-[#131B2E] dark:text-[#F8FAFC]"
                      >
                        <ColoredArabic text={pair.rightArabic} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Coach Vocal Bottom Drawer */}
        {showCoachDrawer && (
          <div className="w-full max-w-md bg-white dark:bg-[#131B2E] rounded-2xl border border-[#E2D9C5] dark:border-[#2A3654] p-3.5 mt-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#131B2E] dark:text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-[#C87D20]" />
                Studio Prononciation & Professeur
              </span>
              <button
                type="button"
                onClick={() => setShowCoachDrawer(false)}
                className="text-xs text-[#5A6478] dark:text-[#9AA6B8] cursor-pointer"
              >
                Fermer
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleStartStopVoiceRecord}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
                  isRecordingSim
                    ? 'bg-rose-600 text-white border-rose-600'
                    : recordedAudioSec > 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                    : 'bg-[#FAF6EE] dark:bg-[#0B1120] text-[#131B2E] dark:text-[#F8FAFC] border-[#E2D9C5] dark:border-[#2A3654]'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>
                  {isRecordingSim
                    ? `Stop (${recordedAudioSec}s)`
                    : recordedAudioSec > 0
                    ? `Audio (${recordedAudioSec}s)`
                    : 'Enregistrer'}
                </span>
              </button>

              {recordedAudioSec > 0 && (
                <button
                  type="button"
                  onClick={handleCompareVoice}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 cursor-pointer"
                >
                  <Headphones className="w-3.5 h-3.5 text-[#C87D20]" />
                  <span>{isComparingAudio ? 'Lecture...' : 'Comparer'}</span>
                </button>
              )}

              <input
                type="text"
                value={coachNoteText}
                onChange={e => setCoachNoteText(e.target.value)}
                placeholder="Question au prof..."
                className="flex-1 min-w-[120px] rounded-xl border border-[#E2D9C5] dark:border-[#2A3654] bg-[#FAF6EE] dark:bg-[#0B1120] px-3 py-1.5 text-xs text-[#131B2E] dark:text-[#F8FAFC]"
              />
              <button
                type="button"
                onClick={handleSendToCoach}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#131B2E] dark:bg-[#C87D20] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer</span>
              </button>
            </div>
            {coachSentToast && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1.5">
                Envoyé à votre professeur !
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pinned Bottom Action Bar — Always visible on Mobile (min-h-[48px] CTA) */}
      <footer
        className={`border-t px-4 py-3 transition-colors shrink-0 ${
          checkedState.checked
            ? checkedState.isCorrect
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
            : 'bg-white dark:bg-[#131B2E] border-[#E2D9C5] dark:border-[#2A3654]'
        }`}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {checkedState.checked ? (
            <div className="flex items-center gap-2 min-w-0">
              {checkedState.isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span
                className={`text-xs sm:text-sm font-bold line-clamp-2 ${
                  checkedState.isCorrect
                    ? 'text-emerald-900 dark:text-emerald-300'
                    : 'text-rose-900 dark:text-rose-300'
                }`}
              >
                {checkedState.message}
              </span>
            </div>
          ) : (
            <div className="text-xs text-[#5A6478] dark:text-[#9AA6B8]">
              {currentStep.type === 'learn-letter' ||
              currentStep.type === 'distinguish'
                ? 'Écoutez la prononciation puis continuez'
                : currentStep.type === 'write-letter'
                ? 'Tracez fidèlement sur le modèle puis vérifiez'
                : 'Sélectionnez votre réponse'}
            </div>
          )}

          {!checkedState.checked ? (
            <button
              type="button"
              onClick={handleCheckStep}
              className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#131B2E] hover:bg-[#1E293B] dark:bg-[#C87D20] dark:hover:bg-amber-600 text-white font-semibold text-sm transition-all cursor-pointer ml-auto whitespace-nowrap shrink-0"
            >
              {currentStep.type === 'learn-letter' ||
              currentStep.type === 'distinguish'
                ? 'Continuer'
                : 'Vérifier'}
            </button>
          ) : (
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {!checkedState.isCorrect && currentStep.type === 'write-letter' && (
                <button
                  type="button"
                  onClick={handleRetryCurrentStep}
                  className="min-h-[48px] px-4 py-3 rounded-2xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-[#131B2E] text-rose-700 dark:text-rose-300 font-semibold text-xs cursor-pointer whitespace-nowrap"
                >
                  Réessayer
                </button>
              )}
              <button
                type="button"
                onClick={handleNextStep}
                className={`min-h-[48px] px-6 py-3 rounded-2xl font-semibold text-sm text-white transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  checkedState.isCorrect
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#131B2E] hover:bg-[#1E293B]'
                }`}
              >
                <span>Suivant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
