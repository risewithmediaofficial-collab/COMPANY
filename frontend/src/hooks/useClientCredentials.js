import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';

export const credentialTypes = [
  { value: 'password', label: 'Password' },
  { value: 'email', label: 'Email' },
  { value: 'api_key', label: 'API Key' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'database', label: 'Database' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'payment_gateway', label: 'Payment Gateway' },
  { value: 'other', label: 'Other' },
];

export const useCredentialsVault = (filters = {}) => {
  return useQuery({
    queryKey: ['credentials-vault', filters],
    queryFn: async () => {
      const response = await api.get('/credentials', { params: filters });
      return response.data.credentials;
    },
    staleTime: 60 * 1000,
  });
};

export const useCredential = (id) => {
  return useQuery({
    queryKey: ['credential', id],
    queryFn: async () => {
      const response = await api.get(`/credentials/${id}`);
      return response.data.credential;
    },
    enabled: Boolean(id),
  });
};

export const useCreateCredential = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (arg) => {
      const clientId = arg?.clientId || arg?.data?.clientId;
      const requestData = arg?.data ? arg.data : arg;
      const response = await api.post(`/credentials/clients/${clientId}`, requestData);
      return response.data.credential;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials-vault'] });
      toast.success('Credential saved');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save credential');
    },
  });
};

export const useUpdateCredential = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/credentials/${id}`, data);
      return response.data.credential;
    },
    onSuccess: (credential) => {
      queryClient.invalidateQueries({ queryKey: ['credentials-vault'] });
      queryClient.invalidateQueries({ queryKey: ['credential', credential._id] });
      toast.success('Credential updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update credential');
    },
  });
};

export const useDeleteCredential = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/credentials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials-vault'] });
      toast.success('Credential removed');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove credential');
    },
  });
};
