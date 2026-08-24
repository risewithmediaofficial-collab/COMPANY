// =============================================
// CLIENT QUERY HOOKS - TanStack Query
// =============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

export const useClients = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const response = await api.get('/clients', { params: filters });
      return response.data.clients;
    },
    ...options,
  });
};

export const useClient = (id) => {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/clients/${id}`);
      return response.data.client;
    },
    enabled: !!id,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/clients', data);
      return response.data.client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create client');
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/clients/${id}`, data);
      return response.data.client;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', data._id] });
      toast.success('Client updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update client');
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete client');
    },
  });
};
