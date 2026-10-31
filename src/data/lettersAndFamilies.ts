import { AMIRI_PRECOMPUTED_GLYPHS } from '../lib/fontGlyphsData';
import { getGlyphOutline } from '../lib/fontGlyphs';
import { GlyphForm } from '../lib/strokeMath';

export type FamilyId = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7';

export interface LetterFamily {
  id: FamilyId;
  order: number;
  nameFr: string;
  letters: string[]; // letter IDs in strict order
  teachingFocusFr: string;
  isFree: boolean;
}

export interface LetterRecord {
  id: string;
  order: number;
  family: FamilyId;
  nameFr: string;
  shortName: string;
  codePoint: string;
  arabicChar: string;
  connects: boolean;
  keyword: string;
  keywordFr: string;
  picture: string;
  formsText: {
    isolated: string;
    initial: string;
    medial: string;
    final: string;
  };
  forms: {
    isolated: GlyphForm;
  };
  soundUrl: string | null;
  speechText: string;
  vowels: {
    a: { arabic: string; sound: string };
    i: { arabic: string; sound: string };
    u: { arabic: string; sound: string };
  };
  dots: {
    count: number;
    position: 'above' | 'below' | 'none';
  };
  similarTo: string[];
  videoStrokeAnimationId: string;
  videoPaperUrl: string;
  tip: string; // one line only
}

export interface WordRecord {
  id: string;
  textAr: string;
  translit: string;
  translationFr: string;
  requiredLetters: string[];
  familyId: FamilyId;
  wordType: 'nom' | 'action' | 'syllabe';
  audioText: string;
  picture?: string;
}

export type QuizQuestionType =
  | 'letter_from_sound'
  | 'sound_from_letter'
  | 'dot_placement'
  | 'form_matching'
  | 'odd_one_out'
  | 'vowel_read'
  | 'picture_to_letter'
  | 'letter_to_picture';

export interface QuizQuestion {
  id: string;
  letterId?: string;
  familyId?: FamilyId;
  type: QuizQuestionType;
  kind?: 'hear_and_choose' | 'read_and_choose';
  vowelQuizKind?: 'hear_and_choose' | 'read_and_choose';
  promptFr: string;
  promptArabic?: string;
  promptPicture?: string;
  audioText?: string;
  options: {
    id: string;
    label: string;
    isArabic?: boolean;
    audioText?: string;
    picture?: string;
    arabicWord?: string;
    subLabelFr?: string;
  }[];
  correctIndex: number;
  explanationFr: string;
}

export const LETTER_FAMILIES: LetterFamily[] = [
  {
    id: 'F1',
    order: 1,
    nameFr: 'Racines simples',
    letters: ['alif', 'baa', 'taa', 'thaa'],
    teachingFocusFr: 'Même bateau, différence de points et premières voyelles.',
    isFree: true
  },
  {
    id: 'F2',
    order: 2,
    nameFr: 'Crochets',
    letters: ['jiim', 'haa_soft', 'khaa'],
    teachingFocusFr: 'Forme en crochet ; la position du point change le son.',
    isFree: false
  },
  {
    id: 'F3',
    order: 3,
    nameFr: 'Sans liaison',
    letters: ['daal', 'dhaal', 'raa', 'zaay'],
    teachingFocusFr: 'Lettres qui ne s’attachent jamais à gauche.',
    isFree: false
  },
  {
    id: 'F4',
    order: 4,
    nameFr: 'Dents et ventres',
    letters: ['siin', 'shiin', 'saad', 'daad'],
    teachingFocusFr: 'Trois dents et boucles ; contraste doux et emphatique.',
    isFree: false
  },
  {
    id: 'F5',
    order: 5,
    nameFr: 'Lettres fortes',
    letters: ['taa_emph', 'dhaa_emph', 'ayn', 'ghayn'],
    teachingFocusFr: 'Sons emphatiques et profonds de la gorge.',
    isFree: false
  },
  {
    id: 'F6',
    order: 6,
    nameFr: 'Boucles',
    letters: ['faa', 'qaaf', 'kaaf', 'laam'],
    teachingFocusFr: 'Boucles et grandes tiges verticales.',
    isFree: false
  },
  {
    id: 'F7',
    order: 7,
    nameFr: 'Rondes et finales',
    letters: ['miim', 'nuun', 'haa_breath', 'waaw', 'yaa'],
    teachingFocusFr: 'Formes rondes et porteurs de voyelles longues.',
    isFree: false
  }
];

function makeGlyph(
  letterId: string,
  bodyD: string,
  startDot: [number, number],
  direction: 'rtl' | 'down',
  dots: [number, number][],
  dotPos: 'above' | 'below' | 'inside' | 'none',
  arrangement?: 'none' | 'single' | 'row' | 'triangle_up'
): GlyphForm {
  const precomputed = AMIRI_PRECOMPUTED_GLYPHS[letterId]?.isolated;
  const effectiveDots: [number, number][] = precomputed
    ? precomputed.dots.map((d) => [d.cx, d.cy])
    : dots;
  const inferredArrangement: 'none' | 'single' | 'row' | 'triangle_up' =
    arrangement ??
    (effectiveDots.length === 0
      ? 'none'
      : effectiveDots.length === 1
      ? 'single'
      : effectiveDots.length === 2
      ? 'row'
      : 'triangle_up');
  const dotSize = 22.1; // Phase 2.1: diagonal >= 22 units in the 200x200 lesson canvas
  const bodyStrokes = precomputed
    ? precomputed.strokes.map((st, idx) => ({
        id: idx + 1,
        kind: 'body' as const,
        d: st.d,
        width: 14,
        corridor: 22,
        startDot: [st.startDot[0], st.startDot[1]] as [number, number],
        direction: st.direction
      }))
    : [
        {
          id: 1,
          kind: 'body' as const,
          d: bodyD,
          width: 14,
          corridor: 22,
          startDot,
          direction
        }
      ];

  return {
    letterId,
    form: 'isolated',
    viewBox: '0 0 200 200',
    baseline: precomputed?.baseline ?? 120,
    strokes: [
      ...bodyStrokes,
      ...effectiveDots.map((at, idx) => ({
        id: bodyStrokes.length + idx + 1,
        kind: 'dot' as const,
        at,
        radius: 11.05,
        size: dotSize,
        arrangement: inferredArrangement
      }))
    ],
    dotRule: {
      count: effectiveDots.length,
      position: dotPos === 'inside' ? 'below' : dotPos,
      arrangement: inferredArrangement,
      size: dotSize
    },
    status: 'aligne',
    renderMode: 'font'
  };
}

/**
 * PHASE B6: Visual Anchor (keyword, keywordFr, picture) for every letter (1..28).
 */
export const LETTER_VISUAL_ANCHORS: Record<
  string,
  { keyword: string; keywordFr: string; picture: string }
> = {
  alif: { keyword: 'أسد', keywordFr: 'lion', picture: '🦁' },
  baa: { keyword: 'بيت', keywordFr: 'maison', picture: '🏠' },
  taa: { keyword: 'تفاح', keywordFr: 'pomme', picture: '🍎' },
  thaa: { keyword: 'ثعلب', keywordFr: 'renard', picture: '🦊' },
  jiim: { keyword: 'جمل', keywordFr: 'chameau', picture: '🐪' },
  haa_soft: { keyword: 'حصان', keywordFr: 'cheval', picture: '🐴' },
  khaa: { keyword: 'خروف', keywordFr: 'mouton', picture: '🐑' },
  daal: { keyword: 'دجاجة', keywordFr: 'poule', picture: '🐔' },
  dhaal: { keyword: 'ذرة', keywordFr: 'maïs', picture: '🌽' },
  raa: { keyword: 'ريشة', keywordFr: 'plume', picture: '🪶' },
  zaay: { keyword: 'زرافة', keywordFr: 'girafe', picture: '🦒' },
  siin: { keyword: 'سمكة', keywordFr: 'poisson', picture: '🐟' },
  shiin: { keyword: 'شمس', keywordFr: 'soleil', picture: '☀️' },
  saad: { keyword: 'صقر', keywordFr: 'faucon', picture: '🦅' },
  daad: { keyword: 'ضفدع', keywordFr: 'grenouille', picture: '🐸' },
  taa_emph: { keyword: 'طائرة', keywordFr: 'avion', picture: '✈️' },
  dhaa_emph: { keyword: 'ظرف', keywordFr: 'enveloppe', picture: '✉️' },
  ayn: { keyword: 'عين', keywordFr: 'œil', picture: '👁️' },
  ghayn: { keyword: 'غيمة', keywordFr: 'nuage', picture: '☁️' },
  faa: { keyword: 'فيل', keywordFr: 'éléphant', picture: '🐘' },
  qaaf: { keyword: 'قمر', keywordFr: 'lune', picture: '🌙' },
  kaaf: { keyword: 'كتاب', keywordFr: 'livre', picture: '📖' },
  laam: { keyword: 'ليمون', keywordFr: 'citron', picture: '🍋' },
  miim: { keyword: 'موز', keywordFr: 'banane', picture: '🍌' },
  nuun: { keyword: 'نجمة', keywordFr: 'étoile', picture: '⭐' },
  haa_breath: { keyword: 'هاتف', keywordFr: 'téléphone', picture: '📱' },
  waaw: { keyword: 'وردة', keywordFr: 'rose', picture: '🌹' },
  yaa: { keyword: 'يد', keywordFr: 'main', picture: '✋' }
};

/**
 * Section 6.1: All 28 letters in strict canonical order (1 Alif -> 28 Yaa)
 * Rendered directly from their Unicode code points.
 */
const RAW_LETTERS_DATA: Omit<
  LetterRecord,
  'keyword' | 'keywordFr' | 'picture'
>[] = [
  {
    id: 'alif',
    order: 1,
    family: 'F1',
    nameFr: 'Alif',
    shortName: 'Alif',
    codePoint: 'U+0627',
    arabicChar: '\u0627',
    connects: false,
    formsText: { isolated: 'ا', initial: 'ا', medial: 'ـا', final: 'ـا' },
    forms: {
      isolated: makeGlyph('alif', 'M 100 36 L 100 124', [100, 36], 'down', [], 'none', 'none')
    },
    soundUrl: null,
    speechText: 'أَلِف',
    vowels: {
      a: { arabic: 'أَ', sound: 'a' },
      i: { arabic: 'إِ', sound: 'i' },
      u: { arabic: 'أُ', sound: 'ou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['laam', 'kaaf', 'baa'],
    videoStrokeAnimationId: 'alif_isolated',
    videoPaperUrl: '',
    tip: 'Une tige verticale de haut en bas, sans point.'
  },
  {
    id: 'baa',
    order: 2,
    family: 'F1',
    nameFr: 'Baa',
    shortName: 'Baa',
    codePoint: 'U+0628',
    arabicChar: '\u0628',
    connects: true,
    formsText: { isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب' },
    forms: {
      isolated: makeGlyph(
        'baa',
        'M 164 86 C 158 130, 42 130, 36 86',
        [164, 86],
        'rtl',
        [[100, 152]],
        'below',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'بَاء',
    vowels: {
      a: { arabic: 'بَ', sound: 'ba' },
      i: { arabic: 'بِ', sound: 'bi' },
      u: { arabic: 'بُ', sound: 'bou' }
    },
    dots: { count: 1, position: 'below' },
    similarTo: ['taa', 'thaa', 'nuun'],
    videoStrokeAnimationId: 'baa_isolated',
    videoPaperUrl: '',
    tip: 'Le point est sous la lettre.'
  },
  {
    id: 'taa',
    order: 3,
    family: 'F1',
    nameFr: 'Taa',
    shortName: 'Taa',
    codePoint: 'U+062A',
    arabicChar: '\u062A',
    connects: true,
    formsText: { isolated: 'ت', initial: 'تـ', medial: 'ـتـ', final: 'ـت' },
    forms: {
      isolated: makeGlyph(
        'taa',
        'M 164 88 C 158 136, 42 136, 36 88',
        [164, 88],
        'rtl',
        [
          [118, 56],
          [82, 56]
        ],
        'above',
        'row'
      )
    },
    soundUrl: null,
    speechText: 'تَاء',
    vowels: {
      a: { arabic: 'تَ', sound: 'ta' },
      i: { arabic: 'تِ', sound: 'ti' },
      u: { arabic: 'تُ', sound: 'tou' }
    },
    dots: { count: 2, position: 'above' },
    similarTo: ['baa', 'thaa', 'yaa'],
    videoStrokeAnimationId: 'taa_isolated',
    videoPaperUrl: '',
    tip: 'Deux points posés côte à côte au-dessus du bateau.'
  },
  {
    id: 'thaa',
    order: 4,
    family: 'F1',
    nameFr: 'Thaa',
    shortName: 'Thaa',
    codePoint: 'U+062B',
    arabicChar: '\u062B',
    connects: true,
    formsText: { isolated: 'ث', initial: 'ثـ', medial: 'ـثـ', final: 'ـث' },
    forms: {
      isolated: makeGlyph(
        'thaa',
        'M 164 92 C 158 138, 42 138, 36 92',
        [164, 92],
        'rtl',
        [
          [118, 64],
          [82, 64],
          [100, 34]
        ],
        'above',
        'triangle_up'
      )
    },
    soundUrl: null,
    speechText: 'ثَاء',
    vowels: {
      a: { arabic: 'ثَ', sound: 'tha' },
      i: { arabic: 'ثِ', sound: 'thi' },
      u: { arabic: 'ثُ', sound: 'thou' }
    },
    dots: { count: 3, position: 'above' },
    similarTo: ['baa', 'taa', 'shiin'],
    videoStrokeAnimationId: 'thaa_isolated',
    videoPaperUrl: '',
    tip: 'Trois points en triangle au-dessus.'
  },
  {
    id: 'jiim',
    order: 5,
    family: 'F2',
    nameFr: 'Jiim',
    shortName: 'Jiim',
    codePoint: 'U+062C',
    arabicChar: '\u062C',
    connects: true,
    formsText: { isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج' },
    forms: {
      isolated: makeGlyph(
        'jiim',
        'M 68 62 L 142 62 C 88 86, 52 108, 52 142 C 52 178, 128 180, 154 150',
        [68, 62],
        'rtl',
        [[104, 136]],
        'below',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'جِيم',
    vowels: {
      a: { arabic: 'جَ', sound: 'ja' },
      i: { arabic: 'جِ', sound: 'ji' },
      u: { arabic: 'جُ', sound: 'jou' }
    },
    dots: { count: 1, position: 'below' },
    similarTo: ['haa_soft', 'khaa', 'ayn'],
    videoStrokeAnimationId: 'jiim_isolated',
    videoPaperUrl: '',
    tip: 'Un point au creux du ventre, bien séparé du trait.'
  },
  {
    id: 'haa_soft',
    order: 6,
    family: 'F2',
    nameFr: 'Haa',
    shortName: 'Haa',
    codePoint: 'U+062D',
    arabicChar: '\u062D',
    connects: true,
    formsText: { isolated: 'ح', initial: 'حـ', medial: 'ـحـ', final: 'ـح' },
    forms: {
      isolated: makeGlyph(
        'haa_soft',
        'M 68 62 L 142 62 C 88 86, 52 108, 52 142 C 52 178, 128 180, 154 150',
        [68, 62],
        'rtl',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'حَاء',
    vowels: {
      a: { arabic: 'حَ', sound: 'ha' },
      i: { arabic: 'حِ', sound: 'hi' },
      u: { arabic: 'حُ', sound: 'hou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['jiim', 'khaa', 'haa_breath'],
    videoStrokeAnimationId: 'haa_soft_isolated',
    videoPaperUrl: '',
    tip: 'Même crochet que Jiim, mais sans aucun point.'
  },
  {
    id: 'khaa',
    order: 7,
    family: 'F2',
    nameFr: 'Khaa',
    shortName: 'Khaa',
    codePoint: 'U+062E',
    arabicChar: '\u062E',
    connects: true,
    formsText: { isolated: 'خ', initial: 'خـ', medial: 'ـخـ', final: 'ـخ' },
    forms: {
      isolated: makeGlyph(
        'khaa',
        'M 68 68 L 142 68 C 88 90, 52 112, 52 144 C 52 178, 128 180, 154 152',
        [68, 68],
        'rtl',
        [[105, 38]],
        'above',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'خَاء',
    vowels: {
      a: { arabic: 'خَ', sound: 'kha' },
      i: { arabic: 'خِ', sound: 'khi' },
      u: { arabic: 'خُ', sound: 'khou' }
    },
    dots: { count: 1, position: 'above' },
    similarTo: ['jiim', 'haa_soft', 'ghayn'],
    videoStrokeAnimationId: 'khaa_isolated',
    videoPaperUrl: '',
    tip: 'Un point posé au-dessus de la tête.'
  },
  {
    id: 'daal',
    order: 8,
    family: 'F3',
    nameFr: 'Daal',
    shortName: 'Daal',
    codePoint: 'U+062F',
    arabicChar: '\u062F',
    connects: false,
    formsText: { isolated: 'د', initial: 'د', medial: 'ـد', final: 'ـد' },
    forms: {
      isolated: makeGlyph(
        'daal',
        'M 122 65 C 150 95, 145 120, 72 120',
        [122, 65],
        'rtl',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'دَال',
    vowels: {
      a: { arabic: 'دَ', sound: 'da' },
      i: { arabic: 'دِ', sound: 'di' },
      u: { arabic: 'دُ', sound: 'dou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['dhaal', 'raa', 'zaay'],
    videoStrokeAnimationId: 'daal_isolated',
    videoPaperUrl: '',
    tip: 'Un petit dos plié sur la ligne, sans point.'
  },
  {
    id: 'dhaal',
    order: 9,
    family: 'F3',
    nameFr: 'Dhaal',
    shortName: 'Dhaal',
    codePoint: 'U+0630',
    arabicChar: '\u0630',
    connects: false,
    formsText: { isolated: 'ذ', initial: 'ذ', medial: 'ـذ', final: 'ـذ' },
    forms: {
      isolated: makeGlyph(
        'dhaal',
        'M 122 72 C 150 98, 145 120, 72 120',
        [122, 72],
        'rtl',
        [[112, 42]],
        'above',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'ذَال',
    vowels: {
      a: { arabic: 'ذَ', sound: 'dha' },
      i: { arabic: 'ذِ', sound: 'dhi' },
      u: { arabic: 'ذُ', sound: 'dhou' }
    },
    dots: { count: 1, position: 'above' },
    similarTo: ['daal', 'zaay', 'thaa'],
    videoStrokeAnimationId: 'dhaal_isolated',
    videoPaperUrl: '',
    tip: 'Même forme que Daal avec un point au-dessus.'
  },
  {
    id: 'raa',
    order: 10,
    family: 'F3',
    nameFr: 'Raa',
    shortName: 'Raa',
    codePoint: 'U+0631',
    arabicChar: '\u0631',
    connects: false,
    formsText: { isolated: 'ر', initial: 'ر', medial: 'ـر', final: 'ـر' },
    forms: {
      isolated: makeGlyph(
        'raa',
        'M 128 78 C 132 118, 105 152, 58 164',
        [128, 78],
        'rtl',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'رَاء',
    vowels: {
      a: { arabic: 'رَ', sound: 'ra' },
      i: { arabic: 'رِ', sound: 'ri' },
      u: { arabic: 'رُ', sound: 'rou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['zaay', 'daal', 'waaw'],
    videoStrokeAnimationId: 'raa_isolated',
    videoPaperUrl: '',
    tip: 'Une glissade courbe qui descend sous la ligne.'
  },
  {
    id: 'zaay',
    order: 11,
    family: 'F3',
    nameFr: 'Zaay',
    shortName: 'Zaay',
    codePoint: 'U+0632',
    arabicChar: '\u0632',
    connects: false,
    formsText: { isolated: 'ز', initial: 'ز', medial: 'ـز', final: 'ـز' },
    forms: {
      isolated: makeGlyph(
        'zaay',
        'M 128 82 C 132 118, 105 152, 58 164',
        [128, 82],
        'rtl',
        [[124, 50]],
        'above',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'زَاي',
    vowels: {
      a: { arabic: 'زَ', sound: 'za' },
      i: { arabic: 'زِ', sound: 'zi' },
      u: { arabic: 'زُ', sound: 'zou' }
    },
    dots: { count: 1, position: 'above' },
    similarTo: ['raa', 'dhaal', 'nuun'],
    videoStrokeAnimationId: 'zaay_isolated',
    videoPaperUrl: '',
    tip: 'Même glissade que Raa avec un point au-dessus.'
  },
  {
    id: 'siin',
    order: 12,
    family: 'F4',
    nameFr: 'Siin',
    shortName: 'Siin',
    codePoint: 'U+0633',
    arabicChar: '\u0633',
    connects: true,
    formsText: { isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس' },
    forms: {
      isolated: makeGlyph(
        'siin',
        'M 172 92 Q 156 122 142 92 Q 126 122 112 92 C 110 154, 48 154, 44 102',
        [172, 92],
        'rtl',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'سِين',
    vowels: {
      a: { arabic: 'سَ', sound: 'sa' },
      i: { arabic: 'سِ', sound: 'si' },
      u: { arabic: 'سُ', sound: 'sou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['shiin', 'saad', 'thaa'],
    videoStrokeAnimationId: 'siin_isolated',
    videoPaperUrl: '',
    tip: 'Trois petites dents suivies d’une coupe, sans point.'
  },
  {
    id: 'shiin',
    order: 13,
    family: 'F4',
    nameFr: 'Shiin',
    shortName: 'Shiin',
    codePoint: 'U+0634',
    arabicChar: '\u0634',
    connects: true,
    formsText: { isolated: 'ش', initial: 'شـ', medial: 'ـشـ', final: 'ـش' },
    forms: {
      isolated: makeGlyph(
        'shiin',
        'M 172 102 Q 156 128 142 102 Q 126 128 112 102 C 110 158, 48 158, 44 106',
        [172, 102],
        'rtl',
        [
          [160, 66],
          [124, 66],
          [142, 36]
        ],
        'above',
        'triangle_up'
      )
    },
    soundUrl: null,
    speechText: 'شِين',
    vowels: {
      a: { arabic: 'شَ', sound: 'cha' },
      i: { arabic: 'شِ', sound: 'chi' },
      u: { arabic: 'شُ', sound: 'chou' }
    },
    dots: { count: 3, position: 'above' },
    similarTo: ['siin', 'thaa', 'daad'],
    videoStrokeAnimationId: 'shiin_isolated',
    videoPaperUrl: '',
    tip: 'Trois dents couronnées de trois points.'
  },
  {
    id: 'saad',
    order: 14,
    family: 'F4',
    nameFr: 'Saad',
    shortName: 'Saad',
    codePoint: 'U+0635',
    arabicChar: '\u0635',
    connects: true,
    formsText: { isolated: 'ص', initial: 'صـ', medial: 'ـصـ', final: 'ـص' },
    forms: {
      isolated: makeGlyph(
        'saad',
        'M 122 108 C 145 72, 178 96, 146 116 L 108 116 C 102 160, 44 156, 44 104',
        [122, 108],
        'rtl',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'صَاد',
    vowels: {
      a: { arabic: 'صَ', sound: 'sa' },
      i: { arabic: 'صِ', sound: 'si' },
      u: { arabic: 'صُ', sound: 'sou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['daad', 'siin', 'taa_emph'],
    videoStrokeAnimationId: 'saad_isolated',
    videoPaperUrl: '',
    tip: 'Une boucle ovale suivie d’un grand ventre, sans point.'
  },
  {
    id: 'daad',
    order: 15,
    family: 'F4',
    nameFr: 'Daad',
    shortName: 'Daad',
    codePoint: 'U+0636',
    arabicChar: '\u0636',
    connects: true,
    formsText: { isolated: 'ض', initial: 'ضـ', medial: 'ـضـ', final: 'ـض' },
    forms: {
      isolated: makeGlyph(
        'daad',
        'M 122 110 C 145 78, 178 98, 146 116 L 108 116 C 102 160, 44 156, 44 104',
        [122, 110],
        'rtl',
        [[142, 54]],
        'above',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'ضَاد',
    vowels: {
      a: { arabic: 'ضَ', sound: 'da' },
      i: { arabic: 'ضِ', sound: 'di' },
      u: { arabic: 'ضُ', sound: 'dou' }
    },
    dots: { count: 1, position: 'above' },
    similarTo: ['saad', 'dhaa_emph', 'daal'],
    videoStrokeAnimationId: 'daad_isolated',
    videoPaperUrl: '',
    tip: 'Même forme que Saad avec un point au-dessus.'
  },
  {
    id: 'taa_emph',
    order: 16,
    family: 'F5',
    nameFr: 'Taa emphatique',
    shortName: 'Taa fort',
    codePoint: 'U+0637',
    arabicChar: '\u0637',
    connects: true,
    formsText: { isolated: 'ط', initial: 'طـ', medial: 'ـطـ', final: 'ـط' },
    forms: {
      isolated: makeGlyph(
        'taa_emph',
        'M 118 44 L 118 118 C 148 82, 172 118, 128 120 L 54 120',
        [118, 44],
        'down',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'طَاء',
    vowels: {
      a: { arabic: 'طَ', sound: 'ta' },
      i: { arabic: 'طِ', sound: 'ti' },
      u: { arabic: 'طُ', sound: 'tou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['dhaa_emph', 'taa', 'saad'],
    videoStrokeAnimationId: 'taa_emph_isolated',
    videoPaperUrl: '',
    tip: 'Une boucle surmontée d’un mât vertical, sans point.'
  },
  {
    id: 'dhaa_emph',
    order: 17,
    family: 'F5',
    nameFr: 'Dhaa emphatique',
    shortName: 'Dhaa fort',
    codePoint: 'U+0638',
    arabicChar: '\u0638',
    connects: true,
    formsText: { isolated: 'ظ', initial: 'ظـ', medial: 'ـظـ', final: 'ـظ' },
    forms: {
      isolated: makeGlyph(
        'dhaa_emph',
        'M 118 46 L 118 118 C 148 86, 172 118, 128 120 L 54 120',
        [118, 46],
        'down',
        [[152, 60]],
        'above',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'ظَاء',
    vowels: {
      a: { arabic: 'ظَ', sound: 'dha' },
      i: { arabic: 'ظِ', sound: 'dhi' },
      u: { arabic: 'ظُ', sound: 'dhou' }
    },
    dots: { count: 1, position: 'above' },
    similarTo: ['taa_emph', 'daad', 'dhaal'],
    videoStrokeAnimationId: 'dhaa_emph_isolated',
    videoPaperUrl: '',
    tip: 'Même forme que Taa emphatique avec un point.'
  },
  {
    id: 'ayn',
    order: 18,
    family: 'F5',
    nameFr: 'Ayn',
    shortName: 'Ayn',
    codePoint: 'U+0639',
    arabicChar: '\u0639',
    connects: true,
    formsText: { isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع' },
    forms: {
      isolated: makeGlyph(
        'ayn',
        'M 126 62 C 88 62, 88 98, 126 98 C 72 116, 68 166, 134 166',
        [126, 62],
        'rtl',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'عَين',
    vowels: {
      a: { arabic: 'عَ', sound: 'a' },
      i: { arabic: 'عِ', sound: 'i' },
      u: { arabic: 'عُ', sound: 'ou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['ghayn', 'haa_soft', 'hamza'],
    videoStrokeAnimationId: 'ayn_isolated',
    videoPaperUrl: '',
    tip: 'Deux courbes ouvertes à droite, sans point.'
  },
  {
    id: 'ghayn',
    order: 19,
    family: 'F5',
    nameFr: 'Ghayn',
    shortName: 'Ghayn',
    codePoint: 'U+063A',
    arabicChar: '\u063A',
    connects: true,
    formsText: { isolated: 'غ', initial: 'غـ', medial: 'ـغـ', final: 'ـغ' },
    forms: {
      isolated: makeGlyph(
        'ghayn',
        'M 126 72 C 88 72, 88 104, 126 104 C 72 120, 68 166, 134 166',
        [126, 72],
        'rtl',
        [[108, 40]],
        'above',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'غَين',
    vowels: {
      a: { arabic: 'غَ', sound: 'gha' },
      i: { arabic: 'غِ', sound: 'ghi' },
      u: { arabic: 'غُ', sound: 'ghou' }
    },
    dots: { count: 1, position: 'above' },
    similarTo: ['ayn', 'khaa', 'faa'],
    videoStrokeAnimationId: 'ghayn_isolated',
    videoPaperUrl: '',
    tip: 'Même forme que Ayn avec un point au-dessus.'
  },
  {
    id: 'faa',
    order: 20,
    family: 'F6',
    nameFr: 'Faa',
    shortName: 'Faa',
    codePoint: 'U+0641',
    arabicChar: '\u0641',
    connects: true,
    formsText: { isolated: 'ف', initial: 'فـ', medial: 'ـفـ', final: 'ـف' },
    forms: {
      isolated: makeGlyph(
        'faa',
        'M 146 102 C 146 78, 172 78, 166 110 C 142 126, 64 126, 38 100',
        [146, 102],
        'rtl',
        [[154, 50]],
        'above',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'فَاء',
    vowels: {
      a: { arabic: 'فَ', sound: 'fa' },
      i: { arabic: 'فِ', sound: 'fi' },
      u: { arabic: 'فُ', sound: 'fou' }
    },
    dots: { count: 1, position: 'above' },
    similarTo: ['qaaf', 'baa', 'waaw'],
    videoStrokeAnimationId: 'faa_isolated',
    videoPaperUrl: '',
    tip: 'Une petite tête bouclée et un seul point au-dessus.'
  },
  {
    id: 'qaaf',
    order: 21,
    family: 'F6',
    nameFr: 'Qaaf',
    shortName: 'Qaaf',
    codePoint: 'U+0642',
    arabicChar: '\u0642',
    connects: true,
    formsText: { isolated: 'ق', initial: 'قـ', medial: 'ـقـ', final: 'ـق' },
    forms: {
      isolated: makeGlyph(
        'qaaf',
        'M 146 102 C 146 80, 172 80, 166 110 C 146 158, 66 158, 52 106',
        [146, 102],
        'rtl',
        [
          [158, 46],
          [122, 46]
        ],
        'above',
        'row'
      )
    },
    soundUrl: null,
    speechText: 'قَاف',
    vowels: {
      a: { arabic: 'قَ', sound: 'qa' },
      i: { arabic: 'قِ', sound: 'qi' },
      u: { arabic: 'قُ', sound: 'qou' }
    },
    dots: { count: 2, position: 'above' },
    similarTo: ['faa', 'kaaf', 'nuun'],
    videoStrokeAnimationId: 'qaaf_isolated',
    videoPaperUrl: '',
    tip: 'Une coupe profonde avec deux points côte à côte au-dessus.'
  },
  {
    id: 'kaaf',
    order: 22,
    family: 'F6',
    nameFr: 'Kaaf',
    shortName: 'Kaaf',
    codePoint: 'U+0643',
    arabicChar: '\u0643',
    connects: true,
    formsText: { isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك' },
    forms: {
      isolated: makeGlyph(
        'kaaf',
        'M 116 45 L 124 109 L 118 114 L 106 116 L 79 115',
        [116, 45],
        'down',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'كَاف',
    vowels: {
      a: { arabic: 'كَ', sound: 'ka' },
      i: { arabic: 'كِ', sound: 'ki' },
      u: { arabic: 'كُ', sound: 'kou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['laam', 'qaaf', 'alif'],
    videoStrokeAnimationId: 'kaaf_isolated',
    videoPaperUrl: '',
    tip: 'Une grande équerre et un petit trait intérieur, sans point.'
  },
  {
    id: 'laam',
    order: 23,
    family: 'F6',
    nameFr: 'Laam',
    shortName: 'Laam',
    codePoint: 'U+0644',
    arabicChar: '\u0644',
    connects: true,
    formsText: { isolated: 'ل', initial: 'لـ', medial: 'ـلـ', final: 'ـل' },
    forms: {
      isolated: makeGlyph(
        'laam',
        'M 132 38 L 132 122 C 132 158, 68 158, 68 118',
        [132, 38],
        'down',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'لَام',
    vowels: {
      a: { arabic: 'لَ', sound: 'la' },
      i: { arabic: 'لِ', sound: 'li' },
      u: { arabic: 'لُ', sound: 'lou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['alif', 'kaaf', 'nuun'],
    videoStrokeAnimationId: 'laam_isolated',
    videoPaperUrl: '',
    tip: 'Une haute tige qui finit en crochet sous la ligne.'
  },
  {
    id: 'miim',
    order: 24,
    family: 'F7',
    nameFr: 'Miim',
    shortName: 'Miim',
    codePoint: 'U+0645',
    arabicChar: '\u0645',
    connects: true,
    formsText: { isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم' },
    forms: {
      isolated: makeGlyph(
        'miim',
        'M 122 96 C 148 76, 156 116, 122 116 L 82 116 L 82 166',
        [122, 96],
        'rtl',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'مِيم',
    vowels: {
      a: { arabic: 'مَ', sound: 'ma' },
      i: { arabic: 'مِ', sound: 'mi' },
      u: { arabic: 'مُ', sound: 'mou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['haa_breath', 'waaw', 'faa'],
    videoStrokeAnimationId: 'miim_isolated',
    videoPaperUrl: '',
    tip: 'Une petite perle ronde suivie d’une tige vers le bas.'
  },
  {
    id: 'nuun',
    order: 25,
    family: 'F7',
    nameFr: 'Nuun',
    shortName: 'Nuun',
    codePoint: 'U+0646',
    arabicChar: '\u0646',
    connects: true,
    formsText: { isolated: 'ن', initial: 'نـ', medial: 'ـنـ', final: 'ـن' },
    forms: {
      isolated: makeGlyph(
        'nuun',
        'M 148 96 C 148 156, 52 156, 52 96',
        [148, 96],
        'rtl',
        [[100, 68]],
        'above',
        'single'
      )
    },
    soundUrl: null,
    speechText: 'نُون',
    vowels: {
      a: { arabic: 'نَ', sound: 'na' },
      i: { arabic: 'نِ', sound: 'ni' },
      u: { arabic: 'نُ', sound: 'nou' }
    },
    dots: { count: 1, position: 'above' },
    similarTo: ['baa', 'taa', 'yaa'],
    videoStrokeAnimationId: 'nuun_isolated',
    videoPaperUrl: '',
    tip: 'Un bol arrondi avec un point centré au-dessus.'
  },
  {
    id: 'haa_breath',
    order: 26,
    family: 'F7',
    nameFr: 'Haa expiré',
    shortName: 'Haa souffle',
    codePoint: 'U+0647',
    arabicChar: '\u0647',
    connects: true,
    formsText: { isolated: 'ه', initial: 'هـ', medial: 'ـهـ', final: 'ـه' },
    forms: {
      isolated: makeGlyph(
        'haa_breath',
        'M 100 76 C 144 76, 144 124, 100 124 C 56 124, 56 76, 100 76',
        [100, 76],
        'rtl',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'هَاء',
    vowels: {
      a: { arabic: 'هَ', sound: 'ha' },
      i: { arabic: 'هِ', sound: 'hi' },
      u: { arabic: 'هُ', sound: 'hou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['haa_soft', 'miim', 'waaw'],
    videoStrokeAnimationId: 'haa_breath_isolated',
    videoPaperUrl: '',
    tip: 'Une goutte ronde posée sur la ligne.'
  },
  {
    id: 'waaw',
    order: 27,
    family: 'F7',
    nameFr: 'Waaw',
    shortName: 'Waaw',
    codePoint: 'U+0648',
    arabicChar: '\u0648',
    connects: false,
    formsText: { isolated: 'و', initial: 'و', medial: 'ـو', final: 'ـو' },
    forms: {
      isolated: makeGlyph(
        'waaw',
        'M 122 92 C 122 66, 152 66, 144 98 C 132 142, 86 160, 56 164',
        [122, 92],
        'rtl',
        [],
        'none',
        'none'
      )
    },
    soundUrl: null,
    speechText: 'وَاو',
    vowels: {
      a: { arabic: 'وَ', sound: 'wa' },
      i: { arabic: 'وِ', sound: 'wi' },
      u: { arabic: 'وُ', sound: 'wou' }
    },
    dots: { count: 0, position: 'none' },
    similarTo: ['raa', 'faa', 'qaaf'],
    videoStrokeAnimationId: 'waaw_isolated',
    videoPaperUrl: '',
    tip: 'Une boucle ronde qui glisse comme Raa.'
  },
  {
    id: 'yaa',
    order: 28,
    family: 'F7',
    nameFr: 'Yaa',
    shortName: 'Yaa',
    codePoint: 'U+064A',
    arabicChar: '\u064A',
    connects: true,
    formsText: { isolated: 'ي', initial: 'يـ', medial: 'ـيـ', final: 'ـي' },
    forms: {
      isolated: makeGlyph(
        'yaa',
        'M 136 80 C 162 80, 156 106, 122 108 C 136 138, 58 140, 52 106',
        [136, 80],
        'rtl',
        [
          [118, 168],
          [82, 168]
        ],
        'below',
        'row'
      )
    },
    soundUrl: null,
    speechText: 'يَاء',
    vowels: {
      a: { arabic: 'يَ', sound: 'ya' },
      i: { arabic: 'يِ', sound: 'yi' },
      u: { arabic: 'يُ', sound: 'you' }
    },
    dots: { count: 2, position: 'below' },
    similarTo: ['baa', 'taa', 'nuun'],
    videoStrokeAnimationId: 'yaa_isolated',
    videoPaperUrl: '',
    tip: 'Une courbe souple avec deux points côte à côte en dessous.'
  }
];

export const LETTERS_DATA: LetterRecord[] = RAW_LETTERS_DATA.map((l) => ({
  ...l,
  ...(LETTER_VISUAL_ANCHORS[l.id] || {
    keyword: l.arabicChar,
    keywordFr: l.shortName,
    picture: '✨'
  })
}));

/**
 * PHASE A2: Splits an Arabic word into individual base letter tiles (in RTL reading order, index 0 = rightmost letter).
 * - Harakat (combining marks U+064B..U+065F, U+0670, U+06D6..U+06ED) and tatweel (U+0640) are NOT tiles.
 * - Lam-alif (لا, لأ, لإ, لآ, and presentation ligatures U+FEF5..U+FEFC) counts as 2 tiles: ['laam', 'alif'].
 * - Tile count strictly equals the number of base letters in the word.
 */
const ARABIC_BASE_CHAR_TO_LETTER_ID: Record<string, string> = {
  ا: 'alif',
  أ: 'alif',
  إ: 'alif',
  آ: 'alif',
  ٱ: 'alif',
  ء: 'alif',
  ب: 'baa',
  ت: 'taa',
  ة: 'taa',
  ث: 'thaa',
  ج: 'jiim',
  ح: 'haa_soft',
  خ: 'khaa',
  د: 'daal',
  ذ: 'dhaal',
  ر: 'raa',
  ز: 'zaay',
  س: 'siin',
  ش: 'shiin',
  ص: 'saad',
  ض: 'daad',
  ط: 'taa_emph',
  ظ: 'dhaa_emph',
  ع: 'ayn',
  غ: 'ghayn',
  ف: 'faa',
  ق: 'qaaf',
  ك: 'kaaf',
  ل: 'laam',
  م: 'miim',
  ن: 'nuun',
  ه: 'haa_breath',
  و: 'waaw',
  ؤ: 'waaw',
  ي: 'yaa',
  ى: 'yaa',
  ئ: 'yaa'
};

export interface WordLetterTile {
  index: number;
  letterId: string;
  arabicChar: string;
  shortName: string;
  speechText: string;
}

export function splitArabicWordIntoLetterTiles(
  wordAr: string,
  allLetters: LetterRecord[] = LETTERS_DATA
): WordLetterTile[] {
  // 1. Expand single-codepoint Lam-Alif presentation forms into 2 base letters ('لا')
  const expanded = wordAr.replace(/[\uFEF5-\uFEFC]/g, 'لا');

  // 2. Strip harakat combining marks, tatweel, and whitespace
  const stripped = expanded.replace(
    /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\s]/g,
    ''
  );

  // 3. Map each base letter in RTL reading order
  const chars = Array.from(stripped);
  const tiles: WordLetterTile[] = [];

  for (const ch of chars) {
    const lid = ARABIC_BASE_CHAR_TO_LETTER_ID[ch];
    if (!lid) continue;
    const rec = allLetters.find((l) => l.id === lid);
    if (!rec) continue;
    tiles.push({
      index: tiles.length,
      letterId: rec.id,
      arabicChar: rec.arabicChar,
      shortName: rec.shortName,
      speechText: rec.speechText
    });
  }

  return tiles;
}

/**
 * PHASE A2: Shuffles an array of letter tiles until the shuffled order differs from the target order
 * (whenever there are at least 2 distinct letters).
 */
export function shuffleWordTilesUntilDifferent<
  T extends { letterId: string }
>(tiles: T[], seed = 1): T[] {
  if (tiles.length <= 1) return [...tiles];
  const targetSig = tiles.map((t) => t.letterId).join(',');
  const hasDistinct = new Set(tiles.map((t) => t.letterId)).size > 1;
  if (!hasDistinct) {
    return [...tiles].reverse();
  }

  // Deterministic Fisher-Yates shuffle with fallback rotations until order differs
  const result = [...tiles];
  for (let attempt = 0; attempt < 12; attempt++) {
    for (let i = result.length - 1; i > 0; i--) {
      const j = (seed * 17 + attempt * 13 + i * 7) % (i + 1);
      const tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    if (result.map((t) => t.letterId).join(',') !== targetSig) {
      return result;
    }
  }

  // Guaranteed fallback: swap first two distinct elements
  const fallback = [...tiles];
  for (let i = 1; i < fallback.length; i++) {
    if (fallback[i].letterId !== fallback[0].letterId) {
      const tmp = fallback[0];
      fallback[0] = fallback[i];
      fallback[i] = tmp;
      break;
    }
  }
  return fallback;
}

/**
 * PHASE B6 & D1: Splits an Arabic keyword into { before, match, after } with Zero-Width Joiners (\u200D)
 * so the target letter can be highlighted in saffron inside the word while preserving Arabic cursive joining.
 */
const NON_CONNECTING_LEFT_CHARS = new Set([
  'ا',
  'أ',
  'إ',
  'آ',
  'ٱ',
  'د',
  'ذ',
  'ر',
  'ز',
  'و',
  'ؤ',
  'ء'
]);

export function splitKeywordForHighlight(
  keywordAr: string,
  letterIdOrChar: string
): {
  before: string;
  match: string;
  after: string;
  position: 'isolated' | 'initial' | 'medial' | 'final';
} {
  const targetId =
    ARABIC_BASE_CHAR_TO_LETTER_ID[letterIdOrChar] || letterIdOrChar;

  // Cluster each base char with any immediately following harakat
  const clusters: { text: string; baseChar: string; mappedId: string | undefined }[] = [];
  for (const ch of Array.from(keywordAr)) {
    if (/[\u064B-\u065F\u0670\u06D6-\u06ED]/.test(ch) && clusters.length > 0) {
      clusters[clusters.length - 1].text += ch;
    } else {
      clusters.push({
        text: ch,
        baseChar: ch,
        mappedId: ARABIC_BASE_CHAR_TO_LETTER_ID[ch]
      });
    }
  }

  const idx = clusters.findIndex(
    (c) => c.mappedId === targetId || c.baseChar === letterIdOrChar
  );
  if (idx === -1) {
    return {
      before: '',
      match: keywordAr,
      after: '',
      position: 'isolated'
    };
  }

  const rawBefore = clusters
    .slice(0, idx)
    .map((c) => c.text)
    .join('');
  const rawMatch = clusters[idx].text;
  const rawAfter = clusters
    .slice(idx + 1)
    .map((c) => c.text)
    .join('');

  const prevConnectsLeft =
    idx > 0 && !NON_CONNECTING_LEFT_CHARS.has(clusters[idx - 1].baseChar);
  const matchConnectsLeft =
    idx < clusters.length - 1 &&
    !NON_CONNECTING_LEFT_CHARS.has(clusters[idx].baseChar);

  const joinerBefore = prevConnectsLeft ? '\u200D' : '';
  const joinerAfter = matchConnectsLeft ? '\u200D' : '';

  let position: 'isolated' | 'initial' | 'medial' | 'final' = 'isolated';
  if (idx === 0 && clusters.length > 1) position = 'initial';
  else if (idx > 0 && idx < clusters.length - 1) position = 'medial';
  else if (idx === clusters.length - 1 && clusters.length > 1) position = 'final';

  return {
    before: rawBefore ? `${rawBefore}${joinerBefore}` : '',
    match: `${joinerBefore}${rawMatch}${joinerAfter}`,
    after: rawAfter ? `${joinerAfter}${rawAfter}` : '',
    position
  };
}

/**
 * PHASE D1: Generates draft stroke data for the 4 positional forms (isolée, début, milieu, fin).
 * Non-connecting letters (Alif, Daal, Dhaal, Raa, Zaay, Waaw) return only isolée + fin.
 * Marks positional forms as isDraft: true per D1 ("Mark any stroke data that is a draft").
 */
export type PositionalFormKey = 'isolated' | 'initial' | 'medial' | 'final';

export interface PositionalFormSpec {
  key: PositionalFormKey;
  labelFr: 'Isolée' | 'Début' | 'Milieu' | 'Fin';
  arabicDisplay: string;
  svgPathD: string;
  bodyPath: string;
  dots: { cx: number; cy: number; path: string }[];
  baseline: number;
  isDraft: boolean;
}

export function getPositionalFormsForLetter(
  letter: LetterRecord
): PositionalFormSpec[] {
  const buildSpec = (
    key: PositionalFormKey,
    labelFr: 'Isolée' | 'Début' | 'Milieu' | 'Fin',
    arabicDisplay: string
  ): PositionalFormSpec => {
    const outline = getGlyphOutline(letter.id, key);
    const pre = AMIRI_PRECOMPUTED_GLYPHS[letter.id]?.[key];
    const centerD =
      pre?.strokes?.[0]?.d ||
      letter.forms.isolated.strokes.find((s) => s.kind === 'body')?.d ||
      'M 140 90 L 60 90';
    return {
      key,
      labelFr,
      arabicDisplay,
      svgPathD: centerD,
      bodyPath: outline.bodyPath,
      dots: outline.dots.map((d) => ({ cx: d.cx, cy: d.cy, path: d.path })),
      baseline: outline.baseline,
      isDraft: false
    };
  };

  const isolatedSpec = buildSpec('isolated', 'Isolée', letter.formsText.isolated);
  const finalSpec = buildSpec('final', 'Fin', letter.formsText.final);

  if (!letter.connects) {
    return [isolatedSpec, finalSpec];
  }

  const initialSpec = buildSpec('initial', 'Début', letter.formsText.initial);
  const medialSpec = buildSpec('medial', 'Milieu', letter.formsText.medial);

  return [isolatedSpec, initialSpec, medialSpec, finalSpec];
}

/**
 * PHASE D2 & PHASE G: 3-card dedicated lesson "Les voyelles courtes" (Harakat) unlocked after Family 1.
 * Includes the SVG path for the ant drawing each mark and syllable reading of the 4 letters of Family 1.
 */
export const HARAKAT_MINI_LESSON_CARDS = [
  {
    id: 'fatha',
    nameFr: 'Fatha (trait en haut)',
    markUnicode: '\u064E',
    sampleAr: 'بَ',
    soundFr: 'ba',
    ruleFr: 'Un petit trait au-dessus donne le son « a ».',
    antMarkSvgPath: 'M 118 44 L 82 58',
    family1Syllables: [
      { letterId: 'alif', arabic: 'أَ', soundFr: 'a' },
      { letterId: 'baa', arabic: 'بَ', soundFr: 'ba' },
      { letterId: 'taa', arabic: 'تَ', soundFr: 'ta' },
      { letterId: 'thaa', arabic: 'ثَ', soundFr: 'tha' }
    ]
  },
  {
    id: 'kasra',
    nameFr: 'Kasra (trait en bas)',
    markUnicode: '\u0650',
    sampleAr: 'بِ',
    soundFr: 'bi',
    ruleFr: 'Un petit trait en dessous donne le son « i ».',
    antMarkSvgPath: 'M 118 156 L 82 170',
    family1Syllables: [
      { letterId: 'alif', arabic: 'إِ', soundFr: 'i' },
      { letterId: 'baa', arabic: 'بِ', soundFr: 'bi' },
      { letterId: 'taa', arabic: 'تِ', soundFr: 'ti' },
      { letterId: 'thaa', arabic: 'ثِ', soundFr: 'thi' }
    ]
  },
  {
    id: 'damma',
    nameFr: 'Damma (petite boucle)',
    markUnicode: '\u064F',
    sampleAr: 'بُ',
    soundFr: 'bou',
    ruleFr: 'Une petite boucle au-dessus donne le son « ou ».',
    antMarkSvgPath: 'M 104 48 C 104 34, 122 34, 118 50 C 112 62, 92 66, 80 68',
    family1Syllables: [
      { letterId: 'alif', arabic: 'أُ', soundFr: 'ou' },
      { letterId: 'baa', arabic: 'بُ', soundFr: 'bou' },
      { letterId: 'taa', arabic: 'تُ', soundFr: 'tou' },
      { letterId: 'thaa', arabic: 'ثُ', soundFr: 'thou' }
    ]
  }
];

/**
 * Section 6.4 & Phase A2 Progressive Vocabulary Rule:
 * Includes words of 2, 3, 4, and 5 letters (with and without harakat, and with lam-alif).
 */
export const PROGRESSIVE_WORDS: WordRecord[] = [
  // 2-letter words (Family F1)
  {
    id: 'w_ab',
    textAr: 'أَب',
    translit: 'Ab',
    translationFr: 'Père',
    requiredLetters: ['alif', 'baa'],
    familyId: 'F1',
    wordType: 'nom',
    audioText: 'أَب',
    picture: '👨'
  },
  // 3-letter words (Family F1)
  {
    id: 'w_baab',
    textAr: 'بَاب',
    translit: 'Bāb',
    translationFr: 'Porte',
    requiredLetters: ['alif', 'baa'],
    familyId: 'F1',
    wordType: 'nom',
    audioText: 'بَاب',
    picture: '🚪'
  },
  {
    id: 'w_taab',
    textAr: 'تَابَ',
    translit: 'Tāba',
    translationFr: 'Revenir',
    requiredLetters: ['alif', 'baa', 'taa'],
    familyId: 'F1',
    wordType: 'action',
    audioText: 'تَابَ',
    picture: '🔄'
  },
  // 4-letter word (Family F1)
  {
    id: 'w_thabaat',
    textAr: 'ثَبَات',
    translit: 'Thabāt',
    translationFr: 'Fermeté',
    requiredLetters: ['alif', 'baa', 'taa', 'thaa'],
    familyId: 'F1',
    wordType: 'nom',
    audioText: 'ثَبَات',
    picture: '⛰️'
  },
  // Family F2 (+ Jiim, Haa_soft, Khaa)
  {
    id: 'w_taaj',
    textAr: 'تَاج',
    translit: 'Tāj',
    translationFr: 'Couronne',
    requiredLetters: ['alif', 'taa', 'jiim'],
    familyId: 'F2',
    wordType: 'nom',
    audioText: 'تَاج',
    picture: '👑'
  },
  {
    id: 'w_hajj',
    textAr: 'حَجّ',
    translit: 'Ḥajj',
    translationFr: 'Pèlerinage',
    requiredLetters: ['jiim', 'haa_soft'],
    familyId: 'F2',
    wordType: 'nom',
    audioText: 'حَجّ',
    picture: '🕋'
  },
  {
    id: 'w_akh',
    textAr: 'أَخ',
    translit: 'Akh',
    translationFr: 'Frère',
    requiredLetters: ['alif', 'khaa'],
    familyId: 'F2',
    wordType: 'nom',
    audioText: 'أَخ',
    picture: '👦'
  },
  // Family F3 (+ Daal, Dhaal, Raa, Zaay)
  {
    id: 'w_badr',
    textAr: 'بَدْر',
    translit: 'Badr',
    translationFr: 'Pleine lune',
    requiredLetters: ['baa', 'daal', 'raa'],
    familyId: 'F3',
    wordType: 'nom',
    audioText: 'بَدْر',
    picture: '🌕'
  },
  {
    id: 'w_bahr',
    textAr: 'بَحْر',
    translit: 'Baḥr',
    translationFr: 'Mer',
    requiredLetters: ['baa', 'haa_soft', 'raa'],
    familyId: 'F3',
    wordType: 'nom',
    audioText: 'بَحْر',
    picture: '🌊'
  },
  {
    id: 'w_khubz',
    textAr: 'خُبْز',
    translit: 'Khubz',
    translationFr: 'Pain',
    requiredLetters: ['khaa', 'baa', 'zaay'],
    familyId: 'F3',
    wordType: 'nom',
    audioText: 'خُبْز',
    picture: '🍞'
  },
  // Family F4 (+ Siin, Shiin, Saad, Daad)
  {
    id: 'w_asad',
    textAr: 'أَسَد',
    translit: 'Asad',
    translationFr: 'Lion',
    requiredLetters: ['alif', 'siin', 'daal'],
    familyId: 'F4',
    wordType: 'nom',
    audioText: 'أَسَد',
    picture: '🦁'
  },
  {
    id: 'w_dars',
    textAr: 'دَرْس',
    translit: 'Dars',
    translationFr: 'Leçon',
    requiredLetters: ['daal', 'raa', 'siin'],
    familyId: 'F4',
    wordType: 'nom',
    audioText: 'دَرْس',
    picture: '📘'
  },
  {
    id: 'w_shajar',
    textAr: 'شَجَر',
    translit: 'Shajar',
    translationFr: 'Arbre',
    requiredLetters: ['shiin', 'jiim', 'raa'],
    familyId: 'F4',
    wordType: 'nom',
    audioText: 'شَجَر',
    picture: '🌳'
  },
  {
    id: 'w_sabr',
    textAr: 'صَبْر',
    translit: 'Ṣabr',
    translationFr: 'Patience',
    requiredLetters: ['saad', 'baa', 'raa'],
    familyId: 'F4',
    wordType: 'nom',
    audioText: 'صَبْر',
    picture: '🌿'
  },
  // 5-letter word (Family F4: ت ف ا ح ة = 5 letters)
  {
    id: 'w_tuffaaha',
    textAr: 'تُفَّاحَة',
    translit: 'Tuffāḥa',
    translationFr: 'Pomme',
    requiredLetters: ['taa', 'faa', 'alif', 'haa_soft'],
    familyId: 'F6',
    wordType: 'nom',
    audioText: 'تُفَّاحَة',
    picture: '🍎'
  },
  // Family F5 (+ Taa_emph, Dhaa_emph, Ayn, Ghayn)
  {
    id: 'w_rabi',
    textAr: 'رَبِيع',
    translit: 'Rabīʿ',
    translationFr: 'Printemps',
    requiredLetters: ['raa', 'baa', 'ayn', 'yaa'],
    familyId: 'F5',
    wordType: 'nom',
    audioText: 'رَبِيع',
    picture: '🌸'
  },
  // Family F6 (+ Faa, Qaaf, Kaaf, Laam)
  {
    id: 'w_kitaab',
    textAr: 'كِتَاب',
    translit: 'Kitāb',
    translationFr: 'Livre',
    requiredLetters: ['kaaf', 'taa', 'alif', 'baa'],
    familyId: 'F6',
    wordType: 'nom',
    audioText: 'كِتَاب',
    picture: '📖'
  },
  {
    id: 'w_qalb',
    textAr: 'قَلْب',
    translit: 'Qalb',
    translationFr: 'Cœur',
    requiredLetters: ['qaaf', 'laam', 'baa'],
    familyId: 'F6',
    wordType: 'nom',
    audioText: 'قَلْب',
    picture: '❤️'
  },
  // Family F7 (+ Miim, Nuun, Haa_breath, Waaw, Yaa)
  {
    id: 'w_yad',
    textAr: 'يَد',
    translit: 'Yad',
    translationFr: 'Main',
    requiredLetters: ['yaa', 'daal'],
    familyId: 'F7',
    wordType: 'nom',
    audioText: 'يَد',
    picture: '✋'
  },
  {
    id: 'w_qalam',
    textAr: 'قَلَم',
    translit: 'Qalam',
    translationFr: 'Stylo',
    requiredLetters: ['qaaf', 'laam', 'miim'],
    familyId: 'F7',
    wordType: 'nom',
    audioText: 'قَلَم',
    picture: '✒️'
  },
  {
    id: 'w_bayt',
    textAr: 'بَيْت',
    translit: 'Bayt',
    translationFr: 'Maison',
    requiredLetters: ['baa', 'yaa', 'taa'],
    familyId: 'F7',
    wordType: 'nom',
    audioText: 'بَيْت',
    picture: '🏠'
  },
  {
    id: 'w_salaam',
    textAr: 'سَلَام',
    translit: 'Salām',
    translationFr: 'Paix',
    requiredLetters: ['siin', 'laam', 'alif', 'miim'],
    familyId: 'F7',
    wordType: 'nom',
    audioText: 'سَلَام',
    picture: '🕊️'
  },
  // 5-letter words (Family F7: م ف ت ا ح = 5 letters; م د ر س ة = 5 letters)
  {
    id: 'w_miftaah',
    textAr: 'مِفْتَاح',
    translit: 'Miftāḥ',
    translationFr: 'Clé',
    requiredLetters: ['miim', 'faa', 'taa', 'alif', 'haa_soft'],
    familyId: 'F7',
    wordType: 'nom',
    audioText: 'مِفْتَاح',
    picture: '🔑'
  },
  {
    id: 'w_madrasa',
    textAr: 'مَدْرَسَة',
    translit: 'Madrasa',
    translationFr: 'École',
    requiredLetters: ['miim', 'daal', 'raa', 'siin', 'taa'],
    familyId: 'F7',
    wordType: 'nom',
    audioText: 'مَدْرَسَة',
    picture: '🏫'
  },
  {
    id: 'w_nuur',
    textAr: 'نُور',
    translit: 'Nūr',
    translationFr: 'Lumière',
    requiredLetters: ['nuun', 'waaw', 'raa'],
    familyId: 'F7',
    wordType: 'nom',
    audioText: 'نُور',
    picture: '✨'
  }
];

/**
 * Pure function implementing Section 6.4 Progressive Vocabulary Rule.
 * Returns only words whose requiredLetters are a subset of the learner's unlocked/active letters.
 */
export function filterWordsByUnlockedLetters(
  words: WordRecord[],
  unlockedLetterIds: string[]
): WordRecord[] {
  const allowed = new Set(unlockedLetterIds);
  return words.filter((w) =>
    w.requiredLetters.every((reqId) => allowed.has(reqId))
  );
}

/**
 * Helper to place the correct option at a target index (`0..options.length-1`)
 * so the correct answer is never in the same position 3 times in a row (Phase B7).
 */
function placeCorrectAtSlot<T>(
  correctOption: T,
  wrongOptions: T[],
  targetSlot: number
): { options: T[]; correctIndex: number } {
  const total = 1 + wrongOptions.length;
  const clampedSlot = ((targetSlot % total) + total) % total;
  const options: T[] = [];
  let wIdx = 0;
  for (let i = 0; i < total; i++) {
    if (i === clampedSlot) {
      options.push(correctOption);
    } else {
      options.push(wrongOptions[wIdx++]);
    }
  }
  return { options, correctIndex: clampedSlot };
}

/**
 * Generates a single question of a requested `QuizQuestionType` for a given `LetterRecord`
 * and places the correct answer at `targetCorrectSlot` (Phase B6, B7 & D2).
 */
export function buildSingleTypedQuestion(
  letter: LetterRecord,
  qType: QuizQuestionType,
  targetCorrectSlot: number,
  allLetters: LetterRecord[] = LETTERS_DATA,
  maxOptions = 4
): QuizQuestion {
  const numWrong = Math.max(2, maxOptions - 1);
  const similarPool = letter.similarTo
    .map((id) => allLetters.find((l) => l.id === id))
    .filter((l): l is LetterRecord => Boolean(l));
  const otherPool = allLetters.filter(
    (l) => l.id !== letter.id && !letter.similarTo.includes(l.id)
  );
  const distractors = [...similarPool, ...otherPool].slice(0, numWrong);

  switch (qType) {
    case 'letter_from_sound': {
      const correctOpt = {
        id: letter.id,
        label: letter.arabicChar,
        isArabic: true,
        audioText: letter.speechText
      };
      const wrongOpts = distractors.map((d) => ({
        id: d.id,
        label: d.arabicChar,
        isArabic: true,
        audioText: d.speechText
      }));
      const placed = placeCorrectAtSlot(
        correctOpt,
        wrongOpts,
        targetCorrectSlot
      );
      return {
        id: `q_${letter.id}_lfs_${targetCorrectSlot}`,
        letterId: letter.id,
        familyId: letter.family,
        type: 'letter_from_sound',
        promptFr: `Écoutez et touchez ${letter.shortName}`,
        audioText: letter.speechText,
        options: placed.options,
        correctIndex: placed.correctIndex,
        explanationFr: letter.tip
      };
    }

    case 'sound_from_letter': {
      const correctOpt = {
        id: letter.id,
        label: letter.shortName,
        isArabic: false,
        audioText: letter.speechText
      };
      const wrongOpts = distractors.map((d) => ({
        id: d.id,
        label: d.shortName,
        isArabic: false,
        audioText: d.speechText
      }));
      const placed = placeCorrectAtSlot(
        correctOpt,
        wrongOpts,
        targetCorrectSlot
      );
      return {
        id: `q_${letter.id}_sfl_${targetCorrectSlot}`,
        letterId: letter.id,
        familyId: letter.family,
        type: 'sound_from_letter',
        promptFr: 'Comment s’appelle cette lettre ?',
        promptArabic: letter.arabicChar,
        audioText: letter.speechText,
        options: placed.options,
        correctIndex: placed.correctIndex,
        explanationFr: `${letter.arabicChar} est la lettre ${letter.shortName}.`
      };
    }

    case 'picture_to_letter': {
      const correctOpt = {
        id: letter.id,
        label: `${letter.arabicChar} (${letter.shortName})`,
        isArabic: true,
        audioText: letter.speechText,
        picture: letter.picture,
        arabicWord: letter.arabicChar,
        subLabelFr: letter.shortName
      };
      const wrongOpts = distractors.map((d) => ({
        id: d.id,
        label: `${d.arabicChar} (${d.shortName})`,
        isArabic: true,
        audioText: d.speechText,
        picture: d.picture,
        arabicWord: d.arabicChar,
        subLabelFr: d.shortName
      }));
      const placed = placeCorrectAtSlot(
        correctOpt,
        wrongOpts,
        targetCorrectSlot
      );
      return {
        id: `q_${letter.id}_p2l_${targetCorrectSlot}`,
        letterId: letter.id,
        familyId: letter.family,
        type: 'picture_to_letter',
        promptFr: `Quelle lettre est dans « ${letter.keywordFr} » (${letter.picture} ${letter.keyword}) ?`,
        promptPicture: letter.picture,
        promptArabic: letter.keyword,
        audioText: letter.keyword,
        options: placed.options,
        correctIndex: placed.correctIndex,
        explanationFr: `${letter.picture} ${letter.keyword} (${letter.keywordFr}) contient ${letter.shortName}.`
      };
    }

    case 'letter_to_picture': {
      // PHASE E.3: Show each option as picture + Arabic word with the French word in small text, so the learner practices reading.
      const correctOpt = {
        id: letter.id,
        label: `${letter.picture} ${letter.keyword} — ${letter.keywordFr}`,
        isArabic: false,
        audioText: letter.keyword,
        picture: letter.picture,
        arabicWord: letter.keyword,
        subLabelFr: letter.keywordFr
      };
      const wrongOpts = distractors.map((d) => ({
        id: d.id,
        label: `${d.picture} ${d.keyword} — ${d.keywordFr}`,
        isArabic: false,
        audioText: d.keyword,
        picture: d.picture,
        arabicWord: d.keyword,
        subLabelFr: d.keywordFr
      }));
      const placed = placeCorrectAtSlot(
        correctOpt,
        wrongOpts,
        targetCorrectSlot
      );
      return {
        id: `q_${letter.id}_l2p_${targetCorrectSlot}`,
        letterId: letter.id,
        familyId: letter.family,
        type: 'letter_to_picture',
        promptFr: `Quel mot correspond à la lettre ${letter.shortName} (${letter.arabicChar}) ?`,
        promptArabic: letter.arabicChar,
        audioText: letter.speechText,
        options: placed.options,
        correctIndex: placed.correctIndex,
        explanationFr: `${letter.arabicChar} comme dans ${letter.picture} ${letter.keyword} (${letter.keywordFr}).`
      };
    }

    case 'dot_placement': {
      const dotDesc =
        letter.dots.count === 0
          ? 'Aucun point'
          : letter.dots.count === 1
          ? letter.dots.position === 'below'
            ? '1 point en dessous'
            : '1 point au-dessus'
          : `${letter.dots.count} points au-${
              letter.dots.position === 'below' ? 'dessous' : 'dessus'
            }`;

      const altDotOptions = [
        'Aucun point',
        '1 point en dessous',
        '2 points au-dessus',
        '3 points au-dessus',
        '1 point au-dessus',
        '2 points en dessous'
      ].filter((d) => d !== dotDesc);

      const correctOpt = {
        id: 'dot_ok',
        label: dotDesc,
        isArabic: false
      };
      const wrongOpts = altDotOptions.slice(0, numWrong).map((label, idx) => ({
        id: `dot_w_${idx}`,
        label,
        isArabic: false
      }));
      const placed = placeCorrectAtSlot(
        correctOpt,
        wrongOpts,
        targetCorrectSlot
      );
      return {
        id: `q_${letter.id}_dot_${targetCorrectSlot}`,
        letterId: letter.id,
        familyId: letter.family,
        type: 'dot_placement',
        promptFr: `Combien de points porte ${letter.shortName} ?`,
        promptArabic: letter.arabicChar,
        audioText: letter.speechText,
        options: placed.options,
        correctIndex: placed.correctIndex,
        explanationFr: letter.tip
      };
    }

    case 'odd_one_out': {
      // Find a letter from a different family (or different dot rule if only one family is unlocked)
      const sameFam = allLetters.filter(
        (l) => l.family === letter.family && l.id !== letter.id
      );
      const diffFam =
        allLetters.find((l) => l.family !== letter.family) ||
        allLetters.find((l) => l.dots.count !== letter.dots.count) ||
        allLetters.find((l) => l.id !== letter.id) ||
        letter;
      const correctOpt = {
        id: diffFam.id,
        label: `${diffFam.arabicChar} (${diffFam.shortName})`,
        isArabic: true,
        audioText: diffFam.speechText
      };
      const wrongPool = [
        letter,
        ...sameFam.filter((l) => l.id !== diffFam.id)
      ].slice(0, numWrong);
      const wrongOpts = wrongPool.map((w) => ({
        id: w.id,
        label: `${w.arabicChar} (${w.shortName})`,
        isArabic: true,
        audioText: w.speechText
      }));
      const placed = placeCorrectAtSlot(
        correctOpt,
        wrongOpts,
        targetCorrectSlot
      );
      return {
        id: `q_${letter.id}_odd_${targetCorrectSlot}`,
        letterId: letter.id,
        familyId: letter.family,
        type: 'odd_one_out',
        promptFr: 'Trouvez l’intrus parmi ces lettres :',
        options: placed.options,
        correctIndex: placed.correctIndex,
        explanationFr: `${diffFam.shortName} se distingue des autres.`
      };
    }

    case 'vowel_read':
    default: {
      // Phase 3.1: Two question kinds only, never mixed:
      // - hear_and_choose: speaker button; options are the 3 syllable glyphs (no transliteration)
      // - read_and_choose: show the syllable glyph in the prompt; options are 3 transliterations as text
      const vowelList = [
        { key: 'a', arabic: letter.vowels.a.arabic, sound: letter.vowels.a.sound, markName: 'Fatha' },
        { key: 'i', arabic: letter.vowels.i.arabic, sound: letter.vowels.i.sound, markName: 'Kasra' },
        { key: 'u', arabic: letter.vowels.u.arabic, sound: letter.vowels.u.sound, markName: 'Damma' }
      ];
      const targetIdx = (letter.order + targetCorrectSlot) % 3;
      const targetV = vowelList[targetIdx];
      const otherVs = vowelList.filter((_, idx) => idx !== targetIdx);
      const isHearAndChoose = targetCorrectSlot % 2 === 0;

      if (isHearAndChoose) {
        const correctOpt = {
          id: `v_hear_${targetV.key}`,
          label: targetV.arabic,
          isArabic: true,
          audioText: targetV.arabic
        };
        const wrongOpts = otherVs.map((v) => ({
          id: `v_hear_${v.key}`,
          label: v.arabic,
          isArabic: true,
          audioText: v.arabic
        }));
        const placed = placeCorrectAtSlot(
          correctOpt,
          wrongOpts,
          targetCorrectSlot % 3
        );
        return {
          id: `q_${letter.id}_vow_hear_${targetCorrectSlot}`,
          letterId: letter.id,
          familyId: letter.family,
          type: 'vowel_read',
          kind: 'hear_and_choose',
          vowelQuizKind: 'hear_and_choose',
          promptFr: 'Écoutez et choisissez la syllabe entendue :',
          audioText: targetV.arabic,
          options: placed.options,
          correctIndex: placed.correctIndex,
          explanationFr: `${targetV.arabic} se lit « ${targetV.sound} » (${targetV.markName}).`
        };
      } else {
        const correctOpt = {
          id: `v_read_${targetV.key}`,
          label: targetV.sound,
          isArabic: false
        };
        const wrongOpts = otherVs.map((v) => ({
          id: `v_read_${v.key}`,
          label: v.sound,
          isArabic: false
        }));
        const placed = placeCorrectAtSlot(
          correctOpt,
          wrongOpts,
          targetCorrectSlot % 3
        );
        return {
          id: `q_${letter.id}_vow_read_${targetCorrectSlot}`,
          letterId: letter.id,
          familyId: letter.family,
          type: 'vowel_read',
          kind: 'read_and_choose',
          vowelQuizKind: 'read_and_choose',
          promptFr: 'Comment se lit cette syllabe ?',
          promptArabic: targetV.arabic,
          audioText: targetV.arabic,
          options: placed.options,
          correctIndex: placed.correctIndex,
          explanationFr: `${targetV.arabic} se lit « ${targetV.sound} » (${targetV.markName}).`
        };
      }
    }
  }
}

/**
 * Phase 3.1: Dedicated "Lecture voyelle" quiz builder returning strictly
 * `hear_and_choose` (speaker prompt + 3 syllable glyphs, no transliteration) or
 * `read_and_choose` (syllable glyph in prompt + 3 transliterations as text, no Arabic glyphs in options).
 */
export function buildDynamicVowelQuizQuestions(
  poolLettersOrIds: (LetterRecord | string)[],
  count = 6
): QuizQuestion[] {
  const resolvedPool: LetterRecord[] = (poolLettersOrIds || [])
    .map((item) =>
      typeof item === 'string'
        ? LETTERS_DATA.find((l) => l.id === item)
        : item
    )
    .filter((l): l is LetterRecord => Boolean(l));
  const safePool =
    resolvedPool.length > 0 ? resolvedPool : LETTERS_DATA.slice(0, 4);
  const questions: QuizQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const letter = safePool[i % safePool.length];
    const q = buildSingleTypedQuestion(letter, 'vowel_read', i, safePool, 3);
    questions.push({
      ...q,
      id: `vq_${letter.id}_${q.vowelQuizKind}_${i}`
    });
  }
  return questions;
}

/**
 * Phase 5.3: Placement test generator for a specific family (F1..F7):
 * 3 questions per family, reusing the existing generators:
 * 1. hear -> pick the letter (letter_from_sound)
 * 2. letter -> pick the name (sound_from_letter)
 * 3. how many dots (dot_placement)
 */
export function buildPlacementQuestionsForFamily(
  familyId: FamilyId,
  allLetters: LetterRecord[] = LETTERS_DATA
): QuizQuestion[] {
  const famLetters = allLetters.filter((l) => l.family === familyId);
  const pool = famLetters.length >= 3 ? famLetters : allLetters.slice(0, 4);
  const l0 = pool[0] || allLetters[0];
  const l1 = pool[1 % pool.length] || allLetters[1];
  const l2 = pool[2 % pool.length] || allLetters[2];

  return [
    {
      ...buildSingleTypedQuestion(l0, 'letter_from_sound', 0, allLetters, 4),
      familyId
    },
    {
      ...buildSingleTypedQuestion(l1, 'sound_from_letter', 1, allLetters, 4),
      familyId
    },
    {
      ...buildSingleTypedQuestion(l2, 'dot_placement', 2, allLetters, 4),
      familyId
    }
  ];
}

/**
 * PHASE B7 & PHASE F: Seeded runtime question generator:
 * - Seeded randomness (`seed = date + session counter`)
 * - No item repeated within the last 20 (`(letterId, type)` pair never repeats in a 20-item window)
 * - Answer positions shuffled; the correct answer is never in the same position 3 times in a row
 * - Question types never repeat twice in a row (`type[i] !== type[i - 1]`)
 * - Weight 60/40 toward letters the learner got wrong most
 */
const VARIED_QUESTION_TYPES: QuizQuestionType[] = [
  'letter_from_sound',
  'picture_to_letter',
  'dot_placement',
  'vowel_read',
  'sound_from_letter',
  'letter_to_picture',
  'odd_one_out'
];

export function createSeededRng(seedInput: string | number): () => number {
  const str = String(seedInput);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = (h || 123456789) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

export interface QuizGeneratorConfig {
  seed?: string | number;
  mistakeCountsByLetter?: Record<string, number>;
  recentItemKeys?: string[];
}

export function buildVariedQuizSequence(
  poolLetters: LetterRecord[],
  count = 10,
  baseMaxOptions = 4,
  config?: QuizGeneratorConfig
): QuizQuestion[] {
  const safePool = poolLetters.length > 0 ? poolLetters : LETTERS_DATA.slice(0, 4);
  const todayStr = new Date().toISOString().slice(0, 10);
  const rng = createSeededRng(config?.seed ?? `${todayStr}_1`);
  const mistakeCounts = config?.mistakeCountsByLetter ?? {};

  // Split pool into high-mistake letters (60% weight) and normal letters (40% weight)
  const sortedByMistakes = [...safePool].sort(
    (a, b) => (mistakeCounts[b.id] ?? 0) - (mistakeCounts[a.id] ?? 0)
  );
  const hasMistakes = sortedByMistakes.some((l) => (mistakeCounts[l.id] ?? 0) > 0);
  const hardPool = hasMistakes
    ? sortedByMistakes.slice(0, Math.max(1, Math.ceil(sortedByMistakes.length / 2)))
    : safePool;

  // Build all candidate (letter, type) pairs so we can enforce zero repeats within 20 items
  const allPairs: Array<{ letter: LetterRecord; type: QuizQuestionType; key: string }> = [];
  for (const qType of VARIED_QUESTION_TYPES) {
    for (const letter of safePool) {
      allPairs.push({
        letter,
        type: qType,
        key: `${letter.id}__${qType}`
      });
    }
  }

  const usedKeysWindow: string[] = [...(config?.recentItemKeys ?? [])].slice(-20);
  const questions: QuizQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const prevType = i > 0 ? questions[i - 1].type : null;
    const maxOpts = i < 3 ? Math.min(3, baseMaxOptions) : baseMaxOptions;

    // 60/40 weighting toward letters the learner got wrong most
    const preferHard = hasMistakes && rng() < 0.6;
    const preferredLetterIds = new Set(
      (preferHard ? hardPool : safePool).map((l) => l.id)
    );

    // Filter candidates that:
    // 1. Do not repeat the previous question's type
    // 2. Have not been used in the last 20 items
    let candidates = allPairs.filter(
      (p) => p.type !== prevType && !usedKeysWindow.slice(-20).includes(p.key)
    );

    const weightedCandidates = candidates.filter((p) =>
      preferredLetterIds.has(p.letter.id)
    );
    if (weightedCandidates.length > 0) {
      candidates = weightedCandidates;
    }

    if (candidates.length === 0) {
      candidates = allPairs.filter((p) => p.type !== prevType);
    }

    const pickedIdx = Math.floor(rng() * candidates.length);
    const picked = candidates[pickedIdx] || allPairs[i % allPairs.length];

    usedKeysWindow.push(picked.key);
    if (usedKeysWindow.length > 20) {
      usedKeysWindow.shift();
    }

    // Choose correct answer slot (shuffled, never in the same position 3 times in a row)
    let slot = Math.floor(rng() * maxOpts);
    if (
      i >= 2 &&
      questions[i - 1].correctIndex === slot &&
      questions[i - 2].correctIndex === slot
    ) {
      slot = (slot + 1) % maxOpts;
    }

    const q = buildSingleTypedQuestion(
      picked.letter,
      picked.type,
      slot,
      safePool,
      maxOpts
    );
    questions.push({
      ...q,
      id: `q_${picked.letter.id}_${picked.type}_${i}_${slot}`
    });
  }

  return questions;
}

/**
 * Generates the 3-question recognition quiz for Step 5 ('Retenir') of any letter,
 * with varied question types and shuffled answer positions (Phase B6, B7 & E3):
 * Q1: letter_to_picture (picture + Arabic word + French word in small text)
 * Q2: sound_from_letter ("Comment s'appelle cette lettre ?" with speaker button to hear the name and pick)
 * Q3: dot_placement
 */
export function buildQuestionsForLetter(
  letter: LetterRecord,
  allLetters: LetterRecord[] = LETTERS_DATA,
  maxOptions = 4
): QuizQuestion[] {
  const slotOffset = letter.order % 3;
  const q1 = buildSingleTypedQuestion(
    letter,
    'letter_to_picture',
    slotOffset,
    allLetters,
    maxOptions
  );
  const q2 = buildSingleTypedQuestion(
    letter,
    'sound_from_letter',
    (slotOffset + 1) % 3,
    allLetters,
    maxOptions
  );
  const q3 = buildSingleTypedQuestion(
    letter,
    'dot_placement',
    (slotOffset + 2) % 3,
    allLetters,
    maxOptions
  );
  return [q1, q2, q3];
}

/**
 * Generates a 10-question Family Exam with varied types and answer positions (Phase B7 & E1).
 * Strictly restricts both questions and distractors to unlocked letters when unlockedLetterIds is provided.
 */
export function buildFamilyExamQuestions(
  familyId: FamilyId,
  maxOptions = 4,
  unlockedLetterIds?: string[]
): QuizQuestion[] {
  const allowedSet = unlockedLetterIds ? new Set(unlockedLetterIds) : null;
  const familyLetters = LETTERS_DATA.filter(
    (l) => l.family === familyId && (!allowedSet || allowedSet.has(l.id))
  );
  const pool =
    familyLetters.length > 0
      ? familyLetters
      : LETTERS_DATA.filter((l) => !allowedSet || allowedSet.has(l.id));
  return buildVariedQuizSequence(pool, 10, maxOptions);
}

/**
 * Generates a 25-question Final Exam across all families with varied types and answer positions (Phase B7 & E2).
 */
export function buildFinalExamQuestions(
  maxOptions = 4,
  unlockedLetterIds?: string[]
): QuizQuestion[] {
  const allowedSet = unlockedLetterIds ? new Set(unlockedLetterIds) : null;
  const pool = allowedSet
    ? LETTERS_DATA.filter((l) => allowedSet.has(l.id))
    : LETTERS_DATA;
  return buildVariedQuizSequence(pool, 25, maxOptions);
}

/**
 * PHASE 4 (SPEC ONLY - DO NOT BUILD UI NOW): READING LADDER DATA STRUCTURE
 * Levels = words, 2-3 word phrases, short dialogues, micro-stories (3-5 sentences), longer stories and proverbs.
 * Each text has requiredLetters, vowel-marks on/off, tap-a-word for audio + meaning,
 * one comprehension question, and an audioUrl field for real recorded audio.
 */
export type ReadingLadderLevel =
  | 'words'
  | 'phrases'
  | 'dialogues'
  | 'micro_stories'
  | 'stories_proverbs';

export interface ReadingLadderWordToken {
  textArWithVowels: string;
  textArWithoutVowels: string;
  meaningFr: string;
  audioUrl: string;
}

export interface ReadingLadderItem {
  id: string;
  level: ReadingLadderLevel;
  titleFr: string;
  requiredLetters: string[];
  vowelMarksDefaultOn: boolean;
  tokens: ReadingLadderWordToken[];
  audioUrl: string;
  comprehensionQuestion: {
    promptFr: string;
    optionsFr: string[];
    correctIndex: number;
  };
}

export const READING_LADDER_DATA: ReadingLadderItem[] = [
  {
    id: 'rl_phrase_1',
    level: 'phrases',
    titleFr: 'La porte de la maison',
    requiredLetters: ['alif', 'baa', 'taa', 'yaa'],
    vowelMarksDefaultOn: true,
    audioUrl: '/audio/recorded/rl_phrase_1.mp3',
    tokens: [
      {
        textArWithVowels: 'بَابُ',
        textArWithoutVowels: 'باب',
        meaningFr: 'La porte',
        audioUrl: '/audio/recorded/w_baab.mp3'
      },
      {
        textArWithVowels: 'بَيْتٍ',
        textArWithoutVowels: 'بيت',
        meaningFr: "d'une maison",
        audioUrl: '/audio/recorded/w_bayt.mp3'
      }
    ],
    comprehensionQuestion: {
      promptFr: 'De quoi parle cette expression ?',
      optionsFr: ["De la porte d'une maison", "D'un livre", "D'un arbre"],
      correctIndex: 0
    }
  },
  {
    id: 'rl_micro_story_1',
    level: 'micro_stories',
    titleFr: 'La lumière du matin',
    requiredLetters: LETTERS_DATA.map((l) => l.id),
    vowelMarksDefaultOn: true,
    audioUrl: '/audio/recorded/rl_micro_story_1.mp3',
    tokens: [
      {
        textArWithVowels: 'فَتَحَ',
        textArWithoutVowels: 'فتح',
        meaningFr: 'Il a ouvert',
        audioUrl: '/audio/recorded/w_fataha.mp3'
      },
      {
        textArWithVowels: 'الْبَابَ',
        textArWithoutVowels: 'الباب',
        meaningFr: 'la porte',
        audioUrl: '/audio/recorded/w_albaab.mp3'
      },
      {
        textArWithVowels: 'وَرَأَى',
        textArWithoutVowels: 'ورأى',
        meaningFr: 'et a vu',
        audioUrl: '/audio/recorded/w_waraa.mp3'
      },
      {
        textArWithVowels: 'النُّورَ',
        textArWithoutVowels: 'النور',
        meaningFr: 'la lumière',
        audioUrl: '/audio/recorded/w_annuur.mp3'
      }
    ],
    comprehensionQuestion: {
      promptFr: "Qu'a-t-il vu en ouvrant la porte ?",
      optionsFr: ['La lumière', 'La pluie', 'La nuit'],
      correctIndex: 0
    }
  }
];

