import api from './axiosConfig'

export const paiementApi = {
  initierPaiement: (data) =>
    api.post('/paiements/initier/', data),

  verifierPaiement: (transactionId) =>
    api.get(`/paiements/verifier/${transactionId}/`),

  getMesPaiements: () =>
    api.get('/paiements/mes-paiements/'),

  getMesRevenus: () =>
    api.get('/paiements/mes-revenus/'),

  demanderRetrait: (montant, telephone) =>
    api.post('/paiements/retrait/', { montant, telephone }),

  // Admin
  getRapportFinancier: () =>
    api.get('/paiements/admin/rapport/'),

  traiterRetrait: (id, statut) =>
    api.patch(`/paiements/admin/retraits/${id}/traiter/`, { statut }),
}
