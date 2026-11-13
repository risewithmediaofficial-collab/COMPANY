import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, CheckCircle, SlidersHorizontal, CheckSquare, Trash2, Edit2, Layers, Calendar, Target, DollarSign, TrendingUp, AlertTriangle, Video, Sparkles, ArrowRight, Check, Film, MapPin, Flame } from '@/components/ui/muiIcons';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { PlatformBadge } from '../../components/smm/PlatformBadge';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { useDateFilter } from '../../context/DateFilterContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
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
  const { startDate: globalStartDate, endDate: globalEndDate, isDateInRange } = useDateFilter();
  const [rawCampaigns, setCampaigns] = useState([]);
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
    amountAdded: '',
    spend: '',
    leads: '',
    messages: '',
    calls: '',
    revenue: '',
    clicks: '',
    impressions: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, clientRes, projRes, videosRes] = await Promise.all([
        smmApi.getCampaigns({
          search,
          status: statusFilter,
          platform: platformFilter,
          startDate: globalStartDate || undefined,
          endDate: globalEndDate || undefined,
        }),
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
  }, [search, statusFilter, platformFilter, globalStartDate, globalEndDate]);

  const campaigns = useMemo(
    () => rawCampaigns.filter((c) => isDateInRange([c.startDate, c.endDate, c.depositDate, c.createdAt])),
    [rawCampaigns, isDateInRange]
  );

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
      amountAdded: '',
      spend: '',
      leads: '',
      messages: '',
      calls: '',
      revenue: '',
      clicks: '',
      impressions: '',
      notes: '',
    });
    setIsDailyLogDrawerOpen(true);
  };

  const handleAddDailyLog = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...dailyLogForm,
        amountAdded: Number(dailyLogForm.amountAdded) || 0,
        spend: Number(dailyLogForm.spend) || 0,
        leads: Number(dailyLogForm.leads) || 0,
        messages: Number(dailyLogForm.messages) || 0,
        calls: Number(dailyLogForm.calls) || 0,
        revenue: Number(dailyLogForm.revenue) || 0,
        clicks: Number(dailyLogForm.clicks) || 0,
        impressions: Number(dailyLogForm.impressions) || 0,
      };
      const res = await smmApi.addDailyLog(activeCampaignForLog._id, payload);
      if (res.data?.success) {
        toast.success('Daily lead & spend log saved! Campaign money balance updated.');
        setActiveCampaignForLog(res.data.data);
        setDailyLogForm({
          date: format(new Date(), 'yyyy-MM-dd'),
          sourceContentId: '',
          amountAdded: '',
          spend: '',
          leads: '',
          messages: '',
          calls: '',
          revenue: '',
          clicks: '',
          impressions: '',
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
          <div className="min-w-0">
            <span className="font-semibold text-foreground block truncate">{row.name}</span>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-semibold text-foreground/80">{clientDisplay}</span>
              <span className="text-[10px] text-muted-foreground">· {row.objective}</span>
              {row.destination && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground text-[10px] font-semibold">
                  <MapPin size={9} className="shrink-0" />
                  {row.destination}
                </span>
              )}
              {row.sourceContentId && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground text-[10px] font-semibold">
                  <Video size={9} className="shrink-0" />
                  Video Ad
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
          <div className="tabular-nums">
            <span className="font-bold text-xs text-foreground block">₹{Number(aBudget).toLocaleString()}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {dBudget > 0 && (
                <span className="text-[10px] text-muted-foreground">₹{Number(dBudget).toLocaleString()}/day</span>
              )}
              {dateRangeStr && (
                <span className="text-[10px] text-muted-foreground font-medium">({dateRangeStr})</span>
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
          <div className="tabular-nums">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-foreground block">₹{Number(deposited).toLocaleString()}</span>
              {depCount > 1 && (
                <span className="px-1.5 py-0.5 rounded-full bg-secondary text-foreground text-[9px] font-semibold">
                  {depCount} deposits
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
              {aBudget > 0 && pending > 0 ? (
                <span className="text-muted-foreground block font-medium">₹{pending.toLocaleString()} pending from assigned</span>
              ) : aBudget > 0 && deposited >= aBudget ? (
                <span className="text-foreground inline-flex items-center gap-1 font-medium">
                  <Check size={10} className="shrink-0" /> Fully deposited
                </span>
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
          <div className="w-36 space-y-1 tabular-nums">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-foreground">₹{balance.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">
                {aBudget > 0 ? (balance === 0 ? 'Fully Deposited' : 'Remaining') : `Spent ₹${spent.toLocaleString()}`}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground"
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
        <div className="tabular-nums">
          <span className="text-xs font-bold text-foreground block">{row.performance?.leads || 0} Leads</span>
          <span className="text-[10px] text-muted-foreground">₹{row.performance?.costPerLead || 0} / Lead</span>
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
          className="px-2.5 py-1 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
        >
          <Calendar size={13} className="shrink-0" />
          <span>Log Spend/Leads</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <Plus size={18} className="shrink-0" />
            <span>Create Campaign</span>
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-card p-3 sm:p-4 rounded-2xl ">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto flex-1">
          <div className="w-full sm:w-auto sm:flex-1">
            <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns..." />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SelectDropdown
              value={platformFilter}
              onChange={(val) => setPlatformFilter(val || '')}
              options={[
                { value: 'Meta', label: 'Meta' },
                { value: 'Google', label: 'Google' },
                { value: 'LinkedIn', label: 'LinkedIn' },
                { value: 'YouTube', label: 'YouTube' },
                { value: 'TikTok', label: 'TikTok' },
              ]}
              placeholder="All Networks"
              allOptionLabel="All Networks"
              allowCustom={false}
              className="flex-1 sm:w-36"
              buttonClassName="h-10 text-xs sm:text-sm font-medium bg-background border border-border/50 rounded-xl"
            />
            <SelectDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || '')}
              options={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Active', label: 'Active' },
                { value: 'Paused', label: 'Paused' },
                { value: 'Completed', label: 'Completed' },
              ]}
              placeholder="All Statuses"
              allOptionLabel="All Statuses"
              allowCustom={false}
              className="flex-1 sm:w-36"
              buttonClassName="h-10 text-xs sm:text-sm font-medium bg-background border border-border/50 rounded-xl"
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-xl ">
            <span className="text-xs font-bold text-foreground tabular-nums">{selectedIds.length} Selected</span>
            <button onClick={() => handleBulkStatus('Active')} className="px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">Set Active</button>
            <button onClick={() => handleBulkStatus('Paused')} className="px-2.5 py-1 bg-card text-foreground rounded-lg text-xs font-semibold hover:bg-secondary/80 transition-colors">Pause</button>
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
        <form onSubmit={handleAddDailyLog} className="space-y-5 text-left">
          {/* Campaign Money Summary */}
          <div className="p-4 bg-secondary/50 rounded-2xl space-y-1.5 tabular-nums">
            <span className="text-xs font-bold text-muted-foreground block">Budget &amp; Ledger Summary</span>
            <div className="flex items-center justify-between font-bold text-sm pt-1 text-foreground">
              <span>Deposited: ₹{(activeCampaignForLog?.amountAdded || 0).toLocaleString()}</span>
              <span className="text-muted-foreground">Spent: ₹{(activeCampaignForLog?.amountSpent || 0).toLocaleString()}</span>
              <span>Balance: ₹{(activeCampaignForLog?.remainingBalance || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Select Video in Campaign */}
          {activeCampaignForLog && (
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Select Video in Campaign (Optional)</label>
              <SelectDropdown
                value={dailyLogForm.sourceContentId || ''}
                onChange={(val) => setDailyLogForm({ ...dailyLogForm, sourceContentId: val || '' })}
                options={[
                  { value: '', label: '-- All Videos / Entire Campaign Level --' },
                  ...(activeCampaignForLog.sourceContentIds || []).map((v) => ({
                    value: v._id || v,
                    label: v.name || 'Video',
                    subLabel: v.contentType || 'Video',
                  })),
                  ...(activeCampaignForLog.sourceContentId && !activeCampaignForLog.sourceContentIds?.length
                    ? [{
                        value: activeCampaignForLog.sourceContentId._id || activeCampaignForLog.sourceContentId,
                        label: activeCampaignForLog.sourceContentId.name || 'Campaign Video',
                      }]
                    : []),
                ]}
                placeholder="-- All Videos / Entire Campaign Level --"
                allowCustom={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm rounded-xl border border-border/50"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Date</label>
              <input
                type="date"
                required
                value={dailyLogForm.date}
                onChange={e => setDailyLogForm({...dailyLogForm, date: e.target.value})}
                onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                className="app-input w-full cursor-pointer"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Deposited Funds (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={dailyLogForm.amountAdded ?? ''}
                onChange={e => setDailyLogForm({ ...dailyLogForm, amountAdded: e.target.value === '' ? '' : Number(e.target.value) })}
                onWheel={e => e.currentTarget.blur()}
                className="app-input w-full tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Today&apos;s Spend (₹) *</label>
              <input
                type="number"
                required
                placeholder="0"
                value={dailyLogForm.spend ?? ''}
                onChange={e => setDailyLogForm({ ...dailyLogForm, spend: e.target.value === '' ? '' : Number(e.target.value) })}
                onWheel={e => e.currentTarget.blur()}
                className="app-input w-full tabular-nums"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Leads Generated</label>
              <input
                type="number"
                placeholder="0"
                value={dailyLogForm.leads ?? ''}
                onChange={e => setDailyLogForm({ ...dailyLogForm, leads: e.target.value === '' ? '' : Number(e.target.value) })}
                onWheel={e => e.currentTarget.blur()}
                className="app-input w-full tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Notes</label>
            <textarea
              rows={3}
              placeholder="e.g. Budget scaled up today due to high conversion rate..."
              value={dailyLogForm.notes}
              onChange={e => setDailyLogForm({...dailyLogForm, notes: e.target.value})}
              className="w-full min-h-[84px] px-4 py-3 bg-secondary/75 rounded-xl text-sm font-normal text-foreground outline-none focus:bg-background focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2.5">
            <button type="button" onClick={() => setIsDailyLogDrawerOpen(false)} className="h-11 px-5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/95 transition-colors cursor-pointer">Save Ledger Entry</button>
          </div>
        </form>
      </SMMDrawer>

      {/* Create / Edit Campaign Drawer */}
      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
      >
        <form onSubmit={handleSave} className="space-y-5 text-left">
          {/* Step 1: Client & Project Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Client *</label>
              <SelectDropdown
                value={formData.client}
                onChange={(val) => setFormData({ ...formData, client: val || '', project: '', sourceContentIds: [] })}
                options={crmClients.map((c) => {
                  const comp = c.company || c.companyName || '';
                  const name = c.name || '';
                  const display = comp && name && comp.toLowerCase() !== name.toLowerCase()
                    ? `${comp} - ${name}`
                    : (comp || name || 'Client');
                  return { value: c._id, label: display };
                })}
                placeholder="Select Client"
                allowCustom={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm font-medium rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">
                Project * {loadingProjects && <span className="text-xs text-muted-foreground font-normal">(Loading...)</span>}
              </label>
              <SelectDropdown
                value={formData.project}
                onChange={(val) => setFormData({ ...formData, project: val || '' })}
                options={projectsList.map((p) => ({ value: p._id, label: p.name }))}
                placeholder={projectsList.length > 0 ? 'Select Project' : '-- No Projects Found --'}
                allowCustom={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm font-medium rounded-xl"
              />
            </div>
          </div>

          {/* Step 2: Campaign Name */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Campaign Name *</label>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Platform *</label>
              <SelectDropdown
                value={formData.platform}
                onChange={(val) => setFormData({ ...formData, platform: val || 'Meta' })}
                options={[
                  { value: 'Meta', label: 'Meta Ads (IG & FB)' },
                  { value: 'Google', label: 'Google Ads' },
                  { value: 'LinkedIn', label: 'LinkedIn Ads' },
                  { value: 'YouTube', label: 'YouTube Ads' },
                  { value: 'TikTok', label: 'TikTok Ads' },
                ]}
                allowCustom={false}
                allowDeselect={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm font-medium rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Objective *</label>
              <SelectDropdown
                value={formData.objective}
                onChange={(val) => {
                  const newObj = val || SMM_OBJECTIVES[0];
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
                options={SMM_OBJECTIVES.map((obj) => ({ value: obj, label: obj }))}
                allowCustom={false}
                allowDeselect={false}
                className="w-full"
                buttonClassName="h-11 bg-background text-sm font-medium rounded-xl"
              />
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
          <div className="p-4 rounded-2xl bg-secondary/50 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <Sparkles size={14} className="shrink-0" />
                <span>Select Videos to Run Ads (Multiple Allowed)</span>
              </label>
              <span className="text-xs font-bold text-foreground bg-card px-2.5 py-0.5 rounded-full tabular-nums shrink-0">
                {formData.sourceContentIds?.length || 0} Selected
              </span>
            </div>

            {!formData.client ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                Select a client first
              </p>
            ) : clientVideos.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No videos found for this client
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {clientVideos.map(v => {
                  const isChecked = (formData.sourceContentIds || []).includes(v._id);
                  return (
                    <div
                      key={v._id}
                      onClick={() => toggleVideoSelection(v._id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-card text-foreground font-semibold'
                          : 'bg-background/80 hover:bg-background text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${isChecked ? 'bg-primary text-primary-foreground' : ''}`}>
                          {isChecked && <Check size={12} />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{v.name}</span>
                          <span className="text-xs text-muted-foreground block">{v.contentType || 'Video'} · {v.platforms?.join(', ') || 'Meta'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {v.adRecommendation === '🔥 HIGH POTENTIAL' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                            <Flame size={9} className="shrink-0" /> Hot
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{v.status || 'Ready'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 6: Campaign Dates, Assigned Budget & Daily Deposited Budget */}
          <div className="bg-secondary/40 p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <Calendar size={14} className="text-foreground shrink-0" />
                <span>Campaign Dates &amp; Assigned Budget</span>
              </h4>
            </div>

            {/* Campaign Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">From Date (Start Date)</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="app-input cursor-pointer"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">To Date (End Date)</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  className="app-input cursor-pointer"
                />
              </div>
            </div>

            {/* Assigned & Daily Budget Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Assigned Budget (₹) *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.totalBudget ?? ''}
                  onChange={e => handleTotalBudgetChange(e.target.value)}
                  onWheel={e => e.currentTarget.blur()}
                  className="app-input tabular-nums"
                  placeholder="e.g. 800"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Daily Budget (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.dailyBudget ?? ''}
                  onChange={e => handleDailyBudgetChange(e.target.value)}
                  onWheel={e => e.currentTarget.blur()}
                  className="app-input tabular-nums"
                  placeholder="e.g. 100"
                />
              </div>
            </div>

            {/* Daily Deposited Budget & Tranches */}
            <div className="p-4 bg-card rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h5 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    <DollarSign size={14} className="text-foreground shrink-0" />
                    <span>Daily Deposited Budget</span>
                  </h5>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground font-semibold text-xs tabular-nums shrink-0">
                    {(formData.deposits || []).length} tranche{(formData.deposits || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddDeposit}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-colors shrink-0 cursor-pointer"
                  title="Add another daily deposit tranche"
                >
                  <Plus size={14} className="shrink-0" />
                  <span>Add Deposit</span>
                </button>
              </div>

              <div className="space-y-3">
                {(formData.deposits || []).map((dep, idx) => (
                  <div key={idx} className="p-3 bg-secondary/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-bold text-foreground text-sm flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-bold tabular-nums">
                          {idx + 1}
                        </span>
                        Deposit #{idx + 1}
                      </span>
                      {(formData.deposits || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDeposit(idx)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors cursor-pointer"
                          title="Remove deposit"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold text-foreground block mb-1.5">Date of Deposit</label>
                        <input
                          type="date"
                          value={dep.depositDate}
                          onChange={e => handleDepositChange(idx, 'depositDate', e.target.value)}
                          onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                          className="app-input cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground block mb-1.5">
                          Deposited Amount (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={dep.amount ?? ''}
                          onChange={e => handleDepositChange(idx, 'amount', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="app-input tabular-nums"
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
                        className="app-input"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another deposit button */}
              <button
                type="button"
                onClick={handleAddDeposit}
                className="w-full h-11 rounded-xl text-sm font-semibold text-foreground hover:bg-secondary/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} className="shrink-0" />
                <span>Add Another Deposit Tranche</span>
              </button>
            </div>

            {/* Dynamic Live Ledger & Minus Calculation Box */}
            {(() => {
              const liveDeposited = (formData.deposits || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
              const liveAssigned = Number(formData.totalBudget) || 0;
              const remainingFromAssigned = liveAssigned - liveDeposited;

              return (
                <div className="p-3.5 bg-card rounded-xl space-y-2 tabular-nums">
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-foreground shrink-0" />
                      <span>Budget &amp; Deposit Ledger Summary</span>
                    </span>
                    <span className="font-bold text-foreground">
                      {(formData.deposits || []).length} Tranche{(formData.deposits || []).length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-lg bg-secondary/50 ">
                      <span className="text-xs text-muted-foreground block font-medium">Assigned Budget</span>
                      <span className="text-sm font-bold text-foreground block mt-0.5">
                        ₹{liveAssigned.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-secondary/50 ">
                      <span className="text-xs text-muted-foreground block font-medium">Total Deposited</span>
                      <span className="text-sm font-bold text-foreground block mt-0.5">
                        ₹{liveDeposited.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Balance Amount: Assigned Budget MINUS Deposited Amount */}
                  <div className="p-3 rounded-xl bg-secondary/35 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-foreground text-sm block">
                        Balance Amount
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Assigned ₹{liveAssigned.toLocaleString()} − Deposited ₹{liveDeposited.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      {liveAssigned > 0 && remainingFromAssigned > 0 ? (
                        <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-secondary text-foreground">
                          ₹{remainingFromAssigned.toLocaleString()}
                        </span>
                      ) : liveAssigned > 0 && remainingFromAssigned === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground">
                          <Check size={12} className="shrink-0" /> ₹0 (100% Deposited)
                        </span>
                      ) : remainingFromAssigned < 0 ? (
                        <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-secondary text-foreground">
                          +₹{Math.abs(remainingFromAssigned).toLocaleString()} Extra Deposited
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">₹0</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="pt-4 flex justify-end gap-2.5">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="h-11 px-5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/95 transition-colors cursor-pointer">Save Campaign</button>
          </div>
        </form>
      </SMMDrawer>

      {/* Post-Creation Prompt Modal: Campaign Created -> Create Ad Set */}
      {createdCampaignForNextStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in">
          <div className="bg-card max-w-md w-full p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-foreground flex items-center justify-center mx-auto">
              <CheckCircle size={28} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-foreground">Campaign Created</h3>
            </div>

            <div className="p-3 bg-secondary/50 rounded-xl text-xs space-y-1.5 tabular-nums">
              <div className="flex justify-between text-muted-foreground">
                <span>Client:</span>
                <span className="font-semibold text-foreground">{createdCampaignForNextStep.client?.company || createdCampaignForNextStep.client?.name}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Videos Attached:</span>
                <span className="font-semibold text-foreground">
                  {createdCampaignForNextStep.sourceContentIds?.length || (createdCampaignForNextStep.sourceContentId ? 1 : 0)} Videos
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Objective &amp; Destination:</span>
                <span className="font-semibold text-foreground">
                  {createdCampaignForNextStep.objective} · {createdCampaignForNextStep.destination || 'Message Destination'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Campaign Budget:</span>
                <span className="font-semibold text-foreground">₹{(createdCampaignForNextStep.lifetimeBudget || createdCampaignForNextStep.amountAdded || 0).toLocaleString()}</span>
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
                className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-xs inline-flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors"
              >
                <Layers size={14} className="shrink-0" />
                <span>Create Ad Set &amp; Targeting</span>
                <ArrowRight size={14} className="shrink-0" />
              </button>
              <button
                onClick={() => setCreatedCampaignForNextStep(null)}
                className="py-2.5 px-4 bg-secondary text-foreground font-medium rounded-xl text-xs hover:bg-secondary/80 transition-colors"
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
