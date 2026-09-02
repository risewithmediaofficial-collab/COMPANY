import React, { useState, useEffect } from 'react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import {
  Clock, Plus, Calendar, FileText, CheckCircle2, AlertTriangle,
  Info, TrendingUp, Megaphone, DollarSign, Download, Save,
  Layers, Check, Sparkles, PhoneCall, MessageSquare, AlertCircle, X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

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
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Clock className="text-primary" size={24} />
            Daily Tracking & Social Media Report
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log daily content publishing, organic results, daily spend ledger, tagged notes, and activity timeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSpendModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-secondary text-foreground hover:bg-secondary/80 font-semibold text-xs rounded-xl border border-border transition-all cursor-pointer"
          >
            <DollarSign size={15} className="text-emerald-500" />
            <span>Log Spend / Funds</span>
          </button>

          <button
            onClick={handleSaveReport}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save Daily Report'}</span>
          </button>
        </div>
      </div>

      <SMMSubNav />

      {/* Date & Client Filter Header */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Select Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="h-9 px-3 bg-secondary/40 border border-border rounded-xl font-bold text-xs outline-none text-foreground cursor-pointer"
            >
              {clientsList.map((c) => (
                <option key={c._id} value={c._id}>{c.company || c.companyName || c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Report Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 bg-secondary/40 border border-border rounded-xl font-bold text-xs outline-none text-foreground cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            report.status === 'Completed'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {report.status === 'Completed' ? '✓ Saved Report' : 'Draft Generated'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground animate-pulse">Loading daily tracking engine...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT & CENTER: DAILY SOCIAL MEDIA REPORT DOCUMENT (2 cols) ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* The Printable / Presentation Daily Report Card */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
              {/* Report Header */}
              <div className="border-b border-border/80 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-primary block">
                    Daily Social Media & Ads Report
                  </span>
                  <h2 className="text-xl font-black text-foreground mt-0.5">
                    {clientObj?.company || clientObj?.name || 'Client Report'}
                  </h2>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Prepared by</span>
                  <span className="text-xs font-bold text-foreground">Rise With Media Agency OS</span>
                </div>
              </div>

              {/* 1. CONTENT BLOCK */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">1. Content Production & Publishing</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-secondary/30 rounded-2xl border border-border/60 text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Videos Posted</span>
                    <span className="text-xl font-black text-emerald-500 block mt-0.5">{report.contentSummary?.videosPosted || 0}</span>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-2xl border border-border/60 text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Videos Scheduled</span>
                    <span className="text-xl font-black text-sky-500 block mt-0.5">{report.contentSummary?.videosScheduled || 0}</span>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-2xl border border-border/60 text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Pending Approval</span>
                    <span className="text-xl font-black text-amber-500 block mt-0.5">{report.contentSummary?.videosPendingApproval || 0}</span>
                  </div>
                </div>
              </div>

              {/* 2. ORGANIC BLOCK */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">2. Organic Performance</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-secondary/30 rounded-2xl border border-border/60 text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Total Views</span>
                    <span className="text-lg font-black text-foreground block mt-0.5">
                      {(report.organicSummary?.views || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-2xl border border-border/60 text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Total Reach</span>
                    <span className="text-lg font-black text-foreground block mt-0.5">
                      {(report.organicSummary?.reach || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-2xl border border-border/60 text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Engagement</span>
                    <span className="text-lg font-black text-foreground block mt-0.5">
                      {(report.organicSummary?.engagement || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-2xl border border-border/60 text-center">
                    <span className="text-[10px] text-muted-foreground block font-semibold">Followers Added</span>
                    <span className="text-lg font-black text-emerald-500 block mt-0.5">
                      +{report.organicSummary?.followersGained || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. ADS BLOCK */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">3. Advertising Spend & Results</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center">
                    <span className="text-[10px] text-blue-400 block font-bold">Amount Added</span>
                    <span className="text-lg font-black text-foreground block mt-0.5">
                      ₹{(report.adsSummary?.amountAdded || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-center">
                    <span className="text-[10px] text-rose-400 block font-bold">Amount Spent</span>
                    <span className="text-lg font-black text-rose-400 block mt-0.5">
                      ₹{(report.adsSummary?.amountSpent || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center">
                    <span className="text-[10px] text-emerald-400 block font-bold">Leads Generated</span>
                    <span className="text-lg font-black text-emerald-400 block mt-0.5">
                      {report.adsSummary?.leads || 0}
                    </span>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-2xl border border-border text-center">
                    <span className="text-[10px] text-muted-foreground block font-bold">Cost Per Lead (CPL)</span>
                    <span className="text-lg font-black text-emerald-400 block mt-0.5">
                      ₹{report.adsSummary?.cpl || 0}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-secondary/20 border border-border flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><MessageSquare size={13} /> Direct Messages</span>
                    <span className="font-bold text-foreground">{report.adsSummary?.messages || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/20 border border-border flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><PhoneCall size={13} /> Phone Calls</span>
                    <span className="font-bold text-foreground">{report.adsSummary?.calls || 0}</span>
                  </div>
                </div>
              </div>

              {/* 4. DAILY NOTES (Structured with Tags) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">4. Qualitative Daily Notes</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Manager Insights & Observations</span>
                </div>

                <div className="space-y-2">
                  {(report.notes || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border text-center text-xs text-muted-foreground">
                      No notes logged for today yet. Use the note input below.
                    </div>
                  ) : (
                    report.notes.map((note, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-secondary/30 border border-border/80 flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 font-bold">
                            {note.tag === 'success' ? '✓' : note.tag === 'warning' ? '⚠' : 'ℹ'}
                          </span>
                          <span className={`font-medium ${
                            note.tag === 'success' ? 'text-emerald-400 font-semibold' : note.tag === 'warning' ? 'text-amber-400 font-semibold' : 'text-foreground'
                          }`}>
                            {note.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNote(idx)}
                          className="text-muted-foreground hover:text-rose-400 p-1 cursor-pointer"
                          title="Remove note"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Input */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <select
                    value={newNoteTag}
                    onChange={(e) => setNewNoteTag(e.target.value)}
                    className="h-9 px-2.5 bg-secondary/40 border border-border rounded-xl text-xs font-bold outline-none text-foreground cursor-pointer shrink-0"
                  >
                    <option value="success">✓ Success</option>
                    <option value="warning">⚠ Warning</option>
                    <option value="info">ℹ Note</option>
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
                    className="flex-1 h-9 px-3 bg-secondary/40 border border-border rounded-xl text-xs outline-none text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow-xs"
                  >
                    + Add Note
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

                <div className="space-y-2 relative border-l-2 border-border/80 ml-3 pl-4 py-1">
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
                          className="text-muted-foreground hover:text-rose-400 p-1 cursor-pointer"
                          title="Remove event"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Timeline Event Input */}
                <form onSubmit={handleAddTimeline} className="flex gap-2">
                  <input
                    type="time"
                    value={newTimelineTime}
                    onChange={(e) => setNewTimelineTime(e.target.value)}
                    className="h-9 px-2 bg-secondary/40 border border-border rounded-xl text-xs font-mono font-bold outline-none text-foreground cursor-pointer shrink-0"
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
                    className="flex-1 h-9 px-3 bg-secondary/40 border border-border rounded-xl text-xs outline-none text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={handleAddTimeline}
                    className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-bold rounded-xl text-xs shrink-0 cursor-pointer border border-border"
                  >
                    + Add Event
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: DAILY CASH & SPEND LEDGER (1 col) ── */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-500" />
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
                    <div key={log._id} className="p-3 rounded-2xl bg-secondary/30 border border-border/70 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{log.campaign?.name || 'Campaign'}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-400 font-semibold">+₹{(log.amountAdded || 0).toLocaleString()} added</span>
                        <span className="text-rose-400 font-semibold">-₹{(log.amountSpent || 0).toLocaleString()} spent</span>
                      </div>
                      {log.leadsGenerated > 0 && (
                        <div className="pt-1 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{log.leadsGenerated} leads generated</span>
                          <span>CPL: ₹{log.cpl || 0}</span>
                        </div>
                      )}
                      {log.isAnomaly && (
                        <div className="text-[10px] font-bold text-rose-400 bg-rose-500/10 p-1 rounded-md mt-1">
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
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Log Daily Ad Spend & Funds Added</DialogTitle>
            <DialogDescription>
              Record daily spend, leads generated, and any budget deposited for real-time ledger accounting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSpendSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Select Campaign *</label>
              <select
                required
                value={spendForm.campaign}
                onChange={(e) => setSpendForm({ ...spendForm, campaign: e.target.value })}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs text-foreground"
              >
                <option value="">-- Choose Campaign --</option>
                {campaignsList.map((c) => (
                  <option key={c._id} value={c._id}>{c.name} ({c.platform})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={spendForm.date}
                  onChange={(e) => setSpendForm({ ...spendForm, date: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs text-foreground"
                />
              </div>
              <div>
                <label className="font-semibold text-blue-400 block mb-1">Amount Added (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={spendForm.amountAdded}
                  onChange={(e) => setSpendForm({ ...spendForm, amountAdded: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-rose-400 block mb-1">Amount Spent Today (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={spendForm.amountSpent}
                  onChange={(e) => setSpendForm({ ...spendForm, amountSpent: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs text-foreground"
                />
              </div>
              <div>
                <label className="font-semibold text-emerald-400 block mb-1">Leads Generated</label>
                <input
                  type="number"
                  placeholder="0"
                  value={spendForm.leadsGenerated}
                  onChange={(e) => setSpendForm({ ...spendForm, leadsGenerated: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Messages Received</label>
                <input
                  type="number"
                  placeholder="0"
                  value={spendForm.messages}
                  onChange={(e) => setSpendForm({ ...spendForm, messages: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs text-foreground"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Phone Calls Received</label>
                <input
                  type="number"
                  placeholder="0"
                  value={spendForm.calls}
                  onChange={(e) => setSpendForm({ ...spendForm, calls: Number(e.target.value) })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl outline-none text-xs text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Notes / Observations</label>
              <textarea
                rows={2}
                placeholder="e.g. Targeting changed today resulting in lower CPL..."
                value={spendForm.notes}
                onChange={(e) => setSpendForm({ ...spendForm, notes: e.target.value })}
                className="w-full p-2.5 bg-background border border-border rounded-xl outline-none text-xs text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsSpendModalOpen(false)}
                className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl text-xs shadow-md shadow-primary/20 cursor-pointer"
              >
                Save Spend Entry
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
