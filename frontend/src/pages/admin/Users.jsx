import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CheckCircle2, Clock, KeyRound, RefreshCw, Search, ShieldCheck, Trash2, UserCog, XCircle } from 'lucide-react';
import { useAdminChangeUserPassword, useDeleteUser, useUpdateUser, useUpdateUserApproval, useUsers } from '../../hooks/useUsers';
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

const roles = [
  { value: 'superAdmin', label: 'Super Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'client', label: 'Client' },
  { value: 'referral', label: 'Referral' },
];

const statusStyles = {
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-destructive/10 text-destructive',
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

const Users = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const { data: users = [], isLoading, isFetching, refetch } = useUsers();
  const updateUser = useUpdateUser();
  const updateApproval = useUpdateUserApproval();
  const deleteUser = useDeleteUser();
  const adminChangeUserPassword = useAdminChangeUserPassword();
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      return [user.name, user.email, user.role, user.position, user.approvalStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [searchTerm, users]);

  const counts = useMemo(() => {
    return users.reduce(
      (summary, user) => {
        const status = user.approvalStatus || 'approved';
        summary[status] = (summary[status] || 0) + 1;
        summary.total += 1;
        return summary;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [users]);

  const pendingUsers = useMemo(() => {
    return users.filter((user) => (user.approvalStatus || 'approved') === 'pending');
  }, [users]);

  const handleRoleChange = (targetUser, role) => {
    updateUser.mutate({ id: targetUser._id, data: { role } });
  };

  const handlePositionChange = (targetUser, position) => {
    updateUser.mutate({ id: targetUser._id, data: { position } });
  };

  const handleActiveChange = (targetUser) => {
    updateUser.mutate({ id: targetUser._id, data: { isActive: !targetUser.isActive } });
  };

  const handleApprovalChange = (targetUser, approvalStatus) => {
    updateApproval.mutate({ id: targetUser._id, approvalStatus });
  };

  const openPasswordDialog = (targetUser) => {
    setPasswordUser(targetUser);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
  };

  const closePasswordDialog = (open) => {
    if (!open) {
      setPasswordUser(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!passwordUser) return;

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Fill in both password fields');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
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
      closePasswordDialog(false);
    } catch (_) {
      // handled by mutation toast
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserCog size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users & Approvals</h1>
            <p className="text-muted-foreground text-sm">Approve new accounts, change roles, and control access.</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ['Total Users', counts.total, ShieldCheck, 'text-primary', 'bg-primary/10'],
          ['Pending Approval', counts.pending, Clock, 'text-amber-600', 'bg-amber-500/10'],
          ['Approved', counts.approved, CheckCircle2, 'text-emerald-600', 'bg-emerald-500/10'],
          ['Rejected', counts.rejected, XCircle, 'text-destructive', 'bg-destructive/10'],
        ].map(([label, value, Icon, color, bg]) => (
          <div key={label} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className={`mb-4 inline-flex rounded-xl p-2.5 ${bg} ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between bg-amber-500/5">
          <div>
            <h2 className="font-bold flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              Requested Approvals
            </h2>
            <p className="text-xs text-muted-foreground mt-1">New registrations waiting for super admin approval.</p>
          </div>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600">
            {pendingUsers.length} pending
          </span>
        </div>
        {pendingUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No approval requests right now.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pendingUsers.map((user) => (
              <div key={user._id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <select
                    value={user.role}
                    onChange={(event) => handleRoleChange(user, event.target.value)}
                    disabled={updateUser.isPending}
                    className="w-full sm:w-40 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Position (e.g. Designer)"
                    defaultValue={user.position || ''}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== (user.position || '')) handlePositionChange(user, val);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                    className="w-full sm:w-36 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                  />
                  <Button
                    onClick={() => handleApprovalChange(user, 'approved')}
                    disabled={updateApproval.isPending}
                    className="h-9 px-3"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleApprovalChange(user, 'rejected')}
                    disabled={updateApproval.isPending}
                    className="h-9 px-3"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center bg-card/50 p-3 rounded-2xl border border-border backdrop-blur-sm">
        <Search size={16} className="absolute left-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users by name, email, role, position, or status..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-sm focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto overflow-y-auto max-h-[520px] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="text-muted-foreground font-medium">
              <tr>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">User</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Role</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Position</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Approval</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Access</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Joined</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const approvalStatus = user.approvalStatus || 'approved';
                  const StatusIcon = statusIcons[approvalStatus] || CheckCircle2;
                  const isSelf = currentUser?._id === user._id;

                  return (
                    <tr key={user._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(event) => handleRoleChange(user, event.target.value)}
                          disabled={isSelf || updateUser.isPending}
                          className="w-36 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                        >
                          {roles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="e.g. Developer"
                          defaultValue={user.position || ''}
                          key={user._id + '_' + (user.position || '')}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (user.position || '')) handlePositionChange(user, val);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          disabled={updateUser.isPending}
                          className="w-36 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 placeholder:text-muted-foreground/40"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusStyles[approvalStatus] || statusStyles.approved}`}>
                          <StatusIcon size={14} />
                          {approvalStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleActiveChange(user)}
                          disabled={isSelf || approvalStatus !== 'approved' || updateUser.isPending}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                            user.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {approvalStatus !== 'approved' && (
                            <Button
                              onClick={() => handleApprovalChange(user, 'approved')}
                              disabled={updateApproval.isPending}
                              className="h-9 px-3"
                            >
                              Approve
                            </Button>
                          )}
                          {approvalStatus !== 'rejected' && !isSelf && (
                            <Button
                              variant="outline"
                              onClick={() => handleApprovalChange(user, 'rejected')}
                              disabled={updateApproval.isPending}
                              className="h-9 px-3"
                            >
                              Reject
                            </Button>
                          )}
                          {!isSelf && (
                            <Button
                              variant="outline"
                              onClick={() => openPasswordDialog(user)}
                              className="h-9 px-3"
                            >
                              <KeyRound size={14} className="mr-2" />
                              Password
                            </Button>
                          )}
                          {!isSelf && (
                            <Button
                              variant="secondary"
                              onClick={() => setPermissionsUser(user)}
                              className="h-9 px-3 bg-secondary text-foreground hover:bg-secondary/80"
                            >
                              Access
                            </Button>
                          )}
                          {!isSelf && (
                            <Button
                              variant="outline"
                              onClick={() => setDeleteUserTarget(user)}
                              disabled={deleteUser.isPending}
                              className="h-9 px-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 size={14} className="mr-1.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {permissionsUser && (
        <UserPermissionsModal 
          user={permissionsUser} 
          onClose={() => setPermissionsUser(null)} 
          onSave={async (id, data) => {
            await updateUser.mutateAsync({ id, data });
          }} 
        />
      )}
      <Dialog open={!!passwordUser} onOpenChange={closePasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Password</DialogTitle>
            <DialogDescription>
              {passwordUser ? `Set a new password for ${passwordUser.name}.` : 'Set a new password for this user.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => closePasswordDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adminChangeUserPassword.isPending}>
                {adminChangeUserPassword.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUserTarget} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete account for <span className="font-bold text-foreground">{deleteUserTarget?.name}</span> ({deleteUserTarget?.email})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 pt-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteUserTarget?._id) {
                  await deleteUser.mutateAsync(deleteUserTarget._id);
                  setDeleteUserTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
