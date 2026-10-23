import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { ShieldCheck, X, Building2, Lock } from 'lucide-react';
import api from '../../api';
import { toast } from 'sonner';

const PERMISSIONS = [
  { key: 'canViewReports', label: 'View Reports' },
  { key: 'canApproveContent', label: 'Approve Content' },
  { key: 'canViewFinanceOverview', label: 'View Finance Overview' },
  { key: 'canManageFinance', label: 'Manage Finance' },
  { key: 'canManageLeads', label: 'Manage Leads' },
  { key: 'canManageHR', label: 'Manage HR' },
  { key: 'canAssignTasks', label: 'Assign Tasks' },
  { key: 'canUploadAssets', label: 'Upload Assets' },
  { key: 'canViewAnalytics', label: 'View Analytics' },
  { key: 'canManageEmployees', label: 'Manage Employees' },
  { key: 'canAccessSmm', label: 'Social Media Manager' },
];

export default function UserPermissionsModal({ user, onClose, onSave }) {
  const [permissions, setPermissions] = useState(user?.permissions || {});
  const [assignedBrands, setAssignedBrands] = useState(user?.assignedBrands || []);
  const [allBrands, setAllBrands] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/brands/all')
      .then(res => setAllBrands(res.data.brands || []))
      .catch(console.error);
  }, []);

  const handleTogglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleBrand = (brandId) => {
    setAssignedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (typeof onSave === 'function') {
        await onSave(user._id, { permissions, assignedBrands });
      } else {
        await api.put(`/users/${user._id}`, { permissions, assignedBrands });
      }
      toast.success('Permissions & workspace access updated');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl w-[calc(100vw-24px)] max-w-2xl max-h-[90dvh]">
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                Access Control & Permissions
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                Configure role permissions and workspaces for {user?.name || 'User'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
              <X size={16} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body - Google Form Linear Stack */}
        <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lock size={15} className="text-primary" />
              <span>Granular Permissions</span>
            </label>
            <div className="space-y-2.5">
              {PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background hover:bg-secondary/30 cursor-pointer transition-colors shadow-2xs">
                  <input 
                    type="checkbox" 
                    checked={!!permissions[p.key]} 
                    onChange={() => handleTogglePermission(p.key)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-foreground">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 size={15} className="text-primary" />
              <span>Assigned Workspaces</span>
            </label>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {allBrands.length === 0 ? (
                <p className="text-sm text-muted-foreground italic p-3 bg-secondary/20 rounded-xl border border-border">No workspaces available.</p>
              ) : (
                allBrands.map(brand => (
                  <label key={brand._id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background hover:bg-secondary/30 cursor-pointer transition-colors shadow-2xs">
                    <input 
                      type="checkbox" 
                      checked={assignedBrands.includes(brand._id)} 
                      onChange={() => handleToggleBrand(brand._id)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                    />
                    <span className="text-sm font-medium flex-1 text-foreground">{brand.name}</span>
                    <span className="text-xs text-muted-foreground px-2.5 py-0.5 bg-secondary rounded-full border border-border/60">{brand.status}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pinned Sticky Bottom Action Footer */}
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
          <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-[10px] font-mono font-medium text-foreground">
              ESC
            </kbd>
            <span>to close</span>
          </span>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all"
            >
              {loading ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
