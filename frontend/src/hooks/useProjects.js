// =============================================
// PROJECT QUERY HOOKS - TanStack Query
// =============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

export const useProjects = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const response = await api.get('/projects', { params: filters });
      return response.data.projects;
    },
    ...options,
  });
};

export const useProject = (id) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/projects/${id}`);
      return response.data.project;
    },
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/projects', data);
      return response.data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create project');
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/projects/${id}`, data);
      return response.data.project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data._id] });
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update project');
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    },
  });
};
