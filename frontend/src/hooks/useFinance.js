// =============================================
// FINANCE QUERY HOOKS - TanStack Query
// =============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

// Finance entries
export const useFinanceEntries = (filters = {}) => {
  return useQuery({
    queryKey: ['finance-entries', filters],
    queryFn: async () => {
      const response = await api.get('/finance', { params: filters });
      return response.data?.entries || response.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useFinance = useFinanceEntries;

export const useFinanceRecords = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-records', filters],
    queryFn: async () => {
      const response = await api.get('/finance/records', { params: filters });
      return response.data?.records || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useFinanceRecord = (id) => {
  return useQuery({
    queryKey: ['finance-record', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/finance/records/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateFinanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/records', data);
      return response.data.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-records'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Finance record created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create finance record');
    },
  });
};

export const useUpdateFinanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/records/${id}`, data);
      return response.data.record;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['finance-records'] });
      queryClient.invalidateQueries({ queryKey: ['finance-record', data?._id] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Finance record updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update finance record');
    },
  });
};

export const useDeleteFinanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-records'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Finance record deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete finance record');
    },
  });
};

export const useAddPaymentNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.post(`/finance/records/${id}/payment-notes`, data);
      return response.data.note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-records'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['portal-finance'] });
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      toast.success('Payment note added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add payment note');
    },
  });
};

export const useAddInternalFinanceNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.post(`/finance/records/${id}/internal-notes`, data);
      return response.data.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-records'] });
      toast.success('Follow-up note added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add follow-up note');
    },
  });
};

export const useOverdueFinanceRecords = (options = {}) => {
  return useQuery({
    queryKey: ['finance-overdue'],
    queryFn: async () => {
      const response = await api.get('/finance/records/overdue/list');
      return response.data?.records || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateFinanceEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance', data);
      return response.data.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Finance entry created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create finance entry');
    },
  });
};

export const useUpdateFinanceEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/${id}`, data);
      return response.data.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Finance entry updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update finance entry');
    },
  });
};

export const useDeleteFinanceEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-entries'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Finance entry deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete finance entry');
    },
  });
};

// Invoices
export const useInvoices = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const response = await api.get('/finance/invoices', { params: filters });
      return response.data?.invoices || response.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/invoices', data);
      return response.data.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Invoice created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/invoices/${id}`, data);
      return response.data.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Invoice updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update invoice');
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Invoice deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete invoice');
    },
  });
};

export const useMarkInvoicePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data = {} }) => {
      const response = await api.post(`/finance/invoices/${id}/mark-paid`, data);
      return response.data.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Invoice marked as paid');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to mark invoice paid');
    },
  });
};

export const useSendInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/finance/invoices/${id}/send`);
      return response.data.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      toast.success('Invoice sent successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send invoice');
    },
  });
};

export const useAddPartialPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.post(`/finance/invoices/${id}/partial-payment`, data);
      return response.data.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance-records'] });
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      toast.success('Partial payment added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add partial payment');
    },
  });
};

export const usePayments = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => {
      const response = await api.get('/finance/payments', { params: filters });
      return response.data?.payments || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useCallHistory = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['call-history', filters],
    queryFn: async () => {
      const response = await api.get('/finance/call-history', { params: filters });
      return response.data?.calls || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useCreateCallHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/call-history', data);
      return response.data.call;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-history'] });
      toast.success('Call history added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add call history');
    },
  });
};

export const useUpdateCallHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/call-history/${id}`, data);
      return response.data.call;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-history'] });
      toast.success('Call history updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update call history');
    },
  });
};

export const useDeleteCallHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/call-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-history'] });
      toast.success('Call history deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete call history');
    },
  });
};

export const useTodayFollowupCalls = () => {
  return useQuery({
    queryKey: ['call-history-followups-today'],
    queryFn: async () => {
      const response = await api.get('/finance/call-history/followups/today');
      return response.data?.calls || [];
    },
    staleTime: 60 * 1000,
  });
};

export const useReferrals = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['referrals', filters],
    queryFn: async () => {
      const response = await api.get('/referrals', { params: filters });
      return response.data?.referrals || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useReferralAnalytics = (options = {}) => {
  return useQuery({
    queryKey: ['referral-analytics'],
    queryFn: async () => {
      const response = await api.get('/referrals/analytics');
      return response.data?.analytics || {};
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useCreateReferral = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/referrals', data);
      return response.data.referral;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['referral-analytics'] });
      toast.success('Referral added successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add referral');
    },
  });
};

export const useUpdateReferral = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/referrals/${id}`, data);
      return response.data.referral;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['referral-analytics'] });
      toast.success('Referral updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update referral');
    },
  });
};

export const useDeleteReferral = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/referrals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['referral-analytics'] });
      toast.success('Referral deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete referral');
    },
  });
};

export const useFinanceSummary = (options = {}) => {
  return useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const response = await api.get('/finance/summary');
      return response.data?.summary || {};
    },
    enabled: options.enabled ?? true,
    staleTime: 2 * 60 * 1000,
  });
};

export const useExpenses = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const response = await api.get('/finance/expenses', { params: filters });
      return response.data?.expenses || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/expenses', data);
      return response.data.expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Expense recorded successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to record expense');
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/expenses/${id}`, data);
      return response.data.expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-expense-report'] });
      toast.success('Expense record updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update expense record');
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-expense-report'] });
      toast.success('Expense deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete expense');
    },
  });
};

export const useApproveExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => {
      const response = await api.patch(`/finance/expenses/${id}/approve`, { action });
      return response.data.expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-expense-report'] });
      toast.success('Expense status updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update expense status');
    },
  });
};

export const useMonthlyExpenseReport = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['monthly-expense-report', params],
    queryFn: async () => {
      const response = await api.get('/finance/expenses/monthly-report', { params });
      return response.data?.report || {};
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};


export const useFinanceDashboardSummary = (options = {}) => {
  return useQuery({
    queryKey: ['finance-dashboard-summary'],
    queryFn: async () => {
      const response = await api.get('/finance/dashboard-summary');
      return response.data?.summary || {};
    },
    enabled: options.enabled ?? true,
    staleTime: 2 * 60 * 1000,
  });
};
