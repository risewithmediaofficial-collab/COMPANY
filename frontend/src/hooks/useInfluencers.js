import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

export const useInfluencers = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['influencers', params],
    queryFn: async () => {
      const response = await api.get('/influencers', { params });
      return response.data?.influencers || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useInfluencerSummary = (options = {}) => {
  return useQuery({
    queryKey: ['influencer-summary'],
    queryFn: async () => {
      const response = await api.get('/influencers/summary');
      return response.data?.summary || {};
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useCreateInfluencer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/influencers', data);
      return response.data.influencer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      queryClient.invalidateQueries({ queryKey: ['influencer-summary'] });
      toast.success('Influencer added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add influencer');
    },
  });
};

export const useUpdateInfluencer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/influencers/${id}`, data);
      return response.data.influencer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      queryClient.invalidateQueries({ queryKey: ['influencer-summary'] });
      toast.success('Influencer updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update influencer');
    },
  });
};

export const useDeleteInfluencer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/influencers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      queryClient.invalidateQueries({ queryKey: ['influencer-summary'] });
      toast.success('Influencer record deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete influencer');
    },
  });
};
