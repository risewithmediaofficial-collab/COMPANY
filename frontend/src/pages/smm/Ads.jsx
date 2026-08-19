import React, { useEffect, useState } from 'react';
import { Plus, Check, X, FileText, ExternalLink, Image as ImageIcon, Video, Layers, MessageSquare, TrendingUp, Target, DollarSign, Edit3, Sparkles } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

export default function Ads() {
  const [ads, setAds] = useState([]);
  const [adSets, setAdSets] = useState([]);
  const [videoList, setVideoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [selectedAdForLog, setSelectedAdForLog] = useState(null);

  const [formData, setFormData] = useState({
    name: '', adSet: '', sourceContentId: '', usedExistingVideo: false, status: 'Draft', creativeType: 'Video',
    primaryImage: '', videoUrl: '', thumbnail: '', headline: '',
    primaryText: '', description: '', cta: 'Learn More', destinationUrl: '',
    whatsappNumber: '', utmParameters: '', pixelEvent: '', approvalStatus: 'Pending'
  });

  const [adMetrics, setAdMetrics] = useState({
    leads: 0, spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpl: 0, roas: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adsRes, setsRes, videosRes] = await Promise.all([
        smmApi.getAds({ search, approvalStatus: approvalFilter }),
        smmApi.getAdSets({ limit: 100 }),
        smmApi.getContents({ limit: 100 }),
      ]);
      if (adsRes.data?.success) setAds(adsRes.data.data || []);
      if (setsRes.data?.success) setAdSets(setsRes.data.data || []);
      if (videosRes.data?.success) setVideoList(videosRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load Ads & Video records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, approvalFilter]);

  const handleApproval = async (id, status) => {
    try {
      await smmApi.updateAdApproval(id, { approvalStatus: status });
      toast.success(`Ad set to ${status}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update approval status');
    }
  };

  const handleSelectExistingVideo = (videoId) => {
    const video = videoList.find((v) => v._id === videoId);
    if (!video) {
      setFormData((prev) => ({ ...prev, sourceContentId: '', usedExistingVideo: false }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      sourceContentId: video._id,
      usedExistingVideo: true,
      name: prev.name || `${video.name} - Ad`,
      creativeType: video.contentType === 'Post' ? 'Image' : 'Video',
      thumbnail: video.thumbnail || '',
      videoUrl: video.contentUrl || '',
      headline: prev.headline || video.name,
      primaryText: prev.primaryText || video.caption || '',
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingAd) {
        await smmApi.updateAd(editingAd._id, formData);
        toast.success('Ad updated');
      } else {
        await smmApi.createAd(formData);
        toast.success('Ad created and connected to Video Database');
      }
      setIsDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save Ad');
    }
  };

  const openLogMetrics = (ad) => {
    setSelectedAdForLog(ad);
    setAdMetrics({
      leads: ad.performance?.leads || 0,
      spend: ad.performance?.spend || 0,
      revenue: ad.performance?.revenue || 0,
      conversions: ad.performance?.conversions || 0,
      impressions: ad.performance?.impressions || 0,
      clicks: ad.performance?.clicks || 0,
      ctr: ad.performance?.ctr || 0,
      cpc: ad.performance?.cpc || 0,
      cpl: ad.performance?.cpl || 0,
      roas: ad.performance?.roas || 0,
    });
    setIsLogDrawerOpen(true);
  };

  const handleSaveAdPerformance = async (e) => {
    e.preventDefault();
    try {
      const leads = Number(adMetrics.leads) || 0;
      const spend = Number(adMetrics.spend) || 0;
      const revenue = Number(adMetrics.revenue) || 0;
      const conversions = Number(adMetrics.conversions) || 0;
      const clicks = Number(adMetrics.clicks) || 0;
      const impressions = Number(adMetrics.impressions) || 0;

      const calculated = {
        ...adMetrics,
        leads,
        spend,
        revenue,
        conversions,
        clicks,
        impressions,
        cpl: leads > 0 ? Number((spend / leads).toFixed(2)) : 0,
        roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
      };

      await smmApi.updateAdPerformance(selectedAdForLog._id, calculated);
      toast.success('Ad lead performance logged successfully!');
      setIsLogDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save ad lead performance');
    }
  };

  const openAdd = () => {
    setEditingAd(null);
    setFormData({
      name: '', adSet: adSets[0]?._id || '', sourceContentId: '', usedExistingVideo: false, status: 'Draft', creativeType: 'Video',
      primaryImage: '', videoUrl: '', thumbnail: '', headline: '',
      primaryText: '', description: '', cta: 'Learn More', destinationUrl: '',
      whatsappNumber: '', utmParameters: '', pixelEvent: '', approvalStatus: 'Pending'
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingAd(row);
    setFormData({
      ...row,
      adSet: row.adSet?._id || row.adSet,
      sourceContentId: row.sourceContentId?._id || row.sourceContentId || '',
    });
    setIsDrawerOpen(true);
  };

  const columns = [
    {
      key: 'name',
      label: 'Ad & Creative',
      render: (row) => (
        <div>
          <span className="font-bold text-foreground block">{row.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">{row.adSet?.name || 'No Ad Set'} • {row.creativeType}</span>
            {row.sourceContentId && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-500/20">
                🎥 Linked Video
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'headline',
      label: 'Copy & CTA',
      render: (row) => (
        <div className="max-w-xs">
          <span className="text-xs font-semibold text-foreground truncate block">{row.headline || 'No Headline'}</span>
          <span className="text-[10px] text-muted-foreground line-clamp-1">{row.cta} • {row.destinationUrl || row.whatsappNumber || 'No Link'}</span>
        </div>
      ),
    },
    {
      key: 'leads',
      label: 'Leads & Spend',
      render: (row) => (
        <div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">{row.performance?.leads || 0} Leads</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Spent: ₹{(row.performance?.spend || 0).toLocaleString()} • CPL: ₹{row.performance?.cpl || 0}
          </span>
        </div>
      ),
    },
    {
      key: 'roas',
      label: 'ROAS & Rev',
      render: (row) => (
        <div>
          <span className="text-xs font-bold text-primary block">{row.performance?.roas ? `${row.performance.roas}x` : '—'} ROAS</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Rev: ₹{(row.performance?.revenue || 0).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadgeSmm status={row.status} />,
    },
    {
      key: 'approval',
      label: 'Approval',
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadgeSmm status={row.approvalStatus} />
          {row.approvalStatus === 'Pending' && (
            <div className="flex gap-1">
              <button onClick={() => handleApproval(row._id, 'Approved')} className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" title="Approve">
                <Check size={14} />
              </button>
              <button onClick={() => handleApproval(row._id, 'Rejected')} className="p-1 rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500/20" title="Reject">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'logPerformance',
      label: 'Log Leads',
      render: (row) => (
        <button
          onClick={() => openLogMetrics(row)}
          className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
        >
          <Target size={13} /> Log Leads
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ads Manager & Creative Performance"
        subtitle="Create ads linked directly to your central Video Database, track headlines, copy, CTAs, and log ROAS"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90">
            <Plus size={18} />
            Create Ad
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex-1 w-full">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Ads by name, video, or headline..." />
        </div>
        <div className="w-full sm:w-48">
          <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="app-select">
            <option value="">All Approvals</option>
            <option value="Pending">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <DataTable
        data={ads}
        columns={columns}
        loading={loading}
        onEdit={openEdit}
        onDelete={async (id) => {
          if (!window.confirm('Delete Ad?')) return;
          await smmApi.deleteAd(id);
          fetchData();
        }}
        emptyTitle="No Ads found"
        emptyDescription="Create your first Ad within an Ad Set."
      />

      {/* Log Leads & Performance Drawer */}
      <SMMDrawer
        isOpen={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
        title={`Log Leads & ROAS — ${selectedAdForLog?.name}`}
      >
        <form onSubmit={handleSaveAdPerformance} className="space-y-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-1">
            <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Direct Lead & ROAS Log</h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">Enter leads generated, actual spend, and revenue for this ad</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Leads Generated *</label>
              <input
                type="number"
                required
                value={adMetrics.leads}
                onChange={e => setAdMetrics({...adMetrics, leads: Number(e.target.value)})}
                className="app-input font-bold text-emerald-600 text-base"
                placeholder="e.g. 25"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Ad Spend Amount (₹)</label>
              <input
                type="number"
                value={adMetrics.spend}
                onChange={e => setAdMetrics({...adMetrics, spend: Number(e.target.value)})}
                className="app-input font-mono"
                placeholder="e.g. 2500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Revenue Generated (₹)</label>
              <input
                type="number"
                value={adMetrics.revenue}
                onChange={e => setAdMetrics({...adMetrics, revenue: Number(e.target.value)})}
                className="app-input font-mono text-emerald-600"
                placeholder="e.g. 15000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Conversions / Sales</label>
              <input
                type="number"
                value={adMetrics.conversions}
                onChange={e => setAdMetrics({...adMetrics, conversions: Number(e.target.value)})}
                className="app-input font-mono"
                placeholder="e.g. 4"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Clicks Count</label>
              <input
                type="number"
                value={adMetrics.clicks}
                onChange={e => setAdMetrics({...adMetrics, clicks: Number(e.target.value)})}
                className="app-input font-mono"
                placeholder="e.g. 350"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Impressions Count</label>
              <input
                type="number"
                value={adMetrics.impressions}
                onChange={e => setAdMetrics({...adMetrics, impressions: Number(e.target.value)})}
                className="app-input font-mono"
                placeholder="e.g. 12000"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button type="button" onClick={() => setIsLogDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-emerald-700">Save Ad Results</button>
          </div>
        </form>
      </SMMDrawer>

      {/* Create / Edit Ad Drawer */}
      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingAd ? 'Edit Ad' : 'Create New Ad'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Select Ad Set *</label>
            <select
              required
              value={formData.adSet}
              onChange={e => setFormData({...formData, adSet: e.target.value})}
              className="app-select"
            >
              <option value="">Select Ad Set</option>
              {adSets.map(s => <option key={s._id} value={s._id}>{s.name} ({s.campaign?.name})</option>)}
            </select>
          </div>

          {/* Connect to Existing Video from Central Video Database */}
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
            <label className="text-xs font-bold text-purple-600 dark:text-purple-400 block flex items-center gap-1.5">
              <Sparkles size={14} /> Creative Type: Select from Video Database
            </label>
            <select
              value={formData.sourceContentId}
              onChange={e => handleSelectExistingVideo(e.target.value)}
              className="app-select text-xs bg-background"
            >
              <option value="">-- Or Create Ad with Custom Creative --</option>
              {videoList.map(v => (
                <option key={v._id} value={v._id}>
                  {v.name} ({v.contentType}) {v.adRecommendation === '🔥 HIGH POTENTIAL' ? '🔥 HIGH POTENTIAL' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Ad Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="app-input"
              placeholder="e.g. Restaurant Reel #42 - August Campaign"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Creative Type</label>
              <select
                value={formData.creativeType}
                onChange={e => setFormData({...formData, creativeType: e.target.value})}
                className="app-select"
              >
                <option value="Video">Video</option>
                <option value="Image">Single Image</option>
                <option value="Carousel">Carousel</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">CTA Button</label>
              <select
                value={formData.cta}
                onChange={e => setFormData({...formData, cta: e.target.value})}
                className="app-select"
              >
                <option value="Learn More">Learn More</option>
                <option value="Book Now">Book Now</option>
                <option value="Contact Us">Contact Us</option>
                <option value="Call Now">Call Now</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Sign Up">Sign Up</option>
                <option value="Get Quote">Get Quote</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Headline</label>
            <input
              type="text"
              value={formData.headline}
              onChange={e => setFormData({...formData, headline: e.target.value})}
              className="app-input"
              placeholder="e.g. Experience authentic fine dining at 20% off"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Primary Text / Ad Copy</label>
            <textarea
              rows={3}
              value={formData.primaryText}
              onChange={e => setFormData({...formData, primaryText: e.target.value})}
              className="app-textarea"
              placeholder="Hook, value proposition, and call to action..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Destination URL</label>
              <input
                type="url"
                value={formData.destinationUrl}
                onChange={e => setFormData({...formData, destinationUrl: e.target.value})}
                className="app-input"
                placeholder="https://clientwebsite.com/offer"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">WhatsApp Number (Optional)</label>
              <input
                type="text"
                value={formData.whatsappNumber}
                onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                className="app-input"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="app-button-primary">Save Ad</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
