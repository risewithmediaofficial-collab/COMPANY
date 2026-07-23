import { useState } from 'react';
import { useSelector } from 'react-redux';
import { BookOpen, Plus, Trash2, Edit2, Eye, User, Clock, FileText, ListOrdered, Tag } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/DataTable';
import { PageHeader, PageToolbar, SearchField, StatusBadge } from '../../components/ui/page';
import { useSOPs, useCreateSOP, useUpdateSOP, useDeleteSOP } from '../../hooks/useSOP';
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
  'admin', 'manager', 'employee', 'designer', 'developer',
  'content_writer', 'editor', 'social_media_manager', 'other',
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
  const isAdmin = user?.role === 'superAdmin';
  const canAdd = ['superAdmin', 'manager', 'employee'].includes(user?.role);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewingSOP, setViewingSOP] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: sops = [], isLoading } = useSOPs();
  const createSOP = useCreateSOP();
  const updateSOP = useUpdateSOP();
  const deleteSOP = useDeleteSOP();

  const filtered = sops.filter((sop) =>
    !search.trim() || sop.title?.toLowerCase().includes(search.toLowerCase()),
  );

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
    if (!form.title.trim()) return;
    if (editing) {
      await updateSOP.mutateAsync({ id: editing._id, data: form });
    } else {
      await createSOP.mutateAsync(form);
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const columns = [
    {
      key: 'title',
      label: 'SOP Title',
      render: (row) => (
        <div>
          <div className="font-semibold flex items-center gap-1.5">
            <BookOpen size={15} className="text-primary shrink-0" />
            <span>{row.title}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{row.content || 'No description'}</div>
        </div>
      ),
    },
    {
      key: 'sopType',
      label: 'Type',
      render: (row) => SOP_TYPES.find((t) => t.value === row.sopType)?.label || row.sopType,
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => row.role ? row.role.replace(/_/g, ' ') : '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge tone={row.status === 'active' ? 'success' : 'neutral'}>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (row) => row.createdBy?.name || '—',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SOP Dashboard"
        description="Company and role-based standard operating procedures for your team."
        actions={canAdd ? (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" />
            Add SOP
          </Button>
        ) : null}
      />

      <PageToolbar>
        <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SOPs..." />
        <div className="app-pill">{filtered.length} SOPs</div>
      </PageToolbar>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        onRowClick={openView}
        onView={openView}
        onEdit={canAdd ? openEdit : null}
        onDelete={isAdmin ? (id) => setDeleteId(id) : null}
        emptyTitle="No SOPs yet"
        emptyDescription="Create your first standard operating procedure."
      />

      {/* Read-Only View SOP Modal (Shown 1st on opening an SOP) */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
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
              {/* Metadata Info */}
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

              {/* Overview / Description Content */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText size={14} className="text-primary" /> Overview & Description
                </h4>
                <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed bg-card p-4 rounded-xl border border-border">
                  {viewingSOP.content || 'No detailed description provided for this SOP.'}
                </div>
              </div>

              {/* Steps & Procedure Instructions */}
              {viewingSOP.steps && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ListOrdered size={14} className="text-primary" /> Steps & Operating Instructions
                  </h4>
                  <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10">
                    {viewingSOP.steps}
                  </div>
                </div>
              )}

              {/* Reference Links & Attachments */}
              {viewingSOP.links?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Tag size={14} className="text-primary" /> Attached Links & Resources
                  </h4>
                  <div className="bg-card p-4 rounded-xl border border-border">
                    <LinksList links={viewingSOP.links} />
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                {isAdmin ? (
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => {
                      setShowViewModal(false);
                      setDeleteId(viewingSOP._id);
                    }}
                  >
                    <Trash2 size={16} className="mr-1.5" /> Delete
                  </Button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setShowViewModal(false)}>
                    Close
                  </Button>
                  {canAdd && (
                    <Button onClick={() => openEdit(viewingSOP)}>
                      <Edit2 size={16} className="mr-1.5" /> Edit SOP
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit / Add SOP Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit SOP' : 'Add SOP'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="SOP Title *" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
            <select className="app-input w-full" value={form.sopType} onChange={(e) => setForm((c) => ({ ...c, sopType: e.target.value }))}>
              {SOP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {form.sopType === 'role_based' && (
              <select className="app-input w-full" value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}>
                <option value="">Select role</option>
                {SOP_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            )}
            <Textarea placeholder="SOP Description / Content" rows={4} value={form.content} onChange={(e) => setForm((c) => ({ ...c, content: e.target.value }))} />
            <Textarea placeholder="Steps / Instructions" rows={5} value={form.steps} onChange={(e) => setForm((c) => ({ ...c, steps: e.target.value }))} />
            <LinksEditor links={form.links} onChange={(links) => setForm((c) => ({ ...c, links }))} />
            <select className="app-input w-full" value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createSOP.isPending || updateSOP.isPending}>Save SOP</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOP</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteId) await deleteSOP.mutateAsync(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SOPDashboard;
