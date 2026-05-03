import api from './axiosConfig'

export const notificationApi = {
  getNotifications: (nonLues = false) =>
    api.get('/notifications/', { params: nonLues ? { non_lues: true } : {} }),

  getNonLuesCount: () =>
    api.get('/notifications/non-lues/'),

  lireTout: () =>
    api.post('/notifications/lire-tout/'),

  lireNotification: (id) =>
    api.post(`/notifications/${id}/lire/`),

  supprimerNotification: (id) =>
    api.delete(`/notifications/${id}/supprimer/`),
}
