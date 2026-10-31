# Nouqta (نُقْطَة) — Académie d'écriture et de lecture arabe

**Nouqta** est une application web progressive d'apprentissage de l'écriture et de la lecture de l'alphabet arabe en français, conçue pour les enfants (6–12 ans) et les adultes débutants. L'application repose sur une progression stricte par familles de formes, un moteur calligraphique Naskh hybride (`Amiri-Regular.ttf` + `opentype.js`) guidé par la fourmi calligraphe **Nouqta**, et une boucle de rétroaction enseignant-élève.

---

## ✨ Fonctionnalités principales

### 1. Règle progressive stricte & 7 familles calligraphiques
Aucune lettre, aucun mot ni aucune question de quiz n'expose une lettre que l'élève n'a pas encore apprise. Les 28 lettres sont regroupées en **7 familles morphologiques** :
1. **F1 — Racines simples** (*Alif, Baa, Taa, Thaa*) — Gratuite
2. **F2 — Crochets** (*Jiim, Haa, Khaa*)
3. **F3 — Sans liaison** (*Daal, Dhaal, Raa, Zaay*)
4. **F4 — Dents et ventres** (*Siin, Shiin, Saad, Daad*)
5. **F5 — Lettres fortes** (*Taa fort, Dhaa fort, Ayn, Ghayn*)
6. **F6 — Boucles** (*Faa, Qaaf, Kaaf, Laam*)
7. **F7 — Rondes et finales** (*Miim, Nuun, Haa souffle, Waaw, Yaa*)

### 2. Moteur calligraphique Naskh hybride (`Amiri-Regular.ttf` + `opentype.js`)
- **Contours typographiques authentiques** : Extraction des contours vectoriels Naskh du corps et des points (*nuqta* en losange calligraphique agrandis à $1{,}3\times$, diagonale $\ge 22\text{ u}$) sur une grille normalisée $200 \times 200$ (`baseline = 120`).
- **Animation de révélation (`Voir`)** : La fourmi calligraphe parcourt la ligne centrale pendant qu'un masque SVG (`<mask>`) révèle progressivement le contour Naskh véritable, puis dépose chaque point un par un avant de se garer sur la ligne de base.
- **Tracé multi-étapes assisté (`Tracer`)** :
  - Séquence automatique : traits du corps (`Trait 1/N`) suivis d'une étape dédiée pour chaque point (`Point 1/N`, etc.).
  - 3 modes de guidage par étape : *Guide complet avec flèches*, *Guide léger (20 %)*, *Sans guide (Mémoire)*.
  - Validation géométrique par corridor, couverture ($\ge 75\,\%$), sens du tracé (droite-vers-gauche / haut-vers-bas) et dégagement automatique des points ($\ge 24{,}05\text{ u}$).

### 3. Boucle de leçon en 5 étapes
Chaque lettre suit le même parcours structuré :
1. **Voir** : Animation calligraphique Naskh, ancre visuelle mnémotechnique et feuille des **4 formes contextuelles** (*Isolée, Initiale, Médiane, Finale*).
2. **Écouter** : Prononciation isolée, avec voyelles courtes (*Fatha, Kasra, Damma*) et enregistrement vocal de l'élève (`MediaRecorder`).
3. **Tracer** : Tracé interactif au doigt ou au stylet avec plume de roseau dynamique (*qalam*).
4. **Écrire** : Pratique sur papier et envoi d'une photo du cahier au professeur (avec file d'attente hors-ligne).
5. **Retenir** : Quiz adaptatif de validation finale (son $\to$ lettre, lettre $\to$ nom, placement des points, formes contextuelles, voyelles).

### 4. Test de positionnement adaptatif (« Où en es-tu ? »)
- Proposé au premier lancement (ou via **Moi → Réglages → Refaire le test**).
- Évalue famille par famille ($F1 \to F7$, 3 questions par famille, seuil $2/3$, arrêt après 2 familles échouées).
- Marque automatiquement les familles réussies comme acquises (`source: 'placement'`, boîte SRS `2`) et place l'élève sur sa première lettre à apprendre tout en respectant le contrôle d'accès du plan gratuit/complet.

### 5. Mini-jeux & Échelle de lecture
- **5 mini-jeux alimentés uniquement par les lettres acquises** : *Chasse aux points*, *Memory des formes*, *Train des syllabes*, *Construis le mot* et *Lettre mystère*.
- **Échelle de lecture (5 paliers)** : Syllabes simples $\to$ Syllabes mixtes $\to$ Mots de 2 lettres $\to$ Mots de 3 lettres $\to$ Petits groupes de mots, avec assemblage interactif droite-à-gauche.

### 6. Espaces Professeur (`/prof`) & Administration (`/admin`)
- **Interface Professeur (`/prof`)** : Correction rapide ($< 15\text{ s}$) des photos d'écriture et enregistrements vocaux, réponse vocale, suivi par élève (avec badge **« Placé par test »**) et personnalisation pédagogique.
- **Interface Administration (`/admin`)** : Génération/révocation de codes d'activation (`ALIF-XXXX`), gestion des accès élèves et configuration globale.

---

## 🛠️ Outils développeur intégrés

| Route | Description |
| :--- | :--- |
| `/dev/glyphs` | **Éditeur de glyphes Naskh** : superposition du contour `Amiri-Regular.ttf`, bouton **« Suggérer la ligne centrale »** (squelettisation Zhang-Suen), poignées Bézier, calcul en direct des métriques d'alignement `(a)` ($\ge 95\,\%$) et `(b)` ($\ge 97\,\%$), aperçu de la fourmi et export JSON. |
| `/dev/selftest` | **Audit automatique en 9 points** : vérifie les contours Naskh des 28 lettres, l'alignement `(a)`/`(b)`, la taille et le dégagement des points, le quiz voyelles, les mini-jeux, la taille minimale de police ($\ge 13\text{ px}$ et zoom `130 %`), le désencombrement UI, le test de positionnement et les cibles tactiles ($\ge 48 \times 48\text{ px}$). |

---

## 🚀 Installation et démarrage

### Prérequis
- **Node.js** $\ge 20$

### Commandes

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement (port 3000)
npm run dev

# Exécuter la suite de tests unitaires (node:test via tsx)
npx tsx --test src/services/dataService.test.ts

# Vérifier le typage TypeScript
npm run lint

# Compiler pour la production
npm run build
```

---

## 📁 Structure du projet

```text
├── public/
│   └── fonts/
│       └── Amiri-Regular.ttf          # Police Naskh auto-hébergée (SIL OFL)
├── src/
│   ├── components/
│   │   ├── BlueprintComponents.tsx    # Composants UI, Mascotte, Fourmi SVG, Navigation
│   │   ├── DevSelfTestPage.tsx        # Audit automatique (/dev/selftest)
│   │   ├── GlyphStrokeEditorPage.tsx  # Éditeur de glyphes (/dev/glyphs)
│   │   ├── LetterLessonLoop.tsx       # Boucle de leçon en 5 étapes (Voir, Écouter, Tracer, Écrire, Retenir)
│   │   ├── MiniGamesHub.tsx           # 5 mini-jeux progressifs
│   │   └── TeacherAndAdminViews.tsx   # Vues Professeur (/prof) et Admin (/admin)
│   ├── data/
│   │   ├── copyDeck.ts                # Textes FR (modes Enfant et Adulte)
│   │   └── lettersAndFamilies.ts      # Données des 28 lettres, 7 familles, mots, générateurs de quiz
│   ├── hooks/
│   │   └── useNouqtaState.ts          # État applicatif, routage et actions
│   ├── lib/
│   │   ├── fontGlyphs.ts              # Chargeur opentype.js, audit d'alignement (a)/(b), squelettisation
│   │   ├── fontGlyphsData.ts          # Contours Naskh pré-calculés (28 lettres × 4 formes)
│   │   └── strokeMath.ts              # Géométrie des tracés, validation, dégagement des points et timeline
│   ├── screens/
│   │   ├── ParcoursScreen.tsx         # Écran d'accueil (Carte du jour, Missions, Bloc « Plus », Chemin)
│   │   ├── LettresScreen.tsx          # Grille des 28 lettres, Révision SRS et Mini-jeux
│   │   ├── LectureScreen.tsx          # Échelle de lecture en 5 paliers
│   │   ├── MoiScreen.tsx              # Onglets « Progrès » (Anneau, Cahier, Badges) & « Réglages »
│   │   └── SheetsAndModals.tsx        # Modales (Test de positionnement, Formes, Examens, Audio, Photo)
│   └── services/
│       ├── dataService.ts             # Persistance localStorage, SRS, progression et positionnement
│       ├── dataService.test.ts        # Tests unitaires (18 suites couvrant l'ensemble des règles)
│       └── speechService.ts           # Synthèse vocale arabe, effets sonores WebAudio et haptique
```
