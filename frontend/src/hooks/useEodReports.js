import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

export const useEodReports = (days = 7, params = {}, options = {}) => {
  // Support overload where options is 2nd argument
  const queryParams = typeof params === 'object' && !params.enabled && !params.staleTime ? params : {};
  const queryOptions = typeof params === 'object' && (params.enabled !== undefined || params.staleTime !== undefined) ? params : options;

  return useQuery({
    queryKey: ['eod-reports', days, queryParams],
    queryFn: async () => {
      const response = await api.get('/attendance/eod-reports', {
        params: { days, ...queryParams },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
    ...queryOptions,
  });
};

export const useSubmitEod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/attendance/eod', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('EOD report submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['eod-reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['portal'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit EOD report');
    },
  });
};
