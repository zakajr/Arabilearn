import { LetterRecord } from '../data/lettersAndFamilies';

/**
 * Section 4.6 Client-side image compression:
 * Max 1600px long edge, JPEG 0.8, under 800 KB, with optional rotation (0, 90, 180, 270).
 */
export async function compressAndFormatPhoto(
  fileOrDataUrl: File | string,
  rotationDeg = 0
): Promise<string> {
  const dataUrl =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(fileOrDataUrl);
        });

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxEdge = 1600;
      let width = img.width || 800;
      let height = img.height || 600;
      if (width > maxEdge || height > maxEdge) {
        if (width >= height) {
          height = Math.round((height * maxEdge) / width);
          width = maxEdge;
        } else {
          width = Math.round((width * maxEdge) / height);
          height = maxEdge;
        }
      }

      const canvas = document.createElement('canvas');
      const swapDims = rotationDeg % 180 !== 0;
      canvas.width = swapDims ? height : width;
      canvas.height = swapDims ? width : height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.restore();

      const compressed = canvas.toDataURL('image/jpeg', 0.8);
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Section 7.5 Printable Writing Sheets (Nouqta):
 * Generates an A4 printable writing sheet ('Feuille d'écriture - Baa') with:
 * - The letter's four forms on top (Isolée, Début, Milieu, Fin)
 * - A dotted tracing line
 * - Empty guided lines with a clear baseline
 * - URL footer with the lesson link and Nouqta logo
 */
export function downloadLetterWritingSheet(letter: LetterRecord) {
  const lessonUrl = `${window.location.origin}/lettre/${letter.id}`;
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="794" height="1123">
  <rect width="794" height="1123" fill="#FFFFFF" />
  <rect x="40" y="40" width="714" height="1043" rx="16" fill="none" stroke="#0B6B5D" stroke-width="2" />
  
  <!-- Header -->
  <text x="70" y="92" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#07463D">
    Feuille d'écriture - ${letter.nameFr}
  </text>
  <text x="70" y="120" font-family="sans-serif" font-size="14" fill="#0A1F1B">
    Nouqta • Famille ${letter.family} • ${letter.tip}
  </text>
  <text x="710" y="105" text-anchor="end" font-family="Amiri, serif" font-size="64" fill="#0B6B5D">
    ${letter.arabicChar}
  </text>

  <!-- 4 Positional Forms Box -->
  <g transform="translate(70, 150)">
    <rect x="0" y="0" width="150" height="95" rx="12" fill="#EEF3F0" stroke="#C5D1CC" />
    <text x="75" y="25" text-anchor="middle" font-family="monospace" font-size="11" fill="#07463D">FIN</text>
    <text x="75" y="74" text-anchor="middle" font-family="Amiri, serif" font-size="42" fill="#0A1F1B">${letter.formsText.final}</text>

    <rect x="172" y="0" width="150" height="95" rx="12" fill="#EEF3F0" stroke="#C5D1CC" />
    <text x="247" y="25" text-anchor="middle" font-family="monospace" font-size="11" fill="#07463D">MILIEU</text>
    <text x="247" y="74" text-anchor="middle" font-family="Amiri, serif" font-size="42" fill="#0A1F1B">${letter.formsText.medial}</text>

    <rect x="344" y="0" width="150" height="95" rx="12" fill="#EEF3F0" stroke="#C5D1CC" />
    <text x="419" y="25" text-anchor="middle" font-family="monospace" font-size="11" fill="#07463D">DÉBUT</text>
    <text x="419" y="74" text-anchor="middle" font-family="Amiri, serif" font-size="42" fill="#0A1F1B">${letter.formsText.initial}</text>

    <rect x="516" y="0" width="138" height="95" rx="12" fill="#EEF3F0" stroke="#0B6B5D" stroke-width="2" />
    <text x="585" y="25" text-anchor="middle" font-family="monospace" font-size="11" fill="#07463D">ISOLÉE</text>
    <text x="585" y="74" text-anchor="middle" font-family="Amiri, serif" font-size="42" fill="#0A1F1B">${letter.formsText.isolated}</text>
  </g>

  <!-- Row 1: Dotted Tracing Line (Right to Left) -->
  <text x="70" y="295" font-family="sans-serif" font-size="13" fill="#07463D" font-weight="bold">
    1. Repassez sur les modèles pointillés (de droite à gauche ←) :
  </text>
  <line x1="70" y1="370" x2="724" y2="370" stroke="#0B6B5D" stroke-width="1.5" />
  <line x1="70" y1="330" x2="724" y2="330" stroke="#C5D1CC" stroke-dasharray="6 6" />
  <g font-family="Amiri, serif" font-size="60" fill="none" stroke="#94A3B8" stroke-width="1.4" stroke-dasharray="4 4">
    <text x="680" y="366">${letter.arabicChar}</text>
    <text x="560" y="366">${letter.arabicChar}</text>
    <text x="440" y="366">${letter.arabicChar}</text>
    <text x="320" y="366">${letter.arabicChar}</text>
    <text x="200" y="366">${letter.arabicChar}</text>
    <text x="90" y="366">${letter.arabicChar}</text>
  </g>

  <!-- Guided Empty Practice Lines with Baselines -->
  <text x="70" y="435" font-family="sans-serif" font-size="13" fill="#07463D" font-weight="bold">
    2. Écrivez la lettre 5 fois par ligne sur la ligne de base :
  </text>
  ${[510, 620, 730, 840, 950]
    .map(
      (y) => `
    <line x1="70" y1="${y - 40}" x2="724" y2="${y - 40}" stroke="#E2E8F0" stroke-dasharray="5 5" />
    <line x1="70" y1="${y}" x2="724" y2="${y}" stroke="#0B6B5D" stroke-width="1.5" />
    <line x1="70" y1="${y + 25}" x2="724" y2="${y + 25}" stroke="#E2E8F0" stroke-dasharray="3 5" />
    <text x="695" y="${y - 4}" font-family="Amiri, serif" font-size="44" fill="#CBD5E1">${letter.arabicChar}</text>
  `
    )
    .join('')}

  <!-- Footer with Lesson URL and Nouqta Logo Box -->
  <line x1="70" y1="1015" x2="724" y2="1015" stroke="#C5D1CC" />
  <rect x="70" y="1028" width="38" height="38" rx="10" fill="#07463D" />
  <path d="M 101 1046 C 101 1061, 77 1061, 77 1046" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
  <circle cx="89" cy="1039" r="3.5" fill="#FFB400" />
  <text x="120" y="1045" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0A1F1B">
    Nouqta — Photographiez votre feuille dans l'étape 4 pour votre professeur
  </text>
  <text x="120" y="1062" font-family="monospace" font-size="11" fill="#0B6B5D">
    Lien direct : ${lessonUrl}
  </text>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Feuille_d_ecriture_${letter.nameFr}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Section 13.4 Certificate A4 Landscape generator (Nouqta):
 * Nouqta logo (Arabic letter nuun + saffron ant dot), 'Certificat de réussite',
 * learner name, date, serial number, signature line.
 */
export function downloadCertificateFile(params: {
  learnerName: string;
  issuedAt: string;
  serial: string;
}) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1123 794" width="1123" height="794">
  <rect width="1123" height="794" fill="#EEF3F0" />
  <rect x="44" y="44" width="1035" height="706" rx="28" fill="#FFFFFF" stroke="#0B6B5D" stroke-width="4" />
  <rect x="64" y="64" width="995" height="666" rx="20" fill="none" stroke="#FFB400" stroke-width="2" />

  <!-- Nouqta Rounded-Square Brand Logo (Nuun + Saffron Ant) -->
  <rect x="523" y="105" width="76" height="76" rx="20" fill="#07463D" />
  <path d="M 583 144 C 583 172, 539 172, 539 144" fill="none" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" />
  <circle cx="556" cy="130" r="4" fill="#FFB400" />
  <circle cx="562" cy="129" r="3.2" fill="#FFB400" />
  <circle cx="568" cy="128" r="4.5" fill="#FFB400" />

  <text x="561" y="212" text-anchor="middle" font-family="monospace" font-size="14" letter-spacing="3" fill="#0B6B5D">
    NOUQTA
  </text>

  <text x="561" y="280" text-anchor="middle" font-family="Georgia, serif" font-size="48" fill="#0A1F1B">
    Certificat de réussite
  </text>

  <text x="561" y="340" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#07463D">
    Décerné pour la maîtrise complète des 28 lettres arabes (lecture et écriture) à
  </text>

  <text x="561" y="420" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="#0B6B5D">
    ${params.learnerName}
  </text>
  <line x1="340" y1="440" x2="782" y2="440" stroke="#C5D1CC" stroke-width="2" />

  <text x="260" y="590" text-anchor="middle" font-family="monospace" font-size="14" fill="#0A1F1B">
    Date : ${params.issuedAt}
  </text>
  <text x="561" y="590" text-anchor="middle" font-family="monospace" font-size="14" fill="#07463D">
    N° Série : ${params.serial}
  </text>
  <text x="860" y="590" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#0A1F1B">
    Direction Pédagogique Nouqta
  </text>
  <line x1="740" y1="560" x2="980" y2="560" stroke="#0B6B5D" stroke-width="1.5" />
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Certificat_Nouqta_${params.serial}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * PHASE 3.8 SHAREABLE CARD:
 * Renders a 1080x1080 PNG on a canvas (name optional, letters mastered, streak, Nouqta logo, brand colours).
 * CRITICAL PRIVACY RULE: No personal data / name on the image unless the learner enables "Afficher mon prénom" (showName === true).
 */
export function renderShareCardToCanvas(
  canvas: HTMLCanvasElement,
  params: {
    showName: boolean;
    learnerName: string;
    lettersMastered: number;
    streak: number;
    totalStars?: number;
  }
): {
  width: number;
  height: number;
  includedName: boolean;
  renderedTextSummary: string;
} {
  canvas.width = 1080;
  canvas.height = 1080;

  const includedName = Boolean(params.showName && params.learnerName.trim());
  const textParts = [
    'Nouqta',
    `${params.lettersMastered}/28 lettres maîtrisées`,
    `Série : ${params.streak} jours`
  ];
  if (includedName) {
    textParts.push(params.learnerName.trim());
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      width: canvas.width,
      height: canvas.height,
      includedName,
      renderedTextSummary: textParts.join(' | ')
    };
  }

  // 1. Brand deep background (#07463D)
  ctx.fillStyle = '#07463D';
  ctx.fillRect(0, 0, 1080, 1080);

  // 2. Inner rounded frame (#0B6B5D / #FFB400 border)
  ctx.strokeStyle = '#FFB400';
  ctx.lineWidth = 6;
  ctx.strokeRect(56, 56, 968, 968);

  // 3. Nouqta Logo (Brand green rounded square + white Nuun bowl + saffron ant dot)
  ctx.fillStyle = '#0B6B5D';
  ctx.beginPath();
  ctx.arc(540, 210, 74, 0, Math.PI * 2);
  ctx.fill();

  // Nuun bowl
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(540, 216, 42, 0.1 * Math.PI, 0.9 * Math.PI, false);
  ctx.stroke();

  // Saffron ant dot
  ctx.fillStyle = '#FFB400';
  ctx.beginPath();
  ctx.arc(526, 188, 9, 0, Math.PI * 2);
  ctx.arc(540, 186, 7, 0, Math.PI * 2);
  ctx.arc(554, 184, 10, 0, Math.PI * 2);
  ctx.fill();

  // 4. App Title: Nouqta
  ctx.fillStyle = '#FFB400';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NOUQTA', 540, 340);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText(
    includedName
      ? `Bravo ${params.learnerName.trim()} !`
      : 'Mes progrès en arabe',
    540,
    435
  );

  // 5. Stats Cards
  ctx.fillStyle = '#0B6B5D';
  ctx.fillRect(140, 520, 800, 180);
  ctx.fillStyle = '#BFE8D8';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('LETTRES MAÎTRISÉES', 540, 585);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 76px Georgia, serif';
  ctx.fillText(`${params.lettersMastered} / 28`, 540, 668);

  ctx.fillStyle = '#0B6B5D';
  ctx.fillRect(140, 740, 800, 150);
  ctx.fillStyle = '#FFB400';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(
    `Série : ${params.streak} jour${params.streak > 1 ? 's' : ''} 🔥`,
    540,
    832
  );

  ctx.fillStyle = '#BFE8D8';
  ctx.font = '28px monospace';
  ctx.fillText('Nouqta • Lecture & Écriture Arabe', 540, 968);

  return {
    width: canvas.width,
    height: canvas.height,
    includedName,
    renderedTextSummary: textParts.join(' | ')
  };
}

export async function shareOrDownloadCard(params: {
  showName: boolean;
  learnerName: string;
  lettersMastered: number;
  streak: number;
  totalStars?: number;
}): Promise<{
  sharedViaWebShare: boolean;
  dataUrl: string;
  whatsappUrl: string;
}> {
  const canvas = document.createElement('canvas');
  renderShareCardToCanvas(canvas, params);
  const dataUrl = canvas.toDataURL('image/png');

  const prefilledFr = params.showName && params.learnerName.trim()
    ? `Je progresse sur Nouqta (${params.learnerName.trim()}) : ${params.lettersMastered}/28 lettres arabes maîtrisées et ${params.streak} jours de série !`
    : `Je progresse sur Nouqta : ${params.lettersMastered}/28 lettres arabes maîtrisées et ${params.streak} jours de série !`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(prefilledFr)}`;

  // Try Web Share API with file first (Phase 3.8)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob) {
        const file = new File([blob], 'Nouqta_Progres.png', {
          type: 'image/png'
        });
        if (
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            title: 'Nouqta — Mes progrès',
            text: prefilledFr,
            files: [file]
          });
          return { sharedViaWebShare: true, dataUrl, whatsappUrl };
        }
      }
    } catch {
      // Fallback to download below
    }
  }

  // Fallback: trigger PNG download
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'Nouqta_Progres_1080x1080.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // Ignore in headless tests
  }

  return { sharedViaWebShare: false, dataUrl, whatsappUrl };
}
