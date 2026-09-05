import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, CheckCircle, SlidersHorizontal, CheckSquare, Trash2, Edit2, Layers, Calendar, Target, DollarSign, TrendingUp, AlertTriangle, Video, Sparkles, ArrowRight, Check, Film } from 'lucide-react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { PlatformBadge } from '../../components/smm/PlatformBadge';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { SMMDestinationSelector } from '../../components/smm/SMMDestinationSelector';
import { SMM_OBJECTIVES, getDestinationsForObjective } from '../../utils/smmDestinations';

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [crmClients, setCrmClients] = useState([]);
  const [crmProjects, setCrmProjects] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [videoList, setVideoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDailyLogDrawerOpen, setIsDailyLogDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [activeCampaignForLog, setActiveCampaignForLog] = useState(null);
  const [createdCampaignForNextStep, setCreatedCampaignForNextStep] = useState(null);

  const [formData, setFormData] = useState({
    name: '', client: '', project: '', sourceContentId: '', sourceContentIds: [],
    objective: 'Awareness', destination: 'Message Destination', destinationPlatforms: [], campaignType: 'New Campaign',
    status: 'Draft', platform: 'Meta', budgetType: 'Monthly Budget', dailyBudget: '',
    monthlyBudget: '', lifetimeBudget: '', deposited: '', amountAdded: 0, remainingBalance: 0, currency: 'INR', goal: '', landingPage: '', pixelConnected: false,
    conversionApiEnabled: false, startDate: '', endDate: '', internalNotes: ''
  });

  const [dailyLogForm, setDailyLogForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amountAdded: 0,
    spend: 0,
    leads: 0,
    messages: 0,
    calls: 0,
    revenue: 0,
    clicks: 0,
    impressions: 0,
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, clientRes, projRes, videosRes] = await Promise.all([
        smmApi.getCampaigns({ search, status: statusFilter, platform: platformFilter }),
        api.get('/clients'),
        api.get('/projects'),
        smmApi.getContents({ limit: 100 }),
      ]);

      if (campRes.data?.success) setCampaigns(campRes.data.data || []);
      if (clientRes.data) setCrmClients(clientRes.data.clients || clientRes.data.data || (Array.isArray(clientRes.data) ? clientRes.data : []));
      if (projRes.data) setCrmProjects(projRes.data.projects || projRes.data.data || (Array.isArray(projRes.data) ? projRes.data : []));
      if (videosRes.data?.success) setVideoList(videosRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load campaigns data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, platformFilter]);

  const handleBulkStatus = async (status) => {
    if (!selectedIds.length) return;
    try {
      await smmApi.bulkUpdateCampaignStatus({ ids: selectedIds, status });
      toast.success(`Updated ${selectedIds.length} campaigns to ${status}`);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error('Bulk update failed');
    }
  };

  const clientVideos = useMemo(() => {
    if (!formData.client) return videoList;
    return videoList.filter(v => {
      const vClientId = v.client?._id || v.client;
      return String(vClientId) === String(formData.client);
    });
  }, [videoList, formData.client]);

  const toggleVideoSelection = (videoId) => {
    const current = formData.sourceContentIds || [];
    const isSelected = current.includes(videoId);
    const updated = isSelected ? current.filter(id => id !== videoId) : [...current, videoId];

    let newName = formData.name;
    if (!formData.name || formData.name.includes('Campaign')) {
      const selectedVids = videoList.filter(v => updated.includes(v._id));
      if (selectedVids.length === 1) {
        newName = `${selectedVids[0].name} - Ad Campaign`;
      } else if (selectedVids.length > 1) {
        newName = `${selectedVids[0].name} + ${selectedVids.length - 1} Videos - Campaign`;
      }
    }

    setFormData(prev => ({
      ...prev,
      sourceContentIds: updated,
      sourceContentId: updated[0] || '',
      name: newName,
    }));
  };

  // Load projects whenever selected modal client changes
  useEffect(() => {
    if (!formData.client) {
      setProjectsList(crmProjects);
      return;
    }
    const loadClientProjects = async () => {
      setLoadingProjects(true);
      try {
        const [smmRes, crmRes] = await Promise.allSettled([
          smmApi.getProjects({ client: formData.client }),
          api.get('/projects', { params: { client: formData.client } }),
        ]);

        const smmList = smmRes.status === 'fulfilled' && smmRes.value.data?.success ? (smmRes.value.data.data || []) : [];
        const crmList = crmRes.status === 'fulfilled' && crmRes.value.data
          ? (crmRes.value.data.projects || crmRes.value.data.data || (Array.isArray(crmRes.value.data) ? crmRes.value.data : []))
          : [];

        const map = new Map();
        [...smmList, ...crmList].forEach(p => {
          if (p && p._id) map.set(String(p._id), p);
        });

        if (map.size === 0 && crmProjects.length > 0) {
          crmProjects
            .filter(p => String(p.client?._id || p.client) === String(formData.client))
            .forEach(p => map.set(String(p._id), p));
        }

        const combined = Array.from(map.values());
        setProjectsList(combined.length > 0 ? combined : crmProjects);
      } catch (err) {
        console.error('Failed to load client projects:', err);
        setProjectsList(crmProjects);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadClientProjects();
  }, [formData.client, crmProjects]);

  const handleMonthlyBudgetChange = (value) => {
    const val = value === '' ? '' : Number(value);
    const spent = editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0;
    setFormData(prev => {
      const daily = val !== '' && !isNaN(val) ? Math.round(val / 30) : '';
      const newDeposited = (prev.deposited === '' || prev.deposited === prev.monthlyBudget || prev.deposited === undefined) ? val : prev.deposited;
      const depNum = newDeposited === '' ? 0 : Number(newDeposited);
      const balance = Math.max(0, depNum - spent);
      return {
        ...prev,
        monthlyBudget: val,
        lifetimeBudget: val,
        dailyBudget: daily,
        deposited: newDeposited,
        amountAdded: newDeposited,
        remainingBalance: balance,
      };
    });
  };

  const handleDailyBudgetChange = (value) => {
    const val = value === '' ? '' : Number(value);
    const spent = editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0;
    setFormData(prev => {
      const monthly = val !== '' && !isNaN(val) ? Math.round(val * 30) : '';
      const newDeposited = (prev.deposited === '' || prev.deposited === prev.monthlyBudget || prev.deposited === undefined) ? monthly : prev.deposited;
      const depNum = newDeposited === '' ? 0 : Number(newDeposited);
      const balance = Math.max(0, depNum - spent);
      return {
        ...prev,
        dailyBudget: val,
        monthlyBudget: monthly,
        lifetimeBudget: monthly,
        deposited: newDeposited,
        amountAdded: newDeposited,
        remainingBalance: balance,
      };
    });
  };

  const handleDepositedChange = (value) => {
    const val = value === '' ? '' : Number(value);
    const spent = editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0;
    const depNum = val === '' ? 0 : Number(val);
    const balance = Math.max(0, depNum - spent);
    setFormData(prev => ({
      ...prev,
      deposited: val,
      amountAdded: val,
      remainingBalance: balance,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.client || !formData.project) {
      toast.error('Campaign Name, Client, and Project are required');
      return;
    }
    const cleanPayload = { ...formData };
    if (!cleanPayload.sourceContentId) delete cleanPayload.sourceContentId;
    if (!cleanPayload.startDate) delete cleanPayload.startDate;
    if (!cleanPayload.endDate) delete cleanPayload.endDate;

    const mBudget = cleanPayload.monthlyBudget !== '' && cleanPayload.monthlyBudget !== undefined
      ? Number(cleanPayload.monthlyBudget)
      : (Number(cleanPayload.lifetimeBudget) || 0);
    cleanPayload.monthlyBudget = mBudget;
    cleanPayload.lifetimeBudget = mBudget;
    cleanPayload.dailyBudget = cleanPayload.dailyBudget !== '' && cleanPayload.dailyBudget !== undefined
      ? Number(cleanPayload.dailyBudget)
      : 0;

    const spent = editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0;
    const depositedVal = cleanPayload.deposited !== '' && cleanPayload.deposited !== undefined
      ? Number(cleanPayload.deposited)
      : (cleanPayload.amountAdded !== '' && cleanPayload.amountAdded !== undefined
          ? Number(cleanPayload.amountAdded)
          : mBudget);

    cleanPayload.amountAdded = depositedVal;
    cleanPayload.remainingBalance = Math.max(0, depositedVal - spent);

    try {
      if (editingCampaign) {
        await smmApi.updateCampaign(editingCampaign._id, cleanPayload);
        toast.success('Campaign updated');
        setIsDrawerOpen(false);
        fetchData();
      } else {
        const res = await smmApi.createCampaign(cleanPayload);
        toast.success('Campaign created and added to ledger');
        setIsDrawerOpen(false);
        fetchData();
        if (res.data?.data) {
          setCreatedCampaignForNextStep(res.data.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save campaign');
    }
  };

  const openDailyLog = (camp) => {
    setActiveCampaignForLog(camp);
    setDailyLogForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      sourceContentId: camp.sourceContentId?._id || camp.sourceContentId || '',
      amountAdded: 0,
      spend: 0,
      leads: 0,
      messages: 0,
      calls: 0,
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
        toast.success('Daily lead & spend log saved! Campaign money balance updated.');
        setActiveCampaignForLog(res.data.data);
        setDailyLogForm({
          date: format(new Date(), 'yyyy-MM-dd'),
          sourceContentId: '',
          amountAdded: 0,
          spend: 0,
          leads: 0,
          messages: 0,
          calls: 0,
          revenue: 0,
          clicks: 0,
          impressions: 0,
          notes: '',
        });
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to add daily log entry');
    }
  };

  const openAdd = () => {
    setEditingCampaign(null);
    const defaultDests = getDestinationsForObjective('Awareness');
    setFormData({
      name: '',
      client: '',
      project: '',
      sourceContentId: '',
      sourceContentIds: [],
      objective: 'Awareness',
      destination: defaultDests[0]?.value || 'Message Destination',
      destinationPlatforms: [],
      campaignType: 'New Campaign',
      status: 'Draft',
      platform: 'Meta',
      budgetType: 'Monthly Budget',
      monthlyBudget: '',
      dailyBudget: '',
      deposited: '',
      lifetimeBudget: '',
      amountAdded: '',
      remainingBalance: 0,
      currency: 'INR',
      goal: '',
      landingPage: '',
      pixelConnected: false,
      conversionApiEnabled: false,
      startDate: '',
      endDate: '',
      internalNotes: ''
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (camp) => {
    setEditingCampaign(camp);
    const mBudget = camp.monthlyBudget ?? camp.lifetimeBudget ?? '';
    const dBudget = camp.dailyBudget ?? (mBudget ? Math.round(mBudget / 30) : '');
    const dep = camp.amountAdded ?? mBudget ?? '';
    const spent = camp.amountSpent || camp.performance?.spend || 0;
    const rem = camp.remainingBalance ?? Math.max(0, (Number(dep) || 0) - spent);
    const vIds = camp.sourceContentIds?.map(v => v._id || v) || (camp.sourceContentId ? [camp.sourceContentId._id || camp.sourceContentId] : []);
    const dests = getDestinationsForObjective(camp.objective || 'Awareness');
    setFormData({
      ...camp,
      client: camp.client?._id || camp.client || '',
      project: camp.project?._id || camp.project || '',
      sourceContentId: camp.sourceContentId?._id || camp.sourceContentId || vIds[0] || '',
      sourceContentIds: vIds,
      objective: camp.objective || 'Awareness',
      destination: camp.destination || dests[0]?.value || 'Message Destination',
      destinationPlatforms: camp.destinationPlatforms || [],
      budgetType: 'Monthly Budget',
      monthlyBudget: mBudget,
      dailyBudget: dBudget,
      deposited: dep,
      lifetimeBudget: mBudget,
      amountAdded: dep,
      remainingBalance: rem,
    });
    setIsDrawerOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === campaigns.length) setSelectedIds([]);
    else setSelectedIds(campaigns.map(c => c._id));
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const columns = [
    {
      key: 'select',
      label: (
        <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === campaigns.length} onChange={toggleSelectAll} className="rounded" />
      ),
      render: (row) => (
        <input type="checkbox" checked={selectedIds.includes(row._id)} onChange={() => toggleSelectOne(row._id)} className="rounded" />
      ),
    },
    {
      key: 'name',
      label: 'Campaign & Client',
      render: (row) => {
        const comp = row.client?.company || row.client?.companyName || '';
        const name = row.client?.name || '';
        const clientDisplay = comp && name && comp.toLowerCase() !== name.toLowerCase()
          ? `${comp} - ${name}`
          : (comp || name || 'No Client');
        return (
          <div>
            <span className="font-bold text-foreground block">{row.name}</span>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-semibold text-primary/80">{clientDisplay}</span>
              <span className="text-[10px] text-muted-foreground">• {row.objective}</span>
              {row.destination && (
                <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                  📍 {row.destination}
                </span>
              )}
              {row.sourceContentId && (
                <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                  🎥 Video Ad
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'monthlyBudget',
      label: 'Monthly Budget',
      render: (row) => {
        const mBudget = row.monthlyBudget || row.lifetimeBudget || (row.dailyBudget ? row.dailyBudget * 30 : 0) || row.amountAdded || 0;
        const dBudget = row.dailyBudget || (mBudget ? Math.round(mBudget / 30) : 0);
        return (
          <div>
            <span className="font-mono font-bold text-xs text-foreground block">₹{mBudget.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground font-mono">₹{dBudget.toLocaleString()}/day</span>
          </div>
        );
      },
    },
    {
      key: 'budgetDeposited',
      label: 'Budget Deposited',
      render: (row) => {
        const deposited = row.amountAdded || row.deposited || row.monthlyBudget || row.lifetimeBudget || 0;
        return (
          <div>
            <span className="font-mono font-bold text-xs text-blue-500 block">₹{deposited.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">Deposited</span>
          </div>
        );
      },
    },
    {
      key: 'balanceAmount',
      label: 'Balance Amount',
      render: (row) => {
        const deposited = row.amountAdded || row.deposited || row.monthlyBudget || row.lifetimeBudget || 0;
        const spent = row.amountSpent || row.performance?.spend || 0;
        const balance = Math.max(0, deposited - spent);
        const percent = deposited > 0 ? Math.min(100, Math.round((spent / deposited) * 100)) : 0;
        return (
          <div className="w-36 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{balance.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">Spent ₹{spent.toLocaleString()}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${percent >= 90 ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'leads',
      label: 'Leads & CPL',
      render: (row) => (
        <div>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">{row.performance?.leads || 0} Leads</span>
          <span className="text-[10px] text-muted-foreground font-mono">₹{row.performance?.costPerLead || 0} / Lead</span>
        </div>
      ),
    },
    {
      key: 'platform',
      label: 'Platform',
      render: (row) => <PlatformBadge platform={row.platform} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadgeSmm status={row.status} />,
    },
    {
      key: 'dailyLog',
      label: 'Daily Log',
      render: (row) => (
        <button
          onClick={() => openDailyLog(row)}
          className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold flex items-center gap-1 border border-primary/20"
        >
          <Calendar size={13} /> Log Spend/Leads
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns & Money Ledger"
        subtitle="Manage monthly & daily budgets, track Deposited vs Amount Spent, and monitor balance"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90">
            <Plus size={18} />
            Create Campaign
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns..." />
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="app-select w-36">
            <option value="">All Networks</option>
            <option value="Meta">Meta</option>
            <option value="Google">Google</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="app-select w-36">
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1.5 rounded-xl border border-border">
            <span className="text-xs font-bold text-foreground">{selectedIds.length} Selected</span>
            <button onClick={() => handleBulkStatus('Active')} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-500/20">Set Active</button>
            <button onClick={() => handleBulkStatus('Paused')} className="px-2.5 py-1 bg-orange-500/10 text-orange-600 rounded-lg text-xs font-semibold hover:bg-orange-500/20">Pause</button>
          </div>
        )}
      </div>

      <DataTable
        data={campaigns}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={async (id) => {
          if (!window.confirm('Delete campaign?')) return;
          await smmApi.deleteCampaign(id);
          fetchData();
        }}
        emptyTitle="No campaigns found"
      />

      {/* Log Spend & Leads Drawer */}
      <SMMDrawer
        isOpen={isDailyLogDrawerOpen}
        onClose={() => setIsDailyLogDrawerOpen(false)}
        title={`Log Daily Spend & Leads — ${activeCampaignForLog?.name}`}
      >
        <form onSubmit={handleAddDailyLog} className="space-y-4 text-xs">
          {/* Campaign Money Summary */}
          <div className="p-3.5 bg-secondary/40 border border-border rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Budget & Ledger Summary</span>
            <div className="flex items-center justify-between font-bold text-xs pt-1">
              <span className="text-blue-500">Deposited: ₹{(activeCampaignForLog?.amountAdded || 0).toLocaleString()}</span>
              <span className="text-rose-500">Spent: ₹{(activeCampaignForLog?.amountSpent || 0).toLocaleString()}</span>
              <span className="text-emerald-500">Balance: ₹{(activeCampaignForLog?.remainingBalance || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Select Video in Campaign */}
          {activeCampaignForLog && (
            <div>
              <label className="font-semibold text-foreground block mb-1">Select Video in Campaign (Optional)</label>
              <select
                value={dailyLogForm.sourceContentId || ''}
                onChange={e => setDailyLogForm({ ...dailyLogForm, sourceContentId: e.target.value })}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs"
              >
                <option value="">-- All Videos / Entire Campaign Level --</option>
                {(activeCampaignForLog.sourceContentIds || []).map(v => (
                  <option key={v._id || v} value={v._id || v}>
                    🎥 {v.name || 'Video'} ({v.contentType || 'Video'})
                  </option>
                ))}
                {activeCampaignForLog.sourceContentId && !activeCampaignForLog.sourceContentIds?.length && (
                  <option value={activeCampaignForLog.sourceContentId._id || activeCampaignForLog.sourceContentId}>
                    🎥 {activeCampaignForLog.sourceContentId.name || 'Campaign Video'}
                  </option>
                )}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Date</label>
              <input
                type="date"
                required
                value={dailyLogForm.date}
                onChange={e => setDailyLogForm({...dailyLogForm, date: e.target.value})}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-blue-500 block mb-1">Deposited Funds (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={dailyLogForm.amountAdded}
                onChange={e => setDailyLogForm({...dailyLogForm, amountAdded: Number(e.target.value)})}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-rose-500 block mb-1">Today's Spend (₹) *</label>
              <input
                type="number"
                required
                value={dailyLogForm.spend}
                onChange={e => setDailyLogForm({...dailyLogForm, spend: Number(e.target.value)})}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-emerald-500 block mb-1">Leads Generated</label>
              <input
                type="number"
                value={dailyLogForm.leads}
                onChange={e => setDailyLogForm({...dailyLogForm, leads: Number(e.target.value)})}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Budget scaled up today due to high conversion rate..."
              value={dailyLogForm.notes}
              onChange={e => setDailyLogForm({...dailyLogForm, notes: e.target.value})}
              className="w-full p-2.5 bg-background border border-border rounded-xl outline-none"
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button type="button" onClick={() => setIsDailyLogDrawerOpen(false)} className="px-4 py-2 bg-secondary text-foreground rounded-xl">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-xs">Save Ledger Entry</button>
          </div>
        </form>
      </SMMDrawer>

      {/* Create / Edit Campaign Drawer */}
      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Step 1: Client & Project Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Client *</label>
              <select
                required
                value={formData.client}
                onChange={e => setFormData({ ...formData, client: e.target.value, project: '', sourceContentIds: [] })}
                className="app-select"
              >
                <option value="">Select Client</option>
                {crmClients.map(c => {
                  const comp = c.company || c.companyName || '';
                  const name = c.name || '';
                  const display = comp && name && comp.toLowerCase() !== name.toLowerCase()
                    ? `${comp} - ${name}`
                    : (comp || name || 'Client');
                  return (
                    <option key={c._id} value={c._id}>
                      {display}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Project * {loadingProjects && <span className="text-[10px] text-muted-foreground font-normal">(Loading...)</span>}
              </label>
              <select
                required
                value={formData.project}
                onChange={e => setFormData({ ...formData, project: e.target.value })}
                className="app-select"
                disabled={loadingProjects}
              >
                <option value="">{projectsList.length > 0 ? 'Select Project' : '-- No Projects Found --'}</option>
                {projectsList.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Step 2: Multi-Video Selector from Database */}
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Select Videos to Run Ads (Multiple Allowed)
              </label>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
                {formData.sourceContentIds?.length || 0} Selected
              </span>
            </div>

            {!formData.client ? (
              <p className="text-[11px] text-muted-foreground italic py-2 text-center">
                👉 Please select a Client above to view their available videos and reels.
              </p>
            ) : clientVideos.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-2 text-center">
                No videos found for this client in database. You can still proceed with general campaign setup.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {clientVideos.map(v => {
                  const isChecked = (formData.sourceContentIds || []).includes(v._id);
                  return (
                    <div
                      key={v._id}
                      onClick={() => toggleVideoSelection(v._id)}
                      className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-purple-500/20 border-purple-500 text-purple-900 dark:text-purple-100 font-semibold'
                          : 'bg-background/80 hover:bg-background border-border text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-border'}`}>
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-medium truncate block">{v.name}</span>
                          <span className="text-[10px] text-muted-foreground block">{v.contentType || 'Video'} • {v.platforms?.join(', ') || 'Meta'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {v.adRecommendation === '🔥 HIGH POTENTIAL' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">🔥 Hot</span>
                        )}
                        <span className="text-[10px] text-muted-foreground uppercase">{v.status || 'Ready'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Campaign Name */}
          <div>
            <label className="font-semibold text-foreground block mb-1">Campaign Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="app-input"
              placeholder="e.g. August Restaurant Lead Campaign"
            />
          </div>

          {/* Step 4: Platform & Objective */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Platform *</label>
              <select
                value={formData.platform}
                onChange={e => setFormData({ ...formData, platform: e.target.value })}
                className="app-select"
              >
                <option value="Meta">Meta Ads (IG & FB)</option>
                <option value="Google">Google Ads</option>
                <option value="LinkedIn">LinkedIn Ads</option>
                <option value="YouTube">YouTube Ads</option>
                <option value="TikTok">TikTok Ads</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">Objective *</label>
              <select
                value={formData.objective}
                onChange={e => {
                  const newObj = e.target.value;
                  const dests = getDestinationsForObjective(newObj);
                  const firstDest = dests[0]?.value || 'Message Destination';
                  const platforms = (firstDest === 'Instagram' || firstDest === 'Facebook')
                    ? [firstDest]
                    : (firstDest === 'Instagram & Facebook' ? ['Instagram', 'Facebook'] : []);
                  setFormData(prev => ({
                    ...prev,
                    objective: newObj,
                    destination: firstDest,
                    destinationPlatforms: platforms,
                  }));
                }}
                className="app-select font-semibold"
              >
                {SMM_OBJECTIVES.map(obj => (
                  <option key={obj} value={obj}>{obj}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Destination / Form Type Selector */}
          <SMMDestinationSelector
            objective={formData.objective}
            value={formData.destination}
            onChange={(newDest, platforms) => {
              setFormData(prev => ({
                ...prev,
                destination: newDest,
                destinationPlatforms: platforms || [],
              }));
            }}
            label="Target Destination / Conversion Location *"
          />

          {/* Step 5: Budget & Calculations (Monthly, Daily, Deposited, Balance Amount) */}
          <div className="bg-secondary/30 p-3.5 rounded-2xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={13} className="text-primary" /> Budget Calculations & Funds
              </h4>
              <span className="text-[10px] text-muted-foreground font-medium">Auto-calculated</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Monthly Budget (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.monthlyBudget ?? ''}
                  onChange={e => handleMonthlyBudgetChange(e.target.value)}
                  className="app-input font-bold text-foreground"
                  placeholder="e.g. 30000"
                />
                <span className="text-[10px] text-muted-foreground block mt-0.5">Calculates daily run-rate</span>
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Daily Budget (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.dailyBudget ?? ''}
                  onChange={e => handleDailyBudgetChange(e.target.value)}
                  className="app-input font-medium"
                  placeholder="e.g. 1000"
                />
                <span className="text-[10px] text-muted-foreground block mt-0.5">≈ Monthly ÷ 30</span>
              </div>
              <div>
                <label className="font-semibold text-blue-600 dark:text-blue-400 block mb-1">Deposited (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.deposited ?? ''}
                  onChange={e => handleDepositedChange(e.target.value)}
                  className="app-input font-bold text-blue-600 dark:text-blue-400 border-blue-500/30"
                  placeholder="e.g. 30000"
                />
                <span className="text-[10px] text-blue-500/80 block mt-0.5">Funds deposited for ads</span>
              </div>
            </div>

            {/* Calculated Balance Box: Deposited minus Spent */}
            {(() => {
              const dep = Number(formData.deposited !== '' && formData.deposited !== undefined ? formData.deposited : (formData.amountAdded || 0));
              const spent = Number(editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0);
              const bal = Math.max(0, dep - spent);
              return (
                <div className="p-3 bg-card rounded-xl border border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground text-xs block">Balance Amount</span>
                    <span className="text-[11px] text-muted-foreground">
                      {spent > 0
                        ? `Deposited ₹${dep.toLocaleString()} − Spent ₹${spent.toLocaleString()}`
                        : `Deposited funds available for ads (minus spend)`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{bal.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Step 6: Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="app-input"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="app-input"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="app-button-primary">Save Campaign</button>
          </div>
        </form>
      </SMMDrawer>

      {/* Post-Creation Prompt Modal: Campaign Created -> Create Ad Set */}
      {createdCampaignForNextStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle size={28} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-foreground">Campaign Created Successfully!</h3>
              <p className="text-xs text-muted-foreground">
                <strong>{createdCampaignForNextStep.name}</strong> is now configured in your ledger. Would you like to create the Ad Set & set audience targeting now?
              </p>
            </div>

            <div className="p-3 bg-secondary/50 rounded-2xl border border-border text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Client:</span>
                <span className="font-semibold text-foreground">{createdCampaignForNextStep.client?.company || createdCampaignForNextStep.client?.name}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Videos Attached:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {createdCampaignForNextStep.sourceContentIds?.length || (createdCampaignForNextStep.sourceContentId ? 1 : 0)} Videos
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Objective & Destination:</span>
                <span className="font-semibold text-primary">
                  {createdCampaignForNextStep.objective} • {createdCampaignForNextStep.destination || 'Message Destination'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Campaign Budget:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{(createdCampaignForNextStep.lifetimeBudget || createdCampaignForNextStep.amountAdded || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => {
                  const camp = createdCampaignForNextStep;
                  setCreatedCampaignForNextStep(null);
                  navigate('/smm/adsets', {
                    state: {
                      campaign: camp,
                      formType: camp.destination,
                      destinationPlatforms: camp.destinationPlatforms,
                    }
                  });
                }}
                className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
              >
                <Layers size={14} /> Create Ad Set & Targeting <ArrowRight size={14} />
              </button>
              <button
                onClick={() => setCreatedCampaignForNextStep(null)}
                className="py-2.5 px-4 bg-secondary text-foreground font-medium rounded-xl text-xs hover:bg-secondary/80"
              >
                View Campaigns
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
