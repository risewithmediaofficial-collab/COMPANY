import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Target, MousePointer, Edit3, Sliders, RefreshCw, Plus, Calendar, Trash2 } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { PlatformBadge } from '../../components/smm/PlatformBadge';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function Performance() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCampaignForLog, setActiveCampaignForLog] = useState(null);
  const [isDailyLogDrawerOpen, setIsDailyLogDrawerOpen] = useState(false);

  const [dailyLogForm, setDailyLogForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    leads: 0,
    spend: 0,
    revenue: 0,
    clicks: 0,
    impressions: 0,
    notes: '',
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

  const openDailyLog = (camp) => {
    setActiveCampaignForLog(camp);
    setDailyLogForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      leads: 0,
      spend: 0,
      revenue: 0,
      clicks: 0,
      impressions: 0,
      notes: '',
    });
    setIsDailyLogDrawerOpen(true);
  };

  const handleAddDailyLog = async (e) => {
    e.preventDefault();
    try {
      const res = await smmApi.addDailyLog(activeCampaignForLog._id, dailyLogForm);
      if (res.data?.success) {
        toast.success('Daily lead log saved & campaign totals updated!');
        setActiveCampaignForLog(res.data.data);
        setDailyLogForm({
          date: format(new Date(), 'yyyy-MM-dd'),
          leads: 0,
          spend: 0,
          revenue: 0,
          clicks: 0,
          impressions: 0,
          notes: '',
        });
        fetchCampaigns();
      }
    } catch (err) {
      toast.error('Failed to add daily log entry');
    }
  };

  const handleDeleteDailyLog = async (logId) => {
    if (!window.confirm('Delete this daily log entry?')) return;
    try {
      const res = await smmApi.deleteDailyLog(activeCampaignForLog._id, logId);
      if (res.data?.success) {
        toast.success('Log entry deleted & campaign totals updated');
        setActiveCampaignForLog(res.data.data);
        fetchCampaigns();
      }
    } catch (err) {
      toast.error('Failed to delete log entry');
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
      label: 'Accumulated Leads',
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
      key: 'action',
      label: 'Daily Lead Log',
      render: (row) => (
        <button onClick={() => openDailyLog(row)} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200">
          <Calendar size={13} /> + Daily Lead Log
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Performance & Daily Lead Tracker"
        subtitle="Log leads got today/often, track daily entries, and auto-calculate cumulative CPL & ROAS"
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

      {/* Daily Lead Tracker Drawer */}
      <SMMDrawer
        isOpen={isDailyLogDrawerOpen}
        onClose={() => setIsDailyLogDrawerOpen(false)}
        title={`Daily Lead Log — ${activeCampaignForLog?.name}`}
      >
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-200 rounded-xl text-center">
              <span className="text-[11px] font-medium text-emerald-700 block">Total Leads</span>
              <span className="text-lg font-bold text-emerald-700">{activeCampaignForLog?.performance?.leads || 0}</span>
            </div>
            <div className="p-3 bg-secondary/50 border border-border rounded-xl text-center">
              <span className="text-[11px] font-medium text-muted-foreground block">Total Spend</span>
              <span className="text-base font-bold font-mono">₹{(activeCampaignForLog?.performance?.spend || 0).toLocaleString()}</span>
            </div>
            <div className="p-3 bg-secondary/50 border border-border rounded-xl text-center">
              <span className="text-[11px] font-medium text-muted-foreground block">Avg CPL</span>
              <span className="text-base font-bold font-mono text-primary">₹{activeCampaignForLog?.performance?.costPerLead || 0}</span>
            </div>
            <div className="p-3 bg-secondary/50 border border-border rounded-xl text-center">
              <span className="text-[11px] font-medium text-muted-foreground block">ROAS</span>
              <span className="text-base font-bold font-mono text-purple-600">{activeCampaignForLog?.performance?.roas || 0}x</span>
            </div>
          </div>

          {/* Add Daily Entry Form */}
          <form onSubmit={handleAddDailyLog} className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Plus size={14} className="text-primary" /> Add Daily Lead Entry
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Entry Date *</label>
                <input
                  type="date"
                  required
                  value={dailyLogForm.date}
                  onChange={e => setDailyLogForm({...dailyLogForm, date: e.target.value})}
                  className="app-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Leads Got Today *</label>
                <input
                  type="number"
                  required
                  value={dailyLogForm.leads}
                  onChange={e => setDailyLogForm({...dailyLogForm, leads: Number(e.target.value)})}
                  className="app-input font-bold text-emerald-600 text-base"
                  placeholder="e.g. 25"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Spend Today (₹) *</label>
                <input
                  type="number"
                  required
                  value={dailyLogForm.spend}
                  onChange={e => setDailyLogForm({...dailyLogForm, spend: Number(e.target.value)})}
                  className="app-input font-mono"
                  placeholder="e.g. 1500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Revenue Today (₹)</label>
                <input
                  type="number"
                  value={dailyLogForm.revenue}
                  onChange={e => setDailyLogForm({...dailyLogForm, revenue: Number(e.target.value)})}
                  className="app-input font-mono text-emerald-600"
                  placeholder="e.g. 10000"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground mb-1 block">Daily Note / Observation</label>
                <input
                  type="text"
                  value={dailyLogForm.notes}
                  onChange={e => setDailyLogForm({...dailyLogForm, notes: e.target.value})}
                  className="app-input"
                  placeholder="e.g. Campaign optimized for lead form placement"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="bg-emerald-600 text-white font-semibold px-5 py-2 rounded-xl text-xs hover:opacity-90">
                Log Entry & Accumulate Totals
              </button>
            </div>
          </form>

          {/* History Log List */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Daily Lead History</h4>
            {activeCampaignForLog?.dailyLogs?.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground italic border border-dashed border-border rounded-xl">
                No daily lead entries logged yet. Add your first entry above!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeCampaignForLog?.dailyLogs?.slice().reverse().map((log) => (
                  <div key={log._id} className="p-3 bg-card rounded-xl border border-border flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'Today'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                          +{log.leads} Leads
                        </span>
                        <span className="font-mono text-muted-foreground">₹{log.spend?.toLocaleString()} spent</span>
                      </div>
                      {log.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{log.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteDailyLog(log._id)}
                      className="p-1 rounded text-muted-foreground hover:text-rose-500 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SMMDrawer>
    </div>
  );
}
