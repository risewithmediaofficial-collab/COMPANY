import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  CheckCircle2,
  Clock,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  XCircle,
  Users as UsersIcon,
  Mail,
  Building2,
  Shield,
  Pencil,
  Check,
  X,
  Plus,
} from 'lucide-react';
import {
  useAdminChangeUserPassword,
  useDeleteUser,
  useUpdateUser,
  useUpdateUserApproval,
  useUsers,
} from '../../hooks/useUsers';
import { Button } from '../../components/ui/button';
import UserPermissionsModal from './UserPermissionsModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';

const roles = [
  { value: 'superAdmin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'client', label: 'Client' },
  { value: 'referral', label: 'Referral' },
];

const statusStyles = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const Users = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const { data: users = [], isLoading, isFetching, refetch } = useUsers();
  const updateUser = useUpdateUser();
  const updateApproval = useUpdateUserApproval();
  const deleteUser = useDeleteUser();
  const adminChangeUserPassword = useAdminChangeUserPassword();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();

      const matchesSearch = !term || name.includes(term) || email.includes(term) || role.includes(term) || dept.includes(term);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUser.mutateAsync({ id: userId, data: { role: newRole } });
      toast.success('User role updated successfully');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleApprovalChange = async (userId, approvalStatus) => {
    try {
      await updateApproval.mutateAsync({ id: userId, approvalStatus });
      toast.success(`User marked as ${approvalStatus}`);
    } catch {
      toast.error('Failed to update approval status');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await adminChangeUserPassword.mutateAsync({
        id: passwordUser._id,
        newPassword: passwordForm.newPassword,
      });
      toast.success(`Password updated for ${passwordUser.name}`);
      setPasswordUser(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch {
      toast.error('Failed to update password');
    }
  };

  // Statistics
  const total = users.length;
  const approvedCount = users.filter((u) => u.approvalStatus === 'approved' || !u.approvalStatus).length;
  const pendingCount = users.filter((u) => u.approvalStatus === 'pending').length;
  const activeCount = users.filter((u) => u.isActive).length;

  // Table Columns
  const tableColumns = [
    {
      key: 'name',
      label: 'Team Member',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {u.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-bold text-foreground">{u.name}</p>
            <p className="text-[11px] text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'System Role',
      render: (u) => (
        <select
          value={u.role}
          onChange={(e) => handleRoleChange(u._id, e.target.value)}
          disabled={currentUser?.role !== 'superAdmin' && u.role === 'superAdmin'}
          className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-semibold"
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'approvalStatus',
      label: 'Approval Status',
      render: (u) => {
        const st = u.approvalStatus || 'approved';
        return (
          <div className="flex items-center gap-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${statusStyles[st] || statusStyles.approved}`}>
              {st}
            </span>
            {st === 'pending' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleApprovalChange(u._id, 'approved')}
                  className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  title="Approve User"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => handleApprovalChange(u._id, 'rejected')}
                  className="p-1 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                  title="Reject User"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setPermissionsUser(u)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Custom Permissions"
          >
            <ShieldCheck size={15} />
          </button>
          <button
            onClick={() => {
              setPasswordUser(u);
              setPasswordForm({ newPassword: '', confirmPassword: '' });
            }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Reset Password"
          >
            <KeyRound size={15} />
          </button>
          <button
            onClick={() => setDeleteUserTarget(u)}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
            title="Delete User"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  // Cards Render
  const renderCard = (u) => {
    const st = u.approvalStatus || 'approved';
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
            {u.role}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusStyles[st] || statusStyles.approved}`}>
            {st}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center font-black text-sm text-foreground">
            {u.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">{u.name}</h4>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Department:</span>
            <span className="font-semibold text-foreground">{u.department || u.position || 'General'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Joined:</span>
            <span className="font-medium text-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
          <button
            onClick={() => setPermissionsUser(u)}
            className="px-2.5 py-1 rounded-lg hover:bg-secondary text-xs font-semibold text-foreground flex items-center gap-1"
          >
            <ShieldCheck size={13} />
            <span>Permissions</span>
          </button>
          <button
            onClick={() => {
              setPasswordUser(u);
              setPasswordForm({ newPassword: '', confirmPassword: '' });
            }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
            title="Reset Password"
          >
            <KeyRound size={13} />
          </button>
          <button
            onClick={() => setDeleteUserTarget(u)}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Team & Workload', 'User Directory']}
      title="Team Directory & User Access"
      subtitle="Manage team accounts, permission policies, system role assignments, and registration approval workflows."
      icon="👥"
      properties={[
        { label: 'Total Users', value: total, icon: UsersIcon },
        { label: 'Approved Staff', value: approvedCount, tone: 'success', icon: CheckCircle2 },
        { label: 'Pending Approval', value: pendingCount, tone: pendingCount > 0 ? 'warning' : 'neutral', icon: Clock },
        { label: 'Active Status', value: activeCount, tone: 'info' },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => refetch()}
          variant="outline"
          className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </Button>
      }
    >
      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {['all', 'superAdmin', 'admin', 'manager', 'employee', 'client', 'referral'].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
              roleFilter === r
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {r === 'all' ? 'All Roles' : r.replace(/([A-Z])/g, ' $1')}
          </button>
        ))}
      </div>

      <DatabaseView
        viewKey="rwm_users_view_v1"
        views={['cards', 'table']}
        items={filteredUsers}
        totalCount={filteredUsers.length}
        searchPlaceholder="Search team members by name, email, role, or department..."
        columns={tableColumns}
        renderCard={renderCard}
        onSearchChange={setSearchTerm}
      />

      {/* Permissions Modal */}
      {permissionsUser && (
        <UserPermissionsModal
          isOpen={Boolean(permissionsUser)}
          onClose={() => setPermissionsUser(null)}
          user={permissionsUser}
          onSave={async (userId, data) => {
            await updateUser.mutateAsync({ id: userId, data });
          }}
        />
      )}

      {/* Reset Password Modal */}
      <Dialog open={Boolean(passwordUser)} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent className="max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground">Reset Password for {passwordUser?.name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set a new secure password for this user account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="At least 6 characters"
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPasswordUser(null)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl text-xs font-bold">
                Update Password
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <AlertDialog open={Boolean(deleteUserTarget)} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to permanently delete {deleteUserTarget?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteUserTarget) {
                  await deleteUser.mutateAsync(deleteUserTarget._id);
                  setDeleteUserTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete User
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
};

export default Users;
