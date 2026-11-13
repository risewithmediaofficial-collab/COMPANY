import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Image as ImageIcon, Video, FileCode, Link as LinkIcon, Tag, ExternalLink, Trash2, Edit3, Grid, List } from '@/components/ui/muiIcons';
import { smmApi } from '../../api/smm';
import { PageHeader, SearchField } from '../../components/ui/page';
import { PlatformBadge } from '../../components/smm/PlatformBadge';
import { SMMDrawer } from '../../components/smm/SMMDrawer';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { toast } from 'sonner';

export default function CreativeLibrary() {
  const [rawCreatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Image', fileUrl: '', canvaLink: '', caption: '', headline: '',
    platform: ['Meta'], tags: 'design,v1', previewUrl: ''
  });

  const fetchCreatives = async () => {
    try {
      setLoading(true);
      const res = await smmApi.getCreatives({ search, type: typeFilter, startDate: startDate || undefined, endDate: endDate || undefined });
      if (res.data?.success) setCreatives(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load creative assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatives();
  }, [search, typeFilter, startDate, endDate]);

  const creatives = useMemo(
    () => rawCreatives,
    [rawCreatives]
  );

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
      case 'Video': return <Video size={20} className="text-foreground" />;
      case 'PSD':
      case 'AI File': return <FileCode size={20} className="text-foreground" />;
      case 'Canva Link': return <LinkIcon size={20} className="text-muted-foreground" />;
      default: return <ImageIcon size={20} className="text-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creative Library"
        actions={
          <button onClick={() => setIsDrawerOpen(true)} className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 hover:opacity-90 cursor-pointer">
            <Plus size={18} />
            <span>Add Asset</span>
          </button>
        }
      />

      <SMMSubNav />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl ">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tags, headlines, captions..." />
          <SelectDropdown
            value={typeFilter}
            onChange={(val) => setTypeFilter(val || '')}
            options={[
              { value: 'Image', label: 'Image' },
              { value: 'Video', label: 'Video' },
              { value: 'Carousel', label: 'Carousel' },
              { value: 'PSD', label: 'PSD' },
              { value: 'AI File', label: 'AI File' },
              { value: 'Canva Link', label: 'Canva Link' },
            ]}
            placeholder="All Asset Types"
            allOptionLabel="All Asset Types"
            allowCustom={false}
            className="w-full sm:w-44"
            buttonClassName="h-10 text-xs sm:text-sm font-medium bg-background border border-border/50 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl ">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-card text-foreground ' : 'text-muted-foreground'}`}>
            <Grid size={18} />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-card text-foreground ' : 'text-muted-foreground'}`}>
            <List size={18} />
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
            <div key={item._id} className="app-card overflow-hidden group transition-colors hover:bg-secondary/40">
              <div className="h-44 bg-secondary relative flex items-center justify-center overflow-hidden">
                {item.fileUrl || item.previewUrl ? (
                  <img src={item.previewUrl || item.fileUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="p-4 text-center">
                    {getIcon(item.type)}
                    <span className="text-xs font-bold block mt-2 text-foreground">{item.type}</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-card text-foreground ">
                    {item.type}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-sm font-bold text-foreground truncate">{item.headline || item.type}</h4>
                {item.caption && <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>}
                
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.tags?.map((t) => (
                    <span key={t} className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <Tag size={8} /> {t}
                    </span>
                  ))}
                </div>

                <div className="pt-3 flex items-center justify-between">
                  {item.canvaLink ? (
                    <a href={item.canvaLink} target="_blank" rel="noreferrer" className="text-xs text-foreground font-semibold inline-flex items-center gap-1 hover:underline">
                      <ExternalLink size={12} /> Canva
                    </a>
                  ) : item.fileUrl ? (
                    <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-foreground font-semibold inline-flex items-center gap-1 hover:underline">
                      <ExternalLink size={12} /> View File
                    </a>
                  ) : <span className="text-[11px] text-muted-foreground">Local Asset</span>}

                  <button onClick={() => handleDelete(item._id)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="app-card divide-y divide-foreground/[0.05] overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
          {creatives.map((item) => (
            <div key={item._id} className="p-4 flex items-center justify-between gap-4 hover:bg-secondary/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-foreground block truncate">{item.headline || item.type}</span>
                  <span className="text-xs text-muted-foreground block truncate">{item.caption || 'No caption'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary text-foreground">{item.type}</span>
                <button onClick={() => handleDelete(item._id)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
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
        <form onSubmit={handleSave} className="space-y-5 text-left">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Asset Type *</label>
            <SelectDropdown
              value={formData.type}
              onChange={(val) => setFormData({ ...formData, type: val || 'Image' })}
              options={[
                { value: 'Image', label: 'Image' },
                { value: 'Video', label: 'Video' },
                { value: 'Carousel', label: 'Carousel' },
                { value: 'PSD', label: 'PSD Master File' },
                { value: 'AI File', label: 'AI Vector File' },
                { value: 'Canva Link', label: 'Canva Template Link' },
              ]}
              allowCustom={false}
              allowDeselect={false}
              className="w-full"
              buttonClassName="h-11 text-sm font-medium bg-background border border-border/50 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Headline / Title</label>
            <input type="text" value={formData.headline} onChange={e => setFormData({...formData, headline: e.target.value})} className="app-input" placeholder="e.g. Summer Promo Banner V2" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Media URL / Preview Link</label>
            <input type="text" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} className="app-input" placeholder="https://..." />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Canva Shareable Link (Optional)</label>
            <input type="text" value={formData.canvaLink} onChange={e => setFormData({...formData, canvaLink: e.target.value})} className="app-input" placeholder="https://canva.com/design/..." />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Caption / Ad Copy</label>
            <textarea rows={3} value={formData.caption} onChange={e => setFormData({...formData, caption: e.target.value})} className="w-full min-h-[96px] rounded-xl bg-secondary/75 px-4 py-3 text-sm font-normal text-foreground outline-none focus:bg-background focus:ring-2 focus:ring-primary/20" placeholder="Associated caption text..." />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Tags (comma separated)</label>
            <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="app-input" placeholder="reels, promo, summer" />
          </div>

          <div className="pt-4 flex justify-end gap-2.5">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="h-11 px-5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer">Store Asset</button>
          </div>
        </form>
      </SMMDrawer>
    </div>
  );
}
