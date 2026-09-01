import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';

export const useClientFollowups = (filters = {}) => {
  return useQuery({
    queryKey: ['client-followups', filters],
    queryFn: async () => {
      const response = await api.get('/client-followups', { params: filters });
      return response.data.followups || [];
    },
    staleTime: 60 * 1000,
  });
};

export const useCreateClientFollowup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/client-followups', data);
      return response.data.followup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-followups'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Follow-up saved');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save follow-up');
    },
  });
};

export const useUpdateClientFollowup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { id, data, ...rest } = payload;
      const body = data !== undefined ? data : rest;
      const response = await api.put(`/client-followups/${id}`, body);
      return response.data.followup;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['client-followups'] });
      const previousFollowups = queryClient.getQueryData(['client-followups']) || [];

      const { id, data, ...rest } = payload;
      const updates = data !== undefined ? data : rest;

      queryClient.setQueriesData({ queryKey: ['client-followups'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((item) => (item._id === id ? { ...item, ...updates } : item));
      });

      return { previousFollowups };
    },
    onError: (error, variables, context) => {
      if (context?.previousFollowups) {
        queryClient.setQueriesData({ queryKey: ['client-followups'] }, context.previousFollowups);
      }
      toast.error(error.response?.data?.message || 'Failed to update follow-up');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['client-followups'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onSuccess: () => {
      toast.success('Follow-up updated');
    },
  });
};

export const useDeleteClientFollowup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/client-followups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-followups'] });
      toast.success('Follow-up deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete follow-up');
    },
  });
};
