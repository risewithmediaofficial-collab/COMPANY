import React, { useEffect, useState } from 'react';
import { smmApi } from '../../api/smm';
import { Building2, FolderKanban, Calendar as CalendarIcon, Share2, Filter, RefreshCw } from 'lucide-react';

export const SMMFilterBar = ({ filters, onFilterChange, onReset }) => {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await smmApi.getClients();
        if (res.data?.success) {
          setClients(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load clients filter:', err);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const params = filters.client ? { client: filters.client } : {};
        const res = await smmApi.getProjects(params);
        if (res.data?.success) {
          setProjects(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load projects filter:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [filters.client]);

  const handleDateRangeSelect = (val) => {
    onFilterChange('dateRange', val);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (val === 'today') {
      onFilterChange('startDate', todayStr);
      onFilterChange('endDate', todayStr);
    } else if (val === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      onFilterChange('startDate', startOfMonth);
      onFilterChange('endDate', todayStr);
    } else if (val === 'last_30') {
      const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      onFilterChange('startDate', start30);
      onFilterChange('endDate', todayStr);
    } else if (val === 'all') {
      onFilterChange('startDate', '');
      onFilterChange('endDate', '');
    } else if (val === 'specific_date') {
      if (!filters.startDate) {
        onFilterChange('startDate', todayStr);
        onFilterChange('endDate', todayStr);
      }
    } else if (val === 'custom') {
      if (!filters.startDate) onFilterChange('startDate', todayStr);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Marketing System Filters</h3>
          {filters.client && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Client Active
            </span>
          )}
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium px-2.5 py-1 rounded-lg border border-border hover:bg-secondary"
        >
          <RefreshCw size={13} />
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Client Select */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <Building2 size={12} /> Client
          </label>
          <select
            value={filters.client || ''}
            onChange={(e) => {
              onFilterChange('client', e.target.value);
              onFilterChange('project', '');
            }}
            className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
          >
            <option value="">All Clients (Agency View)</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.companyName || c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Project Select */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <FolderKanban size={12} /> Project
          </label>
          <select
            value={filters.project || ''}
            onChange={(e) => onFilterChange('project', e.target.value)}
            disabled={loadingProjects}
            className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all disabled:opacity-50"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Platform */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <Share2 size={12} /> Platform
          </label>
          <select
            value={filters.platform || ''}
            onChange={(e) => onFilterChange('platform', e.target.value)}
            className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
          >
            <option value="">All Platforms</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="Meta">Meta Ads</option>
            <option value="Google">Google Ads</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="X/Twitter">Twitter / X</option>
          </select>
        </div>

        {/* 4. Content Type */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Content Type</label>
          <select
            value={filters.contentType || ''}
            onChange={(e) => onFilterChange('contentType', e.target.value)}
            className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
          >
            <option value="">All Content</option>
            <option value="Post">Post</option>
            <option value="Reel">Reel</option>
            <option value="Story">Story</option>
          </select>
        </div>

        {/* 5. Campaign Status */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Ad Campaign Status</label>
          <select
            value={filters.campaignStatus || ''}
            onChange={(e) => onFilterChange('campaignStatus', e.target.value)}
            className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Running">Running</option>
            <option value="Paused">Paused</option>
            <option value="Stopped">Stopped</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* 6. Date Range Select */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <CalendarIcon size={12} /> Date Range
          </label>
          <select
            value={filters.dateRange || 'all'}
            onChange={(e) => handleDateRangeSelect(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all font-medium"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="specific_date">Specific Date...</option>
            <option value="this_month">This Month</option>
            <option value="last_30">Last 30 Days</option>
            <option value="custom">Custom Date Range...</option>
          </select>
        </div>
      </div>

      {/* Conditionally rendered Specific Date / Custom Date pickers */}
      {filters.dateRange === 'specific_date' && (
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-3">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CalendarIcon size={14} className="text-primary" /> Select Specific Date:
          </span>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => {
              onFilterChange('startDate', e.target.value);
              onFilterChange('endDate', e.target.value);
            }}
            className="h-8 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-hidden font-medium"
          />
        </div>
      )}

      {filters.dateRange === 'custom' && (
        <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center gap-4">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CalendarIcon size={14} className="text-primary" /> Custom Date Range:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground font-medium">From:</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange('startDate', e.target.value)}
              className="h-8 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-hidden font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground font-medium">To:</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange('endDate', e.target.value)}
              className="h-8 px-3 text-xs bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 outline-hidden font-medium"
            />
          </div>
        </div>
      )}
    </div>
  );
};
