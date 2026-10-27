import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Crown,
  Send,
  Volume2,
  Award,
  Mic
} from 'lucide-react';
import {
  StudentProfile,
  TeacherSubmission
} from '../utils/learningLogic';
import { audioEngine } from '../utils/audioEngine';
import { ColoredArabic } from './ColoredArabic';

interface TeacherDashboardViewProps {
  students: StudentProfile[];
  submissions: TeacherSubmission[];
  onToggleStudentPremium: (studentId: string) => void;
  onReviewSubmission: (
    submissionId: string,
    grade: number,
    feedbackText: string,
    includeAudioNote?: boolean,
    teacherBadge?: string
  ) => void;
}

const SKILL_BADGES = [
  'Prononciation interdentale maîtrisée',
  'Voyelles Harakât parfaites',
  'Liaison fluide des lettres',
  'Lecture expressive & rythmée'
];

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  students,
  submissions,
  onToggleStudentPremium,
  onReviewSubmission
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [activeGradingId, setActiveGradingId] = useState<string | null>(
    submissions.find(s => s.status === 'pending')?.id || submissions[0]?.id || null
  );

  const [gradeInput, setGradeInput] = useState<number>(18);
  const [feedbackInput, setFeedbackInput] = useState<string>(
    'Très bonne articulation ! Continuez ainsi.'
  );
  const [includeAudioNote, setIncludeAudioNote] = useState<boolean>(true);
  const [selectedBadge, setSelectedBadge] = useState<string>(SKILL_BADGES[0]);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const filteredSubmissions = submissions.filter(s => {
    if (filterStatus === 'pending') return s.status === 'pending';
    if (filterStatus === 'reviewed') return s.status === 'reviewed';
    return true;
  });

  const selectedSubmission =
    submissions.find(s => s.id === activeGradingId) || filteredSubmissions[0] || null;

  const handleSelectSubmission = (sub: TeacherSubmission) => {
    setActiveGradingId(sub.id);
    setGradeInput(sub.teacherGrade ?? 18);
    setFeedbackInput(
      sub.teacherFeedback ||
        'Très bon travail ! La distinction des voyelles courtes est bien respectée.'
    );
    setIncludeAudioNote(sub.teacherAudioNote ?? true);
    setSelectedBadge(sub.teacherBadge || SKILL_BADGES[0]);
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    onReviewSubmission(
      selectedSubmission.id,
      gradeInput,
      feedbackInput,
      includeAudioNote,
      selectedBadge
    );
    audioEngine.playFeedbackChime(true);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Minimal Header */}
      <div className="bg-[#1A1325] text-white rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-300">
            Espace Enseignant · Oustadh Yassine
          </span>
          <h1 className="font-display text-2xl font-bold mt-0.5">
            Correction des Élèves & Accès Premium
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-purple-200">
          <span>
            <strong className="text-amber-300 font-mono text-base">
              {submissions.filter(s => s.status === 'pending').length}
            </strong>{' '}
            en attente
          </span>
          <span>·</span>
          <span>
            <strong className="text-emerald-400 font-mono text-base">
              {students.filter(s => s.isPremium).length}/{students.length}
            </strong>{' '}
            élèves Premium
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Roster */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1C1426] rounded-3xl p-5 border border-[#E6DEC8] dark:border-[#2F2340] shadow-sm space-y-4">
          <h2 className="font-display text-lg font-bold text-[#1A1325] dark:text-[#F7F3EE]">
            Élèves inscrits ({students.length})
          </h2>

          <div className="space-y-2.5">
            {students.map(st => {
              return (
                <div
                  key={st.id}
                  className="p-3.5 rounded-2xl bg-[#FBF8F3] dark:bg-[#120D18] border border-[#E6DEC8] dark:border-[#352847] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#3B1C54] flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {st.avatarInitials}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1A1325] dark:text-[#F7F3EE]">{st.name}</div>
                      <div className="text-[11px] text-[#5E526E] dark:text-[#B9AFC7]">
                        Niveau {st.currentLevelCode} · {st.completedSectionIds.length} sections ·{' '}
                        {st.masteredLetterIds.length}/28 lettres
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleStudentPremium(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      st.isPremium
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-white dark:bg-[#1C1426] text-[#5E526E] dark:text-[#B9AFC7] border border-[#E6DEC8] dark:border-[#352847]'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>{st.isPremium ? 'Premium Actif' : 'Activer Premium'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Submissions Queue & Grading Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-[#1C1426] rounded-3xl p-5 border border-[#E6DEC8] dark:border-[#2F2340] shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#1A1325] dark:text-[#F7F3EE]">
                Copies & Prononciations
              </h2>
              <div className="flex items-center gap-1 bg-[#FBF8F3] dark:bg-[#120D18] p-1 rounded-xl border border-[#E6DEC8] dark:border-[#352847]">
                {(
                  [
                    { id: 'all', label: 'Tous' },
                    { id: 'pending', label: 'À corriger' },
                    { id: 'reviewed', label: 'Corrigés' }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterStatus === tab.id
                        ? 'bg-[#3B1C54] text-white'
                        : 'text-[#5E526E] dark:text-[#B9AFC7]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredSubmissions.map(sub => {
                const isSelected = selectedSubmission?.id === sub.id;
                const isPending = sub.status === 'pending';
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelectSubmission(sub)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#3B1C54] dark:border-amber-400 bg-[#3B1C54]/5 dark:bg-amber-400/10'
                        : 'border-[#E6DEC8] dark:border-[#352847] bg-[#FBF8F3] dark:bg-[#120D18]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#1A1325] dark:text-[#F7F3EE] mb-1">
                      <span>{sub.studentName}</span>
                      {isPending ? (
                        <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> À corriger
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {sub.teacherGrade}/20
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5E526E] dark:text-[#B9AFC7] truncate">
                      {sub.lessonTitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSubmission && (
            <form
              onSubmit={handleSaveCorrection}
              className="bg-white dark:bg-[#1C1426] rounded-3xl p-5 border border-[#E6DEC8] dark:border-[#2F2340] shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E6DEC8] dark:border-[#2F2340] pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-[#1A1325] dark:text-[#F7F3EE]">
                    Copie de {selectedSubmission.studentName}
                  </h3>
                  <p className="text-xs text-[#5E526E] dark:text-[#B9AFC7]">
                    {selectedSubmission.lessonTitle}
                  </p>
                </div>
                {selectedSubmission.arabicTarget && (
                  <button
                    type="button"
                    onClick={() =>
                      audioEngine.speakArabic(selectedSubmission.arabicTarget!, { rate: 0.85 })
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#FBF8F3] dark:bg-[#120D18] border border-[#E6DEC8] dark:border-[#352847] flex items-center gap-2 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-[#3B1C54] dark:text-amber-300" />
                    <span dir="rtl" lang="ar" className="font-arabic text-2xl text-[#1A1325] dark:text-[#F7F3EE]">
                      <ColoredArabic text={selectedSubmission.arabicTarget} />
                    </span>
                  </button>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FBF8F3] dark:bg-[#120D18] border border-[#E6DEC8] dark:border-[#352847] text-xs text-[#1A1325] dark:text-[#F7F3EE]">
                « {selectedSubmission.studentResponseText} »
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="teacher-grade-input"
                    className="block text-xs font-semibold text-[#5E526E] dark:text-[#B9AFC7] mb-1"
                  >
                    Note sur 20
                  </label>
                  <input
                    id="teacher-grade-input"
                    type="number"
                    min={0}
                    max={20}
                    value={gradeInput}
                    onChange={e => setGradeInput(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E6DEC8] dark:border-[#352847] bg-[#FBF8F3] dark:bg-[#120D18] px-3 py-2 text-sm font-mono font-bold text-[#1A1325] dark:text-[#F7F3EE]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="teacher-badge-select"
                    className="block text-xs font-semibold text-[#5E526E] dark:text-[#B9AFC7] mb-1"
                  >
                    Badge de compétence décerné
                  </label>
                  <select
                    id="teacher-badge-select"
                    value={selectedBadge}
                    onChange={e => setSelectedBadge(e.target.value)}
                    className="w-full rounded-xl border border-[#E6DEC8] dark:border-[#352847] bg-[#FBF8F3] dark:bg-[#120D18] px-3 py-2 text-xs font-semibold text-[#1A1325] dark:text-[#F7F3EE]"
                  >
                    {SKILL_BADGES.map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="teacher-feedback-textarea"
                  className="block text-xs font-semibold text-[#5E526E] dark:text-[#B9AFC7] mb-1"
                >
                  Correction personnalisée & Note vocale
                </label>
                <textarea
                  id="teacher-feedback-textarea"
                  rows={2}
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  className="w-full rounded-xl border border-[#E6DEC8] dark:border-[#352847] bg-[#FBF8F3] dark:bg-[#120D18] p-3 text-xs text-[#1A1325] dark:text-[#F7F3EE]"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIncludeAudioNote(true);
                    audioEngine.playFeedbackChime(true);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] dark:bg-[#120D18] border border-[#E6DEC8] dark:border-[#352847] text-xs font-semibold text-[#3B1C54] dark:text-amber-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>{includeAudioNote ? 'Vocal prof joint ✓' : 'Joindre vocal prof'}</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer ml-auto"
                >
                  <Award className="w-3.5 h-3.5" />
                  <Send className="w-3.5 h-3.5" />
                  <span>Publier la correction</span>
                </button>
              </div>
              {savedNotice && (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Correction enregistrée et envoyée à l’élève !
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
