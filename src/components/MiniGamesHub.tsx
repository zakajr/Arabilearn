import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Flame,
  Star,
  RotateCcw,
  Hand,
} from 'lucide-react';
import { LearnerMode } from '../data/copyDeck';
import {
  LETTERS_DATA,
  LetterRecord,
  PROGRESSIVE_WORDS,
  WordRecord,
  createSeededRng,
  filterWordsByUnlockedLetters,
  shuffleWordTilesUntilDifferent,
  splitArabicWordIntoLetterTiles,
} from '../data/lettersAndFamilies';
import {
  GlyphBodyStroke,
  getDotRectSide,
  snapTapToTargetDot,
} from '../lib/strokeMath';
import { speechService } from '../services/speech';
import {
  Mascot,
  PrimaryButton,
  SecondaryButton,
  StarRating,
} from './BlueprintComponents';

export type MiniGameId =
  | 'memoire'
  | 'chasse_points'
  | 'course_fourmi'
  | 'mot_assembler'
  | 'lettre_mystere';

export const MINI_GAMES_CATALOG: {
  id: MiniGameId;
  titleFr: string;
  subtitleFr: string;
  emoji: string;
}[] = [
  {
    id: 'memoire',
    titleFr: 'Mémoire',
    subtitleFr: 'Associe la lettre et son image',
    emoji: '🃏',
  },
  {
    id: 'chasse_points',
    titleFr: 'Chasse aux points',
    subtitleFr: 'Glisse les points sur la lettre',
    emoji: '🎯',
  },
  {
    id: 'course_fourmi',
    titleFr: 'Course de la fourmi',
    subtitleFr: 'Traverse la rivière en 5 sauts',
    emoji: '🐜',
  },
  {
    id: 'mot_assembler',
    titleFr: 'Mot à assembler',
    subtitleFr: 'Glisse les lettres de droite à gauche',
    emoji: '🧩',
  },
  {
    id: 'lettre_mystere',
    titleFr: 'Lettre mystère',
    subtitleFr: 'Glisse pour révéler les traits',
    emoji: '🔍',
  },
];

// 3 variants of French feedback sentences so they do not repeat (Phase F.3)
export const POSITIVE_FEEDBACK_VARIANTS = [
  'Bravo, bien joué !',
  'Excellent coup d’œil !',
  'Super, continue comme ça !',
] as const;

export const RETRY_FEEDBACK_VARIANTS = [
  'Presque, observe bien la lettre !',
  'Essaie encore, tu y es presque !',
  'Écoute bien et réessaie !',
] as const;

export function pickNextNonRepeatingFeedback(
  variants: readonly string[],
  lastSentence: string | null,
  stepIdx: number
): string {
  const candidates = lastSentence
    ? variants.filter((s) => s !== lastSentence)
    : [...variants];
  return candidates[stepIdx % candidates.length] || variants[0];
}

/**
 * PHASE C3 & F1: Picks the next mini-game so a game NEVER repeats twice in a row.
 */
export function pickNextNonRepeatingGame(
  lastGameId?: string | null,
  preferredIndex = 0
): MiniGameId {
  const allIds = MINI_GAMES_CATALOG.map((g) => g.id);
  const candidates = lastGameId
    ? allIds.filter((id) => id !== lastGameId)
    : allIds;
  return candidates[preferredIndex % candidates.length] || 'mot_assembler';
}

/**
 * Helper to weight 60/40 toward letters the learner got wrong most,
 * while avoiding repeating the exact same item within the window.
 */
function pickWeightedUnlockedLetter(
  unlockedLetters: LetterRecord[],
  rng: () => number,
  mistakeWeights: Record<string, number>,
  recentKeys: string[],
  gamePrefix: string
): LetterRecord {
  if (unlockedLetters.length === 1) return unlockedLetters[0];
  const mistakePool = unlockedLetters.filter(
    (l) => (mistakeWeights[l.id] || 0) > 0
  );
  const useMistakePool = mistakePool.length > 0 && rng() < 0.6;
  const sourcePool = useMistakePool ? mistakePool : unlockedLetters;

  const nonRecent = sourcePool.filter(
    (l) => !recentKeys.slice(-20).includes(`${gamePrefix}_${l.id}`)
  );
  const pool = nonRecent.length > 0 ? nonRecent : sourcePool;
  const idx = Math.floor(rng() * pool.length) % pool.length;
  return pool[idx] || unlockedLetters[0];
}

// ============================================================================
// DATA GENERATORS FOR ALL 5 MINI-GAMES (SEEDED, NO-REPEAT, 60/40 WEIGHTED)
// ============================================================================

export interface AssembleRound {
  id: string;
  promptFr: string;
  picture: string;
  targetAr: string;
  targetLetterIds: string[];
  scrambledTiles: {
    tileId: string;
    letterId: string;
    arabicChar: string;
    speechText: string;
  }[];
}

export function buildAssembleMiniGameRounds(
  unlockedLetterIds: string[],
  words: WordRecord[] = PROGRESSIVE_WORDS,
  roundsCount = 5,
  seedStr = '2026-04-01_s1'
): AssembleRound[] {
  const allowedSet = new Set(unlockedLetterIds);
  const unlockedLetters = LETTERS_DATA.filter((l) => allowedSet.has(l.id));
  if (unlockedLetters.length === 0) return [];

  const rng = createSeededRng(`asm_${seedStr}`);
  const validWords = filterWordsByUnlockedLetters(words, unlockedLetterIds);
  const rounds: AssembleRound[] = [];

  for (let i = 0; i < roundsCount; i++) {
    if (i < validWords.length) {
      const w = validWords[(i + Math.floor(rng() * validWords.length)) % validWords.length];
      const rawTileIds = splitArabicWordIntoLetterTiles(w.textAr)
        .map((t) => t.letterId)
        .filter((id) => allowedSet.has(id));
      const targetLetterIds =
        rawTileIds.length >= 2
          ? rawTileIds
          : [
              unlockedLetters[0].id,
              unlockedLetters[1 % unlockedLetters.length].id,
            ];

      const tiles = targetLetterIds.map((lid, idx) => {
        const lObj =
          unlockedLetters.find((l) => l.id === lid) || unlockedLetters[0];
        return {
          tileId: `tile_${i}_${idx}_${lid}`,
          letterId: lObj.id,
          arabicChar: lObj.arabicChar,
          speechText: lObj.speechText,
        };
      });

      const scrambled = shuffleWordTilesUntilDifferent(tiles, i + 1);
      rounds.push({
        id: `asm_${i}_${w.id}`,
        promptFr: `Assemble « ${w.translationFr} »`,
        picture: w.picture || '📖',
        targetAr: w.textAr,
        targetLetterIds,
        scrambledTiles: scrambled,
      });
    } else {
      const l1 = unlockedLetters[i % unlockedLetters.length];
      const l2 = unlockedLetters[(i + 1) % unlockedLetters.length];
      const seq = [l1, l2];
      const tiles = seq.map((lObj, idx) => ({
        tileId: `tile_${i}_${idx}_${lObj.id}`,
        letterId: lObj.id,
        arabicChar: lObj.arabicChar,
        speechText: lObj.speechText,
      }));
      const scrambled = shuffleWordTilesUntilDifferent(tiles, i + 1);
      rounds.push({
        id: `asm_combo_${i}`,
        promptFr: `Assemble ${l1.shortName} + ${l2.shortName}`,
        picture: l1.picture || '✨',
        targetAr: `${l1.arabicChar}${l2.arabicChar}`,
        targetLetterIds: seq.map((l) => l.id),
        scrambledTiles: scrambled,
      });
    }
  }

  return rounds;
}

export interface DotHuntOption {
  id: string;
  dotsCount: 0 | 1 | 2 | 3;
  dotsPosition: 'above' | 'below' | 'none';
  labelFr: string;
  isCorrect: boolean;
}

export interface DotHuntRound {
  id: string;
  letter: LetterRecord;
  options: DotHuntOption[];
}

export function buildDotHuntRounds(
  unlockedLetterIds: string[],
  roundsCount = 5,
  seedStr = '2026-04-01_s1',
  mistakeWeights: Record<string, number> = {}
): DotHuntRound[] {
  const allowedSet = new Set(unlockedLetterIds);
  const unlockedLetters = LETTERS_DATA.filter((l) => allowedSet.has(l.id));
  if (unlockedLetters.length === 0) return [];

  const rng = createSeededRng(`dothunt_${seedStr}`);
  const allConfigs: {
    dotsCount: 0 | 1 | 2 | 3;
    dotsPosition: 'above' | 'below' | 'none';
    labelFr: string;
  }[] = [
    { dotsCount: 0, dotsPosition: 'none', labelFr: 'Sans point' },
    { dotsCount: 1, dotsPosition: 'below', labelFr: '1 point dessous' },
    { dotsCount: 1, dotsPosition: 'above', labelFr: '1 point dessus' },
    { dotsCount: 2, dotsPosition: 'above', labelFr: '2 points dessus' },
    { dotsCount: 3, dotsPosition: 'above', labelFr: '3 points dessus' },
    { dotsCount: 2, dotsPosition: 'below', labelFr: '2 points dessous' },
  ];

  const rounds: DotHuntRound[] = [];
  const recentKeys: string[] = [];
  const correctSlotHistory: number[] = [];

  for (let i = 0; i < roundsCount; i++) {
    const letter = pickWeightedUnlockedLetter(
      unlockedLetters,
      rng,
      mistakeWeights,
      recentKeys,
      'dh'
    );
    recentKeys.push(`dh_${letter.id}`);

    const correctCfg =
      allConfigs.find(
        (c) =>
          c.dotsCount === letter.dots.count &&
          c.dotsPosition === letter.dots.position
      ) || allConfigs[0];

    const wrongCfgs = allConfigs
      .filter(
        (c) =>
          !(
            c.dotsCount === correctCfg.dotsCount &&
            c.dotsPosition === correctCfg.dotsPosition
          )
      )
      .slice(0, 2);

    const optCount = 3;
    let targetSlot = Math.floor(rng() * optCount);
    const n = correctSlotHistory.length;
    if (
      n >= 2 &&
      correctSlotHistory[n - 1] === targetSlot &&
      correctSlotHistory[n - 2] === targetSlot
    ) {
      targetSlot = (targetSlot + 1) % optCount;
    }
    correctSlotHistory.push(targetSlot);

    const options: DotHuntOption[] = [];
    let wIdx = 0;
    for (let s = 0; s < optCount; s++) {
      if (s === targetSlot) {
        options.push({
          id: `dh_${i}_ok`,
          ...correctCfg,
          isCorrect: true,
        });
      } else {
        const w = wrongCfgs[wIdx % wrongCfgs.length];
        wIdx++;
        options.push({
          id: `dh_${i}_w_${s}`,
          ...w,
          isCorrect: false,
        });
      }
    }

    rounds.push({
      id: `dothunt_${i}_${letter.id}`,
      letter,
      options,
    });
  }

  return rounds;
}

export interface AntStreamRound {
  id: string;
  targetLetter: LetterRecord;
  stones: LetterRecord[];
}

export function buildAntStreamRounds(
  unlockedLetterIds: string[],
  roundsCount = 5,
  seedStr = '2026-04-01_s1',
  mistakeWeights: Record<string, number> = {}
): AntStreamRound[] {
  const allowedSet = new Set(unlockedLetterIds);
  const unlockedLetters = LETTERS_DATA.filter((l) => allowedSet.has(l.id));
  if (unlockedLetters.length === 0) return [];

  const rng = createSeededRng(`stream_${seedStr}`);
  const rounds: AntStreamRound[] = [];
  const recentKeys: string[] = [];
  const slotHistory: number[] = [];

  for (let i = 0; i < roundsCount; i++) {
    const target = pickWeightedUnlockedLetter(
      unlockedLetters,
      rng,
      mistakeWeights,
      recentKeys,
      'str'
    );
    recentKeys.push(`str_${target.id}`);

    const others = unlockedLetters
      .filter((l) => l.id !== target.id)
      .slice(0, 2);
    const totalStones = 1 + others.length;
    let targetSlot = Math.floor(rng() * totalStones);
    const n = slotHistory.length;
    if (
      n >= 2 &&
      slotHistory[n - 1] === targetSlot &&
      slotHistory[n - 2] === targetSlot
    ) {
      targetSlot = (targetSlot + 1) % totalStones;
    }
    slotHistory.push(targetSlot);

    const stones: LetterRecord[] = [];
    let oIdx = 0;
    for (let s = 0; s < totalStones; s++) {
      if (s === targetSlot) {
        stones.push(target);
      } else {
        stones.push(others[oIdx % others.length] || target);
        oIdx++;
      }
    }

    rounds.push({
      id: `stream_${i}_${target.id}`,
      targetLetter: target,
      stones,
    });
  }
  return rounds;
}

export interface MysteryLetterRound {
  id: string;
  targetLetter: LetterRecord;
  options: LetterRecord[];
}

export function buildMysteryLetterRounds(
  unlockedLetterIds: string[],
  roundsCount = 5,
  seedStr = '2026-04-01_s1',
  mistakeWeights: Record<string, number> = {}
): MysteryLetterRound[] {
  const allowedSet = new Set(unlockedLetterIds);
  const unlockedLetters = LETTERS_DATA.filter((l) => allowedSet.has(l.id));
  if (unlockedLetters.length === 0) return [];

  const rng = createSeededRng(`mys_${seedStr}`);
  const rounds: MysteryLetterRound[] = [];
  const recentKeys: string[] = [];
  const slotHistory: number[] = [];

  for (let i = 0; i < roundsCount; i++) {
    const target = pickWeightedUnlockedLetter(
      unlockedLetters,
      rng,
      mistakeWeights,
      recentKeys,
      'mys'
    );
    recentKeys.push(`mys_${target.id}`);

    const distractors = unlockedLetters
      .filter((l) => l.id !== target.id)
      .slice(0, 3);
    const totalOpts = 1 + distractors.length;
    let targetSlot = Math.floor(rng() * totalOpts);
    const n = slotHistory.length;
    if (
      n >= 2 &&
      slotHistory[n - 1] === targetSlot &&
      slotHistory[n - 2] === targetSlot
    ) {
      targetSlot = (targetSlot + 1) % totalOpts;
    }
    slotHistory.push(targetSlot);

    const options: LetterRecord[] = [];
    let dIdx = 0;
    for (let s = 0; s < totalOpts; s++) {
      if (s === targetSlot) {
        options.push(target);
      } else {
        options.push(distractors[dIdx % distractors.length] || target);
        dIdx++;
      }
    }

    rounds.push({
      id: `mys_${i}_${target.id}`,
      targetLetter: target,
      options,
    });
  }
  return rounds;
}

export interface MemoryCardItem {
  cardId: string;
  letterId: string;
  kind: 'letter' | 'picture';
  display: string;
  subLabel: string;
  speechText: string;
}

export function buildMemoryDeck(
  unlockedLetterIds: string[],
  seedStr = '2026-04-01_s1'
): MemoryCardItem[] {
  const allowedSet = new Set(unlockedLetterIds);
  const unlockedLetters = LETTERS_DATA.filter((l) => allowedSet.has(l.id));
  if (unlockedLetters.length === 0) return [];

  const rng = createSeededRng(`mem_${seedStr}`);
  const startOffset = Math.floor(rng() * unlockedLetters.length);
  const picked: LetterRecord[] = [
    unlockedLetters[startOffset % unlockedLetters.length],
    unlockedLetters[(startOffset + 1) % unlockedLetters.length],
    unlockedLetters[(startOffset + 2) % unlockedLetters.length],
  ];

  const pairs: MemoryCardItem[] = [];
  picked.forEach((l, idx) => {
    pairs.push({
      cardId: `mem_${idx}_let_${l.id}`,
      letterId: l.id,
      kind: 'letter',
      display: l.arabicChar,
      subLabel: l.shortName,
      speechText: l.speechText,
    });
    pairs.push({
      cardId: `mem_${idx}_pic_${l.id}`,
      letterId: l.id,
      kind: 'picture',
      display: l.picture,
      subLabel: l.keywordFr,
      speechText: l.keyword,
    });
  });

  return [pairs[0], pairs[3], pairs[2], pairs[5], pairs[4], pairs[1]].filter(
    Boolean
  );
}

// ============================================================================
// INTERACTIVE MINI-GAME RUNNER COMPONENT (PHASE C3 & PHASE F)
// ============================================================================

export function MiniGamePlayView({
  gameId,
  unlockedLetterIds,
  words = PROGRESSIVE_WORDS,
  mode,
  sessionSeed,
  mistakeWeights = {},
  onFinishGame,
  onSwitchGame,
}: {
  gameId: MiniGameId;
  unlockedLetterIds: string[];
  words?: WordRecord[];
  mode: LearnerMode;
  sessionSeed?: string;
  mistakeWeights?: Record<string, number>;
  onFinishGame: (earnedStars: 1 | 2 | 3, gameId: MiniGameId) => void;
  onSwitchGame?: (nextGameId: MiniGameId) => void;
}) {
  const [internalSessionCounter, setInternalSessionCounter] = useState<number>(1);
  const effectiveSeed =
    sessionSeed ||
    `${new Date().toISOString().slice(0, 10)}_s${internalSessionCounter}`;

  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [mascotPose, setMascotPose] = useState<
    'wave' | 'cheer' | 'think' | 'oops' | 'sleep'
  >('think');
  const [feedbackSentence, setFeedbackSentence] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'good' | 'bad'>('good');
  const [stepFeedbackCounter, setStepFeedbackCounter] = useState<number>(0);

  // Game 1: Mémoire state
  const memoryDeck = React.useMemo(
    () => buildMemoryDeck(unlockedLetterIds, effectiveSeed),
    [unlockedLetterIds, gameId, effectiveSeed]
  );
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([]);
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);

  // Game 2: Chasse aux points state (DRAG diamond dots onto the letter + option buttons)
  const dotHuntRounds = React.useMemo(
    () =>
      buildDotHuntRounds(unlockedLetterIds, 5, effectiveSeed, mistakeWeights),
    [unlockedLetterIds, effectiveSeed, mistakeWeights]
  );
  const [snappedDotIndices, setSnappedDotIndices] = useState<number[]>([]);
  const [draggingDotOffset, setDraggingDotOffset] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const dotHuntSvgRef = useRef<SVGSVGElement | null>(null);

  // Game 3: Course de la fourmi state (real parabolic hop arc)
  const streamRounds = React.useMemo(
    () =>
      buildAntStreamRounds(unlockedLetterIds, 5, effectiveSeed, mistakeWeights),
    [unlockedLetterIds, effectiveSeed, mistakeWeights]
  );
  const [wobbleStoneId, setWobbleStoneId] = useState<string | null>(null);
  const [antHopArcStoneIdx, setAntHopArcStoneIdx] = useState<number | null>(
    null
  );

  // Game 4: Mot à assembler state (drag or tap tiles with snapping & bounce on success)
  const assembleRounds = React.useMemo(
    () =>
      buildAssembleMiniGameRounds(unlockedLetterIds, words, 5, effectiveSeed),
    [unlockedLetterIds, words, effectiveSeed]
  );
  const [pickedTileIds, setPickedTileIds] = useState<string[]>([]);
  const [wordBounceSuccess, setWordBounceSuccess] = useState<boolean>(false);

  // Game 5: Lettre mystère state (swipe/hold across canvas to reveal strokes; fewer reveals = more stars)
  const mysteryRounds = React.useMemo(
    () =>
      buildMysteryLetterRounds(
        unlockedLetterIds,
        5,
        effectiveSeed,
        mistakeWeights
      ),
    [unlockedLetterIds, effectiveSeed, mistakeWeights]
  );
  const [revealedStrokeStage, setRevealedStrokeStage] = useState<number>(1);
  const [totalExtraRevealsUsed, setTotalExtraRevealsUsed] = useState<number>(0);
  const lastSwipeRevealTsRef = useRef<number>(0);

  useEffect(() => {
    setRoundIdx(0);
    setCombo(0);
    setMaxCombo(0);
    setMistakes(0);
    setGameCompleted(false);
    setFlippedCardIds([]);
    setMatchedCardIds([]);
    setSnappedDotIndices([]);
    setDraggingDotOffset(null);
    setPickedTileIds([]);
    setWordBounceSuccess(false);
    setWobbleStoneId(null);
    setAntHopArcStoneIdx(null);
    setRevealedStrokeStage(1);
    setTotalExtraRevealsUsed(0);
    setMascotPose('think');
    setFeedbackSentence(null);
    setInternalSessionCounter((c) => c + 1);
  }, [gameId]);

  const recordRoundWin = () => {
    speechService.triggerSuccessFeedback('step_ok');
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setMaxCombo((m) => Math.max(m, nextCombo));
    setMascotPose('cheer');

    const nextCount = stepFeedbackCounter + 1;
    setStepFeedbackCounter(nextCount);
    setFeedbackTone('good');
    setFeedbackSentence((prev) =>
      pickNextNonRepeatingFeedback(POSITIVE_FEEDBACK_VARIANTS, prev, nextCount)
    );

    if (roundIdx + 1 >= 5) {
      setGameCompleted(true);
      speechService.triggerSuccessFeedback('letter_done');
    } else {
      setRoundIdx((r) => r + 1);
      setSnappedDotIndices([]);
      setDraggingDotOffset(null);
      setPickedTileIds([]);
      setWordBounceSuccess(false);
      setWobbleStoneId(null);
      setAntHopArcStoneIdx(null);
      setRevealedStrokeStage(1);
    }
  };

  const recordMistake = () => {
    speechService.triggerHaptic('error');
    setCombo(0);
    setMistakes((m) => m + 1);
    setMascotPose('oops');

    const nextCount = stepFeedbackCounter + 1;
    setStepFeedbackCounter(nextCount);
    setFeedbackTone('bad');
    setFeedbackSentence((prev) =>
      pickNextNonRepeatingFeedback(RETRY_FEEDBACK_VARIANTS, prev, nextCount)
    );
  };

  const earnedStars: 1 | 2 | 3 =
    gameId === 'lettre_mystere'
      ? mistakes === 0 && totalExtraRevealsUsed <= 1
        ? 3
        : mistakes <= 2 && totalExtraRevealsUsed <= 4
        ? 2
        : 1
      : mistakes === 0
      ? 3
      : mistakes <= 2
      ? 2
      : 1;

  const gameMeta =
    MINI_GAMES_CATALOG.find((g) => g.id === gameId) || MINI_GAMES_CATALOG[0];

  if (gameCompleted) {
    return (
      <div
        data-testid="minigame-end-screen"
        className="flex flex-col items-center gap-4 text-center py-3"
      >
        <Mascot pose="cheer" size={64} mode={mode} />
        <h3 className="font-display text-[24px] text-[var(--ink)]">
          Bravo ! {gameMeta.titleFr} terminé
        </h3>
        <StarRating stars={earnedStars} />
        <div className="flex items-center justify-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[12px] font-bold flex items-center gap-1.5">
            <Flame className="w-4 h-4 fill-current" />
            <span>Combo max ×{Math.max(1, maxCombo)}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-[var(--good)]/15 text-[var(--good)] font-mono-tag text-[12px] font-bold flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-current" />
            <span>+{earnedStars} étoiles</span>
          </div>
        </div>

        <div className="w-full space-y-2.5 pt-2">
          <PrimaryButton onClick={() => onFinishGame(earnedStars, gameId)}>
            Récupérer mes étoiles
          </PrimaryButton>
          {onSwitchGame && (
            <SecondaryButton
              onClick={() =>
                onSwitchGame(pickNextNonRepeatingGame(gameId, roundIdx + 1))
              }
            >
              Autre jeu
            </SecondaryButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`minigame-container-${gameId}`}
      className="flex flex-col gap-3.5"
    >
      {/* Top HUD: Round 1..5 + Flame Combo Counter + Ant Reaction */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono-tag text-[12px] font-bold text-[var(--brand)]">
          {gameId === 'memoire'
            ? `PAIRES ${matchedCardIds.length / 2}/3`
            : `MANCHE ${roundIdx + 1}/5`}
        </span>

        <div className="flex items-center gap-2">
          {mode === 'kids' && (
            <Mascot pose={mascotPose} size={36} mode={mode} />
          )}
          <div
            data-testid="minigame-combo-badge"
            className="px-3 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[12px] font-bold flex items-center gap-1"
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>COMBO ×{combo}</span>
          </div>
        </div>
      </div>

      {/* Non-repeating French feedback banner (3 variants) */}
      {feedbackSentence && (
        <div
          data-testid="minigame-feedback-banner"
          className={`px-3.5 py-2 rounded-[14px] text-center text-[13px] font-bold transition-all ${
            feedbackTone === 'good'
              ? 'bg-[var(--good)]/15 text-[var(--good)]'
              : 'bg-[var(--bad)]/15 text-[var(--bad)]'
          }`}
        >
          {feedbackSentence}
        </div>
      )}

      {/* 1. MÉMOIRE (flip with animation, matched pairs fly to the side tray) */}
      {gameId === 'memoire' && (
        <div className="space-y-3">
          <p className="text-[15px] font-semibold text-[var(--ink)] text-center">
            Retourne 2 cartes pour associer la lettre et son image repère.
          </p>

          {/* Matched pairs tray on the side */}
          {matchedCardIds.length > 0 && (
            <div
              data-testid="memory-matched-side-tray"
              className="flex items-center justify-end gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--good)]/10 border border-[var(--good)]/30"
            >
              <span className="text-[11px] font-mono-tag font-bold text-[var(--good)] mr-auto">
                Paires rangées :
              </span>
              {memoryDeck
                .filter(
                  (c) =>
                    c.kind === 'letter' && matchedCardIds.includes(c.cardId)
                )
                .map((c) => (
                  <span
                    key={c.cardId}
                    className="px-2 py-0.5 rounded-lg bg-[var(--surface)] border border-[var(--good)] font-arabic text-base font-bold text-[var(--good)] animate-bounce"
                  >
                    {c.display}
                  </span>
                ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            {memoryDeck.map((card) => {
              const isFlipped =
                flippedCardIds.includes(card.cardId) ||
                matchedCardIds.includes(card.cardId);
              const isMatched = matchedCardIds.includes(card.cardId);

              return (
                <button
                  key={card.cardId}
                  type="button"
                  data-testid={`memory-card-${card.cardId}`}
                  aria-label={
                    isFlipped ? `${card.subLabel}` : 'Carte mémoire retournée'
                  }
                  onClick={() => {
                    if (isFlipped || flippedCardIds.length >= 2) return;
                    speechService.speakArabic(card.speechText);
                    const nextFlipped = [...flippedCardIds, card.cardId];
                    setFlippedCardIds(nextFlipped);

                    if (nextFlipped.length === 2) {
                      const c1 = memoryDeck.find(
                        (c) => c.cardId === nextFlipped[0]
                      );
                      const c2 = memoryDeck.find(
                        (c) => c.cardId === nextFlipped[1]
                      );
                      if (c1 && c2 && c1.letterId === c2.letterId) {
                        speechService.triggerSuccessFeedback('stroke_ok');
                        const nextMatched = [
                          ...matchedCardIds,
                          c1.cardId,
                          c2.cardId,
                        ];
                        setMatchedCardIds(nextMatched);
                        setFlippedCardIds([]);
                        const nextCombo = combo + 1;
                        setCombo(nextCombo);
                        setMaxCombo((m) => Math.max(m, nextCombo));
                        setMascotPose('cheer');
                        const nextCount = stepFeedbackCounter + 1;
                        setStepFeedbackCounter(nextCount);
                        setFeedbackTone('good');
                        setFeedbackSentence((prev) =>
                          pickNextNonRepeatingFeedback(
                            POSITIVE_FEEDBACK_VARIANTS,
                            prev,
                            nextCount
                          )
                        );
                        if (nextMatched.length >= memoryDeck.length) {
                          setGameCompleted(true);
                        }
                      } else {
                        recordMistake();
                        window.setTimeout(() => {
                          setFlippedCardIds([]);
                        }, 650);
                      }
                    }
                  }}
                  style={{
                    transform: isMatched
                      ? 'translateX(14px) scale(0.9)'
                      : isFlipped
                      ? 'rotateY(0deg) scale(1.02)'
                      : 'rotateY(0deg) scale(1)',
                  }}
                  className={`min-h-[92px] rounded-[20px] border-2 p-2 flex flex-col items-center justify-center gap-1 pressable cursor-pointer transition-all duration-300 ${
                    isMatched
                      ? 'bg-[var(--good)]/15 border-[var(--good)] opacity-75'
                      : isFlipped
                      ? 'bg-[var(--surface)] border-[var(--brand)] shadow-sm'
                      : 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                  }`}
                >
                  {isFlipped ? (
                    <>
                      <span
                        lang={card.kind === 'letter' ? 'ar' : 'fr'}
                        dir={card.kind === 'letter' ? 'rtl' : 'ltr'}
                        className={
                          card.kind === 'letter'
                            ? 'font-arabic text-[38px] text-[var(--ink)] leading-none'
                            : 'text-[34px] leading-none'
                        }
                      >
                        {card.display}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--ink)]/80 truncate max-w-full">
                        {card.subLabel}
                      </span>
                    </>
                  ) : (
                    <span className="font-display text-[24px] text-[var(--accent)]">
                      ؟
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CHASSE AUX POINTS (DRAG diamond dots onto the letter, snapping to target places + option buttons) */}
      {gameId === 'chasse_points' &&
        (() => {
          const r = dotHuntRounds[roundIdx] || dotHuntRounds[0];
          if (!r) return null;
          const glyph = r.letter.forms.isolated;
          const bodyStrokes = glyph.strokes.filter(
            (s): s is GlyphBodyStroke => s.kind === 'body'
          );
          const dotStrokes = glyph.strokes.filter((s) => s.kind === 'dot');
          const dotSide = getDotRectSide(bodyStrokes[0]?.width ?? 15);
          const targetPositions = dotStrokes.map((d) => d.at);

          const handleDropAtSvgCoord = (svgX: number, svgY: number) => {
            if (dotStrokes.length === 0) {
              recordRoundWin();
              return;
            }
            const snap = snapTapToTargetDot(
              { x: svgX, y: svgY },
              dotStrokes,
              28,
              snappedDotIndices
            );
            if (snap.snapped && snap.targetId !== undefined) {
              speechService.triggerHaptic('stroke_ok');
              const nextSnapped = [...snappedDotIndices, snap.targetId];
              setSnappedDotIndices(nextSnapped);
              if (nextSnapped.length >= dotStrokes.length) {
                recordRoundWin();
              }
            } else {
              recordMistake();
            }
          };

          const renderDotOptionSvg = (opt: DotHuntOption) => {
            const dots: [number, number][] =
              opt.dotsCount === 0
                ? []
                : opt.dotsCount === 1
                ? [[100, opt.dotsPosition === 'below' ? 148 : 66]]
                : opt.dotsCount === 2
                ? [
                    [90, opt.dotsPosition === 'below' ? 148 : 66],
                    [110, opt.dotsPosition === 'below' ? 148 : 66],
                  ]
                : [
                    [88, 68],
                    [112, 68],
                    [100, 52],
                  ];

            return (
              <svg viewBox="0 0 200 200" className="w-14 h-14 shrink-0">
                {bodyStrokes.map((bs) => (
                  <path
                    key={bs.id}
                    d={bs.d}
                    fill="none"
                    stroke="#07463D"
                    strokeWidth={bs.width}
                    strokeLinecap="round"
                  />
                ))}
                {dots.map((pt, idx) => (
                  <g
                    key={idx}
                    transform={`translate(${pt[0]}, ${pt[1]}) rotate(45)`}
                  >
                    <rect
                      x={-dotSide / 2}
                      y={-dotSide / 2}
                      width={dotSide}
                      height={dotSide}
                      rx={1.5}
                      fill="#FFB400"
                    />
                  </g>
                ))}
              </svg>
            );
          };

          return (
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[26px]" aria-hidden="true">
                  {r.letter.picture}
                </span>
                <p className="text-[15px] font-bold text-[var(--ink)]">
                  Glisse le point sur « {r.letter.shortName} » ou choisis la
                  bonne configuration :
                </p>
              </div>

              {/* Interactive Drag-and-Snap Letter Canvas */}
              {targetPositions.length > 0 && (
                <div className="flex items-center justify-center gap-3 bg-[var(--paper)] p-3 rounded-[20px] border border-[var(--line)]">
                  <svg
                    ref={dotHuntSvgRef}
                    viewBox="0 0 200 200"
                    data-testid="dothunt-interactive-canvas"
                    className="w-[128px] h-[128px] rounded-[16px] bg-[var(--surface)] border border-[var(--line)] touch-none cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const sx = ((e.clientX - rect.left) / rect.width) * 200;
                      const sy = ((e.clientY - rect.top) / rect.height) * 200;
                      handleDropAtSvgCoord(sx, sy);
                    }}
                  >
                    {bodyStrokes.map((bs) => (
                      <path
                        key={bs.id}
                        d={bs.d}
                        fill="none"
                        stroke="#07463D"
                        strokeWidth={bs.width}
                        strokeLinecap="round"
                      />
                    ))}
                    {dotStrokes.map((d) => {
                      const isSnapped = snappedDotIndices.includes(d.id);
                      return (
                        <g
                          key={d.id}
                          transform={`translate(${d.at[0]}, ${d.at[1]}) rotate(45)`}
                        >
                          {isSnapped ? (
                            <rect
                              x={-dotSide / 2}
                              y={-dotSide / 2}
                              width={dotSide}
                              height={dotSide}
                              rx={2}
                              fill="#0D5C46"
                            />
                          ) : (
                            <rect
                              x={-dotSide / 2}
                              y={-dotSide / 2}
                              width={dotSide}
                              height={dotSide}
                              rx={2}
                              fill="none"
                              stroke="#D97706"
                              strokeWidth={2}
                              strokeDasharray="3 3"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Draggable diamond dot token */}
                  <button
                    type="button"
                    data-testid="dothunt-draggable-dot"
                    aria-label="Glisser ou toucher pour placer un point sur la lettre"
                    onPointerDown={(e) => {
                      (e.currentTarget as HTMLElement).setPointerCapture?.(
                        e.pointerId
                      );
                      setDraggingDotOffset({ x: 0, y: 0 });
                    }}
                    onPointerMove={(e) => {
                      if (!draggingDotOffset) return;
                      setDraggingDotOffset({
                        x: e.movementX + draggingDotOffset.x,
                        y: e.movementY + draggingDotOffset.y,
                      });
                    }}
                    onPointerUp={(e) => {
                      setDraggingDotOffset(null);
                      const svg = dotHuntSvgRef.current;
                      if (svg) {
                        const rect = svg.getBoundingClientRect();
                        if (
                          e.clientX >= rect.left &&
                          e.clientX <= rect.right &&
                          e.clientY >= rect.top &&
                          e.clientY <= rect.bottom
                        ) {
                          const sx =
                            ((e.clientX - rect.left) / rect.width) * 200;
                          const sy =
                            ((e.clientY - rect.top) / rect.height) * 200;
                          handleDropAtSvgCoord(sx, sy);
                          return;
                        }
                      }
                      const nextDot = dotStrokes.find(
                        (d) => !snappedDotIndices.includes(d.id)
                      );
                      if (nextDot) {
                        handleDropAtSvgCoord(nextDot.at[0], nextDot.at[1]);
                      }
                    }}
                    className="min-w-[64px] min-h-[64px] px-3 py-2 rounded-[16px] bg-[var(--surface)] border-2 border-[var(--accent)] flex flex-col items-center justify-center gap-1 pressable cursor-grab active:cursor-grabbing"
                  >
                    <span className="w-4 h-4 bg-[#0D5C46] rotate-45 block rounded-[2px]" />
                    <span className="text-[11px] font-bold text-[var(--ink)]">
                      Glisser point ({snappedDotIndices.length}/
                      {dotStrokes.length})
                    </span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                {r.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`dothunt-opt-${opt.id}`}
                    onClick={() => {
                      if (opt.isCorrect) {
                        recordRoundWin();
                      } else {
                        recordMistake();
                      }
                    }}
                    className="min-h-[68px] rounded-[18px] bg-[var(--surface)] border-2 border-[var(--line)] px-4 py-2 flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="text-[15px] font-bold text-[var(--ink)]">
                      {opt.labelFr}
                    </span>
                    {renderDotOptionSvg(opt)}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

      {/* 3. COURSE DE LA FOURMI (tap the stone, the ant hops with a real parabolic arc) */}
      {gameId === 'course_fourmi' &&
        (() => {
          const r = streamRounds[roundIdx] || streamRounds[0];
          if (!r) return null;
          return (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-between bg-[var(--paper)] rounded-[18px] p-3 border border-[var(--line)]">
                <div className="flex items-center gap-2">
                  <span className="text-[26px]" aria-hidden="true">
                    {r.targetLetter.picture}
                  </span>
                  <span className="text-[15px] font-bold text-[var(--ink)]">
                    Saute sur « {r.targetLetter.shortName} » ({roundIdx}/5 sauts)
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Écouter ${r.targetLetter.shortName}`}
                  onClick={() =>
                    speechService.speakArabic(r.targetLetter.speechText)
                  }
                  className="w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full bg-[var(--brand-deep)] text-white flex items-center justify-center pressable cursor-pointer"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Stream visualization + Parabolic Ant Hop Arc + Stones */}
              <div className="rounded-[24px] bg-[#0B6B5D]/15 border-2 border-[#0B6B5D]/30 p-4 space-y-4 relative overflow-hidden">
                {/* Parabolic SVG arc indicator when hopping */}
                <svg
                  viewBox="0 0 300 54"
                  className="w-full h-12 overflow-visible pointer-events-none"
                  aria-hidden="true"
                >
                  <path
                    d="M 30 42 Q 150 -8 270 42"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    opacity={0.55}
                  />
                  {[0, 1, 2, 3, 4].map((hop) => {
                    const cx = 30 + hop * 60;
                    const cy =
                      hop === roundIdx && antHopArcStoneIdx !== null ? 14 : 42;
                    return (
                      <g
                        key={hop}
                        transform={`translate(${cx}, ${cy})`}
                        className="transition-all duration-300"
                      >
                        <circle
                          r={14}
                          fill={
                            hop < roundIdx
                              ? '#15803D'
                              : hop === roundIdx
                              ? '#F59E0B'
                              : '#FFFFFF'
                          }
                          stroke="#0D5C46"
                          strokeWidth={2}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={12}
                          fontWeight={800}
                          fill={hop < roundIdx ? '#FFFFFF' : '#111C18'}
                        >
                          {hop === roundIdx ? '🐜' : hop < roundIdx ? '✓' : hop + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="grid grid-cols-3 gap-3">
                  {r.stones.map((stone, sIdx) => {
                    const isWobbling = wobbleStoneId === stone.id;
                    return (
                      <button
                        key={stone.id}
                        type="button"
                        data-testid={`stream-stone-${stone.id}`}
                        aria-label={`Pierre lettre ${stone.shortName}`}
                        onClick={() => {
                          speechService.speakArabic(stone.speechText);
                          if (stone.id === r.targetLetter.id) {
                            setAntHopArcStoneIdx(sIdx);
                            recordRoundWin();
                          } else {
                            recordMistake();
                            setWobbleStoneId(stone.id);
                            window.setTimeout(
                              () => setWobbleStoneId(null),
                              400
                            );
                          }
                        }}
                        className={`min-h-[82px] rounded-full bg-[var(--surface)] border-2 border-[var(--line)] flex flex-col items-center justify-center pressable cursor-pointer shadow-sm transition-transform ${
                          isWobbling
                            ? 'animate-shake border-[var(--bad)]'
                            : ''
                        }`}
                      >
                        <span
                          lang="ar"
                          dir="rtl"
                          className="font-arabic text-[40px] text-[var(--ink)] leading-none"
                        >
                          {stone.arabicChar}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

      {/* 4. MOT À ASSEMBLER (drag or tap tiles with snapping & bounce on success) */}
      {gameId === 'mot_assembler' &&
        (() => {
          const r = assembleRounds[roundIdx] || assembleRounds[0];
          if (!r) return null;

          const selectTile = (tileId: string, speechText: string) => {
            if (pickedTileIds.includes(tileId)) return;
            speechService.speakArabic(speechText);
            const nextPicked = [...pickedTileIds, tileId];
            setPickedTileIds(nextPicked);

            if (nextPicked.length === r.targetLetterIds.length) {
              const chosenLetterIds = nextPicked.map(
                (tid) =>
                  r.scrambledTiles.find((t) => t.tileId === tid)?.letterId
              );
              const isCorrect = r.targetLetterIds.every(
                (expectedId, idx) => chosenLetterIds[idx] === expectedId
              );
              if (isCorrect) {
                setWordBounceSuccess(true);
                recordRoundWin();
              } else {
                recordMistake();
                window.setTimeout(() => setPickedTileIds([]), 420);
              }
            }
          };

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 bg-[var(--paper)] p-3 rounded-[18px] border border-[var(--line)]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[32px] leading-none" aria-hidden="true">
                    {r.picture}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-[15px] text-[var(--ink)] truncate">
                      {r.promptFr}
                    </div>
                    <div className="text-[12px] text-[var(--ink)]/70">
                      {r.targetLetterIds.length} lettres · glisse de droite à
                      gauche
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Écouter le mot"
                  onClick={() => speechService.speakArabic(r.targetAr)}
                  className="w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full bg-[var(--brand-deep)] text-white flex items-center justify-center pressable cursor-pointer shrink-0"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* RTL Assembly Slots with bounce on success */}
              <div
                dir="rtl"
                data-testid="word-builder-slots"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedId = e.dataTransfer.getData('text/plain');
                  const tile = r.scrambledTiles.find(
                    (t) => t.tileId === droppedId
                  );
                  if (tile) selectTile(tile.tileId, tile.speechText);
                }}
                className={`min-h-[76px] p-3 rounded-[20px] bg-[var(--paper)] border-2 border-dashed border-[var(--brand)] flex items-center justify-center gap-2.5 transition-transform ${
                  wordBounceSuccess ? 'scale-105' : ''
                }`}
              >
                {r.targetLetterIds.map((_, slotIdx) => {
                  const pickedTileId = pickedTileIds[slotIdx];
                  const tileObj = r.scrambledTiles.find(
                    (t) => t.tileId === pickedTileId
                  );
                  return (
                    <div
                      key={slotIdx}
                      data-testid={`word-slot-${slotIdx}`}
                      className={`w-[58px] h-[58px] rounded-[16px] flex items-center justify-center font-arabic text-[34px] border-2 transition-transform ${
                        tileObj
                          ? 'bg-[var(--good)]/15 border-[var(--good)] text-[var(--ink)] scale-105'
                          : 'bg-[var(--surface)] border-[var(--line)] text-[var(--locked)]'
                      }`}
                    >
                      {tileObj ? tileObj.arabicChar : slotIdx + 1}
                    </div>
                  );
                })}
              </div>

              {/* Scrambled Draggable + Tappable Letter Tiles */}
              <div
                data-testid="word-builder-tiles"
                className="flex flex-wrap items-center justify-center gap-2.5"
              >
                {r.scrambledTiles.map((tile) => {
                  const used = pickedTileIds.includes(tile.tileId);
                  return (
                    <button
                      key={tile.tileId}
                      type="button"
                      draggable={!used}
                      disabled={used}
                      data-testid={`word-tile-${tile.tileId}`}
                      aria-label={`Choisir la lettre ${tile.arabicChar}`}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', tile.tileId);
                      }}
                      onClick={() => selectTile(tile.tileId, tile.speechText)}
                      className="min-w-[64px] min-h-[64px] px-4 py-2 rounded-[18px] bg-[var(--surface)] border-2 border-[var(--brand)] font-arabic text-[36px] text-[var(--ink)] flex items-center justify-center pressable cursor-grab active:cursor-grabbing disabled:opacity-35"
                    >
                      {tile.arabicChar}
                    </button>
                  );
                })}

                {pickedTileIds.length > 0 && (
                  <button
                    type="button"
                    aria-label="Réinitialiser les lettres"
                    onClick={() => setPickedTileIds([])}
                    className="min-h-[48px] px-3 rounded-[14px] border border-[var(--line)] text-[13px] font-semibold flex items-center gap-1 pressable cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Effacer</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

      {/* 5. LETTRE MYSTÈRE (swipe/hold across canvas to reveal strokes; fewer reveals = more stars) */}
      {gameId === 'lettre_mystere' &&
        (() => {
          const r = mysteryRounds[roundIdx] || mysteryRounds[0];
          if (!r) return null;
          const allStrokes = r.targetLetter.forms.isolated.strokes;
          const visibleStrokes = allStrokes.slice(0, revealedStrokeStage);
          const dotSide = getDotRectSide(15);

          const revealNextStroke = () => {
            if (revealedStrokeStage < allStrokes.length) {
              setRevealedStrokeStage((s) => Math.min(allStrokes.length, s + 1));
              setTotalExtraRevealsUsed((c) => c + 1);
              speechService.triggerHaptic('stroke_ok');
            }
          };

          return (
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold text-[var(--ink)] text-left">
                  Glisse sur la carte pour révéler un trait (moins d’indices =
                  plus d’étoiles)
                </span>
                {revealedStrokeStage < allStrokes.length && (
                  <button
                    type="button"
                    onClick={revealNextStroke}
                    className="min-h-[48px] px-3 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[12px] font-bold text-[var(--brand)] pressable cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>+1 trait</span>
                  </button>
                )}
              </div>

              <div
                data-testid="mystery-swipe-canvas"
                onPointerMove={(e) => {
                  if (e.buttons > 0 || e.pressure > 0) {
                    const now = performance.now();
                    if (now - lastSwipeRevealTsRef.current > 350) {
                      lastSwipeRevealTsRef.current = now;
                      revealNextStroke();
                    }
                  }
                }}
                onClick={revealNextStroke}
                className="w-[152px] h-[152px] mx-auto rounded-[24px] bg-[var(--surface)] border-2 border-[var(--line)] flex items-center justify-center relative touch-none cursor-pointer"
              >
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {visibleStrokes.map((s) =>
                    s.kind === 'body' ? (
                      <path
                        key={s.id}
                        d={s.d}
                        fill="none"
                        stroke="#07463D"
                        strokeWidth={s.width}
                        strokeLinecap="round"
                      />
                    ) : (
                      <g
                        key={s.id}
                        transform={`translate(${s.at[0]}, ${s.at[1]}) rotate(45)`}
                      >
                        <rect
                          x={-dotSide / 2}
                          y={-dotSide / 2}
                          width={dotSide}
                          height={dotSide}
                          rx={1.5}
                          fill="#FFB400"
                        />
                      </g>
                    )
                  )}
                </svg>
                <span className="absolute bottom-1.5 right-2.5 text-[10px] font-mono-tag text-[var(--ink)]/60">
                  {revealedStrokeStage}/{allStrokes.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {r.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`mystery-opt-${opt.id}`}
                    onClick={() => {
                      speechService.speakArabic(opt.speechText);
                      if (opt.id === r.targetLetter.id) {
                        recordRoundWin();
                      } else {
                        recordMistake();
                      }
                    }}
                    className="min-h-[68px] rounded-[18px] bg-[var(--surface)] border-2 border-[var(--line)] px-3 py-2 flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="text-[14px] font-bold text-[var(--ink)]">
                      {opt.shortName}
                    </span>
                    <span
                      lang="ar"
                      dir="rtl"
                      className="font-arabic text-[34px] text-[var(--ink)] leading-none"
                    >
                      {opt.arabicChar}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
