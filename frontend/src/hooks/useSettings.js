import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';

export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/settings');
      return response.data;
    },
  });
};

export const useUpdateProfileSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/settings/profile', data);
      return response.data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Profile updated');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update profile'),
  });
};

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/settings/company', data);
      return response.data.settings?.companyProfile || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Company details saved');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to save company details'),
  });
};

export const useUploadProfileAvatar = () => {
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to upload profile picture'),
  });
};

export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/settings/preferences', data);
      return response.data.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Preferences saved');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to save preferences'),
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/auth/change-password', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Password changed successfully');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to change password'),
  });
};
