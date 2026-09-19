import api from './client';

export const authApi = {
  login:   (data) => api.post('/auth/login', data).then((r) => r.data),
  refresh: (data) => api.post('/auth/refresh', data).then((r) => r.data),
  logout:  ()     => api.post('/auth/logout').then((r) => r.data),
  me:      ()     => api.get('/auth/me').then((r) => r.data),
};
