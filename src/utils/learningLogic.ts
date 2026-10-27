import { ExerciseStep, Lesson, LESSONS } from '../data/curriculum';

export interface SectionResultRecord {
  sectionId: string;
  lessonId: string;
  accuracy: number;
  honeyEarned: number;
  durationFormatted: string;
  completedAt: string;
}

export interface TeacherSubmission {
  id: string;
  studentId: string;
  studentName: string;
  lessonId: string;
  lessonTitle: string;
  type: 'exercise' | 'question' | 'pronunciation';
  promptTitle: string;
  arabicTarget?: string;
  studentResponseText: string;
  hasAudioRecording: boolean;
  audioDurationSec?: number;
  audioDataUrl?: string;
  createdAt: string;
  status: 'pending' | 'reviewed';
  teacherGrade?: number; // Sur 20
  teacherFeedback?: string;
  teacherCorrectedArabic?: string;
  teacherBadge?: string;
  teacherAudioNote?: boolean;
  reviewedAt?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  isPremium: boolean;
  premiumActivatedVia?: 'code' | 'teacher' | 'whatsapp';
  honeyDrops: number;
  streakDays: number;
  streakGoalDays: 7 | 30 | 60;
  currentLevelCode: string;
  unlockedLevelCodes?: string[];
  dailyChallengeCompletedToday?: boolean;
  completedSectionIds: string[];
  masteredLetterIds: string[];
  savedWords: string[];
  sectionResults: Record<string, SectionResultRecord>;
}

export interface PlatformState {
  theme?: 'light' | 'dark';
  activeRole: 'student' | 'teacher';
  activeStudentId: string;
  students: StudentProfile[];
  submissions: TeacherSubmission[];
}

export interface WordBuilderPuzzle {
  id: string;
  wordArabic: string;
  translit: string;
  meaningFr: string;
  targetLetters: string[]; // In RTL order (1st, 2nd, 3rd...)
  positionalForms: string[]; // Connected shapes in RTL order (e.g. ['بـ', 'ـيـ', 'ـت'])
  positionRolesFr: string[]; // Role of each letter (e.g. ['Début', 'Milieu', 'Fin'])
  positionalBreakdown: string; // e.g. "بـ (Début) + ـيـ (Milieu) + ـت (Fin)"
  pedagogicalRuleFr: string;
  distractorLetters: string[];
}

export const WORD_BUILDER_PUZZLES: WordBuilderPuzzle[] = [
  {
    id: 'wb-bab',
    wordArabic: 'بَاب',
    translit: 'Bâb',
    meaningFr: 'Porte',
    targetLetters: ['ب', 'ا', 'ب'],
    positionalForms: ['بَـ', 'ـا', 'ب'],
    positionRolesFr: ['1. Début (s’attache)', '2. Milieu (Alif solitaire)', '3. Fin (isolée après Alif)'],
    positionalBreakdown: 'بَـ (Début) + ـا (Alif long /â/) + ب (Fin)',
    pedagogicalRuleFr: 'La lettre Alif (ا) prolonge la Fatha en « Bâ » mais ne s’attache jamais à gauche : le second ب reste donc détaché.',
    distractorLetters: ['ت', 'ث']
  },
  {
    id: 'wb-bayt',
    wordArabic: 'بَيْت',
    translit: 'Bayt',
    meaningFr: 'Maison',
    targetLetters: ['ب', 'ي', 'ت'],
    positionalForms: ['بَـ', 'ـيْـ', 'ـت'],
    positionRolesFr: ['1. Début (1 point bas)', '2. Milieu (2 points bas)', '3. Fin (2 points haut)'],
    positionalBreakdown: 'بَـ (Début : ba) + ـيْـ (Milieu : y) + ـت (Fin : t)',
    pedagogicalRuleFr: 'Les 3 lettres s’attachent entre elles en un seul trait continu de droite à gauche : seuls les points permettent de les distinguer !',
    distractorLetters: ['ث', 'ج']
  },
  {
    id: 'wb-badr',
    wordArabic: 'بَدر',
    translit: 'Badr',
    meaningFr: 'Pleine lune / Badr',
    targetLetters: ['ب', 'د', 'ر'],
    positionalForms: ['بَـ', 'ـدْ', 'ر'],
    positionRolesFr: ['1. Début (Baa)', '2. Milieu (Dal solitaire)', '3. Fin (Raa isolée)'],
    positionalBreakdown: 'بَـ (Début) + ـد (Milieu) + ر (Isolée)',
    pedagogicalRuleFr: 'La lettre Dal (د) fait partie des 6 lettres solitaires : elle s’attache au ب à droite, mais refuse de s’attacher au ر à gauche.',
    distractorLetters: ['ذ', 'ز']
  },
  {
    id: 'wb-kitab',
    wordArabic: 'كِتَاب',
    translit: 'Kitâb',
    meaningFr: 'Livre',
    targetLetters: ['ك', 'ت', 'ا', 'ب'],
    positionalForms: ['كِـ', 'ـتَـ', 'ـا', 'ب'],
    positionRolesFr: ['1. Début (Kaf)', '2. Milieu (Taa)', '3. Milieu (Alif long)', '4. Fin (Baa)'],
    positionalBreakdown: 'كِـ (Début : ki) + ـتَـ (Milieu : ta) + ـا (long /â/) + ب (Fin : b)',
    pedagogicalRuleFr: 'Regardez la lettre Kaf : isolée (ك), elle s’ouvre en forme d’éclair (كـ) lorsqu’elle démarre un mot !',
    distractorLetters: ['ق', 'ث']
  },
  {
    id: 'wb-salam',
    wordArabic: 'سَلَام',
    translit: 'Salâm',
    meaningFr: 'Paix / Salut',
    targetLetters: ['س', 'ل', 'ا', 'م'],
    positionalForms: ['سَـ', 'ـلَـ', 'ـا', 'م'],
    positionRolesFr: ['1. Début (Seen)', '2. Milieu (Lam)', '3. Ligature Lam-Alif (لَا)', '4. Fin (Meem)'],
    positionalBreakdown: 'سَـ (Début : sa) + ـلَا (Ligature Lam+Alif : lâ) + م (Fin : m)',
    pedagogicalRuleFr: 'Lorsque Lam (ل) est suivie de Alif (ا), elles s’enlacent toujours pour former la ligature calligraphique لَا (Lâ).',
    distractorLetters: ['ش', 'ن']
  }
];

export interface HarakatGuideItem {
  id: string;
  nameFr: string;
  arabicName: string;
  symbolDisplay: string;
  positionFr: 'Au-dessus de la lettre' | 'En dessous de la lettre';
  soundFr: string;
  mouthTipFr: string;
  colorHex: string;
  badgeBgClass: string;
  examples: { arabic: string; translit: string; meaningFr: string }[];
}

export const HARAKAT_GUIDE_ITEMS: HarakatGuideItem[] = [
  {
    id: 'fatha',
    nameFr: 'Fatha',
    arabicName: 'فَتحَة',
    symbolDisplay: '◌َ',
    positionFr: 'Au-dessus de la lettre',
    soundFr: 'Son court « A »',
    mouthTipFr: 'Ouvrez légèrement la bouche vers le haut (Fatha signifie « ouverture »).',
    colorHex: '#D97706',
    badgeBgClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700',
    examples: [
      { arabic: 'بَ', translit: 'Ba', meaningFr: 'B + Fatha' },
      { arabic: 'تَ', translit: 'Ta', meaningFr: 'T + Fatha' },
      { arabic: 'بَدر', translit: 'Badr', meaningFr: 'Pleine lune' }
    ]
  },
  {
    id: 'kasra',
    nameFr: 'Kasra',
    arabicName: 'كَسرَة',
    symbolDisplay: '◌ِ',
    positionFr: 'En dessous de la lettre',
    soundFr: 'Son court « I »',
    mouthTipFr: 'Étirez les lèvres en sourire vers le bas. C’est la seule voyelle placée SOUS la lettre !',
    colorHex: '#059669',
    badgeBgClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700',
    examples: [
      { arabic: 'بِ', translit: 'Bi', meaningFr: 'B + Kasra' },
      { arabic: 'تِ', translit: 'Ti', meaningFr: 'T + Kasra' },
      { arabic: 'مِن', translit: 'Min', meaningFr: 'De (provenance)' }
    ]
  },
  {
    id: 'damma',
    nameFr: 'Damma',
    arabicName: 'ضَمَّة',
    symbolDisplay: '◌ُ',
    positionFr: 'Au-dessus de la lettre',
    soundFr: 'Son court « OU »',
    mouthTipFr: 'Arrondissez les lèvres en avant comme la petite boucle en forme de Waw (ُ).',
    colorHex: '#0284C7',
    badgeBgClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700',
    examples: [
      { arabic: 'بُ', translit: 'Bou', meaningFr: 'B + Damma' },
      { arabic: 'تُ', translit: 'Tou', meaningFr: 'T + Damma' },
      { arabic: 'أُختُ', translit: 'Oukhtou', meaningFr: 'Sœur' }
    ]
  },
  {
    id: 'soukoun',
    nameFr: 'Soukoun',
    arabicName: 'سُكُون',
    symbolDisplay: '◌ْ',
    positionFr: 'Au-dessus de la lettre',
    soundFr: 'Silence (Consonne sèche)',
    mouthTipFr: 'Le petit rond indique qu’il n’y a AUCUNE voyelle : on prononce la consonne sèchement.',
    colorHex: '#64748B',
    badgeBgClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700',
    examples: [
      { arabic: 'بْ', translit: 'B-', meaningFr: 'Consonne muette' },
      { arabic: 'بَيْت', translit: 'Bayt', meaningFr: 'Maison (y muet)' },
      { arabic: 'مَدرَسة', translit: 'Madrasa', meaningFr: 'École (d muet)' }
    ]
  },
  {
    id: 'chadda',
    nameFr: 'Chadda',
    arabicName: 'شَدَّة',
    symbolDisplay: '◌ّ',
    positionFr: 'Au-dessus de la lettre',
    soundFr: 'Consonne doublée (×2)',
    mouthTipFr: 'Appuyez deux fois plus fort sur la consonne, comme un double « LL » ou « MM ».',
    colorHex: '#7C3AED',
    badgeBgClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700',
    examples: [
      { arabic: 'بَّ', translit: 'Bba', meaningFr: 'Double B + a' },
      { arabic: 'سِتَّ', translit: 'Sitta', meaningFr: 'Six (double T)' },
      { arabic: 'طُلَّاب', translit: 'Toullâb', meaningFr: 'Étudiants' }
    ]
  }
];

export interface DailyChallengeQuestion {
  id: string;
  tagFr: string;
  promptFr: string;
  arabicDisplay: string;
  audioText: string;
  options: { id: string; labelFr: string; arabic?: string; isCorrect: boolean }[];
  explanationFr: string;
}

export const DAILY_CHALLENGE_QUESTS: DailyChallengeQuestion[] = [
  {
    id: 'dc-1',
    tagFr: '1/3 · Défi Voyelles Harakât',
    promptFr: 'Écoutez et observez la voyelle placée SOUS la lettre. Comment se lit « بِ » ?',
    arabicDisplay: 'بِ',
    audioText: 'بِ',
    options: [
      { id: 'dc1-a', labelFr: 'Bi (Kasra sous la lettre = son i)', arabic: 'بِ', isCorrect: true },
      { id: 'dc1-b', labelFr: 'Ba (Fatha sur la lettre = son a)', arabic: 'بَ', isCorrect: false },
      { id: 'dc1-c', labelFr: 'Bou (Damma en boucle = son ou)', arabic: 'بُ', isCorrect: false }
    ],
    explanationFr: 'Le trait placé EN DESSOUS est toujours la Kasra (son « i »).'
  },
  {
    id: 'dc-2',
    tagFr: '2/3 · Défi Liaison des Lettres',
    promptFr: 'En assemblant ب (Début) + ي (Milieu) + ت (Fin), quel mot obtient-on ?',
    arabicDisplay: 'ب + ي + ت',
    audioText: 'بَيْت',
    options: [
      { id: 'dc2-a', labelFr: 'بَيْت (Bayt — Maison)', arabic: 'بَيْت', isCorrect: true },
      { id: 'dc2-b', labelFr: 'بَاب (Bâb — Porte)', arabic: 'بَاب', isCorrect: false },
      { id: 'dc2-c', labelFr: 'بَدر (Badr — Lune)', arabic: 'بَدر', isCorrect: false }
    ],
    explanationFr: 'بـ (1 point bas) + ـيـ (2 points bas) + ـت (2 points haut) forment بَيْت (Maison).'
  },
  {
    id: 'dc-3',
    tagFr: '3/3 · Défi Lecture Mot-à-Mot',
    promptFr: 'Dans la phrase « أَنا طالِبٌ في المَدرَسة », que signifie « المَدرَسة » ?',
    arabicDisplay: 'المَدرَسة',
    audioText: 'المَدرَسة',
    options: [
      { id: 'dc3-a', labelFr: 'L’école (Al-madrasa)', isCorrect: true },
      { id: 'dc3-b', labelFr: 'L’Égypte (Misr)', isCorrect: false },
      { id: 'dc3-c', labelFr: 'La paix (As-salâm)', isCorrect: false }
    ],
    explanationFr: 'المَدرَسة (Al-madrasa) vient de la racine D-R-S (étudier) et désigne l’école.'
  }
];

export const ARABIC_WORD_GLOSSARY: Record<
  string,
  { translit: string; meaningFr: string; noteFr: string }
> = {
  // Story 1: Badr et Farah à l'école
  'السَّلَامُ': { translit: 'As-salāmu', meaningFr: 'La paix', noteFr: 'الـ (la) + سَلَام (paix)' },
  'السلام': { translit: 'As-salāmu', meaningFr: 'La paix', noteFr: 'Nom défini avec article Al-' },
  'عَلَيْكُم': { translit: '‘Alaykum', meaningFr: 'Sur vous', noteFr: 'عَلَى (sur) + كُم (vous)' },
  'عليكم': { translit: '‘Alaykum', meaningFr: 'Sur vous', noteFr: 'Salutation plurielle' },
  'اِسمي': { translit: 'Ismī', meaningFr: 'Je m’appelle (Mon nom)', noteFr: 'اِسم (nom) + ي (mon)' },
  'اسمي': { translit: 'Ismī', meaningFr: 'Je m’appelle (Mon nom)', noteFr: 'اِسم (nom) + ي (mon)' },
  'بَدر': { translit: 'Badr', meaningFr: 'Badr (Pleine lune)', noteFr: 'بَ (ba) + دْ (d) + ر (r)' },
  'بدر': { translit: 'Badr', meaningFr: 'Badr (Pleine lune)', noteFr: 'Prénom masculin arabe' },
  'أَنا': { translit: 'Anā', meaningFr: 'Je / Moi', noteFr: 'Pronom personnel 1re personne' },
  'أنا': { translit: 'Anā', meaningFr: 'Je / Moi', noteFr: 'Pronom personnel 1re personne' },
  'مِن': { translit: 'Min', meaningFr: 'De (origine)', noteFr: 'مِ (mi avec Kasra) + ن (n)' },
  'من': { translit: 'Min', meaningFr: 'De (origine)', noteFr: 'Préposition de provenance' },
  'مِصر': { translit: 'Misr', meaningFr: 'Égypte', noteFr: 'مِ (mi) + ص (s) + ر (r)' },
  'مصر': { translit: 'Misr', meaningFr: 'Égypte', noteFr: 'Nom de pays' },
  'طالِبٌ': { translit: 'Tālibun', meaningFr: 'Un élève / étudiant', noteFr: 'طَا (tâ) + لِ (li) + بٌ (bun)' },
  'طالب': { translit: 'Tālibun', meaningFr: 'Un élève / étudiant', noteFr: 'Racine T-L-B (chercher le savoir)' },
  'في': { translit: 'Fī', meaningFr: 'Dans / À', noteFr: 'فِ (fi) + ي (î long)' },
  'المَدرَسة': { translit: 'Al-madrasa', meaningFr: 'L’école', noteFr: 'الـ + مَ (ma) + د (d) + رَ (ra) + سَة (sa)' },
  'المدرسة': { translit: 'Al-madrasa', meaningFr: 'L’école', noteFr: 'Lieu d’étude (racine D-R-S)' },
  'عُمري': { translit: '‘Umrī', meaningFr: 'J’ai ... ans (Mon âge)', noteFr: 'عُمر (âge) + ي (mon)' },
  'عمري': { translit: '‘Umrī', meaningFr: 'J’ai ... ans (Mon âge)', noteFr: 'عُمر (âge) + ي (mon)' },
  'سِتَّ': { translit: 'Sitta', meaningFr: 'Six (6)', noteFr: 'سِ (si) + تَّ (tta avec Chadda)' },
  'ست': { translit: 'Sitta', meaningFr: 'Six (6)', noteFr: 'Nombre 6' },
  'عَشرَةَ': { translit: '‘Ashrata', meaningFr: 'Dix (10)', noteFr: 'عَ (a) + ش (sh) + رَة (rata)' },
  'عشرة': { translit: '‘Ashrata', meaningFr: 'Dix (10)', noteFr: '6 + 10 = 16 (seize)' },
  'سَنَةً': { translit: 'Sanatan', meaningFr: 'An / Année', noteFr: 'سَ (sa) + نَ (na) + ةً (tan Tanwîn)' },
  'سنة': { translit: 'Sanatan', meaningFr: 'An / Année', noteFr: 'Singulier avec Tanwîn' },
  'فَرَح': { translit: 'Farah', meaningFr: 'Farah (Joie)', noteFr: 'فَ (fa) + رَ (ra) + ح (h)' },
  'فرح': { translit: 'Farah', meaningFr: 'Farah (Joie)', noteFr: 'Prénom féminin arabe' },
  'أُختُ': { translit: 'Ukhtu', meaningFr: 'La sœur de', noteFr: 'أُ (ou avec Damma) + خ (kh) + تُ (tou)' },
  'أخت': { translit: 'Ukhtu', meaningFr: 'La sœur de', noteFr: 'Nom de parenté' },

  // Story 2: Un matin en classe d'arabe
  'صَبَاحُ': { translit: 'Sabāhu', meaningFr: 'Matin de', noteFr: 'صَ (sa) + بَا (bâ long) + حُ (hou)' },
  'صباح': { translit: 'Sabāhu', meaningFr: 'Matin de', noteFr: 'Salutation matinale' },
  'الخَيرِ': { translit: 'Al-khayri', meaningFr: 'Le bien / La bonté', noteFr: 'صَبَاحُ الخَير = Bonjour (Matin de bien)' },
  'الخير': { translit: 'Al-khayri', meaningFr: 'Le bien / La bonté', noteFr: 'Complément du nom' },
  'يَا': { translit: 'Yā', meaningFr: 'Ô / Chers (interpellation)', noteFr: 'Particule d’appel en arabe' },
  'يا': { translit: 'Yā', meaningFr: 'Ô / Chers (interpellation)', noteFr: 'Particule d’appel' },
  'طُلَّاب': { translit: 'Tullāb', meaningFr: 'Étudiants (pluriel)', noteFr: 'طُ (tou) + لَّا (llâ avec Chadda) + ب (b)' },
  'طلاب': { translit: 'Tullāb', meaningFr: 'Étudiants (pluriel)', noteFr: 'Pluriel de طالِب (Tâlib)' },
  'النُّورِ': { translit: 'An-nūri', meaningFr: 'La lumière', noteFr: 'صَبَاحُ النُّور = Matin de lumière (Réponse)' },
  'النور': { translit: 'An-nūri', meaningFr: 'La lumière', noteFr: 'Réponse traditionnelle à Sabâh al-khayr' },
  'أُستَاذ': { translit: 'Ustādh', meaningFr: 'Professeur / Maître', noteFr: 'أُ (ou) + سْ (s) + تَا (tâ) + ذ (dh)' },
  'أستاذ': { translit: 'Ustādh', meaningFr: 'Professeur / Maître', noteFr: 'Titre de respect pour l’enseignant' },
  'كَريم': { translit: 'Karīm', meaningFr: 'Karim (Généreux)', noteFr: 'كَ (ka) + رِي (rî long) + م (m)' },
  'كريم': { translit: 'Karīm', meaningFr: 'Karim (Généreux)', noteFr: 'Prénom du professeur' },
  'اِفتَحوا': { translit: 'Iftahū', meaningFr: 'Ouvrez ! (Impératif)', noteFr: 'Racine F-T-H (ouvrir, comme Fatha)' },
  'افتحوا': { translit: 'Iftahū', meaningFr: 'Ouvrez ! (Impératif)', noteFr: 'Impératif pluriel' },
  'الكِتَابَ': { translit: 'Al-kitāba', meaningFr: 'Le livre', noteFr: 'الـ + كِ (ki) + تَا (tâ) + بَ (ba)' },
  'الكتاب': { translit: 'Al-kitāba', meaningFr: 'Le livre', noteFr: 'Racine K-T-B (écrire)' },
  'وَاقرَأوا': { translit: 'Wa-qra’ū', meaningFr: 'Et lisez !', noteFr: 'وَ (et) + اِقرَأوا (lisez)' },
  'واقرأوا': { translit: 'Wa-qra’ū', meaningFr: 'Et lisez !', noteFr: 'Racine Q-R-A (lire)' },
  'الدَّرسَ': { translit: 'Ad-darsa', meaningFr: 'La leçon / Le cours', noteFr: 'الـ + دَّ (dda) + رْ (r) + سَ (sa)' },
  'الدرس': { translit: 'Ad-darsa', meaningFr: 'La leçon / Le cours', noteFr: 'Même racine que Madrasa (D-R-S)' },
  'الأَوَّل': { translit: 'Al-awwal', meaningFr: 'Le premier / La première', noteFr: 'Avec Chadda sur le Waw (وَّ)' },
  'الأول': { translit: 'Al-awwal', meaningFr: 'Le premier / La première', noteFr: 'Adjectif ordinal' },

  // Story 3: Le marchand de miel de la médina
  'فِي': { translit: 'Fī', meaningFr: 'Dans / Durant', noteFr: 'Préposition de temps ou lieu' },
  'الصَّبَاحِ': { translit: 'As-sabāhi', meaningFr: 'Le matin', noteFr: 'Lettre solaire ص avec Chadda' },
  'الصباح': { translit: 'As-sabāhi', meaningFr: 'Le matin', noteFr: 'Nom défini' },
  'البَاكِرِ': { translit: 'Al-bākiri', meaningFr: 'Matinal / Tôt', noteFr: 'فِي الصَّبَاحِ البَاكِرِ = Tôt le matin' },
  'الباكر': { translit: 'Al-bākiri', meaningFr: 'Matinal / Tôt', noteFr: 'Adjectif' },
  'يَفتَحُ': { translit: 'Yaftahu', meaningFr: 'Il ouvre', noteFr: 'Verbe au présent (racine F-T-H)' },
  'يفتح': { translit: 'Yaftahu', meaningFr: 'Il ouvre', noteFr: 'Verbe au présent' },
  'العَمُّ': { translit: 'Al-‘ammu', meaningFr: 'L’oncle', noteFr: 'Titre affectueux de respect' },
  'العم': { translit: 'Al-‘ammu', meaningFr: 'L’oncle', noteFr: 'Nom défini' },
  'سَلِيم': { translit: 'Salīm', meaningFr: 'Salim (Sain/Paisible)', noteFr: 'Même racine que Salâm' },
  'سليم': { translit: 'Salīm', meaningFr: 'Salim', noteFr: 'Prénom masculin' },
  'دُكَّانَهُ': { translit: 'Dukkānahu', meaningFr: 'Sa boutique / Son échoppe', noteFr: 'دُكَّان (boutique) + هُ (sa)' },
  'دكانه': { translit: 'Dukkānahu', meaningFr: 'Sa boutique', noteFr: 'Nom + pronom possessif' },
  'الصَّغِير': { translit: 'As-saghīr', meaningFr: 'Le petit / La petite', noteFr: 'صَ (sa) + غِي (ghî) + ر (r)' },
  'الصغير': { translit: 'As-saghīr', meaningFr: 'Le petit', noteFr: 'Adjectif qualificatif' },
  'يُقَدِّمُ': { translit: 'Yuqaddimu', meaningFr: 'Il offre / Il sert', noteFr: 'Verbe au présent avec Chadda sur دِّ' },
  'يقدم': { translit: 'Yuqaddimu', meaningFr: 'Il offre / Il sert', noteFr: 'Verbe au présent' },
  'لِلضُّيُوفِ': { translit: 'Li-d-duyūfi', meaningFr: 'Aux invités / Aux hôtes', noteFr: 'لِـ (pour/aux) + الضُّيُوف (les invités)' },
  'للضيوف': { translit: 'Li-d-duyūfi', meaningFr: 'Aux invités', noteFr: 'Hospitalité arabe' },
  'الشَّايَ': { translit: 'Ash-shāya', meaningFr: 'Le thé', noteFr: 'الـ + شَّا (shâ) + يَ (ya)' },
  'الشاي': { translit: 'Ash-shāya', meaningFr: 'Le thé', noteFr: 'Nom défini' },
  'بِالنَّعنَاعِ': { translit: 'Bi-n-na‘nā‘i', meaningFr: 'À la menthe', noteFr: 'بِـ (avec) + النَّعنَاع (la menthe)' },
  'بالنعناع': { translit: 'Bi-n-na‘nā‘i', meaningFr: 'À la menthe', noteFr: 'Complément' },
  'وَالعَسَلِ': { translit: 'Wa-l-‘asali', meaningFr: 'Et le miel', noteFr: 'وَ (et) + العَسَل (le miel doré)' },
  'والعسل': { translit: 'Wa-l-‘asali', meaningFr: 'Et le miel', noteFr: 'Nom coordonné' },
  'الصَّافِي': { translit: 'As-sāfī', meaningFr: 'Le pur', noteFr: 'العَسَل الصَّافِي = Le miel pur' },
  'الصافي': { translit: 'As-sāfī', meaningFr: 'Le pur', noteFr: 'Adjectif' }
};

export const STORAGE_KEY = 'alifbee_academie_state_v4';

export const VALID_ACTIVATION_CODES = [
  'ALIF-PRO-2026',
  'MIEL-VIP',
  'ARABE-COACH',
  'USTADH-2026'
];

export interface CalligraphyMetricsInput {
  coveredTargetCells: number;
  targetCellsCount: number;
  onTrackSamples: number;
  offTrackSamples: number;
  startX?: number;
  endX?: number;
  isVerticalLetter?: boolean;
}

export interface CalligraphyEvaluationResult {
  coveragePct: number;
  precisionPct: number;
  overallScore: number;
  directionOk: boolean;
  passed: boolean;
  feedbackFr: string;
}

/**
 * Pure, deterministic evaluation of a student's Arabic calligraphy tracing against the target glyph mask.
 * Rejects random off-track scribbles, left-to-right backwards strokes, and tiny dots.
 */
export function evaluateCalligraphyAccuracy(
  input: CalligraphyMetricsInput
): CalligraphyEvaluationResult {
  const totalSamples = input.onTrackSamples + input.offTrackSamples;
  if (totalSamples < 6 || input.coveredTargetCells < 3) {
    return {
      coveragePct: 0,
      precisionPct: 0,
      overallScore: 0,
      directionOk: true,
      passed: false,
      feedbackFr: 'Tracez la lettre de droite à gauche sur le pochoir calligraphique.'
    };
  }

  // Centerline tracing of a dilated glyph stencil covers ~55% of the thick corridor cells
  const effectiveTarget = Math.max(6, Math.round(input.targetCellsCount * 0.52));
  const coveragePct = Math.min(
    100,
    Math.round((input.coveredTargetCells / effectiveTarget) * 100)
  );
  const precisionPct = Math.min(
    100,
    Math.round((input.onTrackSamples / Math.max(1, totalSamples)) * 100)
  );

  const directionOk =
    input.isVerticalLetter ||
    typeof input.startX !== 'number' ||
    typeof input.endX !== 'number'
      ? true
      : input.startX >= input.endX - 24;

  const rawScore = Math.round(coveragePct * 0.5 + precisionPct * 0.5);
  const overallScore = directionOk ? rawScore : Math.max(0, rawScore - 25);
  const passed =
    coveragePct >= 45 && precisionPct >= 52 && overallScore >= 56 && directionOk;

  let feedbackFr = `Excellent tracé au calame ! Précision ${precisionPct}% · Forme ${coveragePct}%.`;
  if (!directionOk) {
    feedbackFr =
      'Sens inversé : en arabe, commencez toujours votre tracé à DROITE et glissez vers la gauche (←).';
  } else if (precisionPct < 52) {
    feedbackFr = `Tracé hors-piste (Précision ${precisionPct}%) : suivez les courbes du modèle sans déborder à l’extérieur.`;
  } else if (coveragePct < 45) {
    feedbackFr = `Tracé incomplet (${coveragePct}%) : parcourez toute la lettre de droite à gauche (et placez ses points).`;
  }

  return {
    coveragePct,
    precisionPct,
    overallScore,
    directionOk,
    passed,
    feedbackFr
  };
}

/**
 * Pure validation function for all interactive exercise step types in curriculum.ts
 */
export function validateExerciseStep(
  step: ExerciseStep,
  userAnswer: {
    booleanChoice?: boolean;
    selectedId?: string;
    selectedMultiIds?: string[];
    matchedPairs?: Record<string, string>;
    tracedCoverage?: number;
    calligraphyEvaluation?: CalligraphyEvaluationResult;
  }
): { isCorrect: boolean; feedbackMessage: string } {
  switch (step.type) {
    case 'learn-letter':
    case 'distinguish':
      return {
        isCorrect: true,
        feedbackMessage: 'Parfait ! Passons à la pratique.'
      };

    case 'write-letter': {
      if (userAnswer.calligraphyEvaluation) {
        return {
          isCorrect: userAnswer.calligraphyEvaluation.passed,
          feedbackMessage: userAnswer.calligraphyEvaluation.feedbackFr
        };
      }
      const coverage = userAnswer.tracedCoverage ?? 0;
      const isCorrect = coverage >= 55;
      return {
        isCorrect,
        feedbackMessage: isCorrect
          ? 'Excellent tracé calligraphique !'
          : 'Suivez fidèlement le modèle de droite à gauche (minimum 55% de précision).'
      };
    }

    case 'listen-boolean': {
      if (typeof userAnswer.booleanChoice !== 'boolean') {
        return {
          isCorrect: false,
          feedbackMessage: 'Choisissez Vrai ou Faux après avoir écouté.'
        };
      }
      const isCorrect = userAnswer.booleanChoice === step.booleanCorrect;
      return {
        isCorrect,
        feedbackMessage: isCorrect
          ? 'Excellent, bonne réponse !'
          : `Le son prononcé était « ${step.booleanPromptAudio} » face à la lettre « ${step.booleanDisplayedArabic} ».`
      };
    }

    case 'choose-sound': {
      if (!userAnswer.selectedId) {
        return {
          isCorrect: false,
          feedbackMessage: 'Écoutez et sélectionnez l’un des 4 sons.'
        };
      }
      const chosen = step.soundOptions?.find((o) => o.id === userAnswer.selectedId);
      const correctOpt = step.soundOptions?.find((o) => o.isCorrect);
      const isCorrect = Boolean(chosen?.isCorrect);
      return {
        isCorrect,
        feedbackMessage: isCorrect
          ? 'Excellent, bonne discrimination auditive !'
          : `Le bon son pour ${step.targetArabic} était : ${correctOpt?.labelPhonetic || ''}`
      };
    }

    case 'listen-diacritic': {
      if (!userAnswer.selectedId) {
        return {
          isCorrect: false,
          feedbackMessage: 'Sélectionnez la marque diacritique correspondante.'
        };
      }
      const chosen = step.diacriticOptions?.find((o) => o.id === userAnswer.selectedId);
      const correctOpt = step.diacriticOptions?.find((o) => o.isCorrect);
      const isCorrect = Boolean(chosen?.isCorrect);
      return {
        isCorrect,
        feedbackMessage: isCorrect
          ? 'Bravo ! Vous avez identifié la bonne voyelle courte.'
          : `La bonne marque diacritique était : ${correctOpt?.nameFr || ''}`
      };
    }

    case 'multiple-choice': {
      if (!userAnswer.selectedId) {
        return {
          isCorrect: false,
          feedbackMessage: 'Veuillez sélectionner une réponse.'
        };
      }
      const chosen = step.mcOptions?.find((o) => o.id === userAnswer.selectedId);
      const correctOpt = step.mcOptions?.find((o) => o.isCorrect);
      const isCorrect = Boolean(chosen?.isCorrect);
      return {
        isCorrect,
        feedbackMessage: isCorrect
          ? 'Excellent, bonne réponse !'
          : `Réponse attendue : ${correctOpt?.text || ''} (${correctOpt?.arabic || ''})`
      };
    }

    case 'multi-select-diacritic': {
      const selected = userAnswer.selectedMultiIds || [];
      const expected = (step.tileOptions || []).filter((t) => t.isCorrect).map((t) => t.id);
      if (selected.length === 0) {
        return {
          isCorrect: false,
          feedbackMessage: 'Sélectionnez toutes les lettres portant la voyelle demandée.'
        };
      }
      const selectedSet = new Set(selected);
      const expectedSet = new Set(expected);
      const isCorrect =
        selectedSet.size === expectedSet.size &&
        [...expectedSet].every((id) => selectedSet.has(id));

      return {
        isCorrect,
        feedbackMessage: isCorrect
          ? `Bravo ! Vous avez repéré toutes les lettres avec ${step.targetDiacriticName || 'la bonne voyelle'}.`
          : `Sélectionnez uniquement les lettres portant la marque ${step.targetDiacriticName || ''} (${expected.length} attendues).`
      };
    }

    case 'match-pairs': {
      const expectedPairs = step.pairs || [];
      const given = userAnswer.matchedPairs || {};
      const isCorrect =
        expectedPairs.length > 0 &&
        expectedPairs.every((pair) => given[pair.id] === pair.rightArabic);

      return {
        isCorrect,
        feedbackMessage: isCorrect
          ? 'Toutes les paires sont correctement associées !'
          : 'Associez chaque règle ou son à la lettre arabe correspondante.'
      };
    }

    default:
      return { isCorrect: true, feedbackMessage: 'Continuons !' };
  }
}

/**
 * Pure validation for Word Builder puzzle (connecting isolated letters into an Arabic word)
 */
export function validateWordBuilderAttempt(
  puzzle: WordBuilderPuzzle,
  chosenLetters: string[]
): boolean {
  if (chosenLetters.length !== puzzle.targetLetters.length) return false;
  const normalizeAlif = (ch: string) => (ch === 'أ' || ch === 'إ' ? 'ا' : ch);
  return puzzle.targetLetters.every(
    (letter, idx) => normalizeAlif(chosenLetters[idx]) === normalizeAlif(letter)
  );
}

/**
 * Pure calculation of section score, accuracy %, honey drops, and pass status
 */
export function calculateSectionOutcome(
  correctCount: number,
  totalSteps: number,
  elapsedSeconds: number,
  baseHoneyReward = 20
): {
  accuracy: number;
  honeyEarned: number;
  durationFormatted: string;
  passed: boolean;
} {
  const safeTotal = Math.max(1, totalSteps);
  const clampedCorrect = Math.max(0, Math.min(correctCount, safeTotal));
  const accuracy = Math.round((clampedCorrect / safeTotal) * 100);
  const passed = accuracy >= 70;

  const honeyEarned = passed
    ? Math.max(5, Math.round((accuracy / 100) * baseHoneyReward))
    : 5;

  const safeSec = Math.max(1, Math.floor(elapsedSeconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  const durationFormatted = `${mins}:${secs.toString().padStart(2, '0')}m`;

  return {
    accuracy,
    honeyEarned,
    durationFormatted,
    passed
  };
}

/**
 * Removes Arabic short vowel diacritics (Harakât / Tachkîl) for the Reading Studio toggle
 */
export function stripArabicDiacritics(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * Checks whether a section is unlocked based on student's completedSectionIds
 */
export function isSectionUnlocked(
  lessonId: string,
  sectionId: string,
  completedSectionIds: string[],
  lessons: Lesson[] = LESSONS,
  unlockedLevelCodes?: string[]
): boolean {
  const lessonIndex = lessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex === -1) return false;

  const lesson = lessons[lessonIndex];
  const sectionIndex = lesson.sections.findIndex((s) => s.id === sectionId);
  if (sectionIndex === -1) return false;

  if (lessonIndex === 0 && sectionIndex === 0) {
    return true;
  }

  if (completedSectionIds.includes(sectionId)) {
    return true;
  }

  if (sectionIndex > 0) {
    const prevSection = lesson.sections[sectionIndex - 1];
    return completedSectionIds.includes(prevSection.id);
  }

  // If this is the first section of the first lesson of a level that was explicitly unlocked
  const levelLessons = lessons.filter((l) => l.levelId === lesson.levelId);
  if (
    levelLessons[0]?.id === lesson.id &&
    sectionIndex === 0 &&
    unlockedLevelCodes?.includes(lesson.levelId)
  ) {
    return true;
  }

  const prevLesson = lessons[lessonIndex - 1];
  const lastSectionOfPrevLesson = prevLesson.sections[prevLesson.sections.length - 1];
  return completedSectionIds.includes(lastSectionOfPrevLesson.id);
}

/**
 * Checks if a level (A0, A1, A2, A3, B1) is unlocked for the student
 */
export function isLevelUnlocked(
  levelCode: string,
  completedSectionIds: string[],
  currentLevelOrUnlocked: string | string[] = 'A0',
  lessons: Lesson[] = LESSONS
): boolean {
  const order = ['A0', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3'];
  const targetIdx = order.indexOf(levelCode);
  if (targetIdx <= 0) return true;

  if (Array.isArray(currentLevelOrUnlocked)) {
    if (currentLevelOrUnlocked.includes(levelCode)) return true;
  } else if (typeof currentLevelOrUnlocked === 'string') {
    const currentIdx = order.indexOf(currentLevelOrUnlocked);
    if (targetIdx <= currentIdx) return true;
  }

  // Check if the first lesson of this level has its first section unlocked
  const levelLessons = lessons.filter((l) => l.levelId === levelCode);
  if (levelLessons.length === 0) return false;
  return isSectionUnlocked(
    levelLessons[0].id,
    levelLessons[0].sections[0].id,
    completedSectionIds,
    lessons
  );
}

/**
 * Computes the highest unlocked level code based on completed sections
 */
export function computeHighestUnlockedLevel(
  completedSectionIds: string[],
  fallbackLevel = 'A0',
  lessons: Lesson[] = LESSONS
): string {
  const order = ['A0', 'A1', 'A2', 'A3', 'B1'];
  let highest = fallbackLevel;
  for (const lvl of order) {
    const levelLessons = lessons.filter((l) => l.levelId === lvl);
    if (levelLessons.length === 0) continue;
    const firstUnlocked = isSectionUnlocked(
      levelLessons[0].id,
      levelLessons[0].sections[0].id,
      completedSectionIds,
      lessons
    );
    if (firstUnlocked && order.indexOf(lvl) > order.indexOf(highest)) {
      highest = lvl;
    }
  }
  return highest;
}

/**
 * Validates Premium activation code (no credit card checkout)
 */
export function verifyPremiumActivationCode(inputCode: string): boolean {
  const normalized = inputCode.trim().toUpperCase();
  return VALID_ACTIVATION_CODES.includes(normalized);
}

/**
 * Computes official Certificate summary for a student
 */
export function computeStudentCertificateSummary(
  student: StudentProfile,
  submissions: TeacherSubmission[]
): {
  avgAccuracy: number;
  avgTeacherGrade: number;
  certificateSerial: string;
  mentionFr: string;
} {
  const records = Object.values(student.sectionResults || {});
  const avgAccuracy =
    records.length > 0
      ? Math.round(records.reduce((s, r) => s + r.accuracy, 0) / records.length)
      : 92;

  const gradedSubs = submissions.filter(
    (s) => s.studentId === student.id && s.status === 'reviewed' && typeof s.teacherGrade === 'number'
  );
  const avgTeacherGrade =
    gradedSubs.length > 0
      ? Math.round(
          (gradedSubs.reduce((s, r) => s + (r.teacherGrade || 18), 0) / gradedSubs.length) * 10
        ) / 10
      : 18;

  const mentionFr =
    avgAccuracy >= 90 ? 'Mention Très Bien • Excellence' : 'Mention Bien • Félicitations';

  const certificateSerial = `AB-${student.currentLevelCode}-${student.id.toUpperCase()}-2026`;

  return {
    avgAccuracy,
    avgTeacherGrade,
    certificateSerial,
    mentionFr
  };
}

/**
 * Pure state transition: Record a completed section for a student and auto-advance level
 */
export function recordSectionCompletion(
  state: PlatformState,
  studentId: string,
  lessonId: string,
  sectionId: string,
  accuracy: number,
  honeyEarned: number,
  durationFormatted: string,
  newlyMasteredLetters: string[] = []
): PlatformState {
  return {
    ...state,
    students: state.students.map((student) => {
      if (student.id !== studentId) return student;

      const alreadyCompleted = student.completedSectionIds.includes(sectionId);
      const completedSectionIds = alreadyCompleted
        ? student.completedSectionIds
        : [...student.completedSectionIds, sectionId];

      const masteredSet = new Set([...student.masteredLetterIds, ...newlyMasteredLetters]);
      const nextLevelCode = computeHighestUnlockedLevel(
        completedSectionIds,
        student.currentLevelCode,
        LESSONS
      );
      const unlockedLevels = Array.from(
        new Set([...(student.unlockedLevelCodes || ['A0']), nextLevelCode])
      );

      return {
        ...student,
        currentLevelCode: nextLevelCode,
        unlockedLevelCodes: unlockedLevels,
        honeyDrops: student.honeyDrops + honeyEarned,
        completedSectionIds,
        masteredLetterIds: Array.from(masteredSet),
        sectionResults: {
          ...student.sectionResults,
          [sectionId]: {
            sectionId,
            lessonId,
            accuracy,
            honeyEarned,
            durationFormatted,
            completedAt: new Date().toISOString()
          }
        }
      };
    })
  };
}

/**
 * Pure state transition: Unlock all prerequisite sections up to a target level so the student can study any level freely
 */
export function unlockLevelForStudent(
  state: PlatformState,
  studentId: string,
  targetLevelCode: string,
  lessons: Lesson[] = LESSONS
): PlatformState {
  const order = ['A0', 'A1', 'A2', 'A3', 'B1'];
  const targetIdx = order.indexOf(targetLevelCode);
  if (targetIdx <= 0) return state;

  const prereqSectionIds: string[] = [];
  for (const lesson of lessons) {
    const lvlIdx = order.indexOf(lesson.levelId);
    if (lvlIdx >= 0 && lvlIdx < targetIdx) {
      for (const sec of lesson.sections) {
        prereqSectionIds.push(sec.id);
      }
    }
  }

  return {
    ...state,
    students: state.students.map((st) => {
      if (st.id !== studentId) return st;
      const mergedSections = Array.from(new Set([...st.completedSectionIds, ...prereqSectionIds]));
      const mergedLevels = Array.from(
        new Set([...(st.unlockedLevelCodes || ['A0']), targetLevelCode])
      );
      return {
        ...st,
        currentLevelCode: targetLevelCode,
        unlockedLevelCodes: mergedLevels,
        completedSectionIds: mergedSections
      };
    })
  };
}

/**
 * Pure state transition: Complete Daily Challenge ("Défi Quotidien")
 */
export function completeDailyChallenge(
  state: PlatformState,
  studentId: string,
  bonusHoney = 30
): PlatformState {
  return {
    ...state,
    students: state.students.map((st) =>
      st.id === studentId
        ? {
            ...st,
            honeyDrops: st.honeyDrops + bonusHoney,
            streakDays: st.streakDays + 1,
            dailyChallengeCompletedToday: true
          }
        : st
    )
  };
}

/**
 * Pure state transition: Toggle or activate Premium status for a student
 */
export function setStudentPremiumStatus(
  state: PlatformState,
  studentId: string,
  isPremium: boolean,
  activatedVia: 'code' | 'teacher' | 'whatsapp' = 'teacher'
): PlatformState {
  return {
    ...state,
    students: state.students.map((student) =>
      student.id === studentId
        ? {
            ...student,
            isPremium,
            premiumActivatedVia: isPremium ? activatedVia : undefined
          }
        : student
    )
  };
}

/**
 * Pure state transition: Student submits an exercise or question to the Teacher
 */
export function createTeacherSubmission(
  state: PlatformState,
  payload: {
    studentId: string;
    lessonId: string;
    lessonTitle: string;
    type: 'exercise' | 'question' | 'pronunciation';
    promptTitle: string;
    arabicTarget?: string;
    studentResponseText: string;
    hasAudioRecording: boolean;
    audioDurationSec?: number;
    audioDataUrl?: string;
  }
): PlatformState {
  const student = state.students.find((s) => s.id === payload.studentId);
  if (!student) return state;

  const newSubmission: TeacherSubmission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId: student.id,
    studentName: student.name,
    lessonId: payload.lessonId,
    lessonTitle: payload.lessonTitle,
    type: payload.type,
    promptTitle: payload.promptTitle,
    arabicTarget: payload.arabicTarget,
    studentResponseText: payload.studentResponseText,
    hasAudioRecording: payload.hasAudioRecording,
    audioDurationSec: payload.audioDurationSec,
    audioDataUrl: payload.audioDataUrl,
    createdAt: 'À l’instant',
    status: 'pending'
  };

  return {
    ...state,
    submissions: [newSubmission, ...state.submissions]
  };
}

/**
 * Pure state transition: Teacher grades and corrects a student submission
 */
export function applyTeacherCorrection(
  state: PlatformState,
  submissionId: string,
  grade: number,
  feedbackText: string,
  correctedArabic?: string,
  includeAudioNote = true,
  teacherBadge = 'Articulation Makhârij validée'
): PlatformState {
  const clampedGrade = Math.max(0, Math.min(20, Math.round(grade)));

  return {
    ...state,
    submissions: state.submissions.map((sub) =>
      sub.id === submissionId
        ? {
            ...sub,
            status: 'reviewed',
            teacherGrade: clampedGrade,
            teacherFeedback: feedbackText.trim(),
            teacherCorrectedArabic: correctedArabic?.trim() || sub.arabicTarget,
            teacherBadge,
            teacherAudioNote: includeAudioNote,
            reviewedAt: 'Corrigé à l’instant'
          }
        : sub
    )
  };
}

export function getInitialPlatformState(): PlatformState {
  return {
    theme: 'light',
    activeRole: 'student',
    activeStudentId: 'student-1',
    students: [
      {
        id: 'student-1',
        name: 'Yasmine Mansouri',
        email: 'yasmine.mansouri@exemple.fr',
        avatarInitials: 'YM',
        isPremium: true,
        premiumActivatedVia: 'code',
        honeyDrops: 140,
        streakDays: 5,
        streakGoalDays: 30,
        currentLevelCode: 'A0',
        completedSectionIds: ['sec-a0-1-1', 'sec-a0-1-2'],
        masteredLetterIds: ['alif', 'baa', 'taa', 'thaa'],
        savedWords: ['السَّلَامُ', 'بَدر'],
        sectionResults: {
          'sec-a0-1-1': {
            sectionId: 'sec-a0-1-1',
            lessonId: 'lesson-a0-1',
            accuracy: 100,
            honeyEarned: 20,
            durationFormatted: '1:48m',
            completedAt: '2026-03-28T10:15:00Z'
          },
          'sec-a0-1-2': {
            sectionId: 'sec-a0-1-2',
            lessonId: 'lesson-a0-1',
            accuracy: 92,
            honeyEarned: 20,
            durationFormatted: '2:05m',
            completedAt: '2026-03-29T14:20:00Z'
          }
        }
      },
      {
        id: 'student-2',
        name: 'Lucas Chevalier',
        email: 'lucas.chevalier@exemple.fr',
        avatarInitials: 'LC',
        isPremium: false,
        honeyDrops: 60,
        streakDays: 2,
        streakGoalDays: 7,
        currentLevelCode: 'A0',
        completedSectionIds: ['sec-a0-1-1'],
        masteredLetterIds: ['alif', 'baa', 'taa'],
        savedWords: [],
        sectionResults: {
          'sec-a0-1-1': {
            sectionId: 'sec-a0-1-1',
            lessonId: 'lesson-a0-1',
            accuracy: 85,
            honeyEarned: 17,
            durationFormatted: '2:12m',
            completedAt: '2026-03-29T09:10:00Z'
          }
        }
      },
      {
        id: 'student-3',
        name: 'Inès Benali',
        email: 'ines.benali@exemple.fr',
        avatarInitials: 'IB',
        isPremium: true,
        premiumActivatedVia: 'teacher',
        honeyDrops: 320,
        streakDays: 14,
        streakGoalDays: 30,
        currentLevelCode: 'A1',
        completedSectionIds: [
          'sec-a0-1-1',
          'sec-a0-1-2',
          'sec-a0-1-3',
          'sec-a0-2-1',
          'sec-a0-2-2',
          'sec-a0-2-3'
        ],
        masteredLetterIds: [
          'alif',
          'baa',
          'taa',
          'thaa',
          'jeem',
          'haa',
          'khaa',
          'dal',
          'dhal',
          'raa',
          'zay'
        ],
        savedWords: ['المَدرَسة', 'مِصر'],
        sectionResults: {
          'sec-a0-1-1': {
            sectionId: 'sec-a0-1-1',
            lessonId: 'lesson-a0-1',
            accuracy: 100,
            honeyEarned: 20,
            durationFormatted: '1:30m',
            completedAt: '2026-03-20T18:00:00Z'
          },
          'sec-a0-1-3': {
            sectionId: 'sec-a0-1-3',
            lessonId: 'lesson-a0-1',
            accuracy: 95,
            honeyEarned: 20,
            durationFormatted: '1:55m',
            completedAt: '2026-03-21T18:00:00Z'
          }
        }
      }
    ],
    submissions: [
      {
        id: 'sub-seed-1',
        studentId: 'student-1',
        studentName: 'Yasmine Mansouri',
        lessonId: 'lesson-a0-1',
        lessonTitle: 'Leçon 1 : Lettres (ب Baa, ت Taa, ث Thaa)',
        type: 'pronunciation',
        promptTitle: 'Prononciation de Thaa (ث) vs Taa (ت)',
        arabicTarget: 'ثَ - ثِ - ثُ / تَ - تِ - تُ',
        studentResponseText:
          'Bonjour Ustadh Karim, voici ma lecture de بَ بِ بُ et ثَ ثِ ثُ.',
        hasAudioRecording: true,
        audioDurationSec: 14,
        createdAt: 'Hier à 18:40',
        status: 'reviewed',
        teacherGrade: 18,
        teacherFeedback:
          'Excellent travail Yasmine ! Le point d’articulation interdental de la lettre ث (Thaa) est très net sur ثَ et ثُ. Attention seulement sur la Kasra (ثِ) à ne pas glisser vers le son "Si".',
        teacherCorrectedArabic: 'ثَ (Tha) • ثِ (Thi) • ثُ (Thou)',
        teacherBadge: 'Prononciation interdentale maîtrisée',
        teacherAudioNote: true,
        reviewedAt: 'Aujourd’hui à 09:15'
      },
      {
        id: 'sub-seed-2',
        studentId: 'student-1',
        studentName: 'Yasmine Mansouri',
        lessonId: 'lesson-a0-2',
        lessonTitle: 'Leçon 2 : Lettres (ج Jeem, ح Haa, خ Khaa)',
        type: 'question',
        promptTitle: 'Différence entre ح (Haa) et خ (Khaa)',
        arabicTarget: 'حَ / خَ / حَبّ / خُبز',
        studentResponseText:
          'Je confonds parfois la prononciation de ح dans حَبّ et خ dans خُبز. Avez-vous une astuce ?',
        hasAudioRecording: true,
        audioDurationSec: 11,
        createdAt: 'Il y a 25 min',
        status: 'pending'
      },
      {
        id: 'sub-seed-3',
        studentId: 'student-3',
        studentName: 'Inès Benali',
        lessonId: 'lesson-a1-1',
        lessonTitle: 'Leçon 4 : Salutations & Présentation (بَدر وفَرَح)',
        type: 'exercise',
        promptTitle: 'Lecture vocale du dialogue « بَدر وفَرَح »',
        arabicTarget: 'اِسمي بَدر، أَنا مِن مِصر.',
        studentResponseText:
          'Voici ma lecture complète du texte de Badr et Farah sans les voyelles.',
        hasAudioRecording: true,
        audioDurationSec: 28,
        createdAt: 'Il y a 1 heure',
        status: 'pending'
      }
    ]
  };
}

export function loadPlatformState(): PlatformState {
  if (typeof window === 'undefined') {
    return getInitialPlatformState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialPlatformState();
    const parsed = JSON.parse(raw) as PlatformState;
    if (!parsed || !Array.isArray(parsed.students) || parsed.students.length === 0) {
      return getInitialPlatformState();
    }
    return parsed;
  } catch {
    return getInitialPlatformState();
  }
}

export function savePlatformState(state: PlatformState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
