import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export const useProjectMonthlyDeliverables = (projectId, month, year) => {
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();

  return useQuery({
    queryKey: ['monthly-deliverables', projectId, m, y],
    queryFn: async () => {
      if (!projectId) return { deliverables: [], totalTargets: 0, totalCurrent: 0 };
      const { data } = await api.get(`/projects/${projectId}/monthly-deliverables?month=${m}&year=${y}`);
      return data;
    },
    enabled: Boolean(projectId),
    staleTime: 5000,
  });
};

export const useSaveProjectMonthlyDeliverable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, ...payload }) => {
      const { data } = await api.post(`/projects/${projectId}/monthly-deliverables`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-deliverables', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
};

export const useBatchSaveProjectMonthlyDeliverables = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, ...payload }) => {
      const { data } = await api.post(`/projects/${projectId}/monthly-deliverables/batch`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-deliverables', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
};

export const useDeleteProjectMonthlyDeliverable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, targetId }) => {
      const { data } = await api.delete(`/projects/${projectId}/monthly-deliverables/${targetId}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-deliverables', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId] });
    },
  });
};

export const useCheckDeliverableQuota = (projectId, contentType, taskType, date) => {
  return useQuery({
    queryKey: ['deliverable-quota', projectId, contentType, taskType, date],
    queryFn: async () => {
      if (!projectId || (!contentType && !taskType)) return { hasTarget: false };
      const params = new URLSearchParams();
      if (contentType) params.append('contentType', contentType);
      if (taskType) params.append('taskType', taskType);
      if (date) params.append('date', date);

      const { data } = await api.get(`/projects/${projectId}/monthly-deliverables/check-quota?${params.toString()}`);
      return data;
    },
    enabled: Boolean(projectId && (contentType || taskType)),
    staleTime: 2000,
  });
};
