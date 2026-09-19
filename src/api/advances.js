import api from './client';

export const advancesApi = {
  // Overview
  overview:       (params)     => api.get('/advances/overview', { params }).then(r => r.data),
  agentSummary:   (agentId, params) => api.get(`/advances/agents/${agentId}`, { params }).then(r => r.data),

  // Advances
  list:           (params)     => api.get('/advances', { params }).then(r => r.data),
  get:            (id)         => api.get(`/advances/${id}`).then(r => r.data),
  give:           (data)       => api.post('/advances', data).then(r => r.data),
  submit:         (id)         => api.post(`/advances/${id}/submit`).then(r => r.data),
  approve:        (id)         => api.post(`/advances/${id}/approve`).then(r => r.data),
  void:           (id, data)   => api.post(`/advances/${id}/void`, data).then(r => r.data),

  // Expenses
  addExpense:     (id, data)   => api.post(`/advances/${id}/expenses`, data).then(r => r.data),
  deleteExpense:  (id, expId)  => api.delete(`/advances/${id}/expenses/${expId}`).then(r => r.data),

  // Return
  recordReturn:   (id, data)   => api.post(`/advances/${id}/return`, data).then(r => r.data),
};
