import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Eye,
  EyeOff,
  Play,
  Mic,
  BookOpen,
  Send,
  Crown,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { READING_STORIES, ReadingStory } from '../data/curriculum';
import {
  stripArabicDiacritics,
  StudentProfile,
  ARABIC_WORD_GLOSSARY
} from '../utils/learningLogic';
import { audioEngine } from '../utils/audioEngine';
import {
  ColoredArabic,
  AudioWaveform,
  decomposeArabicIntoSyllables
} from './ColoredArabic';

interface ReadingStudioViewProps {
  student: StudentProfile;
  onToggleSaveWord?: (arabicWord: string) => void;
  onSubmitToTeacher: (payload: {
    lessonId: string;
    lessonTitle: string;
    type: 'exercise' | 'question' | 'pronunciation';
    promptTitle: string;
    arabicTarget?: string;
    studentResponseText: string;
    hasAudioRecording: boolean;
    audioDurationSec?: number;
  }) => void;
  onOpenPremiumModal: () => void;
}

export const ReadingStudioView: React.FC<ReadingStudioViewProps> = ({
  student,
  onToggleSaveWord,
  onSubmitToTeacher,
  onOpenPremiumModal
}) => {
  const [selectedStoryId, setSelectedStoryId] = useState<string>(READING_STORIES[0].id);
  const [showVowels, setShowVowels] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [playingLineIdx, setPlayingLineIdx] = useState<number | 'all' | null>(null);
  const [karaokeWordIdx, setKaraokeWordIdx] = useState<number | null>(null);

  // Tap-to-translate ("Mot-à-mot") state — preselect first word so beginners immediately see how it works
  const [inspectedWord, setInspectedWord] = useState<{
    arabic: string;
    translit: string;
    meaningFr: string;
    noteFr?: string;
  } | null>({
    arabic: 'بَدر',
    translit: 'badr',
    meaningFr: 'Badr (prénom masculin signifiant « pleine lune »)',
    noteFr: 'Nom propre masculin'
  });

  // Voice recording simulation for teacher submission
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedSeconds, setRecordedSeconds] = useState<number>(0);
  const [submittedNotice, setSubmittedNotice] = useState<boolean>(false);

  const activeStory: ReadingStory =
    READING_STORIES.find(s => s.id === selectedStoryId) || READING_STORIES[0];

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordedSeconds(prev => {
        if (prev >= 12) {
          setIsRecording(false);
          return 12;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const playLine = (lineIdx: number, arabicText: string) => {
    const words = arabicText.split(/\s+/).filter(Boolean);
    setPlayingLineIdx(lineIdx);
    setKaraokeWordIdx(0);

    const stepMs = Math.max(380, Math.round(1800 / Math.max(1, words.length)));
    let currentIdx = 0;
    const wordTimer = setInterval(() => {
      currentIdx += 1;
      if (currentIdx < words.length) {
        setKaraokeWordIdx(currentIdx);
      } else {
        clearInterval(wordTimer);
      }
    }, stepMs);

    audioEngine.speakArabic(arabicText, {
      rate: 0.82,
      onEnd: () => {
        clearInterval(wordTimer);
        setPlayingLineIdx(null);
        setKaraokeWordIdx(null);
      }
    });
  };

  const playFullStory = () => {
    const joined = activeStory.lines.map(l => l.arabicVocalized).join(' . ');
    setPlayingLineIdx('all');
    audioEngine.speakArabic(joined, {
      rate: 0.8,
      onEnd: () => setPlayingLineIdx(null)
    });
  };

  const handleWordClick = (e: React.MouseEvent, rawWord: string, vocalizedWord: string) => {
    e.stopPropagation();
    const cleanVocalized = vocalizedWord.replace(/[،.؟!]/g, '').trim();
    const cleanWord = rawWord.replace(/[،.؟!]/g, '').trim();
    const stripped = stripArabicDiacritics(cleanVocalized);
    const entry =
      ARABIC_WORD_GLOSSARY[cleanVocalized] ||
      ARABIC_WORD_GLOSSARY[cleanWord] ||
      ARABIC_WORD_GLOSSARY[stripped] || {
        translit: 'lecture vocale',
        meaningFr: 'Mot du texte — touchez les syllabes ci-dessous pour l’écouter',
        noteFr: 'Vocabulaire du texte'
      };
    setInspectedWord({
      arabic: cleanVocalized,
      translit: entry.translit,
      meaningFr: entry.meaningFr,
      noteFr: entry.noteFr
    });
    audioEngine.speakArabic(cleanVocalized, { rate: 0.82 });
  };

  const handleSubmitStoryReading = () => {
    if (!student.isPremium) {
      onOpenPremiumModal();
      return;
    }
    onSubmitToTeacher({
      lessonId: activeStory.id,
      lessonTitle: `Lecture : ${activeStory.titleFr} (${activeStory.titleArabic})`,
      type: 'pronunciation',
      promptTitle: `Lecture à voix haute de « ${activeStory.titleFr} »`,
      arabicTarget: activeStory.lines.map(l => l.arabicVocalized).join(' — '),
      studentResponseText: `Enregistrement vocal de ma lecture de « ${activeStory.titleFr} ».`,
      hasAudioRecording: true,
      audioDurationSec: Math.max(4, recordedSeconds || 6)
    });
    setRecordedSeconds(0);
    setSubmittedNotice(true);
    setTimeout(() => setSubmittedNotice(false), 3000);
  };

  const inspectedSyllables = inspectedWord
    ? decomposeArabicIntoSyllables(inspectedWord.arabic)
    : [];

  return (
    <div className="space-y-6">
      {/* Header + Story Switcher */}
      <div className="bg-white dark:bg-[#1C1426] rounded-3xl p-5 border border-[#E6DEC8] dark:border-[#2F2340] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1A1325] dark:text-[#F7F3EE]">
            Studio de Lecture Mot-à-Mot
          </h1>
          <p className="text-xs text-[#5E526E] dark:text-[#B9AFC7] mt-0.5">
            Cliquez sur n’importe quel mot arabe pour sa traduction et sa décomposition syllabique (Harakât)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {READING_STORIES.map(story => {
            const active = story.id === activeStory.id;
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => {
                  setSelectedStoryId(story.id);
                  const firstWord = story.lines[0].arabicVocalized
                    .split(/\s+/)[0]
                    .replace(/[،.؟!]/g, '');
                  const stripped = stripArabicDiacritics(firstWord);
                  const entry = ARABIC_WORD_GLOSSARY[firstWord] || ARABIC_WORD_GLOSSARY[stripped];
                  if (entry) {
                    setInspectedWord({
                      arabic: firstWord,
                      translit: entry.translit,
                      meaningFr: entry.meaningFr,
                      noteFr: entry.noteFr
                    });
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                  active
                    ? 'bg-[#3B1C54] text-white border-[#3B1C54]'
                    : 'bg-[#FBF8F3] dark:bg-[#120D18] text-[#1A1325] dark:text-[#F7F3EE] border-[#E6DEC8] dark:border-[#352847]'
                }`}
              >
                <span>{story.titleFr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Story Reader Card */}
      <div className="bg-white dark:bg-[#1C1426] rounded-3xl border border-[#E6DEC8] dark:border-[#2F2340] shadow-xs p-6 space-y-6">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6DEC8] dark:border-[#2F2340]">
          <div className="flex items-center gap-3">
            <span
              dir="rtl"
              lang="ar"
              className="font-arabic text-3xl font-bold text-[#3B1C54] dark:text-amber-300"
            >
              <ColoredArabic text={activeStory.titleArabic} />
            </span>
            <span className="text-sm font-semibold text-[#5E526E] dark:text-[#B9AFC7]">
              · {activeStory.titleFr}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowVowels(v => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
                showVowels
                  ? 'bg-[#3B1C54] text-white border-[#3B1C54]'
                  : 'bg-[#FBF8F3] dark:bg-[#120D18] text-[#1A1325] dark:text-[#F7F3EE] border-[#E6DEC8] dark:border-[#352847]'
              }`}
            >
              {showVowels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showVowels ? 'Avec Harakât' : 'Sans Harakât'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTranslation(t => !t)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FBF8F3] dark:bg-[#120D18] text-[#5E526E] dark:text-[#B9AFC7] border border-[#E6DEC8] dark:border-[#352847] cursor-pointer"
            >
              {showTranslation ? 'Masquer FR' : 'Afficher FR'}
            </button>

            <button
              type="button"
              onClick={playFullStory}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#D97706] text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Tout écouter</span>
              <AudioWaveform active={playingLineIdx === 'all'} />
            </button>
          </div>
        </div>

        {/* Word-by-Word ("Mot-à-mot") + Syllable & Harakât Decoder Card */}
        {inspectedWord && (
          <div
            data-testid="mot-a-mot-inspector"
            className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 space-y-3 animate-sheet"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => audioEngine.speakArabic(inspectedWord.arabic, { rate: 0.8 })}
                  className="px-4 py-2 rounded-2xl bg-[#3B1C54] text-white font-arabic text-3xl flex items-center gap-2.5 cursor-pointer shadow-xs"
                >
                  <Volume2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span dir="rtl" lang="ar">
                    <ColoredArabic text={inspectedWord.arabic} />
                  </span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#3B1C54] dark:text-amber-300">
                      /{inspectedWord.translit}/
                    </span>
                    {inspectedWord.noteFr && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#1C1426] border border-amber-200 dark:border-amber-800 text-[#5E526E] dark:text-[#B9AFC7] font-semibold">
                        {inspectedWord.noteFr}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-[#1A1325] dark:text-[#F7F3EE] mt-0.5">
                    {inspectedWord.meaningFr}
                  </div>
                </div>
              </div>

              {onToggleSaveWord && (
                <button
                  type="button"
                  onClick={() => onToggleSaveWord(inspectedWord.arabic)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
                    student.savedWords?.includes(inspectedWord.arabic)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-[#1C1426] text-[#1A1325] dark:text-[#F7F3EE] border-[#E6DEC8] dark:border-[#352847]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>
                    {student.savedWords?.includes(inspectedWord.arabic)
                      ? 'Mot enregistré'
                      : '+ Favori'}
                  </span>
                </button>
              )}
            </div>

            {/* Letter-by-Letter Syllable & Harakât Breakdown */}
            {inspectedSyllables.length > 0 && (
              <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#5E526E] dark:text-[#B9AFC7]">
                  Décomposition lettre par lettre & Harakât (de droite à gauche) :
                </span>
                <div dir="rtl" className="flex flex-wrap items-center gap-2">
                  {inspectedSyllables.map((syl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => audioEngine.speakArabic(syl.grapheme, { rate: 0.78 })}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1C1426] border border-amber-300 dark:border-amber-700 flex items-center gap-2 hover:border-[#3B1C54] cursor-pointer"
                    >
                      <span
                        lang="ar"
                        className="font-arabic text-2xl text-[#1A1325] dark:text-[#F7F3EE] leading-none"
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
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Story Lines with Interactive Word-by-Word Tap & Karaoke Highlight */}
        <div className="space-y-3">
          {activeStory.lines.map((line, lineIdx) => {
            const vocalizedWords = line.arabicVocalized.split(/\s+/).filter(Boolean);
            const displayedArabic = showVowels
              ? line.arabicVocalized
              : stripArabicDiacritics(line.arabicVocalized);
            const isPlayingThis = playingLineIdx === lineIdx;
            const words = displayedArabic.split(/\s+/).filter(Boolean);

            return (
              <div
                key={lineIdx}
                onClick={() => playLine(lineIdx, line.arabicVocalized)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    playLine(lineIdx, line.arabicVocalized);
                  }
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                  isPlayingThis
                    ? 'border-[#D97706] bg-amber-50/60 dark:bg-amber-950/30 shadow-xs'
                    : 'border-[#E6DEC8] dark:border-[#352847] bg-[#FBF8F3] dark:bg-[#120D18] hover:border-[#3B1C54]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isPlayingThis
                        ? 'bg-[#D97706] text-white'
                        : 'bg-white dark:bg-[#1C1426] text-[#3B1C54] dark:text-amber-300 border border-[#E6DEC8] dark:border-[#352847]'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </div>
                  {showTranslation && (
                    <div>
                      <div className="font-mono text-xs font-semibold text-[#3B1C54] dark:text-amber-300">
                        {line.translit}
                      </div>
                      <div className="text-xs text-[#5E526E] dark:text-[#B9AFC7]">
                        {line.translationFr}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  dir="rtl"
                  lang="ar"
                  className="font-arabic text-3xl text-[#1A1325] dark:text-[#F7F3EE] text-right flex flex-wrap items-center gap-2 justify-end"
                >
                  {words.map((word, wIdx) => {
                    const vocalizedWord = vocalizedWords[wIdx] || word;
                    const cleanVocalized = vocalizedWord.replace(/[،.؟!]/g, '').trim();
                    const isInspected = inspectedWord?.arabic === cleanVocalized;
                    const isKaraokeActive = isPlayingThis && karaokeWordIdx === wIdx;
                    return (
                      <button
                        key={wIdx}
                        type="button"
                        data-testid="story-word"
                        onClick={e => handleWordClick(e, word, vocalizedWord)}
                        className={`px-2 py-1 rounded-xl transition-all cursor-pointer ${
                          isKaraokeActive
                            ? 'bg-amber-300/60 dark:bg-amber-500/40 scale-105 font-bold'
                            : isInspected
                            ? 'bg-[#3B1C54] text-white shadow-2xs'
                            : 'hover:bg-[#3B1C54]/10 dark:hover:bg-amber-400/20'
                        }`}
                      >
                        {showVowels ? <ColoredArabic text={word} /> : word}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions: Send Audio to Teacher */}
        <div className="pt-3 border-t border-[#E6DEC8] dark:border-[#2F2340] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#5E526E] dark:text-[#B9AFC7]">
            <BookOpen className="w-4 h-4 text-[#3B1C54] dark:text-amber-300" />
            <span>{activeStory.summaryFr}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  setIsRecording(false);
                  setRecordedSeconds(s => Math.max(4, s));
                } else {
                  setRecordedSeconds(0);
                  setIsRecording(true);
                }
              }}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                  : recordedSeconds > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                  : 'bg-[#FBF8F3] dark:bg-[#120D18] text-[#1A1325] dark:text-[#F7F3EE] border-[#E6DEC8] dark:border-[#352847]'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-[#D97706]" />
              <span>
                {isRecording
                  ? `Stop (${recordedSeconds}s)`
                  : recordedSeconds > 0
                  ? `Audio prêt (${recordedSeconds}s)`
                  : 'Enregistrer ma lecture'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSubmitStoryReading}
              className="px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              <Send className="w-3.5 h-3.5" />
              <span>Envoyer au Professeur</span>
            </button>
          </div>
        </div>

        {submittedNotice && (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Enregistrement transmis au professeur !
          </p>
        )}
      </div>
    </div>
  );
};
