import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

export const useDailyTasks = (date, userId) => {
  return useQuery({
    queryKey: ['daily-tasks', date, userId],
    queryFn: async () => {
      const params = {};
      if (date) params.date = date;
      if (userId && userId !== 'all') params.userId = userId;
      const res = await api.get('/daily-tasks', { params });
      return res.data;
    },
    refetchInterval: 15000, // Poll every 15s to keep live timers and team progress synced
  });
};

export const useAssignableTasks = (date, userId, enabled = true) => {
  return useQuery({
    queryKey: ['daily-tasks-assignable', date, userId],
    queryFn: async () => {
      const params = {};
      if (date) params.date = date;
      if (userId && userId !== 'all') params.userId = userId;
      const res = await api.get('/daily-tasks/assignable-tasks', { params });
      return res.data;
    },
    enabled: Boolean(enabled),
  });
};

export const useAddDailyTaskFromAssigned = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, userId, date, notes }) => {
      const res = await api.post('/daily-tasks/from-assigned', {
        taskId,
        userId,
        date,
        notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-tasks-assignable'] });
      toast.success('Task added to Daily Tasks');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to add task to daily tasks');
    },
  });
};

export const useCreateQuickDailyTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/daily-tasks/quick', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      toast.success('Quick daily task created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create quick daily task');
    },
  });
};

export const useStartDailyTaskTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/daily-tasks/${id}/start-timer`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task started with live timer');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to start timer');
    },
  });
};

export const useStopDailyTaskTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/daily-tasks/${id}/stop-timer`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Timer paused');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to pause timer');
    },
  });
};

export const useUpdateDailyTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/daily-tasks/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(data?.message || 'Task status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });
};

export const useDeleteDailyTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/daily-tasks/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-tasks-assignable'] });
      toast.success('Removed from Daily Tasks');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to remove daily task');
    },
  });
};
