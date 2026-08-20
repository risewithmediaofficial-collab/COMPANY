import { useState, useMemo } from 'react';
import {
  Building2,
  Clock3,
  Plus,
  ShieldCheck,
  Users,
  UserCheck,
  Clock,
  Pencil,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useDeleteEmployee, useEmployees } from '../../hooks/useHR';
import { AddEmployeeModal } from '../../components/modals/AddEmployeeModal';
import { Button } from '../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';

const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

const HR = () => {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const { data: rawEmployees = [], isLoading } = useEmployees({ search: searchTerm });
  const deleteEmployeeMutation = useDeleteEmployee();

  const isEmpClockedIn = (employee) => {
    const att = employee.todayAttendance;
    if (!att) return false;
    if (att.isClockedIn !== undefined) return att.isClockedIn;
    if (att.sessions && att.sessions.length > 0) return att.sessions.some((s) => !s.clockOut);
    return Boolean(att.clockIn && !att.clockOut);
  };

  const departments = useMemo(() => {
    const set = new Set(rawEmployees.map((e) => e.department).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [rawEmployees]);

  const filteredEmployees = useMemo(() => {
    return rawEmployees.filter((emp) => {
      const q = searchTerm.toLowerCase();
      const name = (emp.name || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || dept.includes(q);
      const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [rawEmployees, searchTerm, deptFilter]);

  const activeEmployees = rawEmployees.filter((e) => e.status === 'Active' || e.employmentStatus === 'active').length;
  const clockedInNow = rawEmployees.filter(isEmpClockedIn).length;
  const loggedHoursToday = rawEmployees.reduce(
    (sum, e) => sum + Number(e.todayAttendance?.totalHours || 0),
    0,
  );

  // Table Columns
  const tableColumns = [
    {
      key: 'name',
      label: 'Employee Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {row.name?.charAt(0) || 'E'}
          </div>
          <div>
            <p className="font-bold text-foreground">{row.name}</p>
            <p className="text-[11px] text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (row) => (
        <span className="font-semibold text-xs text-foreground">
          {row.department || row.position || 'General'}
        </span>
      ),
    },
    {
      key: 'clockIn',
      label: 'Today Attendance',
      render: (row) => {
        const clockedIn = isEmpClockedIn(row);
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${clockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}
            />
            <span className="text-xs font-semibold text-foreground">
              {clockedIn ? `Clocked In (${formatTime(row.todayAttendance?.clockIn)})` : 'Not Clocked In'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'totalHours',
      label: 'Logged Hours',
      render: (row) => (
        <span className="font-bold text-xs text-foreground">
          {row.todayAttendance?.totalHours ? `${row.todayAttendance.totalHours} hrs` : '0 hrs'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setSelectedEmployee(row);
              setShowAddEmployeeModal(true);
            }}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteEmployeeId(row._id)}
            className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Cards Render
  const renderCard = (row) => {
    const clockedIn = isEmpClockedIn(row);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary uppercase tracking-wider">
            {row.department || 'General'}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              clockedIn
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${clockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {clockedIn ? 'Clocked In' : 'Offline'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center font-black text-sm text-foreground">
            {row.name?.charAt(0) || 'E'}
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">{row.name}</h4>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Today's Hours:</span>
            <span className="font-bold text-foreground">
              {row.todayAttendance?.totalHours ? `${row.todayAttendance.totalHours} hrs` : '0 hrs'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Join Date:</span>
            <span className="font-medium text-foreground">{new Date(row.joinDate || row.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
          <button
            onClick={() => {
              setSelectedEmployee(row);
              setShowAddEmployeeModal(true);
            }}
            className="p-1 rounded hover:bg-secondary text-muted-foreground"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setDeleteEmployeeId(row._id)}
            className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Team & Workload', 'HR & Hiring']}
      title="HR & Team Directory"
      subtitle="Employee records, daily clock-in activity, department assignments, and logged operational hours."
      icon="👥"
      properties={[
        { label: 'Active Team', value: activeEmployees, tone: 'success', icon: Users },
        { label: 'Clocked In Now', value: clockedInNow, tone: clockedInNow > 0 ? 'info' : 'neutral', icon: UserCheck },
        { label: 'Departments', value: departments.length - 1, icon: Building2 },
        { label: 'Logged Hours Today', value: `${loggedHoursToday.toFixed(1)} hrs`, tone: 'neutral', icon: Clock },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setSelectedEmployee(null);
            setShowAddEmployeeModal(true);
          }}
          className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Add Employee</span>
        </Button>
      }
    >
      {/* Department Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {departments.map((d) => (
          <button
            key={d}
            onClick={() => setDeptFilter(d)}
            className={`px-3.5 py-1 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
              deptFilter === d
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {d === 'all' ? 'All Departments' : d}
          </button>
        ))}
      </div>

      <DatabaseView
        viewKey="rwm_hr_view_v1"
        views={['cards', 'table']}
        items={filteredEmployees}
        totalCount={filteredEmployees.length}
        searchPlaceholder="Search employees by name, department, or email..."
        columns={tableColumns}
        renderCard={renderCard}
        onSearchChange={setSearchTerm}
      />

      <AddEmployeeModal
        open={showAddEmployeeModal}
        onOpenChange={setShowAddEmployeeModal}
        employee={selectedEmployee}
      />

      <AlertDialog open={Boolean(deleteEmployeeId)} onOpenChange={(open) => !open && setDeleteEmployeeId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Employee Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action will remove the employee from the HR directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteEmployeeId) {
                  await deleteEmployeeMutation.mutateAsync(deleteEmployeeId);
                  setDeleteEmployeeId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
};

export default HR;
