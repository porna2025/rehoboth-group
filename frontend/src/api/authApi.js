import api from './axiosConfig'

export const authApi = {
  warmupBackend: () =>
    api.get('/health/', { timeout: 15000 }),

  inscription: (data) =>
    api.post('/auth/inscription/', data),

  connexion: (email, password) =>
    api.post('/auth/connexion/', { email, password }),

  verifierOtpConnexion: (payload) =>
    api.post('/auth/connexion/verifier-otp/', payload),

  renvoyerOtpConnexion: (payload) =>
    api.post('/auth/connexion/renvoyer-otp/', payload),

  demanderResetMotDePasse: (email) =>
    api.post('/auth/mot-de-passe-oublie/', { email }),

  confirmerResetMotDePasse: (payload) =>
    api.post('/auth/mot-de-passe-oublie/confirmer/', payload),

  deconnexion: (refresh) =>
    api.post('/auth/deconnexion/', { refresh }),

  refreshToken: (refresh) =>
    api.post('/auth/token/refresh/', { refresh }),

  getProfil: () =>
    api.get('/auth/profil/'),

  modifierProfil: (data) =>
    api.patch('/auth/profil/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  changerMotDePasse: (data) =>
    api.post('/auth/changer-mot-de-passe/', data),

  // Admin
  getUtilisateurs: (role = '', search = '', signal) => {
    const params = {}
    if (role)   params.role   = role
    if (search) params.search = search
    return api.get('/auth/admin/utilisateurs/', { params, signal })
  },

  getUtilisateur: (id) =>
    api.get(`/auth/admin/utilisateurs/${id}/`),

  suspendreUtilisateur: (id) =>
    api.patch(`/auth/admin/utilisateurs/${id}/suspendre/`),

  validerUtilisateur: (id) =>
    api.patch(`/auth/admin/utilisateurs/${id}/valider/`),

  supprimerUtilisateur: (id) =>
    api.delete(`/auth/admin/utilisateurs/${id}/supprimer/`),
}
