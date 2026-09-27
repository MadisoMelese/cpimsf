import api from './client';

export const agentsApi = {
  list:           (params) => api.get('/agents', { params }).then((r) => r.data),
  get:            (id)     => api.get(`/agents/${id}`).then((r) => r.data),
  getWithStats:   (id)     => api.get(`/agents/${id}/stats`).then((r) => r.data),
  create:         (data)   => api.post('/agents', data).then((r) => r.data),
  update:         (id, d)  => api.patch(`/agents/${id}`, d).then((r) => r.data),
  updatePhoto:    (id, photoUrl) => api.patch(`/agents/${id}/photo`, { photoUrl }).then((r) => r.data),
  activate:       (id)     => api.post(`/agents/${id}/activate`).then((r) => r.data),
  deactivate:     (id)     => api.post(`/agents/${id}/deactivate`).then((r) => r.data),
  remove:         (id)     => api.delete(`/agents/${id}`).then((r) => r.data),
};

export const locationsApi = {
  list:   ()       => api.get('/locations').then((r) => r.data),
  create: (data)   => api.post('/locations', data).then((r) => r.data),
  update: (id, d)  => api.patch(`/locations/${id}`, d).then((r) => r.data),
};

export const coffeeTypesApi = {
  list:   (params) => api.get('/coffee-types', { params }).then((r) => r.data),
  create: (data)   => api.post('/coffee-types', data).then((r) => r.data),
  update: (id, d)  => api.patch(`/coffee-types/${id}`, d).then((r) => r.data),
};

export const usersApi = {
  list:           (params) => api.get('/users', { params }).then((r) => r.data),
  get:            (id)     => api.get(`/users/${id}`).then((r) => r.data),
  create:         (data)   => api.post('/users', data).then((r) => r.data),
  update:         (id, d)  => api.patch(`/users/${id}`, d).then((r) => r.data),
  changePassword: (id, d)  => api.post(`/users/${id}/change-password`, d).then((r) => r.data),
  resetPassword:  (id, d)  => api.post(`/users/${id}/reset-password`, d).then((r) => r.data),
};

export const auditApi = {
  list: (params) => api.get('/audit', { params }).then((r) => r.data),
};
