import api from './index';

export const devApi = {
  // Dashboard & Tasks
  getDashboard: () => api.get('/development/dashboard'),
  getTasks: (params) => api.get('/development/tasks', { params }),
  getTask: (id) => api.get(`/development/tasks/${id}`),
  createTask: (data) => api.post('/development/tasks', data),
  updateTask: (id, data) => api.put(`/development/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/development/tasks/${id}`),

  // Pipeline transitions & reviews
  updateStage: (id, data) => api.patch(`/development/tasks/${id}/stage`, data),
  submitReview: (id, data) => api.patch(`/development/tasks/${id}/review`, data),
  submitQA: (id, data) => api.patch(`/development/tasks/${id}/qa`, data),
  toggleBlocked: (id, data) => api.patch(`/development/tasks/${id}/blocked`, data),
  updateMetadata: (id, data) => api.patch(`/development/tasks/${id}/metadata`, data),
  updateChecklist: (id, data) => api.patch(`/development/tasks/${id}/checklist`, data),
  addComment: (id, data) => api.post(`/development/tasks/${id}/comments`, data),

  // Sprints
  getSprints: () => api.get('/development/sprints'),
  createSprint: (data) => api.post('/development/sprints', data),
  updateSprint: (id, data) => api.put(`/development/sprints/${id}`, data),
  deleteSprint: (id) => api.delete(`/development/sprints/${id}`),

  // Releases
  getReleases: () => api.get('/development/releases'),
  createRelease: (data) => api.post('/development/releases', data),
  updateRelease: (id, data) => api.put(`/development/releases/${id}`, data),
  deleteRelease: (id) => api.delete(`/development/releases/${id}`),
};

export default devApi;
