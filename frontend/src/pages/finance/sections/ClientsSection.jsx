import { useState } from 'react';
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
} from 'lucide-react';
import { useClients } from '../../../hooks/useClients';
import {
  useClientProfitability,
  useGenerateRetainerInvoices,
  useCreateCostAllocation,
  useDeleteCostAllocation,
} from '../../../hooks/useFinance';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ClientsSection({ onQuickAdd }) {
  const [search, setSearch] = useState('');
  const [selectedClientForCost, setSelectedClientForCost] = useState(null);
  const [showCostModal, setShowCostModal] = useState(false);
  const [retainerPeriod, setRetainerPeriod] = useState(
    new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())
  );

  const { data: clients = [], isLoading } = useClients();
  const { data: profitability = [] } = useClientProfitability({ servicePeriod: retainerPeriod });

  const generateRetainers = useGenerateRetainerInvoices();
  const createAllocation = useCreateCostAllocation();

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

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
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
                        <div className="font-bold text-slate-900">{client.company || client.name}</div>
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
                        <button
                          onClick={() => {
                            setSelectedClientForCost(client);
                            setShowCostModal(true);
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 text-xs transition-colors"
                        >
                          + Assign Cost
                        </button>
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
              <p className="text-muted-foreground text-xs mt-0.5">
                Period: {retainerPeriod}. Distribute direct service cost (editing, design, shoot) without creating another agency expense.
              </p>
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
    </div>
  );
}
