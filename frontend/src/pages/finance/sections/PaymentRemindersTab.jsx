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
} from '@/components/ui/muiIcons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { SelectDropdown } from '../../../components/ui/SelectDropdown';
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
      {/* ── SUMMARY KPI METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Tracked</span>
            <div className="p-1.5 rounded-lg bg-secondary text-foreground shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground tabular-nums">{formatINR(summary.totalTracked)}</div>
          <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
            Across {summary.totalCount} payment records
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Collected / Settled</span>
            <div className="p-1.5 rounded-lg bg-secondary text-foreground shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground tabular-nums">{formatINR(summary.totalPaid)}</div>
          <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5 tabular-nums">
            <span>{summary.paidCount} fully settled</span>
            {summary.totalTracked > 0 && (
              <span className="font-bold text-foreground">
                ({Math.round((summary.totalPaid / summary.totalTracked) * 100)}%)
              </span>
            )}
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pending Balance</span>
            <div className="p-1.5 rounded-lg bg-secondary text-foreground shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-foreground tabular-nums">{formatINR(summary.totalPending)}</div>
          <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
            {summary.pendingCount} unpaid, {summary.partiallyPaidCount} partial
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl ">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Settlement Status</span>
            <div className="p-1.5 rounded-lg bg-secondary text-foreground shrink-0">
              <Filter className="h-4 w-4" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 tabular-nums">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground ">
              {summary.pendingCount} Unpaid
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary text-foreground ">
              {summary.partiallyPaidCount} Partial
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary text-primary-foreground">
              {summary.paidCount} Paid
            </span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">Active follow-up pipeline</div>
        </div>
      </div>

      {/* ── SEARCH & FILTER ACTION BAR ── */}
      <div className="bg-card p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search title, party, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring bg-background"
            />
          </div>

          <div className="flex items-center gap-1 bg-secondary p-0.5 rounded-lg overflow-x-auto max-w-full">
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
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 min-h-[32px] sm:min-h-[36px] ${
                  statusFilter === st.id
                    ? 'bg-card text-foreground '
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 cursor-pointer w-full sm:w-auto min-h-[36px] transition-colors"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          New Payment Reminder
        </button>
      </div>

      {/* ── MOBILE REMINDERS CARDS (block md:hidden) ── */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-xl ">
            Loading payment reminders...
          </div>
        ) : reminders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-xl ">
            No payment reminders recorded.
          </div>
        ) : (
          reminders.map((reminder) => {
            const total = Number(reminder.totalAmount || 0);
            const paid = Number(reminder.paidAmount || 0);
            const balance = Math.max(0, total - paid);
            const isOverdue = reminder.dueDate && new Date(reminder.dueDate) < new Date() && reminder.status !== 'paid';

            return (
              <div key={reminder._id} className="p-4 rounded-xl bg-card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-1">
                      {reminder.category && (
                        <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-secondary text-foreground">
                          {reminder.category.replace('_', ' ')}
                        </span>
                      )}
                      {reminder.dueDate && (
                        <span className={`font-semibold tabular-nums ${isOverdue ? 'text-foreground font-bold underline underline-offset-2' : 'text-muted-foreground'}`}>
                          Due: {formatDateIST(reminder.dueDate)} {isOverdue && '(Overdue)'}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-foreground leading-snug">{reminder.title}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{reminder.partyName}</span>
                      {reminder.contactInfo && <span className="text-muted-foreground tabular-nums">({reminder.contactInfo})</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-foreground tabular-nums">{formatINR(total)}</div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-0.5 ${
                        reminder.status === 'paid'
                          ? 'bg-primary text-primary-foreground'
                          : reminder.status === 'partially_paid'
                          ? 'bg-secondary text-foreground '
                          : 'bg-muted text-muted-foreground '
                      }`}
                    >
                      {reminder.status === 'paid' ? 'Paid' : reminder.status === 'partially_paid' ? 'Partial' : 'Unpaid'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 tabular-nums">
                  <span className="text-muted-foreground">Paid: <strong className="text-foreground">{formatINR(paid)}</strong></span>
                  {balance > 0 && (
                    <span className="text-foreground font-bold">Balance: {formatINR(balance)}</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 ">
                  {reminder.status !== 'paid' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenRecordPayment(reminder)}
                        className="flex-1 min-h-[36px] flex items-center justify-center px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-muted font-bold text-xs cursor-pointer"
                      >
                        Record Pay
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickMarkPaid(reminder)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs flex items-center gap-1 cursor-pointer"
                        title="Mark fully paid"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        <span>Paid</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setHistoryReminder(reminder)}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="History"
                  >
                    <History className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(reminder)}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(reminder)}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── REMINDERS TABLE (hidden md:block) ── */}
      <div className="hidden md:block bg-card rounded-xl overflow-hidden">
        <div className="responsive-table-container text-xs">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-secondary text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Party / Client</th>
                <th className="p-3">Title & Purpose</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3 text-right">Paid Amount</th>
                <th className="p-3 text-right">Remaining Balance</th>
                <th className="p-3">Due / Reminder Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/[0.05]">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-muted-foreground">
                    Loading payment reminders...
                  </td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-muted-foreground">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                      <p className="font-semibold text-foreground text-sm">No payment reminders</p>
                      <button
                        onClick={handleOpenAdd}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3 shrink-0" />
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
                    <tr key={reminder._id} className="hover:bg-secondary/40 transition-colors">
                      {/* Party / Client */}
                      <td className="p-3">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{reminder.partyName}</span>
                        </div>
                        {reminder.contactInfo && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5 tabular-nums">
                            {reminder.contactInfo}
                          </div>
                        )}
                        {reminder.category && (
                          <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-secondary text-foreground">
                            {reminder.category.replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Title & Notes */}
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{reminder.title}</div>
                        {reminder.notes && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {reminder.notes}
                          </div>
                        )}
                        {reminder.paymentMode && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Mode: {reminder.paymentMode}
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="p-3 text-right font-bold text-foreground tabular-nums whitespace-nowrap">
                        {formatINR(total)}
                      </td>

                      {/* Paid Amount */}
                      <td className="p-3 text-right tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-foreground">{formatINR(paid)}</div>
                        {total > 0 && (
                          <div className="w-20 ml-auto bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Remaining Balance */}
                      <td className="p-3 text-right tabular-nums whitespace-nowrap">
                        <div className={`font-bold ${balance > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {formatINR(balance)}
                        </div>
                      </td>

                      {/* Due / Reminder Date */}
                      <td className="p-3 whitespace-nowrap tabular-nums">
                        {reminder.dueDate ? (
                          <div className="flex items-center gap-1.5">
                            <span className={isOverdue ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                              {formatDateIST(reminder.dueDate)}
                            </span>
                            {isOverdue && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-primary text-primary-foreground">
                                Overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        {reminder.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary text-primary-foreground">
                            <CheckCircle2 className="h-3 w-3 shrink-0" /> Fully Paid
                          </span>
                        ) : reminder.status === 'partially_paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-secondary text-foreground ">
                            <Clock className="h-3 w-3 shrink-0" /> Partially Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted text-muted-foreground ">
                            <AlertCircle className="h-3 w-3 shrink-0" /> Unpaid / Pending
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
                                className="px-2 py-1 rounded-md text-[11px] font-bold bg-secondary text-foreground hover:bg-muted transition-colors cursor-pointer"
                              >
                                Record Pay
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickMarkPaid(reminder)}
                                title="Mark fully paid"
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
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
                              className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(reminder)}
                            title="Edit details"
                            className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(reminder)}
                            title="Delete reminder"
                            className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
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
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]">
          <form onSubmit={handleSubmitForm} className="flex flex-col min-h-0 h-full">
            {/* Pinned Header */}
            <div className="shrink-0 bg-card px-6 py-5 flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-foreground">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                    {editingReminder ? 'Edit Payment Reminder' : 'New Payment Reminder'}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Payment reminder form
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                  ESC
                </span>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>

            {/* Scrollable Linear Body */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Title / Purpose <span className="text-foreground">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Referral cut for ABC Client deal"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Party / Client / Referrer Name <span className="text-foreground">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar or Brand X"
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Category
                </label>
                <SelectDropdown
                  value={formData.category || 'referral'}
                  onChange={(val) => setFormData({ ...formData, category: val || 'referral' })}
                  options={[
                    { value: 'referral', label: 'Referral Cut' },
                    { value: 'client_cut', label: 'Client-Side Share' },
                    { value: 'commission', label: 'Commission Payout' },
                    { value: 'consulting', label: 'Consulting / Advisor' },
                    { value: 'other', label: 'Other Settlement' },
                  ]}
                  placeholder="Category"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Total Agreed Amount (₹) <span className="text-foreground">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="e.g. 25000"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full h-11 rounded-xl text-sm font-normal bg-background px-4 text-foreground tabular-nums focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                />
              </div>

              {!editingReminder && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Initial Paid Amount (₹, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0 if completely unpaid"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm font-normal bg-background px-4 text-foreground tabular-nums focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                  />
                </div>
              )}

              {editingReminder && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Current Paid (₹)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatINR(editingReminder.paidAmount || 0)}
                    className="w-full h-11 rounded-xl text-sm font-normal bg-muted/40 px-4 text-muted-foreground tabular-nums cursor-not-allowed"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Due / Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground tabular-nums focus:ring-2 focus:ring-ring/20 transition-all outline-hidden cursor-pointer"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Expected Payment Mode
                </label>
                <SelectDropdown
                  value={formData.paymentMode || 'Bank Transfer'}
                  onChange={(val) => setFormData({ ...formData, paymentMode: val || 'Bank Transfer' })}
                  options={[
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Cheque', label: 'Cheque' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  placeholder="Expected Payment Mode"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Link to Client (Optional)
                </label>
                <SelectDropdown
                  value={formData.client}
                  onChange={(val) => setFormData({ ...formData, client: val || '' })}
                  options={[
                    { value: '', label: 'None / External Party' },
                    ...clients.map((c) => ({
                      value: c._id,
                      label: `${c.name}${c.company ? ` (${c.company})` : ''}`,
                    })),
                  ]}
                  placeholder="None / External Party"
                  allowCustom={false}
                  className="w-full"
                  buttonClassName="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground border border-border/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Contact Info / Phone / Email
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                  className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Notes & Deal Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Add any specific context, account details, or terms..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl bg-background p-3.5 text-sm text-foreground focus:ring-2 focus:ring-ring/20 transition-all outline-hidden resize-none"
                />
              </div>
            </div>

            {/* Pinned Sticky Footer */}
            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="h-11 px-5 rounded-xl hover:bg-muted text-sm font-medium w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createReminder.isPending || updateReminder.isPending}
                  className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all w-full sm:w-auto"
                >
                  {editingReminder ? 'Save Changes' : 'Create Reminder'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: RECORD PAYMENT / PARTIAL INSTALLMENT ── */}
      <Dialog open={!!recordingPaymentReminder} onOpenChange={(open) => !open && setRecordingPaymentReminder(null)}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]">
          {recordingPaymentReminder && (
            <form onSubmit={handleSubmitPayment} className="flex flex-col min-h-0 h-full">
              {/* Pinned Header */}
              <div className="shrink-0 bg-card px-6 py-5 flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-foreground">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                      Record Payment
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      "{recordingPaymentReminder?.title}"
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    ESC
                  </span>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </div>

              {/* Scrollable Linear Body */}
              <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                <div className="bg-secondary/50 p-4 rounded-xl flex justify-between items-center text-xs tabular-nums">
                  <div>
                    <span className="text-muted-foreground">Total:</span>{' '}
                    <strong className="text-foreground">{formatINR(recordingPaymentReminder.totalAmount)}</strong>
                    <br />
                    <span className="text-muted-foreground">Already Paid:</span>{' '}
                    <strong className="text-foreground">{formatINR(recordingPaymentReminder.paidAmount || 0)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">Current Balance Due:</span>
                    <div className="text-sm font-bold text-foreground mt-0.5">
                      {formatINR(Math.max(0, (recordingPaymentReminder.totalAmount || 0) - (recordingPaymentReminder.paidAmount || 0)))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 bg-muted/30 rounded-xl">
                  <input
                    type="checkbox"
                    id="markFullCheck"
                    checked={paymentForm.markAsFull}
                    onChange={(e) => setPaymentForm({ ...paymentForm, markAsFull: e.target.checked })}
                    className="h-4 w-4 rounded text-foreground focus:ring-ring/20"
                  />
                  <label htmlFor="markFullCheck" className="text-sm font-semibold text-foreground cursor-pointer select-none">
                    Mark remainder as fully settled & paid
                  </label>
                </div>

                {!paymentForm.markAsFull && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      Payment Amount Received (₹) <span className="text-foreground">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g. 10000"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground font-semibold tabular-nums focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground tabular-nums focus:ring-2 focus:ring-ring/20 transition-all outline-hidden cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Payment Mode</label>
                  <SelectDropdown
                    value={paymentForm.paymentMode || 'Bank Transfer'}
                    onChange={(val) => setPaymentForm({ ...paymentForm, paymentMode: val || 'Bank Transfer' })}
                    options={[
                      { value: 'Bank Transfer', label: 'Bank Transfer' },
                      { value: 'UPI', label: 'UPI' },
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Cheque', label: 'Cheque' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    placeholder="Payment Mode"
                    allowCustom={false}
                    allowDeselect={false}
                    className="w-full"
                    buttonClassName="w-full h-11 px-4 rounded-xl bg-background text-sm text-foreground border border-border/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Transaction / Reference ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR / UPI Ref / Cheque No."
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm font-normal bg-background px-4 text-foreground tabular-nums focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Payment Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. First installment received"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-ring/20 transition-all outline-hidden"
                  />
                </div>
              </div>

              {/* Pinned Sticky Footer */}
              <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
                <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRecordingPaymentReminder(null)}
                    className="h-11 px-5 rounded-xl hover:bg-muted text-sm font-medium w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={recordPayment.isPending}
                    className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all w-full sm:w-auto"
                  >
                    Confirm Payment
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL: PAYMENT HISTORY / INSTALLMENTS ── */}
      <Dialog open={!!historyReminder} onOpenChange={(open) => !open && setHistoryReminder(null)}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]">
          <div className="flex flex-col min-h-0 h-full">
            {/* Pinned Header */}
            <div className="shrink-0 bg-card px-6 py-5 flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-foreground">
                  <History className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                    Payment Installments History
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    "{historyReminder?.title}" ({historyReminder?.partyName})
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                  ESC
                </span>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>

            {/* Scrollable Body */}
            {historyReminder && (
              <div className="space-y-4 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                <div className="bg-secondary/50 p-4 rounded-xl flex justify-between items-center text-xs tabular-nums">
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>{' '}
                    <strong className="text-foreground">{formatINR(historyReminder.totalAmount)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Paid:</span>{' '}
                    <strong className="text-foreground">{formatINR(historyReminder.paidAmount || 0)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Balance:</span>{' '}
                    <strong className="text-foreground">
                      {formatINR(Math.max(0, (historyReminder.totalAmount || 0) - (historyReminder.paidAmount || 0)))}
                    </strong>
                  </div>
                </div>

                <div className="space-y-3">
                  {(historyReminder.paymentHistory || []).map((pay, pIdx) => (
                    <div
                      key={pay._id || pIdx}
                      className="p-4 rounded-xl bg-card flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-foreground text-sm tabular-nums">{formatINR(pay.amount)}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1 tabular-nums">
                          <span>{pay.paymentDate ? formatDateIST(pay.paymentDate) : 'Date N/A'}</span>
                          <span>•</span>
                          <span className="font-medium text-foreground">{pay.paymentMode || 'Bank'}</span>
                          {pay.reference && <span>({pay.reference})</span>}
                        </div>
                        {pay.notes && <div className="text-[11px] text-muted-foreground mt-1">"{pay.notes}"</div>}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-secondary text-foreground ">
                        Recorded
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pinned Sticky Footer */}
            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setHistoryReminder(null)}
                className="h-11 px-5 rounded-xl hover:bg-muted text-sm font-medium w-full sm:w-auto ml-auto"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
