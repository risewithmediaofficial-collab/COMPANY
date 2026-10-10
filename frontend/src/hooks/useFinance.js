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

// =============================================
// ADVANCED FINANCE MODULE REACT-QUERY HOOKS
// =============================================

export const useFinanceModuleOverview = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-module-overview', filters],
    queryFn: async () => {
      const response = await api.get('/finance/module/overview', { params: filters });
      return response.data || {};
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useFinanceAccounts = (options = {}) => {
  return useQuery({
    queryKey: ['finance-accounts'],
    queryFn: async () => {
      const response = await api.get('/finance/accounts');
      return response.data?.accounts || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateFinanceAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/accounts', data);
      return response.data?.account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Account created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create account');
    },
  });
};

export const useReconcileAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/finance/accounts/${id}/reconcile`);
      return response.data?.reconciliation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Account balance reconciled successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to reconcile account');
    },
  });
};

export const useDeleteFinanceAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Account deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    },
  });
};

export const useInternalTransfers = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-transfers', filters],
    queryFn: async () => {
      const response = await api.get('/finance/transfers', { params: filters });
      return response.data?.transfers || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateInternalTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/transfers', data);
      return response.data?.transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Internal transfer recorded successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record transfer');
    },
  });
};

export const useDeleteInternalTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/transfers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-cashbook'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Internal transfer deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete transfer');
    },
  });
};

export const useModuleInvoices = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-module-invoices', filters],
    queryFn: async () => {
      const response = await api.get('/finance/module/invoices', { params: filters });
      return response.data?.invoices || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateModuleInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/module/invoices', data);
      return response.data?.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-module-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Invoice created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    },
  });
};

export const useUpdateInvoiceWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workflowStatus, voidReason }) => {
      const response = await api.patch(`/finance/module/invoices/${id}/workflow`, { workflowStatus, voidReason });
      return response.data?.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-module-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Invoice workflow updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update invoice workflow');
    },
  });
};

export const useUpdateModuleInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/module/invoices/${id}`, data);
      return response.data?.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-module-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Invoice updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update invoice');
    },
  });
};

export const useDeleteModuleInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/module/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-module-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Invoice deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    },
  });
};

export const useGenerateRetainerInvoices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/module/invoices/retainer-generate', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['finance-module-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success(data?.message || 'Monthly retainers generated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate retainers');
    },
  });
};

export const usePaymentReceipts = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-receipts', filters],
    queryFn: async () => {
      const response = await api.get('/finance/receipts', { params: filters });
      return response.data?.receipts || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useRecordPaymentReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/receipts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Payment receipt recorded successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record receipt');
    },
  });
};

export const useUpdatePaymentReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/receipts/${id}`, data);
      return response.data?.payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Payment receipt updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update receipt');
    },
  });
};

export const useDeletePaymentReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/receipts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Payment receipt deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete receipt');
    },
  });
};

export const useModuleExpenses = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-module-expenses', filters],
    queryFn: async () => {
      const response = await api.get('/finance/module/expenses', { params: filters });
      return response.data?.expenses || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateModuleExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/module/expenses', data);
      return response.data?.expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-module-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Expense recorded successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record expense');
    },
  });
};

export const usePayVendorBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fundingAccount, paymentMode, paymentDate }) => {
      const response = await api.post(`/finance/module/expenses/${id}/pay`, { fundingAccount, paymentMode, paymentDate });
      return response.data?.expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-module-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Vendor bill paid successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to pay vendor bill');
    },
  });
};

export const useUpdateModuleExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/module/expenses/${id}`, data);
      return response.data?.expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-module-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Expense updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update expense');
    },
  });
};

export const useDeleteModuleExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/module/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-module-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Expense deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    },
  });
};

export const useSubscriptions = (options = {}) => {
  return useQuery({
    queryKey: ['finance-subscriptions'],
    queryFn: async () => {
      const response = await api.get('/finance/subscriptions');
      return response.data?.subscriptions || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/subscriptions', data);
      return response.data?.subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Subscription scheduled successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to schedule subscription');
    },
  });
};

export const usePostSubscriptionRenewal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actualAmount, paymentDate, fundingAccount }) => {
      const response = await api.post(`/finance/subscriptions/${id}/post-renewal`, { actualAmount, paymentDate, fundingAccount });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Subscription renewal posted to expenses');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to post renewal');
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/subscriptions/${id}`, data);
      return response.data?.subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Subscription updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update subscription');
    },
  });
};

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Subscription deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete subscription');
    },
  });
};

export const usePayrollRecords = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-payroll', filters],
    queryFn: async () => {
      const response = await api.get('/finance/payroll', { params: filters });
      return response.data?.records || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const usePayrollEmployees = (options = {}) => {
  return useQuery({
    queryKey: ['finance-payroll-employees'],
    queryFn: async () => {
      const response = await api.get('/finance/payroll/employees');
      return response.data?.employees || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const usePayrollRecord = (id, options = {}) => {
  return useQuery({
    queryKey: ['finance-payroll-record', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/finance/payroll/${id}`);
      return response.data?.record || null;
    },
    enabled: Boolean(id),
    ...options,
  });
};

export const useCreatePayrollRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/payroll', data);
      return response.data?.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Payroll entry recorded successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record payroll entry');
    },
  });
};

export const useUpdatePayrollRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/finance/payroll/${id}`, data);
      return response.data?.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Payroll entry updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update payroll entry');
    },
  });
};

export const useDeletePayrollRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/finance/payroll/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Payroll entry deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete payroll entry');
    },
  });
};

export const useCalculateMonthlyPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/payroll/calculate', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success(data?.message || 'Payroll generated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate payroll');
    },
  });
};

export const useApprovePayrollRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.patch(`/finance/payroll/${id}/approve`);
      return response.data?.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Payroll approved');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to approve payroll');
    },
  });
};

export const usePayPayrollRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paymentAccount, paymentMethod, paymentDate }) => {
      const response = await api.post(`/finance/payroll/${id}/pay`, { paymentAccount, paymentMethod, paymentDate });
      return response.data?.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-payroll'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      toast.success('Salary paid successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to pay salary');
    },
  });
};

export const useClientProfitability = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-profitability', filters],
    queryFn: async () => {
      const response = await api.get('/finance/profitability', { params: filters });
      return response.data?.report || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateCostAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/allocations', data);
      return response.data?.allocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profitability'] });
      toast.success('Cost allocation added');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to add cost allocation');
    },
  });
};

export const useDeleteCostAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/finance/allocations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profitability'] });
      toast.success('Cost allocation removed');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete allocation');
    },
  });
};

export const useFounderTransactions = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-founders', filters],
    queryFn: async () => {
      const response = await api.get('/finance/founders', { params: filters });
      return response.data || { transactions: [], foundersSummary: [] };
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateFounderTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/founders', data);
      return response.data?.transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-founders'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      toast.success('Founder entry recorded');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record founder entry');
    },
  });
};

export const useReceivablesAging = (options = {}) => {
  return useQuery({
    queryKey: ['finance-aging'],
    queryFn: async () => {
      const response = await api.get('/finance/reports/aging');
      return response.data || { totalOutstanding: 0, buckets: [] };
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCashForecast = (scenario = 'expected', options = {}) => {
  return useQuery({
    queryKey: ['finance-forecast', scenario],
    queryFn: async () => {
      const response = await api.get('/finance/reports/forecast', { params: { scenario } });
      return response.data || {};
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useDailyCashbook = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['finance-cashbook', filters],
    queryFn: async () => {
      const response = await api.get('/finance/reports/cashbook', { params: filters });
      return response.data || { items: [], totalInflow: 0, totalOutflow: 0, netCashFlow: 0 };
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useMonthlyPnl = (year, options = {}) => {
  return useQuery({
    queryKey: ['finance-pnl', year],
    queryFn: async () => {
      const response = await api.get('/finance/reports/pnl', { params: { year } });
      return response.data || {};
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const usePeriodLocks = (options = {}) => {
  return useQuery({
    queryKey: ['finance-period-locks'],
    queryFn: async () => {
      const response = await api.get('/finance/settings/period-locks');
      return response.data?.locks || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useTogglePeriodLock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/settings/period-locks/toggle', data);
      return response.data?.lock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-period-locks'] });
      toast.success('Period status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update period status');
    },
  });
};

export const useFinanceAuditLogs = (options = {}) => {
  return useQuery({
    queryKey: ['finance-audit-logs'],
    queryFn: async () => {
      const response = await api.get('/finance/settings/audit-logs');
      return response.data?.logs || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useFinanceBudgets = (options = {}) => {
  return useQuery({
    queryKey: ['finance-budgets'],
    queryFn: async () => {
      const response = await api.get('/finance/settings/budgets');
      return response.data?.budgets || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useSetFinanceBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/finance/settings/budgets', data);
      return response.data?.budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
      toast.success('Category budget updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update budget');
    },
  });
};
