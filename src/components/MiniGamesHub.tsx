import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Flame,
  Star,
  RotateCcw,
  Hand,
  Check,
  Info,
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
  GlyphDotStroke,
  Point2D,
  computeDotCoordinatesForBodyConfig,
  getDotRectSide,
  sampleSvgPathEqualLength,
} from '../lib/strokeMath';
import { getGlyphOutline } from '../lib/fontGlyphs';
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
    subtitleFr: 'Trouve et place les points de la lettre',
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
  translationFr: string;
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
      const w =
        validWords[
          (i + Math.floor(rng() * validWords.length)) % validWords.length
        ];
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
        translationFr: w.translationFr,
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
        translationFr: `${l1.shortName} + ${l2.shortName}`,
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
  roundKind: 'choose_card' | 'place_dots';
  letter: LetterRecord;
  options: DotHuntOption[];
}

export function getDotHuntPromptForLetter(
  letter: LetterRecord,
  roundIdx = 0
): {
  promptFr: string;
  showDragToken: boolean;
} {
  if (roundIdx >= 3) {
    return {
      promptFr: `Place les points de « ${letter.shortName} »`,
      showDragToken: false,
    };
  }
  return {
    promptFr: `Où sont les points de « ${letter.shortName} » ?`,
    showDragToken: false,
  };
}

/**
 * FIX D: Redesign "Chasse aux points"
 * - Pool: ONLY learned letters that HAVE dots (letter.dots.count > 0). Never selects a dotless letter.
 * - Rounds 1-3 (roundIdx 0..2): 'choose_card' — 3 big stacked cards (90px high), each the REAL letter body
 *   with a different dot configuration (count 0-3, above or below). Exactly 1 correct; distractors never equal to correct.
 * - Rounds 4-5 (roundIdx 3..4): 'place_dots' — "Place les points toi-même".
 */
export function buildDotHuntRounds(
  unlockedLetterIds: string[],
  roundsCount = 5,
  seedStr = '2026-04-01_s1',
  mistakeWeights: Record<string, number> = {}
): DotHuntRound[] {
  const allowedSet = new Set(unlockedLetterIds);
  const learnedDotted = LETTERS_DATA.filter(
    (l) => allowedSet.has(l.id) && l.dots.count > 0
  );
  // Phase 3.2: Return [] when < 2 learned letters have dots (UI switches to Mémoire)
  if (learnedDotted.length < 2) {
    return [];
  }
  const dottedPool = learnedDotted;

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
    { dotsCount: 3, dotsPosition: 'below', labelFr: '3 points dessous' },
  ];

  const rounds: DotHuntRound[] = [];
  const recentKeys: string[] = [];
  const correctSlotHistory: number[] = [];

  for (let i = 0; i < roundsCount; i++) {
    const letter = pickWeightedUnlockedLetter(
      dottedPool,
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
      ) || {
        dotsCount: letter.dots.count as 1 | 2 | 3,
        dotsPosition: letter.dots.position,
        labelFr: `${letter.dots.count} point(s)`,
      };

    // Distractors are ALWAYS wrong variants of the same body, distinct from each other
    const candidateWrong = allConfigs.filter(
      (c) =>
        !(
          c.dotsCount === correctCfg.dotsCount &&
          c.dotsPosition === correctCfg.dotsPosition
        )
    );
    const offset = Math.floor(rng() * candidateWrong.length);
    const wrong1 = candidateWrong[offset % candidateWrong.length];
    const wrong2 =
      candidateWrong.find(
        (c, idx) =>
          idx !== offset % candidateWrong.length &&
          !(
            c.dotsCount === wrong1.dotsCount &&
            c.dotsPosition === wrong1.dotsPosition
          )
      ) || candidateWrong[(offset + 1) % candidateWrong.length];
    const wrongCfgs = [wrong1, wrong2];

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
      roundKind: i < 3 ? 'choose_card' : 'place_dots',
      letter,
      options,
    });
  }

  return rounds;
}

/**
 * FIX D (Rounds 4-5): Validates learner-placed custom dots for a dotted letter.
 * Count must equal letter.dots.count AND every dot must be on the correct side (above or below the body)
 * within a generous horizontal tolerance.
 */
export function validateCustomPlacedDotsForLetter(
  letter: LetterRecord,
  placedDots: Point2D[]
): boolean {
  if (placedDots.length !== letter.dots.count) {
    return false;
  }
  const glyph = letter.forms.isolated;
  const bodyStrokes = glyph.strokes.filter(
    (s): s is GlyphBodyStroke => s.kind === 'body'
  );
  const dotStrokes = glyph.strokes.filter(
    (s): s is GlyphDotStroke => s.kind === 'dot'
  );

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const bs of bodyStrokes) {
    const pts = sampleSvgPathEqualLength(bs.d, 32);
    for (const pt of pts) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
  }
  if (!Number.isFinite(minX)) {
    minX = 60;
    maxX = 140;
    minY = 60;
    maxY = 120;
  }
  const midY = (minY + maxY) / 2;

  return placedDots.every((d) => {
    // Check if within generous proximity of any real target dot
    const nearTarget = dotStrokes.some(
      (td) => Math.hypot(d.x - td.at[0], d.y - td.at[1]) <= 46
    );
    if (nearTarget) return true;

    // Generous horizontal tolerance around the body
    const horizOk =
      d.x >= Math.min(18, minX - 48) && d.x <= Math.max(182, maxX + 48);
    if (!horizOk) return false;

    if (letter.dots.position === 'above') {
      return d.y <= midY + 14;
    }
    if (letter.dots.position === 'below') {
      return d.y >= midY - 14;
    }
    return false;
  });
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

export interface RoundAnswerDisplay {
  arabicText: string;
  labelFr: string;
  picture: string;
  wordAr?: string;
  wordFr?: string;
}

function makeAnswerDisplayFromLetter(l: LetterRecord): RoundAnswerDisplay {
  return {
    arabicText: l.arabicChar,
    labelFr: l.shortName,
    picture: l.picture,
    wordAr: l.keyword,
    wordFr: l.keywordFr,
  };
}

// ============================================================================
// INTERACTIVE MINI-GAME RUNNER COMPONENT (FIX C & FIX D)
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
  const [internalSessionCounter, setInternalSessionCounter] =
    useState<number>(1);
  const effectiveSeed =
    sessionSeed ||
    `${new Date().toISOString().slice(0, 10)}_s${internalSessionCounter}`;

  // FIX D: Pool for Chasse aux points uses ONLY learned letters that HAVE dots (dots.count > 0).
  // If fewer than 2 such letters are learned, use "Mémoire" instead and show banner.
  const learnedDottedLetters = React.useMemo(() => {
    const allowedSet = new Set(unlockedLetterIds);
    return LETTERS_DATA.filter(
      (l) => allowedSet.has(l.id) && l.dots.count > 0
    );
  }, [unlockedLetterIds]);

  const isDotHuntFallbackToMemoire =
    gameId === 'chasse_points' && learnedDottedLetters.length < 2;
  const effectiveGameId: MiniGameId = isDotHuntFallbackToMemoire
    ? 'memoire'
    : gameId;

  const [roundIdx, setRoundIdx] = useState<number>(0);
  // FIX C: roundState ('playing' | 'won') and revealedAnswer
  const [roundState, setRoundState] = useState<'playing' | 'won'>('playing');
  const [roundOutcome, setRoundOutcome] = useState<'won' | 'revealed'>('won');
  const [roundMistakes, setRoundMistakes] = useState<number>(0);
  const [revealedAnswer, setRevealedAnswer] =
    useState<RoundAnswerDisplay | null>(null);

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
    [unlockedLetterIds, effectiveGameId, effectiveSeed]
  );
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([]);
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);

  // Game 2: Chasse aux points state (Fix D: Rounds 1-3 card choice, Rounds 4-5 tap to place dots + Valider)
  const dotHuntRounds = React.useMemo(
    () =>
      buildDotHuntRounds(unlockedLetterIds, 5, effectiveSeed, mistakeWeights),
    [unlockedLetterIds, effectiveSeed, mistakeWeights]
  );
  const [selectedDotCardId, setSelectedDotCardId] = useState<string | null>(
    null
  );
  const [placedCustomDots, setPlacedCustomDots] = useState<Point2D[]>([]);
  const [showCorrectDotsOverlay, setShowCorrectDotsOverlay] =
    useState<boolean>(false);

  // Game 3: Course de la fourmi state (real parabolic hop arc + timer before validation panel)
  const streamRounds = React.useMemo(
    () =>
      buildAntStreamRounds(unlockedLetterIds, 5, effectiveSeed, mistakeWeights),
    [unlockedLetterIds, effectiveSeed, mistakeWeights]
  );
  const [wobbleStoneId, setWobbleStoneId] = useState<string | null>(null);
  const [antHopArcStoneIdx, setAntHopArcStoneIdx] = useState<number | null>(
    null
  );
  const [isHopping, setIsHopping] = useState<boolean>(false);
  const hopTimerRef = useRef<number | null>(null);

  // Game 4: Mot à assembler state
  const assembleRounds = React.useMemo(
    () =>
      buildAssembleMiniGameRounds(unlockedLetterIds, words, 5, effectiveSeed),
    [unlockedLetterIds, words, effectiveSeed]
  );
  const [pickedTileIds, setPickedTileIds] = useState<string[]>([]);
  const [wordBounceSuccess, setWordBounceSuccess] = useState<boolean>(false);

  // Game 5: Lettre mystère state
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
    if (hopTimerRef.current) {
      window.clearTimeout(hopTimerRef.current);
      hopTimerRef.current = null;
    }
    setRoundIdx(0);
    setRoundState('playing');
    setRoundOutcome('won');
    setRoundMistakes(0);
    setRevealedAnswer(null);
    setCombo(0);
    setMaxCombo(0);
    setMistakes(0);
    setGameCompleted(false);
    setFlippedCardIds([]);
    setMatchedCardIds([]);
    setSelectedDotCardId(null);
    setPlacedCustomDots([]);
    setShowCorrectDotsOverlay(false);
    setPickedTileIds([]);
    setWordBounceSuccess(false);
    setWobbleStoneId(null);
    setAntHopArcStoneIdx(null);
    setIsHopping(false);
    setRevealedStrokeStage(1);
    setTotalExtraRevealsUsed(0);
    setMascotPose('think');
    setFeedbackSentence(null);
    setInternalSessionCounter((c) => c + 1);
  }, [gameId]);

  useEffect(() => {
    return () => {
      if (hopTimerRef.current) {
        window.clearTimeout(hopTimerRef.current);
      }
    };
  }, []);

  /**
   * FIX C (1, 2, 3, 7):
   * recordRoundWin sets roundState = 'won' and does NOT change roundIdx.
   * Input is locked while 'won'. Only clicking "Continuer" / "Voir mon résultat" advances.
   */
  const recordRoundWin = (answerDisplay: RoundAnswerDisplay) => {
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

    setRevealedAnswer(answerDisplay);
    setRoundOutcome('won');
    setRoundState('won');
  };

  /**
   * FIX C (4):
   * Wrong answer: keep the red message and let the player retry.
   * After 2 mistakes in the same round show the correct answer in the panel
   * (neutral colour, "Voici la réponse") with the same "Continuer" button.
   */
  const recordMistake = (
    answerDisplay: RoundAnswerDisplay,
    onRevealAfterTwoMistakes?: () => void
  ) => {
    speechService.triggerHaptic('error');
    setCombo(0);
    setMistakes((m) => m + 1);
    const nextRoundMistakes = roundMistakes + 1;
    setRoundMistakes(nextRoundMistakes);
    setMascotPose('oops');

    const nextCount = stepFeedbackCounter + 1;
    setStepFeedbackCounter(nextCount);
    setFeedbackTone('bad');
    setFeedbackSentence((prev) =>
      pickNextNonRepeatingFeedback(RETRY_FEEDBACK_VARIANTS, prev, nextCount)
    );

    if (nextRoundMistakes >= 2) {
      onRevealAfterTwoMistakes?.();
      setRevealedAnswer(answerDisplay);
      setRoundOutcome('revealed');
      setRoundState('won');
    }
  };

  const isFinalRoundInGame =
    effectiveGameId === 'memoire'
      ? matchedCardIds.length >= memoryDeck.length || roundIdx >= 2
      : roundIdx >= 4;

  const handleContinueAfterValidation = () => {
    if (roundState !== 'won') return;
    speechService.triggerHaptic('stroke_ok');

    if (isFinalRoundInGame) {
      setRoundState('playing');
      setGameCompleted(true);
      speechService.triggerSuccessFeedback('letter_done');
      return;
    }

    setRoundIdx((r) => r + 1);
    setRoundState('playing');
    setRoundOutcome('won');
    setRoundMistakes(0);
    setRevealedAnswer(null);
    setFeedbackSentence(null);
    setMascotPose('think');
    setFlippedCardIds([]);
    setSelectedDotCardId(null);
    setPlacedCustomDots([]);
    setShowCorrectDotsOverlay(false);
    setPickedTileIds([]);
    setWordBounceSuccess(false);
    setWobbleStoneId(null);
    setAntHopArcStoneIdx(null);
    setIsHopping(false);
    setRevealedStrokeStage(1);
  };

  const earnedStars: 1 | 2 | 3 =
    effectiveGameId === 'lettre_mystere'
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
    MINI_GAMES_CATALOG.find((g) => g.id === effectiveGameId) ||
    MINI_GAMES_CATALOG[0];

  // FIX 1b: If fewer than 3 learned letters, show a card "Apprends d’abord 3 lettres" instead of a game
  if (unlockedLetterIds.length < 3) {
    return (
      <div
        data-testid="minigame-need-3-letters-card"
        className="rounded-[22px] bg-[var(--paper)] border-2 border-[var(--line)] p-6 text-center space-y-3"
      >
        <div className="flex justify-center">
          <Mascot pose="think" size={56} mode={mode} />
        </div>
        <h3 className="font-display text-[22px] text-[var(--ink)]">
          Apprends d’abord 3 lettres
        </h3>
        <p className="text-[14px] text-[var(--ink)]/75 mx-auto">
          Tu as appris {unlockedLetterIds.length} / 3 lettres. Découvre au moins
          3 lettres (étapes Voir et Écouter) pour lancer les mini-jeux sans
          jamais croiser une lettre inconnue.
        </p>
      </div>
    );
  }

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
          <div className="px-3.5 py-1.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[13px] font-bold flex items-center gap-1.5">
            <Flame className="w-4 h-4 fill-current" />
            <span>Combo max ×{Math.max(1, maxCombo)}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-[var(--good)]/15 text-[var(--good)] font-mono-tag text-[13px] font-bold flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-current" />
            <span>+{earnedStars} étoiles</span>
          </div>
        </div>

        <div className="w-full space-y-2.5 pt-2">
          <PrimaryButton
            onClick={() => onFinishGame(earnedStars, effectiveGameId)}
          >
            Récupérer mes étoiles
          </PrimaryButton>
          {onSwitchGame && (
            <SecondaryButton
              onClick={() =>
                onSwitchGame(
                  pickNextNonRepeatingGame(effectiveGameId, roundIdx + 1)
                )
              }
            >
              Autre jeu
            </SecondaryButton>
          )}
        </div>
      </div>
    );
  }

  const inputLocked = roundState === 'won' || isHopping;

  return (
    <div
      data-testid={`minigame-container-${effectiveGameId}`}
      data-round-idx={roundIdx}
      data-round-state={roundState}
      className="flex flex-col gap-3"
    >
      {/* FIX D: Fallback notice when fewer than 2 dotted letters are learned */}
      {isDotHuntFallbackToMemoire && (
        <div
          data-testid="dothunt-fallback-banner"
          className="px-3.5 py-2.5 rounded-[14px] bg-[var(--accent)]/20 border border-[var(--accent)] text-[13px] font-bold text-[var(--ink)] text-center"
        >
          Apprends Baa, Taa ou Thaa pour jouer à Chasse aux points
        </div>
      )}

      {/* Top HUD: Round 1..5 + Flame Combo Counter + Ant Reaction */}
      <div className="flex items-center justify-between gap-2">
        <span
          data-testid="minigame-round-counter"
          className="font-mono-tag text-[13px] font-bold text-[var(--brand)]"
        >
          {effectiveGameId === 'memoire'
            ? `PAIRES ${matchedCardIds.length / 2}/3`
            : `MANCHE ${roundIdx + 1}/5`}
        </span>

        <div className="flex items-center gap-2">
          {mode === 'kids' && roundState === 'playing' && (
            <Mascot pose={mascotPose} size={36} mode={mode} />
          )}
          <div
            data-testid="minigame-combo-badge"
            className="px-3 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[13px] font-bold flex items-center gap-1"
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>COMBO ×{combo}</span>
          </div>
        </div>
      </div>

      {/* Red retry feedback banner while still playing */}
      {roundState === 'playing' &&
        feedbackSentence &&
        feedbackTone === 'bad' && (
          <div
            data-testid="minigame-feedback-banner"
            className="px-3.5 py-2 rounded-[14px] text-center text-[13px] font-bold bg-[var(--bad)]/15 text-[var(--bad)] transition-all"
          >
            {feedbackSentence}
          </div>
        )}

      {/* 1. MÉMOIRE (Fix C: keep cards visible when last pair is matched, show validation panel) */}
      {effectiveGameId === 'memoire' && (
        <div className="space-y-3">
          <p className="text-[15px] font-semibold text-[var(--ink)] text-center">
            Retourne 2 cartes pour associer la lettre et son image repère.
          </p>

          {matchedCardIds.length > 0 && (
            <div
              data-testid="memory-matched-side-tray"
              className="flex items-center justify-end gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--good)]/10 border border-[var(--good)]/30"
            >
              <span className="text-[13px] font-mono-tag font-bold text-[var(--good)] mr-auto">
                Paires trouvées :
              </span>
              {memoryDeck
                .filter(
                  (c) =>
                    c.kind === 'letter' && matchedCardIds.includes(c.cardId)
                )
                .map((c) => (
                  <span
                    key={c.cardId}
                    className="px-2 py-0.5 rounded-lg bg-[var(--surface)] border border-[var(--good)] font-arabic text-base font-bold text-[var(--good)]"
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
                  disabled={inputLocked}
                  data-testid={`memory-card-${card.cardId}`}
                  aria-label={
                    isFlipped ? `${card.subLabel}` : 'Carte mémoire retournée'
                  }
                  onClick={() => {
                    if (inputLocked || isFlipped || flippedCardIds.length >= 2)
                      return;
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
                        const matchedLetter =
                          LETTERS_DATA.find((l) => l.id === c1.letterId) ||
                          LETTERS_DATA[0];
                        const nextMatched = [
                          ...matchedCardIds,
                          c1.cardId,
                          c2.cardId,
                        ];
                        setMatchedCardIds(nextMatched);
                        setFlippedCardIds([]);
                        recordRoundWin(
                          makeAnswerDisplayFromLetter(matchedLetter)
                        );
                      } else {
                        const targetLetterId =
                          c1?.letterId ||
                          memoryDeck.find(
                            (mc) => !matchedCardIds.includes(mc.cardId)
                          )?.letterId ||
                          unlockedLetterIds[0];
                        const targetLetter =
                          LETTERS_DATA.find((l) => l.id === targetLetterId) ||
                          LETTERS_DATA[0];

                        recordMistake(
                          makeAnswerDisplayFromLetter(targetLetter),
                          () => {
                            // Reveal the pair for targetLetter so the board stays consistent
                            const pairCards = memoryDeck
                              .filter((mc) => mc.letterId === targetLetter.id)
                              .map((mc) => mc.cardId);
                            setMatchedCardIds((prev) =>
                              Array.from(new Set([...prev, ...pairCards]))
                            );
                            setFlippedCardIds([]);
                          }
                        );
                        window.setTimeout(() => {
                          setFlippedCardIds([]);
                        }, 550);
                      }
                    }
                  }}
                  className={`min-h-[92px] rounded-[20px] border-2 p-2 flex flex-col items-center justify-center gap-1 pressable cursor-pointer transition-colors duration-200 ${
                    isMatched
                      ? 'bg-[var(--good)]/15 border-[var(--good)]'
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
                      <span className="text-[13px] font-semibold text-[var(--ink)]/80 truncate max-w-full">
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

      {/* 2. CHASSE AUX POINTS — REDESIGNED (FIX D & PHASE 2.3 / 2.4)
          - Rounds 1-3 (roundIdx 0..2): "Choisis le bon point" — 3 big stacked cards (>= 110px wide, >= 96px high),
            each the REAL letter body with a different dot configuration (count 0-3, above or below),
            dots at >= 22 units diagonal.
          - Rounds 4-5 (roundIdx 3..4): "Place les points toi-même" — canvas >= 85% of card width,
            hint text >= 14px. */}
      {effectiveGameId === 'chasse_points' &&
        (() => {
          const r = dotHuntRounds[roundIdx] || dotHuntRounds[0];
          if (!r) return null;
          const glyph = r.letter.forms.isolated;
          const fontOutline = getGlyphOutline(r.letter.id, 'isolated');
          const useFontBody =
            (glyph.renderMode === 'font' || glyph.status === 'aligne') &&
            Boolean(fontOutline.bodyPath);
          const bodyStrokes = glyph.strokes.filter(
            (s): s is GlyphBodyStroke => s.kind === 'body'
          );
          const dotStrokes = glyph.strokes.filter(
            (s): s is GlyphDotStroke => s.kind === 'dot'
          );
          const dotSide = getDotRectSide(bodyStrokes[0]?.width ?? 14);
          const promptInfo = getDotHuntPromptForLetter(r.letter, roundIdx);
          const answerDisplay = makeAnswerDisplayFromLetter(r.letter);

          const renderBodyWithConfigDots = (
            dotsCount: 0 | 1 | 2 | 3,
            dotsPosition: 'above' | 'below' | 'none'
          ) => {
            const coords: [number, number][] =
              dotsCount === r.letter.dots.count &&
              dotsPosition === r.letter.dots.position
                ? dotStrokes.map((ds) => ds.at)
                : computeDotCoordinatesForBodyConfig(
                    glyph,
                    dotsCount,
                    dotsPosition
                  );

            return (
              <svg
                viewBox="0 0 200 200"
                className="w-[84px] h-[84px] min-w-[84px] shrink-0 overflow-visible"
              >
                <line
                  x1="20"
                  y1={glyph.baseline}
                  x2="180"
                  y2={glyph.baseline}
                  stroke="var(--line)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {useFontBody ? (
                  <path d={fontOutline.bodyPath} fill="#07463D" />
                ) : (
                  bodyStrokes.map((bs) => (
                    <path
                      key={bs.id}
                      d={bs.d}
                      fill="none"
                      stroke="#07463D"
                      strokeWidth={bs.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))
                )}
                {coords.map((pt, idx) => (
                  <g
                    key={idx}
                    transform={`translate(${pt[0]}, ${pt[1]}) rotate(45)`}
                  >
                    <rect
                      x={-dotSide / 2}
                      y={-dotSide / 2}
                      width={dotSide}
                      height={dotSide}
                      rx={1.6}
                      fill="#07463D"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </g>
                ))}
              </svg>
            );
          };

          return (
            <div className="space-y-3 text-center">
              {/* Prompt + picture word */}
              <div className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] px-3.5 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 text-left">
                  <span
                    className="text-[28px] leading-none shrink-0"
                    aria-hidden="true"
                  >
                    {r.letter.picture}
                  </span>
                  <div className="min-w-0">
                    <p
                      data-testid="dothunt-prompt-text"
                      className="text-[15px] font-bold text-[var(--ink)] leading-snug"
                    >
                      {promptInfo.promptFr}
                    </p>
                    <p className="text-[13px] font-medium text-[var(--ink)]/75 truncate">
                      {r.letter.keywordFr} ·{' '}
                      <span lang="ar" dir="rtl" className="font-arabic">
                        {r.letter.keyword}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Écouter ${r.letter.shortName}`}
                  onClick={() => speechService.speakArabic(r.letter.speechText)}
                  className="w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full bg-[var(--brand-deep)] text-white flex items-center justify-center pressable cursor-pointer shrink-0"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {r.roundKind === 'choose_card' ? (
                /* ROUNDS 1-3: 3 big stacked cards (>= 110px wide, >= 96px high), each the REAL letter body with a different dot configuration */
                <div
                  data-testid="dothunt-choose-cards-list"
                  className="flex flex-col gap-2.5"
                >
                  {r.options.map((opt) => {
                    const isSelected = selectedDotCardId === opt.id;
                    let cardStyle =
                      'bg-[var(--surface)] border-[var(--line)]';
                    if (roundState === 'won') {
                      if (opt.isCorrect) {
                        cardStyle =
                          'bg-[var(--good)]/15 border-[var(--good)]';
                      } else if (isSelected) {
                        cardStyle = 'bg-[var(--bad)]/15 border-[var(--bad)]';
                      }
                    } else if (isSelected) {
                      cardStyle = 'bg-[var(--bad)]/10 border-[var(--bad)]';
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={inputLocked}
                        data-testid={`dothunt-opt-${opt.id}`}
                        data-is-correct={opt.isCorrect ? 'true' : 'false'}
                        onClick={() => {
                          if (inputLocked) return;
                          setSelectedDotCardId(opt.id);
                          if (opt.isCorrect) {
                            recordRoundWin(answerDisplay);
                          } else {
                            recordMistake(answerDisplay);
                          }
                        }}
                        className={`min-w-[110px] h-[96px] min-h-[96px] w-full rounded-[18px] border-2 px-4 flex items-center justify-between pressable cursor-pointer transition-all ${cardStyle}`}
                      >
                        <span className="text-[15px] font-bold text-[var(--ink)] text-left">
                          {opt.labelFr}
                        </span>
                        {renderBodyWithConfigDots(
                          opt.dotsCount,
                          opt.dotsPosition
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* ROUNDS 4-5: "Place les points toi-même" — canvas >= 85% of card width, hint text >= 14px */
                <div
                  data-testid="dothunt-place-dots-stage"
                  className="flex flex-col items-center gap-2.5 w-full"
                >
                  <p
                    data-testid="dothunt-place-dots-hint"
                    className="text-[14px] font-medium text-[var(--ink)]/85"
                  >
                    Touche autour de la lettre pour poser ou retirer un point (
                    {placedCustomDots.length} posé
                    {placedCustomDots.length > 1 ? 's' : ''})
                  </p>

                  <svg
                    viewBox="0 0 200 200"
                    data-testid="dothunt-interactive-canvas"
                    className="w-[88%] min-w-[85%] max-w-[320px] aspect-square rounded-[22px] bg-[var(--surface)] border-2 border-[var(--line)] touch-none cursor-crosshair mx-auto"
                    onPointerDown={(e) => {
                      if (inputLocked) return;
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const sx =
                        ((e.clientX - rect.left) / Math.max(1, rect.width)) *
                        200;
                      const sy =
                        ((e.clientY - rect.top) / Math.max(1, rect.height)) *
                        200;

                      setShowCorrectDotsOverlay(false);
                      // Tap an existing placed dot to remove it
                      const existingIdx = placedCustomDots.findIndex(
                        (p) => Math.hypot(p.x - sx, p.y - sy) <= 22
                      );
                      if (existingIdx >= 0) {
                        speechService.triggerHaptic('stroke_ok');
                        setPlacedCustomDots((prev) =>
                          prev.filter((_, idx) => idx !== existingIdx)
                        );
                      } else if (placedCustomDots.length < 4) {
                        speechService.triggerHaptic('stroke_ok');
                        setPlacedCustomDots((prev) => [
                          ...prev,
                          { x: Math.round(sx), y: Math.round(sy) },
                        ]);
                      }
                    }}
                  >
                    <line
                      x1="20"
                      y1={glyph.baseline}
                      x2="180"
                      y2={glyph.baseline}
                      stroke="var(--line)"
                      strokeWidth="1.5"
                      strokeDasharray="5 5"
                    />
                    {useFontBody ? (
                      <path d={fontOutline.bodyPath} fill="#07463D" />
                    ) : (
                      bodyStrokes.map((bs) => (
                        <path
                          key={bs.id}
                          d={bs.d}
                          fill="none"
                          stroke="#07463D"
                          strokeWidth={bs.width}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))
                    )}

                    {/* Learner's placed dots */}
                    {placedCustomDots.map((d, idx) => (
                      <g
                        key={`custom_dot_${idx}_${d.x}_${d.y}`}
                        data-testid={`dothunt-placed-dot-${idx}`}
                        transform={`translate(${d.x}, ${d.y}) rotate(45)`}
                      >
                        <g
                          className="dot-pop"
                          style={{
                            transformBox: 'fill-box',
                            transformOrigin: 'center',
                          }}
                        >
                          <rect
                            x={-dotSide / 2}
                            y={-dotSide / 2}
                            width={dotSide}
                            height={dotSide}
                            rx={1.6}
                            fill="#07463D"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        </g>
                      </g>
                    ))}

                    {/* On failure, show the correct dots in green over the answer */}
                    {showCorrectDotsOverlay &&
                      dotStrokes.map((ds, idx) => (
                        <g
                          key={`correct_overlay_${ds.id}_${idx}`}
                          data-testid={`dothunt-correct-dot-${idx}`}
                          transform={`translate(${ds.at[0]}, ${ds.at[1]}) rotate(45)`}
                        >
                          <rect
                            x={-(dotSide + 2) / 2}
                            y={-(dotSide + 2) / 2}
                            width={dotSide + 2}
                            height={dotSide + 2}
                            rx={2}
                            fill="#1FB57A"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        </g>
                      ))}
                  </svg>

                  {roundState === 'playing' && (
                    <div className="w-full flex items-center justify-center gap-2">
                      {placedCustomDots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlacedCustomDots([]);
                            setShowCorrectDotsOverlay(false);
                          }}
                          className="min-h-[48px] px-3.5 rounded-[14px] bg-[var(--surface)] border border-[var(--line)] text-[13px] font-semibold text-[var(--ink)] flex items-center gap-1.5 pressable cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Effacer</span>
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid="dothunt-validate-btn"
                        onClick={() => {
                          if (inputLocked) return;
                          const passed = validateCustomPlacedDotsForLetter(
                            r.letter,
                            placedCustomDots
                          );
                          if (passed) {
                            setShowCorrectDotsOverlay(false);
                            recordRoundWin(answerDisplay);
                          } else {
                            setShowCorrectDotsOverlay(true);
                            recordMistake(answerDisplay);
                          }
                        }}
                        className="flex-1 min-h-[50px] h-[50px] px-5 rounded-[16px] bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-[15px] flex items-center justify-center pressable cursor-pointer"
                      >
                        Valider
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

      {/* 3. COURSE DE LA FOURMI (Fix C item 5: show validation panel after hop animation ends) */}
      {effectiveGameId === 'course_fourmi' &&
        (() => {
          const r = streamRounds[roundIdx] || streamRounds[0];
          if (!r) return null;
          const answerDisplay = makeAnswerDisplayFromLetter(r.targetLetter);

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
                      >
                        <circle
                          r={14}
                          fill={
                            hop < roundIdx ||
                            (hop === roundIdx && roundState === 'won')
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
                          fill={
                            hop < roundIdx ||
                            (hop === roundIdx && roundState === 'won')
                              ? '#FFFFFF'
                              : '#111C18'
                          }
                        >
                          {hop === roundIdx && roundState !== 'won'
                            ? '🐜'
                            : hop <= roundIdx &&
                              (hop < roundIdx || roundState === 'won')
                            ? '✓'
                            : hop + 1}
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
                        disabled={inputLocked}
                        data-testid={`stream-stone-${stone.id}`}
                        aria-label={`Pierre lettre ${stone.shortName}`}
                        onClick={() => {
                          if (inputLocked) return;
                          speechService.speakArabic(stone.speechText);
                          if (stone.id === r.targetLetter.id) {
                            setAntHopArcStoneIdx(sIdx);
                            setIsHopping(true);
                            const hopDelay = (window as unknown as {
                              __NOUQTA_FAST_TEST__?: boolean;
                            }).__NOUQTA_FAST_TEST__
                              ? 0
                              : 240;
                            if (hopDelay === 0) {
                              setIsHopping(false);
                              recordRoundWin(answerDisplay);
                            } else {
                              hopTimerRef.current = window.setTimeout(() => {
                                setIsHopping(false);
                                recordRoundWin(answerDisplay);
                              }, hopDelay);
                            }
                          } else {
                            setWobbleStoneId(stone.id);
                            window.setTimeout(
                              () => setWobbleStoneId(null),
                              380
                            );
                            recordMistake(answerDisplay);
                          }
                        }}
                        className={`min-h-[82px] rounded-full bg-[var(--surface)] border-2 flex flex-col items-center justify-center pressable cursor-pointer shadow-sm transition-transform ${
                          roundState === 'won' &&
                          stone.id === r.targetLetter.id
                            ? 'border-[var(--good)] bg-[var(--good)]/15'
                            : isWobbling
                            ? 'animate-shake border-[var(--bad)]'
                            : 'border-[var(--line)]'
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

      {/* 4. MOT À ASSEMBLER */}
      {effectiveGameId === 'mot_assembler' &&
        (() => {
          const r = assembleRounds[roundIdx] || assembleRounds[0];
          if (!r) return null;
          const answerDisplay: RoundAnswerDisplay = {
            arabicText: r.targetAr,
            labelFr: r.translationFr,
            picture: r.picture,
            wordAr: r.targetAr,
            wordFr: r.translationFr,
          };

          const selectTile = (tileId: string, speechText: string) => {
            if (inputLocked || pickedTileIds.includes(tileId)) return;
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
                recordRoundWin(answerDisplay);
              } else {
                recordMistake(answerDisplay, () => {
                  // Place tiles in correct order when revealed after 2 mistakes
                  const usedSet = new Set<string>();
                  const orderedIds = r.targetLetterIds.map((lid) => {
                    const match = r.scrambledTiles.find(
                      (t) => t.letterId === lid && !usedSet.has(t.tileId)
                    );
                    if (match) {
                      usedSet.add(match.tileId);
                      return match.tileId;
                    }
                    return r.scrambledTiles[0].tileId;
                  });
                  setPickedTileIds(orderedIds);
                });
                window.setTimeout(() => {
                  setPickedTileIds((prev) =>
                    roundMistakes + 1 >= 2 ? prev : []
                  );
                }, 420);
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
                    <div className="text-[13px] text-[var(--ink)]/70">
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
                      draggable={!used && !inputLocked}
                      disabled={used || inputLocked}
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

                {pickedTileIds.length > 0 && roundState === 'playing' && (
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

      {/* 5. LETTRE MYSTÈRE */}
      {effectiveGameId === 'lettre_mystere' &&
        (() => {
          const r = mysteryRounds[roundIdx] || mysteryRounds[0];
          if (!r) return null;
          const allStrokes = r.targetLetter.forms.isolated.strokes;
          const visibleStrokes =
            roundState === 'won'
              ? allStrokes
              : allStrokes.slice(0, revealedStrokeStage);
          const dotSide = getDotRectSide(15);
          const answerDisplay = makeAnswerDisplayFromLetter(r.targetLetter);

          const revealNextStroke = () => {
            if (inputLocked) return;
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
                {revealedStrokeStage < allStrokes.length &&
                  roundState === 'playing' && (
                    <button
                      type="button"
                      onClick={revealNextStroke}
                      className="min-h-[48px] px-3 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[13px] font-bold text-[var(--brand)] pressable cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Hand className="w-3.5 h-3.5" />
                      <span>+1 trait</span>
                    </button>
                  )}
              </div>

              <div
                data-testid="mystery-swipe-canvas"
                onPointerMove={(e) => {
                  if (inputLocked) return;
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
                <span className="absolute bottom-1.5 right-2.5 text-[13px] font-mono-tag text-[var(--ink)]/60">
                  {visibleStrokes.length}/{allStrokes.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {r.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={inputLocked}
                    data-testid={`mystery-opt-${opt.id}`}
                    onClick={() => {
                      if (inputLocked) return;
                      speechService.speakArabic(opt.speechText);
                      if (opt.id === r.targetLetter.id) {
                        recordRoundWin(answerDisplay);
                      } else {
                        recordMistake(answerDisplay);
                      }
                    }}
                    className={`min-h-[68px] rounded-[18px] bg-[var(--surface)] border-2 px-3 py-2 flex items-center justify-between pressable cursor-pointer ${
                      roundState === 'won' && opt.id === r.targetLetter.id
                        ? 'border-[var(--good)] bg-[var(--good)]/15'
                        : 'border-[var(--line)]'
                    }`}
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

      {/* =====================================================================
          FIX C (3, 4, 7): Pinned Validation Panel at the bottom of the game card.
         ===================================================================== */}
      {roundState === 'won' && revealedAnswer && (
        <div
          data-testid="minigame-validation-panel"
          data-outcome={roundOutcome}
          className={`mt-1 rounded-[20px] border-2 p-3.5 flex flex-col gap-3 transition-all ${
            roundOutcome === 'won'
              ? 'bg-[var(--good)]/15 border-[var(--good)]'
              : 'bg-[var(--surface)] border-[var(--line)]'
          }`}
        >
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  roundOutcome === 'won'
                    ? 'bg-[var(--good)] text-white'
                    : 'bg-[var(--ink)]/15 text-[var(--ink)]'
                }`}
              >
                {roundOutcome === 'won' ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>
              <span
                data-testid="minigame-validation-title"
                className={`text-[14px] font-bold truncate ${
                  roundOutcome === 'won'
                    ? 'text-[var(--good)]'
                    : 'text-[var(--ink)]'
                }`}
              >
                {roundOutcome === 'won'
                  ? feedbackSentence || POSITIVE_FEEDBACK_VARIANTS[0]
                  : 'Voici la réponse'}
              </span>
            </div>

            {mode === 'kids' && roundOutcome === 'won' && (
              <Mascot pose="cheer" size={38} mode={mode} />
            )}
          </div>

          {/* Correct answer card (letter, word with its picture) */}
          <div
            data-testid="minigame-validation-answer"
            className="rounded-[14px] bg-[var(--paper)] border border-[var(--line)] px-3 py-2 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="text-[28px] leading-none shrink-0"
                aria-hidden="true"
              >
                {revealedAnswer.picture}
              </span>
              <div className="flex flex-col items-start min-w-0 text-left">
                <span className="text-[14px] font-bold text-[var(--ink)] truncate">
                  {revealedAnswer.labelFr}
                </span>
                {(revealedAnswer.wordFr || revealedAnswer.wordAr) && (
                  <span className="text-[13px] font-medium text-[var(--ink)]/75 truncate">
                    {revealedAnswer.wordFr ? `${revealedAnswer.wordFr} · ` : ''}
                    {revealedAnswer.wordAr && (
                      <span lang="ar" dir="rtl" className="font-arabic">
                        {revealedAnswer.wordAr}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <span
              lang="ar"
              dir="rtl"
              className="font-arabic text-[34px] text-[var(--ink)] leading-none shrink-0"
            >
              {revealedAnswer.arabicText}
            </span>
          </div>

          {/* Saffron "Continuer" / "Voir mon résultat" button */}
          <button
            type="button"
            data-testid="minigame-continue-btn"
            onClick={handleContinueAfterValidation}
            className="w-full min-h-[52px] h-[52px] px-5 rounded-[16px] bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-[15px] flex items-center justify-center pressable cursor-pointer shadow-sm"
          >
            {isFinalRoundInGame ? 'Voir mon résultat' : 'Continuer'}
          </button>
        </div>
      )}
    </div>
  );
}
