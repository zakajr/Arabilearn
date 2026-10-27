export type LearnerMode = 'kids' | 'adult';

export type CopyKey =
  | 'home.hero.tag'
  | 'home.cta.start'
  | 'home.cta.continue'
  | 'home.challenge'
  | 'step.see'
  | 'step.listen'
  | 'step.trace'
  | 'step.write'
  | 'step.remember'
  | 'trace.ok'
  | 'trace.outside'
  | 'trace.short'
  | 'trace.dots'
  | 'trace.direction'
  | 'quiz.right'
  | 'quiz.wrong'
  | 'photo.send'
  | 'photo.pending'
  | 'photo.correct'
  | 'photo.redo'
  | 'lock.toast'
  | 'empty.review'
  | 'streak.repair'
  | 'offline';

export const COPY_DECK: Record<CopyKey, { kids: string; adult: string }> = {
  'home.hero.tag': {
    kids: "AUJOURD'HUI",
    adult: "AUJOURD'HUI"
  },
  'home.cta.start': {
    kids: 'Commencer',
    adult: 'Commencer'
  },
  'home.cta.continue': {
    kids: 'Continuer',
    adult: 'Reprendre'
  },
  'home.challenge': {
    kids: 'Défi du jour',
    adult: 'Défi du jour'
  },
  'step.see': {
    kids: 'Voir',
    adult: 'Observer'
  },
  'step.listen': {
    kids: 'Écouter',
    adult: 'Écouter'
  },
  'step.trace': {
    kids: 'Tracer',
    adult: 'Tracer'
  },
  'step.write': {
    kids: 'Écrire',
    adult: 'Écrire sur papier'
  },
  'step.remember': {
    kids: 'Retenir',
    adult: 'Retenir'
  },
  'trace.ok': {
    kids: 'Bravo !',
    adult: 'Très bien.'
  },
  'trace.outside': {
    kids: 'Reste dans le chemin',
    adult: 'Le tracé sort du guide.'
  },
  'trace.short': {
    kids: "Va jusqu'au bout",
    adult: 'Le tracé est incomplet.'
  },
  'trace.dots': {
    kids: 'Les points sont ici',
    adult: 'Vérifiez la position des points.'
  },
  'trace.direction': {
    kids: 'Pars du point 1 à droite',
    adult: 'Commencez au point de départ à droite.'
  },
  'quiz.right': {
    kids: 'Oui !',
    adult: 'Correct.'
  },
  'quiz.wrong': {
    kids: 'Presque. Écoute encore',
    adult: 'Incorrect. Réécoutez la lettre.'
  },
  'photo.send': {
    kids: 'Envoyer la photo',
    adult: 'Envoyer la photo'
  },
  'photo.pending': {
    kids: 'En attente',
    adult: 'En attente de correction'
  },
  'photo.correct': {
    kids: 'Correct',
    adult: 'Correct'
  },
  'photo.redo': {
    kids: 'À refaire',
    adult: 'À refaire'
  },
  'lock.toast': {
    kids: 'Bientôt !',
    adult: 'Cette famille est verrouillée.'
  },
  'empty.review': {
    kids: "Rien à revoir aujourd'hui",
    adult: "Aucune révision aujourd'hui."
  },
  'streak.repair': {
    kids: 'Jour de repos utilisé',
    adult: 'Jour de repos utilisé'
  },
  'offline': {
    kids: 'Pas de connexion',
    adult: 'Vous êtes hors ligne.'
  }
};

export function t(key: CopyKey, mode: LearnerMode): string {
  return COPY_DECK[key]?.[mode] ?? key;
}
