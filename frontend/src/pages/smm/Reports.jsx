import React, { useEffect, useState } from 'react';
import {
  FileText, Download, Filter, Calendar, Users, BarChart, Sparkles,
  TrendingUp, Megaphone, CheckCircle2, AlertTriangle, ArrowUpRight, Printer
} from '@/components/ui/muiIcons';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { PageHeader } from '../../components/ui/page';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { useDateFilter } from '../../context/DateFilterContext';
import { toast } from 'sonner';
import { SelectDropdown } from '../../components/ui/SelectDropdown';

export default function Reports() {
  const { startDate, endDate, period: globalPeriod, isDateInRange } = useDateFilter();
  const [crmClients, setCrmClients] = useState([]);
  const [crmProjects, setCrmProjects] = useState([]);
  const [rawCampaigns, setRawCampaigns] = useState([]);
  const [videos, setVideos] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [reportType, setReportType] = useState('monthly'); // 'monthly', 'weekly', 'daily'

  const [filters, setFilters] = useState({
    client: '',
    project: '',
    campaign: '',
    platform: '',
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
      smmApi.getContents({ limit: 100, startDate: startDate || undefined, endDate: endDate || undefined }),
      smmApi.getDashboardStats({
        client: filters.client || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
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
      if (campRes.data?.success) setRawCampaigns(campRes.data.data || []);
      if (vRes.data?.success) setVideos(vRes.data.data || []);
      if (dashRes.data?.success) setDashboardData(dashRes.data.data);
    }).catch(err => {
      toast.error('Failed to load report parameters');
    });
  }, [filters.client, startDate, endDate]);

  const campaigns = React.useMemo(
    () => rawCampaigns.filter((c) => isDateInRange([c.startDate, c.endDate, c.createdAt])),
    [rawCampaigns, isDateInRange]
  );

  const periodDisplayLabel = React.useMemo(() => {
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Up to ${endDate}`;
    return globalPeriod === 'yearly'
      ? `${new Date().getFullYear()}`
      : 'All Dates';
  }, [startDate, endDate, globalPeriod]);

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
        title="Client Reports"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('csv')} className="app-button-secondary gap-2 text-xs">
              <Download size={14} className="shrink-0" />
              <span>Export CSV</span>
            </button>
            <button onClick={() => handleExport('print')} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 hover:bg-primary/90 transition-colors">
              <Printer size={15} className="shrink-0" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        }
      />

      <SMMSubNav />

      {/* Filter & View Switcher */}
      <div className="bg-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Target Client</label>
            <SelectDropdown
              value={filters.client}
              onChange={(val) => setFilters({ ...filters, client: val || '' })}
              options={[
                { value: '', label: 'All Clients' },
                ...crmClients.map((c) => ({
                  value: c._id,
                  label: c.company || c.companyName || c.name,
                })),
              ]}
              placeholder="All Clients"
              allowCustom={false}
              className="w-44 sm:w-52"
              buttonClassName="h-9 px-3 bg-secondary/50 rounded-xl font-semibold text-xs text-foreground border border-border/50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Report Cadence</label>
            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl ">
              {['monthly', 'weekly', 'daily'].map((cad) => (
                <button
                  key={cad}
                  onClick={() => setReportType(cad)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg uppercase transition-colors ${
                    reportType === cad ? 'bg-primary text-primary-foreground ' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cad}
                </button>
              ))}
            </div>
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-medium">
          Auto-compiling from live Content, Organic &amp; Ads database
        </span>
      </div>

      {/* ── AUTOMATED CLIENT-READY MONTH-END REPORT DOCUMENT ── */}
      <div className="bg-card rounded-2xl p-6 sm:p-8 space-y-8 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="pb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground block">
              Rise With Media · Performance OS
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              Monthly Social Media &amp; Paid Advertising Performance Report
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5 font-medium">
              <span>Client: <strong className="text-foreground">{selectedClientObj?.company || selectedClientObj?.name}</strong></span>
              <span>·</span>
              <span>Period: <strong className="text-foreground">{periodDisplayLabel}</strong></span>
              <span>·</span>
              <span className="tabular-nums">Generated: <strong className="text-foreground">{new Date().toLocaleDateString()}</strong></span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm tracking-tight shrink-0">
            RWM
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY & KPIS */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Sparkles size={16} className="text-foreground shrink-0" />
            <span>1. Executive Performance Summary</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-secondary/40 rounded-xl text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Total Videos Published</span>
              <span className="text-2xl font-bold text-foreground block mt-1 tabular-nums">{content.posted || 0}</span>
            </div>
            <div className="p-4 bg-secondary/40 rounded-xl text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Combined Views</span>
              <span className="text-2xl font-bold text-foreground block mt-1 tabular-nums">
                {((organic.views || 0) + (paid.views || 0)).toLocaleString()}
              </span>
            </div>
            <div className="p-4 bg-secondary/40 rounded-xl text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Leads Generated</span>
              <span className="text-2xl font-bold text-foreground block mt-1 tabular-nums">{paid.leads || 0}</span>
            </div>
            <div className="p-4 bg-secondary/40 rounded-xl text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Average CPL</span>
              <span className="text-2xl font-bold text-foreground block mt-1 tabular-nums">₹{paid.costPerLead || 0}</span>
            </div>
          </div>
        </div>

        {/* 2. ORGANIC CONTENT & AUDIENCE GROWTH */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <TrendingUp size={16} className="text-foreground shrink-0" />
            <span>2. Organic Traction &amp; Community Growth</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary/35 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-muted-foreground block">Organic Reach</span>
              <span className="text-xl font-bold text-foreground block tabular-nums">{(organic.reach || 0).toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground">Unique accounts reached</span>
            </div>
            <div className="p-4 bg-secondary/35 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-muted-foreground block">Organic Engagement Rate</span>
              <span className="text-xl font-bold text-foreground block tabular-nums">{organic.engagementRate || 0}%</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">Based on {(organic.engagement || 0).toLocaleString()} interactions</span>
            </div>
            <div className="p-4 bg-secondary/35 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-muted-foreground block">Net Followers Gained</span>
              <span className="text-xl font-bold text-foreground block tabular-nums">+{organic.followersGained || 0}</span>
              <span className="text-[11px] text-muted-foreground">Target demographic expansion</span>
            </div>
          </div>
        </div>

        {/* 3. PAID ADVERTISING & FINANCIAL LEDGER */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Megaphone size={16} className="text-foreground shrink-0" />
            <span>3. Paid Advertising &amp; Budget Ledger</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-secondary/40 rounded-xl ">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Total Funds Added</span>
              <span className="text-xl font-bold text-foreground block mt-1 tabular-nums">₹{(paid.amountAdded || 0).toLocaleString()}</span>
            </div>
            <div className="p-4 bg-secondary/40 rounded-xl ">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Total Spend Utilized</span>
              <span className="text-xl font-bold text-foreground block mt-1 tabular-nums">₹{(paid.amountSpent || 0).toLocaleString()}</span>
            </div>
            <div className="p-4 bg-secondary/40 rounded-xl ">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Remaining Account Balance</span>
              <span className="text-xl font-bold text-foreground block mt-1 tabular-nums">₹{(paid.remainingBalance || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 4. TOP PERFORMING VIDEOS SHOWCASE */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <CheckCircle2 size={16} className="text-foreground shrink-0" />
            <span>4. Top Performing Content Assets</span>
          </h3>
          <div className="responsive-table-container overflow-x-auto rounded-xl ">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="bg-secondary/60 text-muted-foreground font-semibold ">
                <tr>
                  <th className="px-4 py-3">Content / Reel Name</th>
                  <th className="px-4 py-3 text-right">Organic Views</th>
                  <th className="px-4 py-3 text-right">Engagement Rate</th>
                  <th className="px-4 py-3 text-center">Used as Ad?</th>
                  <th className="px-4 py-3 text-right">Ad Leads &amp; CPL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.05] font-medium tabular-nums">
                {topVideos.map((v, i) => (
                  <tr key={v._id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      #{i + 1} {v.name}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{(v.views || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{v.engagementRate}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.usedAsAd ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground '
                      }`}>
                        {v.usedAsAd ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {v.paidLeads > 0 ? `${v.paidLeads} Leads (₹${v.paidCpl} CPL)` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. CHALLENGES & NEXT MONTH STRATEGY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 ">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
              <AlertTriangle size={15} className="shrink-0" />
              <span>Key Challenges &amp; Bottlenecks</span>
            </label>
            <textarea
              rows={3}
              value={strategyNotes.challenges}
              onChange={(e) => setStrategyNotes({ ...strategyNotes, challenges: e.target.value })}
              className="w-full p-3 bg-secondary/30 rounded-xl text-xs text-foreground outline-none focus:ring-2 focus:ring-brand/40 "
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles size={15} className="shrink-0" />
              <span>Strategic Recommendations for Next Month</span>
            </label>
            <textarea
              rows={3}
              value={strategyNotes.nextMonthStrategy}
              onChange={(e) => setStrategyNotes({ ...strategyNotes, nextMonthStrategy: e.target.value })}
              className="w-full p-3 bg-secondary/30 rounded-xl text-xs text-foreground outline-none focus:ring-2 focus:ring-brand/40 "
            />
          </div>
        </div>
      </div>
    </div>
  );
}
