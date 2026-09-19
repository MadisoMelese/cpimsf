import api from './client';

export const syncApi = {
  push:           (data)   => api.post('/sync/push', data).then((r) => r.data),
  pull:           (params) => api.get('/sync/pull', { params }).then((r) => r.data),
  conflicts:      (params) => api.get('/sync/conflicts', { params }).then((r) => r.data),
  conflict:       (id)     => api.get(`/sync/conflicts/${id}`).then((r) => r.data),
  resolve:        (id, data) => api.post(`/sync/conflicts/${id}/resolve`, data).then((r) => r.data),
};
