import React, { useState, useEffect } from 'react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import {
  Clock, Plus, Calendar, FileText, CheckCircle2, AlertTriangle,
  Info, TrendingUp, Megaphone, DollarSign, Download, Save,
  Layers, Check, Sparkles, PhoneCall, MessageSquare, AlertCircle, X
} from '@/components/ui/muiIcons';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

export default function DailyTracking() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClient, setSelectedClient] = useState('');
  const [clientsList, setClientsList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [spendLogs, setSpendLogs] = useState([]);

  // Report state
  const [report, setReport] = useState({
    contentSummary: { videosPosted: 0, videosScheduled: 0, videosPendingApproval: 0 },
    organicSummary: { views: 0, reach: 0, engagement: 0, followersGained: 0 },
    adsSummary: { amountAdded: 0, amountSpent: 0, leads: 0, messages: 0, calls: 0, cpl: 0 },
    notes: [],
    activityTimeline: [],
    status: 'Draft',
  });

  // Modals & Inputs
  const [isSpendModalOpen, setIsSpendModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteTag, setNewNoteTag] = useState('info');
  const [newTimelineTime, setNewTimelineTime] = useState('12:00');
  const [newTimelineDesc, setNewTimelineDesc] = useState('');
  const [newTimelineCat, setNewTimelineCat] = useState('content');

  // Spend form
  const [spendForm, setSpendForm] = useState({
    campaign: '',
    sourceContentId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    amountAdded: 0,
    amountSpent: 0,
    leadsGenerated: 0,
    messages: 0,
    calls: 0,
    clicks: 0,
    impressions: 0,
    notes: '',
  });

  // Load clients and campaigns
  useEffect(() => {
    const init = async () => {
      try {
        const [cRes, campRes] = await Promise.all([
          smmApi.getClients(),
          smmApi.getCampaigns({ limit: 100 }),
        ]);
        if (cRes.data?.success) {
          const list = cRes.data.data || [];
          setClientsList(list);
          if (list.length > 0 && !selectedClient) {
            setSelectedClient(list[0]._id);
          }
        }
        if (campRes.data?.success) setCampaignsList(campRes.data.data || []);
      } catch (err) {
        console.error('Failed to load initial parameters:', err);
      }
    };
    init();
  }, []);

  // Fetch report and spend logs when client or date changes
  const fetchDailyData = async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const [reportRes, logsRes] = await Promise.all([
        smmApi.getDailyReportByDate({ client: selectedClient, date: selectedDate }),
        smmApi.getAdSpendLogs({ client: selectedClient }),
      ]);

      if (reportRes.data?.success && reportRes.data.data) {
        setReport(reportRes.data.data);
      }

      if (logsRes.data?.success) {
        setSpendLogs(logsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch daily tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, [selectedClient, selectedDate]);

  // Helper to persist report state to MongoDB
  const persistReport = async (updatedReport) => {
    if (!selectedClient || !selectedDate) return;
    try {
      const clientId = typeof selectedClient === 'object' ? selectedClient._id : selectedClient;
      const payload = {
        client: clientId,
        date: selectedDate,
        contentSummary: updatedReport.contentSummary,
        organicSummary: updatedReport.organicSummary,
        adsSummary: updatedReport.adsSummary,
        notes: updatedReport.notes || [],
        activityTimeline: updatedReport.activityTimeline || [],
        status: updatedReport.status || 'Completed',
      };
      await smmApi.saveDailyReport(payload);
    } catch (err) {
      console.error('Failed to auto-save daily report:', err);
    }
  };

  const handleAddNote = async (e) => {
    if (e) e.preventDefault();
    if (!newNoteText || !newNoteText.trim()) {
      toast.error('Please enter a note before adding');
      return;
    }

    const updatedNotes = [
      ...(report.notes || []),
      { text: newNoteText.trim(), tag: newNoteTag },
    ];

    const updatedReport = {
      ...report,
      notes: updatedNotes,
    };

    setReport(updatedReport);
    setNewNoteText('');
    toast.success('Note added & saved!');
    await persistReport(updatedReport);
  };

  const handleRemoveNote = async (idx) => {
    const updatedNotes = (report.notes || []).filter((_, i) => i !== idx);
    const updatedReport = {
      ...report,
      notes: updatedNotes,
    };
    setReport(updatedReport);
    toast.success('Note removed');
    await persistReport(updatedReport);
  };

  const handleAddTimeline = async (e) => {
    if (e) e.preventDefault();
    if (!newTimelineDesc || !newTimelineDesc.trim()) {
      toast.error('Please enter an event description');
      return;
    }

    const updatedTimeline = [
      ...(report.activityTimeline || []),
      { time: newTimelineTime, description: newTimelineDesc.trim(), category: newTimelineCat },
    ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const updatedReport = {
      ...report,
      activityTimeline: updatedTimeline,
    };

    setReport(updatedReport);
    setNewTimelineDesc('');
    toast.success('Timeline event added & saved!');
    await persistReport(updatedReport);
  };

  const handleRemoveTimeline = async (idx) => {
    const updatedTimeline = (report.activityTimeline || []).filter((_, i) => i !== idx);
    const updatedReport = {
      ...report,
      activityTimeline: updatedTimeline,
    };
    setReport(updatedReport);
    toast.success('Timeline event removed');
    await persistReport(updatedReport);
  };

  const handleSaveReport = async () => {
    setSaving(true);
    try {
      const clientId = typeof selectedClient === 'object' ? selectedClient._id : selectedClient;
      const payload = {
        client: clientId,
        date: selectedDate,
        contentSummary: report.contentSummary,
        organicSummary: report.organicSummary,
        adsSummary: report.adsSummary,
        notes: report.notes || [],
        activityTimeline: report.activityTimeline || [],
        status: 'Completed',
      };
      const res = await smmApi.saveDailyReport(payload);
      if (res.data?.success) {
        toast.success('Daily Social Media Report saved successfully!');
        setReport(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to save daily report');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSpendSubmit = async (e) => {
    e.preventDefault();
    if (!spendForm.campaign) {
      toast.error('Please select a campaign');
      return;
    }
    try {
      const res = await smmApi.addAdSpendLog(spendForm);
      if (res.data?.success) {
        toast.success('Daily spend and funds recorded in ledger!');
        setIsSpendModalOpen(false);
        setSpendForm({
          campaign: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          amountAdded: 0,
          amountSpent: 0,
          leadsGenerated: 0,
          messages: 0,
          calls: 0,
          clicks: 0,
          impressions: 0,
          notes: '',
        });
        fetchDailyData();
      }
    } catch (err) {
      toast.error('Failed to log spend');
    }
  };

  const clientObj = clientsList.find((c) => c._id === selectedClient);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Clock className="text-primary shrink-0" size={22} />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Daily Tracking
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSpendModalOpen(true)}
            className="h-10 inline-flex items-center gap-1.5 px-4 bg-card text-foreground hover:bg-secondary font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <DollarSign size={15} className="text-foreground shrink-0" />
            <span>Log Spend / Funds</span>
          </button>

          <button
            onClick={handleSaveReport}
            disabled={saving}
            className="h-10 inline-flex items-center gap-1.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save size={15} className="shrink-0" />
            <span>{saving ? 'Saving...' : 'Save Report'}</span>
          </button>
        </div>
      </div>

      <SMMSubNav />

      {/* Date & Client Filter Header */}
      <div className="bg-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="h-10 px-3 bg-secondary/50 rounded-xl font-semibold text-xs outline-none focus:ring-2 focus:ring-brand/40 text-foreground cursor-pointer"
            >
              {clientsList.map((c) => (
                <option key={c._id} value={c._id}>{c.company || c.companyName || c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 px-3 bg-secondary/50 rounded-xl font-semibold text-xs outline-none focus:ring-2 focus:ring-brand/40 text-foreground cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            report.status === 'Completed'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-foreground '
          }`}>
            {report.status === 'Completed' ? (
              <>
                <CheckCircle2 size={12} className="shrink-0" />
                <span>Saved Report</span>
              </>
            ) : (
              'Draft Generated'
            )}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground">Loading daily tracking engine...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT & CENTER: DAILY SOCIAL MEDIA REPORT DOCUMENT (2 cols) ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* The Printable / Presentation Daily Report Card */}
            <div className="bg-card rounded-3xl p-6 space-y-6">
              {/* Report Header */}
              <div className="pb-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground block">
                    Daily Social Media & Ads Report
                  </span>
                  <h2 className="text-xl font-black text-foreground mt-0.5 truncate">
                    {clientObj?.company || clientObj?.name || 'Client Report'}
                  </h2>
                  <span className="text-xs text-muted-foreground font-semibold tabular-nums">
                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground block">Prepared by</span>
                  <span className="text-xs font-bold text-foreground">Rise With Media Agency OS</span>
                </div>
              </div>

              {/* 1. CONTENT BLOCK */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-foreground shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">1. Content Production & Publishing</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Videos Posted</span>
                    <span className="text-xl font-black text-foreground tabular-nums block mt-0.5">{report.contentSummary?.videosPosted || 0}</span>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Videos Scheduled</span>
                    <span className="text-xl font-black text-foreground tabular-nums block mt-0.5">{report.contentSummary?.videosScheduled || 0}</span>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Pending Approval</span>
                    <span className="text-xl font-black text-muted-foreground tabular-nums block mt-0.5">{report.contentSummary?.videosPendingApproval || 0}</span>
                  </div>
                </div>
              </div>

              {/* 2. ORGANIC BLOCK */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-foreground shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">2. Organic Performance</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Total Views</span>
                    <span className="text-lg font-black text-foreground tabular-nums block mt-0.5">
                      {(report.organicSummary?.views || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Total Reach</span>
                    <span className="text-lg font-black text-foreground tabular-nums block mt-0.5">
                      {(report.organicSummary?.reach || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Engagement</span>
                    <span className="text-lg font-black text-foreground tabular-nums block mt-0.5">
                      {(report.organicSummary?.engagement || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Followers Added</span>
                    <span className="text-lg font-black text-foreground tabular-nums block mt-0.5">
                      +{report.organicSummary?.followersGained || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. ADS BLOCK */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-foreground shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">3. Advertising Spend & Results</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-bold">Amount Added</span>
                    <span className="text-lg font-black text-foreground tabular-nums block mt-0.5">
                      ₹{(report.adsSummary?.amountAdded || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-bold">Amount Spent</span>
                    <span className="text-lg font-black text-foreground tabular-nums block mt-0.5">
                      ₹{(report.adsSummary?.amountSpent || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-bold">Leads Generated</span>
                    <span className="text-lg font-black text-foreground tabular-nums block mt-0.5">
                      {report.adsSummary?.leads || 0}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-2xl text-center">
                    <span className="text-[10px] text-muted-foreground block font-bold">Cost Per Lead (CPL)</span>
                    <span className="text-lg font-black text-foreground tabular-nums block mt-0.5">
                      ₹{report.adsSummary?.cpl || 0}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-secondary/30 flex items-center justify-between">
                    <span className="text-muted-foreground inline-flex items-center gap-1.5"><MessageSquare size={13} className="shrink-0" /> Direct Messages</span>
                    <span className="font-bold text-foreground tabular-nums">{report.adsSummary?.messages || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/30 flex items-center justify-between">
                    <span className="text-muted-foreground inline-flex items-center gap-1.5"><PhoneCall size={13} className="shrink-0" /> Phone Calls</span>
                    <span className="font-bold text-foreground tabular-nums">{report.adsSummary?.calls || 0}</span>
                  </div>
                </div>
              </div>

              {/* 4. DAILY NOTES (Structured with Tags) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-foreground shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">4. Qualitative Daily Notes</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Manager Insights & Observations</span>
                </div>

                <div className="space-y-2">
                  {(report.notes || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-secondary/20 text-center text-xs text-muted-foreground">
                      No notes logged for today yet. Use the note input below.
                    </div>
                  ) : (
                    report.notes.map((note, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-secondary/30 flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="mt-0.5 text-foreground shrink-0">
                            {note.tag === 'success' ? (
                              <CheckCircle2 size={14} />
                            ) : note.tag === 'warning' ? (
                              <AlertTriangle size={14} />
                            ) : (
                              <Info size={14} className="text-muted-foreground" />
                            )}
                          </span>
                          <span className={`leading-relaxed ${
                            note.tag === 'success' || note.tag === 'warning' ? 'text-foreground font-semibold' : 'text-foreground font-medium'
                          }`}>
                            {note.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNote(idx)}
                          className="text-muted-foreground hover:text-foreground p-1 cursor-pointer shrink-0"
                          title="Remove note"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Input */}
                <form onSubmit={handleAddNote} className="flex flex-wrap sm:flex-nowrap gap-2">
                  <select
                    value={newNoteTag}
                    onChange={(e) => setNewNoteTag(e.target.value)}
                    className="h-11 px-4 bg-secondary/75 rounded-xl text-sm font-normal outline-none focus:bg-background focus:ring-2 focus:ring-brand/40 text-foreground cursor-pointer shrink-0"
                  >
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="info">Note</option>
                  </select>
                  <input
                    type="text"
                    placeholder="e.g. Reel #42 performed strongly with 7.9% engagement..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNote();
                      }
                    }}
                    className="flex-1 h-11 px-4 bg-secondary/75 rounded-xl text-sm font-normal outline-none focus:bg-background focus:ring-2 focus:ring-brand/40 text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl text-sm shrink-0 cursor-pointer"
                  >
                    Add Note
                  </button>
                </form>
              </div>

              {/* 5. DAILY ACTIVITY TIMELINE */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">5. Day's Activity Timeline</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Chronological Activity Log</span>
                </div>

                <div className="space-y-2 relative ml-3 pl-4 py-1">
                  {(report.activityTimeline || []).length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2">No timeline events added yet.</div>
                  ) : (
                    report.activityTimeline.map((item, idx) => (
                      <div key={idx} className="relative flex items-center justify-between text-xs py-1">
                        <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-muted-foreground text-[11px]">{item.time}</span>
                          <span className="font-semibold text-foreground">{item.description}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeline(idx)}
                          className="text-muted-foreground hover:text-foreground p-1 cursor-pointer shrink-0"
                          title="Remove event"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Timeline Event Input */}
                <form onSubmit={handleAddTimeline} className="flex flex-wrap sm:flex-nowrap gap-2">
                  <input
                    type="time"
                    value={newTimelineTime}
                    onChange={(e) => setNewTimelineTime(e.target.value)}
                    className="h-11 px-4 bg-secondary/75 rounded-xl text-sm font-normal outline-none focus:bg-background focus:ring-2 focus:ring-brand/40 text-foreground cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="e.g. Campaign #3 budget increased to ₹5,000"
                    value={newTimelineDesc}
                    onChange={(e) => setNewTimelineDesc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTimeline();
                      }
                    }}
                    className="flex-1 h-11 px-4 bg-secondary/75 rounded-xl text-sm font-normal outline-none focus:bg-background focus:ring-2 focus:ring-brand/40 text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={handleAddTimeline}
                    className="h-11 px-5 bg-secondary text-foreground hover:bg-secondary/80 font-semibold rounded-xl text-sm shrink-0 cursor-pointer"
                  >
                    Add Event
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: DAILY CASH & SPEND LEDGER (1 col) ── */}
          <div className="space-y-6">
            <div className="bg-card rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <DollarSign size={16} className="text-foreground shrink-0" />
                    Campaign Cash Ledger
                  </h3>
                  <span className="text-[11px] text-muted-foreground">Amount Added vs Spent Balance</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSpendModalOpen(true)}
                  className="p-1.5 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90"
                  title="Log spend or funds"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-2.5">
                {spendLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">No spend entries logged for this client yet.</div>
                ) : (
                  spendLogs.slice(0, 8).map((log) => (
                    <div key={log._id} className="p-3 rounded-2xl bg-secondary/30 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground truncate min-w-0">{log.campaign?.name || 'Campaign'}</span>
                        <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] tabular-nums">
                        <span className="text-foreground font-semibold">+₹{(log.amountAdded || 0).toLocaleString()} added</span>
                        <span className="text-muted-foreground font-semibold">-₹{(log.amountSpent || 0).toLocaleString()} spent</span>
                      </div>
                      {log.leadsGenerated > 0 && (
                        <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                          <span>{log.leadsGenerated} leads generated</span>
                          <span>CPL: ₹{log.cpl || 0}</span>
                        </div>
                      )}
                      {log.isAnomaly && (
                        <div className="text-[10px] font-bold text-foreground bg-secondary p-1.5 rounded-md mt-1">
                          {log.anomalyReason}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: LOG DAILY SPEND / FUND DEPOSIT ── */}
      <Dialog open={isSpendModalOpen} onOpenChange={setIsSpendModalOpen}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
          <DialogHeader className="px-6 py-4 sm:py-5 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ">
                <DollarSign size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                  Log Ad Spend & Funds
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Log ad spend
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 text-[10px] font-mono font-medium text-muted-foreground select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
                <X size={16} className="stroke-[2.5]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleAddSpendSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Campaign *</label>
                <select
                  required
                  value={spendForm.campaign}
                  onChange={(e) => setSpendForm({ ...spendForm, campaign: e.target.value, sourceContentId: '' })}
                  className="w-full h-11 px-4 bg-background rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                >
                  <option value="">-- Choose Campaign --</option>
                  {campaignsList.map((c) => {
                    const comp = c.client?.company || c.client?.companyName || '';
                    const name = c.client?.name || '';
                    const clientLabel = comp && name && comp.toLowerCase() !== name.toLowerCase()
                      ? `${comp} - ${name}`
                      : (comp || name);
                    return (
                      <option key={c._id} value={c._id}>
                        {c.name} {clientLabel ? `(${clientLabel})` : ''} ({c.platform})
                      </option>
                    );
                  })}
                </select>
              </div>

              {spendForm.campaign && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Video in Campaign (Optional)</label>
                  <select
                    value={spendForm.sourceContentId}
                    onChange={(e) => setSpendForm({ ...spendForm, sourceContentId: e.target.value })}
                    className="w-full h-11 px-4 bg-background rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                  >
                    <option value="">-- Entire Campaign Level --</option>
                    {(campaignsList.find(c => String(c._id) === String(spendForm.campaign))?.sourceContentIds || []).map((v) => (
                      <option key={v._id || v} value={v._id || v}>
                        {v.name || 'Video'} ({v.contentType || 'Video'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Date *</label>
                <input
                  type="date"
                  required
                  value={spendForm.date}
                  onChange={(e) => setSpendForm({ ...spendForm, date: e.target.value })}
                  className="w-full h-11 px-4 bg-background rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Deposited Funds (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={spendForm.amountAdded}
                  onChange={(e) => setSpendForm({ ...spendForm, amountAdded: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background rounded-xl text-sm text-foreground tabular-nums focus:ring-2 focus:ring-primary/20 outline-none "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Amount Spent Today (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={spendForm.amountSpent}
                  onChange={(e) => setSpendForm({ ...spendForm, amountSpent: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background rounded-xl text-sm text-foreground tabular-nums focus:ring-2 focus:ring-primary/20 outline-none "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Leads Generated</label>
                <input
                  type="number"
                  placeholder="0"
                  value={spendForm.leadsGenerated}
                  onChange={(e) => setSpendForm({ ...spendForm, leadsGenerated: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background rounded-xl text-sm text-foreground tabular-nums focus:ring-2 focus:ring-primary/20 outline-none "
                />
              </div>

              {(Number(spendForm.amountAdded) > 0 || Number(spendForm.amountSpent) > 0) && (
                <div className="p-3 bg-secondary/50 rounded-xl flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Balance Amount (Deposited - Spent):</span>
                  <span className="font-bold font-mono tabular-nums text-foreground">
                    ₹{Math.max(0, (Number(spendForm.amountAdded) || 0) - (Number(spendForm.amountSpent) || 0)).toLocaleString()}
                  </span>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Messages Received</label>
                <input
                  type="number"
                  placeholder="0"
                  value={spendForm.messages}
                  onChange={(e) => setSpendForm({ ...spendForm, messages: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Phone Calls Received</label>
                <input
                  type="number"
                  placeholder="0"
                  value={spendForm.calls}
                  onChange={(e) => setSpendForm({ ...spendForm, calls: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-background rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Notes / Observations</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Targeting changed today resulting in lower CPL..."
                  value={spendForm.notes}
                  onChange={(e) => setSpendForm({ ...spendForm, notes: e.target.value })}
                  className="w-full min-h-[90px] p-3.5 bg-background rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
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
                  onClick={() => setIsSpendModalOpen(false)}
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-sm font-bold text-primary-foreground cursor-pointer transition-colors"
                >
                  Save Spend Entry
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
