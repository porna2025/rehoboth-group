import api from './axiosConfig'

export const technicienApi = {
  // Catégories
  getCategories: () =>
    api.get('/techniciens/categories/'),

  creerCategorie: (data) =>
    api.post('/techniciens/categories/creer/', data),

  modifierCategorie: (id, data) =>
    api.patch(`/techniciens/categories/${id}/`, data),

  supprimerCategorie: (id) =>
    api.delete(`/techniciens/categories/${id}/`),

  // Liste publique
  getTechniciens: (params = {}) =>
    api.get('/techniciens/', { params }),

  getTechnicien: (id) =>
    api.get(`/techniciens/${id}/`),

  // Mon profil (technicien connecté)
  getMonProfil: () =>
    api.get('/techniciens/profil/'),

  creerMonProfil: (data) =>
    api.post('/techniciens/profil/creer/', data),

  modifierMonProfil: (data) =>
    api.patch('/techniciens/profil/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  mettreAJourPosition: (latitude, longitude, disponible) =>
    api.patch('/techniciens/profil/position/', { latitude, longitude, disponible }),

  uploadDocument: (formData) =>
    api.post('/techniciens/profil/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getDisponibilites: () =>
    api.get('/techniciens/profil/disponibilites/'),

  setDisponibilites: (data) =>
    api.put('/techniciens/profil/disponibilites/', data),

  // Admin
  getEnAttente: () =>
    api.get('/techniciens/admin/en-attente/'),

  validerTechnicien: (id, action, motif_rejet = '') =>
    api.patch(`/techniciens/admin/${id}/valider/`, { action, motif_rejet }),
}
