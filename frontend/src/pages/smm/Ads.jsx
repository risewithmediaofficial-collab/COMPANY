import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Check, X, FileText, ExternalLink, Image as ImageIcon, Video, Layers, MessageSquare, TrendingUp, Target, DollarSign, Edit3, Sparkles, Play, Pause, ArrowRight, Film } from '@/components/ui/muiIcons';
import { smmApi } from '../../api/smm';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, SearchField } from '../../components/ui/page';
import { StatusBadgeSmm } from '../../components/smm/StatusBadgeSmm';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { useDateFilter } from '../../context/DateFilterContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Ads() {
  const location = useLocation();
  const navigate = useNavigate();
  const { startDate, endDate, isDateInRange } = useDateFilter();

  const [rawAds, setAds] = useState([]);
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
    name: '', adSet: '', sourceContentId: '', usedExistingVideo: false, status: 'Active', creativeType: 'Video',
    primaryImage: '', videoUrl: '', thumbnail: '', headline: '',
    primaryText: '', description: '', cta: 'Learn More', destinationUrl: '',
    whatsappNumber: '', utmParameters: '', pixelEvent: '', approvalStatus: 'Approved'
  });

  const [adMetrics, setAdMetrics] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    leads: 0, spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpl: 0, roas: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adsRes, setsRes, videosRes] = await Promise.all([
        smmApi.getAds({ search, approvalStatus: approvalFilter, startDate: startDate || undefined, endDate: endDate || undefined }),
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
  }, [search, approvalFilter, startDate, endDate]);

  const ads = useMemo(
    () => rawAds.filter((a) => isDateInRange([a.createdAt, a.updatedAt])),
    [rawAds, isDateInRange]
  );

  // If navigated from AdSets with location.state.adSet, pre-fill and open drawer
  useEffect(() => {
    if (location.state?.adSet && adSets.length > 0) {
      const adSet = location.state.adSet;
      const campaign = location.state.campaign || adSet.campaign;
      const attachedVideoIds = adSet.sourceContentIds || campaign?.sourceContentIds || [];
      const firstVidId = attachedVideoIds[0]?._id || attachedVideoIds[0] || campaign?.sourceContentId?._id || campaign?.sourceContentId;
      const firstVid = videoList.find(v => String(v._id) === String(firstVidId));

      setEditingAd(null);
      setFormData({
        name: firstVid ? `${firstVid.name} - Running Ad` : `${adSet.name} - Ad #1`,
        adSet: adSet._id,
        sourceContentId: firstVid?._id || '',
        usedExistingVideo: Boolean(firstVid),
        status: 'Active',
        creativeType: firstVid?.contentType === 'Post' ? 'Image' : 'Video',
        primaryImage: firstVid?.thumbnail || '',
        videoUrl: firstVid?.contentUrl || '',
        thumbnail: firstVid?.thumbnail || '',
        headline: firstVid?.name || '',
        primaryText: firstVid?.caption || '',
        description: '',
        cta: (adSet.formType === 'Call' || adSet.formType === 'Calls')
          ? 'Call Now'
          : (adSet.formType === 'Message' || adSet.formType === 'Message Destination' || adSet.formType === 'Message Destinations' || adSet.formType === 'WhatsApp')
            ? 'Send Message'
            : (adSet.formType === 'App')
              ? 'Install Now'
              : (adSet.formType === 'Instagram' || adSet.formType === 'Facebook' || adSet.formType === 'Instagram & Facebook')
                ? 'Send Message'
                : (adSet.formType === 'Instant Form' || adSet.formType === 'Instant Forms')
                  ? 'Apply Now'
                  : 'Learn More',
        destinationUrl: '',
        whatsappNumber: '',
        utmParameters: '',
        pixelEvent: '',
        approvalStatus: 'Approved',
      });
      setIsDrawerOpen(true);
    }
  }, [location.state, adSets, videoList]);

  const selectedAdSet = useMemo(() => {
    return adSets.find(s => String(s._id) === String(formData.adSet));
  }, [adSets, formData.adSet]);

  const campaignVideos = useMemo(() => {
    if (!selectedAdSet) return videoList;
    const camp = selectedAdSet.campaign;
    const attachedIds = [
      ...(selectedAdSet.sourceContentIds || []),
      ...(camp?.sourceContentIds || []),
      ...(camp?.sourceContentId ? [camp.sourceContentId] : [])
    ].map(v => String(v._id || v));

    if (attachedIds.length > 0) {
      const matched = videoList.filter(v => attachedIds.includes(String(v._id)));
      if (matched.length > 0) return matched;
    }
    return videoList;
  }, [selectedAdSet, videoList]);

  const handleApproval = async (id, status) => {
    try {
      await smmApi.updateAdApproval(id, { approvalStatus: status });
      toast.success(`Ad set to ${status}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update approval status');
    }
  };

  const handleToggleStatus = async (ad) => {
    const newStatus = ad.status === 'Active' ? 'Paused' : 'Active';
    try {
      await smmApi.updateAd(ad._id, { status: newStatus });
      toast.success(`Ad is now ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
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
    if (!formData.name || !formData.adSet) {
      toast.error('Ad Name and Ad Set are required');
      return;
    }
    try {
      if (editingAd) {
        await smmApi.updateAd(editingAd._id, formData);
        toast.success('Ad updated successfully');
      } else {
        await smmApi.createAd(formData);
        toast.success('Ad launched and running!');
      }
      setIsDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save Ad');
    }
  };

  const openLogMetrics = (ad) => {
    setSelectedAdForLog(ad);
    setAdMetrics({
      date: format(new Date(), 'yyyy-MM-dd'),
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
      toast.success('Ad spend & lead results logged successfully!');
      setIsLogDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save ad lead performance');
    }
  };

  const openAdd = () => {
    setEditingAd(null);
    const firstSet = adSets[0];
    setFormData({
      name: '',
      adSet: firstSet?._id || '',
      sourceContentId: '',
      usedExistingVideo: false,
      status: 'Active',
      creativeType: 'Video',
      primaryImage: '',
      videoUrl: '',
      thumbnail: '',
      headline: '',
      primaryText: '',
      description: '',
      cta: 'Learn More',
      destinationUrl: '',
      whatsappNumber: '',
      utmParameters: '',
      pixelEvent: '',
      approvalStatus: 'Approved',
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
        <div className="min-w-0">
          <span className="font-semibold text-foreground block truncate">{row.name}</span>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">{row.adSet?.name || 'No Ad Set'} · {row.creativeType}</span>
            {row.sourceContentId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground font-semibold text-[10px] ">
                <Video size={10} className="shrink-0" />
                Linked Video
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
        <div className="max-w-xs min-w-0">
          <span className="text-xs font-semibold text-foreground truncate block">{row.headline || 'No Headline'}</span>
          <span className="text-[10px] text-muted-foreground line-clamp-1">{row.cta} · {row.destinationUrl || row.whatsappNumber || 'No Link'}</span>
        </div>
      ),
    },
    {
      key: 'leads',
      label: 'Leads & Spend',
      render: (row) => (
        <div className="tabular-nums">
          <span className="text-xs font-bold text-foreground block">{row.performance?.leads || 0} Leads</span>
          <span className="text-[10px] text-muted-foreground">
            Spent: ₹{(row.performance?.spend || 0).toLocaleString()} · CPL: ₹{row.performance?.cpl || 0}
          </span>
        </div>
      ),
    },
    {
      key: 'roas',
      label: 'ROAS & Rev',
      render: (row) => (
        <div className="tabular-nums">
          <span className="text-xs font-bold text-foreground block">{row.performance?.roas ? `${row.performance.roas}x` : '—'} ROAS</span>
          <span className="text-[10px] text-muted-foreground">
            Rev: ₹{(row.performance?.revenue || 0).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status & Delivery',
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadgeSmm status={row.status} />
          <button
            onClick={() => handleToggleStatus(row)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            {row.status === 'Active' ? <Pause size={10} className="shrink-0" /> : <Play size={10} className="shrink-0" />}
            <span>{row.status === 'Active' ? 'Running' : 'Resume'}</span>
          </button>
        </div>
      ),
    },
    {
      key: 'approval',
      label: 'Approval',
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadgeSmm status={row.approvalStatus} />
          {row.approvalStatus === 'Pending' && (
            <div className="flex gap-1">
              <button onClick={() => handleApproval(row._id, 'Approved')} className="p-1 rounded bg-secondary text-foreground hover:bg-secondary/80" title="Approve">
                <Check size={14} />
              </button>
              <button onClick={() => handleApproval(row._id, 'Rejected')} className="p-1 rounded bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80" title="Reject">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'logPerformance',
      label: 'Log Results',
      render: (row) => (
        <button
          onClick={() => openLogMetrics(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-xs font-semibold transition-colors"
        >
          <Target size={13} className="shrink-0" />
          <span>Log Leads &amp; Spend</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ads Manager"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <Plus size={18} className="shrink-0" />
            <span>Create Ad</span>
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 bg-card p-3 sm:p-4 rounded-2xl ">
        <div className="flex-1 w-full">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Ads by name, video, or headline..." />
        </div>
        <div className="w-full sm:w-48">
          <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="app-select w-full">
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
        emptyDescription=""
      />

      {/* Log Leads & Performance Drawer */}
      <SMMDrawer
        isOpen={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
        title={`Log Leads & Spend — ${selectedAdForLog?.name}`}
      >
        <form onSubmit={handleSaveAdPerformance} className="space-y-5 text-left">
          <div className="p-4 bg-secondary/50 rounded-2xl">
            <h4 className="text-sm font-bold text-foreground">Direct Lead &amp; Spend Log</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Leads Generated *</label>
              <input
                type="number"
                required
                value={adMetrics.leads}
                onChange={e => setAdMetrics({...adMetrics, leads: Number(e.target.value)})}
                className="app-input tabular-nums"
                placeholder="e.g. 25"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Ad Spend Amount (₹)</label>
              <input
                type="number"
                value={adMetrics.spend}
                onChange={e => setAdMetrics({...adMetrics, spend: Number(e.target.value)})}
                className="app-input tabular-nums"
                placeholder="e.g. 2500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Revenue Generated (₹)</label>
              <input
                type="number"
                value={adMetrics.revenue}
                onChange={e => setAdMetrics({...adMetrics, revenue: Number(e.target.value)})}
                className="app-input tabular-nums"
                placeholder="e.g. 15000"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Conversions / Sales</label>
              <input
                type="number"
                value={adMetrics.conversions}
                onChange={e => setAdMetrics({...adMetrics, conversions: Number(e.target.value)})}
                className="app-input tabular-nums"
                placeholder="e.g. 4"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Clicks Count</label>
              <input
                type="number"
                value={adMetrics.clicks}
                onChange={e => setAdMetrics({...adMetrics, clicks: Number(e.target.value)})}
                className="app-input tabular-nums"
                placeholder="e.g. 350"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Impressions Count</label>
              <input
                type="number"
                value={adMetrics.impressions}
                onChange={e => setAdMetrics({...adMetrics, impressions: Number(e.target.value)})}
                className="app-input tabular-nums"
                placeholder="e.g. 12000"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2.5">
            <button type="button" onClick={() => setIsLogDrawerOpen(false)} className="h-11 px-5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/95 transition-colors cursor-pointer">Save Ad Results</button>
          </div>
        </form>
      </SMMDrawer>

      {/* Create / Edit Ad Drawer */}
      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingAd ? 'Edit Ad' : 'Create & Launch Ad (Step 3 of 3)'}
      >
        <form onSubmit={handleSave} className="space-y-5 text-left">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Ad Set *</label>
            <select
              required
              value={formData.adSet}
              onChange={e => {
                const chosenSetId = e.target.value;
                const chosenSet = adSets.find(s => String(s._id) === String(chosenSetId));
                const newCta = (chosenSet?.formType === 'Call' || chosenSet?.formType === 'Calls')
                  ? 'Call Now'
                  : (chosenSet?.formType === 'Message' || chosenSet?.formType === 'Message Destination' || chosenSet?.formType === 'Message Destinations' || chosenSet?.formType === 'WhatsApp')
                    ? 'Send Message'
                    : (chosenSet?.formType === 'App')
                      ? 'Install Now'
                      : (chosenSet?.formType === 'Instagram' || chosenSet?.formType === 'Facebook' || chosenSet?.formType === 'Instagram & Facebook')
                        ? 'Send Message'
                        : (chosenSet?.formType === 'Instant Form' || chosenSet?.formType === 'Instant Forms')
                          ? 'Apply Now'
                          : (formData.cta || 'Learn More');
                setFormData(prev => ({ ...prev, adSet: chosenSetId, cta: newCta }));
              }}
              className="app-select"
            >
              <option value="">Select Ad Set</option>
              {adSets.map(s => <option key={s._id} value={s._id}>{s.name} ({s.campaign?.name || 'Campaign'})</option>)}
            </select>
          </div>

          {/* Select Video from Campaign / Database */}
          <div className="p-4 rounded-2xl bg-secondary/50 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <Sparkles size={14} className="shrink-0" />
                <span>Select Video from Campaign to Run</span>
              </label>
              {formData.sourceContentId && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground bg-primary px-2.5 py-0.5 rounded-full shrink-0">
                  <Check size={11} className="shrink-0" />
                  Video Selected
                </span>
              )}
            </div>
            <select
              value={formData.sourceContentId}
              onChange={e => handleSelectExistingVideo(e.target.value)}
              className="app-select bg-background"
            >
              <option value="">-- Choose Campaign Video / Reel to Run Ad --</option>
              {campaignVideos.map(v => (
                <option key={v._id} value={v._id}>
                  {v.name} ({v.contentType}){v.adRecommendation === '🔥 HIGH POTENTIAL' ? ' [High Potential]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Ad Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="app-input"
              placeholder="e.g. Restaurant Reel #42 - August Campaign"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Delivery Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="app-select"
              >
                <option value="Active">Active &amp; Running</option>
                <option value="Draft">Draft</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">CTA Button</label>
              <select
                value={formData.cta}
                onChange={e => setFormData({...formData, cta: e.target.value})}
                className="app-select"
              >
                <option value="WhatsApp">WhatsApp (Direct Message)</option>
                <option value="Learn More">Learn More</option>
                <option value="Book Now">Book Now</option>
                <option value="Contact Us">Contact Us</option>
                <option value="Call Now">Call Now</option>
                <option value="Sign Up">Sign Up</option>
                <option value="Get Quote">Get Quote</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Headline</label>
            <input
              type="text"
              value={formData.headline}
              onChange={e => setFormData({...formData, headline: e.target.value})}
              className="app-input"
              placeholder="e.g. Experience authentic fine dining at 20% off"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Primary Text / Ad Copy</label>
            <textarea
              rows={3}
              value={formData.primaryText}
              onChange={e => setFormData({...formData, primaryText: e.target.value})}
              className="w-full min-h-[96px] px-4 py-3 rounded-xl bg-secondary/75 text-sm font-normal text-foreground outline-none focus:bg-background focus:ring-2 focus:ring-primary/20"
              placeholder="Hook, value proposition, and call to action..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Destination URL</label>
              <input
                type="url"
                value={formData.destinationUrl}
                onChange={e => setFormData({...formData, destinationUrl: e.target.value})}
                className="app-input"
                placeholder="https://clientwebsite.com/offer"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">WhatsApp Number (Optional)</label>
              <input
                type="text"
                value={formData.whatsappNumber}
                onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                className="app-input"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2.5">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="h-11 px-5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/95 transition-colors cursor-pointer">Save &amp; Launch Ad</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
