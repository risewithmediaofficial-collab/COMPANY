import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Eye,
  User,
  Clock,
  FileText,
  ListOrdered,
  Tag,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/page';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { useSOPs, useCreateSOP, useUpdateSOP, useDeleteSOP } from '../../hooks/useSOP';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import LinksEditor, { LinksList } from '../../components/ui/LinksEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SOP_TYPES = [
  { value: 'company', label: 'Company SOP' },
  { value: 'role_based', label: 'Role-Based SOP' },
  { value: 'department', label: 'Department SOP' },
  { value: 'project', label: 'Project SOP' },
];

const SOP_ROLES = [
  'admin',
  'manager',
  'employee',
  'designer',
  'developer',
  'content_writer',
  'editor',
  'social_media_manager',
  'other',
];

const emptyForm = {
  title: '',
  sopType: 'company',
  role: '',
  content: '',
  steps: '',
  links: [],
  status: 'active',
};

const SOPDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'superAdmin' || user?.role === 'admin';
  const canAdd = ['superAdmin', 'admin', 'manager', 'employee'].includes(user?.role);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewingSOP, setViewingSOP] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [currentView, setCurrentView] = useState('grid'); // 'grid' | 'table'
  const [selectedType, setSelectedType] = useState('all');

  const { isDateInRange } = useDateFilter();
  const { data: sops = [], isLoading } = useSOPs();
  const createSOP = useCreateSOP();
  const updateSOP = useUpdateSOP();
  const deleteSOP = useDeleteSOP();

  const filtered = sops.filter(
    (sop) =>
      isDateInRange(sop.updatedAt || sop.createdAt) &&
      (selectedType === 'all' || sop.sopType === selectedType) &&
      (!search.trim() || sop.title?.toLowerCase().includes(search.toLowerCase())),
  );

  const canEditSop = (sop) => {
    if (!sop || !user) return false;
    const authorRole = sop.createdBy?.role || sop.createdByRole;
    const creatorId = sop.createdBy?._id || sop.createdBy;
    const isAuthorSelf = String(creatorId) === String(user._id);

    if (['superAdmin', 'admin', 'manager'].includes(user?.role)) return true;
    if (['superAdmin', 'admin'].includes(authorRole) && !['superAdmin', 'admin'].includes(user?.role)) return false;
    return isAuthorSelf;
  };

  const canDeleteSop = (sop) => {
    if (!sop || !user) return false;
    const authorRole = sop.createdBy?.role || sop.createdByRole;
    const creatorId = sop.createdBy?._id || sop.createdBy;
    const isAuthorSelf = String(creatorId) === String(user._id);

    if (['superAdmin', 'admin', 'manager'].includes(user?.role)) return true;
    if (['superAdmin', 'admin'].includes(authorRole) && !['superAdmin', 'admin'].includes(user?.role)) return false;
    return isAuthorSelf;
  };

  const openView = (sop) => {
    setViewingSOP(sop);
    setShowViewModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (sop) => {
    if (!canEditSop(sop)) {
      return toast.error('SOPs created by Admin or Manager cannot be edited by employees');
    }
    setEditing(sop);
    setForm({
      title: sop.title || '',
      sopType: sop.sopType || 'company',
      role: sop.role || '',
      content: sop.content || '',
      steps: sop.steps || '',
      links: sop.links || [],
      status: sop.status || 'active',
    });
    setShowViewModal(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (editing) {
      await updateSOP.mutateAsync({ id: editing._id, data: form });
    } else {
      await createSOP.mutateAsync(form);
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSOP.mutateAsync(deleteId);
    setDeleteId(null);
    if (viewingSOP?._id === deleteId) {
      setViewingSOP(null);
      setShowViewModal(false);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (row) => <span className="font-bold text-foreground text-xs">{row.title}</span>,
    },
    {
      key: 'sopType',
      label: 'Type',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-medium text-foreground capitalize">
          {SOP_TYPES.find((t) => t.value === row.sopType)?.label || row.sopType}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Role Target',
      render: (row) => (row.role ? row.role.replace(/_/g, ' ') : '—'),
    },
    {
      key: 'createdBy',
      label: 'Author',
      render: (row) => row.createdBy?.name || 'Admin',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'),
    },
  ];

  return (
    <WorkspacePage
      title="Knowledge OS & SOPs"
      subtitle="Standard operating procedures, quality guidelines, and team training blueprints."
      icon={BookOpen}
      breadcrumbs={[{ name: 'Knowledge', path: '/sop' }, { name: 'SOP Library' }]}
      actions={
        canAdd ? (
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-primary text-primary-foreground font-bold shadow-sm"
          >
            <Plus size={15} className="mr-1.5 stroke-[2.5]" />
            New SOP
          </Button>
        ) : null
      }
      properties={
        <>
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedType === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
            }`}
          >
            All SOPs ({sops.length})
          </button>
          {SOP_TYPES.map((t) => {
            const count = sops.filter((s) => s.sopType === t.value).length;
            const isSelected = selectedType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setSelectedType(t.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </>
      }
    >
      {/* Notion-Style Multi-View Database Engine */}
      <DatabaseView
        views={[
          { id: 'grid', label: 'Cards', icon: BookOpen },
          { id: 'table', label: 'Table', icon: ListOrdered },
        ]}
        activeView={currentView}
        onViewChange={setCurrentView}
        searchQuery={search}
        onSearchChange={setSearch}
        totalCount={filtered.length}
      >
        {/* Grid Card View */}
        {currentView === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((sop) => (
              <div
                key={sop._id}
                onClick={() => openView(sop)}
                className="p-5 bg-card rounded-2xl border border-border hover:border-primary/40 transition-all cursor-pointer space-y-3 group shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                      {SOP_TYPES.find((t) => t.value === sop.sopType)?.label || sop.sopType}
                    </span>
                    {sop.role && (
                      <span className="text-[10px] font-medium text-muted-foreground capitalize">
                        {sop.role.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {sop.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {sop.content || sop.steps || 'No description preview available.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span>Author: {sop.createdBy?.name || 'Admin'}</span>
                  <span className="group-hover:text-primary flex items-center gap-1 font-semibold">
                    Read SOP <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full p-12 text-center bg-card rounded-2xl border border-border text-xs text-muted-foreground">
                No SOPs found matching your search.
              </div>
            )}
          </div>
        )}

        {/* Table View */}
        {currentView === 'table' && (
          <DataTable
            data={filtered}
            columns={columns}
            loading={isLoading}
            onRowClick={openView}
            onView={openView}
            onEdit={openEdit}
            canEditRow={canEditSop}
            onDelete={(id) => setDeleteId(id)}
            canDeleteRow={canDeleteSop}
            emptyTitle="No SOPs found"
            emptyDescription="Create your first standard operating procedure."
          />
        )}
      </DatabaseView>

      {/* Read-Only View SOP Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl custom-scrollbar">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-6">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <BookOpen size={22} className="text-primary" />
                  {viewingSOP?.title}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                    {SOP_TYPES.find((t) => t.value === viewingSOP?.sopType)?.label || viewingSOP?.sopType}
                  </span>
                  {viewingSOP?.role && (
                    <span className="text-xs font-semibold bg-secondary text-foreground px-2.5 py-0.5 rounded-full border border-border capitalize">
                      Role: {viewingSOP.role.replace(/_/g, ' ')}
                    </span>
                  )}
                  <StatusBadge tone={viewingSOP?.status === 'active' ? 'success' : 'neutral'}>
                    {viewingSOP?.status}
                  </StatusBadge>
                </div>
              </div>
            </div>
          </DialogHeader>

          {viewingSOP && (
            <div className="space-y-6 pt-2">
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-border">
                <span className="flex items-center gap-1.5 font-medium">
                  <User size={14} className="text-primary" />
                  Created by: <strong className="text-foreground">{viewingSOP.createdBy?.name || 'Admin'}</strong>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock size={14} className="text-primary" />
                  Date: <strong className="text-foreground">{viewingSOP.createdAt ? new Date(viewingSOP.createdAt).toLocaleString() : '—'}</strong>
                </span>
              </div>

              {viewingSOP.content && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText size={14} className="text-primary" /> Overview & Objective
                  </h4>
                  <div className="bg-secondary/20 p-4 rounded-xl border border-border text-sm leading-relaxed whitespace-pre-wrap">
                    {viewingSOP.content}
                  </div>
                </div>
              )}

              {viewingSOP.steps && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ListOrdered size={14} className="text-primary" /> Step-by-Step Instructions
                  </h4>
                  <div className="bg-secondary/20 p-4 rounded-xl border border-border text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs">
                    {viewingSOP.steps}
                  </div>
                </div>
              )}

              {viewingSOP.links?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ExternalLink size={14} className="text-primary" /> Reference Resources & Links
                  </h4>
                  <LinksList links={viewingSOP.links} />
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <div className="flex gap-2">
                  {canEditSop(viewingSOP) && (
                    <Button variant="outline" size="sm" onClick={() => openEdit(viewingSOP)}>
                      <Edit2 size={14} className="mr-1.5" /> Edit SOP
                    </Button>
                  )}
                  {canDeleteSop(viewingSOP) && (
                    <Button variant="destructive" size="sm" onClick={() => setDeleteId(viewingSOP._id)}>
                      <Trash2 size={14} className="mr-1.5" /> Delete
                    </Button>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowViewModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl custom-scrollbar">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit SOP' : 'Create New SOP'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold block mb-1">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Video Editing Review Pipeline"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Type</label>
                <select
                  value={form.sopType}
                  onChange={(e) => setForm({ ...form, sopType: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs"
                >
                  {SOP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Target Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="">All Roles</option>
                  {SOP_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Overview & Notes</label>
              <Textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Explain the purpose and scope of this procedure..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Step-by-Step Checklist</label>
              <Textarea
                rows={5}
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                placeholder="1. Step one&#10;2. Step two&#10;3. Quality check..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Resource Links</label>
              <LinksEditor links={form.links} onChange={(links) => setForm({ ...form, links })} />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Create SOP'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOP</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this standard operating procedure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
};

export default SOPDashboard;
