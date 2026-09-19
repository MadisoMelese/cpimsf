import api from './client';

export const reconciliationApi = {
  sessions:    (params) => api.get('/reconciliation/sessions', { params }).then((r) => r.data),
  session:     (id)     => api.get(`/reconciliation/sessions/${id}`).then((r) => r.data),
  create:      (data)   => api.post('/reconciliation/sessions', data).then((r) => r.data),
  verify:      (id, data) => api.post(`/reconciliation/sessions/${id}/verify`, data).then((r) => r.data),
  adjust:      (id, data) => api.post(`/reconciliation/sessions/${id}/adjustments`, data).then((r) => r.data),
  close:       (id, data) => api.post(`/reconciliation/sessions/${id}/close`, data).then((r) => r.data),
};
