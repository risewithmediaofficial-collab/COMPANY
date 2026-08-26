// =============================================
// SALARY & PAYROLL HOOKS - TanStack Query
// =============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

/**
 * Fetch all salary entries
 */
export const useSalaries = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['salaries', filters],
    queryFn: async () => {
      const response = await api.get('/finance/salaries', { params: filters });
      return response.data?.salaries || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch salary / payroll summary analytics
 */
export const useSalarySummary = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['salary-summary', filters],
    queryFn: async () => {
      const response = await api.get('/finance/salaries/summary', { params: filters });
      return response.data?.summary || {};
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch single salary record
 */
export const useSalary = (id, options = {}) => {
  return useQuery({
    queryKey: ['salary', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/finance/salaries/${id}`);
      return response.data?.salary || null;
    },
    enabled: Boolean(id),
    ...options,
  });
};

/**
 * Create salary record
 */
export const useCreateSalary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/salaries', data);
      return response.data?.salary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Employee salary record created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create salary record');
    },
  });
};

/**
 * Update salary record
 */
export const useUpdateSalary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/salaries/${id}`, data);
      return response.data?.salary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      queryClient.invalidateQueries({ queryKey: ['salary', data?._id] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Salary breakdown updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update salary record');
    },
  });
};

/**
 * Quick status update (e.g. mark as Paid)
 */
export const useUpdateSalaryStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, paymentMethod, transactionReference, paymentDate }) => {
      const response = await api.patch(`/finance/salaries/${id}/status`, {
        status,
        paymentMethod,
        transactionReference,
        paymentDate,
      });
      return response.data?.salary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Salary status updated!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update salary status');
    },
  });
};

/**
 * Delete salary record
 */
export const useDeleteSalary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/salaries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Salary record removed');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete salary record');
    },
  });
};

/**
 * Generate monthly payroll batch
 */
export const useGenerateMonthlyPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year }) => {
      const response = await api.post('/finance/salaries/generate-monthly', { month, year });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      toast.success(data?.message || 'Monthly payroll generated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to generate monthly payroll');
    },
  });
};
