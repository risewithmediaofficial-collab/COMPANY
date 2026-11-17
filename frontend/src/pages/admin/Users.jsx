import { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
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
} from '@/components/ui/muiIcons';
import {
  useAdminChangeUserPassword,
  useDeleteUser,
  useUpdateUser,
  useUpdateUserApproval,
  useUsers,
} from '../../hooks/useUsers';
import { Button } from '../../components/ui/button';
import UserPermissionsModal from './UserPermissionsModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '../../components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';

const roles = [
  { value: 'superAdmin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'organizationOwner', label: 'Organization Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'client', label: 'Client' },
  { value: 'referral', label: 'Referral' },
];

const statusStyles = {
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold',
  rejected: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
};

const Users = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: users = [], isLoading, isFetching, refetch } = useUsers();
  const updateUser = useUpdateUser();
  const updateApproval = useUpdateUserApproval();
  const deleteUser = useDeleteUser();
  const adminChangeUserPassword = useAdminChangeUserPassword();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'clients'
  const [roleFilter, setRoleFilter] = useState('all');
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPasswordFields, setShowPasswordFields] = useState({ newPassword: false, confirmPassword: false });

  // Separate internal staff/team from client portal users
  const staffUsers = useMemo(() => users.filter((u) => u.role !== 'client'), [users]);
  const clientUsers = useMemo(() => users.filter((u) => u.role === 'client'), [users]);
  const employeeUsers = useMemo(() => staffUsers.filter((u) => u.role === 'employee'), [staffUsers]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // Default & team view strictly excludes client accounts!
    // Client accounts are only shown when explicitly on the 'clients' tab.
    let pool = activeTab === 'clients' ? clientUsers : staffUsers;

    // Filter by specific team role if not 'all'
    if (activeTab === 'team' && roleFilter !== 'all') {
      pool = pool.filter((u) => u.role === roleFilter);
    }

    // Search filter
    if (term) {
      pool = pool.filter((u) => {
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        const dept = (u.department || u.position || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const company = (u.clientId?.company || u.clientId?.name || '').toLowerCase();
        return (
          name.includes(term) ||
          email.includes(term) ||
          phone.includes(term) ||
          company.includes(term) ||
          role.includes(term) ||
          dept.includes(term)
        );
      });
    }

    // Sorting:
    // On team view: show employees 1st, then managers, admins, super admins, etc.
    if (activeTab === 'team') {
      const rolePriority = {
        employee: 1,
        manager: 2,
        admin: 3,
        superAdmin: 4,
        organizationOwner: 5,
        referral: 6,
      };
      return [...pool].sort((a, b) => {
        const pA = rolePriority[a.role] || 99;
        const pB = rolePriority[b.role] || 99;
        if (pA !== pB) return pA - pB;
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    // On client view: sort by business company or contact name
    return [...pool].sort((a, b) => {
      const compA = a.clientId?.company || a.clientId?.name || a.name || '';
      const compB = b.clientId?.company || b.clientId?.name || b.name || '';
      return compA.localeCompare(compB);
    });
  }, [activeTab, clientUsers, staffUsers, roleFilter, searchTerm]);

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
      const isSelf = String(passwordUser._id) === String(currentUser?._id);
      await adminChangeUserPassword.mutateAsync({
        id: passwordUser._id,
        newPassword: passwordForm.newPassword,
      });

      const updatedUserName = passwordUser.name;
      setPasswordUser(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });

      if (isSelf) {
        toast.success('Your password was updated. Logging out...');
        dispatch(logout());
        navigate('/login');
      } else {
        toast.success(`Password updated for ${updatedUserName}. That user alone has been logged out.`);
      }
    } catch {
      toast.error('Failed to update password');
    }
  };

  // Statistics
  const totalUsers = users.length;
  const approvedStaffCount = staffUsers.filter((u) => u.approvalStatus === 'approved' || !u.approvalStatus).length;
  const pendingCount = users.filter((u) => u.approvalStatus === 'pending').length;
  const activeCount = users.filter((u) => u.isActive).length;

  // Table Columns - Team Members
  const teamTableColumns = [
    {
      key: 'name',
      label: 'Team Member',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-secondary text-foreground flex items-center justify-center font-bold text-xs shrink-0">
            {u.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-bold text-foreground">{u.name}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 tabular-nums">
              <span>{u.email}</span>
              {u.phone && <span className="text-[10px] opacity-80">· {u.phone}</span>}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department / Position',
      render: (u) => (
        <span className="text-xs font-semibold text-foreground">
          {u.department || u.position || 'General'}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'System Role',
      render: (u) => (
        <Select
          value={u.role}
          onValueChange={(val) => handleRoleChange(u._id, val || u.role)}
          disabled={!['superAdmin', 'admin'].includes(currentUser?.role) && u.role === 'superAdmin'}
        >
          <SelectTrigger className="h-8 w-36 px-2.5 rounded-lg bg-background text-xs font-semibold border border-border/50">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent position="popper" searchable={false}>
            {roles.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-xs font-semibold cursor-pointer">
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'approvalStatus',
      label: 'Approval Status',
      render: (u) => {
        const st = u.approvalStatus || 'approved';
        return (
          <div className="flex items-center gap-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${statusStyles[st] || statusStyles.approved}`}>
              {st}
            </span>
            {st === 'pending' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleApprovalChange(u._id, 'approved')}
                  className="p-1 rounded-md bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  title="Approve User"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => handleApprovalChange(u._id, 'rejected')}
                  className="p-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
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
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
            title="Custom Permissions"
          >
            <ShieldCheck size={15} />
          </button>
          <button
            onClick={() => {
              setPasswordUser(u);
              setPasswordForm({ newPassword: '', confirmPassword: '' });
            }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
            title="Reset Password"
          >
            <KeyRound size={15} />
          </button>
          <button
            onClick={() => setDeleteUserTarget(u)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
            title="Delete User"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  // Table Columns - Client Accounts
  const clientTableColumns = [
    {
      key: 'name',
      label: 'Client Contact',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
            {u.name?.charAt(0) || 'C'}
          </div>
          <div>
            <p className="font-bold text-foreground">{u.name}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 tabular-nums">
              <span>{u.email}</span>
              {u.phone && <span className="text-[10px] opacity-80">· {u.phone}</span>}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      label: 'Associated Business / Company',
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <Building2 size={13} className="text-muted-foreground shrink-0" />
          <span className="font-semibold text-foreground text-xs">
            {u.clientId?.company || u.clientId?.name || 'Independent Client'}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'System Role',
      render: (u) => (
        <Select
          value={u.role}
          onValueChange={(val) => handleRoleChange(u._id, val || u.role)}
          disabled={!['superAdmin', 'admin'].includes(currentUser?.role) && u.role === 'superAdmin'}
        >
          <SelectTrigger className="h-8 w-36 px-2.5 rounded-lg bg-background text-xs font-semibold border border-border/50">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent position="popper" searchable={false}>
            {roles.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-xs font-semibold cursor-pointer">
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'approvalStatus',
      label: 'Portal Access Status',
      render: (u) => {
        const st = u.approvalStatus || 'approved';
        return (
          <div className="flex items-center gap-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${statusStyles[st] || statusStyles.approved}`}>
              {st}
            </span>
            {st === 'pending' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleApprovalChange(u._id, 'approved')}
                  className="p-1 rounded-md bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  title="Approve Client Access"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => handleApprovalChange(u._id, 'rejected')}
                  className="p-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Reject Client Access"
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
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
            title="Portal Permissions"
          >
            <ShieldCheck size={15} />
          </button>
          <button
            onClick={() => {
              setPasswordUser(u);
              setPasswordForm({ newPassword: '', confirmPassword: '' });
            }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
            title="Reset Password"
          >
            <KeyRound size={15} />
          </button>
          <button
            onClick={() => setDeleteUserTarget(u)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
            title="Delete Account"
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
    const isClient = u.role === 'client';
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider ${
              isClient
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                : 'bg-secondary text-foreground uppercase'
            }`}
          >
            {isClient ? 'Client Account' : u.role}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusStyles[st] || statusStyles.approved}`}>
            {st}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
              isClient
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold'
                : 'bg-secondary text-foreground'
            }`}
          >
            {u.name?.charAt(0) || (isClient ? 'C' : 'U')}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-foreground truncate">{u.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-secondary/40 space-y-1 text-xs">
          {isClient ? (
            <>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground shrink-0">Company:</span>
                <span className="font-semibold text-foreground truncate">
                  {u.clientId?.company || u.clientId?.name || 'Independent Client'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground shrink-0">Phone:</span>
                <span className="font-medium text-foreground tabular-nums truncate">{u.phone || '—'}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-semibold text-foreground">{u.department || u.position || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined:</span>
                <span className="font-medium text-foreground tabular-nums">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-1 pt-1">
          <button
            onClick={() => setPermissionsUser(u)}
            className="px-2.5 py-1 rounded-lg hover:bg-secondary text-xs font-semibold text-foreground flex items-center gap-1 cursor-pointer"
          >
            <ShieldCheck size={13} className="shrink-0" />
            <span>Permissions</span>
          </button>
          <button
            onClick={() => {
              setPasswordUser(u);
              setPasswordForm({ newPassword: '', confirmPassword: '' });
            }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
            title="Reset Password"
          >
            <KeyRound size={13} />
          </button>
          <button
            onClick={() => setDeleteUserTarget(u)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
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
      icon={UsersIcon}
      properties={[
        { label: 'Total Staff', value: staffUsers.length, icon: UsersIcon, tone: 'primary' },
        { label: 'Employees', value: employeeUsers.length, tone: 'neutral' },
        { label: 'Client Accounts', value: clientUsers.length, icon: Building2, tone: 'info' },
        { label: 'Approved Staff', value: approvedStaffCount, tone: 'success', icon: CheckCircle2 },
        { label: 'Pending Approval', value: pendingCount, tone: pendingCount > 0 ? 'warning' : 'neutral', icon: Clock },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => refetch()}
          variant="outline"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[38px] cursor-pointer"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </Button>
      }
    >
      {/* Category Tabs: Team & Staff vs Client Accounts */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex p-1 rounded-2xl bg-secondary/70 border border-border/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab('team');
              setRoleFilter('all');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <UsersIcon size={14} />
            <span>Team & Staff</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'team'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {staffUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('clients');
              setRoleFilter('all');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'clients'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <Building2 size={14} />
            <span>Client Accounts</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'clients'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {clientUsers.length}
            </span>
          </button>
        </div>

        {activeTab === 'team' && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="font-semibold text-foreground">{employeeUsers.length}</span> employees &middot;{' '}
            <span className="font-semibold text-foreground">{staffUsers.length - employeeUsers.length}</span> management / staff
          </div>
        )}
        {activeTab === 'clients' && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="font-semibold text-foreground">{clientUsers.length}</span> client portal logins
          </div>
        )}
      </div>

      {/* Role Filter Tabs (Shown for Team tab: Employees 1st, then Management roles) */}
      {activeTab === 'team' && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { key: 'all', label: 'All Team Staff' },
            { key: 'employee', label: 'Employees' },
            { key: 'admin', label: 'Admins' },
            { key: 'manager', label: 'Managers' },
            { key: 'superAdmin', label: 'Super Admins' },
            { key: 'organizationOwner', label: 'Org Owners' },
            { key: 'referral', label: 'Referrals' },
          ].map((r) => {
            const count =
              r.key === 'all'
                ? staffUsers.length
                : staffUsers.filter((u) => u.role === r.key).length;
            if (count === 0 && r.key !== 'all' && r.key !== 'employee' && r.key !== 'admin') {
              return null;
            }
            return (
              <button
                key={r.key}
                onClick={() => setRoleFilter(r.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  roleFilter === r.key
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/40'
                }`}
              >
                <span>{r.label}</span>
                <span className={`text-[10px] font-mono ${roleFilter === r.key ? 'opacity-90' : 'opacity-60'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      <DatabaseView
        viewKey="rwm_users_view_v1"
        views={['cards', 'table']}
        items={filteredUsers}
        totalCount={filteredUsers.length}
        searchPlaceholder={
          activeTab === 'clients'
            ? 'Search client accounts by name, company, email, or phone...'
            : 'Search team members by name, email, department, or role...'
        }
        columns={activeTab === 'clients' ? clientTableColumns : teamTableColumns}
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
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-xl max-h-[90dvh]">
          <DialogHeader className="px-6 py-4 sm:py-5 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0 ">
                <KeyRound size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                  Reset Password — {passwordUser?.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Reset password
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary text-[10px] font-mono font-medium text-muted-foreground select-none">
                ESC
              </kbd>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
                <X size={16} className="stroke-[2.5]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">New Password *</label>
                <div className="relative">
                  <input
                    type={showPasswordFields.newPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="At least 6 characters"
                    className="w-full h-11 rounded-xl bg-background px-4 pr-11 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields((prev) => ({ ...prev, newPassword: !prev.newPassword }))}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showPasswordFields.newPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordFields.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showPasswordFields.confirmPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    className="w-full h-11 rounded-xl bg-background px-4 pr-11 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showPasswordFields.confirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordFields.confirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono font-medium text-foreground">
                  ESC
                </kbd>
                <span>to close</span>
              </span>

              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPasswordUser(null)}
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-primary hover:opacity-90 text-sm font-bold text-primary-foreground cursor-pointer transition-all"
                >
                  Update Password
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <AlertDialog open={Boolean(deleteUserTarget)} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
        <AlertDialogContent className="bg-card ">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete {deleteUserTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
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
