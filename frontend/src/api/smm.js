import api from './index';

export const smmApi = {
  // Dashboard Command Center
  getDashboardStats: (params) => api.get('/smm/dashboard/stats', { params }),

  // Clients & Projects
  getClients: (params) => api.get('/smm/clients', { params }),
  getClient: (id) => api.get(`/smm/clients/${id}`),
  getProjects: (params) => api.get('/smm/projects', { params }),
  getProject: (id) => api.get(`/smm/projects/${id}`),

  // Central Video & Content Object
  getContents: (params) => api.get('/smm/content', { params }),
  getContentById: (id) => api.get(`/smm/content/${id}`),
  getPublishedContentForAd: (params) => api.get('/smm/content/published-for-ad', { params }),
  createContent: (data) => api.post('/smm/content', data),
  updateContent: (id, data) => api.put(`/smm/content/${id}`, data),
  updateContentPerformance: (id, data) => api.patch(`/smm/content/${id}/performance`, data),
  deleteContent: (id) => api.delete(`/smm/content/${id}`),

  // Campaigns & Budget Ledger
  getCampaigns: (params) => api.get('/smm/campaigns', { params }),
  getCampaign: (id) => api.get(`/smm/campaigns/${id}`),
  createCampaign: (data) => api.post('/smm/campaigns', data),
  updateCampaign: (id, data) => api.put(`/smm/campaigns/${id}`, data),
  updatePerformance: (id, data) => api.patch(`/smm/campaigns/${id}/performance`, data),
  deleteCampaign: (id) => api.delete(`/smm/campaigns/${id}`),
  bulkUpdateCampaignStatus: (data) => api.put('/smm/campaigns/bulk-status', data),
  addDailyLog: (campaignId, data) => api.post(`/smm/campaigns/${campaignId}/daily-log`, data),
  deleteDailyLog: (campaignId, logId) => api.delete(`/smm/campaigns/${campaignId}/daily-log/${logId}`),

  // Daily Ad Spend & Cash Ledger Logging
  getAdSpendLogs: (params) => api.get('/smm/ad-spend', { params }),
  addAdSpendLog: (data) => api.post('/smm/ad-spend', data),
  deleteAdSpendLog: (id) => api.delete(`/smm/ad-spend/${id}`),

  // Daily Tracking & Social Media Reports
  getDailyReports: (params) => api.get('/smm/daily-reports', { params }),
  getDailyReportByDate: (params) => api.get('/smm/daily-reports/by-date', { params }),
  saveDailyReport: (data) => api.post('/smm/daily-reports', data),

  // Leads Tracking
  getLeads: (params) => api.get('/smm/leads', { params }),
  getLeadStats: (params) => api.get('/smm/leads/stats', { params }),
  createLead: (data) => api.post('/smm/leads', data),
  updateLead: (id, data) => api.put(`/smm/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/smm/leads/${id}`),

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

  // Tasks & Notes
  getTasks: (params) => api.get('/smm/tasks', { params }),
  createTask: (data) => api.post('/smm/tasks', data),
  updateTask: (id, data) => api.put(`/smm/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/smm/tasks/${id}`),
  getNotes: (params) => api.get('/smm/notes', { params }),
  createNote: (data) => api.post('/smm/notes', data),
  deleteNote: (id) => api.delete(`/smm/notes/${id}`),
};
