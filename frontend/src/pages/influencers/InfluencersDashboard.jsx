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
} from '@/components/ui/muiIcons';
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
import { useDateFilter } from '../../context/DateFilterContext';
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
  const { isDateInRange } = useDateFilter();

  const { data: summary = {} } = useInfluencerSummary();
  const { data: rawInfluencers = [], isLoading } = useInfluencers({
    influencerType: activeTab !== 'analytics' ? activeTab : undefined,
    platform: platformFilter,
    category: categoryFilter,
    search,
  });

  const influencers = useMemo(
    () => rawInfluencers.filter((inf) => isDateInRange([inf.createdAt, inf.updatedAt])),
    [rawInfluencers, isDateInRange]
  );

  const deleteInfluencer = useDeleteInfluencer();

  // Table Columns
  const tableColumns = [
    {
      key: 'name',
      label: 'Influencer / Creator',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-secondary text-foreground flex items-center justify-center font-bold text-xs shrink-0">
            {item.name?.charAt(0) || 'I'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{item.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
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
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-foreground ">
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
        <span className="font-bold text-xs text-foreground tabular-nums">
          {item.followersCount ? Number(item.followersCount).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'cityLocation',
      label: 'Location',
      render: (item) => (
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <MapPin size={11} className="text-foreground shrink-0" />
          <span>{item.cityLocation || '—'}</span>
        </span>
      ),
    },
    {
      key: 'commercialRate',
      label: 'Rate / Reel',
      render: (item) => (
        <span className="font-bold text-xs text-foreground tabular-nums">
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
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => {
              setSelectedInfluencer(item);
              setShowAddModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(item._id)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
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
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-foreground uppercase tracking-wider">
          {item.platform}
        </span>
        <span className="text-xs font-bold text-foreground tabular-nums">
          {item.commercialRate ? formatINR(item.commercialRate) : 'Negotiable'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center font-black text-sm text-foreground shrink-0">
          {item.name?.charAt(0) || 'I'}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
          <p className="text-xs text-muted-foreground truncate">
            {item.handle ? `@${item.handle}` : item.category || 'Creator'}
          </p>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-secondary/40 space-y-1 text-xs tabular-nums">
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

      <div className="flex items-center justify-between pt-1 ">
        <button
          onClick={() => {
            setSelectedInfluencer(item);
            setShowDetailModal(true);
          }}
          className="text-xs font-semibold text-foreground hover:underline inline-flex items-center gap-1 cursor-pointer"
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
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setDeleteId(item._id)}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
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
      icon={Sparkles}
      properties={[
        { label: 'Local Creators', value: summary.localInfluencersCount || 0, icon: MapPin },
        { label: 'Standard Creators', value: summary.standardInfluencersCount || 0, icon: Globe },
        { label: 'Total Reach', value: (summary.totalFollowers || 0).toLocaleString(), tone: 'neutral', icon: Users },
        { label: 'Avg Rate', value: formatINR(summary.avgCostPerReel || 0), tone: 'neutral', icon: IndianRupee },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setSelectedInfluencer(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl transition-all hover:bg-primary/90 min-h-[38px] cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Influencer Profile</span>
        </Button>
      }
    >
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'Local Influencer', label: 'Local Influencers', icon: MapPin },
          { id: 'Standard Influencer', label: 'Standard Influencers', icon: Globe },
        ].map((t) => {
          const TabIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 min-h-[36px] cursor-pointer ${
                activeTab === t.id
                  ? 'bg-primary text-primary-foreground '
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <TabIcon size={13} className="shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
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
        <AlertDialogContent className="bg-card ">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Creator Profile?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
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
