import { useState } from 'react';
import { Building2, Clock3, Plus, ShieldCheck, Users } from 'lucide-react';
import { useDeleteEmployee, useEmployees } from '../../hooks/useHR';
import { AddEmployeeModal } from '../../components/modals/AddEmployeeModal';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { MetricCard, MetricGrid, PageHeader, PageToolbar, SearchField, StatusBadge } from '../../components/ui/page';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const employeeStatusTone = {
  Active: 'success',
  Inactive: 'danger',
};

const formatTime = (value) => (
  value
    ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--'
);

const HR = () => {
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: employees = [], isLoading } = useEmployees({ search: searchTerm });
  const deleteEmployeeMutation = useDeleteEmployee();

  const isEmpClockedIn = (employee) => {
    const att = employee.todayAttendance;
    if (!att) return false;
    if (att.isClockedIn !== undefined) return att.isClockedIn;
    if (att.sessions && att.sessions.length > 0) return att.sessions.some((s) => !s.clockOut);
    return Boolean(att.clockIn && !att.clockOut);
  };

  const activeEmployees = employees.filter((employee) => employee.status === 'Active').length;
  const activeDepartments = new Set(employees.map((employee) => employee.department).filter(Boolean)).size;
  const clockedInNow = employees.filter(isEmpClockedIn).length;
  const loggedHoursToday = employees.reduce(
    (sum, employee) => sum + Number(employee.todayAttendance?.totalHours || 0),
    0,
  );

  const columns = [
    {
      key: 'name',
      label: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
            {row.name?.charAt(0) || 'E'}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground">{row.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (row) => row.department || 'Not assigned',
    },
    {
      key: 'position',
      label: 'Position',
      render: (row) => row.position || 'Not assigned',
    },
    {
      key: 'todayAttendance',
      label: "Today's Attendance",
      render: (row) => {
        const attendance = row.todayAttendance;

        if (attendance?.status === 'leave') {
          return (
            <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600" title={attendance.notes}>
              On Leave: {attendance.notes || 'Informed Leave'}
            </span>
          );
        }

        if (attendance?.status === 'holiday') {
          return (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600" title={attendance.notes}>
              Holiday: {attendance.notes || 'Company Holiday'}
            </span>
          );
        }

        if (!attendance?.clockIn) {
          return <span className="text-xs text-muted-foreground">No clock-in yet</span>;
        }

        const active = isEmpClockedIn(row);

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600">
                {formatTime(attendance.clockIn)}
              </span>
              <span className="text-muted-foreground">to</span>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-600">
                {formatTime(attendance.clockOut)}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {active ? 'Currently clocked in' : 'Clocked Out / On Break'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'hours',
      label: 'Hours',
      render: (row) => (
        <span className="font-semibold text-foreground">
          {Number(row.todayAttendance?.totalHours || 0).toFixed(2)} hrs
        </span>
      ),
    },
    {
      key: 'joinDate',
      label: 'Join Date',
      render: (row) => row.joinDate ? new Date(row.joinDate).toLocaleDateString() : 'Not set',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge tone={employeeStatusTone[row.status] || 'neutral'}>
          {row.status || 'Unknown'}
        </StatusBadge>
      ),
    },
  ];

  const handleDeleteEmployee = async () => {
    if (!deleteEmployeeId) return;
    await deleteEmployeeMutation.mutateAsync(deleteEmployeeId);
    setDeleteEmployeeId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Operations"
        description="Keep employee records, attendance signals, and team structure organized in a cleaner people-operations workspace."
        actions={(
          <Button
            onClick={() => {
              setSelectedEmployee(null);
              setShowAddEmployeeModal(true);
            }}
          >
            <Plus size={16} className="mr-2" />
            Add Employee
          </Button>
        )}
      >
        <MetricGrid>
          <MetricCard label="Headcount" value={employees.length} helper="Employees in the current view" icon={Users} tone="info" />
          <MetricCard label="Active Staff" value={activeEmployees} helper="Currently marked active" icon={ShieldCheck} tone="success" />
          <MetricCard label="Departments" value={activeDepartments} helper="Distinct teams represented" icon={Building2} tone="primary" />
          <MetricCard label="Clocked In" value={clockedInNow} helper={`${loggedHoursToday.toFixed(1)} total hours logged today`} icon={Clock3} tone="warning" />
        </MetricGrid>
      </PageHeader>

      <PageToolbar>
        <SearchField
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search employees, departments, roles, or email addresses..."
        />
        <div className="app-pill">{employees.length} employees</div>
      </PageToolbar>

      <DataTable
        data={employees}
        columns={columns}
        loading={isLoading}
        onRowClick={(employee) => {
          setSelectedEmployee(employee);
          setShowAddEmployeeModal(true);
        }}
        onEdit={(employee) => {
          setSelectedEmployee(employee);
          setShowAddEmployeeModal(true);
        }}
        onDelete={(id) => setDeleteEmployeeId(id)}
        emptyTitle="No employees found"
        emptyDescription="Add a team member to start tracking roles, attendance, and staffing coverage."
      />

      <AddEmployeeModal
        open={showAddEmployeeModal}
        onOpenChange={setShowAddEmployeeModal}
        employee={selectedEmployee}
      />

      <AlertDialog open={!!deleteEmployeeId} onOpenChange={(open) => !open && setDeleteEmployeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HR;
