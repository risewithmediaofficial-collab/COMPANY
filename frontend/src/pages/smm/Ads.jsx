import React, { useEffect, useState } from 'react';
import { Plus, Check, X, FileText, ExternalLink, Image as ImageIcon, Video, Layers, MessageSquare } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  const [formData, setFormData] = useState({
    name: '', adSet: '', status: 'Draft', creativeType: 'Image',
    primaryImage: '', videoUrl: '', thumbnail: '', headline: '',
    primaryText: '', description: '', cta: 'Learn More', destinationUrl: '',
    whatsappNumber: '', utmParameters: '', pixelEvent: '', approvalStatus: 'Pending'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adsRes, setsRes] = await Promise.all([
        smmApi.getAds({ search, approvalStatus: approvalFilter }),
        smmApi.getAdSets({ limit: 100 }),
      ]);
      if (adsRes.data?.success) setAds(adsRes.data.data || []);
      if (setsRes.data?.success) setAdSets(setsRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load Ads');
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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingAd) {
        await smmApi.updateAd(editingAd._id, formData);
        toast.success('Ad updated');
      } else {
        await smmApi.createAd(formData);
        toast.success('Ad created');
      }
      setIsDrawerOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save Ad');
    }
  };

  const openAdd = () => {
    setEditingAd(null);
    setFormData({
      name: '', adSet: adSets[0]?._id || '', status: 'Draft', creativeType: 'Image',
      primaryImage: '', videoUrl: '', thumbnail: '', headline: '',
      primaryText: '', description: '', cta: 'Learn More', destinationUrl: '',
      whatsappNumber: '', utmParameters: '', pixelEvent: '', approvalStatus: 'Pending'
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingAd(row);
    setFormData({ ...row, adSet: row.adSet?._id || row.adSet });
    setIsDrawerOpen(true);
  };

  const columns = [
    {
      key: 'name',
      label: 'Ad Name & Creative',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.primaryImage || row.thumbnail ? (
            <img src={row.primaryImage || row.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover border border-border bg-secondary" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
              {row.creativeType === 'Video' ? <Video size={18} /> : <ImageIcon size={18} />}
            </div>
          )}
          <div>
            <span className="font-semibold text-foreground block">{row.name}</span>
            <span className="text-xs text-muted-foreground">{row.headline || 'No Headline'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'adSet',
      label: 'Ad Set',
      render: (row) => <span className="text-xs font-medium text-foreground">{row.adSet?.name || 'Unassigned'}</span>,
    },
    {
      key: 'cta',
      label: 'CTA & Destination',
      render: (row) => (
        <div>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-secondary border border-border inline-block mb-0.5">{row.cta}</span>
          {row.destinationUrl && (
            <a href={row.destinationUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1 block">
              <ExternalLink size={10} /> Link
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'approvalStatus',
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
      key: 'status',
      label: 'Ad Status',
      render: (row) => <StatusBadgeSmm status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ads"
        subtitle="Manage ad creatives, headlines, copy text, CTAs and approval status"
        actions={
          <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90">
            <Plus size={18} />
            Create Ad
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex-1 w-full">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Ads by name or headline..." />
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

      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingAd ? 'Edit Ad' : 'Create Ad'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-foreground mb-1 block">Ad Name *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="app-input" placeholder="e.g. Carousel Ad - Benefits 1" />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Ad Set *</label>
              <select required value={formData.adSet} onChange={e => setFormData({...formData, adSet: e.target.value})} className="app-select">
                <option value="">Select Ad Set</option>
                {adSets.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Creative Type</label>
              <select value={formData.creativeType} onChange={e => setFormData({...formData, creativeType: e.target.value})} className="app-select">
                <option value="Image">Single Image</option>
                <option value="Video">Video</option>
                <option value="Carousel">Carousel</option>
                <option value="Collection">Collection</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Creative Assets</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Primary Image / Media URL</label>
                <input type="text" value={formData.primaryImage} onChange={e => setFormData({...formData, primaryImage: e.target.value})} className="app-input" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Video URL (if applicable)</label>
                <input type="text" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} className="app-input" placeholder="https://..." />
              </div>
            </div>
          </div>

          <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Ad Copy & Links</h4>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Headline *</label>
              <input type="text" required value={formData.headline} onChange={e => setFormData({...formData, headline: e.target.value})} className="app-input" placeholder="e.g. Get 50% Off Your First Booking" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Primary Text</label>
              <textarea rows={3} value={formData.primaryText} onChange={e => setFormData({...formData, primaryText: e.target.value})} className="app-input" placeholder="Main caption / copy body..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">CTA Button</label>
                <select value={formData.cta} onChange={e => setFormData({...formData, cta: e.target.value})} className="app-select">
                  <option value="Learn More">Learn More</option>
                  <option value="Book Now">Book Now</option>
                  <option value="Contact Us">Contact Us</option>
                  <option value="Call Now">Call Now</option>
                  <option value="Sign Up">Sign Up</option>
                  <option value="Shop Now">Shop Now</option>
                  <option value="WhatsApp">WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Destination URL</label>
                <input type="text" value={formData.destinationUrl} onChange={e => setFormData({...formData, destinationUrl: e.target.value})} className="app-input" placeholder="https://mybrand.com/landing" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90">Save Ad</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
