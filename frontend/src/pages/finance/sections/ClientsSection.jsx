import { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Edit2,
  Trash2,
  Receipt,
  FileText,
  Clock,
  Building,
  X,
} from '@/components/ui/muiIcons';
import { useClients, useUpdateClient } from '../../../hooks/useClients';
import { useQueryClient } from '@tanstack/react-query';
import {
  useClientProfitability,
  useCreateCostAllocation,
  useDeleteCostAllocation,
  useModuleInvoices,
  usePaymentReceipts,
} from '../../../hooks/useFinance';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ClientsSection({ onQuickAdd }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedClientForCost, setSelectedClientForCost] = useState(null);
  const [showCostModal, setShowCostModal] = useState(false);

  // Client Statement & Ledger State
  const [selectedClientForLedger, setSelectedClientForLedger] = useState(null);

  // Edit Client Modal State
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    monthlyPlanFee: '',
    servicePlan: 'Retainer',
    deliverables: '',
    billingDate: 1,
    billingCycle: 'monthly',
    contractValue: '',
  });

  const [retainerPeriod, setRetainerPeriod] = useState(
    new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
  );

  const { data: clients = [], isLoading } = useClients();
  const { data: profitability = [] } = useClientProfitability({ servicePeriod: retainerPeriod });
  const { data: allInvoices = [] } = useModuleInvoices();
  const { data: allReceipts = [] } = usePaymentReceipts();

  const createAllocation = useCreateCostAllocation();
  const deleteAllocation = useDeleteCostAllocation();
  const updateClient = useUpdateClient();

  const activeClientLedger = useMemo(() => {
    if (!selectedClientForLedger) return null;
    const cid = String(selectedClientForLedger._id);
    const invoices = allInvoices.filter((inv) => String(inv.client?._id || inv.client) === cid);
    const receipts = allReceipts.filter((r) => String(r.client?._id || r.client) === cid);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total || inv.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    const totalPending = invoices.reduce(
      (sum, inv) => sum + Number(inv.balanceAmount != null ? inv.balanceAmount : Math.max(0, (inv.total || 0) - (inv.paidAmount || 0))),
      0
    );

    return {
      client: selectedClientForLedger,
      invoices: [...invoices].sort((a, b) => new Date(b.invoiceDate || b.createdAt || 0) - new Date(a.invoiceDate || a.createdAt || 0)),
      receipts: [...receipts].sort((a, b) => new Date(b.receivedDate || b.createdAt || 0) - new Date(a.receivedDate || a.createdAt || 0)),
      totalInvoiced,
      totalPaid,
      totalPending,
      invoicesCount: invoices.length,
      receiptsCount: receipts.length,
    };
  }, [allInvoices, allReceipts, selectedClientForLedger]);

  const handleOpenEditClient = (client) => {
    setEditingClient(client);
    setClientForm({
      monthlyPlanFee: client.monthlyPlanFee != null ? String(client.monthlyPlanFee) : '',
      servicePlan: client.servicePlan || 'Retainer',
      deliverables: client.deliverables || '',
      billingDate: client.billingDate || 1,
      billingCycle: client.billingCycle || 'monthly',
      contractValue: client.contractValue != null ? String(client.contractValue) : '',
    });
    setShowEditClientModal(true);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      await updateClient.mutateAsync({
        id: editingClient._id,
        data: {
          monthlyPlanFee: Number(clientForm.monthlyPlanFee || 0),
          servicePlan: clientForm.servicePlan,
          deliverables: clientForm.deliverables,
          billingDate: Number(clientForm.billingDate || 1),
          billingCycle: clientForm.billingCycle,
          contractValue: Number(clientForm.contractValue || clientForm.monthlyPlanFee || 0),
        },
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['finance-client-profitability'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-overview'] });
      setShowEditClientModal(false);
      toast.success(`Updated ${editingClient.company || editingClient.name} retainer details`);
    } catch (err) {
      toast.error('Failed to update client retainer details');
    }
  };

  // Allocation Form State
  const [allocForm, setAllocForm] = useState({
    activityDeliverable: 'Video Editing',
    costType: 'direct',
    allocatedAmount: '',
    quantityOrHours: 1,
    notes: '',
  });

  const filteredClients = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (c.name || '').toLowerCase();
    const company = (c.company || '').toLowerCase();
    const plan = (c.servicePlan || '').toLowerCase();
    return name.includes(q) || company.includes(q) || plan.includes(q);
  });


  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    if (!selectedClientForCost) return;
    if (!allocForm.allocatedAmount || Number(allocForm.allocatedAmount) <= 0) {
      return toast.error('Enter valid cost amount');
    }

    try {
      await createAllocation.mutateAsync({
        client: selectedClientForCost._id,
        servicePeriod: retainerPeriod,
        costType: allocForm.costType,
        activityDeliverable: allocForm.activityDeliverable,
        quantityOrHours: Number(allocForm.quantityOrHours || 1),
        allocatedAmount: Number(allocForm.allocatedAmount),
        notes: allocForm.notes,
      });
      setShowCostModal(false);
      setAllocForm({
        activityDeliverable: 'Video Editing',
        costType: 'direct',
        allocatedAmount: '',
        quantityOrHours: 1,
        notes: '',
      });
    } catch (err) {}
  };

  const handleExport = () => {
    const rows = profitability.map((p) => ({
      client: p.clientName,
      plan: p.servicePlan,
      revenue: p.serviceRevenue,
      directCosts: p.directCosts,
      contribution: p.contribution,
      overhead: p.allocatedOverhead,
      netProfit: p.netProfit,
      margin: p.marginPercent !== null ? `${p.marginPercent}%` : 'N/A',
    }));
    exportToCSV(`client_profitability_${retainerPeriod}`, rows, [
      { key: 'client', label: 'Client' },
      { key: 'plan', label: 'Service Plan' },
      { key: 'revenue', label: 'Recognized Revenue (INR)' },
      { key: 'directCosts', label: 'Direct Service Costs (INR)' },
      { key: 'contribution', label: 'Gross Contribution (INR)' },
      { key: 'overhead', label: 'Allocated Overhead (INR)' },
      { key: 'netProfit', label: 'Net Profit (INR)' },
      { key: 'margin', label: 'Profit Margin' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="bg-card p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search client, business name, or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-foreground font-semibold hover:bg-secondary flex-1 sm:flex-initial min-h-[36px] transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => onQuickAdd('client')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex-1 sm:flex-initial min-h-[36px] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>New Client Master</span>
          </button>
        </div>
      </div>

      {/* Client Master & Profitability Table */}
      <div className="bg-card rounded-xl overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Active Retainer Clients & Contribution Margins</h3>
            <p className="text-xs text-muted-foreground tabular-nums">
              Period: <strong className="text-foreground">{retainerPeriod}</strong>
            </p>
          </div>
        </div>

        <div className="responsive-table-container overflow-y-auto max-h-[580px] text-xs">
          <table className="w-full min-w-[780px] text-left">
            <thead className="sticky top-0 z-10 bg-secondary text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Client / Business</th>
                <th className="p-3">Plan & Deliverables</th>
                <th className="p-3">Billing Date</th>
                <th className="p-3 text-right">Monthly Plan Fee</th>
                <th className="p-3 text-right">Direct Costs</th>
                <th className="p-3 text-right">Net Client Profit</th>
                <th className="p-3 text-right">Profit Margin</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/[0.05]">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-muted-foreground">
                    No clients found.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const prof = profitability.find((p) => String(p.clientId) === String(client._id)) || {};
                  const planFee = client.monthlyPlanFee || client.contractValue || 0;
                  const directCosts = prof.directCosts || 0;
                  const netProfit = prof.netProfit ?? (planFee - directCosts);
                  const margin = prof.marginPercent ?? (planFee > 0 ? Number(((netProfit / planFee) * 100).toFixed(1)) : null);

                  return (
                    <tr
                      key={client._id}
                      onClick={() => setSelectedClientForLedger(client)}
                      className="hover:bg-secondary/50 transition-colors cursor-pointer group"
                      title="Click row to view financial ledger in sidebar"
                    >
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientForLedger(client);
                          }}
                          className="font-bold text-foreground text-left hover:underline cursor-pointer flex items-center gap-1.5"
                          title="Click to view full financial ledger & invoices statement"
                        >
                          <span>{client.company || client.name}</span>
                          <Receipt className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                        </button>
                        <div className="text-[11px] text-muted-foreground">{client.contactName || client.name} · {client.email || '-'}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-foreground">{client.servicePlan || 'Retainer'}</span>
                        <div className="text-[11px] text-muted-foreground font-medium">{client.deliverables || 'Deliverables not set'}</div>
                      </td>
                      <td className="p-3 text-muted-foreground tabular-nums">
                        Day {client.billingDate || 1} of month ({client.billingCycle || 'monthly'})
                      </td>
                      <td className="p-3 text-right font-bold text-foreground text-sm tabular-nums whitespace-nowrap">
                        {formatINR(planFee)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground font-medium tabular-nums whitespace-nowrap">
                        {formatINR(directCosts)}
                      </td>
                      <td className="p-3 text-right tabular-nums whitespace-nowrap">
                        <span className={`font-bold text-sm ${netProfit >= 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {formatINR(netProfit)}
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums whitespace-nowrap">
                        {margin !== null ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              margin >= 40
                                ? 'bg-primary text-primary-foreground'
                                : margin >= 20
                                ? 'bg-secondary text-foreground '
                                : 'bg-muted text-muted-foreground '
                            }`}
                          >
                            {margin}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedClientForLedger(client)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-secondary hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
                            title="Open Invoices, Receipts & Dues Statement in sidebar"
                          >
                            <Receipt className="h-3 w-3 shrink-0" /> Ledger
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditClient(client)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-secondary hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
                            title="Edit Plan Fee, Deliverables & Billing"
                          >
                            <Edit2 className="h-3 w-3 shrink-0" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientForCost(client);
                              setShowCostModal(true);
                            }}
                            className="px-2.5 py-1 rounded bg-secondary hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Add Cost
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

      {/* COST ALLOCATION MODAL */}
      <Dialog open={Boolean(showCostModal && selectedClientForCost)} onOpenChange={(open) => !open && setShowCostModal(false)}>
        {showCostModal && selectedClientForCost && (
          <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]">
            <DialogHeader className="px-6 py-4 sm:py-5 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0 ">
                  <DollarSign size={20} />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                    Assign Cost — {selectedClientForCost.company || selectedClientForCost.name}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Assign direct cost
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary text-[10px] font-mono font-medium text-muted-foreground select-none">
                  ESC
                </kbd>
                <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/20">
                  <X size={16} />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveAllocation} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body - Google Form Linear Stack */}
              <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Activity / Deliverable *</label>
                  <select
                    value={allocForm.activityDeliverable}
                    onChange={(e) => setAllocForm({ ...allocForm, activityDeliverable: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl text-sm text-foreground bg-background focus:ring-2 focus:ring-ring/20 outline-none cursor-pointer"
                  >
                    <option value="Video Editing">Video Editing (Editor Cost)</option>
                    <option value="Graphic Design">Graphic Design (Designer Cost)</option>
                    <option value="Production Shoot">Shoot & Travel Allowance</option>
                    <option value="Freelancer Fee">Freelancer Deliverable Fee</option>
                    <option value="Tools Allocation">Software Tools Allocation</option>
                    <option value="Overhead Allocation">Shared Agency Overhead</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Cost Type</label>
                  <select
                    value={allocForm.costType}
                    onChange={(e) => setAllocForm({ ...allocForm, costType: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl text-sm text-foreground bg-background focus:ring-2 focus:ring-ring/20 outline-none cursor-pointer"
                  >
                    <option value="direct">Direct Service Cost (Reduces Contribution)</option>
                    <option value="overhead">Shared Overhead (Reduces Net Profit)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Cost Amount (₹) *</label>
                  <input
                    type="number"
                    value={allocForm.allocatedAmount}
                    onChange={(e) => setAllocForm({ ...allocForm, allocatedAmount: e.target.value })}
                    placeholder="e.g. 4000"
                    required
                    className="w-full h-11 px-4 rounded-xl text-sm font-semibold text-foreground tabular-nums bg-background focus:ring-2 focus:ring-ring/20 outline-none "
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Notes</label>
                  <input
                    type="text"
                    value={allocForm.notes}
                    onChange={(e) => setAllocForm({ ...allocForm, notes: e.target.value })}
                    placeholder="e.g. 8 Reels edited by senior editor"
                    className="w-full h-11 px-4 rounded-xl text-sm text-foreground bg-background focus:ring-2 focus:ring-ring/20 outline-none "
                  />
                </div>
              </div>

              {/* Pinned Sticky Bottom Action Footer */}
              <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
                <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1.5">
                  <span>Press</span>
                  <kbd className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono font-medium text-foreground">
                    ESC
                  </kbd>
                  <span>to close</span>
                </span>

                <div className="flex items-center gap-3 ml-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCostModal(false)}
                    className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAllocation.isPending}
                    className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground cursor-pointer transition-all"
                  >
                    {createAllocation.isPending ? 'Assigning...' : 'Assign Cost'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* EDIT CLIENT RETAINER MODAL */}
      <Dialog open={Boolean(showEditClientModal && editingClient)} onOpenChange={(open) => !open && setShowEditClientModal(false)}>
        {showEditClientModal && editingClient && (
          <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-2xl max-h-[90vh]">
            <DialogHeader className="px-6 py-4 sm:py-5 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0 ">
                  <Building size={20} />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                    Edit Retainer Plan — {editingClient.company || editingClient.name}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Edit retainer plan
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary text-[10px] font-mono font-medium text-muted-foreground select-none">
                  ESC
                </kbd>
                <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/20">
                  <X size={16} />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveClient} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body - Google Form Linear Stack */}
              <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Monthly Plan Fee (₹) *</label>
                  <input
                    type="number"
                    value={clientForm.monthlyPlanFee}
                    onChange={(e) => setClientForm({ ...clientForm, monthlyPlanFee: e.target.value })}
                    placeholder="e.g. 25000"
                    required
                    min="0"
                    className="w-full h-11 rounded-xl px-4 text-sm font-bold text-foreground tabular-nums bg-background focus:ring-2 focus:ring-ring/20 outline-none"
                  />
                  <span className="text-xs text-muted-foreground mt-1 block">Amount billed recurringly each month</span>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Service Plan / Package</label>
                  <input
                    type="text"
                    value={clientForm.servicePlan}
                    onChange={(e) => setClientForm({ ...clientForm, servicePlan: e.target.value })}
                    placeholder="e.g. Retainer, Social Media"
                    className="w-full h-11 rounded-xl px-4 text-sm text-foreground bg-background focus:ring-2 focus:ring-ring/20 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Contracted Deliverables</label>
                  <textarea
                    rows="3"
                    value={clientForm.deliverables}
                    onChange={(e) => setClientForm({ ...clientForm, deliverables: e.target.value })}
                    placeholder="e.g. 12 Reels, 15 Graphic Posts, Ad Campaign Management"
                    className="w-full min-h-[90px] rounded-xl p-3.5 text-sm text-foreground bg-background focus:ring-2 focus:ring-ring/20 outline-none resize-y"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Billing Day of Month</label>
                  <select
                    value={clientForm.billingDate}
                    onChange={(e) => setClientForm({ ...clientForm, billingDate: e.target.value })}
                    className="w-full h-11 rounded-xl px-4 text-sm text-foreground tabular-nums bg-background focus:ring-2 focus:ring-ring/20 outline-none cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d} of month
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Billing Cycle</label>
                  <select
                    value={clientForm.billingCycle}
                    onChange={(e) => setClientForm({ ...clientForm, billingCycle: e.target.value })}
                    className="w-full h-11 rounded-xl px-4 text-sm text-foreground bg-background focus:ring-2 focus:ring-ring/20 outline-none cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                    <option value="one_time">One-time / Milestone</option>
                  </select>
                </div>

                {/* Direct Cost Allocations for this client in current period */}
                {(() => {
                  const clientProf = profitability.find((p) => String(p.clientId) === String(editingClient._id));
                  const clientAllocations = clientProf?.allocations || [];
                  if (clientAllocations.length === 0) return null;

                  return (
                    <div className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-sm tabular-nums">
                          Direct Costs in {retainerPeriod} ({clientAllocations.length})
                        </span>
                        <span className="text-xs font-semibold text-foreground tabular-nums">
                          Total: {formatINR(clientProf?.directCosts || 0)}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                        {clientAllocations.map((alloc) => (
                          <div
                            key={alloc._id}
                            className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 text-xs"
                          >
                            <div>
                              <span className="font-bold text-foreground">{alloc.activityDeliverable}</span>
                              {alloc.notes && <span className="text-muted-foreground ml-1.5">· {alloc.notes}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground tabular-nums">{formatINR(alloc.allocatedAmount)}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`Delete this ${formatINR(alloc.allocatedAmount)} cost allocation?`)) {
                                    await deleteAllocation.mutateAsync(alloc._id);
                                    queryClient.invalidateQueries({ queryKey: ['finance-client-profitability'] });
                                  }
                                }}
                                disabled={deleteAllocation.isPending}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                title="Delete Cost Allocation"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Pinned Sticky Bottom Action Footer */}
              <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
                <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1.5">
                  <span>Press</span>
                  <kbd className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono font-medium text-foreground">
                    ESC
                  </kbd>
                  <span>to close</span>
                </span>

                <div className="flex items-center gap-3 ml-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowEditClientModal(false)}
                    className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateClient.isPending}
                    className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground cursor-pointer transition-all"
                  >
                    {updateClient.isPending ? 'Saving...' : 'Save Retainer Details'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* CLIENT FINANCIAL STATEMENT & LEDGER SIDE BAR DRAWER */}
      <Dialog open={Boolean(selectedClientForLedger)} onOpenChange={(open) => !open && setSelectedClientForLedger(null)}>
        {selectedClientForLedger && activeClientLedger && (
          <DialogContent variant="side" size="xl" className="flex flex-col h-full bg-card text-foreground text-xs p-0">
            <DialogHeader className="p-5 bg-secondary/40 pr-12">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>Client Statement & Ledger: {activeClientLedger.client.company || activeClientLedger.client.name}</span>
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {activeClientLedger.client.contactName || activeClientLedger.client.name} · {activeClientLedger.client.servicePlan || 'Retainer'} · Complete statement of invoices, receipts, and dues
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Top KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-secondary/50 ">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Invoiced</span>
                <div className="text-lg font-bold text-foreground mt-0.5 tabular-nums">{formatINR(activeClientLedger.totalInvoiced)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{activeClientLedger.invoicesCount} invoices issued</div>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 ">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Collected / Paid</span>
                <div className="text-lg font-bold text-foreground mt-0.5 tabular-nums">{formatINR(activeClientLedger.totalPaid)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{activeClientLedger.receiptsCount} receipts cleared</div>
              </div>
              <div className={`p-3 rounded-xl ${activeClientLedger.totalPending > 0 ? 'bg-secondary ' : 'bg-secondary/50 '}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Balance Due</span>
                <div className={`text-lg font-bold mt-0.5 tabular-nums ${activeClientLedger.totalPending > 0 ? 'text-foreground font-extrabold' : 'text-foreground'}`}>
                  {formatINR(activeClientLedger.totalPending)}
                </div>
                <div className="text-[10px] mt-0.5 text-muted-foreground font-medium">
                  {activeClientLedger.totalPending > 0 ? 'Outstanding client balance' : 'All clear / no balance'}
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-card">
                <div className="p-2.5 bg-secondary/60 flex items-center justify-between">
                  <span className="font-bold text-foreground text-[11px] uppercase tracking-wider tabular-nums">Invoices ({activeClientLedger.invoices.length})</span>
                  <span className="text-[10px] text-muted-foreground">Billed Services & Retainers</span>
                </div>
                <div className="responsive-table-container max-h-[220px] overflow-y-auto text-xs">
                  <table className="w-full min-w-[550px] text-left">
                    <thead className="bg-secondary text-muted-foreground font-semibold text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-right">Paid</th>
                        <th className="p-2.5 text-right">Balance Due</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.05]">
                      {activeClientLedger.invoices.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-4 text-center text-muted-foreground">
                            No invoices issued for this client yet.
                          </td>
                        </tr>
                      ) : (
                        activeClientLedger.invoices.map((inv) => (
                          <tr key={inv._id} className="hover:bg-secondary/40">
                            <td className="p-2.5 text-muted-foreground whitespace-nowrap tabular-nums">{formatDateIST(inv.invoiceDate || inv.createdAt)}</td>
                            <td className="p-2.5 font-bold text-foreground tabular-nums">{inv.invoiceNumber}</td>
                            <td className="p-2.5 text-muted-foreground whitespace-nowrap tabular-nums">{formatDateIST(inv.dueDate)}</td>
                            <td className="p-2.5 text-right font-bold text-foreground tabular-nums">{formatINR(inv.total || inv.totalAmount)}</td>
                            <td className="p-2.5 text-right text-muted-foreground font-semibold tabular-nums">{formatINR(inv.paidAmount || 0)}</td>
                            <td className="p-2.5 text-right font-bold text-foreground tabular-nums">
                              {formatINR(inv.balanceAmount != null ? inv.balanceAmount : Math.max(0, (inv.total || 0) - (inv.paidAmount || 0)))}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                inv.status === 'paid'
                                  ? 'bg-primary text-primary-foreground'
                                  : inv.status === 'partially_paid'
                                  ? 'bg-secondary text-foreground '
                                  : 'bg-muted text-muted-foreground '
                              }`}>
                                {inv.status?.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Receipts List */}
              <div className="rounded-xl overflow-hidden bg-card">
                <div className="p-2.5 bg-secondary/60 flex items-center justify-between">
                  <span className="font-bold text-foreground text-[11px] uppercase tracking-wider tabular-nums">Payment Receipts Received ({activeClientLedger.receipts.length})</span>
                  <span className="text-[10px] text-muted-foreground">Collected in Bank / UPI / Cash</span>
                </div>
                <div className="responsive-table-container max-h-[180px] overflow-y-auto text-xs">
                  <table className="w-full min-w-[450px] text-left">
                    <thead className="bg-secondary text-muted-foreground font-semibold text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5">Date Received</th>
                        <th className="p-2.5">Payment Mode</th>
                        <th className="p-2.5">Reference / UTR</th>
                        <th className="p-2.5 text-right">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.05]">
                      {activeClientLedger.receipts.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-4 text-center text-muted-foreground">
                            No payment receipts recorded for this client yet.
                          </td>
                        </tr>
                      ) : (
                        activeClientLedger.receipts.map((r) => (
                          <tr key={r._id} className="hover:bg-secondary/40">
                            <td className="p-2.5 text-muted-foreground whitespace-nowrap tabular-nums">{formatDateIST(r.receivedDate || r.createdAt)}</td>
                            <td className="p-2.5 font-semibold text-foreground">{r.paymentMode || 'Bank'}</td>
                            <td className="p-2.5 font-mono text-muted-foreground tabular-nums">{r.reference || '-'}</td>
                            <td className="p-2.5 text-right font-bold text-foreground tabular-nums">+{formatINR(r.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            </div>

            <div className="p-4 bg-secondary/40 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientForLedger(null);
                    onQuickAdd('invoice');
                  }}
                  className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Issue Invoice
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientForLedger(null);
                    onQuickAdd('receipt');
                  }}
                  className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Record Receipt
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClientForLedger(null)}
                className="px-4 py-1.5 rounded-lg text-foreground font-semibold text-xs hover:bg-secondary cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
