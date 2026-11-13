import React, { useEffect, useState } from 'react';
import { smmApi } from '../../api/smm';
import { Building2, FolderKanban, Share2, Filter, RefreshCw, ChevronDown, ChevronUp } from '@/components/ui/muiIcons';
import { SelectDropdown } from '../ui/SelectDropdown';

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
          <SelectDropdown
            value={filters.client || ''}
            onChange={(val) => {
              onFilterChange('client', val || '');
              onFilterChange('project', '');
            }}
            options={[
              { value: '', label: 'All Clients (Agency View)' },
              ...clients.map((c) => ({
                value: c._id,
                label: c.companyName || c.name,
              })),
            ]}
            placeholder="All Clients"
            allowCustom={false}
            className="w-full"
            buttonClassName="h-9 px-3 text-xs bg-background rounded-xl border border-border/50"
          />
        </div>

        {/* 2. Project Select */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <FolderKanban size={12} /> Project
          </label>
          <SelectDropdown
            value={filters.project || ''}
            onChange={(val) => onFilterChange('project', val || '')}
            options={[
              { value: '', label: 'All Projects' },
              ...projects.map((p) => ({
                value: p._id,
                label: p.name,
              })),
            ]}
            placeholder="All Projects"
            allowCustom={false}
            className="w-full"
            buttonClassName="h-9 px-3 text-xs bg-background rounded-xl border border-border/50"
          />
        </div>

        {/* 3. Platform */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <Share2 size={12} /> Platform
          </label>
          <SelectDropdown
            value={filters.platform || ''}
            onChange={(val) => onFilterChange('platform', val || '')}
            options={[
              { value: '', label: 'All Platforms' },
              { value: 'Instagram', label: 'Instagram' },
              { value: 'Facebook', label: 'Facebook' },
              { value: 'Meta', label: 'Meta Ads' },
              { value: 'Google', label: 'Google Ads' },
              { value: 'LinkedIn', label: 'LinkedIn' },
              { value: 'YouTube', label: 'YouTube' },
              { value: 'X/Twitter', label: 'Twitter / X' },
            ]}
            placeholder="All Platforms"
            allowCustom={false}
            className="w-full"
            buttonClassName="h-9 px-3 text-xs bg-background rounded-xl border border-border/50"
          />
        </div>

        {/* 4. Content Type */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Content Type</label>
          <SelectDropdown
            value={filters.contentType || ''}
            onChange={(val) => onFilterChange('contentType', val || '')}
            options={[
              { value: '', label: 'All Content' },
              { value: 'Reel', label: 'Reel' },
              { value: 'Story', label: 'Story' },
              { value: 'Reel / Story', label: 'Reel / Story' },
              { value: 'Post', label: 'Post' },
              { value: 'Video', label: 'Video' },
              { value: 'Short', label: 'Short' },
            ]}
            placeholder="All Content"
            allowCustom={false}
            className="w-full"
            buttonClassName="h-9 px-3 text-xs bg-background rounded-xl border border-border/50"
          />
        </div>

        {/* 5. Campaign Status */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Ad Campaign Status</label>
          <SelectDropdown
            value={filters.campaignStatus || ''}
            onChange={(val) => onFilterChange('campaignStatus', val || '')}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'Running', label: 'Running' },
              { value: 'Paused', label: 'Paused' },
              { value: 'Stopped', label: 'Stopped' },
              { value: 'Completed', label: 'Completed' },
            ]}
            placeholder="All Statuses"
            allowCustom={false}
            className="w-full"
            buttonClassName="h-9 px-3 text-xs bg-background rounded-xl border border-border/50"
          />
        </div>
      </div>
    </div>
  );
};
