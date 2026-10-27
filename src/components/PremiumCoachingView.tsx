import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Mic,
  Send,
  CheckCircle2,
  Clock,
  Volume2,
  KeyRound,
  ExternalLink,
  Award,
  Calendar,
  Headphones,
  X,
  Printer
} from 'lucide-react';
import {
  StudentProfile,
  TeacherSubmission,
  VALID_ACTIVATION_CODES,
  computeStudentCertificateSummary
} from '../utils/learningLogic';
import { LESSONS } from '../data/curriculum';
import { audioEngine } from '../utils/audioEngine';
import { ColoredArabic, AudioWaveform } from './ColoredArabic';

interface PremiumCoachingViewProps {
  student: StudentProfile;
  submissions: TeacherSubmission[];
  onActivatePremiumWithCode: (code: string) => boolean;
  onUnlockDemoPremium: () => void;
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
}

export const PremiumCoachingView: React.FC<PremiumCoachingViewProps> = ({
  student,
  submissions,
  onActivatePremiumWithCode,
  onUnlockDemoPremium,
  onSubmitToTeacher
}) => {
  const [activationCode, setActivationCode] = useState('');
  const [activationStatus, setActivationStatus] = useState<'idle' | 'error' | 'success'>('idle');

  const [selectedLessonId, setSelectedLessonId] = useState<string>(LESSONS[0].id);
  const [arabicTarget, setArabicTarget] = useState<string>('بَاب — بَيْت — ثَوْب');
  const [studentMessage, setStudentMessage] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedSec, setRecordedSec] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | undefined>(undefined);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordedSec(prev => {
        if (prev >= 10) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          setIsRecording(false);
          return 10;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleToggleRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setRecordedSec(s => Math.max(4, s));
      return;
    }

    setRecordedSec(0);
    setRecordedAudioUrl(undefined);
    setIsRecording(true);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setRecordedAudioUrl(URL.createObjectURL(blob));
          stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
      }
    } catch {
      // Fallback to timer simulation
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onActivatePremiumWithCode(activationCode);
    if (ok) {
      setActivationStatus('success');
      audioEngine.playFeedbackChime(true);
      setActivationCode('');
    } else {
      setActivationStatus('error');
      audioEngine.playFeedbackChime(false);
    }
  };

  const handleSendSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.isPremium) return;
    const lessonObj = LESSONS.find(l => l.id === selectedLessonId) || LESSONS[0];
    if (!studentMessage.trim() && recordedSec === 0) return;

    onSubmitToTeacher({
      lessonId: lessonObj.id,
      lessonTitle: `${lessonObj.titleFr} (${lessonObj.subtitleFr})`,
      type: recordedSec > 0 ? 'pronunciation' : 'question',
      promptTitle: `Envoi direct · ${lessonObj.titleFr}`,
      arabicTarget: arabicTarget.trim() || undefined,
      studentResponseText:
        studentMessage.trim() ||
        `Enregistrement vocal (${recordedSec}s) sur ${arabicTarget}.`,
      hasAudioRecording: recordedSec > 0,
      audioDurationSec: recordedSec > 0 ? recordedSec : undefined,
      audioDataUrl: recordedAudioUrl
    });

    setStudentMessage('');
    setRecordedSec(0);
    setRecordedAudioUrl(undefined);
    audioEngine.playFeedbackChime(true);
  };

  const playVoiceComparison = (sub: TeacherSubmission) => {
    setPlayingVoiceId(sub.id);
    const target = sub.arabicTarget || 'بَاب';
    audioEngine.speakArabic(target, {
      rate: 0.82,
      onEnd: () => {
        if (sub.audioDataUrl) {
          const audio = new Audio(sub.audioDataUrl);
          audio.onended = () => setPlayingVoiceId(null);
          audio.onerror = () => setPlayingVoiceId(null);
          audio.play().catch(() => setPlayingVoiceId(null));
        } else {
          setTimeout(() => setPlayingVoiceId(null), 500);
        }
      }
    });
  };

  const studentSubmissions = submissions.filter(s => s.studentId === student.id);
  const certSummary = computeStudentCertificateSummary(student, submissions);

  return (
    <div className="space-y-6">
      {/* Top Status Bar + Official Certificate & 15-min Booking */}
      <div className="bg-[#3B1C54] rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
            <Crown className="w-4 h-4" />
            <span>
              {student.isPremium ? 'Suivi Professeur Actif · Oustadh Yassine' : 'Mode Autonomie (Gratuit)'}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold">
            Messagerie Vocale & Corrections
          </h1>
          <p className="text-xs text-purple-200">
            Envoyez vos prononciations ou questions et écoutez les retours vocaux de votre professeur.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCertificateModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>Mon Certificat</span>
          </button>

          {!student.isPremium && (
            <button
              type="button"
              onClick={() => {
                onUnlockDemoPremium();
                audioEngine.playFeedbackChime(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#1A1325] font-bold text-xs shadow cursor-pointer shrink-0"
            >
              Activer Premium (1-clic)
            </button>
          )}
        </div>
      </div>

      {/* Activation Card (ONLY shown if student is NOT Premium) */}
      {!student.isPremium && (
        <div className="bg-white dark:bg-[#1C1426] rounded-3xl p-5 border border-[#E6DEC8] dark:border-[#2F2340] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleCodeSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-[#5E526E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={activationCode}
                onChange={e => setActivationCode(e.target.value)}
                placeholder={`Code d'activation (ex: ${VALID_ACTIVATION_CODES[0]})`}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E6DEC8] dark:border-[#352847] bg-[#FBF8F3] dark:bg-[#120D18] text-xs font-mono uppercase text-[#1A1325] dark:text-[#F7F3EE]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#3B1C54] text-white text-xs font-semibold cursor-pointer"
            >
              Valider
            </button>
          </form>

          <a
            href="https://wa.me/33600000000?text=Bonjour%20AlifBee%20Academie%2C%20je%20souhaite%20activer%20le%20Coaching%20Professeur"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <span>WhatsApp Professeur</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {activationStatus === 'error' && (
            <span className="text-xs text-rose-600 font-semibold">
              Code invalide ({VALID_ACTIVATION_CODES[0]})
            </span>
          )}
        </div>
      )}

      {/* Main Split: Left = Send Audio/Exercise + Live Slot | Right = Voice-Chat Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#1C1426] rounded-3xl p-5 border border-[#E6DEC8] dark:border-[#2F2340] shadow-sm space-y-4">
            <h2 className="font-display text-lg font-bold text-[#1A1325] dark:text-[#F7F3EE]">
              Nouvel envoi vocal ou écrit
            </h2>

            <form onSubmit={handleSendSubmission} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#5E526E] dark:text-[#B9AFC7] mb-1">
                  Leçon concernée
                </label>
                <select
                  value={selectedLessonId}
                  onChange={e => setSelectedLessonId(e.target.value)}
                  className="w-full rounded-xl border border-[#E6DEC8] dark:border-[#352847] bg-[#FBF8F3] dark:bg-[#120D18] px-3 py-2.5 text-xs font-medium text-[#1A1325] dark:text-[#F7F3EE]"
                >
                  {LESSONS.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.titleFr} — {l.subtitleFr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E526E] dark:text-[#B9AFC7] mb-1">
                  Mots ou lettres arabes prononcés
                </label>
                <input
                  type="text"
                  dir="rtl"
                  lang="ar"
                  value={arabicTarget}
                  onChange={e => setArabicTarget(e.target.value)}
                  className="w-full rounded-xl border border-[#E6DEC8] dark:border-[#352847] bg-[#FBF8F3] dark:bg-[#120D18] px-3.5 py-2 font-arabic text-2xl text-[#1A1325] dark:text-[#F7F3EE]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E526E] dark:text-[#B9AFC7] mb-1">
                  Message ou question
                </label>
                <textarea
                  rows={2}
                  value={studentMessage}
                  onChange={e => setStudentMessage(e.target.value)}
                  placeholder="Ex: Est-ce que mon Thâ (ث) est bien interdental ?"
                  className="w-full rounded-xl border border-[#E6DEC8] dark:border-[#352847] bg-[#FBF8F3] dark:bg-[#120D18] p-3 text-xs text-[#1A1325] dark:text-[#F7F3EE]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer ${
                    isRecording
                      ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                      : recordedSec > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                      : 'bg-[#FBF8F3] dark:bg-[#120D18] text-[#1A1325] dark:text-[#F7F3EE] border-[#E6DEC8] dark:border-[#352847]'
                  }`}
                >
                  <Mic className="w-4 h-4 text-[#D97706]" />
                  <span>
                    {isRecording
                      ? `Stop (${recordedSec}s)`
                      : recordedSec > 0
                      ? `Vocal prêt (${recordedSec}s)`
                      : 'Enregistrer ma voix'}
                  </span>
                </button>

                <button
                  type="submit"
                  disabled={!student.isPremium}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    student.isPremium
                      ? 'bg-[#3B1C54] hover:bg-[#2A123D] text-white shadow'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer</span>
                </button>
              </div>
            </form>
          </div>

          {/* 15-Minute Live Coaching Slot Booking Card */}
          <div className="bg-white dark:bg-[#1C1426] rounded-3xl p-5 border border-[#E6DEC8] dark:border-[#2F2340] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1A1325] dark:text-[#F7F3EE] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#D97706]" />
                Session Live 15 min (Visio Prononciation)
              </span>
              <span className="text-[11px] text-[#5E526E] dark:text-[#B9AFC7]">Inclus PRO</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['Mercredi 18h30', 'Samedi 11h00'].map(slot => {
                const isBooked = bookedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      if (!student.isPremium) {
                        onUnlockDemoPremium();
                      }
                      setBookedSlot(slot);
                      audioEngine.playFeedbackChime(true);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isBooked
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-[#FBF8F3] dark:bg-[#120D18] text-[#1A1325] dark:text-[#F7F3EE] border-[#E6DEC8] dark:border-[#352847]'
                    }`}
                  >
                    {isBooked ? `Réservé : ${slot} ✓` : slot}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Voice-Chat Style Feed */}
        <div className="lg:col-span-7 space-y-4">
          {studentSubmissions.map(sub => {
            const isReviewed = sub.status === 'reviewed';
            const isPlayingThis = playingVoiceId === sub.id;
            return (
              <div
                key={sub.id}
                className="bg-white dark:bg-[#1C1426] rounded-3xl p-5 border border-[#E6DEC8] dark:border-[#2F2340] shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#1A1325] dark:text-[#F7F3EE]">
                      {sub.lessonTitle}
                    </div>
                    <div className="text-[11px] text-[#5E526E] dark:text-[#B9AFC7]">
                      {sub.createdAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isReviewed ? (
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Corrigé · {sub.teacherGrade}/20
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        En attente du prof
                      </span>
                    )}
                  </div>
                </div>

                {/* Student Voice/Text Bubble */}
                <div className="bg-[#FBF8F3] dark:bg-[#120D18] rounded-2xl p-3.5 border border-[#E6DEC8] dark:border-[#352847] space-y-2">
                  {sub.arabicTarget && (
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => playVoiceComparison(sub)}
                        className="px-3 py-1 rounded-xl bg-white dark:bg-[#1C1426] border border-[#E6DEC8] dark:border-[#352847] text-xs font-semibold text-[#3B1C54] dark:text-amber-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Headphones className="w-3.5 h-3.5 text-[#D97706]" />
                        <span>Comparer Modèle / Ma Voix</span>
                        <AudioWaveform active={isPlayingThis} />
                      </button>
                      <span dir="rtl" lang="ar" className="font-arabic text-2xl text-[#1A1325] dark:text-[#F7F3EE]">
                        <ColoredArabic text={sub.arabicTarget} />
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-[#1A1325] dark:text-[#F7F3EE]">{sub.studentResponseText}</p>
                </div>

                {/* Teacher Voice + Written Correction Bubble */}
                {isReviewed && sub.teacherFeedback && (
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        Oustadh Yassine · {sub.reviewedAt}
                      </span>
                      {sub.teacherAudioNote && (
                        <button
                          type="button"
                          onClick={() => audioEngine.speakArabic(sub.arabicTarget || 'مُمْتَاز', { rate: 0.8 })}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Note vocale prof</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-emerald-950 dark:text-emerald-100 leading-relaxed">
                      {sub.teacherFeedback}
                    </p>
                    {sub.teacherBadge && (
                      <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-[#D97706]">
                        <Award className="w-3.5 h-3.5" />
                        <span>Badge décerné : {sub.teacherBadge}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Printable Official Level Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FBF8F3] dark:bg-[#1C1426] rounded-3xl max-w-lg w-full p-8 border-2 border-[#D97706] shadow-2xl text-center space-y-5 relative animate-sheet">
            <button
              type="button"
              onClick={() => setShowCertificateModal(false)}
              aria-label="Fermer le certificat"
              className="w-9 h-9 rounded-full bg-white dark:bg-[#120D18] border border-[#E6DEC8] dark:border-[#352847] flex items-center justify-center text-[#5E526E] absolute top-4 right-4 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-[#D97706] mx-auto flex items-center justify-center">
              <Award className="w-8 h-8 text-[#D97706]" />
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#D97706] font-bold">
                AlifBee Académie · {certSummary.certificateSerial}
              </p>
              <h2 className="font-display text-2xl font-bold text-[#1A1325] dark:text-[#F7F3EE] mt-1">
                Attestation de Maîtrise Arabe ({student.currentLevelCode})
              </h2>
            </div>

            <div className="py-4 px-5 rounded-2xl bg-white dark:bg-[#120D18] border border-[#E6DEC8] dark:border-[#352847] space-y-2">
              <p className="text-xs text-[#5E526E] dark:text-[#B9AFC7]">Décerné à l’élève</p>
              <p className="font-display text-xl font-bold text-[#3B1C54] dark:text-amber-300">
                {student.name}
              </p>
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-[#5E526E] dark:text-[#B9AFC7]">
                <span>{student.masteredLetterIds.length}/28 Lettres</span>
                <span>·</span>
                <span>Moyenne Prof : {certSummary.avgTeacherGrade}/20</span>
                <span>·</span>
                <span>{certSummary.mentionFr}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#5E526E] dark:text-[#B9AFC7] px-2">
              <span>Validé par Oustadh Yassine</span>
              <span dir="rtl" lang="ar" className="font-arabic text-xl text-[#3B1C54] dark:text-amber-300">
                مُمْتَاز — مبروك
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-3 rounded-2xl bg-[#3B1C54] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / Sauvegarder en PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
