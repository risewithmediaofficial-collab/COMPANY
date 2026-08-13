import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, FolderOpen, Image as ImageIcon, Plus, Tag, Trash2, Upload, Video } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { DataTable } from '../ui/DataTable';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { MetricCard, MetricGrid, PageHeader, PageToolbar, SearchField, SectionCard, StatusBadge } from '../ui/page';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import { useAssets, useCreateAsset, useDeleteAsset, useUpdateAsset } from '../../hooks/useAssets';
import { uploadFiles } from '../../utils/taskFields';
import { getAssetUrl } from '../../utils/assetUrl';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../ui/DateRangePicker';

export const assetCategories = [
  { value: 'logo', label: 'Logo' },
  { value: 'brand_guideline', label: 'Brand Guideline' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'creative', label: 'Creative' },
  { value: 'other', label: 'Other' },
];

const categoryLabelMap = assetCategories.reduce((map, item) => {
  map[item.value] = item.label;
  return map;
}, {});

const emptyForm = {
  name: '',
  category: 'other',
  client: '',
  project: '',
  description: '',
  tags: '',
  isClientVisible: true,
};

const AssetFormDialog = ({ open, onOpenChange, asset, clients, projects, onSave, saving }) => {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const isEditing = Boolean(asset?._id);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: asset?.name || '',
      category: asset?.category || 'other',
      client: asset?.client?._id || asset?.client || '',
      project: asset?.project?._id || asset?.project || '',
      description: asset?.description || '',
      tags: Array.isArray(asset?.tags) ? asset.tags.join(', ') : '',
      isClientVisible: asset?.isClientVisible ?? true,
    });
    setFiles([]);
  }, [open, asset]);

  const filteredProjects = useMemo(
    () => (form.client ? projects.filter((project) => (project.client?._id || project.client) === form.client) : projects),
    [projects, form.client],
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const uploaded = files.length ? await uploadFiles(files) : [];
    await onSave({
      id: asset?._id,
      data: {
        ...form,
        project: form.project || undefined,
        tags: form.tags,
        files: [...(asset?.files || []), ...uploaded],
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Asset' : 'Upload Asset'}</DialogTitle>
          <DialogDescription>Store client logos, guidelines, creatives, videos, and other brand files in one place.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Asset Name *</span>
            <Input value={form.name} onChange={(event) => updateField('name', event.target.value)} required placeholder="Primary logo pack" />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Category</span>
            <select value={form.category} onChange={(event) => updateField('category', event.target.value)} className="app-input">
              {assetCategories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Client *</span>
            <select value={form.client} onChange={(event) => updateField('client', event.target.value)} className="app-input" required>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>{client.company || client.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Project</span>
            <select value={form.project} onChange={(event) => updateField('project', event.target.value)} className="app-input">
              <option value="">No linked project</option>
              {filteredProjects.map((project) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Description</span>
            <Textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="What does this asset contain and when should it be used?" />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Tags</span>
            <Input value={form.tags} onChange={(event) => updateField('tags', event.target.value)} placeholder="logo, approved, campaign, q3" />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium text-foreground">Files {!isEditing ? '*' : ''}</span>
            <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Upload size={15} />
                Upload asset files
              </div>
              <input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} className="w-full text-sm" />
              {asset?.files?.length ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Existing files</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {asset.files.map((file, index) => <li key={`${file.url}-${index}`}>{file.name}</li>)}
                  </ul>
                </div>
              ) : null}
              {files.length ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">New files</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {files.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          </label>

          <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-border bg-secondary/20 p-4">
            <input
              type="checkbox"
              checked={Boolean(form.isClientVisible)}
              onChange={(event) => updateField('isClientVisible', event.target.checked)}
            />
            <div>
              <p className="text-sm font-medium text-foreground">Visible to client</p>
              <p className="text-xs text-muted-foreground">Allow the client to see and download this asset in their portal.</p>
            </div>
          </label>

          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEditing ? 'Update Asset' : 'Upload Asset'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const fileCount = (asset) => Array.isArray(asset?.files) ? asset.files.length : 0;

export const AssetLibraryWorkspace = ({
  title,
  description,
  canManage = false,
  portalMode = false,
}) => {
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: clients = [] } = useClients({}, { enabled: canManage });
  const { isDateInRange } = useDateFilter();
  const { data: projects = [] } = useProjects({}, { enabled: canManage });
  const { data: rawAssets = [], isLoading } = useAssets({
    search,
    client: clientFilter || undefined,
    category: categoryFilter || undefined,
  });
  const assets = useMemo(() => rawAssets.filter((a) => isDateInRange(a.createdAt)), [rawAssets, isDateInRange]);

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const metrics = useMemo(() => ({
    total: assets.length,
    visible: assets.filter((asset) => asset.isClientVisible).length,
    files: assets.reduce((sum, asset) => sum + fileCount(asset), 0),
    categories: new Set(assets.map((asset) => asset.category).filter(Boolean)).size,
  }), [assets]);

  const columns = [
    {
      key: 'name',
      label: 'Asset',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{row.description || 'No description added'}</div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (row) => row.client?.company || row.client?.name || 'No client',
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => <StatusBadge tone="info">{categoryLabelMap[row.category] || 'Other'}</StatusBadge>,
    },
    {
      key: 'files',
      label: 'Files',
      render: (row) => `${fileCount(row)} file${fileCount(row) === 1 ? '' : 's'}`,
    },
    {
      key: 'visibility',
      label: 'Visibility',
      render: (row) => <StatusBadge tone={row.isClientVisible ? 'success' : 'warning'}>{row.isClientVisible ? 'Client Visible' : 'Internal'}</StatusBadge>,
    },
    {
      key: 'uploadedBy',
      label: 'Uploaded By',
      render: (row) => row.uploadedBy?.name || 'System',
    },
  ];

  const handleSave = async ({ id, data }) => {
    if (id) {
      await updateAsset.mutateAsync({ id, data });
    } else {
      await createAsset.mutateAsync(data);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={portalMode ? 'Client Assets' : 'Asset Library'}
        description={description}
        actions={canManage ? (
          <Button onClick={() => { setSelectedAsset(null); setFormOpen(true); }}>
            <Plus size={16} className="mr-2" />
            Upload Asset
          </Button>
        ) : null}
      >
        <MetricGrid>
          <MetricCard label="Assets" value={metrics.total} helper="Records in this view" icon={FolderOpen} tone="info" />
          <MetricCard label="Client Visible" value={metrics.visible} helper="Available in the client portal" icon={ImageIcon} tone="success" />
          <MetricCard label="Files" value={metrics.files} helper="Files stored across all assets" icon={FileText} tone="warning" />
          <MetricCard label="Categories" value={metrics.categories} helper="Asset types represented here" icon={Tag} tone="neutral" />
        </MetricGrid>

        <DateRangePicker title="Assets Date Filter (From Date to To Date)" className="mt-4" />
      </PageHeader>

      <PageToolbar>
        <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets, descriptions, or tags..." />
        {!portalMode ? (
          <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} className="app-input lg:w-56">
            <option value="">All clients</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.company || client.name}</option>)}
          </select>
        ) : null}
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="app-input lg:w-52">
          <option value="">All categories</option>
          {assetCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </PageToolbar>

      <SectionCard
        title={portalMode ? 'Shared Brand Assets' : 'Stored Client Assets'}
        description={portalMode ? 'Download the latest brand assets and supporting files shared with you.' : 'Manage brand files, logo packs, guidelines, and delivery-ready resources.'}
        action={<span className="app-pill">{assets.length} records</span>}
      >
        <DataTable
          data={assets}
          columns={columns}
          loading={isLoading}
          onView={(asset) => setSelectedAsset(asset)}
          onEdit={canManage ? (asset) => { setSelectedAsset(asset); setFormOpen(true); } : null}
          onDelete={canManage ? (id) => { if (window.confirm('Delete this asset from the library?')) deleteAsset.mutate(id); } : null}
          emptyTitle="No assets found"
          emptyDescription={portalMode ? 'No assets have been shared with you yet.' : 'Upload the first asset to start your library.'}
          emptyAction={canManage ? <Button onClick={() => setFormOpen(true)}><Plus size={16} className="mr-2" />Upload First Asset</Button> : null}
        />
      </SectionCard>

      {selectedAsset ? (
        <Dialog open={Boolean(selectedAsset)} onOpenChange={(open) => !open && setSelectedAsset(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedAsset.name}</DialogTitle>
              <DialogDescription>{selectedAsset.client?.company || selectedAsset.client?.name || 'Client asset'} • {categoryLabelMap[selectedAsset.category] || 'Other'}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Description</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{selectedAsset.description || 'No description added.'}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tags</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selectedAsset.tags || []).length
                      ? selectedAsset.tags.map((tag) => <span key={tag} className="app-pill">{tag}</span>)
                      : <span className="text-sm text-muted-foreground">No tags added.</span>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Files</p>
                <div className="space-y-3">
                  {(selectedAsset.files || []).map((file, index) => {
                    const fileType = file.type || '';
                    const Icon = fileType.startsWith('image') ? ImageIcon : fileType.startsWith('video') ? Video : FileText;
                    const fileUrl = getAssetUrl(file.url);
                    const isImage = fileType.startsWith('image') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.url || file.name || '');
                    return (
                      <a
                        key={`${file.url}-${index}`}
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary/40"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {isImage ? (
                            <img
                              src={fileUrl}
                              alt={file.name || 'Asset preview'}
                              className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="rounded-xl bg-primary/10 p-2 text-primary"><Icon size={16} /></div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.type || 'File'}</p>
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-primary">
                          <Download size={15} />
                          Download
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>

              {!portalMode && canManage ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm('Delete this asset from the library?')) {
                        deleteAsset.mutate(selectedAsset._id, {
                          onSuccess: () => setSelectedAsset(null),
                        });
                      }
                    }}
                  >
                    <Trash2 size={15} className="mr-2" />
                    Delete Asset
                  </Button>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {canManage ? (
        <AssetFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          asset={selectedAsset && formOpen ? selectedAsset : null}
          clients={clients}
          projects={projects}
          onSave={handleSave}
          saving={createAsset.isPending || updateAsset.isPending}
        />
      ) : null}
    </div>
  );
};
