import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import api from '../../api';

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
  const [permissions, setPermissions] = useState(user.permissions || {});
  const [assignedBrands, setAssignedBrands] = useState(user.assignedBrands || []);
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
    setLoading(true);
    await onSave(user._id, { permissions, assignedBrands });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex min-h-full items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full my-auto max-w-lg bg-card rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[min(90vh,calc(100dvh-2rem))] border border-border">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Access Control</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Configure permissions for {user.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Granular Permissions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={!!permissions[p.key]} 
                    onChange={() => handleTogglePermission(p.key)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Assigned Workspaces</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {allBrands.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No workspaces available.</p>
              ) : (
                allBrands.map(brand => (
                  <label key={brand._id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={assignedBrands.includes(brand._id)} 
                      onChange={() => handleToggleBrand(brand._id)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium flex-1">{brand.name}</span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-secondary rounded-full">{brand.status}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex justify-end gap-3 bg-secondary/20">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
