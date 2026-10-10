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
} from 'lucide-react';
import { useClients, useUpdateClient } from '../../../hooks/useClients';
import { useQueryClient } from '@tanstack/react-query';
import {
  useClientProfitability,
  useGenerateRetainerInvoices,
  useCreateCostAllocation,
  useDeleteCostAllocation,
  useModuleInvoices,
  usePaymentReceipts,
} from '../../../hooks/useFinance';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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

  const generateRetainers = useGenerateRetainerInvoices();
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

  const handleGenerateRetainers = async () => {
    if (!retainerPeriod) return toast.error('Enter service period');
    try {
      await generateRetainers.mutateAsync({ servicePeriod: retainerPeriod });
    } catch (err) {}
  };

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
      {/* Top Banner & Retainer Generator Bar */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-5 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-indigo-300 text-[11px] font-bold uppercase tracking-wider">Client Master & Retainers</span>
          <h2 className="text-xl font-bold mt-0.5">Recurring Retainer Billing Engine</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Automatically generate tax-compliant monthly retainer invoices for all active clients. Built-in idempotency safeguards prevent duplicate billing for the same service period.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-xs border border-white/10">
          <input
            type="text"
            value={retainerPeriod}
            onChange={(e) => setRetainerPeriod(e.target.value)}
            placeholder="e.g. October 2026"
            className="bg-white/20 border-none rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-300 focus:ring-1 focus:ring-white"
          />
          <button
            onClick={handleGenerateRetainers}
            disabled={generateRetainers.isPending}
            className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 font-semibold text-xs rounded-lg transition-colors shadow-xs disabled:opacity-50 shrink-0"
          >
            {generateRetainers.isPending ? 'Generating...' : '⚡ Generate Retainers'}
          </button>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search client, business name, or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Profitability CSV
          </button>
          <button
            onClick={() => onQuickAdd('client')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            + New Client Master
          </button>
        </div>
      </div>

      {/* Client Master & Profitability Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Retainer Clients & Contribution Margins</h3>
            <p className="text-xs text-slate-500">
              Period: <strong className="text-slate-800">{retainerPeriod}</strong> (Reconciled Revenue − Direct Costs − Overhead = Net Margin)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[580px] text-xs">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Client / Business</th>
                <th className="p-3">Plan & Deliverables</th>
                <th className="p-3">Billing Date</th>
                <th className="p-3">Monthly Plan Fee</th>
                <th className="p-3">Direct Costs</th>
                <th className="p-3">Net Client Profit</th>
                <th className="p-3">Profit Margin</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
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
                    <tr key={client._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedClientForLedger(client)}
                          className="font-bold text-slate-900 hover:text-indigo-600 text-left hover:underline cursor-pointer flex items-center gap-1.5 group"
                          title="Click to view full financial ledger & invoices statement"
                        >
                          <span>{client.company || client.name}</span>
                          <Receipt className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </button>
                        <div className="text-[11px] text-slate-500">{client.contactName || client.name} · {client.email || '-'}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800">{client.servicePlan || 'Retainer'}</span>
                        <div className="text-[11px] text-indigo-600 font-medium">{client.deliverables || 'Deliverables not set'}</div>
                      </td>
                      <td className="p-3 text-slate-600">
                        Day {client.billingDate || 1} of month ({client.billingCycle || 'monthly'})
                      </td>
                      <td className="p-3 font-bold text-slate-900 text-sm">
                        {formatINR(planFee)}
                      </td>
                      <td className="p-3 text-slate-700 font-medium">
                        {formatINR(directCosts)}
                      </td>
                      <td className="p-3">
                        <span className={`font-bold text-sm ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatINR(netProfit)}
                        </span>
                      </td>
                      <td className="p-3">
                        {margin !== null ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              margin >= 40
                                ? 'bg-emerald-100 text-emerald-800'
                                : margin >= 20
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {margin}%
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedClientForLedger(client)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer"
                            title="Open Invoices, Receipts & Dues Statement"
                          >
                            <Receipt className="h-3 w-3" /> Ledger
                          </button>
                          <button
                            onClick={() => handleOpenEditClient(client)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                            title="Edit Plan Fee, Deliverables & Billing"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedClientForCost(client);
                              setShowCostModal(true);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            + Cost
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
          <DialogContent variant="center" size="sm" className="rounded-2xl border-border bg-card p-6 shadow-2xl max-w-md text-xs">
            <DialogHeader className="border-b border-border pb-3 mb-4 pr-10">
              <DialogTitle className="text-base font-bold text-foreground">
                Assign Cost to {selectedClientForCost.company || selectedClientForCost.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                Period: {retainerPeriod}. Distribute direct service cost (editing, design, shoot) without creating another agency expense.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveAllocation} className="space-y-4">
              <div>
                <label className="block font-semibold text-foreground mb-1.5">Activity / Deliverable *</label>
                <select
                  value={allocForm.activityDeliverable}
                  onChange={(e) => setAllocForm({ ...allocForm, activityDeliverable: e.target.value })}
                  className="w-full h-9.5 rounded-xl border border-border px-3 text-xs text-foreground bg-background shadow-2xs"
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
                <label className="block font-semibold text-foreground mb-1.5">Cost Type</label>
                <select
                  value={allocForm.costType}
                  onChange={(e) => setAllocForm({ ...allocForm, costType: e.target.value })}
                  className="w-full h-9.5 rounded-xl border border-border px-3 text-xs text-foreground bg-background shadow-2xs"
                >
                  <option value="direct">Direct Service Cost (Reduces Contribution)</option>
                  <option value="overhead">Shared Overhead (Reduces Net Profit)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1.5">Cost Amount (₹) *</label>
                <input
                  type="number"
                  value={allocForm.allocatedAmount}
                  onChange={(e) => setAllocForm({ ...allocForm, allocatedAmount: e.target.value })}
                  placeholder="e.g. 4000"
                  required
                  className="w-full h-9.5 rounded-xl border border-border px-3 text-xs font-semibold text-foreground bg-background shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1.5">Notes</label>
                <input
                  type="text"
                  value={allocForm.notes}
                  onChange={(e) => setAllocForm({ ...allocForm, notes: e.target.value })}
                  placeholder="e.g. 8 Reels edited by senior editor"
                  className="w-full h-9.5 rounded-xl border border-border px-3 text-xs text-foreground bg-background shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCostModal(false)}
                  className="h-9.5 px-4.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAllocation.isPending}
                  className="h-9.5 px-5.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {createAllocation.isPending ? 'Assigning...' : 'Assign Cost'}
                </button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* EDIT CLIENT RETAINER MODAL */}
      <Dialog open={Boolean(showEditClientModal && editingClient)} onOpenChange={(open) => !open && setShowEditClientModal(false)}>
        {showEditClientModal && editingClient && (
          <DialogContent variant="center" size="md" className="rounded-2xl border-border bg-card p-6 shadow-2xl max-w-lg text-xs max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-border pb-3 mb-4 pr-10">
              <DialogTitle className="text-base font-bold text-foreground">
                Edit Retainer Plan: {editingClient.company || editingClient.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                Update monthly recurring fee, contracted deliverables, and billing dates. This immediately recalculates client net profit and margins.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-foreground mb-1.5">Monthly Plan Fee (₹) *</label>
                  <input
                    type="number"
                    value={clientForm.monthlyPlanFee}
                    onChange={(e) => setClientForm({ ...clientForm, monthlyPlanFee: e.target.value })}
                    placeholder="e.g. 25000"
                    required
                    min="0"
                    className="w-full h-9.5 rounded-xl border border-border px-3 text-xs font-bold text-foreground bg-background shadow-2xs focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Amount billed recurringly each month</span>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1.5">Service Plan / Package</label>
                  <input
                    type="text"
                    value={clientForm.servicePlan}
                    onChange={(e) => setClientForm({ ...clientForm, servicePlan: e.target.value })}
                    placeholder="e.g. Retainer, Social Media"
                    className="w-full h-9.5 rounded-xl border border-border px-3 text-xs text-foreground bg-background shadow-2xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1.5">Contracted Deliverables</label>
                <textarea
                  rows="2"
                  value={clientForm.deliverables}
                  onChange={(e) => setClientForm({ ...clientForm, deliverables: e.target.value })}
                  placeholder="e.g. 12 Reels, 15 Graphic Posts, Ad Campaign Management"
                  className="w-full rounded-xl border border-border p-3 text-xs text-foreground bg-background shadow-2xs focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-foreground mb-1.5">Billing Day of Month</label>
                  <select
                    value={clientForm.billingDate}
                    onChange={(e) => setClientForm({ ...clientForm, billingDate: e.target.value })}
                    className="w-full h-9.5 rounded-xl border border-border px-3 text-xs text-foreground bg-background shadow-2xs focus:ring-1 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d} of month
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1.5">Billing Cycle</label>
                  <select
                    value={clientForm.billingCycle}
                    onChange={(e) => setClientForm({ ...clientForm, billingCycle: e.target.value })}
                    className="w-full h-9.5 rounded-xl border border-border px-3 text-xs text-foreground bg-background shadow-2xs focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                    <option value="one_time">One-time / Milestone</option>
                  </select>
                </div>
              </div>

              {/* Direct Cost Allocations for this client in current period */}
              {(() => {
                const clientProf = profitability.find((p) => String(p.clientId) === String(editingClient._id));
                const clientAllocations = clientProf?.allocations || [];
                if (clientAllocations.length === 0) return null;

                return (
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-xs">
                        Direct Costs in {retainerPeriod} ({clientAllocations.length})
                      </span>
                      <span className="text-[11px] font-semibold text-rose-600">
                        Total: {formatINR(clientProf?.directCosts || 0)}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {clientAllocations.map((alloc) => (
                        <div
                          key={alloc._id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{alloc.activityDeliverable}</span>
                            {alloc.notes && <span className="text-slate-500 ml-1.5">· {alloc.notes}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-rose-600">{formatINR(alloc.allocatedAmount)}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Delete this ${formatINR(alloc.allocatedAmount)} cost allocation?`)) {
                                  await deleteAllocation.mutateAsync(alloc._id);
                                  queryClient.invalidateQueries({ queryKey: ['finance-client-profitability'] });
                                }
                              }}
                              disabled={deleteAllocation.isPending}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Cost Allocation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditClientModal(false)}
                  className="h-9.5 px-4.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateClient.isPending}
                  className="h-9.5 px-5.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updateClient.isPending ? 'Saving...' : 'Save Retainer Details'}
                </button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* CLIENT FINANCIAL STATEMENT & LEDGER MODAL */}
      <Dialog open={Boolean(selectedClientForLedger)} onOpenChange={(open) => !open && setSelectedClientForLedger(null)}>
        {selectedClientForLedger && activeClientLedger && (
          <DialogContent variant="center" size="lg" className="rounded-2xl p-6 text-xs max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-border pb-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-indigo-600" />
                    <span>Client Ledger: {activeClientLedger.client.company || activeClientLedger.client.name}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Complete statement of all invoices, collected payments, and pending client dues
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Top KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Invoiced</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{formatINR(activeClientLedger.totalInvoiced)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{activeClientLedger.invoicesCount} invoices issued</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Collected / Paid</span>
                <div className="text-lg font-bold text-emerald-800 mt-0.5">{formatINR(activeClientLedger.totalPaid)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">{activeClientLedger.receiptsCount} receipts cleared</div>
              </div>
              <div className={`p-3 rounded-xl border ${activeClientLedger.totalPending > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${activeClientLedger.totalPending > 0 ? 'text-amber-800' : 'text-slate-500'}`}>Pending Balance Due</span>
                <div className={`text-lg font-bold mt-0.5 ${activeClientLedger.totalPending > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-900'}`}>
                  {formatINR(activeClientLedger.totalPending)}
                </div>
                <div className={`text-[10px] mt-0.5 ${activeClientLedger.totalPending > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                  {activeClientLedger.totalPending > 0 ? 'Outstanding client balance' : 'All clear / no balance'}
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Invoices ({activeClientLedger.invoices.length})</span>
                  <span className="text-[10px] text-slate-500">Billed Services & Retainers</span>
                </div>
                <div className="overflow-x-auto max-h-[220px] overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase sticky top-0">
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
                    <tbody className="divide-y divide-slate-100">
                      {activeClientLedger.invoices.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-4 text-center text-slate-400">
                            No invoices issued for this client yet.
                          </td>
                        </tr>
                      ) : (
                        activeClientLedger.invoices.map((inv) => (
                          <tr key={inv._id} className="hover:bg-slate-50/50">
                            <td className="p-2.5 text-slate-600 whitespace-nowrap">{formatDateIST(inv.invoiceDate || inv.createdAt)}</td>
                            <td className="p-2.5 font-bold text-slate-900">{inv.invoiceNumber}</td>
                            <td className="p-2.5 text-slate-500 whitespace-nowrap">{formatDateIST(inv.dueDate)}</td>
                            <td className="p-2.5 text-right font-bold text-slate-900">{formatINR(inv.total || inv.totalAmount)}</td>
                            <td className="p-2.5 text-right text-emerald-600 font-semibold">{formatINR(inv.paidAmount || 0)}</td>
                            <td className="p-2.5 text-right font-bold text-rose-600">
                              {formatINR(inv.balanceAmount != null ? inv.balanceAmount : Math.max(0, (inv.total || 0) - (inv.paidAmount || 0)))}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                inv.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.status === 'partially_paid'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
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
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Payment Receipts Received ({activeClientLedger.receipts.length})</span>
                  <span className="text-[10px] text-slate-500">Collected in Bank / UPI / Cash</span>
                </div>
                <div className="overflow-x-auto max-h-[180px] overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5">Date Received</th>
                        <th className="p-2.5">Payment Mode</th>
                        <th className="p-2.5">Reference / UTR</th>
                        <th className="p-2.5 text-right">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeClientLedger.receipts.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-4 text-center text-slate-400">
                            No payment receipts recorded for this client yet.
                          </td>
                        </tr>
                      ) : (
                        activeClientLedger.receipts.map((r) => (
                          <tr key={r._id} className="hover:bg-slate-50/50">
                            <td className="p-2.5 text-slate-600 whitespace-nowrap">{formatDateIST(r.receivedDate || r.createdAt)}</td>
                            <td className="p-2.5 font-semibold text-slate-800">{r.paymentMode || 'Bank'}</td>
                            <td className="p-2.5 font-mono text-slate-500">{r.reference || '-'}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-600">+{formatINR(r.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border mt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientForLedger(null);
                    onQuickAdd('invoice');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + Issue Invoice
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientForLedger(null);
                    onQuickAdd('receipt');
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + Record Receipt
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClientForLedger(null)}
                className="px-4 py-1.5 rounded-lg border border-border text-foreground font-semibold text-xs hover:bg-muted cursor-pointer"
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
