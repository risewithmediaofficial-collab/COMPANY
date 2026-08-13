import { useQuery } from '@tanstack/react-query';
import api from '../api';

export const useAdminReport = (params = {}) => {
  return useQuery({
    queryKey: ['reports', 'admin', params],
    queryFn: async () => {
      const response = await api.get('/reports/admin', { params });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useMonthlyEmployeeReport = (filters = {}) => {
  return useQuery({
    queryKey: ['reports', 'monthly-employee', filters],
    queryFn: async () => {
      const response = await api.get('/reports/monthly-employee-summary', { params: filters });
      return response.data;
    },
    staleTime: 1 * 60 * 1000,
  });
};
