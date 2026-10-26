// =============================================
// CONTENT PRODUCTION API CLIENT
// =============================================

import api from './index';

export const contentProductionApi = {
  // Central listing with filters & pagination
  list: (params) => api.get('/content-production', { params }),

  // Single content record by ID or contentId
  getById: (id) => api.get(`/content-production/${id}`),

  // Create new content production record
  create: (data) => api.post('/content-production', data),

  // Update top-level content details
  update: (id, data) => api.put(`/content-production/${id}`, data),

  // Update specific team stage (scriptwriter, videographer, videoEditor, smm)
  updateStage: (id, stageName, data) =>
    api.patch(`/content-production/${id}/stage/${stageName}`, data),

  // Fetch saved scripts and reference videos filtered by client/content
  getScriptsAndReferences: (params) =>
    api.get('/content-production/scripts-and-references', { params }),

  // Submit revision request
  addRevision: (id, data) => api.post(`/content-production/${id}/revisions`, data),

  // Soft delete content record
  delete: (id) => api.delete(`/content-production/${id}`),
};

export default contentProductionApi;
