export interface ArabicLetterItem {
  id: string;
  arabic: string;
  nameFr: string;
  translit: string;
  phoneticHintFr: string;
  dotRuleFr: string;
  forms: {
    isolated: string;
    initial: string;
    medial: string;
    final: string;
  };
  vowels: {
    fatha: { char: string; sound: string };
    kasra: { char: string; sound: string };
    damma: { char: string; sound: string };
  };
  exampleWord: {
    arabic: string;
    translit: string;
    meaningFr: string;
  };
  svgPath: string;
  dotPositions?: { cx: number; cy: number }[];
}

export type ExerciseStepType =
  | 'learn-letter'
  | 'write-letter'
  | 'distinguish'
  | 'listen-boolean'
  | 'match-pairs'
  | 'choose-sound'
  | 'listen-diacritic'
  | 'multi-select-diacritic'
  | 'multiple-choice';

export interface ExerciseStep {
  id: string;
  type: ExerciseStepType;
  titleFr: string;
  instructionFr?: string;
  letterArabic?: string;
  diacriticColor?: string;
  audioText?: string;
  phoneticExplanationFr?: string;
  distinguishCards?: { arabic: string; ruleFr: string }[];
  // For listen-boolean
  booleanPromptAudio?: string;
  booleanDisplayedArabic?: string;
  booleanCorrect?: boolean;
  // For match-pairs
  pairs?: { id: string; leftLabel: string; leftAudio: string; rightArabic: string }[];
  // For choose-sound (4 audio options for 1 displayed Arabic character)
  targetArabic?: string;
  soundOptions?: { id: string; audioText: string; labelPhonetic: string; isCorrect: boolean }[];
  // For listen-diacritic
  targetAudio?: string;
  targetAudioPhonetic?: string;
  diacriticOptions?: { id: string; symbol: string; nameFr: string; position: 'above' | 'below'; isCorrect: boolean }[];
  // For multi-select-diacritic
  targetDiacriticName?: 'Fatha' | 'Kasra' | 'Damma';
  tileOptions?: { id: string; arabic: string; audioText: string; isCorrect: boolean }[];
  // For multiple-choice
  questionFr?: string;
  mcOptions?: { id: string; text: string; arabic?: string; isCorrect: boolean }[];
}

export interface LessonSection {
  id: string;
  order: 1 | 2 | 3;
  categoryLabelFr: string; // e.g. "Lettres", "Voyelles (Harakât)", "Quiz & Défi"
  titleFr: string; // e.g. "Première Section", "Deuxième Section", "Troisième Section"
  steps: ExerciseStep[];
  premiumPromptFr?: string;
  premiumExpectedArabic?: string;
}

export interface Lesson {
  id: string;
  levelId: string;
  number: number;
  titleFr: string;
  subtitleFr: string;
  badgeArabic: string;
  videoSummaryFr?: string;
  isLevelExam?: boolean;
  sections: LessonSection[];
}

export interface CourseLevel {
  id: string;
  code: string;
  titleFr: string;
  subtitleFr: string;
  totalLessonsCount: number;
  descriptionFr: string;
}

export interface ReadingLine {
  arabicVocalized: string;
  arabicUnvocalized: string;
  translit: string;
  translationFr: string;
  audioText: string;
}

export interface ReadingStory {
  id: string;
  levelCode: string;
  levelTitleFr: string;
  titleArabic: string;
  titleFr: string;
  durationLabel: string;
  summaryFr: string;
  lines: ReadingLine[];
  comprehensionQuiz: {
    questionFr: string;
    options: string[];
    correctIndex: number;
  }[];
}

export const COURSE_LEVELS: CourseLevel[] = [
  {
    id: 'A0',
    code: 'A0',
    titleFr: 'Débutant',
    subtitleFr: 'Alphabet, écriture & voyelles courtes (Harakât)',
    totalLessonsCount: 3,
    descriptionFr: 'Maîtrisez le tracé des lettres, leurs points distinctifs et la prononciation avec Fatha, Kasra, Damma et Soukoun.'
  },
  {
    id: 'A1',
    code: 'A1',
    titleFr: 'Novice bas',
    subtitleFr: 'Liaison des lettres, mots courants & salutations',
    totalLessonsCount: 2,
    descriptionFr: 'Assemblez les lettres en début, milieu et fin de mot et lisez vos premières phrases vocalisées.'
  },
  {
    id: 'A2',
    code: 'A2',
    titleFr: 'Novice moyen',
    subtitleFr: 'Voyelles longues (Madd), Tanwîn & Chadda',
    totalLessonsCount: 1,
    descriptionFr: 'Distinguez les voyelles courtes des voyelles longues (aa, ouu, ii) et maîtrisez la consonne doublée.'
  },
  {
    id: 'A3',
    code: 'A3',
    titleFr: 'Novice haut',
    subtitleFr: 'Phrases nominales, présentation & famille',
    totalLessonsCount: 1,
    descriptionFr: 'Construisez des phrases complètes sur votre identité, votre famille et votre quotidien.'
  },
  {
    id: 'B1',
    code: 'B1',
    titleFr: 'Intermédiaire',
    subtitleFr: 'Lecture fluide sans voyelles & récits',
    totalLessonsCount: 1,
    descriptionFr: 'Lisez et comprenez des textes arabes authentiques avec fluidité.'
  }
];

export const ARABIC_ALPHABET: ArabicLetterItem[] = [
  {
    id: 'alif',
    arabic: 'أ',
    nameFr: 'Alif',
    translit: 'ā / a',
    phoneticHintFr: "Le son de ( أَ ) correspond au « A » ouvert comme dans « Arbre ».",
    dotRuleFr: "Une tige verticale surmontée d'une petite Hamza (ء).",
    forms: { isolated: 'أ', initial: 'أ', medial: 'ـأ', final: 'ـأ' },
    vowels: {
      fatha: { char: 'أَ', sound: 'a' },
      kasra: { char: 'إِ', sound: 'i' },
      damma: { char: 'أُ', sound: 'ou' }
    },
    exampleWord: { arabic: 'أَسَد', translit: 'Asad', meaningFr: 'Lion' },
    svgPath: 'M 150 60 L 150 210',
    dotPositions: []
  },
  {
    id: 'baa',
    arabic: 'ب',
    nameFr: 'Baa',
    translit: 'bā’',
    phoneticHintFr: "Le son de la lettre ( بَ ) est similaire à ( Ba ) comme dans ( Bateau ).",
    dotRuleFr: "La lettre ( ب ) se distingue par un seul point placé en dessous.",
    forms: { isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب' },
    vowels: {
      fatha: { char: 'بَ', sound: 'ba' },
      kasra: { char: 'بِ', sound: 'bi' },
      damma: { char: 'بُ', sound: 'bou' }
    },
    exampleWord: { arabic: 'بَيت', translit: 'Bayt', meaningFr: 'Maison' },
    svgPath: 'M 230 120 Q 240 165 210 165 L 90 165 Q 60 165 70 120',
    dotPositions: [{ cx: 150, cy: 205 }]
  },
  {
    id: 'taa',
    arabic: 'ت',
    nameFr: 'Taa',
    translit: 'tā’',
    phoneticHintFr: "Le son de la lettre ( تَ ) est similaire à ( Ta ) comme dans ( Tasse ).",
    dotRuleFr: "La lettre ( ت ) se distingue par deux points placés au-dessus.",
    forms: { isolated: 'ت', initial: 'تـ', medial: 'ـتـ', final: 'ـت' },
    vowels: {
      fatha: { char: 'تَ', sound: 'ta' },
      kasra: { char: 'تِ', sound: 'ti' },
      damma: { char: 'تُ', sound: 'tou' }
    },
    exampleWord: { arabic: 'تُفَّاح', translit: 'Tuffāḥ', meaningFr: 'Pomme' },
    svgPath: 'M 230 135 Q 240 180 210 180 L 90 180 Q 60 180 70 135',
    dotPositions: [{ cx: 135, cy: 105 }, { cx: 165, cy: 105 }]
  },
  {
    id: 'thaa',
    arabic: 'ث',
    nameFr: 'Thaa',
    translit: 'thā’',
    phoneticHintFr: "Le son de ( ثَ ) se prononce avec le bout de la langue entre les dents (comme « Think » en anglais).",
    dotRuleFr: "La lettre ( ث ) se distingue par trois points en triangle au-dessus.",
    forms: { isolated: 'ث', initial: 'ثـ', medial: 'ـثـ', final: 'ـث' },
    vowels: {
      fatha: { char: 'ثَ', sound: 'tha' },
      kasra: { char: 'ثِ', sound: 'thi' },
      damma: { char: 'ثُ', sound: 'thou' }
    },
    exampleWord: { arabic: 'ثَعلَب', translit: 'Tha‘lab', meaningFr: 'Renard' },
    svgPath: 'M 230 140 Q 240 185 210 185 L 90 185 Q 60 185 70 140',
    dotPositions: [{ cx: 135, cy: 112 }, { cx: 165, cy: 112 }, { cx: 150, cy: 92 }]
  },
  {
    id: 'jeem',
    arabic: 'ج',
    nameFr: 'Jeem',
    translit: 'jīm',
    phoneticHintFr: "Le son de ( جَ ) correspond à « Dj » comme dans « Djibouti » ou « Jardin ».",
    dotRuleFr: "La lettre ( ج ) possède un point niché au cœur de sa courbe inférieure.",
    forms: { isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج' },
    vowels: {
      fatha: { char: 'جَ', sound: 'dja' },
      kasra: { char: 'جِ', sound: 'dji' },
      damma: { char: 'جُ', sound: 'djou' }
    },
    exampleWord: { arabic: 'جَمَل', translit: 'Jamal', meaningFr: 'Chameau' },
    svgPath: 'M 100 95 L 200 95 C 140 130 110 215 185 215',
    dotPositions: [{ cx: 155, cy: 165 }]
  },
  {
    id: 'haa',
    arabic: 'ح',
    nameFr: 'Haa',
    translit: 'ḥā’',
    phoneticHintFr: "Un « H » soufflé du fond de la gorge, doux et sans point.",
    dotRuleFr: "La lettre ( ح ) n'a aucun point, ni au-dessus ni en dessous.",
    forms: { isolated: 'ح', initial: 'حـ', medial: 'ـحـ', final: 'ـح' },
    vowels: {
      fatha: { char: 'حَ', sound: 'ḥa' },
      kasra: { char: 'حِ', sound: 'ḥi' },
      damma: { char: 'حُ', sound: 'ḥou' }
    },
    exampleWord: { arabic: 'حَليب', translit: 'Ḥalīb', meaningFr: 'Lait' },
    svgPath: 'M 100 95 L 200 95 C 140 130 110 215 185 215',
    dotPositions: []
  },
  {
    id: 'khaa',
    arabic: 'خ',
    nameFr: 'Khaa',
    translit: 'khā’',
    phoneticHintFr: "Similaire à la « Jota » espagnole ou au « Ch » allemand de Bach.",
    dotRuleFr: "La lettre ( خ ) porte un point au-dessus de sa tête.",
    forms: { isolated: 'خ', initial: 'خـ', medial: 'ـخـ', final: 'ـخ' },
    vowels: {
      fatha: { char: 'خَ', sound: 'kha' },
      kasra: { char: 'خِ', sound: 'khi' },
      damma: { char: 'خُ', sound: 'khou' }
    },
    exampleWord: { arabic: 'خُبز', translit: 'Khubz', meaningFr: 'Pain' },
    svgPath: 'M 100 105 L 200 105 C 140 140 110 220 185 220',
    dotPositions: [{ cx: 155, cy: 72 }]
  },
  {
    id: 'dal',
    arabic: 'د',
    nameFr: 'Dal',
    translit: 'dāl',
    phoneticHintFr: "Le son ( دَ ) est identique au « D » français dans « Date ».",
    dotRuleFr: "Une courbe ouverte vers la gauche, sans aucun point.",
    forms: { isolated: 'د', initial: 'د', medial: 'ـد', final: 'ـد' },
    vowels: {
      fatha: { char: 'دَ', sound: 'da' },
      kasra: { char: 'دِ', sound: 'di' },
      damma: { char: 'دُ', sound: 'dou' }
    },
    exampleWord: { arabic: 'دَرس', translit: 'Dars', meaningFr: 'Leçon' },
    svgPath: 'M 175 95 Q 210 145 175 180 L 105 180',
    dotPositions: []
  },
  {
    id: 'dhal',
    arabic: 'ذ',
    nameFr: 'Dhal',
    translit: 'dhāl',
    phoneticHintFr: "Se prononce comme le « Th » anglais sonore dans « This ».",
    dotRuleFr: "Même forme que Dal ( د ), avec un point au-dessus.",
    forms: { isolated: 'ذ', initial: 'ذ', medial: 'ـذ', final: 'ـذ' },
    vowels: {
      fatha: { char: 'ذَ', sound: 'dha' },
      kasra: { char: 'ذِ', sound: 'dhi' },
      damma: { char: 'ذُ', sound: 'dhou' }
    },
    exampleWord: { arabic: 'ذَهَب', translit: 'Dhahab', meaningFr: 'Or' },
    svgPath: 'M 175 105 Q 210 155 175 190 L 105 190',
    dotPositions: [{ cx: 165, cy: 72 }]
  },
  {
    id: 'raa',
    arabic: 'ر',
    nameFr: 'Raa',
    translit: 'rā’',
    phoneticHintFr: "Un « R » roulé avec la pointe de la langue.",
    dotRuleFr: "Une courbe fluide qui descend sous la ligne d'écriture, sans point.",
    forms: { isolated: 'ر', initial: 'ر', medial: 'ـر', final: 'ـر' },
    vowels: {
      fatha: { char: 'رَ', sound: 'ra' },
      kasra: { char: 'رِ', sound: 'ri' },
      damma: { char: 'رُ', sound: 'rou' }
    },
    exampleWord: { arabic: 'رُمَّان', translit: 'Rummān', meaningFr: 'Grenade' },
    svgPath: 'M 180 115 Q 185 185 110 215',
    dotPositions: []
  },
  {
    id: 'zay',
    arabic: 'ز',
    nameFr: 'Zay',
    translit: 'zāy',
    phoneticHintFr: "Le son « Z » vibrant comme dans « Zèbre ».",
    dotRuleFr: "Même courbe que Raa ( ر ), surmontée d'un point.",
    forms: { isolated: 'ز', initial: 'ز', medial: 'ـز', final: 'ـز' },
    vowels: {
      fatha: { char: 'زَ', sound: 'za' },
      kasra: { char: 'زِ', sound: 'zi' },
      damma: { char: 'زُ', sound: 'zou' }
    },
    exampleWord: { arabic: 'زَيتُون', translit: 'Zaytūn', meaningFr: 'Olive' },
    svgPath: 'M 180 115 Q 185 185 110 215',
    dotPositions: [{ cx: 175, cy: 82 }]
  },
  {
    id: 'seen',
    arabic: 'س',
    nameFr: 'Seen',
    translit: 'sīn',
    phoneticHintFr: "Le son « S » doux comme dans « Soleil ».",
    dotRuleFr: "Trois petites dents suivies d'une grande coupe, sans point.",
    forms: { isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس' },
    vowels: {
      fatha: { char: 'سَ', sound: 'sa' },
      kasra: { char: 'سِ', sound: 'si' },
      damma: { char: 'سُ', sound: 'sou' }
    },
    exampleWord: { arabic: 'سَلَام', translit: 'Salām', meaningFr: 'Paix / Salut' },
    svgPath: 'M 220 135 Q 205 170 190 135 Q 175 170 160 135 Q 150 215 95 175',
    dotPositions: []
  },
  {
    id: 'sheen',
    arabic: 'ش',
    nameFr: 'Sheen',
    translit: 'shīn',
    phoneticHintFr: "Le son « Ch » français comme dans « Chat ».",
    dotRuleFr: "Même forme que Seen ( س ), avec trois points au-dessus des dents.",
    forms: { isolated: 'ش', initial: 'شـ', medial: 'ـشـ', final: 'ـش' },
    vowels: {
      fatha: { char: 'شَ', sound: 'cha' },
      kasra: { char: 'شِ', sound: 'chi' },
      damma: { char: 'شُ', sound: 'chou' }
    },
    exampleWord: { arabic: 'شَمس', translit: 'Shams', meaningFr: 'Soleil' },
    svgPath: 'M 220 140 Q 205 175 190 140 Q 175 175 160 140 Q 150 220 95 180',
    dotPositions: [{ cx: 175, cy: 105 }, { cx: 205, cy: 105 }, { cx: 190, cy: 85 }]
  },
  {
    id: 'sad',
    arabic: 'ص',
    nameFr: 'Sad',
    translit: 'ṣād',
    phoneticHintFr: "Un « S » emphatique et grave prononcé bouche arrondie.",
    dotRuleFr: "Une boucle ovale suivie d'une coupe profonde, sans point.",
    forms: { isolated: 'ص', initial: 'صـ', medial: 'ـصـ', final: 'ـص' },
    vowels: {
      fatha: { char: 'صَ', sound: 'ṣa' },
      kasra: { char: 'صِ', sound: 'ṣi' },
      damma: { char: 'صُ', sound: 'ṣou' }
    },
    exampleWord: { arabic: 'صَبَاح', translit: 'Ṣabāḥ', meaningFr: 'Matin' },
    svgPath: 'M 165 150 C 225 110 235 165 165 165 Q 140 220 90 175',
    dotPositions: []
  },
  {
    id: 'dad',
    arabic: 'ض',
    nameFr: 'Dad',
    translit: 'ḍād',
    phoneticHintFr: "Un « D » emphatique grave, emblématique de la langue arabe.",
    dotRuleFr: "Même boucle que Sad ( ص ), avec un point au-dessus.",
    forms: { isolated: 'ض', initial: 'ضـ', medial: 'ـضـ', final: 'ـض' },
    vowels: {
      fatha: { char: 'ضَ', sound: 'ḍa' },
      kasra: { char: 'ضِ', sound: 'ḍi' },
      damma: { char: 'ضُ', sound: 'ḍou' }
    },
    exampleWord: { arabic: 'ضَوء', translit: 'Ḍaw’', meaningFr: 'Lumière' },
    svgPath: 'M 165 150 C 225 110 235 165 165 165 Q 140 220 90 175',
    dotPositions: [{ cx: 195, cy: 100 }]
  },
  {
    id: 'taa_emph',
    arabic: 'ط',
    nameFr: 'Taa emphatique',
    translit: 'ṭā’',
    phoneticHintFr: "Un « T » grave et plein.",
    dotRuleFr: "Une boucle surmontée d'une barre verticale, sans point.",
    forms: { isolated: 'ط', initial: 'طـ', medial: 'ـطـ', final: 'ـط' },
    vowels: {
      fatha: { char: 'طَ', sound: 'ṭa' },
      kasra: { char: 'طِ', sound: 'ṭi' },
      damma: { char: 'طُ', sound: 'ṭou' }
    },
    exampleWord: { arabic: 'طَالِب', translit: 'Ṭālib', meaningFr: 'Étudiant' },
    svgPath: 'M 165 75 L 165 175 L 220 175 C 220 130 165 130 165 175 L 100 175',
    dotPositions: []
  },
  {
    id: 'dhaa_emph',
    arabic: 'ظ',
    nameFr: 'Dhaa emphatique',
    translit: 'ẓā’',
    phoneticHintFr: "Un « Dh » interdental emphatique et grave.",
    dotRuleFr: "Même forme que ( ط ) avec un point au-dessus de la boucle.",
    forms: { isolated: 'ظ', initial: 'ظـ', medial: 'ـظـ', final: 'ـظ' },
    vowels: {
      fatha: { char: 'ظَ', sound: 'ẓa' },
      kasra: { char: 'ظِ', sound: 'ẓi' },
      damma: { char: 'ظُ', sound: 'ẓou' }
    },
    exampleWord: { arabic: 'ظَرف', translit: 'Ẓarf', meaningFr: 'Enveloppe' },
    svgPath: 'M 165 75 L 165 175 L 220 175 C 220 130 165 130 165 175 L 100 175',
    dotPositions: [{ cx: 198, cy: 112 }]
  },
  {
    id: 'ayn',
    arabic: 'ع',
    nameFr: 'Ayn',
    translit: '‘ayn',
    phoneticHintFr: "Consonne gutturale sonore propre à l'arabe, produite par contraction douce du pharynx.",
    dotRuleFr: "Un petit crochet supérieur ouvert suivi d'une grande courbe, sans point.",
    forms: { isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع' },
    vowels: {
      fatha: { char: 'عَ', sound: '‘a' },
      kasra: { char: 'عِ', sound: '‘i' },
      damma: { char: 'عُ', sound: '‘ou' }
    },
    exampleWord: { arabic: 'عَسَل', translit: '‘Asal', meaningFr: 'Miel' },
    svgPath: 'M 175 100 C 130 100 130 140 175 140 C 115 150 115 220 185 215',
    dotPositions: []
  },
  {
    id: 'ghayn',
    arabic: 'غ',
    nameFr: 'Ghayn',
    translit: 'ghayn',
    phoneticHintFr: "Proche du « R » parisien grasseyé comme dans « Rose ».",
    dotRuleFr: "Même forme que Ayn ( ع ), avec un point au-dessus.",
    forms: { isolated: 'غ', initial: 'غـ', medial: 'ـغـ', final: 'ـغ' },
    vowels: {
      fatha: { char: 'غَ', sound: 'gha' },
      kasra: { char: 'غِ', sound: 'ghi' },
      damma: { char: 'غُ', sound: 'ghou' }
    },
    exampleWord: { arabic: 'غُرفَة', translit: 'Ghurfa', meaningFr: 'Chambre' },
    svgPath: 'M 175 105 C 130 105 130 145 175 145 C 115 155 115 225 185 220',
    dotPositions: [{ cx: 160, cy: 75 }]
  },
  {
    id: 'faa',
    arabic: 'ف',
    nameFr: 'Faa',
    translit: 'fā’',
    phoneticHintFr: "Le son « F » comme dans « Fleur ».",
    dotRuleFr: "Une petite tête bouclée sur la ligne avec un seul point au-dessus.",
    forms: { isolated: 'ف', initial: 'فـ', medial: 'ـفـ', final: 'ـف' },
    vowels: {
      fatha: { char: 'فَ', sound: 'fa' },
      kasra: { char: 'فِ', sound: 'fi' },
      damma: { char: 'فُ', sound: 'fou' }
    },
    exampleWord: { arabic: 'فَرَاشَة', translit: 'Farāsha', meaningFr: 'Papillon' },
    svgPath: 'M 200 155 C 200 120 230 120 225 165 L 95 165 Q 75 165 85 135',
    dotPositions: [{ cx: 212, cy: 102 }]
  },
  {
    id: 'qaf',
    arabic: 'ق',
    nameFr: 'Qaf',
    translit: 'qāf',
    phoneticHintFr: "Un « K » profond prononcé tout au fond du palais (luette).",
    dotRuleFr: "Une tête bouclée avec une coupe arrondie et deux points au-dessus.",
    forms: { isolated: 'ق', initial: 'قـ', medial: 'ـقـ', final: 'ـق' },
    vowels: {
      fatha: { char: 'قَ', sound: 'qa' },
      kasra: { char: 'قِ', sound: 'qi' },
      damma: { char: 'قُ', sound: 'qou' }
    },
    exampleWord: { arabic: 'قَلَم', translit: 'Qalam', meaningFr: 'Stylo' },
    svgPath: 'M 195 145 C 195 115 225 115 220 155 Q 160 220 100 155',
    dotPositions: [{ cx: 195, cy: 95 }, { cx: 220, cy: 95 }]
  },
  {
    id: 'kaf',
    arabic: 'ك',
    nameFr: 'Kaf',
    translit: 'kāf',
    phoneticHintFr: "Le son « K » léger comme dans « Café ».",
    dotRuleFr: "Un angle droit posé sur la ligne contenant un petit signe interne.",
    forms: { isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك' },
    vowels: {
      fatha: { char: 'كَ', sound: 'ka' },
      kasra: { char: 'كِ', sound: 'ki' },
      damma: { char: 'كُ', sound: 'kou' }
    },
    exampleWord: { arabic: 'كِتَاب', translit: 'Kitāb', meaningFr: 'Livre' },
    svgPath: 'M 195 75 L 195 175 L 95 175',
    dotPositions: []
  },
  {
    id: 'lam',
    arabic: 'ل',
    nameFr: 'Lam',
    translit: 'lām',
    phoneticHintFr: "Le son « L » clair comme dans « Lune ».",
    dotRuleFr: "Une haute tige verticale qui s'incurve en coupe sous la ligne.",
    forms: { isolated: 'ل', initial: 'لـ', medial: 'ـلـ', final: 'ـل' },
    vowels: {
      fatha: { char: 'لَ', sound: 'la' },
      kasra: { char: 'لِ', sound: 'li' },
      damma: { char: 'لُ', sound: 'lou' }
    },
    exampleWord: { arabic: 'لَيمُون', translit: 'Laymūn', meaningFr: 'Citron' },
    svgPath: 'M 185 70 L 185 175 Q 150 220 110 175',
    dotPositions: []
  },
  {
    id: 'meem',
    arabic: 'م',
    nameFr: 'Meem',
    translit: 'mīm',
    phoneticHintFr: "Le son « M » comme dans « Miel ».",
    dotRuleFr: "Une petite tête ronde suivie d'une queue verticale.",
    forms: { isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم' },
    vowels: {
      fatha: { char: 'مَ', sound: 'ma' },
      kasra: { char: 'مِ', sound: 'mi' },
      damma: { char: 'مُ', sound: 'mou' }
    },
    exampleWord: { arabic: 'مَدرَسَة', translit: 'Madrasa', meaningFr: 'École' },
    svgPath: 'M 165 135 C 195 110 205 155 165 155 L 125 155 L 125 220',
    dotPositions: []
  },
  {
    id: 'noon',
    arabic: 'ن',
    nameFr: 'Noon',
    translit: 'nūn',
    phoneticHintFr: "Le son « N » comme dans « Nuage ».",
    dotRuleFr: "Une coupe arrondie contenant un point unique au-dessus.",
    forms: { isolated: 'ن', initial: 'نـ', medial: 'ـنـ', final: 'ـن' },
    vowels: {
      fatha: { char: 'نَ', sound: 'na' },
      kasra: { char: 'نِ', sound: 'ni' },
      damma: { char: 'نُ', sound: 'nou' }
    },
    exampleWord: { arabic: 'نَحلَة', translit: 'Naḥla', meaningFr: 'Abeille' },
    svgPath: 'M 205 135 Q 150 220 95 135',
    dotPositions: [{ cx: 150, cy: 115 }]
  },
  {
    id: 'haa_soft',
    arabic: 'ه',
    nameFr: 'Haa doux',
    translit: 'hā’',
    phoneticHintFr: "Un léger souffle d'air expiré (comme « Hello » en anglais).",
    dotRuleFr: "Une boucle fermée posée sur la ligne d'écriture.",
    forms: { isolated: 'ه', initial: 'هـ', medial: 'ـهـ', final: 'ـه' },
    vowels: {
      fatha: { char: 'هَ', sound: 'ha' },
      kasra: { char: 'هِ', sound: 'hi' },
      damma: { char: 'هُ', sound: 'hou' }
    },
    exampleWord: { arabic: 'هَدِيَّة', translit: 'Hadiyya', meaningFr: 'Cadeau' },
    svgPath: 'M 150 115 C 205 115 205 180 150 180 C 95 180 95 115 150 115',
    dotPositions: []
  },
  {
    id: 'waw',
    arabic: 'و',
    nameFr: 'Waw',
    translit: 'wāw',
    phoneticHintFr: "Le son « W / Ou » comme dans « Oui ».",
    dotRuleFr: "Une tête bouclée prolongée par une glissade sous la ligne.",
    forms: { isolated: 'و', initial: 'و', medial: 'ـو', final: 'ـو' },
    vowels: {
      fatha: { char: 'وَ', sound: 'wa' },
      kasra: { char: 'وِ', sound: 'wi' },
      damma: { char: 'وُ', sound: 'wou' }
    },
    exampleWord: { arabic: 'وَردَة', translit: 'Warda', meaningFr: 'Rose' },
    svgPath: 'M 165 135 C 165 100 205 100 195 140 Q 175 205 105 215',
    dotPositions: []
  },
  {
    id: 'yaa',
    arabic: 'ي',
    nameFr: 'Yaa',
    translit: 'yā’',
    phoneticHintFr: "Le son « Y » comme dans « Yoga » ou voyelle longue « Î ».",
    dotRuleFr: "Une courbe en S inversé avec deux points placés tout en dessous.",
    forms: { isolated: 'ي', initial: 'يـ', medial: 'ـيـ', final: 'ـي' },
    vowels: {
      fatha: { char: 'يَ', sound: 'ya' },
      kasra: { char: 'يِ', sound: 'yi' },
      damma: { char: 'يُ', sound: 'you' }
    },
    exampleWord: { arabic: 'يَد', translit: 'Yad', meaningFr: 'Main' },
    svgPath: 'M 195 120 C 145 120 155 155 190 160 Q 140 215 95 165',
    dotPositions: [{ cx: 138, cy: 215 }, { cx: 165, cy: 215 }]
  }
];

export const LESSONS: Lesson[] = [
  {
    id: 'lesson-a0-1',
    levelId: 'A0',
    number: 1,
    titleFr: 'Lettres (ب Baa, ت Taa, ث Thaa)',
    subtitleFr: 'Reconnaissance visuelle, tracé et voyelles Fatha, Kasra, Damma',
    badgeArabic: 'ب ت ث',
    sections: [
      {
        id: 'sec-a0-1-1',
        order: 1,
        categoryLabelFr: 'Lettres',
        titleFr: 'Première Section : Formes, Tracé & Points',
        steps: [
          {
            id: 'step-1',
            type: 'learn-letter',
            titleFr: 'Apprendre : La lettre Baa ( ب )',
            letterArabic: 'ب',
            audioText: 'بَ',
            phoneticExplanationFr: "Le son de la lettre ( ب ) est similaire à « B » comme dans « Bateau ». Elle porte un point unique en dessous de son bateau."
          },
          {
            id: 'step-2',
            type: 'write-letter',
            titleFr: 'Écrire : Tracer la lettre ( ب )',
            letterArabic: 'ب',
            audioText: 'ب',
            instructionFr: 'Glissez votre doigt ou curseur de droite à gauche le long des pointillés, puis placez le point en dessous.'
          },
          {
            id: 'step-3',
            type: 'learn-letter',
            titleFr: 'Apprendre : La lettre Taa ( ت )',
            letterArabic: 'ت',
            audioText: 'تَ',
            phoneticExplanationFr: "Le son de la lettre ( ت ) est similaire à « T » comme dans « Tasse ». Elle porte deux points placés au-dessus de son bateau."
          },
          {
            id: 'step-3b',
            type: 'write-letter',
            titleFr: 'Écrire : Tracer la lettre Taa ( ت )',
            letterArabic: 'ت',
            audioText: 'ت',
            instructionFr: 'Tracez le bateau de droite à gauche sur les pointillés, puis placez les 2 points au-dessus.'
          },
          {
            id: 'step-3c',
            type: 'learn-letter',
            titleFr: 'Apprendre : La lettre Thaa ( ث )',
            letterArabic: 'ث',
            audioText: 'ثَ',
            phoneticExplanationFr: "Le son de la lettre ( ث ) se prononce avec le bout de la langue entre les dents (comme « Think » en anglais). Elle porte trois points en triangle au-dessus."
          },
          {
            id: 'step-3d',
            type: 'write-letter',
            titleFr: 'Écrire : Tracer la lettre Thaa ( ث )',
            letterArabic: 'ث',
            audioText: 'ث',
            instructionFr: 'Tracez la courbe de droite à gauche sur le pochoir, puis placez les 3 points en triangle au-dessus.'
          },
          {
            id: 'step-4',
            type: 'distinguish',
            titleFr: 'Comment distinguer les lettres ( ب، ت، ث )',
            distinguishCards: [
              {
                arabic: 'ب',
                ruleFr: '1 point en dessous (Baa)'
              },
              {
                arabic: 'ت',
                ruleFr: '2 points au-dessus (Taa)'
              },
              {
                arabic: 'ث',
                ruleFr: '3 points au-dessus (Thaa)'
              }
            ]
          },
          {
            id: 'step-5',
            type: 'listen-boolean',
            titleFr: 'Écoutez et choisissez',
            booleanPromptAudio: 'ب',
            booleanDisplayedArabic: 'ب',
            booleanCorrect: true
          },
          {
            id: 'step-6',
            type: 'match-pairs',
            titleFr: 'Associez chaque lettre à sa règle et son son',
            pairs: [
              { id: 'p1', leftLabel: 'Un point en dessous (Baa)', leftAudio: 'ب', rightArabic: 'ب' },
              { id: 'p2', leftLabel: 'Deux points au-dessus (Taa)', leftAudio: 'ت', rightArabic: 'ت' },
              { id: 'p3', leftLabel: 'Trois points au-dessus (Thaa)', leftAudio: 'ث', rightArabic: 'ث' }
            ]
          }
        ]
      },
      {
        id: 'sec-a0-1-2',
        order: 2,
        categoryLabelFr: 'Diacritiques (Voyelles)',
        titleFr: 'Deuxième Section : Fatha, Kasra & Damma',
        steps: [
          {
            id: 'step-2-1',
            type: 'learn-letter',
            titleFr: 'Apprendre : Voyelle Fatha ( تَ )',
            letterArabic: 'تَ',
            audioText: 'تَ',
            phoneticExplanationFr: "La Fatha est le petit trait oblique rouge au-dessus de la lettre. Elle ajoute le son court « a » : بَ (ba), تَ (ta), ثَ (tha)."
          },
          {
            id: 'step-2-2',
            type: 'choose-sound',
            titleFr: 'Choisissez le bon son',
            targetArabic: 'بُ',
            soundOptions: [
              { id: 's1', audioText: 'بَ', labelPhonetic: 'Son 1 (ba)', isCorrect: false },
              { id: 's2', audioText: 'بُ', labelPhonetic: 'Son 2 (bou)', isCorrect: true },
              { id: 's3', audioText: 'بِ', labelPhonetic: 'Son 3 (bi)', isCorrect: false },
              { id: 's4', audioText: 'تُ', labelPhonetic: 'Son 4 (tou)', isCorrect: false }
            ]
          },
          {
            id: 'step-2-3',
            type: 'listen-diacritic',
            titleFr: 'Écoutez et choisissez la marque diacritique',
            targetAudio: 'بِ',
            targetAudioPhonetic: 'Son « bi » (voyelle sous la lettre)',
            diacriticOptions: [
              { id: 'd-kasra', symbol: 'ِ', nameFr: 'Kasra (en bas : i)', position: 'below', isCorrect: true },
              { id: 'd-fatha', symbol: 'َ', nameFr: 'Fatha (en haut : a)', position: 'above', isCorrect: false },
              { id: 'd-damma', symbol: 'ُ', nameFr: 'Damma (boucle : ou)', position: 'above', isCorrect: false }
            ]
          },
          {
            id: 'step-2-4',
            type: 'multi-select-diacritic',
            titleFr: 'Choisissez les lettres avec la marque diacritique ( Fatha )',
            targetDiacriticName: 'Fatha',
            tileOptions: [
              { id: 't1', arabic: 'تَ', audioText: 'تَ', isCorrect: true },
              { id: 't2', arabic: 'بَ', audioText: 'بَ', isCorrect: true },
              { id: 't3', arabic: 'بِ', audioText: 'بِ', isCorrect: false },
              { id: 't4', arabic: 'تِ', audioText: 'تِ', isCorrect: false },
              { id: 't5', arabic: 'ثَ', audioText: 'ثَ', isCorrect: true }
            ]
          },
          {
            id: 'step-2-5',
            type: 'multi-select-diacritic',
            titleFr: 'Choisissez les lettres avec la marque diacritique ( Kasra )',
            targetDiacriticName: 'Kasra',
            tileOptions: [
              { id: 'k1', arabic: 'ثَ', audioText: 'ثَ', isCorrect: false },
              { id: 'k2', arabic: 'بِ', audioText: 'بِ', isCorrect: true },
              { id: 'k3', arabic: 'تِ', audioText: 'تِ', isCorrect: true },
              { id: 'k4', arabic: 'ثِ', audioText: 'ثِ', isCorrect: true },
              { id: 'k5', arabic: 'تُ', audioText: 'تُ', isCorrect: false }
            ]
          }
        ]
      },
      {
        id: 'sec-a0-1-3',
        order: 3,
        categoryLabelFr: 'Quiz & Coaching',
        titleFr: 'Troisième Section : Quiz Validant & Envoi au Professeur',
        premiumPromptFr: 'Prononcez et écrivez les trois syllabes « بَ - تِ - ثُ » (ba - ti - thou) puis formez le mot « بَاب » (porte). Votre professeur vérifiera votre articulation interdentale sur le ث.',
        premiumExpectedArabic: 'بَ - تِ - ثُ | بَاب',
        steps: [
          {
            id: 'step-3-1',
            type: 'multiple-choice',
            titleFr: 'Question 1 sur 3',
            questionFr: 'Quelle lettre possède trois points placés au-dessus et se prononce avec le bout de la langue entre les dents ?',
            mcOptions: [
              { id: 'o1', text: 'Baa', arabic: 'ب', isCorrect: false },
              { id: 'o2', text: 'Taa', arabic: 'ت', isCorrect: false },
              { id: 'o3', text: 'Thaa', arabic: 'ث', isCorrect: true }
            ]
          },
          {
            id: 'step-3-2',
            type: 'choose-sound',
            titleFr: 'Question 2 sur 3 : Identifiez la prononciation de ( ثِ )',
            targetArabic: 'ثِ',
            soundOptions: [
              { id: 'q1', audioText: 'ثَ', labelPhonetic: 'tha', isCorrect: false },
              { id: 'q2', audioText: 'ثِ', labelPhonetic: 'thi', isCorrect: true },
              { id: 'q3', audioText: 'تِ', labelPhonetic: 'ti', isCorrect: false },
              { id: 'q4', audioText: 'بُ', labelPhonetic: 'bou', isCorrect: false }
            ]
          },
          {
            id: 'step-3-3',
            type: 'match-pairs',
            titleFr: 'Question 3 sur 3 : Associez chaque syllabe vocalisée à son son',
            pairs: [
              { id: 'qp1', leftLabel: 'Syllabe « Ba » (Fatha)', leftAudio: 'بَ', rightArabic: 'بَ' },
              { id: 'qp2', leftLabel: 'Syllabe « Ti » (Kasra)', leftAudio: 'تِ', rightArabic: 'تِ' },
              { id: 'qp3', leftLabel: 'Syllabe « Thou » (Damma)', leftAudio: 'ثُ', rightArabic: 'ثُ' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'lesson-a0-2',
    levelId: 'A0',
    number: 2,
    titleFr: 'Lettres (ج Jeem, ح Haa, خ Khaa)',
    subtitleFr: 'Les trois sœurs gutturales et palatales',
    badgeArabic: 'ج ح خ',
    sections: [
      {
        id: 'sec-a0-2-1',
        order: 1,
        categoryLabelFr: 'Lettres',
        titleFr: 'Première Section : Découverte & Tracé (ج ح خ)',
        steps: [
          {
            id: 'l2-s1',
            type: 'learn-letter',
            titleFr: 'Apprendre : La famille ( ج، ح، خ )',
            letterArabic: 'جَ',
            audioText: 'جَ',
            phoneticExplanationFr: "La lettre Jeem ( ج ) contient un point au centre. Haa ( ح ) n'en a aucun (souffle doux de la gorge), et Khaa ( خ ) porte un point sur la tête."
          },
          {
            id: 'l2-s2',
            type: 'write-letter',
            titleFr: 'Écrire : Tracer la lettre Jeem ( ج )',
            letterArabic: 'ج',
            audioText: 'ج',
            instructionFr: 'Tracez la barre horizontale supérieure puis dessinez la grande courbe arrondie avec son point central.'
          },
          {
            id: 'l2-s3',
            type: 'distinguish',
            titleFr: 'Comment distinguer les lettres ( ج، ح، خ )',
            distinguishCards: [
              { arabic: 'ج', ruleFr: 'Point au cœur du ventre : son « Dj » (comme Djebel).' },
              { arabic: 'ح', ruleFr: 'Aucun point : souffle chaud du fond de la gorge « Ḥ ».' },
              { arabic: 'خ', ruleFr: 'Point au-dessus de la tête : son « Kh » (comme Khaled).' }
            ]
          },
          {
            id: 'l2-s4',
            type: 'match-pairs',
            titleFr: 'Associez chaque lettre à sa prononciation',
            pairs: [
              { id: 'l2p1', leftLabel: 'Jeem (Point au centre)', leftAudio: 'ج', rightArabic: 'ج' },
              { id: 'l2p2', leftLabel: 'Haa (Sans point)', leftAudio: 'ح', rightArabic: 'ح' },
              { id: 'l2p3', leftLabel: 'Khaa (Point au-dessus)', leftAudio: 'خ', rightArabic: 'خ' }
            ]
          }
        ]
      },
      {
        id: 'sec-a0-2-2',
        order: 2,
        categoryLabelFr: 'Diacritiques (Voyelles)',
        titleFr: 'Deuxième Section : Voyelles sur ج، ح، خ',
        steps: [
          {
            id: 'l2-v1',
            type: 'multi-select-diacritic',
            titleFr: 'Choisissez les lettres avec la marque diacritique ( Fatha )',
            targetDiacriticName: 'Fatha',
            tileOptions: [
              { id: 'jv1', arabic: 'جَ', audioText: 'جَ', isCorrect: true },
              { id: 'jv2', arabic: 'حِ', audioText: 'حِ', isCorrect: false },
              { id: 'jv3', arabic: 'خَ', audioText: 'خَ', isCorrect: true },
              { id: 'jv4', arabic: 'جُ', audioText: 'جُ', isCorrect: false },
              { id: 'jv5', arabic: 'حَ', audioText: 'حَ', isCorrect: true }
            ]
          },
          {
            id: 'l2-v2',
            type: 'choose-sound',
            titleFr: 'Choisissez le bon son pour ( خُ )',
            targetArabic: 'خُ',
            soundOptions: [
              { id: 'js1', audioText: 'خَ', labelPhonetic: 'kha', isCorrect: false },
              { id: 'js2', audioText: 'خُ', labelPhonetic: 'khou', isCorrect: true },
              { id: 'js3', audioText: 'حُ', labelPhonetic: 'ḥou', isCorrect: false },
              { id: 'js4', audioText: 'جِ', labelPhonetic: 'dji', isCorrect: false }
            ]
          }
        ]
      },
      {
        id: 'sec-a0-2-3',
        order: 3,
        categoryLabelFr: 'Quiz & Coaching',
        titleFr: 'Troisième Section : Quiz & Prononciation du ح et خ',
        premiumPromptFr: 'Enregistrez ou écrivez la différence entre « حَبّ » (grain/amour) et « خُبز » (pain). Notre enseignant corrigera votre distinction entre le Haa doux et le Khaa.',
        premiumExpectedArabic: 'حَبّ / خُبز',
        steps: [
          {
            id: 'l2-q1',
            type: 'multiple-choice',
            titleFr: 'Validation : La lettre sans aucun point',
            questionFr: 'Laquelle de ces trois lettres ne comporte aucun point et se prononce du fond de la gorge ?',
            mcOptions: [
              { id: 'm1', text: 'Jeem', arabic: 'ج', isCorrect: false },
              { id: 'm2', text: 'Haa', arabic: 'ح', isCorrect: true },
              { id: 'm3', text: 'Khaa', arabic: 'خ', isCorrect: false }
            ]
          },
          {
            id: 'l2-q2',
            type: 'multi-select-diacritic',
            titleFr: 'Choisissez les lettres portant la voyelle ( Kasra )',
            targetDiacriticName: 'Kasra',
            tileOptions: [
              { id: 'jk1', arabic: 'جِ', audioText: 'جِ', isCorrect: true },
              { id: 'jk2', arabic: 'حِ', audioText: 'حِ', isCorrect: true },
              { id: 'jk3', arabic: 'خَ', audioText: 'خَ', isCorrect: false },
              { id: 'jk4', arabic: 'خِ', audioText: 'خِ', isCorrect: true }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'lesson-a0-3',
    levelId: 'A0',
    number: 3,
    titleFr: 'Lettres (د Dal, ذ Dhal, ر Raa, ز Zay)',
    subtitleFr: 'Lettres solaires et consonnes roulées',
    badgeArabic: 'د ذ ر ز',
    sections: [
      {
        id: 'sec-a0-3-1',
        order: 1,
        categoryLabelFr: 'Lettres',
        titleFr: 'Première Section : Dal, Dhal, Raa & Zay',
        steps: [
          {
            id: 'l3-s1',
            type: 'distinguish',
            titleFr: 'Distinguer les paires ( د / ذ ) et ( ر / ز )',
            distinguishCards: [
              { arabic: 'د / ذ', ruleFr: 'Dal ( د ) est posé sur la ligne sans point ; Dhal ( ذ ) porte un point au-dessus.' },
              { arabic: 'ر / ز', ruleFr: 'Raa ( ر ) glisse sous la ligne sans point ; Zay ( ز ) porte un point au-dessus.' }
            ]
          },
          {
            id: 'l3-s2',
            type: 'match-pairs',
            titleFr: 'Associez chaque lettre à son son',
            pairs: [
              { id: 'l3p1', leftLabel: 'Dal (da)', leftAudio: 'دَ', rightArabic: 'دَ' },
              { id: 'l3p2', leftLabel: 'Raa (ra)', leftAudio: 'رَ', rightArabic: 'رَ' },
              { id: 'l3p3', leftLabel: 'Zay (za)', leftAudio: 'زَ', rightArabic: 'زَ' }
            ]
          }
        ]
      },
      {
        id: 'sec-a0-3-2',
        order: 2,
        categoryLabelFr: 'Diacritiques (Voyelles)',
        titleFr: 'Deuxième Section : Lecture rapide avec Harakât',
        steps: [
          {
            id: 'l3-v1',
            type: 'multi-select-diacritic',
            titleFr: 'Choisissez les lettres avec la marque diacritique ( Fatha )',
            targetDiacriticName: 'Fatha',
            tileOptions: [
              { id: 'd1', arabic: 'دَ', audioText: 'دَ', isCorrect: true },
              { id: 'd2', arabic: 'ذِ', audioText: 'ذِ', isCorrect: false },
              { id: 'd3', arabic: 'رَ', audioText: 'رَ', isCorrect: true },
              { id: 'd4', arabic: 'زُ', audioText: 'زُ', isCorrect: false },
              { id: 'd5', arabic: 'زَ', audioText: 'زَ', isCorrect: true }
            ]
          }
        ]
      },
      {
        id: 'sec-a0-3-3',
        order: 3,
        categoryLabelFr: 'Quiz & Coaching',
        titleFr: 'Troisième Section : Examen de fin de module A0',
        premiumPromptFr: 'Lisez et écrivez le prénom « بَدر » (Badr) et « دَار » (Maison) en expliquant pourquoi la lettre Dal ne s’attache pas à gauche.',
        premiumExpectedArabic: 'بَدر - دَار',
        steps: [
          {
            id: 'l3-q1',
            type: 'multiple-choice',
            titleFr: 'Examen A0 — Question 1',
            questionFr: 'Dans le prénom « بَدر » (Badr), quelles sont les trois lettres dans l’ordre de lecture (droite à gauche) ?',
            mcOptions: [
              { id: 'ex1', text: 'Baa - Dal - Raa', arabic: 'ب - د - ر', isCorrect: true },
              { id: 'ex2', text: 'Taa - Dhal - Zay', arabic: 'ت - ذ - ز', isCorrect: false },
              { id: 'ex3', text: 'Baa - Raa - Dal', arabic: 'ب - ر - د', isCorrect: false }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'lesson-a1-1',
    levelId: 'A1',
    number: 4,
    titleFr: 'Salutations & Présentation (بَدر وفَرَح)',
    subtitleFr: 'Lire et prononcer un dialogue complet en arabe vocalisé',
    badgeArabic: 'سَلَام',
    isLevelExam: true,
    sections: [
      {
        id: 'sec-a1-1-1',
        order: 1,
        categoryLabelFr: 'Vocabulaire',
        titleFr: 'Première Section : Se présenter en arabe',
        steps: [
          {
            id: 'a1-s1',
            type: 'learn-letter',
            titleFr: 'Expression clé : السَّلَامُ عَلَيْكُم',
            letterArabic: 'السَّلَامُ عَلَيْكُم',
            audioText: 'السَّلَامُ عَلَيْكُم',
            phoneticExplanationFr: "« As-salāmu ‘alaykum » signifie « Que la paix soit sur vous ». C'est la salutation universelle en arabe."
          },
          {
            id: 'a1-s2',
            type: 'match-pairs',
            titleFr: 'Associez chaque phrase de Badr & Farah à son sens',
            pairs: [
              { id: 'ap1', leftLabel: 'Je m’appelle Badr', leftAudio: 'اِسمي بَدر', rightArabic: 'اِسمي بَدر' },
              { id: 'ap2', leftLabel: 'Je viens d’Égypte', leftAudio: 'أَنا مِن مِصر', rightArabic: 'أَنا مِن مِصر' },
              { id: 'ap3', leftLabel: 'Je suis étudiant à l’école', leftAudio: 'أَنا طالِبٌ في المَدرَسة', rightArabic: 'أَنا طالِبٌ في المَدرَسة' }
            ]
          }
        ]
      },
      {
        id: 'sec-a1-1-2',
        order: 2,
        categoryLabelFr: 'Compréhension',
        titleFr: 'Deuxième Section : Quiz sur le texte « Badr et Farah »',
        steps: [
          {
            id: 'a1-q1',
            type: 'multiple-choice',
            titleFr: 'Compréhension écrite',
            questionFr: 'Que signifie la phrase « أَنا أُختُ بَدر » prononcée par Farah ?',
            mcOptions: [
              { id: 'ao1', text: 'Je suis la sœur de Badr', arabic: 'أَنا أُختُ بَدر', isCorrect: true },
              { id: 'ao2', text: 'Je suis le frère de Badr', arabic: 'أَنا أَخو بَدر', isCorrect: false },
              { id: 'ao3', text: 'Je suis l’amie de Badr', arabic: 'أَنا صَديقَةُ بَدر', isCorrect: false }
            ]
          }
        ]
      },
      {
        id: 'sec-a1-1-3',
        order: 3,
        categoryLabelFr: 'Examen & Coaching',
        titleFr: 'Troisième Section : Production Écrite & Orale pour le Professeur',
        premiumPromptFr: 'Présentez-vous en arabe sur le modèle de Badr et Farah : « السَّلَامُ عَلَيْكُم، اِسمي ... أَنا مِن ... » (écrit ou lecture audio) pour recevoir votre correction personnalisée.',
        premiumExpectedArabic: 'السَّلَامُ عَلَيْكُم، اِسمي ... أَنا مِن ...',
        steps: [
          {
            id: 'a1-ex1',
            type: 'multiple-choice',
            titleFr: 'Validation de la Leçon 4',
            questionFr: 'Quel mot arabe désigne « l’école » dans le texte de Badr ?',
            mcOptions: [
              { id: 'm1', text: 'Al-Madrasa', arabic: 'المَدرَسة', isCorrect: true },
              { id: 'm2', text: 'Al-Bayt', arabic: 'البَيت', isCorrect: false },
              { id: 'm3', text: 'Misr', arabic: 'مِصر', isCorrect: false }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'lesson-a1-2',
    levelId: 'A1',
    number: 5,
    titleFr: 'Liaison des Lettres & Les 6 Solitaires',
    subtitleFr: 'Comprendre comment les lettres s’attachent en début, milieu et fin de mot',
    badgeArabic: 'بَيْت',
    isLevelExam: true,
    sections: [
      {
        id: 'sec-a1-2-1',
        order: 1,
        categoryLabelFr: 'Liaison',
        titleFr: 'Première Section : Début, Milieu et Fin de mot',
        steps: [
          {
            id: 'a1-2-s1',
            type: 'distinguish',
            titleFr: 'La lettre Baa ( ب ) change d’habit selon sa place',
            distinguishCards: [
              { arabic: 'بـ', ruleFr: 'Début de mot : perd sa boucle gauche pour tendre les bras (ex: بَاب).' },
              { arabic: 'ـبـ', ruleFr: 'Milieu de mot : attachée à droite et à gauche (ex: خُبز).' },
              { arabic: 'ـب', ruleFr: 'Fin de mot : attachée à droite et retrouve sa forme complète.' }
            ]
          },
          {
            id: 'a1-2-s2',
            type: 'multiple-choice',
            titleFr: 'Règle d’or : Les 6 lettres qui ne s’attachent jamais à gauche',
            questionFr: 'Parmi ces groupes, quelles sont les 6 lettres « solitaires » qui s’attachent à droite mais jamais à la lettre qui suit à gauche ?',
            mcOptions: [
              { id: 'sol1', text: 'Alif, Dal, Dhal, Raa, Zay, Waw', arabic: 'ا د ذ ر ز و', isCorrect: true },
              { id: 'sol2', text: 'Baa, Taa, Thaa, السين', arabic: 'ب ت ث س', isCorrect: false },
              { id: 'sol3', text: 'Jeem, Haa, Khaa', arabic: 'ج ح خ', isCorrect: false }
            ]
          }
        ]
      },
      {
        id: 'sec-a1-2-2',
        order: 2,
        categoryLabelFr: 'Pratique',
        titleFr: 'Deuxième Section : Lire des mots liés avec Harakât',
        steps: [
          {
            id: 'a1-2-q1',
            type: 'match-pairs',
            titleFr: 'Associez chaque mot arabe lié à sa signification',
            pairs: [
              { id: 'w1', leftLabel: 'Bâb (Porte)', leftAudio: 'بَاب', rightArabic: 'بَاب' },
              { id: 'w2', leftLabel: 'Bayt (Maison)', leftAudio: 'بَيْت', rightArabic: 'بَيْت' },
              { id: 'w3', leftLabel: 'Kitâb (Livre)', leftAudio: 'كِتَاب', rightArabic: 'كِتَاب' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'lesson-a2-1',
    levelId: 'A2',
    number: 6,
    titleFr: 'Voyelles Longues (Madd) & Chadda (◌ّ)',
    subtitleFr: 'Prolonger le son avec ا، و، ي et doubler une consonne avec la Chadda',
    badgeArabic: 'كِتَاب',
    isLevelExam: true,
    sections: [
      {
        id: 'sec-a2-1-1',
        order: 1,
        categoryLabelFr: 'Phonétique',
        titleFr: 'Première Section : Les 3 lettres d’allongement (Madd)',
        steps: [
          {
            id: 'a2-s1',
            type: 'distinguish',
            titleFr: 'Voyelle courte vs Voyelle longue (Madd)',
            distinguishCards: [
              { arabic: 'بَا', ruleFr: 'Fatha + Alif (ا) = son long « Bâ » (2 temps).' },
              { arabic: 'بُو', ruleFr: 'Damma + Waw (و) = son long « Boû » (2 temps).' },
              { arabic: 'بِي', ruleFr: 'Kasra + Yaa (ي) = son long « Bî » (2 temps).' }
            ]
          },
          {
            id: 'a2-s2',
            type: 'multiple-choice',
            titleFr: 'La Chadda ( ّ ) : consonne doublée',
            questionFr: 'Que fait le signe Chadda ( ّ ) placé au-dessus d’une lettre comme dans « مُعَلِّم » (Mu‘allim - Professeur) ?',
            mcOptions: [
              { id: 'ch1', text: 'Il double et appuie sur la consonne (ll)', arabic: 'لِّ', isCorrect: true },
              { id: 'ch2', text: 'Il rend la lettre muette', arabic: 'لْ', isCorrect: false },
              { id: 'ch3', text: 'Il ajoute le son « oun »', arabic: 'لٌ', isCorrect: false }
            ]
          }
        ]
      },
      {
        id: 'sec-a2-1-2',
        order: 2,
        categoryLabelFr: 'Quiz A2',
        titleFr: 'Deuxième Section : Validation du Niveau A2',
        steps: [
          {
            id: 'a2-q1',
            type: 'match-pairs',
            titleFr: 'Associez chaque mot contenant un allongement à son sens',
            pairs: [
              { id: 'a2p1', leftLabel: 'Sabâh (Matin)', leftAudio: 'صَبَاح', rightArabic: 'صَبَاح' },
              { id: 'a2p2', leftLabel: 'Noûr (Lumière)', leftAudio: 'نُور', rightArabic: 'نُور' },
              { id: 'a2p3', leftLabel: 'Karîm (Généreux)', leftAudio: 'كَريم', rightArabic: 'كَريم' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'lesson-a3-1',
    levelId: 'A3',
    number: 7,
    titleFr: 'Phrases Nominales, Famille & Quotidien',
    subtitleFr: 'Construire une phrase sans verbe « être » et parler de ses proches',
    badgeArabic: 'أُسرَة',
    isLevelExam: true,
    sections: [
      {
        id: 'sec-a3-1-1',
        order: 1,
        categoryLabelFr: 'Grammaire & Sens',
        titleFr: 'Première Section : L’article défini « Al- » (الـ) et la phrase nominale',
        steps: [
          {
            id: 'a3-s1',
            type: 'distinguish',
            titleFr: 'Indéfini (Tanwîn) vs Défini (Al-)',
            distinguishCards: [
              { arabic: 'بَيْتٌ', ruleFr: 'Baytun : Une maison (indéfini avec Tanwîn -un).' },
              { arabic: 'البَيْتُ', ruleFr: 'Al-baytu : La maison (défini par الـ).' },
              { arabic: 'البَيْتُ كَبِيرٌ', ruleFr: 'La maison [est] grande (pas de verbe être au présent).' }
            ]
          },
          {
            id: 'a3-s2',
            type: 'multiple-choice',
            titleFr: 'Traduire une phrase nominale',
            questionFr: 'Comment dit-on « L’école est belle » en arabe vocalisé ?',
            mcOptions: [
              { id: 'a3o1', text: 'Al-madrasatu jamîlatun', arabic: 'المَدرَسَةُ جَمِيلَةٌ', isCorrect: true },
              { id: 'a3o2', text: 'Al-kitâbu jadîdun', arabic: 'الكِتَابُ جَدِيدٌ', isCorrect: false },
              { id: 'a3o3', text: 'Al-bâbu maftoûhun', arabic: 'البَابُ مَفتُوحٌ', isCorrect: false }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'lesson-b1-1',
    levelId: 'B1',
    number: 8,
    titleFr: 'Hospitalité Arabe & Dialogue à la Médina',
    subtitleFr: 'Comprendre un récit fluide et maîtriser les expressions d’accueil',
    badgeArabic: 'مَرحَبًا',
    isLevelExam: true,
    sections: [
      {
        id: 'sec-b1-1-1',
        order: 1,
        categoryLabelFr: 'Dialogue & Culture',
        titleFr: 'Première Section : Expressions du Marchand de Miel',
        steps: [
          {
            id: 'b1-s1',
            type: 'match-pairs',
            titleFr: 'Associez les expressions du récit « Le marchand de miel »',
            pairs: [
              { id: 'b1p1', leftLabel: 'Tôt le matin', leftAudio: 'فِي الصَّبَاحِ البَاكِرِ', rightArabic: 'فِي الصَّبَاحِ البَاكِرِ' },
              { id: 'b1p2', leftLabel: 'Le thé à la menthe', leftAudio: 'الشَّايَ بِالنَّعنَاعِ', rightArabic: 'الشَّايَ بِالنَّعنَاعِ' },
              { id: 'b1p3', leftLabel: 'Le miel pur', leftAudio: 'العَسَلِ الصَّافِي', rightArabic: 'العَسَلِ الصَّافِي' }
            ]
          },
          {
            id: 'b1-s2',
            type: 'multiple-choice',
            titleFr: 'Compréhension globale B1',
            questionFr: 'Que signifie « يَفتَحُ دُكَّانَهُ الصَّغِير » ?',
            mcOptions: [
              { id: 'b1o1', text: 'Il ouvre sa petite boutique', arabic: 'يَفتَحُ دُكَّانَهُ الصَّغِير', isCorrect: true },
              { id: 'b1o2', text: 'Il lit un grand livre', arabic: 'يَقرَأُ كِتَابًا كَبِيرًا', isCorrect: false },
              { id: 'b1o3', text: 'Il écrit une lettre', arabic: 'يَكتُبُ رِسَالَةً', isCorrect: false }
            ]
          }
        ]
      }
    ]
  }
];

export const READING_STORIES: ReadingStory[] = [
  {
    id: 'story-badr-farah',
    levelCode: 'A1',
    levelTitleFr: 'A1 - Novice bas',
    titleArabic: 'بَدر وفَرَح',
    titleFr: 'Badr et Farah à l’école',
    durationLabel: '00:19',
    summaryFr: 'Badr et sa sœur Farah se présentent dans la cour de leur école en Égypte.',
    lines: [
      {
        arabicVocalized: 'السَّلَامُ عَلَيْكُم',
        arabicUnvocalized: 'السلام عليكم',
        translit: 'As-salāmu ‘alaykum',
        translationFr: 'Que la paix soit sur vous (Bonjour)',
        audioText: 'السَّلَامُ عَلَيْكُم'
      },
      {
        arabicVocalized: 'اِسمي بَدر، أَنا مِن مِصر',
        arabicUnvocalized: 'اسمي بدر، أنا من مصر',
        translit: 'Ismī Badr, anā min Misr',
        translationFr: 'Je m’appelle Badr, je viens d’Égypte',
        audioText: 'اِسمي بَدر، أَنا مِن مِصر'
      },
      {
        arabicVocalized: 'أَنا طالِبٌ في المَدرَسة،',
        arabicUnvocalized: 'أنا طالب في المدرسة،',
        translit: 'Anā tālibun fī al-madrasa,',
        translationFr: 'Je suis élève à l’école,',
        audioText: 'أَنا طالِبٌ في المَدرَسة'
      },
      {
        arabicVocalized: 'عُمري سِتَّ عَشرَةَ سَنَةً',
        arabicUnvocalized: 'عمري ست عشرة سنة',
        translit: '‘Umrī sitta ‘ashrata sanatan',
        translationFr: 'J’ai seize ans',
        audioText: 'عُمري سِتَّ عَشرَةَ سَنَةً'
      },
      {
        arabicVocalized: 'اِسمي فَرَح، أَنا أُختُ بَدر',
        arabicUnvocalized: 'اسمي فرح، أنا أخت بدر',
        translit: 'Ismī Farah, anā ukhtu Badr',
        translationFr: 'Je m’appelle Farah, je suis la sœur de Badr',
        audioText: 'اِسمي فَرَح، أَنا أُختُ بَدر'
      }
    ],
    comprehensionQuiz: [
      {
        questionFr: 'D’où vient Badr (« أَنا مِن مِصر ») ?',
        options: ['D’Égypte (مِصر)', 'Du Maroc (المَغرِب)', 'De Jordanie (الأُردُن)'],
        correctIndex: 0
      },
      {
        questionFr: 'Quel âge a Badr (« سِتَّ عَشرَةَ سَنَةً ») ?',
        options: ['12 ans', '16 ans', '20 ans'],
        correctIndex: 1
      },
      {
        questionFr: 'Qui est Farah par rapport à Badr ?',
        options: ['Sa professeure', 'Sa sœur (أُختُ بَدر)', 'Sa cousine'],
        correctIndex: 1
      }
    ]
  },
  {
    id: 'story-sabah-al-khayr',
    levelCode: 'A2',
    levelTitleFr: 'A2 - Novice moyen',
    titleArabic: 'صَبَاحُ الخَيرِ يَا أُستَاذ',
    titleFr: 'Un matin en classe d’arabe',
    durationLabel: '00:24',
    summaryFr: 'Dialogue matinal entre l’enseignant Ustadh Karim et ses élèves autour du cahier d’écriture.',
    lines: [
      {
        arabicVocalized: 'صَبَاحُ الخَيرِ يَا طُلَّاب',
        arabicUnvocalized: 'صباح الخير يا طلاب',
        translit: 'Sabāhu al-khayri yā tullāb',
        translationFr: 'Bonjour chers étudiants',
        audioText: 'صَبَاحُ الخَيرِ يَا طُلَّاب'
      },
      {
        arabicVocalized: 'صَبَاحُ النُّورِ يَا أُستَاذ كَريم',
        arabicUnvocalized: 'صباح النور يا أستاذ كريم',
        translit: 'Sabāhu an-nūri yā Ustādh Karīm',
        translationFr: 'Bonjour (matin de lumière) professeur Karim',
        audioText: 'صَبَاحُ النُّورِ يَا أُستَاذ كَريم'
      },
      {
        arabicVocalized: 'اِفتَحوا الكِتَابَ وَاقرَأوا الدَّرسَ الأَوَّل',
        arabicUnvocalized: 'افتحوا الكتاب واقرأوا الدرس الأول',
        translit: 'Iftahū al-kitāba wa-qra’ū ad-darsa al-awwal',
        translationFr: 'Ouvrez le livre et lisez la première leçon',
        audioText: 'اِفتَحوا الكِتَابَ وَاقرَأوا الدَّرسَ الأَوَّل'
      }
    ],
    comprehensionQuiz: [
      {
        questionFr: 'Comment répond-on à « صَبَاحُ الخَير » (Sabāhu al-khayr) ?',
        options: ['صَبَاحُ النُّور (Sabāhu an-nūr)', 'مَسَاءُ الخَير (Masā’u al-khayr)', 'شُكرًا (Shukran)'],
        correctIndex: 0
      },
      {
        questionFr: 'Que demande le professeur Karim aux élèves ?',
        options: ['De fermer la porte', 'D’ouvrir le livre et lire la première leçon', 'D’écrire une lettre'],
        correctIndex: 1
      }
    ]
  },
  {
    id: 'story-souq-al-asal',
    levelCode: 'B1',
    levelTitleFr: 'B1 - Intermédiaire bas',
    titleArabic: 'بَائِعُ العَسَلِ فِي المَدِينَة',
    titleFr: 'Le marchand de miel de la médina',
    durationLabel: '00:31',
    summaryFr: 'Récit culturel sur la récolte du miel doré et l’hospitalité arabe.',
    lines: [
      {
        arabicVocalized: 'فِي الصَّبَاحِ البَاكِرِ يَفتَحُ العَمُّ سَلِيم دُكَّانَهُ الصَّغِير',
        arabicUnvocalized: 'في الصباح الباكر يفتح العم سليم دكانه الصغير',
        translit: 'Fī as-sabāhi al-bākiri yaftahu al-‘ammu Salīm dukkānahu as-saghīr',
        translationFr: 'Tôt le matin, l’oncle Salim ouvre sa petite boutique',
        audioText: 'فِي الصَّبَاحِ البَاكِرِ يَفتَحُ العَمُّ سَلِيم دُكَّانَهُ الصَّغِير'
      },
      {
        arabicVocalized: 'يُقَدِّمُ لِلضُّيُوفِ الشَّايَ بِالنَّعنَاعِ وَالعَسَلِ الصَّافِي',
        arabicUnvocalized: 'يقدم للضيوف الشاي بالنعناع والعسل الصافي',
        translit: 'Yuqaddimu li-d-duyūfi ash-shāya bi-n-na‘nā‘i wa-l-‘asali as-sāfī',
        translationFr: 'Il offre aux invités du thé à la menthe et du miel pur',
        audioText: 'يُقَدِّمُ لِلضُّيُوفِ الشَّايَ بِالنَّعنَاعِ وَالعَسَلِ الصَّافِي'
      }
    ],
    comprehensionQuiz: [
      {
        questionFr: 'Qu’offre l’oncle Salim à ses invités ?',
        options: ['Du thé à la menthe et du miel pur', 'Du café amer', 'Du jus d’orange'],
        correctIndex: 0
      }
    ]
  }
];
