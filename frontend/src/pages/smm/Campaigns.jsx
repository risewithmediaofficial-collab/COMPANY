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

const formatDateForInput = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

const createInitialDeposit = () => ({
  depositDate: format(new Date(), 'yyyy-MM-dd'),
  fromDate: '',
  toDate: '',
  amount: '',
  notes: '',
});

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
    status: 'Draft', platform: 'Meta', budgetType: 'Assigned Budget', dailyBudget: '',
    totalBudget: '', lifetimeBudget: '', deposits: [createInitialDeposit()], deposited: '', depositDate: format(new Date(), 'yyyy-MM-dd'),
    amountAdded: 0, remainingBalance: 0, currency: 'INR', goal: '', landingPage: '', pixelConnected: false,
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

  const handleTotalBudgetChange = (value) => {
    const val = value === '' ? '' : Number(value);
    setFormData(prev => ({
      ...prev,
      totalBudget: val,
      lifetimeBudget: val,
      monthlyBudget: val,
    }));
  };

  const handleDailyBudgetChange = (value) => {
    const val = value === '' ? '' : Number(value);
    setFormData(prev => ({
      ...prev,
      dailyBudget: val,
    }));
  };

  const handleDepositedChange = (value) => {
    const val = value === '' ? '' : Number(value);
    const spent = editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0;
    const depNum = val === '' ? 0 : Number(val);
    const balance = Math.max(0, depNum - spent);
    setFormData(prev => {
      const deposits = [...(prev.deposits || [])];
      if (deposits.length > 0) {
        deposits[0] = { ...deposits[0], amount: val };
      } else {
        deposits.push({ ...createInitialDeposit(), amount: val });
      }
      return {
        ...prev,
        deposits,
        deposited: val,
        amountAdded: val,
        remainingBalance: balance,
      };
    });
  };

  const handleDepositDateChange = (value) => {
    setFormData(prev => {
      const deposits = [...(prev.deposits || [])];
      if (deposits.length > 0) {
        deposits[0] = { ...deposits[0], depositDate: value };
      }
      return {
        ...prev,
        depositDate: value,
        deposits,
      };
    });
  };

  const handleAddDeposit = () => {
    setFormData(prev => {
      const list = prev.deposits || [];
      const last = list[list.length - 1];
      const nextDate = last?.toDate || last?.depositDate || format(new Date(), 'yyyy-MM-dd');
      return {
        ...prev,
        deposits: [
          ...list,
          {
            depositDate: nextDate,
            fromDate: '',
            toDate: '',
            amount: '',
            notes: '',
          }
        ]
      };
    });
  };

  const handleRemoveDeposit = (index) => {
    setFormData(prev => {
      const list = (prev.deposits || []).filter((_, i) => i !== index);
      const updated = list.length > 0 ? list : [createInitialDeposit()];
      const total = updated.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const spent = editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0;
      return {
        ...prev,
        deposits: updated,
        deposited: total,
        amountAdded: total,
        remainingBalance: Math.max(0, total - spent),
      };
    });
  };

  const handleDepositChange = (index, field, value) => {
    setFormData(prev => {
      const list = [...(prev.deposits || [])];
      list[index] = {
        ...list[index],
        [field]: value,
      };
      const total = list.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const spent = editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0;
      const latestDate = list[list.length - 1]?.depositDate || prev.depositDate;
      return {
        ...prev,
        deposits: list,
        deposited: total,
        amountAdded: total,
        remainingBalance: Math.max(0, total - spent),
        depositDate: latestDate,
      };
    });
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

    const tBudget = cleanPayload.totalBudget !== '' && cleanPayload.totalBudget !== undefined
      ? Number(cleanPayload.totalBudget)
      : (cleanPayload.monthlyBudget !== '' && cleanPayload.monthlyBudget !== undefined
          ? Number(cleanPayload.monthlyBudget)
          : (Number(cleanPayload.lifetimeBudget) || 0));
    cleanPayload.totalBudget = tBudget;
    cleanPayload.monthlyBudget = tBudget;
    cleanPayload.lifetimeBudget = tBudget;
    cleanPayload.dailyBudget = cleanPayload.dailyBudget !== '' && cleanPayload.dailyBudget !== undefined
      ? Number(cleanPayload.dailyBudget)
      : 0;

    const cleanedDeposits = (cleanPayload.deposits || [])
      .filter(d => d && (d.amount !== '' && d.amount !== undefined && Number(d.amount) >= 0))
      .map(d => ({
        ...(d._id ? { _id: d._id } : {}),
        depositDate: d.depositDate || format(new Date(), 'yyyy-MM-dd'),
        fromDate: d.fromDate || undefined,
        toDate: d.toDate || undefined,
        amount: Number(d.amount) || 0,
        notes: d.notes || '',
      }));
    cleanPayload.deposits = cleanedDeposits;

    const spent = editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0;
    const totalDepositedFromList = cleanedDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const depositedVal = cleanedDeposits.length > 0
      ? totalDepositedFromList
      : (cleanPayload.deposited !== '' && cleanPayload.deposited !== undefined
          ? Number(cleanPayload.deposited)
          : (cleanPayload.amountAdded !== '' && cleanPayload.amountAdded !== undefined
              ? Number(cleanPayload.amountAdded)
              : 0));

    cleanPayload.deposited = depositedVal;
    cleanPayload.amountAdded = depositedVal;
    cleanPayload.remainingBalance = Math.max(0, depositedVal - spent);
    if (cleanedDeposits.length > 0) {
      cleanPayload.depositDate = cleanedDeposits[cleanedDeposits.length - 1].depositDate;
    }

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
      budgetType: 'Assigned Budget',
      totalBudget: '',
      dailyBudget: '',
      deposits: [createInitialDeposit()],
      depositDate: format(new Date(), 'yyyy-MM-dd'),
      deposited: '',
      lifetimeBudget: '',
      monthlyBudget: '',
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
    const tBudget = camp.totalBudget ?? camp.lifetimeBudget ?? camp.monthlyBudget ?? '';
    const dBudget = camp.dailyBudget ?? '';
    const dep = camp.deposited ?? camp.amountAdded ?? '';
    const spent = camp.amountSpent || camp.performance?.spend || 0;
    const rem = camp.remainingBalance ?? Math.max(0, (Number(dep) || 0) - spent);
    const vIds = camp.sourceContentIds?.map(v => v._id || v) || (camp.sourceContentId ? [camp.sourceContentId._id || camp.sourceContentId] : []);
    const dests = getDestinationsForObjective(camp.objective || 'Awareness');
    const loadedDeposits = (camp.deposits && camp.deposits.length > 0)
      ? camp.deposits.map(d => ({
          _id: d._id,
          depositDate: d.depositDate ? formatDateForInput(d.depositDate) : format(new Date(), 'yyyy-MM-dd'),
          fromDate: d.fromDate ? formatDateForInput(d.fromDate) : '',
          toDate: d.toDate ? formatDateForInput(d.toDate) : '',
          amount: d.amount ?? '',
          notes: d.notes || '',
        }))
      : (dep !== '' && dep !== undefined && Number(dep) > 0
          ? [{
              depositDate: camp.depositDate ? formatDateForInput(camp.depositDate) : format(new Date(), 'yyyy-MM-dd'),
              fromDate: camp.startDate ? formatDateForInput(camp.startDate) : '',
              toDate: camp.endDate ? formatDateForInput(camp.endDate) : '',
              amount: dep,
              notes: 'Initial Deposit',
            }]
          : [createInitialDeposit()]
        );

    setFormData({
      ...camp,
      client: camp.client?._id || camp.client || '',
      project: camp.project?._id || camp.project || '',
      sourceContentId: camp.sourceContentId?._id || camp.sourceContentId || vIds[0] || '',
      sourceContentIds: vIds,
      objective: camp.objective || 'Awareness',
      destination: camp.destination || dests[0]?.value || 'Message Destination',
      destinationPlatforms: camp.destinationPlatforms || [],
      budgetType: 'Assigned Budget',
      totalBudget: tBudget,
      dailyBudget: dBudget,
      deposits: loadedDeposits,
      depositDate: camp.depositDate ? formatDateForInput(camp.depositDate) : format(new Date(), 'yyyy-MM-dd'),
      deposited: dep,
      lifetimeBudget: tBudget,
      monthlyBudget: tBudget,
      amountAdded: dep,
      remainingBalance: rem,
      startDate: formatDateForInput(camp.startDate),
      endDate: formatDateForInput(camp.endDate),
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
      key: 'assignedBudget',
      label: 'Assigned Budget',
      render: (row) => {
        const aBudget = row.totalBudget ?? row.lifetimeBudget ?? row.monthlyBudget ?? 0;
        const dBudget = row.dailyBudget ?? 0;
        const dateRangeStr = row.startDate && row.endDate
          ? `${format(new Date(row.startDate), 'dd MMM')} - ${format(new Date(row.endDate), 'dd MMM')}`
          : (row.startDate ? `From ${format(new Date(row.startDate), 'dd MMM')}` : '');
        return (
          <div>
            <span className="font-mono font-bold text-xs text-foreground block">₹{Number(aBudget).toLocaleString()}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {dBudget > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono">₹{Number(dBudget).toLocaleString()}/day</span>
              )}
              {dateRangeStr && (
                <span className="text-[10px] text-primary/80 font-medium">({dateRangeStr})</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'budgetDeposited',
      label: 'Deposited Budget',
      render: (row) => {
        const deposited = row.deposited ?? row.amountAdded ?? row.totalBudget ?? row.monthlyBudget ?? row.lifetimeBudget ?? 0;
        const aBudget = row.totalBudget ?? row.lifetimeBudget ?? row.monthlyBudget ?? 0;
        const depositDateStr = row.depositDate ? format(new Date(row.depositDate), 'dd MMM yyyy') : null;
        const depCount = row.deposits?.length || (deposited > 0 ? 1 : 0);
        const pending = aBudget > 0 ? Math.max(0, aBudget - deposited) : 0;
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-xs text-blue-500 block">₹{Number(deposited).toLocaleString()}</span>
              {depCount > 1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold">
                  {depCount} deposits
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
              {aBudget > 0 && pending > 0 ? (
                <span className="text-amber-500 block font-medium">₹{pending.toLocaleString()} pending from assigned</span>
              ) : aBudget > 0 && deposited >= aBudget ? (
                <span className="text-emerald-500 block font-medium">✓ Fully deposited</span>
              ) : (
                <span>{depositDateStr ? `Deposited on ${depositDateStr}` : 'Deposited'}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'balanceAmount',
      label: 'Balance Amount',
      render: (row) => {
        const aBudget = row.totalBudget ?? row.lifetimeBudget ?? row.monthlyBudget ?? 0;
        const deposited = row.deposited ?? row.amountAdded ?? 0;
        const spent = row.amountSpent || row.performance?.spend || 0;
        const balance = aBudget > 0 ? Math.max(0, aBudget - deposited) : Math.max(0, deposited - spent);
        const percent = aBudget > 0 ? (deposited > 0 ? Math.min(100, Math.round((deposited / aBudget) * 100)) : 0) : (deposited > 0 ? Math.min(100, Math.round((spent / deposited) * 100)) : 0);
        return (
          <div className="w-36 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{balance.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">
                {aBudget > 0 ? (balance === 0 ? 'Fully Deposited' : 'Remaining') : `Spent ₹${spent.toLocaleString()}`}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : percent >= 75 ? 'bg-amber-500' : 'bg-primary'}`}
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
        subtitle="Manage assigned & daily budgets, track Deposited vs Amount Spent, and monitor balance"
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
                onWheel={e => e.currentTarget.blur()}
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
                onWheel={e => e.currentTarget.blur()}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-emerald-500 block mb-1">Leads Generated</label>
              <input
                type="number"
                value={dailyLogForm.leads}
                onChange={e => setDailyLogForm({...dailyLogForm, leads: Number(e.target.value)})}
                onWheel={e => e.currentTarget.blur()}
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

          {/* Step 2: Campaign Name */}
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

          {/* Step 3: Platform & Objective */}
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

          {/* Step 4: Dynamic Destination / Form Type Selector */}
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

          {/* Step 5: Multi-Video Selector from Database */}
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

          {/* Step 6: Campaign Dates, Assigned Budget & Daily Deposited Budget (Moved below Campaign Name, Platform, Destination, Videos) */}
          <div className="bg-secondary/30 p-3.5 rounded-2xl border border-border space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-primary" /> Campaign Dates & Assigned Budget
              </h4>
              <span className="text-[10px] text-muted-foreground font-medium">Independent manual entry</span>
            </div>

            {/* Campaign Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">From Date (Start Date)</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="app-input font-medium"
                />
                <span className="text-[10px] text-muted-foreground block mt-0.5">Campaign start date</span>
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">To Date (End Date)</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="app-input font-medium"
                />
                <span className="text-[10px] text-muted-foreground block mt-0.5">Campaign end date</span>
              </div>
            </div>

            {/* Assigned & Daily Budget Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
              <div>
                <label className="font-semibold text-foreground block mb-1">Assigned Budget (₹) *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.totalBudget ?? ''}
                  onChange={e => handleTotalBudgetChange(e.target.value)}
                  onWheel={e => e.currentTarget.blur()}
                  className="app-input font-bold text-foreground"
                  placeholder="e.g. 800"
                />
                <span className="text-[10px] text-muted-foreground block mt-0.5">Total budget assigned for date range</span>
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Daily Budget (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.dailyBudget ?? ''}
                  onChange={e => handleDailyBudgetChange(e.target.value)}
                  onWheel={e => e.currentTarget.blur()}
                  className="app-input font-medium"
                  placeholder="e.g. 100"
                />
                <span className="text-[10px] text-muted-foreground block mt-0.5">Manual daily budget (no auto-calc)</span>
              </div>
            </div>

            {/* Daily Deposited Budget & Tranches (Moved up here into unified budget details) */}
            <div className="p-3 bg-card rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={13} className="text-primary" /> Daily Deposited Budget
                  </h5>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                    {(formData.deposits || []).length} tranche{(formData.deposits || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddDeposit}
                  className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground font-bold rounded-lg text-[11px] shadow-xs hover:opacity-90 transition-all"
                  title="Add another daily deposit tranche"
                >
                  <Plus size={13} strokeWidth={2.5} /> Add Deposit
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Deposit funds for daily ad spend. Use <strong>+ Add Deposit</strong> to add multiple deposit entries.
              </p>

              <div className="space-y-2.5">
                {(formData.deposits || []).map((dep, idx) => (
                  <div key={idx} className="p-2.5 bg-secondary/30 rounded-xl border border-border space-y-2">
                    <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                      <span className="font-bold text-foreground text-[11px] flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-black">
                          {idx + 1}
                        </span>
                        Deposit #{idx + 1}
                      </span>
                      {(formData.deposits || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDeposit(idx)}
                          className="text-muted-foreground hover:text-rose-500 p-0.5 rounded transition-colors"
                          title="Remove deposit"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-foreground block mb-0.5 text-[10px]">Date of Deposit</label>
                        <input
                          type="date"
                          value={dep.depositDate}
                          onChange={e => handleDepositChange(idx, 'depositDate', e.target.value)}
                          className="app-input font-medium text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-blue-600 dark:text-blue-400 block mb-0.5 text-[10px]">
                          Deposited Amount (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={dep.amount ?? ''}
                          onChange={e => handleDepositChange(idx, 'amount', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="app-input font-bold text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs"
                          placeholder="e.g. 800"
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Optional remarks (e.g. UPI, Bank transfer, Tranche 1)"
                        value={dep.notes || ''}
                        onChange={e => handleDepositChange(idx, 'notes', e.target.value)}
                        className="app-input text-[11px] h-7"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another deposit button */}
              <button
                type="button"
                onClick={handleAddDeposit}
                className="w-full py-2 border-2 border-dashed border-primary/30 rounded-xl text-[11px] font-bold text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={13} strokeWidth={2.5} /> Add Another Deposit Tranche
              </button>
            </div>

            {/* Dynamic Live Ledger & Minus Calculation Box */}
            {(() => {
              const liveDeposited = (formData.deposits || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
              const liveAssigned = Number(formData.totalBudget) || 0;
              const remainingFromAssigned = liveAssigned - liveDeposited;
              const spent = Number(editingCampaign?.amountSpent || editingCampaign?.performance?.spend || 0);
              const balance = Math.max(0, liveDeposited - spent);

              return (
                <div className="p-3 bg-card rounded-xl border border-border space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] border-b border-border/50 pb-1.5">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <TrendingUp size={12} className="text-primary" /> Budget & Deposit Ledger Summary
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {(formData.deposits || []).length} Tranche{(formData.deposits || []).length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-secondary/50 border border-border">
                      <span className="text-[10px] text-muted-foreground block font-medium">Assigned Budget</span>
                      <span className="text-sm font-bold font-mono text-foreground block mt-0.5">
                        ₹{liveAssigned.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-medium">Total Deposited</span>
                      <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 block mt-0.5">
                        ₹{liveDeposited.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Balance Amount: Assigned Budget MINUS Deposited Amount */}
                  <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between shadow-xs">
                    <div>
                      <span className="font-bold text-foreground text-xs block">
                        Balance Amount
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Assigned ₹{liveAssigned.toLocaleString()} − Deposited ₹{liveDeposited.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      {liveAssigned > 0 && remainingFromAssigned > 0 ? (
                        <span className="text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          ₹{remainingFromAssigned.toLocaleString()}
                        </span>
                      ) : liveAssigned > 0 && remainingFromAssigned === 0 ? (
                        <span className="text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          ✓ ₹0 (100% Fully Deposited)
                        </span>
                      ) : remainingFromAssigned < 0 ? (
                        <span className="text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                          +₹{Math.abs(remainingFromAssigned).toLocaleString()} Extra Deposited
                        </span>
                      ) : (
                        <span className="text-sm font-bold font-mono text-muted-foreground">₹0</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
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
