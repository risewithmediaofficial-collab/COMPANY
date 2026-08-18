import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
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
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Access Control & Permissions</DialogTitle>
          <DialogDescription>
            Configure granular role permissions and assigned workspaces for {user?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-xs">
          <div>
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
              <span>🔒</span> Granular Permissions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-background hover:bg-secondary/40 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={!!permissions[p.key]} 
                    onChange={() => handleTogglePermission(p.key)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-xs font-medium text-foreground">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
              <span>🏢</span> Assigned Workspaces
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {allBrands.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No workspaces available.</p>
              ) : (
                allBrands.map(brand => (
                  <label key={brand._id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-background hover:bg-secondary/40 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={assignedBrands.includes(brand._id)} 
                      onChange={() => handleToggleBrand(brand._id)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="text-xs font-medium flex-1 text-foreground">{brand.name}</span>
                    <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-secondary rounded-full border border-border/60">{brand.status}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl bg-primary text-primary-foreground font-bold text-xs">
              {loading ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
