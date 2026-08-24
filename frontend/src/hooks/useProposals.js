import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

export const useProposals = (filters = {}) => {
  return useQuery({
    queryKey: ['proposals', filters],
    queryFn: async () => {
      const response = await api.get('/proposals', { params: filters });
      return response.data.proposals || [];
    },
  });
};

export const useProposal = (id) => {
  return useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/proposals/${id}`);
      return response.data.proposal;
    },
    enabled: !!id,
  });
};

export const useClientProposals = (clientId) => {
  return useQuery({
    queryKey: ['proposals', 'client', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const response = await api.get(`/proposals/client/${clientId}`);
      return response.data.proposals || [];
    },
    enabled: !!clientId,
  });
};

export const useAcceptedProposals = (clientId) => {
  return useQuery({
    queryKey: ['proposals', 'accepted', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const response = await api.get(`/proposals/client/${clientId}/accepted`);
      return response.data.proposals || [];
    },
    enabled: !!clientId,
  });
};

export const useCreateProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/proposals', data);
      return response.data.proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal created successfully');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to create proposal'),
  });
};

export const useUpdateProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/proposals/${id}`, data);
      return response.data.proposal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', data._id] });
      toast.success('Proposal updated successfully');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update proposal'),
  });
};

export const useAcceptProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/proposals/${id}/accept`);
      return response.data.proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal accepted');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to accept proposal'),
  });
};

export const useRejectProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/proposals/${id}/reject`);
      return response.data.proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal rejected');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to reject proposal'),
  });
};

export const useDeleteProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/proposals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal deleted');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete proposal'),
  });
};
