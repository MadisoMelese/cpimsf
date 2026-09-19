import api from './client';

export const processingApi = {
  list:      (params) => api.get('/processing', { params }).then((r) => r.data),
  get:       (id)     => api.get(`/processing/${id}`).then((r) => r.data),
  create:    (data)   => api.post('/processing', data).then((r) => r.data),
  addInputs: (id, data) => api.post(`/processing/${id}/inputs`, data).then((r) => r.data),
  complete:  (id, data) => api.post(`/processing/${id}/complete`, data).then((r) => r.data),
  cancel:    (id)     => api.post(`/processing/${id}/cancel`).then((r) => r.data),
};
