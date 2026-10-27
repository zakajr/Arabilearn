import React, { useState, useEffect } from 'react';
import {
  Volume2,
  RotateCw,
  CheckCircle2,
  X,
  Timer,
  Puzzle,
  RotateCcw,
  Eye,
  PenTool,
  ArrowRight
} from 'lucide-react';
import { ARABIC_ALPHABET, ArabicLetterItem } from '../data/curriculum';
import { audioEngine } from '../utils/audioEngine';
import { ColoredArabic, AudioWaveform } from './ColoredArabic';
import { CalligraphyCanvas } from './CalligraphyCanvas';
import {
  WORD_BUILDER_PUZZLES,
  HARAKAT_GUIDE_ITEMS,
  validateWordBuilderAttempt,
  CalligraphyEvaluationResult
} from '../utils/learningLogic';

interface AlphabetLabViewProps {
  masteredLetterIds: string[];
  onMasterLetter: (letterId: string) => void;
}

type LabMode =
  | 'grid'
  | 'calligraphy'
  | 'harakat'
  | 'word-builder'
  | 'sprint'
  | 'flashcards';

const DEMO_CONSONANTS = [
  { char: 'ب', nameFr: 'Baa', baseSound: 'b' },
  { char: 'ت', nameFr: 'Taa', baseSound: 't' },
  { char: 'ث', nameFr: 'Thaa', baseSound: 'th' },
  { char: 'ج', nameFr: 'Jiim', baseSound: 'dj' },
  { char: 'د', nameFr: 'Daal', baseSound: 'd' },
  { char: 'ر', nameFr: 'Raa', baseSound: 'r' },
  { char: 'س', nameFr: 'Siin', baseSound: 's' },
  { char: 'م', nameFr: 'Miim', baseSound: 'm' }
];

const CALLIGRAPHY_WORDS = [
  { arabic: 'بَاب', meaningFr: 'Porte', translit: 'Bâb' },
  { arabic: 'بَيْت', meaningFr: 'Maison', translit: 'Bayt' },
  { arabic: 'بَدر', meaningFr: 'Pleine lune', translit: 'Badr' },
  { arabic: 'سَلَام', meaningFr: 'Paix', translit: 'Salâm' },
  { arabic: 'كِتَاب', meaningFr: 'Livre', translit: 'Kitâb' }
];

export const AlphabetLabView: React.FC<AlphabetLabViewProps> = ({
  masteredLetterIds,
  onMasterLetter
}) => {
  const [labMode, setLabMode] = useState<LabMode>('grid');
  const [selectedLetter, setSelectedLetter] = useState<ArabicLetterItem | null>(
    null
  );
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Full 28-Letter & Word Calligraphy Studio state
  const [calligraphyMode, setCalligraphyMode] = useState<'letters' | 'words'>(
    'letters'
  );
  const [calligraphyLetter, setCalligraphyLetter] = useState<ArabicLetterItem>(
    ARABIC_ALPHABET[1]
  );
  const [calligraphyFormKey, setCalligraphyFormKey] = useState<
    'isolated' | 'initial' | 'medial' | 'final'
  >('isolated');
  const [calligraphyWordIdx, setCalligraphyWordIdx] = useState<number>(0);
  const [calligraphyEval, setCalligraphyEval] =
    useState<CalligraphyEvaluationResult | null>(null);

  // Harakât Simulator state for complete beginners
  const [selectedConsonant, setSelectedConsonant] = useState(DEMO_CONSONANTS[0]);
  const [selectedHarakatId, setSelectedHarakatId] = useState<string>(
    HARAKAT_GUIDE_ITEMS[0].id
  );

  // Flashcards state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Word Builder ("Atelier Liaison des Mots") state
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [chosenLetters, setChosenLetters] = useState<string[]>([]);
  const [wordBuilderSuccess, setWordBuilderSuccess] = useState<boolean | null>(
    null
  );

  // 60-Second Rapid Audio Sprint ("Défi 60s") state
  const [sprintRunning, setSprintRunning] = useState(false);
  const [sprintTimeLeft, setSprintTimeLeft] = useState(60);
  const [sprintScore, setSprintScore] = useState(0);
  const [sprintTarget, setSprintTarget] = useState<ArabicLetterItem>(
    ARABIC_ALPHABET[1]
  );
  const [sprintOptions, setSprintOptions] = useState<ArabicLetterItem[]>([
    ARABIC_ALPHABET[1],
    ARABIC_ALPHABET[2]
  ]);

  const currentFlashcard =
    ARABIC_ALPHABET[flashcardIndex % ARABIC_ALPHABET.length];
  const currentPuzzle =
    WORD_BUILDER_PUZZLES[puzzleIdx % WORD_BUILDER_PUZZLES.length];
  const poolLetters = [
    ...currentPuzzle.targetLetters,
    ...currentPuzzle.distractorLetters
  ];
  const activeHarakat =
    HARAKAT_GUIDE_ITEMS.find(h => h.id === selectedHarakatId) ||
    HARAKAT_GUIDE_ITEMS[0];

  const speakArabic = (text: string) => {
    setIsSpeaking(true);
    audioEngine.speakArabic(text, {
      rate: 0.85,
      onEnd: () => setIsSpeaking(false)
    });
  };

  const openLetterInCalligraphyStudio = (letter: ArabicLetterItem) => {
    setSelectedLetter(null);
    setCalligraphyMode('letters');
    setCalligraphyLetter(letter);
    setCalligraphyFormKey('isolated');
    setLabMode('calligraphy');
    speakArabic(letter.arabic);
  };

  // Word Builder handlers
  const handlePickWordLetter = (letter: string) => {
    speakArabic(letter);
    if (chosenLetters.length >= currentPuzzle.targetLetters.length) return;
    const updated = [...chosenLetters, letter];
    setChosenLetters(updated);

    if (updated.length === currentPuzzle.targetLetters.length) {
      const ok = validateWordBuilderAttempt(currentPuzzle, updated);
      setWordBuilderSuccess(ok);
      audioEngine.playFeedbackChime(ok);
      if (ok) {
        setTimeout(() => speakArabic(currentPuzzle.wordArabic), 260);
      }
    }
  };

  const handleRevealWordAssembly = () => {
    setChosenLetters([...currentPuzzle.targetLetters]);
    setWordBuilderSuccess(true);
    speakArabic(currentPuzzle.wordArabic);
  };

  const resetWordBuilder = (nextPuzzle = false) => {
    setChosenLetters([]);
    setWordBuilderSuccess(null);
    if (nextPuzzle) {
      setPuzzleIdx(prev => (prev + 1) % WORD_BUILDER_PUZZLES.length);
    }
  };

  // 60s Sprint logic
  const generateSprintQuestion = () => {
    const target =
      ARABIC_ALPHABET[Math.floor(Math.random() * ARABIC_ALPHABET.length)];
    let distractor =
      ARABIC_ALPHABET[Math.floor(Math.random() * ARABIC_ALPHABET.length)];
    if (distractor.id === target.id) {
      distractor =
        ARABIC_ALPHABET[
          (ARABIC_ALPHABET.indexOf(target) + 3) % ARABIC_ALPHABET.length
        ];
    }
    const opts =
      Math.random() > 0.5 ? [target, distractor] : [distractor, target];
    setSprintTarget(target);
    setSprintOptions(opts);
    speakArabic(target.vowels.fatha.char);
  };

  const startSprint = () => {
    setSprintScore(0);
    setSprintTimeLeft(60);
    setSprintRunning(true);
    generateSprintQuestion();
  };

  useEffect(() => {
    if (!sprintRunning) return;
    const timer = setInterval(() => {
      setSprintTimeLeft(prev => {
        if (prev <= 1) {
          setSprintRunning(false);
          audioEngine.playFeedbackChime(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sprintRunning]);

  const handleSprintPick = (picked: ArabicLetterItem) => {
    if (!sprintRunning) return;
    if (picked.id === sprintTarget.id) {
      audioEngine.playFeedbackChime(true);
      setSprintScore(s => s + 10);
      onMasterLetter(picked.id);
      generateSprintQuestion();
    } else {
      audioEngine.playFeedbackChime(false);
      generateSprintQuestion();
    }
  };

  // Build combined consonant + harakât preview
  const buildHarakatCombined = (consonantChar: string, harakatId: string) => {
    switch (harakatId) {
      case 'fatha':
        return {
          arabic: `${consonantChar}\u064E`,
          sound: `${selectedConsonant.baseSound}a`
        };
      case 'kasra':
        return {
          arabic: `${consonantChar}\u0650`,
          sound: `${selectedConsonant.baseSound}i`
        };
      case 'damma':
        return {
          arabic: `${consonantChar}\u064F`,
          sound: `${selectedConsonant.baseSound}ou`
        };
      case 'soukoun':
        return {
          arabic: `${consonantChar}\u0652`,
          sound: `${selectedConsonant.baseSound}`
        };
      case 'chadda':
        return {
          arabic: `${consonantChar}\u0651\u064E`,
          sound: `${selectedConsonant.baseSound}${selectedConsonant.baseSound}a`
        };
      default:
        return {
          arabic: `${consonantChar}\u064E`,
          sound: `${selectedConsonant.baseSound}a`
        };
    }
  };

  const combinedHarakatPreview = buildHarakatCombined(
    selectedConsonant.char,
    activeHarakat.id
  );

  const activeCalligraphyTarget =
    calligraphyMode === 'letters'
      ? calligraphyLetter.forms[calligraphyFormKey]
      : CALLIGRAPHY_WORDS[calligraphyWordIdx].arabic;

  return (
    <div className="space-y-6">
      {/* Studio Header + Scrollable Mobile-Friendly Segmented Control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#131B2E] rounded-3xl p-4 sm:p-5 border border-[#E2D9C5] dark:border-[#2A3654]">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#131B2E] dark:text-[#F8FAFC]">
            Atelier Alphabet, Calligraphie & Liaison
          </h1>
          <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8] mt-0.5">
            {masteredLetterIds.length} / 28 lettres maîtrisées · Écoutez, tracez au calame et assemblez les mots
          </p>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto bg-[#FAF6EE] dark:bg-[#0B1120] p-1 rounded-2xl border border-[#E2D9C5] dark:border-[#2A3654]">
          {(
            [
              { id: 'grid', label: '28 Lettres' },
              { id: 'calligraphy', label: 'Calligraphie (Calame)' },
              { id: 'harakat', label: 'Harakât (Voyelles)' },
              { id: 'word-builder', label: 'Mots (Liaison)' },
              { id: 'sprint', label: 'Défi 60s' },
              { id: 'flashcards', label: 'Flashcards' }
            ] as { id: LabMode; label: string }[]
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLabMode(tab.id)}
              className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                labMode === tab.id
                  ? 'bg-[#131B2E] dark:bg-[#C87D20] text-white shadow-xs'
                  : 'text-[#5A6478] dark:text-[#9AA6B8] hover:text-[#131B2E] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: 28 LETTERS GRID — Mobile-Optimized Cards with Visible Audio & Trace Buttons */}
      {labMode === 'grid' && (
        <div
          dir="rtl"
          className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3"
        >
          {ARABIC_ALPHABET.map((letter, idx) => {
            const isMastered = masteredLetterIds.includes(letter.id);
            return (
              <div
                key={letter.id}
                className={`rounded-2xl border transition-all flex flex-col justify-between p-3 relative ${
                  isMastered
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-[#131B2E] border-[#E2D9C5] dark:border-[#2A3654] hover:border-[#C87D20]'
                }`}
              >
                {/* Top Row: Order Number & Mastery Check */}
                <div
                  dir="ltr"
                  className="flex items-center justify-between text-[11px] font-mono text-[#5A6478] dark:text-[#9AA6B8]"
                >
                  <span>{String(idx + 1).padStart(2, '0')}</span>
                  {isMastered && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>

                {/* Main Tap Zone: Opens Full Letter Sheet & Plays Sound */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLetter(letter);
                    speakArabic(letter.arabic);
                  }}
                  aria-label={`Découvrir la lettre ${letter.nameFr}`}
                  className="py-2 flex flex-col items-center justify-center gap-1 cursor-pointer group"
                >
                  <span
                    lang="ar"
                    className="font-arabic text-5xl text-[#131B2E] dark:text-[#F8FAFC] leading-none group-hover:text-[#C87D20] transition-colors"
                  >
                    {letter.arabic}
                  </span>
                  <span
                    dir="ltr"
                    className="text-xs font-bold text-[#131B2E] dark:text-[#F8FAFC] mt-1"
                  >
                    {letter.nameFr}
                  </span>
                </button>

                {/* Visible Bottom Action Bar on Every Card (Audio + Tracer) */}
                <div
                  dir="ltr"
                  className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#E2D9C5]/60 dark:border-[#2A3654]"
                >
                  <button
                    type="button"
                    onClick={() => speakArabic(letter.arabic)}
                    aria-label={`Écouter ${letter.nameFr}`}
                    className="min-h-[38px] rounded-xl bg-[#FAF6EE] dark:bg-[#0B1120] hover:bg-[#131B2E] hover:text-white text-[#131B2E] dark:text-[#F8FAFC] flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#C87D20]" />
                    <span>Son</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openLetterInCalligraphyStudio(letter)}
                    aria-label={`Tracer ${letter.nameFr} au calame`}
                    className="min-h-[38px] rounded-xl bg-[#FAF6EE] dark:bg-[#0B1120] hover:bg-[#C87D20] hover:text-white text-[#131B2E] dark:text-[#F8FAFC] flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5 text-[#C87D20]" />
                    <span>Tracer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: DEDICATED CALLIGRAPHY STUDIO FOR ALL 28 LETTERS & WORDS */}
      {labMode === 'calligraphy' && (
        <div className="bg-white dark:bg-[#131B2E] rounded-3xl border border-[#E2D9C5] dark:border-[#2A3654] p-4 sm:p-6 space-y-6">
          {/* Top Switcher: 28 Letters vs Connected Words */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2D9C5] dark:border-[#2A3654]">
            <div>
              <h2 className="font-display text-xl font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                Atelier de Calligraphie Naskh au Calame
              </h2>
              <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8]">
                Évaluation réelle sur masque vectoriel : l’encre devient rouge si vous sortez du pochoir !
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#FAF6EE] dark:bg-[#0B1120] p-1 rounded-xl border border-[#E2D9C5] dark:border-[#2A3654] self-start">
              <button
                type="button"
                onClick={() => setCalligraphyMode('letters')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  calligraphyMode === 'letters'
                    ? 'bg-[#131B2E] dark:bg-[#C87D20] text-white'
                    : 'text-[#5A6478] dark:text-[#9AA6B8]'
                }`}
              >
                Les 28 Lettres (4 Formes)
              </button>
              <button
                type="button"
                onClick={() => setCalligraphyMode('words')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  calligraphyMode === 'words'
                    ? 'bg-[#131B2E] dark:bg-[#C87D20] text-white'
                    : 'text-[#5A6478] dark:text-[#9AA6B8]'
                }`}
              >
                Mots Arabes Liés
              </button>
            </div>
          </div>

          {calligraphyMode === 'letters' ? (
            /* 28 Letters Horizontal Selector Strip */
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#5A6478] dark:text-[#9AA6B8]">
                1. Choisissez l’une des 28 lettres arabes à tracer :
              </div>
              <div
                dir="rtl"
                className="flex items-center gap-2 overflow-x-auto pb-2"
              >
                {ARABIC_ALPHABET.map(l => {
                  const active = l.id === calligraphyLetter.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setCalligraphyLetter(l);
                        speakArabic(l.arabic);
                      }}
                      className={`min-w-[54px] min-h-[54px] p-2 rounded-2xl border flex flex-col items-center justify-center shrink-0 cursor-pointer transition-all ${
                        active
                          ? 'bg-[#131B2E] dark:bg-[#C87D20] text-white border-[#131B2E]'
                          : 'bg-[#FAF6EE] dark:bg-[#0B1120] text-[#131B2E] dark:text-[#F8FAFC] border-[#E2D9C5] dark:border-[#2A3654]'
                      }`}
                    >
                      <span lang="ar" className="font-arabic text-2xl leading-none">
                        {l.arabic}
                      </span>
                      <span dir="ltr" className="text-[10px] mt-1 opacity-80">
                        {l.nameFr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Connected Words Selector Strip */
            <div className="flex flex-wrap items-center gap-2">
              {CALLIGRAPHY_WORDS.map((w, idx) => {
                const active = idx === calligraphyWordIdx;
                return (
                  <button
                    key={w.arabic}
                    type="button"
                    onClick={() => {
                      setCalligraphyWordIdx(idx);
                      speakArabic(w.arabic);
                    }}
                    className={`min-h-[44px] px-4 py-2 rounded-2xl border flex items-center gap-2.5 cursor-pointer ${
                      active
                        ? 'bg-[#131B2E] dark:bg-[#C87D20] text-white border-[#131B2E]'
                        : 'bg-[#FAF6EE] dark:bg-[#0B1120] text-[#131B2E] dark:text-[#F8FAFC] border-[#E2D9C5] dark:border-[#2A3654]'
                    }`}
                  >
                    <span dir="rtl" lang="ar" className="font-arabic text-2xl">
                      {w.arabic}
                    </span>
                    <span className="text-xs font-semibold">
                      {w.meaningFr} (/{w.translit}/)
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Two-Zone Educational Sandbox: Left = Interactive Reed-Pen Canvas, Right = Positional Forms & Validation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6">
              <CalligraphyCanvas
                targetArabic={activeCalligraphyTarget}
                subtitleFr="Maintenez l’encre à l’intérieur des pointillés de droite à gauche."
                onEvaluationChange={setCalligraphyEval}
              />
            </div>

            <div className="lg:col-span-6 space-y-4">
              {calligraphyMode === 'letters' && (
                <div className="bg-[#FAF6EE] dark:bg-[#0B1120] rounded-2xl p-4 border border-[#E2D9C5] dark:border-[#2A3654] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                      Lettre {calligraphyLetter.nameFr} ({calligraphyLetter.arabic})
                    </h3>
                    <button
                      type="button"
                      onClick={() => speakArabic(calligraphyLetter.arabic)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#131B2E] dark:bg-[#C87D20] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Écouter</span>
                    </button>
                  </div>

                  <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8]">
                    {calligraphyLetter.dotRuleFr} · {calligraphyLetter.phoneticHintFr}
                  </p>

                  <div className="text-xs font-semibold text-[#131B2E] dark:text-[#F8FAFC]">
                    2. Choisissez la forme à tracer sur le parchemin :
                  </div>
                  <div dir="rtl" className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { key: 'isolated', label: 'Isolée' },
                        { key: 'initial', label: 'Début' },
                        { key: 'medial', label: 'Milieu' },
                        { key: 'final', label: 'Fin' }
                      ] as const
                    ).map(pos => {
                      const active = calligraphyFormKey === pos.key;
                      return (
                        <button
                          key={pos.key}
                          type="button"
                          onClick={() => setCalligraphyFormKey(pos.key)}
                          className={`min-h-[64px] p-2 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                            active
                              ? 'border-[#C87D20] bg-white dark:bg-[#131B2E]'
                              : 'border-[#E2D9C5] dark:border-[#2A3654] bg-white/60 dark:bg-[#131B2E]/50'
                          }`}
                        >
                          <span
                            lang="ar"
                            className="font-arabic text-3xl text-[#131B2E] dark:text-[#F8FAFC]"
                          >
                            {calligraphyLetter.forms[pos.key]}
                          </span>
                          <span
                            dir="ltr"
                            className="text-[10px] font-semibold text-[#5A6478] dark:text-[#9AA6B8] mt-1"
                          >
                            {pos.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Validation & Next Letter Button */}
              <div className="bg-[#FAF6EE] dark:bg-[#0B1120] rounded-2xl p-4 border border-[#E2D9C5] dark:border-[#2A3654] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                    {calligraphyEval?.passed
                      ? '✓ Tracé validé par le maître calligraphe !'
                      : 'Objectif : ≥ 52% de précision et ≥ 45% de couverture'}
                  </div>
                  <div className="text-[11px] text-[#5A6478] dark:text-[#9AA6B8]">
                    Score global : {calligraphyEval?.overallScore ?? 0}%
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {calligraphyMode === 'letters' && (
                    <button
                      type="button"
                      disabled={!calligraphyEval?.passed}
                      onClick={() => {
                        onMasterLetter(calligraphyLetter.id);
                        audioEngine.playFeedbackChime(true);
                        const nextIdx =
                          (ARABIC_ALPHABET.indexOf(calligraphyLetter) + 1) %
                          ARABIC_ALPHABET.length;
                        setCalligraphyLetter(ARABIC_ALPHABET[nextIdx]);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <span>Valider & Lettre suivante</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: INTERACTIVE HARAKÂT SIMULATOR */}
      {labMode === 'harakat' && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#131B2E] rounded-3xl border border-[#E2D9C5] dark:border-[#2A3654] p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2D9C5] dark:border-[#2A3654] pb-4">
            <div>
              <span className="text-xs font-semibold text-[#C87D20]">
                Simulateur Pédagogique Débutant
              </span>
              <h2 className="font-display text-xl font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                Comment fonctionnent les voyelles arabes (Harakât) ?
              </h2>
            </div>
            <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8] max-w-xs">
              En arabe, les lettres sont des consonnes. Les petits signes au-dessus ou en dessous donnent le son voyelle.
            </p>
          </div>

          {/* Step 1: Pick a Consonant */}
          <div>
            <div className="text-xs font-semibold text-[#5A6478] dark:text-[#9AA6B8] mb-2">
              1. Choisissez une consonne de base :
            </div>
            <div dir="rtl" className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {DEMO_CONSONANTS.map(c => {
                const active = c.char === selectedConsonant.char;
                return (
                  <button
                    key={c.char}
                    type="button"
                    onClick={() => {
                      setSelectedConsonant(c);
                      const nextPreview = buildHarakatCombined(
                        c.char,
                        activeHarakat.id
                      );
                      speakArabic(nextPreview.arabic);
                    }}
                    className={`min-h-[56px] p-2.5 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                      active
                        ? 'bg-[#131B2E] dark:bg-[#C87D20] text-white border-[#131B2E]'
                        : 'bg-[#FAF6EE] dark:bg-[#0B1120] text-[#131B2E] dark:text-[#F8FAFC] border-[#E2D9C5] dark:border-[#2A3654]'
                    }`}
                  >
                    <span lang="ar" className="font-arabic text-3xl leading-none">
                      {c.char}
                    </span>
                    <span
                      dir="ltr"
                      className="text-[10px] font-semibold mt-1 opacity-80"
                    >
                      {c.nameFr}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Pick a Harakât Sign */}
          <div>
            <div className="text-xs font-semibold text-[#5A6478] dark:text-[#9AA6B8] mb-2">
              2. Appliquez un signe vocalique (Harakât) sur la lettre :
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {HARAKAT_GUIDE_ITEMS.map(item => {
                const active = item.id === activeHarakat.id;
                const preview = buildHarakatCombined(
                  selectedConsonant.char,
                  item.id
                );
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedHarakatId(item.id);
                      speakArabic(preview.arabic);
                    }}
                    className={`p-3.5 rounded-2xl border-2 flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                      active
                        ? 'border-[#C87D20] bg-amber-50/70 dark:bg-amber-950/30'
                        : 'border-[#E2D9C5] dark:border-[#2A3654] bg-[#FAF6EE] dark:bg-[#0B1120]'
                    }`}
                  >
                    <span
                      dir="rtl"
                      lang="ar"
                      className="font-arabic text-4xl text-[#131B2E] dark:text-[#F8FAFC] leading-none py-1"
                    >
                      {preview.arabic}
                    </span>
                    <span className="text-xs font-bold text-[#131B2E] dark:text-amber-300">
                      {item.nameFr}
                    </span>
                    <span className="font-mono text-[11px] text-[#5A6478] dark:text-[#9AA6B8]">
                      /{preview.sound}/
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Live Visual & Audio Explanation Card */}
          <div className="bg-[#FAF6EE] dark:bg-[#0B1120] rounded-3xl p-5 border border-[#E2D9C5] dark:border-[#2A3654] flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <button
                type="button"
                onClick={() => speakArabic(combinedHarakatPreview.arabic)}
                className="w-24 h-24 rounded-3xl bg-[#131B2E] text-white flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer shrink-0"
              >
                <span dir="rtl" lang="ar" className="font-arabic text-5xl leading-none">
                  {combinedHarakatPreview.arabic}
                </span>
                <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  Écouter
                </span>
              </button>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-[#C87D20]">
                  {activeHarakat.positionFr} · {activeHarakat.soundFr}
                </div>
                <h3 className="font-display text-lg font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                  {selectedConsonant.nameFr} + {activeHarakat.nameFr} se lit « /{combinedHarakatPreview.sound}/ »
                </h3>
                <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8]">
                  {activeHarakat.mouthTipFr}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  {activeHarakat.examples.map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => speakArabic(ex.arabic)}
                      className="min-h-[38px] px-2.5 py-1 rounded-xl bg-white dark:bg-[#131B2E] border border-[#E2D9C5] dark:border-[#2A3654] flex items-center gap-1.5 text-xs cursor-pointer hover:border-[#C87D20]"
                    >
                      <span
                        dir="rtl"
                        lang="ar"
                        className="font-arabic text-xl text-[#131B2E] dark:text-[#F8FAFC]"
                      >
                        {ex.arabic}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-[#C87D20]">
                        /{ex.translit}/
                      </span>
                      <span className="text-[10px] text-[#5A6478] dark:text-[#9AA6B8]">
                        ({ex.meaningFr})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <AudioWaveform active={isSpeaking} />
          </div>
        </div>
      )}

      {/* MODE 4: 3-STAGE VISUAL WORD BUILDER ("L’Assemblage Visuel des Mots") */}
      {labMode === 'word-builder' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#131B2E] rounded-3xl border border-[#E2D9C5] dark:border-[#2A3654] p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2D9C5] dark:border-[#2A3654] pb-4">
            <div className="flex items-center gap-2">
              <Puzzle className="w-4 h-4 text-[#C87D20]" />
              <span className="text-xs font-bold text-[#131B2E] dark:text-amber-300">
                Atelier d’Assemblage Visuel ({puzzleIdx + 1}/{WORD_BUILDER_PUZZLES.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {WORD_BUILDER_PUZZLES.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPuzzleIdx(idx);
                    setChosenLetters([]);
                    setWordBuilderSuccess(null);
                  }}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                    idx === puzzleIdx % WORD_BUILDER_PUZZLES.length
                      ? 'bg-[#131B2E] dark:bg-[#C87D20] text-white border-[#131B2E]'
                      : 'bg-[#FAF6EE] dark:bg-[#0B1120] text-[#5A6478] dark:text-[#9AA6B8] border-[#E2D9C5] dark:border-[#2A3654]'
                  }`}
                >
                  {p.meaningFr}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8] font-medium">
              Touchez les lettres isolées de droite à gauche pour former :
            </p>
            <h2 className="font-display text-2xl font-bold text-[#131B2E] dark:text-[#F8FAFC] mt-1">
              « {currentPuzzle.meaningFr} » —{' '}
              <span className="font-mono text-base text-[#C87D20]">
                /{currentPuzzle.translit}/
              </span>
            </h2>
          </div>

          {/* 3-Stage Visual Transformation Pipeline */}
          <div className="bg-[#FAF6EE] dark:bg-[#0B1120] rounded-3xl border border-[#E2D9C5] dark:border-[#2A3654] p-4 sm:p-5 space-y-5">
            <div>
              <div className="text-[11px] font-semibold text-[#5A6478] dark:text-[#9AA6B8] text-center mb-3">
                Transformation selon la position (1. Début à droite → Milieu → Fin à gauche)
              </div>
              <div dir="rtl" className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
                {currentPuzzle.targetLetters.map((targetChar, idx) => {
                  const picked = chosenLetters[idx];
                  const isCorrectSlot =
                    picked === targetChar ||
                    (targetChar === 'ا' && picked === 'أ');
                  const positionalForm = currentPuzzle.positionalForms[idx];
                  const roleLabel = currentPuzzle.positionRolesFr[idx];

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-between gap-2 transition-all ${
                        picked
                          ? isCorrectSlot
                            ? 'border-emerald-500 bg-white dark:bg-[#131B2E]'
                            : 'border-amber-500 bg-white dark:bg-[#131B2E]'
                          : 'border-dashed border-[#E2D9C5] dark:border-[#2A3654] bg-white/50 dark:bg-[#131B2E]/40'
                      }`}
                    >
                      <span
                        dir="ltr"
                        className="text-[10px] font-bold text-[#5A6478] dark:text-[#9AA6B8] text-center"
                      >
                        {roleLabel}
                      </span>

                      {picked ? (
                        <div className="flex flex-col items-center gap-1">
                          <span
                            lang="ar"
                            className="font-arabic text-2xl text-[#5A6478] line-through opacity-70"
                          >
                            {picked}
                          </span>
                          <span className="text-[10px] text-[#C87D20] font-bold">
                            ↓ devient
                          </span>
                          <span
                            lang="ar"
                            className="font-arabic text-4xl text-[#131B2E] dark:text-amber-300 leading-none"
                          >
                            {isCorrectSlot ? positionalForm : picked}
                          </span>
                        </div>
                      ) : (
                        <span className="font-arabic text-4xl text-[#5A6478]/30 py-3">
                          ؟
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {wordBuilderSuccess !== null && (
              <div
                className={`rounded-2xl p-4 border text-center space-y-2 transition-all ${
                  wordBuilderSuccess
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                }`}
              >
                {wordBuilderSuccess ? (
                  <>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      ✓ Mot assemblé avec succès :
                    </div>
                    <button
                      type="button"
                      onClick={() => speakArabic(currentPuzzle.wordArabic)}
                      className="inline-flex items-center gap-3 px-6 py-2 rounded-2xl bg-white dark:bg-[#131B2E] border border-emerald-300 dark:border-emerald-700 cursor-pointer"
                    >
                      <Volume2 className="w-5 h-5 text-[#C87D20]" />
                      <span
                        dir="rtl"
                        lang="ar"
                        className="font-arabic text-5xl text-[#131B2E] dark:text-[#F8FAFC]"
                      >
                        <ColoredArabic text={currentPuzzle.wordArabic} />
                      </span>
                    </button>
                    <p className="font-mono text-xs font-semibold text-[#131B2E] dark:text-amber-300">
                      {currentPuzzle.positionalBreakdown}
                    </p>
                    <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8] max-w-md mx-auto">
                      <strong>Règle de liaison :</strong>{' '}
                      {currentPuzzle.pedagogicalRuleFr}
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Ordre incorrect. Rappel : en arabe, la 1re lettre se place à droite !
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 text-center">
            <div className="text-xs font-semibold text-[#5A6478] dark:text-[#9AA6B8]">
              Banque de lettres isolées (touchez dans l’ordre : 1. Début → 2. Milieu → 3. Fin)
            </div>
            <div dir="rtl" className="flex flex-wrap items-center justify-center gap-3">
              {poolLetters.map((letter, idx) => (
                <button
                  key={letter + idx}
                  type="button"
                  onClick={() => handlePickWordLetter(letter)}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FAF6EE] dark:bg-[#0B1120] hover:bg-[#131B2E] hover:text-white border border-[#E2D9C5] dark:border-[#2A3654] font-arabic text-4xl text-[#131B2E] dark:text-[#F8FAFC] transition-all cursor-pointer"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => resetWordBuilder(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E2D9C5] dark:border-[#2A3654] text-xs font-semibold text-[#5A6478] dark:text-[#9AA6B8] flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Effacer</span>
            </button>
            <button
              type="button"
              onClick={handleRevealWordAssembly}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#C87D20]" />
              <span>Voir la démonstration</span>
            </button>
            <button
              type="button"
              onClick={() => speakArabic(currentPuzzle.wordArabic)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#131B2E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Écouter « {currentPuzzle.translit} »</span>
            </button>
            <button
              type="button"
              onClick={() => resetWordBuilder(true)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#C87D20] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Mot suivant →</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 5: 60-SECOND RAPID AUDIO SPRINT */}
      {labMode === 'sprint' && (
        <div className="max-w-md mx-auto bg-white dark:bg-[#131B2E] rounded-3xl border border-[#E2D9C5] dark:border-[#2A3654] p-6 text-center space-y-6">
          <div className="flex items-center justify-between font-mono tabular-nums">
            <span className="text-sm font-bold text-[#C87D20] flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              {sprintTimeLeft}s
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              Score : {sprintScore} pts
            </span>
          </div>

          {!sprintRunning ? (
            <div className="py-6 space-y-4">
              <h2 className="font-display text-2xl font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                Sprint Audio 60 Secondes
              </h2>
              <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8]">
                Écoutez la syllabe prononcée et touchez la bonne lettre le plus vite possible.
              </p>
              <button
                type="button"
                onClick={startSprint}
                className="min-h-[48px] px-6 py-3.5 rounded-2xl bg-[#131B2E] dark:bg-[#C87D20] text-white font-semibold text-sm shadow-md cursor-pointer"
              >
                {sprintScore > 0
                  ? `Rejouer (Dernier score: ${sprintScore} pts)`
                  : 'Lancer le Défi 60s'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => speakArabic(sprintTarget.vowels.fatha.char)}
                className="w-24 h-24 rounded-full bg-[#131B2E] text-white mx-auto flex flex-col items-center justify-center gap-1 shadow-lg cursor-pointer"
              >
                <Volume2 className="w-8 h-8" />
                <AudioWaveform active={isSpeaking} />
              </button>

              <div className="grid grid-cols-2 gap-4">
                {sprintOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSprintPick(opt)}
                    className="p-6 rounded-3xl bg-[#FAF6EE] dark:bg-[#0B1120] border-2 border-[#E2D9C5] dark:border-[#2A3654] hover:border-[#C87D20] flex flex-col items-center justify-center gap-2 cursor-pointer"
                  >
                    <span
                      dir="rtl"
                      lang="ar"
                      className="font-arabic text-6xl text-[#131B2E] dark:text-[#F8FAFC]"
                    >
                      <ColoredArabic text={opt.vowels.fatha.char} />
                    </span>
                    <span className="text-xs text-[#5A6478] dark:text-[#9AA6B8] font-semibold">
                      {opt.nameFr}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 6: FLASHCARDS */}
      {labMode === 'flashcards' && (
        <div className="max-w-md mx-auto flex flex-col items-center gap-5">
          <div
            onClick={() => {
              setIsFlipped(f => !f);
              speakArabic(currentFlashcard.arabic);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsFlipped(f => !f);
                speakArabic(currentFlashcard.arabic);
              }
            }}
            className="w-full min-h-[260px] bg-white dark:bg-[#131B2E] rounded-3xl border-2 border-[#E2D9C5] dark:border-[#2A3654] p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-[#C87D20]"
          >
            {!isFlipped ? (
              <>
                <span
                  dir="rtl"
                  lang="ar"
                  className="font-arabic text-8xl text-[#131B2E] dark:text-[#F8FAFC] mb-4"
                >
                  {currentFlashcard.arabic}
                </span>
                <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8] flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5" />
                  Touchez pour retourner
                </p>
              </>
            ) : (
              <div className="w-full space-y-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                    {currentFlashcard.nameFr}
                  </h3>
                  <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8]">
                    {currentFlashcard.phoneticHintFr}
                  </p>
                </div>

                <div dir="rtl" className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    {
                      v: currentFlashcard.vowels.fatha.char,
                      l: currentFlashcard.vowels.fatha.sound
                    },
                    {
                      v: currentFlashcard.vowels.damma.char,
                      l: currentFlashcard.vowels.damma.sound
                    },
                    {
                      v: currentFlashcard.vowels.kasra.char,
                      l: currentFlashcard.vowels.kasra.sound
                    }
                  ].map(item => (
                    <button
                      key={item.l}
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        speakArabic(item.v);
                      }}
                      className="p-2.5 rounded-xl bg-[#FAF6EE] dark:bg-[#0B1120] border border-[#E2D9C5] dark:border-[#2A3654] flex flex-col items-center cursor-pointer"
                    >
                      <span
                        lang="ar"
                        className="font-arabic text-3xl text-[#131B2E] dark:text-[#F8FAFC]"
                      >
                        <ColoredArabic text={item.v} />
                      </span>
                      <span
                        dir="ltr"
                        className="font-mono text-[10px] text-[#5A6478] dark:text-[#9AA6B8]"
                      >
                        /{item.l}/
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between w-full gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsFlipped(false);
                setFlashcardIndex(
                  i => (i - 1 + ARABIC_ALPHABET.length) % ARABIC_ALPHABET.length
                );
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white dark:bg-[#131B2E] border border-[#E2D9C5] dark:border-[#2A3654] text-xs font-semibold text-[#131B2E] dark:text-[#F8FAFC] cursor-pointer"
            >
              Précédente
            </button>

            <button
              type="button"
              onClick={() => {
                onMasterLetter(currentFlashcard.id);
                audioEngine.playFeedbackChime(true);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
            >
              Marquer maîtrisée
            </button>

            <button
              type="button"
              onClick={() => {
                setIsFlipped(false);
                setFlashcardIndex(i => (i + 1) % ARABIC_ALPHABET.length);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#131B2E] dark:bg-[#C87D20] text-white text-xs font-semibold cursor-pointer"
            >
              Suivante
            </button>
          </div>
        </div>
      )}

      {/* Mobile-First Bottom Sheet for Selected Letter — Pinned Bottom Action Bar so buttons are NEVER cut off */}
      {selectedLetter && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#131B2E] rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[86dvh] flex flex-col border border-[#E2D9C5] dark:border-[#2A3654] shadow-2xl overflow-hidden animate-sheet">
            {/* Grab Handle + Sticky Sheet Header */}
            <div className="px-5 pt-3 pb-3 border-b border-[#E2D9C5] dark:border-[#2A3654] shrink-0">
              <div className="w-10 h-1.5 bg-[#E2D9C5] dark:bg-[#2A3654] rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#131B2E] dark:text-[#F8FAFC]">
                    Lettre {selectedLetter.nameFr} ({selectedLetter.arabic})
                  </h2>
                  <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8]">
                    {selectedLetter.phoneticHintFr}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLetter(null)}
                  aria-label="Fermer la fiche"
                  className="min-h-[44px] min-w-[44px] rounded-full bg-[#FAF6EE] dark:bg-[#0B1120] flex items-center justify-center text-[#5A6478] dark:text-[#9AA6B8] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* 4 Positional Forms */}
              <div>
                <div className="text-xs font-semibold text-[#5A6478] dark:text-[#9AA6B8] mb-2">
                  4 formes selon la position dans le mot (droite à gauche)
                </div>
                <div dir="rtl" className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Isolée', form: selectedLetter.forms.isolated },
                    { label: 'Début', form: selectedLetter.forms.initial },
                    { label: 'Milieu', form: selectedLetter.forms.medial },
                    { label: 'Fin', form: selectedLetter.forms.final }
                  ].map(pos => (
                    <div
                      key={pos.label}
                      className="p-2.5 rounded-xl bg-[#FAF6EE] dark:bg-[#0B1120] border border-[#E2D9C5] dark:border-[#2A3654]"
                    >
                      <div
                        lang="ar"
                        className="font-arabic text-3xl text-[#131B2E] dark:text-[#F8FAFC]"
                      >
                        {pos.form}
                      </div>
                      <div
                        dir="ltr"
                        className="text-[10px] text-[#5A6478] dark:text-[#9AA6B8] mt-1"
                      >
                        {pos.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Short Vowels with Harakât */}
              <div>
                <div className="text-xs font-semibold text-[#5A6478] dark:text-[#9AA6B8] mb-2">
                  Voyelles courtes (touchez pour écouter)
                </div>
                <div dir="rtl" className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: `Fatha (${selectedLetter.vowels.fatha.sound})`,
                      val: selectedLetter.vowels.fatha.char
                    },
                    {
                      label: `Damma (${selectedLetter.vowels.damma.sound})`,
                      val: selectedLetter.vowels.damma.char
                    },
                    {
                      label: `Kasra (${selectedLetter.vowels.kasra.sound})`,
                      val: selectedLetter.vowels.kasra.char
                    }
                  ].map(v => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => speakArabic(v.val)}
                      className="min-h-[64px] p-2.5 rounded-xl bg-[#FAF6EE] dark:bg-[#0B1120] border border-[#E2D9C5] dark:border-[#2A3654] hover:border-[#C87D20] flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span
                        lang="ar"
                        className="font-arabic text-3xl text-[#131B2E] dark:text-[#F8FAFC]"
                      >
                        <ColoredArabic text={v.val} />
                      </span>
                      <span
                        dir="ltr"
                        className="text-[10px] text-[#5A6478] dark:text-[#9AA6B8] mt-1"
                      >
                        {v.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Bar — Always Visible on Mobile */}
            <div className="p-4 border-t border-[#E2D9C5] dark:border-[#2A3654] bg-[#FAF6EE] dark:bg-[#0B1120] grid grid-cols-2 gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => speakArabic(selectedLetter.arabic)}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white dark:bg-[#131B2E] border border-[#E2D9C5] dark:border-[#2A3654] text-[#131B2E] dark:text-[#F8FAFC] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-[#C87D20]" />
                <span>Écouter</span>
              </button>

              <button
                type="button"
                onClick={() => openLetterInCalligraphyStudio(selectedLetter)}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#131B2E] dark:bg-[#C87D20] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <PenTool className="w-4 h-4" />
                <span>Tracer au Calame</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
