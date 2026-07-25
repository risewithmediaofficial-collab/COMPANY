import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

// Dashboard & Feeds
export const useDMDashboardSummary = (options = {}) => {
  return useQuery({
    queryKey: ['dm-dashboard-summary'],
    queryFn: async () => {
      const response = await api.get('/dm-calendar/dashboard');
      return response.data?.summary || {};
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useDMMasterCalendar = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['dm-master-events', params],
    queryFn: async () => {
      const response = await api.get('/dm-calendar/master-events', { params });
      return response.data?.events || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useDMClientPerformance = (options = {}) => {
  return useQuery({
    queryKey: ['dm-client-performance'],
    queryFn: async () => {
      const response = await api.get('/dm-calendar/client-performance');
      return response.data?.performance || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useDMTeamPerformance = (options = {}) => {
  return useQuery({
    queryKey: ['dm-team-performance'],
    queryFn: async () => {
      const response = await api.get('/dm-calendar/team-performance');
      return response.data?.performance || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useDMAuditLogs = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['dm-audit-logs', params],
    queryFn: async () => {
      const response = await api.get('/dm-calendar/audit-logs', { params });
      return response.data?.logs || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

// =============================================
// VIDEO SHOOTS
// =============================================

export const useVideoShoots = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['dm-video-shoots', params],
    queryFn: async () => {
      const response = await api.get('/dm-calendar/video-shoots', { params });
      return response.data?.shoots || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useCreateVideoShoot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/dm-calendar/video-shoots', data);
      return response.data.shoot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-video-shoots'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dm-client-performance'] });
      queryClient.invalidateQueries({ queryKey: ['dm-team-performance'] });
      toast.success('Video shoot scheduled successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create video shoot');
    },
  });
};

export const useUpdateVideoShoot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/dm-calendar/video-shoots/${id}`, data);
      return response.data.shoot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-video-shoots'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dm-client-performance'] });
      queryClient.invalidateQueries({ queryKey: ['dm-team-performance'] });
      toast.success('Video shoot updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update video shoot');
    },
  });
};

export const useDeleteVideoShoot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/dm-calendar/video-shoots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-video-shoots'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dm-client-performance'] });
      queryClient.invalidateQueries({ queryKey: ['dm-team-performance'] });
      toast.success('Video shoot deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete video shoot');
    },
  });
};

export const useTrackVideoShootTime = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => {
      const response = await api.patch(`/dm-calendar/video-shoots/${id}/time-tracking`, { action });
      return response.data.shoot;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dm-video-shoots'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      toast.success(`Shoot ${variables.action === 'start' ? 'started' : 'ended'} successfully!`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update time tracking');
    },
  });
};

// =============================================
// RJ PROMOTIONS
// =============================================

export const useRjPromotions = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['dm-rj-promotions', params],
    queryFn: async () => {
      const response = await api.get('/dm-calendar/rj-promotions', { params });
      return response.data?.promotions || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useCreateRjPromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/dm-calendar/rj-promotions', data);
      return response.data.promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-rj-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dm-client-performance'] });
      queryClient.invalidateQueries({ queryKey: ['dm-team-performance'] });
      toast.success('RJ Promotion scheduled successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create RJ promotion');
    },
  });
};

export const useUpdateRjPromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/dm-calendar/rj-promotions/${id}`, data);
      return response.data.promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-rj-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dm-client-performance'] });
      queryClient.invalidateQueries({ queryKey: ['dm-team-performance'] });
      toast.success('RJ Promotion updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update RJ promotion');
    },
  });
};

export const useDeleteRjPromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/dm-calendar/rj-promotions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-rj-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dm-client-performance'] });
      queryClient.invalidateQueries({ queryKey: ['dm-team-performance'] });
      toast.success('RJ Promotion deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete RJ promotion');
    },
  });
};

// =============================================
// VJ PROMOTIONS
// =============================================

export const useVjPromotions = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['dm-vj-promotions', params],
    queryFn: async () => {
      const response = await api.get('/dm-calendar/vj-promotions', { params });
      return response.data?.promotions || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useCreateVjPromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/dm-calendar/vj-promotions', data);
      return response.data.promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-vj-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dm-client-performance'] });
      queryClient.invalidateQueries({ queryKey: ['dm-team-performance'] });
      toast.success('VJ Promotion scheduled successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create VJ promotion');
    },
  });
};

export const useUpdateVjPromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/dm-calendar/vj-promotions/${id}`, data);
      return response.data.promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-vj-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dm-client-performance'] });
      queryClient.invalidateQueries({ queryKey: ['dm-team-performance'] });
      toast.success('VJ Promotion updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update VJ promotion');
    },
  });
};

export const useDeleteVjPromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/dm-calendar/vj-promotions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-vj-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['dm-master-events'] });
      queryClient.invalidateQueries({ queryKey: ['dm-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dm-client-performance'] });
      queryClient.invalidateQueries({ queryKey: ['dm-team-performance'] });
      toast.success('VJ Promotion deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete VJ promotion');
    },
  });
};
