import api from './client';

export const paymentsApi = {
  // AP — money we pay to suppliers
  forPurchase: (id)       => api.get(`/payments/purchases/${id}/payments`).then((r) => r.data),
  payPurchase: (id, data) => api.post(`/payments/purchases/${id}/payments`, data).then((r) => r.data),

  // AR — money we receive from customers
  forSale:     (id)       => api.get(`/payments/sales/${id}/payments`).then((r) => r.data),
  receiveSale: (id, data) => api.post(`/payments/sales/${id}/payments`, data).then((r) => r.data),

  // Void (Boss/Admin)
  void: (id, data) => api.post(`/payments/${id}/void`, data).then((r) => r.data),

  // Reports
  outstanding: (params) => api.get('/payments/outstanding', { params }).then((r) => r.data),
  due:         ()       => api.get('/payments/due').then((r) => r.data),
};
