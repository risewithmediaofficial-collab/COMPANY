import React, { useEffect, useState } from 'react';
import { Plus, Image as ImageIcon, Video, FileCode, Link as LinkIcon, Tag, ExternalLink, Trash2, Edit3, Grid, List } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { PageHeader, SearchField } from '../../components/ui/page';
import { PlatformBadge } from '../../components/smm/PlatformBadge';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { toast } from 'react-hot-toast';

export default function CreativeLibrary() {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Image', fileUrl: '', canvaLink: '', caption: '', headline: '',
    platform: ['Meta'], tags: 'design,v1', previewUrl: ''
  });

  const fetchCreatives = async () => {
    try {
      setLoading(true);
      const res = await smmApi.getCreatives({ search, type: typeFilter });
      if (res.data?.success) setCreatives(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load creative assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatives();
  }, [search, typeFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: typeof formData.tags === 'string' ? formData.tags.split(',').map(t => t.trim()) : formData.tags,
      };
      await smmApi.createCreative(payload);
      toast.success('Creative asset stored');
      setIsDrawerOpen(false);
      fetchCreatives();
    } catch (err) {
      toast.error('Failed to store creative');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete creative asset?')) return;
    try {
      await smmApi.deleteCreative(id);
      toast.success('Asset removed');
      fetchCreatives();
    } catch (err) {
      toast.error('Failed to delete asset');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Video': return <Video size={20} className="text-purple-500" />;
      case 'PSD':
      case 'AI File': return <FileCode size={20} className="text-amber-500" />;
      case 'Canva Link': return <LinkIcon size={20} className="text-cyan-500" />;
      default: return <ImageIcon size={20} className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creative Library"
        subtitle="Central asset repository for Images, Videos, Carousels, PSDs, AI Files & Canva Links"
        actions={
          <button onClick={() => setIsDrawerOpen(true)} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90">
            <Plus size={18} />
            Add Asset
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tags, headlines, captions..." />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="app-select w-40">
            <option value="">All Asset Types</option>
            <option value="Image">Image</option>
            <option value="Video">Video</option>
            <option value="Carousel">Carousel</option>
            <option value="PSD">PSD</option>
            <option value="AI File">AI File</option>
            <option value="Canva Link">Canva Link</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border">
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}>
            <List size={18} />
          </button>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}>
            <Grid size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading creative library...</div>
      ) : creatives.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No creative assets found.</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {creatives.map((item) => (
            <div key={item._id} className="app-card overflow-hidden group hover:shadow-xl transition-all">
              <div className="h-44 bg-secondary relative flex items-center justify-center border-b border-border overflow-hidden">
                {item.fileUrl || item.previewUrl ? (
                  <img src={item.previewUrl || item.fileUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="p-4 text-center">
                    {getIcon(item.type)}
                    <span className="text-xs font-bold block mt-2 text-foreground">{item.type}</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-card/80 backdrop-blur-md text-foreground border border-border">
                    {item.type}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-sm font-bold text-foreground truncate">{item.headline || item.type}</h4>
                {item.caption && <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>}
                
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.tags?.map((t) => (
                    <span key={t} className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Tag size={8} /> {t}
                    </span>
                  ))}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  {item.canvaLink ? (
                    <a href={item.canvaLink} target="_blank" rel="noreferrer" className="text-xs text-cyan-600 font-semibold flex items-center gap-1 hover:underline">
                      <ExternalLink size={12} /> Canva
                    </a>
                  ) : item.fileUrl ? (
                    <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                      <ExternalLink size={12} /> View File
                    </a>
                  ) : <span className="text-[11px] text-muted-foreground">Local Asset</span>}

                  <button onClick={() => handleDelete(item._id)} className="p-1 rounded text-muted-foreground hover:text-rose-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="app-card divide-y divide-border overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
          {creatives.map((item) => (
            <div key={item._id} className="p-4 flex items-center justify-between gap-4 hover:bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  {getIcon(item.type)}
                </div>
                <div>
                  <span className="font-semibold text-sm text-foreground block">{item.headline || item.type}</span>
                  <span className="text-xs text-muted-foreground">{item.caption || 'No caption'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary">{item.type}</span>
                <button onClick={() => handleDelete(item._id)} className="p-1 text-muted-foreground hover:text-rose-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SMMDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Add Creative Asset"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Asset Type *</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="app-select">
              <option value="Image">Image</option>
              <option value="Video">Video</option>
              <option value="Carousel">Carousel</option>
              <option value="PSD">PSD Master File</option>
              <option value="AI File">AI Vector File</option>
              <option value="Canva Link">Canva Template Link</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Headline / Title</label>
            <input type="text" value={formData.headline} onChange={e => setFormData({...formData, headline: e.target.value})} className="app-input" placeholder="e.g. Summer Promo Banner V2" />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Media URL / Preview Link</label>
            <input type="text" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} className="app-input" placeholder="https://..." />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Canva Shareable Link (Optional)</label>
            <input type="text" value={formData.canvaLink} onChange={e => setFormData({...formData, canvaLink: e.target.value})} className="app-input" placeholder="https://canva.com/design/..." />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Caption / Ad Copy</label>
            <textarea rows={3} value={formData.caption} onChange={e => setFormData({...formData, caption: e.target.value})} className="app-input" placeholder="Associated caption text..." />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Tags (comma separated)</label>
            <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="app-input" placeholder="reels, promo, summer" />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" className="bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90">Store Asset</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
