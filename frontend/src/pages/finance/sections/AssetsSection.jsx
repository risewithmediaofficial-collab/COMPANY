import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Laptop,
  Mic,
  Trash2,
  Edit3,
  X,
} from '@/components/ui/muiIcons';
import api from '../../../api';
import { formatINR } from '../../../utils/financeFormatters';
import { toast } from 'sonner';

const CATEGORIES = [
  'Laptops & Computers',
  'Cameras & Lenses',
  'Audio & Microphones',
  'Lighting & Studio',
  'Office Equipment',
  'Drones & Gimbals',
  'Storage & Networking',
  'Other',
];

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs Repair', 'Retired / Written Off'];

export default function AssetsSection() {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0, activeCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Laptops & Computers',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseCost: '',
    condition: 'Good',
    status: 'In Use',
    assignedToName: '',
    location: 'Headquarters',
    notes: '',
  });

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/company-assets');
      if (res.data?.success) {
        setAssets(res.data.assets || []);
        setStats(res.data.stats || { totalItems: 0, totalValue: 0, activeCount: 0 });
      }
    } catch (err) {
      console.error('fetchAssets error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Asset name is required');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/finance/company-assets', formData);
      toast.success('Asset added successfully');
      setShowModal(false);
      setFormData({
        name: '',
        category: 'Laptops & Computers',
        brand: '',
        model: '',
        serialNumber: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        purchaseCost: '',
        condition: 'Good',
        status: 'In Use',
        assignedToName: '',
        location: 'Headquarters',
        notes: '',
      });
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await api.delete(`/finance/company-assets/${id}`);
      toast.success('Asset deleted');
      fetchAssets();
    } catch (err) {
      toast.error('Failed to delete asset');
    }
  };

  const filteredAssets = assets.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      (a.brand || '').toLowerCase().includes(q) ||
      (a.serialNumber || '').toLowerCase().includes(q) ||
      (a.assignedToName || '').toLowerCase().includes(q);
    const matchesCat = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── KPI METRICS CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Asset Value</span>
            <IndianRupee size={16} className="text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {formatINR(stats.totalValue || 0)}
          </div>
          <p className="text-[11px] text-muted-foreground">Capital equipment investment</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Equipment Items</span>
            <Package size={16} className="text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {stats.totalItems || 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Tracked company hardware</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Active In Use</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.activeCount || 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Operational and assigned</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Under Maintenance</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {stats.inMaintenanceCount || 0}
          </div>
          <p className="text-[11px] text-muted-foreground">In repair or servicing</p>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assets (MacBook, Sony Camera, Rode Mic, Serial #)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border/50 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-background border border-border/50 text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">All Asset Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-xs min-h-[36px]"
          >
            <Plus size={14} />
            <span>Add Equipment</span>
          </button>
        </div>
      </div>

      {/* ── ASSETS TABLE ────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-bold">
                <th className="py-3 px-4">Item & Brand</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Purchase Date</th>
                <th className="py-3 px-4">Purchase Cost</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading equipment inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No assets recorded yet. Click "Add Equipment" to log cameras, laptops, mics, and gear.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset._id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">{asset.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {asset.brand} {asset.model}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary text-foreground">
                        {asset.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {asset.serialNumber || '—'}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-muted-foreground">
                      {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground tabular-nums">
                      {formatINR(asset.purchaseCost)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          asset.condition === 'Excellent' || asset.condition === 'Good'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : asset.condition === 'Fair'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {asset.condition}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {asset.assignedToName || asset.assignedTo?.name || 'In Studio Inventory'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(asset._id)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Delete asset"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD ASSET MODAL ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border/50 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Package size={18} className="text-primary" />
                <span>Add Equipment / Asset</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro M3 Max, Sony A7S III"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Brand / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="Apple, Sony, Rode, Dell..."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
                  >
                  </input>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Serial Number</label>
                  <input
                    type="text"
                    placeholder="SN12345678"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Assigned Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Editor, Studio A"
                    value={formData.assignedToName}
                    onChange={(e) => setFormData({ ...formData, assignedToName: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Location</label>
                  <input
                    type="text"
                    placeholder="Headquarters, Studio, Remote"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-secondary text-foreground font-semibold hover:bg-secondary/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
