import React, { useState } from 'react';
import {
  Compass,
  BookOpen,
  Trophy,
  Flame,
  Lock,
  Check,
  Star,
  Play,
  X
} from 'lucide-react';
import { LearnerMode } from '../data/copyDeck';
import { FamilyId } from '../data/lettersAndFamilies';
import { StepId } from '../services/dataService';
import { speechService } from '../services/speech';

export type MainTab = 'parcours' | 'lettres' | 'lecture' | 'moi';

/**
 * PHASE 0 LOGO:
 * The Arabic letter nuun (ن) with its dot replaced by a small saffron ant.
 * Flat vector, brand green background (#07463D), rounded square.
 */
export function NouqtaLogo({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="Logo Nouqta"
      className="shrink-0"
    >
      {/* Rounded square brand green background */}
      <rect width="48" height="48" rx="13" fill="#07463D" />
      {/* Arabic letter Nuun (ن) bowl */}
      <path
        d="M 37 25 C 37 38, 11 38, 11 25"
        stroke="#FFFFFF"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      {/* Small saffron ant replacing Nuun's dot */}
      <circle cx="19.5" cy="16.5" r="2.6" fill="#FFB400" />
      <circle cx="24" cy="16" r="2.1" fill="#FFB400" />
      <circle cx="28.5" cy="15.5" r="3" fill="#FFB400" />
      {/* Tiny ant antennae & legs */}
      <path
        d="M 18 14.5 L 16 12 M 20.5 14 L 19.5 11.5 M 22.5 18 L 21 20.5 M 24.5 18 L 24.5 20.5 M 27 18 L 28.5 20.5"
        stroke="#FFB400"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 1. PrimaryButton (Sec. 8):
 * Saffron background (#FFB400), accent-ink text (#3A2600), height 56px, radius 18px,
 * full width in sticky bar; pressed scale 0.97; disabled 40% opacity.
 */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  icon,
  className = '',
  type = 'button',
  ariaLabel
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`w-full min-h-[56px] h-[56px] rounded-[18px] bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-[17px] flex items-center justify-center gap-2.5 pressable cursor-pointer disabled:opacity-40 disabled:pointer-events-none focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent)] ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

/**
 * 2. SecondaryButton (Sec. 8):
 * Transparent, 2px brand border, height 56px, radius 18px; used at most once per screen.
 */
export function SecondaryButton({
  children,
  onClick,
  disabled = false,
  icon,
  className = '',
  ariaLabel
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`w-full min-h-[56px] h-[56px] rounded-[18px] bg-transparent border-2 border-[var(--brand)] text-[var(--brand)] dark:text-[var(--ink)] font-semibold text-[17px] flex items-center justify-center gap-2 pressable cursor-pointer disabled:opacity-40 focus:outline-2 focus:outline-[var(--accent)] ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

/**
 * 3. IconButton (Sec. 8):
 * 48x48, circular, outlined icon 24px, aria-label required.
 */
export function IconButton({
  ariaLabel,
  onClick,
  children,
  active = false,
  className = ''
}: {
  ariaLabel: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center border transition-colors pressable cursor-pointer shrink-0 focus:outline-2 focus:outline-[var(--accent)] ${
        active
          ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
          : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * 4. TopHeader (Sec. 3.2 & Phase 0, Phase 3.5, Phase E, Phase F.2):
 * Left: Nouqta logo (tapping 5 times opens /dev/glyphs) + "Nouqta" + optional "Hors ligne" chip.
 * Right: tappable streak flame chip (-> Streak bottom sheet) + tappable stars total chip (-> Moi).
 */
export function TopHeader({
  streakCount,
  starsCount = 0,
  onOpenStreak,
  onOpenStars,
  onOpenHelp,
  onOpenGlyphEditor,
  isOffline = false
}: {
  streakCount: number;
  starsCount?: number;
  onOpenStreak?: () => void;
  onOpenStars?: () => void;
  onOpenHelp?: () => void;
  onOpenGlyphEditor?: () => void;
  isOffline?: boolean;
}) {
  const logoTapRef = React.useRef<{ count: number; lastTapMs: number }>({
    count: 0,
    lastTapMs: 0
  });

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - logoTapRef.current.lastTapMs > 1600) {
      logoTapRef.current.count = 1;
    } else {
      logoTapRef.current.count += 1;
    }
    logoTapRef.current.lastTapMs = now;
    if (logoTapRef.current.count >= 5) {
      logoTapRef.current.count = 0;
      onOpenGlyphEditor?.();
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-[var(--paper)]/95 backdrop-blur-xs px-[14px] h-[64px] flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          data-testid="nouqta-header-logo-btn"
          aria-label="Logo Nouqta"
          onClick={handleLogoTap}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center gap-1.5 pressable cursor-pointer rounded-[14px] px-1 shrink-0"
        >
          <NouqtaLogo size={34} />
          <span
            data-testid="nouqta-header-wordmark"
            className="font-display text-[19px] text-[var(--ink)] tracking-tight whitespace-nowrap shrink-0"
          >
            Nouqta
          </span>
        </button>
        {isOffline && (
          <span
            data-testid="offline-badge"
            className="font-mono-tag text-[10px] px-2 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] border border-[var(--accent)]/40 shrink-0"
          >
            Hors ligne
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onOpenStreak}
          aria-label={`Série de ${streakCount} jours, toucher pour voir le calendrier`}
          className="min-w-[48px] min-h-[48px] h-[48px] px-2 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center gap-1 pressable cursor-pointer shrink-0"
        >
          <Flame className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)] shrink-0" />
          <span className="font-mono-tag text-[12px] font-bold text-[var(--ink)] whitespace-nowrap">
            {streakCount}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenStars}
          aria-label={`${starsCount} étoiles gagnées, toucher pour ouvrir le profil`}
          className="min-w-[48px] min-h-[48px] h-[48px] px-2 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center gap-1 pressable cursor-pointer shrink-0"
        >
          <Star className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)] shrink-0" />
          <span className="font-mono-tag text-[12px] font-bold text-[var(--ink)] whitespace-nowrap">
            {starsCount}
          </span>
        </button>

        {onOpenHelp && (
          <button
            type="button"
            data-testid="header-help-btn"
            onClick={onOpenHelp}
            aria-label="Ouvrir l'aide sur les récompenses"
            className="w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center font-display text-[17px] text-[var(--brand)] pressable cursor-pointer shrink-0"
          >
            ?
          </button>
        )}
      </div>
    </header>
  );
}

/**
 * Custom Letter-Form Glyph Icon for BottomNav 'Lettres'
 */
function ArabicLetterGlyphIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 11c-1 4-5 6-10 6s-4-2-4-5" />
      <circle cx="12" cy="20" r="1.2" fill="currentColor" />
    </svg>
  );
}

/**
 * 5. BottomNav (Sec. 3.1 & 8):
 * 4 items, 72px tall plus safe area, active item has brand-deep pill with white icon and label,
 * inactive icon + label grey; labels never truncated.
 */
export function BottomNav({
  activeTab,
  onSelectTab
}: {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
}) {
  const items: {
    id: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'parcours', label: 'Parcours', icon: Compass },
    { id: 'lettres', label: 'Lettres', icon: ArabicLetterGlyphIcon },
    { id: 'lecture', label: 'Lecture', icon: BookOpen },
    { id: 'moi', label: 'Moi', icon: Trophy }
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-[480px] mx-auto h-[72px] px-3 grid grid-cols-4 gap-1.5 items-center">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`Onglet ${item.label}`}
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[48px] h-[54px] rounded-[18px] flex flex-col items-center justify-center gap-0.5 pressable cursor-pointer transition-colors ${
                active
                  ? 'bg-[var(--brand-deep)] text-white'
                  : 'text-[#5A6B65] dark:text-[#9AB0A8]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[12px] font-semibold leading-none whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * 6. TodayCard (Phase 1.1 & 1.3):
 * - Giant letter: 140px, anchored top-right, overlaps card edge by max 16px (-top-[16px]),
 *   colour #BFE8D8, z-index below nothing interactive, never covering rows.
 * - Dynamic mono tag under the title: "FAMILLE n - NOM".
 * - Inactive step dots: rgba(255,255,255,0.35).
 * - Long titles: min-width 0, max 2 lines with ellipsis, font-size steps down for names > 12 chars.
 */
export function TodayCard({
  tagText,
  titleText,
  familyTagText,
  arabicChar,
  stepsDone,
  mode
}: {
  tagText: string;
  titleText: string;
  familyTagText: string;
  arabicChar: string;
  stepsDone: StepId[];
  mode: LearnerMode;
}) {
  const allSteps: { id: StepId; label: string }[] = [
    { id: 'voir', label: 'Voir' },
    { id: 'ecouter', label: 'Écouter' },
    { id: 'tracer', label: 'Tracer' },
    { id: 'ecrire', label: 'Écrire' },
    { id: 'retenir', label: 'Retenir' }
  ];

  const isLongTitle = titleText.length > 12;

  return (
    <div className="relative pt-[16px] z-0">
      {/* Soft green block peeking behind hero card */}
      <div
        aria-hidden="true"
        className="absolute inset-x-3 -bottom-2 h-20 rounded-[28px] bg-[var(--brand)]/20 pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute right-4 top-2 w-24 h-24 rounded-full bg-[var(--accent)]/20 blur-xl pointer-events-none"
      />

      <div
        data-testid="today-hero-card"
        style={{ backgroundColor: '#07463D', color: '#FFFFFF' }}
        className="relative rounded-[28px] bg-[#07463D] text-white p-[24px] hero-shadow overflow-visible z-10"
      >
        {/* Giant Arabic letter: 140px, top-right, max 16px overlap (-top-[16px]), colour #BFE8D8 */}
        <div
          data-testid="today-giant-letter"
          lang="ar"
          dir="rtl"
          aria-label={`Lettre ${titleText}`}
          style={{
            color: '#BFE8D8',
            fontSize: '140px',
            top: '-16px',
            lineHeight: 1
          }}
          className="font-arabic select-none pointer-events-none absolute right-5 -top-[16px] text-[140px] leading-none text-[#BFE8D8] z-10"
        >
          {arabicChar}
        </div>

        <div className="pr-28 space-y-1.5 relative z-20 min-w-0">
          <span
            style={{ color: '#FFB400' }}
            className="font-mono-tag text-[#FFB400] block"
          >
            {tagText}
          </span>
          <h1
            style={{ color: '#FFFFFF' }}
            className={`font-display text-white min-w-0 line-clamp-2 ${
              isLongTitle
                ? 'text-[22px]'
                : mode === 'kids'
                ? 'text-[34px]'
                : 'text-[30px]'
            }`}
          >
            {titleText}
          </h1>
          <span
            data-testid="today-family-tag"
            style={{ color: '#BFE8D8' }}
            className="font-mono-tag text-[#BFE8D8] block pt-0.5 truncate"
          >
            {familyTagText}
          </span>
        </div>

        {/* Step dots showing progress for this letter; inactive rgba(255,255,255,0.35) */}
        <div className="mt-6 flex items-center gap-2 relative z-20">
          {allSteps.map((s) => {
            const done = stepsDone.includes(s.id);
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <span
                  title={s.label}
                  style={{
                    backgroundColor: done
                      ? '#1FB57A'
                      : 'rgba(255,255,255,0.35)'
                  }}
                  className={`h-2.5 rounded-full transition-all ${
                    done ? 'w-6 bg-[var(--good)]' : 'w-2.5'
                  }`}
                />
              </div>
            );
          })}
          <span
            style={{ color: '#FFFFFF' }}
            className="ml-2 font-mono-tag text-white"
          >
            {stepsDone.length}/5
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 7. PathNode (Phase 1.1 & Phase C2):
 * 72px circle with state ring, connected by a curved line;
 * done = green star, current = saffron + standing Nouqta ant, next = outline, locked = grey padlock.
 */
export function PathNode({
  state,
  arabicPreview,
  labelFr,
  onClick,
  alignOffset = 0,
  antWalkingToNext = false
}: {
  state: 'done' | 'current' | 'next' | 'locked';
  arabicPreview: string;
  labelFr: string;
  onClick: () => void;
  alignOffset?: number;
  showAnt?: boolean;
  antWalkingToNext?: boolean;
}) {
  const [antWiggling, setAntWiggling] = useState(false);

  const stateLabelFr =
    state === 'done'
      ? 'Terminée'
      : state === 'current'
      ? 'En cours'
      : state === 'next'
      ? 'Suivante'
      : 'Verrouillée';

  return (
    <div
      style={{ transform: `translateX(${alignOffset}px)` }}
      className="flex flex-col items-center gap-2 relative z-10 min-w-0"
    >
      <div className="flex items-center justify-center gap-2 relative">
        {/* PHASE C2 & D: The ant idles on the current node (looks around, wiggles), walks to the next node when a letter is finished, wiggles when tapped */}
        {state === 'current' && (
          <button
            type="button"
            data-testid="path-node-ant"
            aria-label="Toucher la fourmi Nouqta sur l'étape actuelle"
            onClick={(e) => {
              e.stopPropagation();
              speechService.playMascotChirp();
              setAntWiggling(true);
              window.setTimeout(() => setAntWiggling(false), 380);
            }}
            style={{
              transform: antWalkingToNext ? 'translateY(64px)' : 'translateY(0px)',
              transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)'
            }}
            className={`w-[48px] h-[48px] min-w-[48px] min-h-[48px] flex items-center justify-center z-20 pointer-events-auto cursor-pointer shrink-0 ${
              antWiggling ? 'animate-wiggle' : 'ant-idle-node'
            }`}
          >
            <svg
              width="38"
              height="32"
              viewBox="0 0 44 36"
              fill="none"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="22" rx="7" ry="5.5" fill="#07463D" stroke="#0A1F1B" strokeWidth="1.5" />
              <circle cx="11" cy="21" r="2.2" fill="#FFB400" />
              <ellipse cx="22" cy="20" rx="5" ry="4" fill="#0B6B5D" stroke="#0A1F1B" strokeWidth="1.5" />
              <path
                d="M 18 24 L 15 31 M 22 24 L 22 31 M 26 24 L 29 31"
                stroke="#0A1F1B"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="31" cy="14" r="7" fill="#FFB400" stroke="#0A1F1B" strokeWidth="1.5" />
              <circle cx="29.5" cy="13" r="1.4" fill="#0A1F1B" />
              <circle cx="34" cy="13" r="1.4" fill="#0A1F1B" />
              <path d="M 29 7 Q 26 2 22 4 M 33 7 Q 37 2 40 4" stroke="#0A1F1B" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <button
          type="button"
          aria-label={`Famille ${labelFr} (${stateLabelFr})`}
          onClick={onClick}
          className={`w-[72px] h-[72px] min-w-[72px] min-h-[72px] rounded-full flex items-center justify-center relative pressable cursor-pointer transition-all focus:outline-2 focus:outline-[var(--accent)] shrink-0 ${
            state === 'done'
              ? 'bg-[var(--good)] text-white ring-4 ring-[var(--good)]/25'
              : state === 'current'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] ring-4 ring-[var(--accent)]/35 animate-pulse-once'
              : state === 'next'
              ? 'bg-[var(--surface)] text-[var(--ink)] border-2 border-[var(--brand)]'
              : 'bg-[var(--surface)] text-[var(--locked)] border-2 border-[var(--locked)]'
          }`}
        >
          <span lang="ar" dir="rtl" className="font-arabic text-[32px] leading-none">
            {arabicPreview}
          </span>

          {/* Corner State Badge */}
          <span
            className={`w-6 h-6 rounded-full absolute -top-1 -right-1 flex items-center justify-center border-2 border-[var(--paper)] ${
              state === 'done'
                ? 'bg-[var(--good)] text-white'
                : state === 'current'
                ? 'bg-[var(--brand-deep)] text-[var(--accent)]'
                : state === 'locked'
                ? 'bg-[var(--locked)] text-white'
                : 'bg-[var(--surface)] text-[var(--brand)] border-[var(--brand)]'
            }`}
          >
            {state === 'done' ? (
              <Star className="w-3.5 h-3.5 fill-current" />
            ) : state === 'current' ? (
              <Play className="w-3 h-3 fill-current" />
            ) : state === 'locked' ? (
              <Lock className="w-3 h-3" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />
            )}
          </span>
        </button>
      </div>

      <span className="text-[14px] font-semibold text-[var(--ink)] text-center leading-tight line-clamp-2 max-w-[140px]">
        {labelFr}
      </span>
    </div>
  );
}

/**
 * 8. LetterChip (Sec. 4.2, 8 & Phase 1.3):
 * 56px or 72px circle containing the Arabic letter, status ring; used in sheets and pickers.
 * Uses shortName with min-width 0 and max 2 lines with ellipsis.
 */
export function LetterChip({
  arabicChar,
  nameFr,
  picture,
  status,
  onClick,
  size = 56
}: {
  arabicChar: string;
  nameFr?: string;
  picture?: string;
  status: 'mastered' | 'done' | 'current' | 'locked';
  onClick: () => void;
  size?: 56 | 72;
}) {
  const sizeClass =
    size === 72
      ? 'w-[72px] h-[72px] min-w-[72px] min-h-[72px] text-[34px]'
      : 'w-[56px] h-[56px] min-w-[56px] min-h-[56px] text-[28px]';
  const isLong = Boolean(nameFr && nameFr.length > 12);

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0 max-w-[80px]">
      <button
        type="button"
        aria-label={
          nameFr ? `Lettre ${nameFr}` : `Lettre arabe ${arabicChar}`
        }
        onClick={onClick}
        className={`${sizeClass} rounded-full flex items-center justify-center relative pressable cursor-pointer transition-all shrink-0 ${
          status === 'mastered'
            ? 'bg-[var(--surface)] text-[var(--ink)] ring-3 ring-[var(--accent)]'
            : status === 'done'
            ? 'bg-[var(--surface)] text-[var(--ink)] ring-3 ring-[var(--good)]'
            : status === 'current'
            ? 'bg-[var(--accent)]/20 text-[var(--ink)] ring-3 ring-[var(--accent)]'
            : 'bg-[var(--surface)] text-[var(--locked)] ring-2 ring-[var(--locked)]'
        }`}
      >
        <span lang="ar" dir="rtl" className="font-arabic leading-none">
          {arabicChar}
        </span>
        {status !== 'locked' && picture && (
          <span
            aria-hidden="true"
            className="text-[12px] absolute -bottom-1 -left-1 bg-[var(--surface)] rounded-full px-0.5 leading-none border border-[var(--line)]"
          >
            {picture}
          </span>
        )}
        {status === 'locked' && (
          <Lock className="w-3.5 h-3.5 text-[var(--locked)] absolute bottom-1 right-1" />
        )}
        {status === 'mastered' && (
          <Star className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)] absolute -top-1 -right-1" />
        )}
        {status === 'done' && (
          <Check className="w-3.5 h-3.5 text-[var(--good)] absolute -top-1 -right-1" />
        )}
      </button>
      {nameFr && (
        <span
          className={`${
            isLong ? 'text-[11px]' : 'text-[12px]'
          } font-medium text-[var(--ink)] text-center leading-tight min-w-0 line-clamp-2`}
        >
          {nameFr}
        </span>
      )}
    </div>
  );
}

/**
 * 9. Stepper (PHASE B4 - Visible lesson steps):
 * The 5-step bar shows icon + label for each step (Voir, Écouter, Tracer, Écrire, Retenir).
 * The current step is expanded, finished ones show a check. Each button >= 48x48px.
 */
export function Stepper({
  currentIndex,
  completedIndices,
  onSelectStep
}: {
  currentIndex: number;
  completedIndices: number[];
  onSelectStep?: (idx: number) => void;
}) {
  const stepMeta: { label: string; iconSvg: React.ReactNode }[] = [
    {
      label: 'Voir',
      iconSvg: (
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" />
          <circle cx="10" cy="10" r="2.2" />
        </svg>
      )
    },
    {
      label: 'Écouter',
      iconSvg: (
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 8v4h3l4 4V4L7 8H4z" />
          <path d="M14 7a4 4 0 010 6" strokeLinecap="round" />
        </svg>
      )
    },
    {
      label: 'Tracer',
      iconSvg: (
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 17V7m0 0a2 2 0 10-4 0v5m4-5a2 2 0 114 0v4" strokeLinecap="round" />
        </svg>
      )
    },
    {
      label: 'Écrire',
      iconSvg: (
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      label: 'Retenir',
      iconSvg: (
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 2a5 5 0 00-3 9v2h6v-2a5 5 0 00-3-9z" />
          <path d="M8 16h4" strokeLinecap="round" />
        </svg>
      )
    }
  ];

  return (
    <div
      data-testid="lesson-visible-stepper"
      className="flex items-center justify-between gap-1 w-full"
      role="tablist"
      aria-label="Progression de la leçon"
    >
      {stepMeta.map((step, idx) => {
        const isCurrent = idx === currentIndex;
        const isPast = completedIndices.includes(idx) && !isCurrent;
        return (
          <button
            key={step.label}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            aria-label={`Étape ${idx + 1} : ${step.label}`}
            onClick={() => onSelectStep?.(idx)}
            className={`min-h-[48px] h-[48px] rounded-[14px] px-2 flex flex-col items-center justify-center gap-0.5 pressable cursor-pointer transition-all ${
              isCurrent
                ? 'flex-[1.35] min-w-[68px] bg-[var(--accent)] text-[var(--accent-ink)] font-bold shadow-xs'
                : isPast
                ? 'flex-1 min-w-[48px] bg-[var(--good)]/15 text-[var(--good)] font-semibold'
                : 'flex-1 min-w-[48px] bg-[var(--surface)] text-[var(--ink)]/70 border border-[var(--line)] font-medium'
            }`}
          >
            <div className="flex items-center gap-1">
              {isPast ? <Check className="w-3.5 h-3.5 shrink-0" /> : step.iconSvg}
              {isCurrent && (
                <span className="text-[11px] leading-none whitespace-nowrap">
                  {step.label}
                </span>
              )}
            </div>
            {!isCurrent && (
              <span className="text-[10px] leading-none whitespace-nowrap">
                {step.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 10. BottomSheet (Sec. 2.5, 8 & Phase 1.3):
 * Drag handle, rounded 28px top, backdrop 40 percent ink, escape on backdrop tap.
 * Long titles step down in font size and clamp to 2 lines.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  const isLongTitle = Boolean(title && title.length > 18);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0A1F1B]/40 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panneau'}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] max-h-[88dvh] bg-[var(--surface)] rounded-t-[28px] p-[24px] pb-[calc(24px+env(safe-area-inset-bottom))] flex flex-col gap-5 animate-sheet overflow-y-auto"
      >
        <div className="w-12 h-1.5 rounded-full bg-[var(--line)] mx-auto shrink-0" />

        {title && (
          <div className="flex items-center justify-between gap-3 min-w-0">
            <h2
              className={`font-display ${
                isLongTitle ? 'text-[19px]' : 'text-[22px]'
              } text-[var(--ink)] min-w-0 line-clamp-2`}
            >
              {title}
            </h2>
            <IconButton ariaLabel="Fermer" onClick={onClose}>
              <X className="w-5 h-5" />
            </IconButton>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

/**
 * 11. Toast (Sec. 8):
 * Top-center, 2.5 s, icon + 1 short line, never blocks input.
 */
export function Toast({
  message,
  tone = 'info'
}: {
  message: string | null;
  tone?: 'info' | 'good' | 'bad';
}) {
  if (!message) return null;
  return (
    <div className="fixed top-4 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
      <div
        role="status"
        aria-live="polite"
        className={`px-4 py-2.5 rounded-full shadow-md flex items-center gap-2 text-[14px] font-semibold animate-sheet ${
          tone === 'good'
            ? 'bg-[var(--good)] text-white'
            : tone === 'bad'
            ? 'bg-[var(--bad)] text-white'
            : 'bg-[var(--brand-deep)] text-white'
        }`}
      >
        <span>{message}</span>
      </div>
    </div>
  );
}

export type MascotPose = 'wave' | 'cheer' | 'think' | 'oops' | 'sleep';

/**
 * 12. Mascot (PHASE 0 & PHASE 2.4):
 * "Nouqta" the ant replaces the previous mascot everywhere.
 * Flat vector, 5 poses (wave, cheer, think, oops, sleep), brand colours, under 6 KB each,
 * shown in Kids mode only (Adult mode: returns null).
 * Tapping the ant plays a tiny wiggle + sound.
 */
export function Mascot({
  pose = 'wave',
  size = 56,
  mode = 'kids'
}: {
  pose?: MascotPose;
  size?: number;
  mode?: LearnerMode;
}) {
  const [wiggling, setWiggling] = useState(false);

  // PHASE 0: Shown in Kids mode only (Adult mode: no mascot)
  if (mode === 'adult') return null;

  const handleTapAnt = () => {
    speechService.playMascotChirp();
    setWiggling(true);
    window.setTimeout(() => setWiggling(false), 360);
  };

  return (
    <button
      type="button"
      data-testid={`nouqta-mascot-${pose}`}
      aria-label="Toucher Nouqta la fourmi"
      onClick={handleTapAnt}
      className={`min-w-[48px] min-h-[48px] inline-flex items-center justify-center rounded-full pressable cursor-pointer shrink-0 ${
        wiggling ? 'animate-wiggle' : ''
      }`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Ant Abdomen (left/back segment) */}
        <ellipse
          cx="22"
          cy="52"
          rx="13"
          ry="10"
          transform="rotate(-14 22 52)"
          fill="#07463D"
          stroke="#0A1F1B"
          strokeWidth="2.2"
        />
        {/* Saffron Nuqta Dot Accent on Abdomen */}
        <circle cx="20" cy="50" r="4" fill="#FFB400" />

        {/* Ant Thorax (middle segment) */}
        <ellipse
          cx="40"
          cy="48"
          rx="9"
          ry="7.5"
          fill="#0B6B5D"
          stroke="#0A1F1B"
          strokeWidth="2.2"
        />

        {/* 6 Ant Legs */}
        <path
          d="M 34 54 L 28 66 M 40 55 L 40 67 M 46 54 L 52 66"
          stroke="#0A1F1B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Ant Head (saffron #FFB400) */}
        <circle
          cx="56"
          cy="34"
          r="14"
          fill="#FFB400"
          stroke="#0A1F1B"
          strokeWidth="2.2"
        />

        {/* Antennae */}
        <path
          d={
            pose === 'oops'
              ? 'M 52 21 Q 44 14 39 18 M 61 21 Q 68 14 72 18'
              : 'M 52 21 Q 48 10 42 12 M 60 21 Q 66 10 72 12'
          }
          stroke="#0A1F1B"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <circle cx={pose === 'oops' ? 39 : 42} cy={pose === 'oops' ? 18 : 12} r="2.8" fill="#07463D" />
        <circle cx="72" cy={pose === 'oops' ? 18 : 12} r="2.8" fill="#07463D" />

        {/* Front Waving / Cheering / Thinking Arm */}
        {pose === 'wave' && (
          <path
            d="M 47 45 Q 62 38 69 26"
            stroke="#0A1F1B"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        )}
        {pose === 'cheer' && (
          <>
            <path
              d="M 46 44 Q 58 28 66 18"
              stroke="#0A1F1B"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <circle cx="68" cy="16" r="2.5" fill="#1FB57A" />
          </>
        )}
        {pose === 'think' && (
          <path
            d="M 46 46 Q 58 46 58 39"
            stroke="#0A1F1B"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Eyes & Mouth by Pose */}
        {pose === 'sleep' ? (
          <>
            <path
              d="M 50 33 Q 53 36 56 33"
              stroke="#0A1F1B"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 59 33 Q 62 36 65 33"
              stroke="#0A1F1B"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <text
              x="66"
              y="22"
              fontSize="10"
              fontWeight="bold"
              fill="#07463D"
            >
              zZ
            </text>
          </>
        ) : (
          <>
            <circle cx="52.5" cy="32" r="2.3" fill="#0A1F1B" />
            <circle cx="61.5" cy="32" r="2.3" fill="#0A1F1B" />
          </>
        )}

        {pose === 'cheer' || pose === 'wave' ? (
          <path
            d="M 52 38 Q 57 43 62 38"
            stroke="#0A1F1B"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : pose === 'oops' ? (
          <circle cx="57" cy="39" r="2.4" fill="#0A1F1B" />
        ) : (
          <path
            d="M 53 39 H 61"
            stroke="#0A1F1B"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}

/**
 * 13. StarRating (Sec. 8):
 * 1-3 stars, fills with a small bounce.
 */
export function StarRating({ stars }: { stars: 0 | 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((n) => {
        const filled = stars >= n;
        return (
          <Star
            key={n}
            className={`w-9 h-9 transition-transform ${
              filled
                ? 'text-[var(--accent)] fill-[var(--accent)] animate-pulse-once'
                : 'text-[var(--locked)]'
            }`}
          />
        );
      })}
    </div>
  );
}

/**
 * 14. ProgressRing (Sec. 4.9, 8 & Section C6):
 * Segmented 7-part ring (for the 7 families) with center number of completed letters out of 28.
 * Each of the 7 segments has a >= 48x48px tappable button positioned radially so tapping opens that family's sheet.
 */
export function ProgressRing({
  completedLettersCount,
  familyCompletionRatio,
  families,
  onSelectFamily
}: {
  completedLettersCount: number;
  familyCompletionRatio: number[]; // length 7, each 0..1
  families?: { id: FamilyId; order: number; nameFr: string }[];
  onSelectFamily?: (familyId: FamilyId) => void;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const segmentGap = 8;
  const segmentLength = circumference / 7 - segmentGap;
  const orbitRadius = 86;

  return (
    <div className="relative w-[228px] h-[228px] flex items-center justify-center mx-auto">
      <svg viewBox="0 0 140 140" className="w-[144px] h-[144px] -rotate-90 pointer-events-none">
        {familyCompletionRatio.map((ratio, idx) => {
          const offset = -(idx * (circumference / 7));
          const active = ratio >= 1;
          const partial = ratio > 0 && ratio < 1;
          return (
            <circle
              key={idx}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={
                active
                  ? 'var(--good)'
                  : partial
                  ? 'var(--accent)'
                  : 'var(--line)'
              }
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>

      {/* Center count */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-display text-[32px] text-[var(--ink)] leading-none">
          {completedLettersCount}
        </span>
        <span className="font-mono-tag text-[var(--ink)]/70 mt-1">/ 28</span>
      </div>

      {/* 7 Tappable 48x48px Family Segment Buttons around the ring */}
      {families &&
        onSelectFamily &&
        families.map((fam, idx) => {
          const angleRad = -Math.PI / 2 + (idx * 2 * Math.PI) / 7;
          const cx = 114 + Math.cos(angleRad) * orbitRadius;
          const cy = 114 + Math.sin(angleRad) * orbitRadius;
          const ratio = familyCompletionRatio[idx] || 0;
          const active = ratio >= 1;
          const partial = ratio > 0 && ratio < 1;

          return (
            <button
              key={fam.id}
              type="button"
              aria-label={`Ouvrir la famille ${fam.order} : ${fam.nameFr}`}
              onClick={() => onSelectFamily(fam.id)}
              style={{
                left: `${Math.round(cx - 24)}px`,
                top: `${Math.round(cy - 24)}px`
              }}
              className={`absolute w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center font-mono-tag text-[12px] font-bold border-2 pressable cursor-pointer transition-colors ${
                active
                  ? 'bg-[var(--good)] text-white border-[var(--good)]'
                  : partial
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                  : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
              }`}
            >
              F{fam.order}
            </button>
          );
        })}
    </div>
  );
}

/**
 * 15. StatusChip (Sec. 4.6 & 8):
 * Pill: En attente (grey), Correct (green), À refaire (red).
 */
export function StatusChip({
  status,
  mode
}: {
  status: 'pending' | 'correct' | 'redo';
  mode: LearnerMode;
}) {
  const label =
    status === 'correct'
      ? 'Correct'
      : status === 'redo'
      ? 'À refaire'
      : mode === 'kids'
      ? 'En attente'
      : 'En attente de correction';

  return (
    <span
      className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-bold ${
        status === 'correct'
          ? 'bg-[var(--good)]/15 text-[var(--good)]'
          : status === 'redo'
          ? 'bg-[var(--bad)]/15 text-[var(--bad)]'
          : 'bg-[var(--locked)]/30 text-[var(--ink)]'
      }`}
    >
      {label}
    </span>
  );
}

/**
 * 16. HighlightedArabicKeyword (PHASE B6 & D1):
 * Renders an Arabic keyword with the target letter highlighted in saffron/brand while
 * keeping Zero-Width Joiners intact so Arabic cursive shaping never breaks.
 */
export function HighlightedArabicKeyword({
  before,
  highlight,
  after,
  keyword,
  targetChar,
  className = 'text-[36px]'
}: {
  before?: string;
  highlight?: string;
  after?: string;
  keyword?: string;
  targetChar?: string;
  className?: string;
}) {
  let b = before || '';
  let h = highlight || '';
  let a = after || '';
  if (keyword) {
    const ch = (targetChar || '').trim();
    const idx = ch ? keyword.indexOf(ch) : -1;
    if (idx >= 0) {
      b = idx > 0 ? `${keyword.slice(0, idx)}\u200D` : '';
      h = `${idx > 0 ? '\u200D' : ''}${keyword.slice(idx, idx + ch.length)}${
        idx + ch.length < keyword.length ? '\u200D' : ''
      }`;
      a =
        idx + ch.length < keyword.length
          ? `\u200D${keyword.slice(idx + ch.length)}`
          : '';
    } else {
      h = keyword.charAt(0);
      a = keyword.slice(1);
    }
  }
  return (
    <span
      lang="ar"
      dir="rtl"
      data-testid="highlighted-arabic-keyword"
      className={`font-arabic leading-[1.8] text-[var(--ink)] inline-block ${className}`}
    >
      <span>{b}</span>
      <span
        data-testid="highlighted-arabic-letter"
        className="text-[var(--accent)] font-bold underline decoration-[var(--accent)] decoration-2 underline-offset-4"
      >
        {h}
      </span>
      <span>{a}</span>
    </span>
  );
}

/**
 * 17. AntWalkingLoader (PHASE C2):
 * Loading state where the ant walks along a short line (or static when prefers-reduced-motion).
 */
export function AntWalkingLoader({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div
      data-testid="ant-walking-loader"
      className="flex flex-col items-center justify-center gap-2 py-4"
    >
      <svg
        width="160"
        height="42"
        viewBox="0 0 160 42"
        fill="none"
        aria-label={label}
      >
        <line
          x1="16"
          y1="32"
          x2="144"
          y2="32"
          stroke="var(--line)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 6"
        />
        <g className="animate-pulse">
          <ellipse cx="68" cy="22" rx="7" ry="5" fill="#07463D" />
          <circle cx="67" cy="21" r="2" fill="#FFB400" />
          <ellipse cx="78" cy="20" rx="4.5" ry="3.5" fill="#0B6B5D" />
          <circle cx="87" cy="15" r="6" fill="#FFB400" stroke="#0A1F1B" strokeWidth="1.5" />
          <path
            d="M 74 24 L 71 31 M 78 24 L 78 31 M 82 24 L 85 31"
            stroke="#0A1F1B"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      </svg>
      <span className="font-mono-tag text-[12px] text-[var(--ink)]/70">
        {label}
      </span>
    </div>
  );
}

/**
 * 18. CalligraphyAntSvgGroup (PHASE D - THE ANT MOVES):
 * Small SVG (~40px in Kids, smaller ~28px in Adults) with:
 * - 6 legs in two alternating groups (.ant-leg-group-a and .ant-leg-group-b) switching every 120 ms
 *   via CSS steps(2, end) animation ONLY while data-moving="true".
 * - Antennae wiggle (.ant-antennae) while moving.
 * - Oriented along the +X axis (head at +X, abdomen at -X) so rotating by tangent angleDeg
 *   makes the ant walk forward along the stroke with the drawn ink trail coming from behind the ant.
 * - Supports carrying a diamond dot crumb (.ant-carried-crumb) when `data-carrying-dot="true"`.
 */
export const CalligraphyAntSvgGroup = React.forwardRef<
  SVGGElement,
  {
    mode: LearnerMode;
    initialX?: number;
    initialY?: number;
    initialAngleDeg?: number;
    onTapAnt?: () => void;
  }
>(function CalligraphyAntSvgGroup(
  { mode, initialX = 100, initialY = 100, initialAngleDeg = 0, onTapAnt },
  ref
) {
  const scale = mode === 'kids' ? 0.95 : 0.72;
  return (
    <g
      ref={ref}
      data-testid="voir-ant-pen-tip"
      data-moving="false"
      data-carrying-dot="false"
      data-angle-deg={String(initialAngleDeg)}
      transform={`translate(${initialX}, ${initialY}) rotate(${initialAngleDeg})`}
      onClick={(e) => {
        e.stopPropagation();
        onTapAnt?.();
      }}
      className="cursor-pointer"
    >
      {/* Invisible 48x48 tap target centered on the ant */}
      <circle cx="0" cy="0" r="24" fill="transparent" />

      <g transform={`scale(${scale})`}>
        <g className="ant-body-inner">
          {/* Leg Group A (3 alternating legs: front-top, mid-bottom, back-top) */}
          <g className="ant-leg-group-a" data-testid="ant-legs-a">
            <path
              d="M 4 -4 L 9 -13 M -2 4 L -3 13 M -9 -4 L -15 -12"
              stroke="#0A1F1B"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
          </g>

          {/* Leg Group B (3 alternating legs: front-bottom, mid-top, back-bottom) */}
          <g className="ant-leg-group-b" data-testid="ant-legs-b">
            <path
              d="M 4 4 L 9 13 M -2 -4 L -3 -13 M -9 4 L -15 12"
              stroke="#0A1F1B"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
          </g>

          {/* Abdomen (at -X behind the ant, where the ink trail emerges) */}
          <ellipse
            cx="-13"
            cy="0"
            rx="7.5"
            ry="5.5"
            fill="#07463D"
            stroke="#0A1F1B"
            strokeWidth="1.6"
          />
          <circle cx="-13" cy="0" r="2.3" fill="#FFB400" />

          {/* Thorax (center) */}
          <ellipse
            cx="-2"
            cy="0"
            rx="5.2"
            ry="4"
            fill="#0B6B5D"
            stroke="#0A1F1B"
            strokeWidth="1.6"
          />

          {/* Head (at +X leading the stroke) */}
          <circle
            cx="8.5"
            cy="0"
            r="6.2"
            fill="#FFB400"
            stroke="#0A1F1B"
            strokeWidth="1.6"
          />
          {mode === 'kids' && (
            <>
              <circle cx="10.2" cy="-2.2" r="1.2" fill="#0A1F1B" />
              <circle cx="10.2" cy="2.2" r="1.2" fill="#0A1F1B" />
            </>
          )}

          {/* Antennae */}
          <g className="ant-antennae">
            <path
              d="M 13 -3 Q 18 -8 21 -5 M 13 3 Q 18 8 21 5"
              stroke="#0A1F1B"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Carried diamond dot crumb (shown when ant carries a dot from the side in Phase C) */}
          <g transform="translate(19, 0) rotate(45)">
            <g className="ant-carried-crumb" style={{ display: 'none' }}>
              <rect
                x="-4.8"
                y="-4.8"
                width="9.6"
                height="9.6"
                rx="1.4"
                fill="#FFB400"
                stroke="#07463D"
                strokeWidth="1.5"
              />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
});

