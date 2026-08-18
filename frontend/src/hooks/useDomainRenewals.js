import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';

export const renewalTypeOptions = [
  { value: 'domain', label: 'Domain' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'ssl', label: 'SSL' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'other', label: 'Other' },
];

export const renewalStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'renewed', label: 'Renewed' },
  { value: 'expired', label: 'Expired' },
];

export const useDomainRenewals = (filters = {}) => useQuery({
  queryKey: ['domain-renewals', filters],
  queryFn: async () => {
    const response = await api.get('/domain-renewals', { params: filters });
    return response.data?.records || (Array.isArray(response.data) ? response.data : []);
  },
  staleTime: 60 * 1000,
});

export const useCreateDomainRenewal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/domain-renewals', data);
      return response.data.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-renewals'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Renewal record saved');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save renewal record');
    },
  });
};

export const useUpdateDomainRenewal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/domain-renewals/${id}`, data);
      return response.data.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-renewals'] });
      toast.success('Renewal record updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update renewal record');
    },
  });
};

export const useAddDomainRenewalProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.post(`/domain-renewals/${id}/progress`, data);
      return response.data.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-renewals'] });
      toast.success('Progress note added');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add progress note');
    },
  });
};

export const useDeleteDomainRenewal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/domain-renewals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-renewals'] });
      toast.success('Renewal record deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete renewal record');
    },
  });
};
