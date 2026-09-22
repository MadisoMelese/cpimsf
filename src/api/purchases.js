import api from './client';

export const purchasesApi = {
  list:           (params) => api.get('/purchases', { params }).then((r) => r.data),
  get:            (id)     => api.get(`/purchases/${id}`).then((r) => r.data),
  create:         (data)   => api.post('/purchases', data).then((r) => r.data),
  update:         (id, data) => api.patch(`/purchases/${id}`, data).then((r) => r.data),
  submit:         (id)     => api.post(`/purchases/${id}/submit`).then((r) => r.data),
  verify:         (id)     => api.post(`/purchases/${id}/verify`).then((r) => r.data),
  approve:        (id, data) => api.post(`/purchases/${id}/approve`, data).then((r) => r.data),
  reject:         (id, data) => api.post(`/purchases/${id}/reject`, data).then((r) => r.data),
  // Admin: set grade (coffee type) and payment terms during reconciliation
  setGradePayment:(id, data) => api.patch(`/purchases/${id}/grade-payment`, data).then((r) => r.data),
};
