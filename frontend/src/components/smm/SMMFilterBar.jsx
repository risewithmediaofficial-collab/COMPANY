import React, { useEffect, useState } from 'react';
import { smmApi } from '../../api/smm';
import { Building2, FolderKanban, Share2, Filter, RefreshCw, ChevronDown, ChevronUp } from '@/components/ui/muiIcons';

export const SMMFilterBar = ({ filters, onFilterChange, onReset }) => {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = [
    filters.client,
    filters.project,
    filters.platform,
    filters.contentType,
    filters.campaignStatus,
  ].filter(Boolean).length;

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

  return (
    <div className="bg-card rounded-2xl p-3.5 sm:p-4 mb-4 sm:mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 sm:pb-3 mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
          <h3 className="font-semibold text-xs sm:text-sm text-foreground">Marketing Filters</h3>
          {activeCount > 0 && (
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {activeCount} Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden flex items-center gap-1 text-[11px] font-semibold text-foreground bg-secondary px-2.5 py-1 rounded-lg"
          >
            <span>{mobileOpen ? 'Hide' : 'Show'} Filters</span>
            {mobileOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors font-medium px-2 sm:px-2.5 py-1 rounded-lg bg-secondary/70 hover:bg-secondary cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className={`${mobileOpen ? 'grid' : 'hidden sm:grid'} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3`}>
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
            className="w-full h-9 px-3 text-xs bg-background rounded-xl focus:ring-2 focus:ring-brand/40 outline-none transition-colors cursor-pointer"
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
            className="w-full h-9 px-3 text-xs bg-background rounded-xl focus:ring-2 focus:ring-brand/40 outline-none transition-colors disabled:opacity-50 cursor-pointer"
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
            className="w-full h-9 px-3 text-xs bg-background rounded-xl focus:ring-2 focus:ring-brand/40 outline-none transition-colors cursor-pointer"
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
            className="w-full h-9 px-3 text-xs bg-background rounded-xl focus:ring-2 focus:ring-brand/40 outline-none transition-colors cursor-pointer"
          >
            <option value="">All Content</option>
            <option value="Reel">Reel</option>
            <option value="Story">Story</option>
            <option value="Reel / Story">Reel / Story</option>
            <option value="Post">Post</option>
            <option value="Video">Video</option>
            <option value="Short">Short</option>
          </select>
        </div>

        {/* 5. Campaign Status */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Ad Campaign Status</label>
          <select
            value={filters.campaignStatus || ''}
            onChange={(e) => onFilterChange('campaignStatus', e.target.value)}
            className="w-full h-9 px-3 text-xs bg-background rounded-xl focus:ring-2 focus:ring-brand/40 outline-none transition-colors cursor-pointer"
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
      </div>
    </div>
  );
};
