// =============================================
// WEEKLY TODOS HOOK - React Query Hooks
// Weekly todos for managers, admins, employees & interns
// =============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

/**
 * Fetch weekly todos with optional filters:
 * - weekStartDate (e.g. '2026-10-12')
 * - assignedTo (user ID or 'all')
 * - mine (boolean string)
 * - status ('all', 'pending', 'completed')
 * - dayOfWeek ('Monday', 'Tuesday', ...)
 */
export const useWeeklyTodos = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['weekly-todos', params],
    queryFn: async () => {
      const res = await api.get('/todos', { params });
      return res.data || { todos: [], summary: { total: 0, completed: 0, pending: 0, completionRate: 0 } };
    },
    staleTime: 1000 * 30, // 30 seconds fresh
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * Create a new weekly todo
 */
export const useCreateWeeklyTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/todos', payload);
      return res.data.todo;
    },
    onSuccess: (newTodo) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-todos'] });
      toast.success('Weekly todo created!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create weekly todo');
    },
  });
};

/**
 * Update an existing weekly todo
 */
export const useUpdateWeeklyTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/todos/${id}`, data);
      return res.data.todo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-todos'] });
      toast.success('Todo updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update todo');
    },
  });
};

/**
 * Quick toggle completion status
 */
export const useToggleWeeklyTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/todos/${id}/toggle`);
      return res.data.todo;
    },
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['weekly-todos'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['weekly-todos'] });

      queryClient.setQueriesData({ queryKey: ['weekly-todos'] }, (old) => {
        if (!old || !old.todos) return old;
        const updatedTodos = old.todos.map((t) =>
          t._id === id
            ? { ...t, isCompleted: !t.isCompleted, status: !t.isCompleted ? 'completed' : 'pending' }
            : t
        );
        const total = updatedTodos.length;
        const completed = updatedTodos.filter((t) => t.isCompleted).length;
        return {
          ...old,
          todos: updatedTodos,
          summary: {
            total,
            completed,
            pending: total - completed,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          },
        };
      });

      return { previousData };
    },
    onError: (err, id, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(err.response?.data?.message || 'Failed to update completion status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-todos'] });
    },
  });
};

/**
 * Delete a weekly todo
 */
export const useDeleteWeeklyTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/todos/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-todos'] });
      toast.success('Weekly todo deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete todo');
    },
  });
};
