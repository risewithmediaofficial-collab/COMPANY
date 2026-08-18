import { useState, useMemo } from 'react';
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
  Instagram,
  Youtube,
  Video,
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
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';
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
import { formatINR } from '../../utils/currency';

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
  const isAdmin = user?.role === 'superAdmin' || user?.role === 'admin';
  const isManager = user?.role === 'manager';

  if (!isAdmin && !isManager) {
    return <Navigate to="/" replace />;
  }

  const [activeTab, setActiveTab] = useState('Local Influencer'); // 'Local Influencer' | 'Standard Influencer' | 'analytics'
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { data: summary = {} } = useInfluencerSummary();
  const { data: influencers = [], isLoading } = useInfluencers({
    influencerType: activeTab !== 'analytics' ? activeTab : undefined,
    platform: platformFilter,
    category: categoryFilter,
    search,
  });

  const deleteInfluencer = useDeleteInfluencer();

  // Table Columns
  const tableColumns = [
    {
      key: 'name',
      label: 'Influencer / Creator',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {item.name?.charAt(0) || 'I'}
          </div>
          <div>
            <p className="font-bold text-foreground">{item.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {item.handle ? `@${item.handle}` : item.cityLocation || 'No handle'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'platform',
      label: 'Platform',
      render: (item) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-foreground">
          {item.platform}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Niche / Category',
      render: (item) => (
        <span className="text-xs text-muted-foreground font-medium">
          {item.category || 'General'}
        </span>
      ),
    },
    {
      key: 'followers',
      label: 'Followers / Reach',
      render: (item) => (
        <span className="font-bold text-xs text-foreground">
          {item.followersCount ? Number(item.followersCount).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'cityLocation',
      label: 'Location',
      render: (item) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin size={11} className="text-primary" />
          <span>{item.cityLocation || '—'}</span>
        </span>
      ),
    },
    {
      key: 'commercialRate',
      label: 'Rate / Reel',
      render: (item) => (
        <span className="font-bold text-xs text-emerald-600">
          {item.commercialRate ? formatINR(item.commercialRate) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setSelectedInfluencer(item);
              setShowDetailModal(true);
            }}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => {
              setSelectedInfluencer(item);
              setShowAddModal(true);
            }}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(item._id)}
            className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Cards Render
  const renderCard = (item) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
          {item.platform}
        </span>
        <span className="text-xs font-bold text-emerald-600">
          {item.commercialRate ? formatINR(item.commercialRate) : 'Negotiable'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center font-black text-sm text-foreground">
          {item.name?.charAt(0) || 'I'}
        </div>
        <div>
          <h4 className="font-bold text-sm text-foreground">{item.name}</h4>
          <p className="text-xs text-muted-foreground">
            {item.handle ? `@${item.handle}` : item.category || 'Creator'}
          </p>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Followers:</span>
          <span className="font-bold text-foreground">
            {item.followersCount ? Number(item.followersCount).toLocaleString() : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">City:</span>
          <span className="font-medium text-foreground">{item.cityLocation || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Niche:</span>
          <span className="font-medium text-foreground">{item.category || 'General'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <button
          onClick={() => {
            setSelectedInfluencer(item);
            setShowDetailModal(true);
          }}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <Eye size={13} />
          <span>View Profile</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedInfluencer(item);
              setShowAddModal(true);
            }}
            className="p-1 rounded hover:bg-secondary text-muted-foreground"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setDeleteId(item._id)}
            className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Delivery', 'Influencer Hub']}
      title="Influencer Hub & Creator Roster"
      subtitle="Directory of regional and national content creators, rate cards, follower reach, and commercial collaboration history."
      icon="🌟"
      properties={[
        { label: 'Local Creators', value: summary.localInfluencersCount || 0, icon: MapPin },
        { label: 'Standard Creators', value: summary.standardInfluencersCount || 0, icon: Globe },
        { label: 'Total Reach', value: (summary.totalFollowers || 0).toLocaleString(), tone: 'info', icon: Users },
        { label: 'Avg Rate', value: formatINR(summary.avgCostPerReel || 0), tone: 'success', icon: IndianRupee },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setSelectedInfluencer(null);
            setShowAddModal(true);
          }}
          className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Add Influencer Profile</span>
        </Button>
      }
    >
      {/* Category Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {[
          { id: 'Local Influencer', label: '📍 Local Influencers' },
          { id: 'Standard Influencer', label: '🌐 Standard Influencers' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DatabaseView
        viewKey="rwm_influencers_view_v1"
        views={['cards', 'table']}
        items={influencers}
        totalCount={influencers.length}
        searchPlaceholder="Search creators by name, handle, city, or niche..."
        columns={tableColumns}
        renderCard={renderCard}
        onSearchChange={setSearch}
      />

      {showAddModal && (
        <AddEditInfluencerModal
          open={showAddModal}
          onOpenChange={(val) => {
            setShowAddModal(val);
            if (!val) setSelectedInfluencer(null);
          }}
          influencer={selectedInfluencer}
          defaultType={activeTab !== 'analytics' ? activeTab : 'Local Influencer'}
        />
      )}

      {showDetailModal && selectedInfluencer && (
        <InfluencerDetailModal
          open={showDetailModal}
          onOpenChange={(val) => {
            setShowDetailModal(val);
          }}
          influencer={selectedInfluencer}
          onEdit={() => {
            setShowDetailModal(false);
            setShowAddModal(true);
          }}
        />
      )}

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Creator Profile?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This creator will be removed from your agency database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteInfluencer.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
};

export default InfluencersDashboard;
