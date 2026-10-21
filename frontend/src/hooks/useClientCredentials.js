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
      try {
        const response = await api.get('/credentials', { params: filters });
        return response.data?.credentials || [];
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to load credentials vault';
        toast.error(message);
        return [];
      }
    },
    staleTime: 60 * 1000,
    retry: 1,
  });
};

export const useCredential = (id) => {
  return useQuery({
    queryKey: ['credential', id],
    queryFn: async () => {
      try {
        const response = await api.get(`/credentials/${id}`);
        return response.data?.credential || null;
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to decrypt credential';
        toast.error(message);
        return null;
      }
    },
    enabled: Boolean(id),
    retry: false,
  });
};

export const useCreateCredential = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (arg) => {
      const clientId = arg?.clientId || arg?.data?.clientId;
      if (!clientId) {
        throw new Error('Please select a client for this credential');
      }
      const requestData = arg?.data ? arg.data : arg;
      const response = await api.post(`/credentials/clients/${clientId}`, requestData);
      return response.data.credential;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials-vault'] });
      toast.success('Credential stored securely');
    },
    onError: (error) => {
      const message = error.response?.data?.message || error.message || 'Failed to save credential';
      toast.error(message);
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
      toast.success('Credential updated successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || error.message || 'Failed to update credential';
      toast.error(message);
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
      const message = error.response?.data?.message || error.message || 'Failed to remove credential';
      toast.error(message);
    },
  });
};
