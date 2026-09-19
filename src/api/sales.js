import api from './client';

export const salesApi = {
  list:    (params) => api.get('/sales', { params }).then((r) => r.data),
  get:     (id)     => api.get(`/sales/${id}`).then((r) => r.data),
  create:  (data)   => api.post('/sales', data).then((r) => r.data),
  confirm: (id, data) => api.post(`/sales/${id}/confirm`, data).then((r) => r.data),
  cancel:  (id)     => api.post(`/sales/${id}/cancel`).then((r) => r.data),
};
