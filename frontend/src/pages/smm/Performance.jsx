import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Target, MousePointer, Edit3, Sliders, RefreshCw, Plus } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { PlatformBadge } from '../../components/smm/PlatformBadge';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

export default function Performance() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [metrics, setMetrics] = useState({
    reach: 0, impressions: 0, frequency: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0,
    spend: 0, leads: 0, purchases: 0, revenue: 0, roas: 0, videoViews: 0,
    engagement: 0, shares: 0, comments: 0, likes: 0, landingPageViews: 0,
    costPerLead: 0, costPerPurchase: 0
  });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await smmApi.getCampaigns({ search });
      if (res.data?.success) setCampaigns(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [search]);

  const openUpdate = (camp) => {
    setSelectedCampaign(camp);
    setMetrics({ ...camp.performance });
    setIsDrawerOpen(true);
  };

  const handleSaveMetrics = async (e) => {
    e.preventDefault();
    try {
      const imp = Number(metrics.impressions) || 0;
      const clk = Number(metrics.clicks) || 0;
      const spd = Number(metrics.spend) || 0;
      const lds = Number(metrics.leads) || 0;
      const rev = Number(metrics.revenue) || 0;

      const calculated = {
        ...metrics,
        leads: lds,
        spend: spd,
        revenue: rev,
        impressions: imp,
        clicks: clk,
        ctr: imp > 0 ? Number(((clk / imp) * 100).toFixed(2)) : Number(metrics.ctr || 0),
        cpc: clk > 0 ? Number((spd / clk).toFixed(2)) : Number(metrics.cpc || 0),
        cpm: imp > 0 ? Number(((spd / imp) * 1000).toFixed(2)) : Number(metrics.cpm || 0),
        costPerLead: lds > 0 ? Number((spd / lds).toFixed(2)) : Number(metrics.costPerLead || 0),
        roas: spd > 0 ? Number((rev / spd).toFixed(2)) : Number(metrics.roas || 0),
      };

      await smmApi.updatePerformance(selectedCampaign._id, calculated);
      toast.success('Leads & campaign metrics updated successfully!');
      setIsDrawerOpen(false);
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to update metrics');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Campaign',
      render: (row) => (
        <div>
          <span className="font-semibold text-foreground block">{row.name}</span>
          <PlatformBadge platform={row.platform} />
        </div>
      ),
    },
    {
      key: 'leads',
      label: 'Leads Generated',
      render: (row) => (
        <div>
          <span className="text-xs font-bold text-emerald-600 block">{row.performance?.leads || 0} Leads</span>
          <span className="text-[11px] text-muted-foreground">₹{row.performance?.costPerLead || 0} / Lead</span>
        </div>
      ),
    },
    {
      key: 'spend',
      label: 'Ad Spend',
      render: (row) => <span className="text-xs font-mono font-bold">₹{(row.performance?.spend || 0).toLocaleString()}</span>,
    },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (row) => <span className="text-xs font-mono text-emerald-600 font-bold">₹{(row.performance?.revenue || 0).toLocaleString()}</span>,
    },
    {
      key: 'roas',
      label: 'ROAS',
      render: (row) => <span className="text-xs font-bold text-primary">{row.performance?.roas || 0}x</span>,
    },
    {
      key: 'impressions',
      label: 'Impressions / Clicks',
      render: (row) => (
        <div className="text-xs">
          <span>{(row.performance?.impressions || 0).toLocaleString()} imp</span>
          <span className="text-muted-foreground block">{(row.performance?.clicks || 0).toLocaleString()} clicks</span>
        </div>
      ),
    },
    {
      key: 'ctr',
      label: 'CTR / CPC',
      render: (row) => (
        <div className="text-xs">
          <span className="font-semibold">{row.performance?.ctr || 0}% CTR</span>
          <span className="text-muted-foreground block">₹{row.performance?.cpc || 0} CPC</span>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Log Leads',
      render: (row) => (
        <button onClick={() => openUpdate(row)} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200">
          <Target size={13} /> Log Leads & Metrics
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Performance & Lead Logging"
        subtitle="Log leads generated, ad spend, revenue, and auto-calculate CPL & ROAS"
      />

      <SMMSubNav />

      <div className="bg-card p-4 rounded-2xl border border-border">
        <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search performance by campaign name..." />
      </div>

      <DataTable
        data={campaigns}
        columns={columns}
        loading={loading}
        emptyTitle="No campaign performance records found"
      />

      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Log Leads & Metrics — ${selectedCampaign?.name}`}
      >
        <form onSubmit={handleSaveMetrics} className="space-y-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-200 rounded-2xl space-y-1">
            <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Direct Lead & Spend Entry</h4>
            <p className="text-xs text-emerald-600">Enter total leads generated and ad spend for automatic CPL & ROAS calculation</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Leads Generated *</label>
              <input
                type="number"
                required
                value={metrics.leads}
                onChange={e => setMetrics({...metrics, leads: Number(e.target.value)})}
                className="app-input font-bold text-emerald-600 text-base"
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Total Ad Spend (₹)</label>
              <input
                type="number"
                value={metrics.spend}
                onChange={e => setMetrics({...metrics, spend: Number(e.target.value)})}
                className="app-input font-mono"
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Total Revenue Generated (₹)</label>
              <input
                type="number"
                value={metrics.revenue}
                onChange={e => setMetrics({...metrics, revenue: Number(e.target.value)})}
                className="app-input font-mono text-emerald-600"
                placeholder="e.g. 25000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Purchases Count</label>
              <input
                type="number"
                value={metrics.purchases}
                onChange={e => setMetrics({...metrics, purchases: Number(e.target.value)})}
                className="app-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Impressions Count</label>
              <input
                type="number"
                value={metrics.impressions}
                onChange={e => setMetrics({...metrics, impressions: Number(e.target.value)})}
                className="app-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Clicks Count</label>
              <input
                type="number"
                value={metrics.clicks}
                onChange={e => setMetrics({...metrics, clicks: Number(e.target.value)})}
                className="app-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Reach Count</label>
              <input
                type="number"
                value={metrics.reach}
                onChange={e => setMetrics({...metrics, reach: Number(e.target.value)})}
                className="app-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Video Views Count</label>
              <input
                type="number"
                value={metrics.videoViews}
                onChange={e => setMetrics({...metrics, videoViews: Number(e.target.value)})}
                className="app-input"
              />
            </div>
          </div>

          <div className="p-3 bg-secondary/40 rounded-xl border border-border text-xs text-muted-foreground">
            💡 CTR, CPC, CPM, Cost Per Lead (CPL), and ROAS will automatically recalculate upon saving.
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90">Save Lead Log</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
