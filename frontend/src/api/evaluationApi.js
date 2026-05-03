import api from './axiosConfig'

export const evaluationApi = {
  evaluerTechnicien: (data) =>
    api.post('/evaluations/', data),

  getEvaluationsTechnicien: (id) =>
    api.get(`/evaluations/technicien/${id}/`),
}
