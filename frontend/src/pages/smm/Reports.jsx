import React, { useEffect, useState } from 'react';
import {
  FileText, Download, Filter, Calendar, Users, BarChart, Sparkles,
  TrendingUp, Megaphone, CheckCircle2, AlertTriangle, ArrowUpRight, Printer
} from 'lucide-react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { PageHeader } from '../../components/ui/page';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

export default function Reports() {
  const [crmClients, setCrmClients] = useState([]);
  const [crmProjects, setCrmProjects] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [videos, setVideos] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [reportType, setReportType] = useState('monthly'); // 'monthly', 'weekly', 'daily'

  const [filters, setFilters] = useState({
    client: '',
    project: '',
    campaign: '',
    platform: '',
    startDate: '',
    endDate: '',
  });

  const [strategyNotes, setStrategyNotes] = useState({
    challenges: 'Two videos experienced delayed client approval. Meta ad CPM saw a slight increase over the weekend.',
    nextMonthStrategy: 'Scale budget on Top Performing Reel #42 by 25%. Introduce 4 client testimonial reels to improve lead conversion rate.',
  });

  useEffect(() => {
    Promise.all([
      api.get('/clients'),
      api.get('/projects'),
      smmApi.getCampaigns({ limit: 100 }),
      smmApi.getContents({ limit: 100 }),
      smmApi.getDashboardStats({ client: filters.client || undefined }),
    ]).then(([cRes, pRes, campRes, vRes, dashRes]) => {
      if (cRes.data) {
        const list = cRes.data.clients || cRes.data.data || (Array.isArray(cRes.data) ? cRes.data : []);
        setCrmClients(list);
        if (list.length > 0 && !filters.client) {
          setFilters((prev) => ({ ...prev, client: list[0]._id }));
        }
      }
      if (pRes.data) {
        const list = pRes.data.projects || pRes.data.data || (Array.isArray(pRes.data) ? pRes.data : []);
        setCrmProjects(list);
      }
      if (campRes.data?.success) setCampaigns(campRes.data.data || []);
      if (vRes.data?.success) setVideos(vRes.data.data || []);
      if (dashRes.data?.success) setDashboardData(dashRes.data.data);
    }).catch(err => {
      toast.error('Failed to load report parameters');
    });
  }, [filters.client]);

  const kpi = dashboardData?.kpi || {};
  const content = kpi.content || {};
  const organic = kpi.organic || {};
  const paid = kpi.paid || {};
  const topVideos = dashboardData?.topPerformingVideos || [];
  const selectedClientObj = crmClients.find((c) => c._id === filters.client);

  const handleExport = (type) => {
    toast.success(`Generating and downloading ${type.toUpperCase()} report...`);
    if (type === 'csv') {
      const csvContent = "data:text/csv;charset=utf-8,Campaign,Platform,Added,Spend,Leads,CPL,ROAS\n" +
        campaigns.map(c => `"${c.name}","${c.platform}",${c.amountAdded || 0},${c.amountSpent || 0},${c.performance?.leads || 0},${c.performance?.costPerLead || 0},${c.performance?.roas || 0}`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SMM_Client_Report_${new Date().toISOString().substring(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === 'print') {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automated Client Reports Engine"
        subtitle="Generate client-ready monthly presentations, weekly summaries, and operational exports"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('csv')} className="app-button-secondary gap-2 text-xs">
              <Download size={14} /> Export CSV
            </button>
            <button onClick={() => handleExport('print')} className="bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-primary/20 hover:opacity-90">
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        }
      />

      <SMMSubNav />

      {/* Filter & View Switcher */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Target Client</label>
            <select
              value={filters.client}
              onChange={e => setFilters({...filters, client: e.target.value})}
              className="h-9 px-3 bg-secondary/40 border border-border rounded-xl font-bold text-xs outline-none"
            >
              {crmClients.map(c => <option key={c._id} value={c._id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Report Cadence</label>
            <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-xl border border-border">
              {['monthly', 'weekly', 'daily'].map((cad) => (
                <button
                  key={cad}
                  onClick={() => setReportType(cad)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg uppercase ${
                    reportType === cad ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  {cad}
                </button>
              ))}
            </div>
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Auto-compiling from live Content, Organic & Ads database
        </span>
      </div>

      {/* ── AUTOMATED CLIENT-READY MONTH-END REPORT DOCUMENT ── */}
      <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-8 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="border-b border-border pb-6 flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-widest font-black text-primary block">
              Rise With Media • Performance OS
            </span>
            <h2 className="text-2xl font-black text-foreground mt-1">
              Monthly Social Media & Paid Advertising Performance Report
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 font-medium">
              <span>Client: <strong>{selectedClientObj?.company || selectedClientObj?.name}</strong></span>
              <span>•</span>
              <span>Period: <strong>August 2026</strong></span>
              <span>•</span>
              <span>Generated: <strong>{new Date().toLocaleDateString()}</strong></span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
            RWM
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY & KPIS */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <Sparkles size={16} className="text-primary" /> 1. Executive Performance Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/70 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Videos Published</span>
              <span className="text-2xl font-black text-foreground block mt-1">{content.posted || 0}</span>
            </div>
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/70 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Combined Views</span>
              <span className="text-2xl font-black text-foreground block mt-1">
                {((organic.views || 0) + (paid.views || 0)).toLocaleString()}
              </span>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Leads Generated</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">{paid.leads || 0}</span>
            </div>
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/70 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Average CPL</span>
              <span className="text-2xl font-black text-emerald-500 block mt-1">₹{paid.costPerLead || 0}</span>
            </div>
          </div>
        </div>

        {/* 2. ORGANIC CONTENT & AUDIENCE GROWTH */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" /> 2. Organic Traction & Community Growth
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary/20 rounded-2xl border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground block">Organic Reach</span>
              <span className="text-xl font-black text-foreground block">{(organic.reach || 0).toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground">Unique accounts reached</span>
            </div>
            <div className="p-4 bg-secondary/20 rounded-2xl border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground block">Organic Engagement Rate</span>
              <span className="text-xl font-black text-indigo-500 block">{organic.engagementRate || 0}%</span>
              <span className="text-[11px] text-muted-foreground">Based on {(organic.engagement || 0).toLocaleString()} interactions</span>
            </div>
            <div className="p-4 bg-secondary/20 rounded-2xl border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground block">Net Followers Gained</span>
              <span className="text-xl font-black text-emerald-500 block">+{organic.followersGained || 0}</span>
              <span className="text-[11px] text-muted-foreground">Target demographic expansion</span>
            </div>
          </div>
        </div>

        {/* 3. PAID ADVERTISING & FINANCIAL LEDGER */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <Megaphone size={16} className="text-emerald-500" /> 3. Paid Advertising & Budget Ledger
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <span className="text-[10px] text-blue-500 uppercase font-bold block">Total Funds Added</span>
              <span className="text-xl font-black text-foreground block mt-1">₹{(paid.amountAdded || 0).toLocaleString()}</span>
            </div>
            <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
              <span className="text-[10px] text-rose-500 uppercase font-bold block">Total Spend Utilized</span>
              <span className="text-xl font-black text-rose-500 block mt-1">₹{(paid.amountSpent || 0).toLocaleString()}</span>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <span className="text-[10px] text-emerald-500 uppercase font-bold block">Remaining Account Balance</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">₹{(paid.remainingBalance || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 4. TOP PERFORMING VIDEOS SHOWCASE */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <CheckCircle2 size={16} className="text-primary" /> 4. Top Performing Content Assets
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="px-4 py-3">Content / Reel Name</th>
                  <th className="px-4 py-3">Organic Views</th>
                  <th className="px-4 py-3">Engagement Rate</th>
                  <th className="px-4 py-3">Used as Ad?</th>
                  <th className="px-4 py-3 text-right">Ad Leads & CPL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {topVideos.map((v, i) => (
                  <tr key={v._id}>
                    <td className="px-4 py-3 font-bold text-foreground">
                      #{i + 1} {v.name}
                    </td>
                    <td className="px-4 py-3 font-semibold">{(v.views || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-indigo-500">{v.engagementRate}%</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.usedAsAd ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {v.usedAsAd ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      {v.paidLeads > 0 ? `${v.paidLeads} Leads (₹${v.paidCpl} CPL)` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. CHALLENGES & NEXT MONTH STRATEGY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border">
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-500 uppercase tracking-wider block flex items-center gap-1.5">
              <AlertTriangle size={15} /> Key Challenges & Bottlenecks
            </label>
            <textarea
              rows={3}
              value={strategyNotes.challenges}
              onChange={(e) => setStrategyNotes({ ...strategyNotes, challenges: e.target.value })}
              className="w-full p-3 bg-secondary/30 border border-border rounded-2xl text-xs outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-emerald-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Sparkles size={15} /> Strategic Recommendations for Next Month
            </label>
            <textarea
              rows={3}
              value={strategyNotes.nextMonthStrategy}
              onChange={(e) => setStrategyNotes({ ...strategyNotes, nextMonthStrategy: e.target.value })}
              className="w-full p-3 bg-secondary/30 border border-border rounded-2xl text-xs outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
