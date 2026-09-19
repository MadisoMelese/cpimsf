import api from './client';

export const reportsApi = {
  dailyPurchases: (params) => api.get('/reports/daily-purchases',    { params }).then((r) => r.data),
  reconciliation: (id)     => api.get(`/reports/reconciliation/${id}`).then((r) => r.data),
  agents:         (params) => api.get('/reports/agents',             { params }).then((r) => r.data),
  agent:          (id, params) => api.get(`/reports/agents/${id}`,   { params }).then((r) => r.data),
  payments:       (params) => api.get('/reports/payments',           { params }).then((r) => r.data),
  credit:         ()       => api.get('/reports/credit').then((r) => r.data),
  processingLoss: (params) => api.get('/reports/processing-loss',    { params }).then((r) => r.data),
};
