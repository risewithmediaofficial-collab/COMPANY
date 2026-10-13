import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Edit2,
  Trash2,
  DollarSign,
  ShieldCheck,
  History,
  ArrowRight,
  Filter,
  Check,
  Building,
  User,
  Share2,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  usePaymentReminders,
  useCreatePaymentReminder,
  useUpdatePaymentReminder,
  useRecordReminderPayment,
  useDeletePaymentReminder,
} from '../../../hooks/useFinance';
import { useClients } from '../../../hooks/useClients';
import { formatINR, formatDateIST } from '../../../utils/financeFormatters';
import { toast } from 'sonner';

export default function PaymentRemindersTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'partially_paid' | 'paid'

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [recordingPaymentReminder, setRecordingPaymentReminder] = useState(null);
  const [historyReminder, setHistoryReminder] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    title: '',
    partyName: '',
    client: '',
    category: 'referral',
    totalAmount: '',
    paidAmount: '',
    dueDate: '',
    paymentMode: 'Bank Transfer',
    contactInfo: '',
    notes: '',
  });

  // Partial Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Bank Transfer',
    reference: '',
    notes: '',
    markAsFull: false,
  });

  // Query Hooks
  const { data: reminderResponse = {}, isLoading } = usePaymentReminders({
    status: statusFilter,
    search,
  });
  const reminders = reminderResponse.data || [];
  const summary = reminderResponse.summary || {
    totalTracked: 0,
    totalPaid: 0,
    totalPending: 0,
    pendingCount: 0,
    partiallyPaidCount: 0,
    paidCount: 0,
    totalCount: 0,
  };

  const { data: clients = [] } = useClients();

  // Mutation Hooks
  const createReminder = useCreatePaymentReminder();
  const updateReminder = useUpdatePaymentReminder();
  const recordPayment = useRecordReminderPayment();
  const deleteReminder = useDeletePaymentReminder();

  // Handlers
  const handleOpenAdd = () => {
    setEditingReminder(null);
    setFormData({
      title: '',
      partyName: '',
      client: '',
      category: 'referral',
      totalAmount: '',
      paidAmount: '',
      dueDate: '',
      paymentMode: 'Bank Transfer',
      contactInfo: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title || '',
      partyName: reminder.partyName || '',
      client: reminder.client?._id || reminder.client || '',
      category: reminder.category || 'referral',
      totalAmount: reminder.totalAmount != null ? String(reminder.totalAmount) : '',
      paidAmount: reminder.paidAmount != null ? String(reminder.paidAmount) : '',
      dueDate: reminder.dueDate ? new Date(reminder.dueDate).toISOString().slice(0, 10) : '',
      paymentMode: reminder.paymentMode || 'Bank Transfer',
      contactInfo: reminder.contactInfo || '',
      notes: reminder.notes || '',
    });
    setShowAddModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Enter a title or description');
    if (!formData.partyName.trim()) return toast.error('Enter party or client name');
    if (!formData.totalAmount || Number(formData.totalAmount) <= 0) {
      return toast.error('Enter a valid total amount');
    }

    try {
      if (editingReminder) {
        await updateReminder.mutateAsync({
          id: editingReminder._id,
          data: {
            ...formData,
            totalAmount: Number(formData.totalAmount),
          },
        });
      } else {
        await createReminder.mutateAsync({
          ...formData,
          totalAmount: Number(formData.totalAmount),
          paidAmount: Number(formData.paidAmount || 0),
        });
      }
      setShowAddModal(false);
      setEditingReminder(null);
    } catch (_) {}
  };

  const handleOpenRecordPayment = (reminder) => {
    setRecordingPaymentReminder(reminder);
    const balance = Math.max(0, (reminder.totalAmount || 0) - (reminder.paidAmount || 0));
    setPaymentForm({
      amount: balance > 0 ? String(balance) : '',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: reminder.paymentMode || 'Bank Transfer',
      reference: '',
      notes: '',
      markAsFull: false,
    });
  };

  const handleQuickMarkPaid = async (reminder) => {
    if (window.confirm(`Mark reminder "${reminder.title}" as fully paid?`)) {
      try {
        await recordPayment.mutateAsync({
          id: reminder._id,
          data: {
            markAsFull: true,
            paymentDate: new Date().toISOString().slice(0, 10),
            notes: 'Quick settled as paid in full',
          },
        });
      } catch (_) {}
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!recordingPaymentReminder) return;

    if (!paymentForm.markAsFull && (!paymentForm.amount || Number(paymentForm.amount) <= 0)) {
      return toast.error('Enter a valid payment amount');
    }

    try {
      await recordPayment.mutateAsync({
        id: recordingPaymentReminder._id,
        data: {
          ...paymentForm,
          amount: Number(paymentForm.amount || 0),
        },
      });
      setRecordingPaymentReminder(null);
    } catch (_) {}
  };

  const handleDelete = async (reminder) => {
    if (window.confirm(`Are you sure you want to delete payment reminder "${reminder.title}"?`)) {
      try {
        await deleteReminder.mutateAsync(reminder._id);
      } catch (_) {}
    }
  };

  return (
    <div className="space-y-6">
      {/* ── ISOLATION NOTICE ── */}
      <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/70 p-4 text-xs text-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Independent Payment Tracking</span>
            <p className="text-[11px] text-indigo-700/90 mt-0.5">
              These payment reminders are kept completely separate for referral commissions, partner cuts, and client settlements.
              They are <strong className="font-bold underline">not connected</strong> to agency operating expenses, revenue, P&L, or cash profit metrics.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-800 text-[10px] font-bold uppercase tracking-wider shrink-0 border border-indigo-200">
          🔒 Isolated Ledger
        </span>
      </div>

      {/* ── SUMMARY KPI METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Tracked</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatINR(summary.totalTracked)}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across {summary.totalCount} payment records
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Collected / Settled</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600">{formatINR(summary.totalPaid)}</div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>{summary.paidCount} fully settled</span>
            {summary.totalTracked > 0 && (
              <span className="font-bold text-emerald-700">
                ({Math.round((summary.totalPaid / summary.totalTracked) * 100)}%)
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending Balance</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-600">{formatINR(summary.totalPending)}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {summary.pendingCount} unpaid, {summary.partiallyPaidCount} partial
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Settlement Status</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Filter className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">
              {summary.pendingCount} Unpaid
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
              {summary.partiallyPaidCount} Partial
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
              {summary.paidCount} Paid
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Active follow-up pipeline</div>
        </div>
      </div>

      {/* ── SEARCH & FILTER ACTION BAR ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, party, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Unpaid' },
              { id: 'partially_paid', label: 'Partially Paid' },
              { id: 'paid', label: 'Paid' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-2xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          + New Payment Reminder
        </button>
      </div>

      {/* ── REMINDERS TABLE ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Party / Client</th>
                <th className="p-3">Title & Purpose</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Paid Amount</th>
                <th className="p-3">Remaining Balance</th>
                <th className="p-3">Due / Reminder Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    Loading payment reminders...
                  </td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600 text-sm">No payment reminders recorded</p>
                      <p className="text-xs text-slate-400">
                        Add referral fees, partner commissions, or client settlements to track them independently.
                      </p>
                      <button
                        onClick={handleOpenAdd}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        Create first reminder
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                reminders.map((reminder) => {
                  const total = Number(reminder.totalAmount || 0);
                  const paid = Number(reminder.paidAmount || 0);
                  const balance = Math.max(0, total - paid);
                  const percentPaid = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                  const isOverdue = reminder.dueDate && new Date(reminder.dueDate) < new Date() && reminder.status !== 'paid';

                  return (
                    <tr key={reminder._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Party / Client */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{reminder.partyName}</span>
                        </div>
                        {reminder.contactInfo && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {reminder.contactInfo}
                          </div>
                        )}
                        {reminder.category && (
                          <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {reminder.category.replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Title & Notes */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{reminder.title}</div>
                        {reminder.notes && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {reminder.notes}
                          </div>
                        )}
                        {reminder.paymentMode && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Mode: {reminder.paymentMode}
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatINR(total)}
                      </td>

                      {/* Paid Amount */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-emerald-600">{formatINR(paid)}</div>
                        {total > 0 && (
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Remaining Balance */}
                      <td className="p-3 whitespace-nowrap">
                        <div className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {formatINR(balance)}
                        </div>
                      </td>

                      {/* Due / Reminder Date */}
                      <td className="p-3 whitespace-nowrap">
                        {reminder.dueDate ? (
                          <div className="flex items-center gap-1.5">
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                              {formatDateIST(reminder.dueDate)}
                            </span>
                            {isOverdue && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700">
                                Overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        {reminder.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Fully Paid
                          </span>
                        ) : reminder.status === 'partially_paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                            <Clock className="h-3 w-3" /> Partially Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                            <AlertCircle className="h-3 w-3" /> Unpaid / Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {reminder.status !== 'paid' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenRecordPayment(reminder)}
                                title="Record partial payment or settlement"
                                className="px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                              >
                                Record Pay
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickMarkPaid(reminder)}
                                title="Mark fully paid"
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {reminder.paymentHistory?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setHistoryReminder(reminder)}
                              title="View payment installments history"
                              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(reminder)}
                            title="Edit details"
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(reminder)}
                            title="Delete reminder"
                            className="p-1 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: ADD / EDIT PAYMENT REMINDER ── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent size="md" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReminder ? 'Edit Payment Reminder' : 'New Payment Reminder'}
            </DialogTitle>
            <DialogDescription>
              Track referral payouts, partner commissions, or client settlement notes. (Completely separate from agency revenue and expenses).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Title / Purpose <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Referral cut for ABC Client deal"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Party / Client / Referrer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar or Brand X"
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="referral">Referral Cut</option>
                  <option value="client_cut">Client-Side Share</option>
                  <option value="commission">Commission Payout</option>
                  <option value="consulting">Consulting / Advisor</option>
                  <option value="other">Other Settlement</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Agreed Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="e.g. 25000"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {!editingReminder && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Paid Amount (₹, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0 if completely unpaid"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {editingReminder && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Paid (₹)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatINR(editingReminder.paidAmount || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due / Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Payment Mode
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link to Client (Optional)
                </label>
                <select
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="">None / External Party</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Info / Phone / Email
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes & Deal Details
              </label>
              <textarea
                rows={2}
                placeholder="Add any specific context, account details, or terms..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createReminder.isPending || updateReminder.isPending}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {editingReminder ? 'Save Changes' : 'Create Reminder'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: RECORD PAYMENT / PARTIAL INSTALLMENT ── */}
      <Dialog open={!!recordingPaymentReminder} onOpenChange={(open) => !open && setRecordingPaymentReminder(null)}>
        <DialogContent size="sm" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record an installment or mark as paid for "{recordingPaymentReminder?.title}".
            </DialogDescription>
          </DialogHeader>

          {recordingPaymentReminder && (
            <form onSubmit={handleSubmitPayment} className="space-y-4 pt-1">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">Total:</span>{' '}
                  <strong className="text-slate-800">{formatINR(recordingPaymentReminder.totalAmount)}</strong>
                  <br />
                  <span className="text-slate-500">Already Paid:</span>{' '}
                  <strong className="text-emerald-600">{formatINR(recordingPaymentReminder.paidAmount || 0)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Current Balance Due:</span>
                  <div className="text-sm font-bold text-amber-600">
                    {formatINR(Math.max(0, (recordingPaymentReminder.totalAmount || 0) - (recordingPaymentReminder.paidAmount || 0)))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="markFullCheck"
                  checked={paymentForm.markAsFull}
                  onChange={(e) => setPaymentForm({ ...paymentForm, markAsFull: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="markFullCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Mark remainder as fully settled & paid
                </label>
              </div>

              {!paymentForm.markAsFull && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Amount Received (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="e.g. 10000"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction / Reference ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR / UPI Ref / Cheque No."
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Notes</label>
                <input
                  type="text"
                  placeholder="e.g. First installment received"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordingPaymentReminder(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPayment.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL: PAYMENT HISTORY / INSTALLMENTS ── */}
      <Dialog open={!!historyReminder} onOpenChange={(open) => !open && setHistoryReminder(null)}>
        <DialogContent size="md" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Installments History</DialogTitle>
            <DialogDescription>
              Recorded payments for "{historyReminder?.title}" ({historyReminder?.partyName}).
            </DialogDescription>
          </DialogHeader>

          {historyReminder && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">Total Amount:</span>{' '}
                  <strong className="text-slate-800">{formatINR(historyReminder.totalAmount)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Paid:</span>{' '}
                  <strong className="text-emerald-600">{formatINR(historyReminder.paidAmount || 0)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Balance:</span>{' '}
                  <strong className="text-amber-600">
                    {formatINR(Math.max(0, (historyReminder.totalAmount || 0) - (historyReminder.paidAmount || 0)))}
                  </strong>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(historyReminder.paymentHistory || []).map((pay, pIdx) => (
                  <div
                    key={pay._id || pIdx}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{formatINR(pay.amount)}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{pay.paymentDate ? formatDateIST(pay.paymentDate) : 'Date N/A'}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">{pay.paymentMode || 'Bank'}</span>
                        {pay.reference && <span>({pay.reference})</span>}
                      </div>
                      {pay.notes && <div className="text-[11px] text-slate-400 mt-0.5">{pay.notes}</div>}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      Recorded
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setHistoryReminder(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
