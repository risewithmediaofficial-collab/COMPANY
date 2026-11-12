import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  RefreshCw,
  Clock,
  User,
  AlertTriangle,
  Layers,
  Building2,
  Briefcase,
  CheckSquare,
  TrendingUp,
  CreditCard,
  FileText,
  ShieldAlert,
  ArrowRight,
  FolderOpen,
} from '@/components/ui/muiIcons';
import api from '../../api';
import { useSocket } from '../../context/SocketContext';
import { useDateFilter } from '../../context/DateFilterContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '../../components/ui/alert-dialog';

const ENTITY_TABS = [
  { id: 'all', label: 'All Items', icon: Layers },
  { id: 'task', label: 'Tasks', icon: CheckSquare },
  { id: 'project', label: 'Projects', icon: Briefcase },
  { id: 'client', label: 'Clients', icon: Building2 },
  { id: 'lead', label: 'Leads', icon: TrendingUp },
  { id: 'expense', label: 'Expenses', icon: CreditCard },
  { id: 'invoice', label: 'Invoices', icon: FileText },
  { id: 'proposal', label: 'Proposals', icon: FileText },
];

export default function RecycleBin() {
  const socket = useSocket();
  const { startDate, endDate, isDateInRange } = useDateFilter();

  const [rawItems, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [countsByType, setCountsByType] = useState({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Action states
  const [restoringId, setRestoringId] = useState(null);
  const [permanentTarget, setPermanentTarget] = useState(null); // item to permanently delete
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [emptying, setEmptying] = useState(false);

  // Fetch Recycle Bin items
  const fetchRecycleBin = useCallback(
    async (currentPage = page) => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: 30,
          entityType: selectedType !== 'all' ? selectedType : undefined,
          search: searchTerm.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };

        const res = await api.get('/recycle-bin', { params });
        if (res.data?.success) {
          setItems(res.data.items || []);
          setTotal(res.data.total || 0);
          setPages(res.data.pages || 1);
          if (res.data.countsByType) {
            setCountsByType(res.data.countsByType);
          }
        }
      } catch (err) {
        console.error('Failed to load recycle bin:', err);
        toast.error('Failed to load items in Recycle Bin');
      } finally {
        setLoading(false);
      }
    },
    [page, selectedType, searchTerm, startDate, endDate]
  );

  const items = React.useMemo(
    () => rawItems.filter((it) => isDateInRange([it.deletedAt, it.createdAt])),
    [rawItems, isDateInRange]
  );

  useEffect(() => {
    fetchRecycleBin(1);
  }, [fetchRecycleBin]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleItemAdded = (item) => {
      setItems((prev) => [item, ...prev]);
      setTotal((prev) => prev + 1);
    };

    const handleItemRestored = ({ id }) => {
      setItems((prev) => prev.filter((it) => it._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    };

    const handleItemDeleted = ({ id }) => {
      setItems((prev) => prev.filter((it) => it._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    };

    const handleEmptied = () => {
      setItems([]);
      setTotal(0);
      setCountsByType({});
    };

    socket.on('recycleBinItemAdded', handleItemAdded);
    socket.on('recycleBinItemRestored', handleItemRestored);
    socket.on('recycleBinItemDeleted', handleItemDeleted);
    socket.on('recycleBinEmptied', handleEmptied);

    return () => {
      socket.off('recycleBinItemAdded', handleItemAdded);
      socket.off('recycleBinItemRestored', handleItemRestored);
      socket.off('recycleBinItemDeleted', handleItemDeleted);
      socket.off('recycleBinEmptied', handleEmptied);
    };
  }, [socket]);

  // Restore Handler
  const handleRestore = async (item) => {
    setRestoringId(item._id);
    try {
      const res = await api.post(`/recycle-bin/${item._id}/restore`);
      if (res.data?.success) {
        toast.success(res.data.message || `"${item.title}" successfully restored!`, {
          description: `Restored to ${item.originalLocation || 'original location'}.`,
        });
        setItems((prev) => prev.filter((it) => it._id !== item._id));
        setTotal((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Restore failed:', err);
      toast.error(err.response?.data?.message || 'Failed to restore item');
    } finally {
      setRestoringId(null);
    }
  };

  // Permanent Delete Handler
  const handlePermanentDelete = async () => {
    if (!permanentTarget) return;
    const item = permanentTarget;
    try {
      const res = await api.delete(`/recycle-bin/${item._id}/permanent`);
      if (res.data?.success) {
        toast.success(res.data.message || `"${item.title}" permanently deleted.`);
        setItems((prev) => prev.filter((it) => it._id !== item._id));
        setTotal((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Permanent delete failed:', err);
      toast.error(err.response?.data?.message || 'Failed to delete permanently');
    } finally {
      setPermanentTarget(null);
    }
  };

  // Empty Recycle Bin Handler
  const handleEmptyRecycleBin = async () => {
    setEmptying(true);
    try {
      const res = await api.post('/recycle-bin/empty');
      if (res.data?.success) {
        toast.success(res.data.message || 'Recycle Bin has been completely emptied.');
        setItems([]);
        setTotal(0);
        setCountsByType({});
      }
    } catch (err) {
      console.error('Failed to empty recycle bin:', err);
      toast.error(err.response?.data?.message || 'Failed to empty Recycle Bin');
    } finally {
      setEmptying(false);
      setShowEmptyConfirm(false);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Type Design Config
  const getTypeDesign = (type = '') => {
    switch (type.toLowerCase()) {
      case 'task':
        return {
          icon: CheckSquare,
          badge: 'bg-secondary text-foreground border-border',
        };
      case 'project':
        return {
          icon: Briefcase,
          badge: 'bg-secondary text-foreground border-border',
        };
      case 'client':
        return {
          icon: Building2,
          badge: 'bg-secondary text-foreground border-border',
        };
      case 'lead':
        return {
          icon: TrendingUp,
          badge: 'bg-secondary text-foreground border-border',
        };
      case 'expense':
      case 'invoice':
        return {
          icon: CreditCard,
          badge: 'bg-secondary text-foreground border-border',
        };
      default:
        return {
          icon: Layers,
          badge: 'bg-muted text-foreground border-border',
        };
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-foreground border border-border">
              <Trash2 size={13} className="stroke-[2.5] shrink-0" />
              Data Recovery & Retention
            </span>
            <span className="text-xs text-muted-foreground font-bold tabular-nums">
              {total} {total === 1 ? 'item' : 'items'} in trash
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Recycle Bin
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {total > 0 && (
            <button
              type="button"
              onClick={() => setShowEmptyConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-foreground/30 bg-secondary px-3.5 py-2 text-xs font-bold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer transition-colors"
            >
              <Trash2 size={13} className="shrink-0" />
              <span>Empty Recycle Bin</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchRecycleBin(page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-2xs hover:bg-secondary cursor-pointer disabled:opacity-50"
            title="Refresh recycle bin"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-foreground shrink-0' : 'shrink-0'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. FILTER & SEARCH BAR ── */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search deleted items..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="text-xs text-muted-foreground tabular-nums">
            Showing <strong className="text-foreground">{items.length}</strong> of{' '}
            <strong className="text-foreground">{total}</strong> records
          </div>
        </div>

        {/* Entity Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border">
          {ENTITY_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = countsByType[tab.id] ?? (tab.id === 'all' ? total : 0);
            const isSelected = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={12} className="shrink-0" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black tabular-nums ${
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-background text-foreground border border-border'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. ITEMS LIST ── */}
      <div className="space-y-3">
        {loading && items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-foreground animate-spin mb-3" />
            <h3 className="text-sm font-bold text-foreground">
              Loading Recycle Bin...
            </h3>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary border border-border text-foreground mb-3">
              <Trash2 size={26} />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Recycle Bin is Empty
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No deleted items found in this section. Whenever tasks, projects, clients, or expenses are deleted, they will be safely held here for recovery.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const design = getTypeDesign(item.entityType);
            const TypeIcon = design.icon;
            const isRestoring = restoringId === item._id;

            return (
              <div
                key={item._id}
                className="rounded-2xl border border-border bg-card p-4 shadow-2xs hover:border-foreground/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  {/* Left: Icon, Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground border border-border">
                      <TypeIcon size={18} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Entity Type Badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${design.badge}`}
                        >
                          <TypeIcon size={11} className="shrink-0" />
                          <span>{item.entityType}</span>
                        </span>

                        {/* Original Location */}
                        {item.originalLocation && (
                          <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
                            <FolderOpen size={10} className="text-foreground shrink-0" />
                            <span>Location: {item.originalLocation}</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-extrabold text-foreground truncate">
                        {item.title}
                      </h3>

                      {/* Subtitle / Value */}
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground font-medium">
                          {item.subtitle}
                        </p>
                      )}

                      {/* Deleted By & Time */}
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground flex-wrap tabular-nums">
                        <span className="flex items-center gap-1">
                          <User size={11} className="shrink-0" />
                          <span>Deleted by:</span>
                          <strong className="text-foreground font-semibold">
                            {item.deletedBy?.name || 'Admin'}
                          </strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="shrink-0" />
                          <span>{formatRelativeTime(item.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {/* Restore Button */}
                    <button
                      type="button"
                      onClick={() => handleRestore(item)}
                      disabled={isRestoring}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RotateCcw size={13} className={isRestoring ? 'animate-spin shrink-0' : 'shrink-0'} />
                      <span>{isRestoring ? 'Restoring...' : 'Restore Item'}</span>
                    </button>

                    {/* Permanent Delete Button */}
                    <button
                      type="button"
                      onClick={() => setPermanentTarget(item)}
                      className="rounded-xl border border-border p-2 text-muted-foreground hover:border-foreground/40 hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 4. PAGINATION ── */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground tabular-nums">
            Page <strong className="text-foreground">{page}</strong> of{' '}
            <strong className="text-foreground">{pages}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                fetchRecycleBin(newPage);
              }}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                fetchRecycleBin(newPage);
              }}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── 5. CONFIRMATION DIALOG: PERMANENT DELETE ── */}
      <AlertDialog open={Boolean(permanentTarget)} onOpenChange={(open) => !open && setPermanentTarget(null)}>
        <AlertDialogContent className="max-w-md p-6 bg-card border border-border shadow-2xl rounded-2xl">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground border border-border shadow-xs">
                <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-extrabold text-foreground">
                  Permanently Delete Record?
                </AlertDialogTitle>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Irreversible Action
                </span>
              </div>
            </div>

            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Are you sure you want to permanently delete{' '}
              <strong className="text-foreground font-bold">"{permanentTarget?.title}"</strong>?
              This record will be completely removed from the database and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setPermanentTarget(null)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePermanentDelete}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              <Trash2 size={13} className="shrink-0" />
              <span>Yes, Delete Permanently</span>
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── 6. CONFIRMATION DIALOG: EMPTY RECYCLE BIN ── */}
      <AlertDialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <AlertDialogContent className="max-w-md p-6 bg-card border border-border shadow-2xl rounded-2xl">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground border border-border shadow-xs">
                <ShieldAlert className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-extrabold text-foreground">
                  Empty Entire Recycle Bin?
                </AlertDialogTitle>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Destructive Action
                </span>
              </div>
            </div>

            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              All <strong className="text-foreground font-bold tabular-nums">{total} items</strong> currently in the Recycle Bin will be permanently wiped out. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowEmptyConfirm(false)}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEmptyRecycleBin}
              disabled={emptying}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Trash2 size={13} className={emptying ? 'animate-spin shrink-0' : 'shrink-0'} />
              <span>{emptying ? 'Emptying...' : 'Yes, Empty Recycle Bin'}</span>
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

