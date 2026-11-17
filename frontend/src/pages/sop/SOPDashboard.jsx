import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
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
  X,
  Zap,
  CheckCircle2,
  Calendar,
  Layers,
  AlertCircle,
  Building2,
  ShieldCheck,
} from '@/components/ui/muiIcons';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/page';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
import { useSOPs, useCreateSOP, useUpdateSOP, useDeleteSOP } from '../../hooks/useSOP';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
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

const SOP_FREQUENCIES = [
  { value: 'all', label: 'All Cadences' },
  { value: 'daily', label: '⚡ Daily SOPs (Mandatory)', countKey: 'daily' },
  { value: 'one_time', label: '📋 One-Time SOPs (Process & Onboarding)', countKey: 'one_time' },
];

const SOP_DEPARTMENTS = [
  'All Departments',
  'Social Media Marketing',
  'Development',
  'Video Production',
  'Graphic Design',
  'Sales & Accounts',
  'HR & Operations',
  'General',
];

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
  sopType: 'department',
  frequency: 'daily',
  departmentName: 'General',
  isMandatory: true,
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
  const [selectedCadence, setSelectedCadence] = useState('daily'); // 'daily' | 'one_time' | 'all'
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedType, setSelectedType] = useState('all');
  const [completedChecklist, setCompletedChecklist] = useState({});

  const { data: sops = [], isLoading } = useSOPs();
  const createSOP = useCreateSOP();
  const updateSOP = useUpdateSOP();
  const deleteSOP = useDeleteSOP();

  // Statistics
  const dailySopsCount = sops.filter((s) => s.frequency === 'daily').length;
  const oneTimeSopsCount = sops.filter((s) => !s.frequency || s.frequency === 'one_time').length;

  const filtered = sops.filter((sop) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      sop.title?.toLowerCase().includes(term) ||
      sop.content?.toLowerCase().includes(term) ||
      sop.steps?.toLowerCase().includes(term) ||
      sop.departmentName?.toLowerCase().includes(term);

    const matchesCadence =
      selectedCadence === 'all' ||
      (selectedCadence === 'daily' && sop.frequency === 'daily') ||
      (selectedCadence === 'one_time' && (!sop.frequency || sop.frequency === 'one_time'));

    const matchesDept =
      selectedDepartment === 'All Departments' ||
      (sop.departmentName || 'General') === selectedDepartment;

    const matchesType = selectedType === 'all' || sop.sopType === selectedType;

    return matchesSearch && matchesCadence && matchesDept && matchesType;
  });

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
      sopType: sop.sopType || 'department',
      frequency: sop.frequency || 'daily',
      departmentName: sop.departmentName || 'General',
      isMandatory: sop.isMandatory !== undefined ? Boolean(sop.isMandatory) : true,
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
    try {
      if (editing) {
        await updateSOP.mutateAsync({ id: editing._id, data: form });
        toast.success('SOP updated successfully');
      } else {
        await createSOP.mutateAsync(form);
        toast.success('SOP created successfully');
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    } catch {
      toast.error('Failed to save SOP');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSOP.mutateAsync(deleteId);
      toast.success('SOP deleted');
      setDeleteId(null);
      if (viewingSOP?._id === deleteId) {
        setViewingSOP(null);
        setShowViewModal(false);
      }
    } catch {
      toast.error('Failed to delete SOP');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'SOP Title',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-foreground text-xs">{row.title}</span>
            {row.frequency === 'daily' ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                ⚡ DAILY
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-secondary text-muted-foreground">
                📋 ONE-TIME
              </span>
            )}
            {row.isMandatory && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                MANDATORY
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate max-w-xs">{row.description || row.content}</p>
        </div>
      ),
    },
    {
      key: 'departmentName',
      label: 'Department',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-semibold text-foreground">
          {row.departmentName || 'General'}
        </span>
      ),
    },
    {
      key: 'sopType',
      label: 'Scope',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-lg bg-secondary/60 text-[11px] font-medium text-foreground capitalize">
          {SOP_TYPES.find((t) => t.value === row.sopType)?.label || row.sopType}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Target Role',
      render: (row) => (row.role ? row.role.replace(/_/g, ' ') : 'All Roles'),
    },
    {
      key: 'createdBy',
      label: 'Author',
      render: (row) => row.createdBy?.name || 'Admin',
    },
  ];

  return (
    <WorkspacePage
      title="Knowledge OS & SOPs"
      icon={BookOpen}
      breadcrumbs={[{ name: 'Knowledge', path: '/sop' }, { name: 'SOP Library' }]}
      properties={[
        { label: 'Total SOPs', value: sops.length, icon: BookOpen },
        { label: 'Daily SOPs', value: dailySopsCount, tone: 'warning', icon: Zap },
        { label: 'One-Time SOPs', value: oneTimeSopsCount, tone: 'neutral', icon: FileText },
        { label: 'Active Depts', value: SOP_DEPARTMENTS.length - 1, tone: 'info' },
      ]}
      actions={
        canAdd ? (
          <Button
            size="sm"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl transition-all hover:bg-primary/90 min-h-[38px] cursor-pointer"
          >
            <Plus size={15} className="mr-1 stroke-[2.5]" />
            New SOP
          </Button>
        ) : null
      }
    >
      {/* ── Daily SOP & EOD Submission Protocol Banner ── */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-primary/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Zap size={20} className="fill-current" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Department Daily SOP &amp; Compulsory EOD Protocol</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                Compulsory
              </span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every employee and intern must strictly follow their department's daily SOP workflow checklist and submit their Daily EOD Report before clocking out.
            </p>
          </div>
        </div>
        <Link
          to="/attendance?tab=eod"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-95 transition-all shrink-0 cursor-pointer"
        >
          <FileText size={14} />
          <span>Submit Daily EOD Report &rarr;</span>
        </Link>
      </div>

      {/* ── Cadence Tabs: Daily vs One-Time ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="inline-flex p-1 rounded-2xl bg-secondary/70 border border-border/40">
          <button
            type="button"
            onClick={() => setSelectedCadence('daily')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCadence === 'daily'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <Zap size={14} />
            <span>⚡ Daily SOPs (Mandatory)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                selectedCadence === 'daily'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {dailySopsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCadence('one_time')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCadence === 'one_time'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <FileText size={14} />
            <span>📋 One-Time SOPs (Onboarding &amp; Policy)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                selectedCadence === 'one_time'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {oneTimeSopsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCadence('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCadence === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] font-mono opacity-80">({sops.length})</span>
          </button>
        </div>
      </div>

      {/* ── Department Filter Pills ── */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 custom-scrollbar">
        {SOP_DEPARTMENTS.map((dept) => {
          const count =
            dept === 'All Departments'
              ? sops.length
              : sops.filter((s) => (s.departmentName || 'General') === dept).length;
          return (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                selectedDepartment === dept
                  ? 'bg-foreground text-background font-bold shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/40'
              }`}
            >
              <span>{dept}</span>
              <span className="text-[10px] font-mono opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

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
                className="p-5 bg-card rounded-2xl transition-all cursor-pointer space-y-3 group flex flex-col justify-between border border-border/40 hover:border-primary/40 hover:shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sop.frequency === 'daily' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Zap size={11} className="fill-current" /> Daily SOP
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-secondary text-muted-foreground">
                          📋 One-Time
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                        {sop.departmentName || 'General'}
                      </span>
                    </div>
                    {sop.isMandatory && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        Compulsory
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

                <div className="flex items-center justify-between pt-3 text-[11px] text-muted-foreground border-t border-border/30">
                  <span>Author: {sop.createdBy?.name || 'Admin'}</span>
                  <span className="group-hover:text-primary flex items-center gap-1 font-semibold">
                    Read SOP <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full p-12 text-center bg-card rounded-2xl text-xs text-muted-foreground">
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
            emptyDescription=""
          />
        )}
      </DatabaseView>

      {/* Read-Only View SOP Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
          <div className="flex flex-col min-h-0 h-full">
            {/* Pinned Header */}
            <div className="shrink-0 bg-card px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4 z-10">
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-xl font-bold tracking-tight text-foreground break-words line-clamp-2">
                    {viewingSOP?.title || 'SOP Details'}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
                    {viewingSOP?.frequency === 'daily' ? (
                      <span className="text-[11px] sm:text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                        <Zap size={12} className="fill-current" /> Daily SOP
                      </span>
                    ) : (
                      <span className="text-[11px] sm:text-xs font-semibold bg-secondary text-muted-foreground px-2.5 py-0.5 rounded-full">
                        📋 One-Time SOP
                      </span>
                    )}
                    <span className="text-[11px] sm:text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                      {viewingSOP?.departmentName || 'General'}
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold bg-secondary text-muted-foreground px-2.5 py-0.5 rounded-full">
                      {SOP_TYPES.find((t) => t.value === viewingSOP?.sopType)?.label || viewingSOP?.sopType}
                    </span>
                    {viewingSOP?.role && (
                      <span className="text-[11px] sm:text-xs font-semibold bg-secondary text-foreground px-2.5 py-0.5 rounded-full capitalize">
                        Role: {viewingSOP.role.replace(/_/g, ' ')}
                      </span>
                    )}
                    {viewingSOP?.isMandatory && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        Compulsory
                      </span>
                    )}
                    <StatusBadge tone={viewingSOP?.status === 'active' ? 'success' : 'neutral'}>
                      {viewingSOP?.status}
                    </StatusBadge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-md">
                  ESC
                </span>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>

            {/* Scrollable Body */}
            {viewingSOP && (
              <div className="space-y-6 p-4 sm:p-6 md:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                {viewingSOP.frequency === 'daily' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-primary/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Zap size={18} className="fill-current" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground flex items-center gap-2">
                          <span>Daily Operational SOP</span>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            Compulsory EOD
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Follow all checklist steps daily for department excellence. Remember to submit your End-of-Day (EOD) work report before shift ends.
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/attendance?tab=eod"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 hover:opacity-95 shadow-sm transition-all"
                    >
                      <FileText size={13} />
                      <span>Submit EOD Report &rarr;</span>
                    </Link>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-secondary/30 p-3.5 rounded-xl ">
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
                    <div className="bg-secondary/20 p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                      {viewingSOP.content}
                    </div>
                  </div>
                )}

                {viewingSOP.steps && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ListOrdered size={14} className="text-primary" /> Step-by-Step Instructions
                    </h4>
                    <div className="bg-secondary/20 p-4 rounded-xl text-xs leading-relaxed whitespace-pre-wrap font-mono">
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
              </div>
            )}

            {/* Pinned Sticky Footer */}
            <div className="shrink-0 bg-card px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3 z-10 select-none">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {canEditSop(viewingSOP) && (
                  <Button variant="outline" size="sm" onClick={() => openEdit(viewingSOP)} className="h-10 px-3 sm:px-4 rounded-xl flex-1 sm:flex-initial">
                    <Edit2 size={14} className="mr-1.5" /> Edit SOP
                  </Button>
                )}
                {canDeleteSop(viewingSOP) && (
                  <Button variant="destructive" size="sm" onClick={() => setDeleteId(viewingSOP._id)} className="h-10 px-3 sm:px-4 rounded-xl flex-1 sm:flex-initial">
                    <Trash2 size={14} className="mr-1.5" /> Delete
                  </Button>
                )}
              </div>
              <Button variant="secondary" onClick={() => setShowViewModal(false)} className="h-10 px-5 rounded-xl font-medium w-full sm:w-auto">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
          <div className="flex flex-col min-h-0 h-full">
            {/* Pinned Header */}
            <div className="shrink-0 bg-card px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4 z-10">
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
                    {editing ? 'Edit SOP' : 'Create New SOP'}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    SOP form
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-md">
                  ESC
                </span>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>

            {/* Scrollable Linear Body */}
            <div className="space-y-5 p-4 sm:p-6 md:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Video Editing Review Pipeline"
                  className="h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 "
                />
              </div>

              {/* Cadence and Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Frequency / Cadence *</label>
                  <SelectDropdown
                    value={form.frequency}
                    onChange={(val) => setForm({ ...form, frequency: val })}
                    options={[
                      { value: 'daily', label: '⚡ Daily SOP (Must follow daily & submit EOD)' },
                      { value: 'one_time', label: '📋 One-Time SOP (Onboarding / Reference)' },
                    ]}
                    allowCustom={false}
                    allowDeselect={false}
                    placeholder="Select frequency"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Department *</label>
                  <SelectDropdown
                    value={form.departmentName}
                    onChange={(val) => setForm({ ...form, departmentName: val })}
                    options={SOP_DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => ({
                      value: d,
                      label: d,
                    }))}
                    allowCustom={false}
                    allowDeselect={false}
                    placeholder="Select department"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border/40">
                <input
                  type="checkbox"
                  id="sopIsMandatory"
                  checked={form.isMandatory}
                  onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <label htmlFor="sopIsMandatory" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Compulsory SOP &mdash; All members in this department must strictly follow this SOP and log EOD status.
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">SOP Type</label>
                  <SelectDropdown
                    value={form.sopType}
                    onChange={(val) => setForm({ ...form, sopType: val })}
                    options={SOP_TYPES}
                    allowCustom={false}
                    allowDeselect={false}
                    placeholder="Select SOP type"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Target Role</label>
                  <SelectDropdown
                    value={form.role}
                    onChange={(val) => setForm({ ...form, role: val })}
                    options={[
                      { value: '', label: 'All Roles' },
                      ...SOP_ROLES.map((r) => ({
                        value: r,
                        label: r.replace(/_/g, ' '),
                      })),
                    ]}
                    allowCustom={false}
                    allowDeselect={false}
                    placeholder="Select target role"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Overview & Notes</label>
                <Textarea
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Explain the purpose and scope of this procedure..."
                  className="rounded-xl bg-background p-3.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Step-by-Step Checklist</label>
                <Textarea
                  rows={5}
                  value={form.steps}
                  onChange={(e) => setForm({ ...form, steps: e.target.value })}
                  placeholder="1. Step one&#10;2. Step two&#10;3. Quality check..."
                  className="rounded-xl bg-background p-3.5 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Resource Links</label>
                <LinksEditor links={form.links} onChange={(links) => setForm({ ...form, links })} />
              </div>
            </div>

            {/* Pinned Sticky Footer */}
            <div className="shrink-0 bg-card px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl hover:bg-muted text-sm font-medium flex-1 sm:flex-initial"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all flex-1 sm:flex-initial"
                >
                  {editing ? 'Save Changes' : 'Create SOP'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOP?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
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
