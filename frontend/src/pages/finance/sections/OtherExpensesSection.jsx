import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Search,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  FileText,
  Filter,
  IndianRupee,
  CreditCard,
  Building,
  Edit2,
  Trash2,
  AlertCircle,
  Tag,
  User,
  Info,
  FileEdit,
} from '@/components/ui/muiIcons';
import {
  useOtherExpenses,
  useCreateOtherExpense,
  useUpdateOtherExpense,
  useDeleteOtherExpense,
} from '../../../hooks/useFinance';
import { useDateFilter } from '../../../context/DateFilterContext';
import { formatINR } from '../../../utils/financeFormatters';
import { SelectDropdown } from '../../../components/ui/SelectDropdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Food & Snacks', label: 'Food & Snacks' },
  { value: 'Travel & Cab', label: 'Travel & Cab' },
  { value: 'Petty Cash', label: 'Petty Cash' },
  { value: 'Office Misc', label: 'Office Misc' },
  { value: 'Helper / Cash Advance', label: 'Helper / Cash Advance' },
  { value: 'Miscellaneous', label: 'Miscellaneous' },
];

const PAYMENT_MODES = [
  { value: 'all', label: 'All Modes' },
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI / GPay' },
  { value: 'Card', label: 'Card' },
  { value: 'Bank', label: 'Bank Transfer' },
  { value: 'Other', label: 'Other' },
];

export default function OtherExpensesSection() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');

  const { isDateInRange, startDate, endDate } = useDateFilter();

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'Miscellaneous',
    paymentMode: 'Cash',
    paidBy: 'Self',
    notes: '',
  });

  const { data, isLoading, refetch } = useOtherExpenses();
  const otherExpenses = data?.otherExpenses || [];

  const createMutation = useCreateOtherExpense();
  const updateMutation = useUpdateOtherExpense();
  const deleteMutation = useDeleteOtherExpense();

  // Filtered List
  const filteredList = useMemo(() => {
    return otherExpenses.filter((item) => {
      const q = search.trim().toLowerCase();
      const titleMatch = (item.title || '').toLowerCase().includes(q);
      const notesMatch = (item.notes || '').toLowerCase().includes(q);
      const catMatch = (item.category || '').toLowerCase().includes(q);
      const paidByMatch = (item.paidBy || '').toLowerCase().includes(q);
      const matchesSearch = !q || titleMatch || notesMatch || catMatch || paidByMatch;

      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesMode = modeFilter === 'all' || item.paymentMode === modeFilter;
      const matchesDate = !startDate && !endDate ? true : isDateInRange(item.date || item.createdAt);

      return matchesSearch && matchesCat && matchesMode && matchesDate;
    });
  }, [otherExpenses, search, categoryFilter, modeFilter, startDate, endDate, isDateInRange]);

  // Aggregate Stats (Period-aware)
  const totalAmount = useMemo(() => {
    return filteredList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredList]);

  const thisMonthAmount = useMemo(() => {
    const now = new Date();
    return filteredList
      .filter((item) => {
        const d = new Date(item.date || item.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredList]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({
      title: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      category: 'Miscellaneous',
      paymentMode: 'Cash',
      paidBy: 'Self',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title || '',
      amount: item.amount || '',
      date: item.date ? new Date(item.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      category: item.category || 'Miscellaneous',
      paymentMode: item.paymentMode || 'Cash',
      paidBy: item.paidBy || 'Self',
      notes: item.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    if (editingItem) {
      await updateMutation.mutateAsync({
        id: editingItem._id,
        data: {
          ...form,
          amount: Number(form.amount) || 0,
        },
      });
    } else {
      await createMutation.mutateAsync({
        ...form,
        amount: Number(form.amount) || 0,
      });
    }
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── UNBOUND INFO BANNER ────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <FileEdit className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-foreground">Other Expenses (Notes Tracker): </span>
            <span>
              Informational memo & personal notes. Strictly isolated from company P&L, balance sheets, and tax reports.
            </span>
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 whitespace-nowrap">
          Unbound / Memo Only
        </span>
      </div>

      {/* ── METRIC CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Memo Spend</span>
            <Banknote size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {formatINR(totalAmount)}
          </div>
          <p className="text-[11px] text-muted-foreground">Recorded across notes</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">This Month Spend</span>
            <Calendar size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {formatINR(thisMonthAmount)}
          </div>
          <p className="text-[11px] text-muted-foreground">Recorded in current month</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Notes</span>
            <CheckCircle2 size={16} className="text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {filteredList.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Recorded memo entries</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Average Note</span>
            <ArrowDownRight size={16} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {filteredList.length > 0 ? formatINR(Math.round(totalAmount / filteredList.length)) : '₹0'}
          </div>
          <p className="text-[11px] text-muted-foreground">Per expense memo</p>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search memo notes, title, category, or person..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border/50 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Category Filter */}
          <div className="w-[160px] flex-1 sm:flex-initial">
            <SelectDropdown
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val || 'all')}
              options={CATEGORY_OPTIONS}
              placeholder="All Categories"
              allowCustom={false}
              allowDeselect={false}
              buttonClassName="h-9 px-3 rounded-xl bg-background border border-border/50 text-xs font-semibold text-foreground"
            />
          </div>

          {/* Payment Mode Filter */}
          <div className="w-[140px] flex-1 sm:flex-initial">
            <SelectDropdown
              value={modeFilter}
              onChange={(val) => setModeFilter(val || 'all')}
              options={PAYMENT_MODES}
              placeholder="All Modes"
              allowCustom={false}
              allowDeselect={false}
              buttonClassName="h-9 px-3 rounded-xl bg-background border border-border/50 text-xs font-semibold text-foreground"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-xs min-h-[36px] w-full sm:w-auto"
          >
            <Plus size={14} />
            <span>Record Expense Note</span>
          </button>
        </div>
      </div>

      {/* ── EXPENSES TABLE ──────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Expense / Memo Title</th>
                <th className="py-3 px-4">Remembering Note</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Mode & Paid By</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading expense notes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <FileEdit className="h-7 w-7 text-muted-foreground/60" />
                      <p className="font-semibold text-foreground">No other expenses found</p>
                      <p className="text-[11px] text-muted-foreground">
                        Use this space to track personal spend, petty cash, or informal expenses for remembering without altering official company finances.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const displayDate = item.date ? new Date(item.date).toLocaleDateString() : '—';
                  return (
                    <tr key={item._id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground tabular-nums whitespace-nowrap">
                        {displayDate}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs">
                        {item.notes ? (
                          <span className="line-clamp-2 text-[11px] bg-muted/30 p-1.5 rounded-lg border border-border/30">
                            {item.notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 italic">No notes</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-secondary text-foreground">
                          {item.category || 'Miscellaneous'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>{item.paymentMode || 'Cash'}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-foreground text-[11px]">{item.paidBy || 'Self'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums text-sm whitespace-nowrap">
                        {formatINR(item.amount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Note"
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item._id)}
                            title="Delete Note"
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
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

      {/* ── ADD / EDIT MODAL ────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card rounded-2xl border border-border/60">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              <span>{editingItem ? 'Edit Expense Note' : 'Record Other Expense Note'}</span>
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Informational note only. Will not affect company balance sheet or official revenue.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Expense Title / Purpose *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Office snacks, Personal cab, Cash advance"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category
                </label>
                <SelectDropdown
                  value={form.category}
                  onChange={(val) => setForm({ ...form, category: val || 'Miscellaneous' })}
                  options={CATEGORY_OPTIONS.filter((c) => c.value !== 'all')}
                  allowCustom={true}
                  allowDeselect={false}
                  buttonClassName="h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium text-foreground w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Payment Mode
                </label>
                <SelectDropdown
                  value={form.paymentMode}
                  onChange={(val) => setForm({ ...form, paymentMode: val || 'Cash' })}
                  options={PAYMENT_MODES.filter((m) => m.value !== 'all')}
                  allowCustom={false}
                  allowDeselect={false}
                  buttonClassName="h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium text-foreground w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Paid By / Person
              </label>
              <input
                type="text"
                placeholder="e.g. Self, Dinesh M, Cash Handover"
                value={form.paidBy}
                onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Remembering Note / Memo
              </label>
              <textarea
                rows={3}
                placeholder="Write remembering notes, context, or details about this expense..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-background border border-border/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-secondary text-foreground font-semibold text-xs hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {editingItem ? 'Update Note' : 'Save Expense Note'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────── */}
      <Dialog open={Boolean(deleteConfirmId)} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-xs p-5 bg-card rounded-2xl border border-border/60 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
            <Trash2 size={18} />
          </div>
          <h4 className="text-sm font-bold text-foreground">Delete this expense note?</h4>
          <p className="text-xs text-muted-foreground">
            This note will be permanently removed.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-3.5 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDelete(deleteConfirmId)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
