// =============================================
// TASK QUERY HOOKS - TanStack Query
// =============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

export const useTasks = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const response = await api.get('/tasks', { params: filters });
      return response.data.tasks;
    },
    ...options,
  });
};

export const useTask = (id) => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/tasks/${id}`);
      return response.data.task;
    },
    enabled: !!id,
    retry: false,
  });
};

export const useTaskCalendar = (filters = {}) => {
  return useQuery({
    queryKey: ['task-calendar', filters],
    queryFn: async () => {
      const response = await api.get('/tasks/calendar', { params: filters });
      return response.data;
    },
  });
};

export const useWeeklyTaskReport = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['task-weekly-report', filters],
    queryFn: async () => {
      const response = await api.get('/tasks/weekly-report', { params: filters });
      return response.data;
    },
    ...options,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/tasks', data);
      return response.data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
      toast.success('Task created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create task');
    },
  });
};

export const useCreateDailyTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/tasks/daily', data);
      return response.data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['task-weekly-report'] });
      toast.success('Daily task saved');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save daily task');
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/tasks/${id}`, data);
      return response.data.task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['task', data._id] });
      toast.success('Task updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update task');
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
      toast.success('Task deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete task');
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.patch(`/tasks/${id}/status`, { status });
      return response.data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update task status');
    },
  });
};

export const useAddTaskAttachments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, attachments }) => {
      const response = await api.post(`/tasks/${id}/attachments`, { attachments });
      return response.data.task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['task', data._id] });
      toast.success('Attachments uploaded successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload attachments');
    },
  });
};

export const useAddCompletedFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completedFiles }) => {
      const response = await api.post(`/tasks/${id}/completed-files`, { completedFiles });
      return response.data.task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['task', data._id] });
      toast.success('Completed files uploaded successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload completed files');
    },
  });
};

export const useAddProgressUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.post(`/tasks/${id}/progress`, data);
      return response.data.task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['task', data._id] });
      queryClient.invalidateQueries({ queryKey: ['task-weekly-report'] });
      toast.success('Progress updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update progress');
    },
  });
};

export const useTaskResponse = (id) => {
  return useQuery({
    queryKey: ['task-response', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/tasks/${id}/response`);
      return response.data.response;
    },
    enabled: !!id,
  });
};

export const useSubmitClientTaskResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.post(`/tasks/${id}/client-response`, data);
      return response.data.task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['task', data._id] });
      queryClient.invalidateQueries({ queryKey: ['task-response', data._id] });
      queryClient.invalidateQueries({ queryKey: ['portal-tasks'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit task response');
    },
  });
};

export const useLogTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.post(`/tasks/${id}/log-time`, data);
      return response.data.task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['task', data._id] });
      toast.success('Time logged successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to log time');
    },
  });
};
