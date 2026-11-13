import api from './index';

export const smmApi = {
  // Clients
  getClients: (params) => api.get('/smm/clients', { params }),
  getClient: (id) => api.get(`/smm/clients/${id}`),
  createClient: (data) => api.post('/smm/clients', data),
  updateClient: (id, data) => api.put(`/smm/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/smm/clients/${id}`),

  // ── Monthly One-Page Tracker ──────────────────────────────────────────────
  getMonthlyTrackers: (params) => api.get('/smm/tracker', { params }),
  upsertTracker: (data) => api.post('/smm/tracker', data),
  updateTrackerDayCell: (id, day, data) => api.patch(`/smm/tracker/${id}/day/${day}`, data),
  updateTrackerMeta: (id, data) => api.patch(`/smm/tracker/${id}/meta`, data),
  deleteTracker: (id, config) => api.delete(`/smm/tracker/${id}`, config),
  syncTasksTracker: (data) => api.post('/smm/tracker/sync-tasks', data),
  syncContentTracker: (data) => api.post('/smm/tracker/sync-tasks', data),
  getClientDeliverablesSummary: (params) => api.get('/smm/tracker/client-deliverables-summary', { params }),
};

