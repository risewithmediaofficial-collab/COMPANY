import api from './index';

export const smmApi = {
  // Dashboard
  getDashboardStats: (params) => api.get('/smm/dashboard/stats', { params }),

  // Clients
  getClients: (params) => api.get('/smm/clients', { params }),
  getClient: (id) => api.get(`/smm/clients/${id}`),
  createClient: (data) => api.post('/smm/clients', data),
  updateClient: (id, data) => api.put(`/smm/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/smm/clients/${id}`),

  // Projects
  getProjects: (params) => api.get('/smm/projects', { params }),
  getProject: (id) => api.get(`/smm/projects/${id}`),
  createProject: (data) => api.post('/smm/projects', data),
  updateProject: (id, data) => api.put(`/smm/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/smm/projects/${id}`),

  // Campaigns
  getCampaigns: (params) => api.get('/smm/campaigns', { params }),
  getCampaign: (id) => api.get(`/smm/campaigns/${id}`),
  createCampaign: (data) => api.post('/smm/campaigns', data),
  updateCampaign: (id, data) => api.put(`/smm/campaigns/${id}`, data),
  updatePerformance: (id, data) => api.patch(`/smm/campaigns/${id}/performance`, data),
  deleteCampaign: (id) => api.delete(`/smm/campaigns/${id}`),
  bulkUpdateCampaignStatus: (data) => api.put('/smm/campaigns/bulk-status', data),

  // Ad Sets
  getAdSets: (params) => api.get('/smm/adsets', { params }),
  getAdSet: (id) => api.get(`/smm/adsets/${id}`),
  createAdSet: (data) => api.post('/smm/adsets', data),
  updateAdSet: (id, data) => api.put(`/smm/adsets/${id}`, data),
  deleteAdSet: (id) => api.delete(`/smm/adsets/${id}`),

  // Ads
  getAds: (params) => api.get('/smm/ads', { params }),
  getAd: (id) => api.get(`/smm/ads/${id}`),
  createAd: (data) => api.post('/smm/ads', data),
  updateAd: (id, data) => api.put(`/smm/ads/${id}`, data),
  updateAdApproval: (id, data) => api.patch(`/smm/ads/${id}/approval`, data),
  updateAdPerformance: (id, data) => api.patch(`/smm/ads/${id}/performance`, data),
  deleteAd: (id) => api.delete(`/smm/ads/${id}`),

  // Creatives
  getCreatives: (params) => api.get('/smm/creatives', { params }),
  createCreative: (data) => api.post('/smm/creatives', data),
  updateCreative: (id, data) => api.put(`/smm/creatives/${id}`, data),
  deleteCreative: (id) => api.delete(`/smm/creatives/${id}`),

  // Tasks
  getTasks: (params) => api.get('/smm/tasks', { params }),
  createTask: (data) => api.post('/smm/tasks', data),
  updateTask: (id, data) => api.put(`/smm/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/smm/tasks/${id}`),
  addTaskComment: (id, data) => api.post(`/smm/tasks/${id}/comments`, data),

  // Notes
  getNotes: (params) => api.get('/smm/notes', { params }),
  createNote: (data) => api.post('/smm/notes', data),
  deleteNote: (id) => api.delete(`/smm/notes/${id}`),
};
