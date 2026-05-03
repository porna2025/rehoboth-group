/**
 * Formateurs utilitaires
 */

/** Format d'une date ISO en date lisible française */
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
  })
}

/** Format d'une date ISO en date + heure */
export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

/** Format d'un montant en FCFA */
export function formatMontant(val) {
  if (val === null || val === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style:    'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(val)
}

/** Libellés de statut pour les demandes */
export const STATUT_DEMANDE = {
  en_attente: { label: 'En attente',   color: 'orange' },
  acceptee:   { label: 'Acceptée',     color: 'bleu'   },
  en_route:   { label: 'En route',     color: 'bleu'   },
  en_cours:   { label: 'En cours',     color: 'bleu'   },
  terminee:   { label: 'Terminée',     color: 'vert'   },
  annulee:    { label: 'Annulée',      color: 'rouge'  },
}

/** Libellés des méthodes de paiement */
export const METHODE_PAIEMENT = {
  mobile_money: 'Mobile Money',
  carte:        'Carte bancaire',
  especes:      'Espèces',
}

/** Libellés de statut de paiement */
export const STATUT_PAIEMENT = {
  en_attente: { label: 'En attente', color: 'orange' },
  reussi:     { label: 'Réussi',    color: 'vert'   },
  echoue:     { label: 'Échoué',    color: 'rouge'  },
  rembourse:  { label: 'Remboursé', color: 'bleu'   },
}

/** Libellés de statut de retrait */
export const STATUT_RETRAIT = {
  en_attente: { label: 'En attente', color: 'orange' },
  effectue:   { label: 'Effectué',  color: 'vert'   },
  refuse:     { label: 'Refusé',    color: 'rouge'  },
}

/** Libellés de validation technicien */
export const STATUT_VALIDATION = {
  en_attente: { label: 'En attente de validation', color: 'orange' },
  valide:     { label: 'Validé',                   color: 'vert'   },
  rejete:     { label: 'Rejeté',                   color: 'rouge'  },
}

/** Jours de la semaine */
export const JOURS_SEMAINE = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
]
