# Nouqta - Fix and Clarity Pass (MVP)

You are a senior product designer + frontend engineer working on the Nouqta
app. Follow the blueprint PDF (Sections 2, 4, 7, 15.1, 16). All learner text
stays in French.

## RULES
- Work in the phases below, IN ORDER. Finish and self-check each phase,
  report the results, then continue.
- Do NOT add features that are not listed here. If you think something is
  missing, put it in a "Suggestions" list at the end of your reply.
- Do not claim anything works unless you actually tested it. For every bug,
  FIRST write the root cause in one or two sentences, THEN fix it.
- One idea per screen. Visuals before text. No block of text longer than
  2 short lines in Kids mode, 4 in Adult mode.

---

## PHASE A - BUGS (do first)

### A1. Animation (Voir) does not play
Symptom: pressing play does nothing, or it looks wrong.
1. Reproduce on Baa, Taa, Jiim, Kaaf, Alif. Find the real cause. Check:
   - the path is measured while hidden (getTotalLength returns 0 when
     display:none or not yet mounted);
   - stroke-dasharray/dashoffset not normalised: use pathLength="1",
     dasharray 1, animate dashoffset 1 -> 0;
   - step change does not remount or reset the SVG;
   - the play button handler is not wired to state, or state resets on
     re-render;
   - requestAnimationFrame/timers not cleaned up, or reduced-motion
     blocking everything;
   - strokes not sequenced (each stroke starts after the previous ends).
2. Use the Web Animations API (or CSS animation with pathLength). No
   setInterval.
3. Behaviour: auto-plays once on entering the step; play/replay button
   restarts; speed toggle 1x / 0.5x; "pas a pas" button shows one stroke
   at a time; strokes drawn in the correct order and direction; dots pop
   in last; start number appears before each stroke.
4. Acceptance: replay works 5 times in a row on Baa, Taa, Jiim, Kaaf,
   Alif with no glitch.

### A2. Word builder gives the wrong number of tiles
Example: a 3-letter word shows 2 tiles.
- Tile count must equal the number of letters of the word. Split by
  letters, NOT by raw string length; harakat (combining marks) are not
  tiles. Lam-alif counts as 2 tiles (lam + alif) to keep it simple.
- Tiles are in correct RTL order when solved; shuffle until the
  shuffled order differs from the answer.
- Test words of 2, 3, 4 and 5 letters, with and without harakat.

### A3. Re-verify earlier fixes
Long names do not overlap (Taa fort, Dhaa fort, Haa souffle) at 360px;
tracing steps are separate (body strokes then dots); home layout has no
overlap.

---

## PHASE B - CLARITY (student must understand without help)

### B1. Remove points
Delete every "pts" label and the "Marquer comme fait (0/1 pt)" wording.
Keep only three reward ideas, each with an icon:
- Etoiles: 1 to 3 per letter, from the 3-question quiz.
- Flamme: days in a row.
- Objectif de la semaine: letters learned this week.

### B2. First-run onboarding (skippable, 3 screens max, with the ant)
1. "Chaque jour, une lettre" - the 5 step icons in a row (eye, ear,
   finger, pencil, bulb) with one word each.
2. "Gagne des etoiles" - three stars filling up.
3. "Garde ta flamme" - flame + 7-day row.
Then a guided first lesson: a coach-mark (arrow + bubble) points at
"Commencer", then at each step.

### B3. "?" help on Home
A "?" icon in the header opens a bottom sheet with 3 rows (icon + one
line each): what the flame is, what stars are, what the weekly goal is.

### B4. Visible lesson steps
The 5-step bar shows icon + label for each step (Voir, Ecouter,
Tracer, Ecrire, Retenir). The current step is expanded, finished ones
show a check.

### B5. Redesign "Defi du jour"
Make it self-explanatory: a card titled "3 missions" with 3 icon tiles,
e.g. Revoir 1 lettre / Jouer 1 jeu / Tracer 1 lettre. Each tile has a
check circle; progress "1/3"; reward preview (a star). No sentence over
6 words. Tapping a tile starts that mission directly.

### B6. A picture for every letter (visual anchor)
Add fields `keyword` (Arabic), `keywordFr`, `picture` (emoji for now) to
each letter and show it in step 2 (Ecouter), the letter picker and
quizzes. Highlight the target letter inside the keyword.
| Letter | Word | FR | Picture |
|---|---|---|---|
| Alif | أسد | lion | 🦁 |
| Baa | بيت | maison | 🏠 |
| Taa | تفاح | pomme | 🍎 |
| Thaa | ثعلب | renard | 🦊 |
| Jiim | جمل | chameau | 🐪 |
| Haa | حصان | cheval | 🐴 |
| Khaa | خروف | mouton | 🐑 |
| Daal | دجاجة | poule | 🐔 |
| Dhaal | ذرة | mais | 🌽 |
| Raa | ريشة | plume | 🪶 |
| Zaay | زرافة | girafe | 🦒 |
| Siin | سمكة | poisson | 🐟 |
| Shiin | شمس | soleil | ☀️ |
| Saad | صقر | faucon | 🦅 |
| Daad | ضفدع | grenouille | 🐸 |
| Taa fort | طائرة | avion | ✈️ |
| Dhaa fort | ظرف | enveloppe | ✉️ |
| Ayn | عين | oeil | 👁️ |
| Ghayn | غيمة | nuage | ☁️ |
| Faa | فيل | elephant | 🐘 |
| Qaaf | قمر | lune | 🌙 |
| Kaaf | كتاب | livre | 📖 |
| Laam | ليمون | citron | 🍋 |
| Miim | موز | banane | 🍌 |
| Nuun | نجمة | etoile | ⭐ |
| Haa souffle | هاتف | telephone | 📱 |
| Waaw | وردة | rose | 🌹 |
| Yaa | يد | main | ✋ |

### B7. Answer variety (questions must not feel the same)
- Shuffle answer positions; the correct answer is never in the same
  position 3 times in a row.
- Mix question types (letter from sound, sound from letter, dot
  placement, odd one out, picture -> letter, letter -> picture). Never
  the same type twice in a row.
- Difficulty rises slowly with the number of correct answers.

---

## PHASE C - DEPTH (practice history, ant identity, games)

### C1. Calligraphy practice with history
- In the tracing screen and from the letter sheet add "Pratique".
- After validation the learner's ink STAYS on the canvas (do not clear
  it). Buttons: "Garder" and "Recommencer".
- "Garder" saves the attempt (simplified point array, under 2 KB) with
  date and score %. Keep the last 10 attempts per letter.
- A history strip under the canvas shows the attempts (small previews +
  date + score). Tap one to view it.
- "Fantome" toggle: shows the previous attempt faded behind the current
  one so the learner sees their progress.
- The best attempt feeds "Mon cahier" (before/after slider).

### C2. The ant is the identity of the app
- Home: the ant stands on the current node of the path and walks to the
  next node when a letter is finished.
- Voir animation: the pen-tip IS the ant, walking along the stroke and
  leaving a fading ink trail. Kids: full ant. Adults: small ant
  silhouette only.
- Loading states: the ant walks along a short line.
- End of a letter: the ant traces the finished letter once as the
  celebration.
- Implement with getPointAtLength on the same stroke data. Tapping the
  ant makes it wiggle. Reduced motion: static ant.

### C3. Rebuild the mini-games (fun and varied)
All games: only unlocked letters, 5 rounds, sound + haptics, no lives,
a combo counter, end screen with 1-3 stars, picture hints from B6.
1. **Memoire**: flip cards to pair a letter with its sound or picture
   (3x2 grid, later 4x3).
2. **Chasse aux points**: a letter body is shown with 3 versions of dots;
   tap the correct one.
3. **Course de la fourmi**: the ant must cross a stream. Stones show
   letters; a letter is spoken; tap the right stone and the ant hops.
   Wrong stone wobbles and the ant waits. 5 hops to cross.
4. **Mot a assembler**: drag tiles to build the word (fixed in A2) with
   a picture hint.
5. **Lettre mystere**: the letter is revealed stroke by stroke; guess it
   among 3-4 choices; the earlier you guess the more stars.
Access: the Defi du jour launches a game; plus a "Jeux" segmented toggle
at the top of the Lettres tab (Lettres | Jeux). A game never repeats
twice in a row.

---

## PHASE D - PEDAGOGY GAPS (minimal versions)

### D1. Letter forms (debut, milieu, fin)
In the letter sheet add a button "Formes". It shows the 4 forms
(isolee, debut, milieu, fin) with the animation and the keyword from B6
with the letter highlighted at its place. Letters that do not connect
(Alif, Daal, Dhaal, Raa, Zaay, Waaw) show only isolee + fin. Available
after the letter is done. Mark any stroke data that is a draft.

### D2. Harakat (voyelles)
- In step Ecouter show the letter with fatha, kasra and damma (marks
  drawn in saffron). Use combining characters U+064E, U+0650, U+064F on
  the letter. Tap plays "ba / bi / bu" style sounds. Use line-height of
  at least 1.9 so marks never clip.
- After family 1 is done: a 3-card mini lesson "Les voyelles" (mark
  above, mark below, mark with a loop) and the quiz type "Lecture
  voyelle".

---

## PHASE E - TEACHER LOOP (only after A-D pass)

### E1. Student - teacher link
The student has a teacher (assigned by admin, or joins with a "Code
prof"). In Moi: a card "Mon prof : <name>" with last correction status
chips and a WhatsApp button. If none: "Pas encore de prof" + code field.

### E2. Voice reading sent to the teacher
- In Lecture add a mic button "Lis a voix haute". Tap to record (max
  30 s), preview, retry, send. MediaRecorder with webm/opus and mp4
  fallback. A French screen explains why the microphone is needed.
- Stored privately, shown in the teacher queue next to photos with the
  same statuses (En attente, Bien, A retravailler). Kids: parental
  consent flag; delete on request; retention 90 days.

### E3. Make correction very easy (target under 15 seconds)
- One full-screen card at a time: photo or audio, the reference letter,
  and two big buttons "Correct" / "A refaire". Swipe right = correct,
  swipe left = redo.
- Quick reason chips: points, direction, taille, prononciation, rythme.
- Photo: pinch zoom plus a slider that overlays the correct letter at
  40 percent. Audio: play button, waveform, 0.75x speed.
- Optional 15 s voice reply. Auto-advance to the next item, 5 s undo,
  counters of pending items.

### E4. The student sees the result
Status chip, teacher comment, ant reaction (Kids), "Reessayer" button.

---

## MANDATORY SELF-CHECK BEFORE YOU SAY "DONE"
Do not report a pass you did not verify. Update /dev/selftest to print a
PASS/FAIL table, and also test by hand:
1. A1: animation plays and replays on Baa, Taa, Jiim, Kaaf, Alif.
2. A2: word builder tile count correct for 2, 3, 4, 5 letters.
3. Tracing steps differ per letter (Alif no dots step, Taa 2 dots,
   Thaa 3 dots).
4. No "pts" anywhere; onboarding and "?" sheet exist; Defi du jour shows
   3 mission tiles.
5. Every letter has keyword + picture; highlighted letter is correct.
6. Question order and type vary across 10 consecutive questions.
7. Practice: ink stays after validation; history keeps max 10 attempts;
   ghost toggle works.
8. Games use only unlocked letters (test with 3 letters unlocked).
9. Tap targets >= 48px; no overlap at 360x740 and 390x844; no English
   words in the UI.
10. Phase E (if built): record, send, teacher listens and corrects in
    under 15 s.
End your reply with: (a) the table, (b) every failure and its fix,
(c) anything you could NOT verify, stated honestly, (d) a short
"Suggestions" list. If a check fails, fix it and re-run before replying.
