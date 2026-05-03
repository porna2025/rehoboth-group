import api from './axiosConfig'

export const demandeApi = {
  // Client
  creerDemande: (data) =>
    api.post('/demandes/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getMesDemandes: (statut = '') =>
    api.get('/demandes/mes-demandes/', { params: statut ? { statut } : {} }),

  // Technicien
  getDemandesDisponibles: () =>
    api.get('/demandes/disponibles/'),

  getMesMissions: (statut = '') =>
    api.get('/demandes/mes-missions/', { params: statut ? { statut } : {} }),

  // Détail commun
  getDemande: (id) =>
    api.get(`/demandes/${id}/`),

  accepterDemande: (id) =>
    api.post(`/demandes/${id}/accepter/`),

  mettreAJourStatut: (id, data) =>
    api.patch(`/demandes/${id}/statut/`, data),

  annulerDemande: (id) =>
    api.post(`/demandes/${id}/annuler/`),

  // Messages
  getMessages: (id) =>
    api.get(`/demandes/${id}/messages/`),

  envoyerMessage: (id, contenu) =>
    api.post(`/demandes/${id}/messages/envoyer/`, { contenu }),

  // Admin
  getToutesDemandes: (params = {}) =>
    api.get('/demandes/admin/toutes/', { params }),
}
