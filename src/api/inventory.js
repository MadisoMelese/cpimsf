import api from './client';

export const inventoryApi = {
  overview:       (params) => api.get('/inventory', { params }).then((r) => r.data),
  batches:        (params) => api.get('/inventory/batches', { params }).then((r) => r.data),
  batch:          (id)     => api.get(`/inventory/batches/${id}`).then((r) => r.data),
  ledger:         (params) => api.get('/inventory/ledger', { params }).then((r) => r.data),
  createTransfer: (data)   => api.post('/inventory/transfers', data).then((r) => r.data),
  createAdjustment: (data) => api.post('/inventory/adjustments', data).then((r) => r.data),
};
