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
} from 'lucide-react';
import api from '../../api';
import { useSocket } from '../../context/SocketContext';
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

  const [items, setItems] = useState([]);
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
    [page, selectedType, searchTerm]
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
          badge: 'bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:text-indigo-300 dark:border-indigo-800',
        };
      case 'project':
        return {
          icon: Briefcase,
          badge: 'bg-sky-500/10 text-sky-700 border-sky-300 dark:text-sky-300 dark:border-sky-800',
        };
      case 'client':
        return {
          icon: Building2,
          badge: 'bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-300 dark:border-purple-800',
        };
      case 'lead':
        return {
          icon: TrendingUp,
          badge: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-800',
        };
      case 'expense':
      case 'invoice':
        return {
          icon: CreditCard,
          badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-800',
        };
      default:
        return {
          icon: Layers,
          badge: 'bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-800',
        };
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Trash2 size={13} className="stroke-[2.5]" />
              Data Recovery & Retention
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {total} {total === 1 ? 'item' : 'items'} in trash
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Recycle Bin
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {total > 0 && (
            <button
              type="button"
              onClick={() => setShowEmptyConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 cursor-pointer transition-colors"
            >
              <Trash2 size={13} />
              <span>Empty Recycle Bin</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchRecycleBin(page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-50"
            title="Refresh recycle bin"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-indigo-500' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. FILTER & SEARCH BAR ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search deleted items..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-white">{items.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-white">{total}</strong> records
          </div>
        </div>

        {/* Entity Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800">
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
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
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
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <RefreshCw className="mx-auto h-8 w-8 text-indigo-500 animate-spin mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Loading Recycle Bin...
            </h3>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-14 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-3">
              <Trash2 size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recycle Bin is Empty
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
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
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 transition-all"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  {/* Left: Icon, Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <TypeIcon size={18} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Entity Type Badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${design.badge}`}
                        >
                          <TypeIcon size={11} />
                          <span>{item.entityType}</span>
                        </span>

                        {/* Original Location */}
                        {item.originalLocation && (
                          <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <FolderOpen size={10} className="text-indigo-500" />
                            <span>Location: {item.originalLocation}</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h3>

                      {/* Subtitle / Value */}
                      {item.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {item.subtitle}
                        </p>
                      )}

                      {/* Deleted By & Time */}
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          <span>Deleted by:</span>
                          <strong className="text-slate-600 dark:text-slate-300 font-semibold">
                            {item.deletedBy?.name || 'Admin'}
                          </strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RotateCcw size={13} className={isRestoring ? 'animate-spin' : ''} />
                      <span>{isRestoring ? 'Restoring...' : 'Restore Item'}</span>
                    </button>

                    {/* Permanent Delete Button */}
                    <button
                      type="button"
                      onClick={() => setPermanentTarget(item)}
                      className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-900 dark:text-white">{page}</strong> of{' '}
            <strong className="text-slate-900 dark:text-white">{pages}</strong>
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── 5. CONFIRMATION DIALOG: PERMANENT DELETE ── */}
      <AlertDialog open={Boolean(permanentTarget)} onOpenChange={(open) => !open && setPermanentTarget(null)}>
        <AlertDialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-2xl rounded-2xl">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs">
                <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                  Permanently Delete Record?
                </AlertDialogTitle>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Irreversible Action
                </span>
              </div>
            </div>

            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900 dark:text-white font-bold">"{permanentTarget?.title}"</strong>?
              This record will be completely removed from the database and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setPermanentTarget(null)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePermanentDelete}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:bg-rose-500 transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Yes, Delete Permanently</span>
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── 6. CONFIRMATION DIALOG: EMPTY RECYCLE BIN ── */}
      <AlertDialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <AlertDialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-2xl rounded-2xl">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs">
                <ShieldAlert className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                  Empty Entire Recycle Bin?
                </AlertDialogTitle>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Destructive Action
                </span>
              </div>
            </div>

            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              All <strong className="text-slate-900 dark:text-white font-bold">{total} items</strong> currently in the Recycle Bin will be permanently wiped out. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowEmptyConfirm(false)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEmptyRecycleBin}
              disabled={emptying}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Trash2 size={13} className={emptying ? 'animate-spin' : ''} />
              <span>{emptying ? 'Emptying...' : 'Yes, Empty Recycle Bin'}</span>
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

