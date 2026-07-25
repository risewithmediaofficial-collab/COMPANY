import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import {
  Sparkles,
  MapPin,
  Globe,
  Plus,
  Search,
  Users,
  IndianRupee,
  Star,
  Eye,
  Pencil,
  Trash2,
  Phone,
  BarChart3,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

import { Button } from '../../components/ui/button';
import {
  MetricCard,
  MetricGrid,
  PageHeader,
  SearchField,
  SectionCard,
  StatusBadge,
} from '../../components/ui/page';
import { DataTable } from '../../components/ui/DataTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  useInfluencers,
  useInfluencerSummary,
  useDeleteInfluencer,
} from '../../hooks/useInfluencers';
import { AddEditInfluencerModal } from '../../components/modals/AddEditInfluencerModal';
import { InfluencerDetailModal } from '../../components/modals/InfluencerDetailModal';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const LAYOUT_TABS = [
  { id: 'Local Influencer', label: '📍 Local Influencers', icon: MapPin },
  { id: 'Standard Influencer', label: '🌐 Standard Influencers', icon: Globe },
  { id: 'analytics', label: '📊 Reach & Commercials', icon: BarChart3 },
];

const PLATFORMS = ['all', 'Instagram', 'YouTube', 'Facebook', 'Moj', 'Josh', 'X', 'Multi-platform'];
const CATEGORIES = [
  'all',
  'Food & Dining',
  'Fashion & Lifestyle',
  'Tech & Gadgets',
  'Entertainment & Comedy',
  'Fitness & Health',
  'Beauty & Makeup',
  'Local Events & Vlogs',
  'Travel & Tourism',
  'General / Multipurpose',
];

const InfluencersDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'superAdmin';
  const isManager = user?.role === 'manager';

  // Access Control Guard: Only Admin & Manager
  if (!isAdmin && !isManager) {
    return <Navigate to="/" replace />;
  }

  const [activeTab, setActiveTab] = useState('Local Influencer');
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Queries
  const { data: summary = {} } = useInfluencerSummary();
  const { data: influencers = [], isLoading } = useInfluencers({
    influencerType: activeTab !== 'analytics' ? activeTab : undefined,
    platform: platformFilter,
    category: categoryFilter,
    search,
  });

  const deleteInfluencer = useDeleteInfluencer();

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="🌟 Influencers Dashboard"
        description="Comprehensive directory for Local Influencers & Standard Commercial Content Creators."
        actions={
          <Button size="sm" onClick={() => { setSelectedInfluencer(null); setShowAddModal(true); }}>
            <Plus size={16} className="mr-1" /> Add Influencer Profile
          </Button>
        }
      />

      {/* Metric Summary Cards */}
      <MetricGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Local Influencers"
          value={summary.localInfluencersCount || 0}
          helper="City & regional creators"
          icon={MapPin}
          tone="success"
        />
        <MetricCard
          label="Standard Influencers"
          value={summary.standardInfluencersCount || 0}
          helper="Macro / Commercial creators"
          icon={Globe}
          tone="primary"
        />
        <MetricCard
          label="Total Reach Audience"
          value={(summary.totalReach || 0).toLocaleString('en-IN')}
          helper="Combined followers across platforms"
          icon={Users}
          tone="info"
        />
        <MetricCard
          label="Avg Reel Rate"
          value={currency.format(summary.avgReelCost || 0)}
          helper="Average cost per reel promo"
          icon={IndianRupee}
          tone="warning"
        />
      </MetricGrid>

      {/* Layout Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {LAYOUT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1 & 2: LOCAL INFLUENCERS / STANDARD INFLUENCERS */}
      {(activeTab === 'Local Influencer' || activeTab === 'Standard Influencer') && (
        <div className="space-y-6">
          <SectionCard
            title={`${activeTab === 'Local Influencer' ? '📍 Local Influencers Directory' : '🌐 Standard Commercial Influencers'}`}
            description={
              activeTab === 'Local Influencer'
                ? 'City-specific, regional vloggers, local business promoters, and event appearance creators.'
                : 'Commercial brand ambassadors, macro/micro creators, and multi-platform digital influencers.'
            }
          >
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <SearchField value={search} onChange={setSearch} placeholder="Search name, handle, city, notes..." />

                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                >
                  <option value="all">All Platforms</option>
                  {PLATFORMS.filter((p) => p !== 'all').map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                <select
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.filter((c) => c !== 'all').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Influencer Grid Cards Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {influencers.slice(0, 6).map((inf) => (
                <div
                  key={inf._id}
                  onClick={() => { setSelectedInfluencer(inf); setShowDetailModal(true); }}
                  className="p-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{inf.name}</h4>
                      <p className="text-xs font-semibold text-primary">{inf.handle}</p>
                    </div>
                    <StatusBadge tone={inf.influencerType === 'Local Influencer' ? 'success' : 'primary'}>
                      {inf.platform}
                    </StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Followers</span>
                      <span className="font-bold text-foreground">{(inf.followersCount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Reel Rate</span>
                      <span className="font-bold text-emerald-600">₹{(inf.pricing?.reelCost || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" /> {inf.cityLocation || 'Local'}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400" /> {inf.rating || 5}.0
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Influencers Data Table */}
            <DataTable
              data={influencers}
              columns={[
                {
                  key: 'name',
                  label: 'Creator & Handle',
                  render: (row) => (
                    <div>
                      <div className="font-bold text-foreground">{row.name}</div>
                      <div className="text-xs text-primary font-semibold">{row.handle}</div>
                    </div>
                  ),
                },
                {
                  key: 'category',
                  label: 'Category & Platform',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-semibold text-foreground">{row.category}</div>
                      <div className="text-muted-foreground">{row.platform}</div>
                    </div>
                  ),
                },
                {
                  key: 'location',
                  label: 'City / Location',
                  render: (row) => (
                    <div className="text-xs font-medium text-foreground flex items-center gap-1">
                      <MapPin size={12} className="text-rose-500" /> {row.cityLocation || 'Regional'}
                    </div>
                  ),
                },
                {
                  key: 'reach',
                  label: 'Followers / Eng.',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-bold text-emerald-600">{(row.followersCount || 0).toLocaleString('en-IN')}</div>
                      <div className="text-muted-foreground">{row.engagementRate || 0}% Eng.</div>
                    </div>
                  ),
                },
                {
                  key: 'rates',
                  label: 'Reel / Event Rate',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-bold text-foreground">Reel: ₹{(row.pricing?.reelCost || 0).toLocaleString('en-IN')}</div>
                      <div className="text-muted-foreground">Event: ₹{(row.pricing?.eventCost || 0).toLocaleString('en-IN')}</div>
                    </div>
                  ),
                },
                {
                  key: 'contact',
                  label: 'Contact',
                  render: (row) => (
                    <div className="text-xs">
                      <div className="font-medium text-foreground">{row.contactName || 'Direct'}</div>
                      <div className="text-muted-foreground">{row.phone || row.whatsapp || row.email || 'N/A'}</div>
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedInfluencer(row); setShowDetailModal(true); }}>
                        <Eye size={14} className="text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedInfluencer(row); setShowAddModal(true); }}>
                        <Pencil size={14} className="text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => setDeleteId(row._id)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              emptyTitle={`No ${activeTab} Profiles Found`}
              emptyDescription="Click Add Influencer Profile to add your first creator record manually."
            />
          </SectionCard>
        </div>
      )}

      {/* TAB 3: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <SectionCard title="Creator Reach & Pricing Analytics" description="Audience reach comparison and commercial rates distribution.">
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={influencers.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="followersCount" name="Followers Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pricing.reelCost" name="Reel Cost (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Influencer Record</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this creator profile? This action will remove the record from active directories.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (deleteId) { await deleteInfluencer.mutateAsync(deleteId); setDeleteId(null); } }}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      <AddEditInfluencerModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        influencer={selectedInfluencer}
        defaultType={activeTab !== 'analytics' ? activeTab : 'Standard Influencer'}
      />

      <InfluencerDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        influencer={selectedInfluencer}
        onEdit={(inf) => { setSelectedInfluencer(inf); setShowAddModal(true); }}
        onDelete={(inf) => setDeleteId(inf._id)}
      />
    </div>
  );
};

export default InfluencersDashboard;
