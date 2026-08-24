// =============================================
// LEAD QUERY HOOKS - TanStack Query
// =============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

// Fetch all leads
export const useLeads = (filters = {}) => {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const response = await api.get('/leads', { params: filters });
      return response.data.leads;
    },
  });
};

// Fetch leads in Kanban view
export const useLeadsKanban = () => {
  return useQuery({
    queryKey: ['leads-kanban'],
    queryFn: async () => {
      const response = await api.get('/leads/kanban');
      return response.data.kanban;
    },
  });
};

// Fetch single lead
export const useLead = (id) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/leads/${id}`);
      return response.data.lead;
    },
    enabled: !!id,
  });
};

// Create lead mutation
export const useCreateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/leads', data);
      return response.data.lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
      toast.success('Lead created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create lead');
    },
  });
};

// Update lead mutation
export const useUpdateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/leads/${id}`, data);
      return response.data.lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['lead', data._id] });
      toast.success('Lead updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update lead');
    },
  });
};

// Delete lead mutation
export const useDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
      toast.success('Lead deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete lead');
    },
  });
};

// Update lead stage mutation
export const useUpdateLeadStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stage }) => {
      const response = await api.patch(`/leads/${id}/stage`, { stage });
      return response.data.lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update lead stage');
    },
  });
};

export const useAddLeadActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.post(`/leads/${id}/activity`, data);
      return response.data.lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['lead', data._id] });
      toast.success('Lead note added');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add lead note');
    },
  });
};
