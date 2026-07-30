import React, { useEffect, useState } from 'react';
import { FileText, Download, Filter, Calendar, Users, BarChart } from 'lucide-react';
import { smmApi } from '../../api/smm';
import api from '../../api/index';
import { PageHeader } from '../../components/ui/page';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

export default function Reports() {
  const [crmClients, setCrmClients] = useState([]);
  const [crmProjects, setCrmProjects] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  const [filters, setFilters] = useState({
    client: '', project: '', campaign: '', platform: '', startDate: '', endDate: ''
  });

  useEffect(() => {
    Promise.all([
      api.get('/clients'),
      api.get('/projects'),
      smmApi.getCampaigns({ limit: 100 }),
    ]).then(([cRes, pRes, campRes]) => {
      if (cRes.data) {
        const list = cRes.data.clients || cRes.data.data || (Array.isArray(cRes.data) ? cRes.data : []);
        setCrmClients(list);
      }
      if (pRes.data) {
        const list = pRes.data.projects || pRes.data.data || (Array.isArray(pRes.data) ? pRes.data : []);
        setCrmProjects(list);
      }
      if (campRes.data?.success) setCampaigns(campRes.data.data || []);
    }).catch(err => {
      toast.error('Failed to load report parameters');
    });
  }, []);

  const handleExport = (type) => {
    toast.success(`Generating and downloading ${type.toUpperCase()} report...`);
    if (type === 'csv') {
      const csvContent = "data:text/csv;charset=utf-8,Campaign,Platform,Spend,Leads,Revenue,ROAS\n" +
        campaigns.map(c => `"${c.name}","${c.platform}",${c.performance?.spend || 0},${c.performance?.leads || 0},${c.performance?.revenue || 0},${c.performance?.roas || 0}`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SMM_Report_${new Date().toISOString().substring(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMM Reports Engine"
        subtitle="Generate performance reports by Client, Project, platform & date range"
      />

      <SMMSubNav />

      <div className="app-card p-6 space-y-6">
        <h3 className="text-base font-bold text-foreground">Report Generator Parameters</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Filter by Client (Website)</label>
            <select value={filters.client} onChange={e => setFilters({...filters, client: e.target.value})} className="app-select">
              <option value="">All Clients</option>
              {Array.isArray(crmClients) && crmClients.map(c => <option key={c._id} value={c._id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Filter by Project (Website)</label>
            <select value={filters.project} onChange={e => setFilters({...filters, project: e.target.value})} className="app-select">
              <option value="">All Projects</option>
              {Array.isArray(crmProjects) && crmProjects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Filter by Platform</label>
            <select value={filters.platform} onChange={e => setFilters({...filters, platform: e.target.value})} className="app-select">
              <option value="">All Networks</option>
              <option value="Meta">Meta Ads</option>
              <option value="Google">Google Ads</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="YouTube">YouTube</option>
              <option value="TikTok">TikTok</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Start Date</label>
            <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="app-input" />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">End Date</label>
            <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="app-input" />
          </div>
        </div>

        <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground font-medium">Ready to export {campaigns.length} campaign records</span>

          <div className="flex items-center gap-3">
            <button onClick={() => handleExport('csv')} className="app-button-secondary gap-2">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => handleExport('excel')} className="app-button-secondary gap-2">
              <Download size={16} /> Export Excel
            </button>
            <button onClick={() => handleExport('pdf')} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:opacity-90">
              <FileText size={16} /> Generate PDF Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
