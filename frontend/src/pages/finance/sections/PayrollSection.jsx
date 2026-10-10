import { useState, useMemo } from 'react';
import {
  Banknote,
  Plus,
  CheckCircle2,
  Clock,
  Check,
  AlertCircle,
  Download,
  Users,
  Calendar,
  Search,
  Filter,
  Edit2,
  Trash2,
  UserCheck,
  Building,
  HelpCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  usePayrollRecords,
  usePayrollEmployees,
  useCreatePayrollRecord,
  useUpdatePayrollRecord,
  useDeletePayrollRecord,
  useApprovePayrollRecord,
  usePayPayrollRecord,
  useFinanceAccounts,
} from '../../../hooks/useFinance';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';
import { toast } from 'sonner';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollSection() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentDate.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  // Search and status filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Queries
  const { data: records = [], isLoading } = usePayrollRecords({
    month: selectedMonth,
    year: Number(selectedYear),
  });
  const { data: employees = [] } = usePayrollEmployees();
  const { data: accounts = [] } = useFinanceAccounts();

  // Mutations
  const createPayroll = useCreatePayrollRecord();
  const updatePayroll = useUpdatePayrollRecord();
  const deletePayroll = useDeletePayrollRecord();
  const approvePayroll = useApprovePayrollRecord();
  const payPayroll = usePayPayrollRecord();

  // Modals state
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [payModalRecord, setPayModalRecord] = useState(null);
  const [fundingAccount, setFundingAccount] = useState('');

  // Form State for Manual Entry
  const [form, setForm] = useState({
    employee: '',
    baseSalary: '',
    additions: 0,
    additionReason: '',
    deductions: 0,
    deductionReason: '',
    netSalary: '',
    status: 'pending',
    paymentAccount: '',
    notes: '',
  });

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setForm({
      employee: '',
      month: selectedMonth,
      year: selectedYear,
      baseSalary: '',
      additions: '',
      additionReason: '',
      deductions: '',
      deductionReason: '',
      netSalary: '',
      status: 'pending',
      paymentAccount: accounts[0]?._id || '',
      notes: '',
    });
    setEntryModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setForm({
      employee: rec.employee?._id || rec.employee || '',
      baseSalary: rec.baseSalary != null ? String(rec.baseSalary) : '',
      additions: rec.ots || rec.additions || '',
      additionReason: rec.additionReason || '',
      deductions: rec.deductions || '',
      deductionReason: rec.deductionReason || '',
      netSalary: rec.netSalary != null ? String(rec.netSalary) : '',
      status: rec.status || 'pending',
      paymentAccount: rec.paymentAccount?._id || rec.paymentAccount || (accounts[0]?._id || ''),
      notes: rec.notes || '',
    });
    setEntryModalOpen(true);
  };

  // When employee dropdown changes in modal, auto-populate base salary from employee profile
  const handleEmployeeSelect = (empId) => {
    const selected = employees.find((e) => e._id === empId);
    const salary = selected?.salary ? Number(selected.salary) : null;
    const additions = Number(form.additions || 0);
    const deductions = Number(form.deductions || 0);
    const computedNet = salary != null ? Math.max(0, salary + additions - deductions) : null;

    setForm((prev) => ({
      ...prev,
      employee: empId,
      baseSalary: salary != null ? String(salary) : '',
      netSalary: computedNet != null ? String(computedNet) : '',
    }));
  };

  // Handle salary inputs auto-calc
  const handleBaseSalaryChange = (val) => {
    const hasBase = val !== '' && !isNaN(Number(val));
    const base = hasBase ? Number(val) : 0;
    const additions = Number(form.additions || 0);
    const deductions = Number(form.deductions || 0);
    const computedNet = hasBase ? Math.max(0, base + additions - deductions) : '';
    setForm((prev) => ({
      ...prev,
      baseSalary: val,
      netSalary: computedNet !== '' ? String(computedNet) : '',
    }));
  };

  const handleAdditionsChange = (val) => {
    const hasBase = form.baseSalary !== '' && !isNaN(Number(form.baseSalary));
    const base = hasBase ? Number(form.baseSalary) : 0;
    const additions = Number(val || 0);
    const deductions = Number(form.deductions || 0);
    const computedNet = hasBase ? Math.max(0, base + additions - deductions) : '';
    setForm((prev) => ({
      ...prev,
      additions: val,
      netSalary: computedNet !== '' ? String(computedNet) : '',
    }));
  };

  const handleDeductionsChange = (val) => {
    const hasBase = form.baseSalary !== '' && !isNaN(Number(form.baseSalary));
    const base = hasBase ? Number(form.baseSalary) : 0;
    const additions = Number(form.additions || 0);
    const deductions = Number(val || 0);
    const computedNet = hasBase ? Math.max(0, base + additions - deductions) : '';
    setForm((prev) => ({
      ...prev,
      deductions: val,
      netSalary: computedNet !== '' ? String(computedNet) : '',
    }));
  };

  // Submit Manual Form
  const handleSubmitEntry = async (e) => {
    e.preventDefault();
    if (!form.employee) {
      return toast.error('Please select an employee');
    }
    if (!form.baseSalary || Number(form.baseSalary) < 0) {
      return toast.error('Please enter a valid base salary');
    }

    try {
      const payload = {
        employee: form.employee,
        month: selectedMonth,
        year: Number(selectedYear),
        baseSalary: Number(form.baseSalary),
        additions: Number(form.additions || 0),
        ots: Number(form.additions || 0),
        additionReason: form.additionReason,
        deductions: Number(form.deductions || 0),
        deductionReason: form.deductionReason,
        netSalary: Number(form.netSalary),
        status: form.status,
        paymentAccount: form.status === 'paid' ? form.paymentAccount : undefined,
        notes: form.notes,
      };

      if (editingRecord) {
        await updatePayroll.mutateAsync({
          id: editingRecord._id,
          data: payload,
        });
      } else {
        await createPayroll.mutateAsync(payload);
      }
      setEntryModalOpen(false);
    } catch (err) {}
  };

  // Delete Record
  const handleDeleteRecord = async (rec) => {
    if (window.confirm(`Are you sure you want to remove the payroll entry for ${rec.employee?.name || 'this employee'}?`)) {
      try {
        await deletePayroll.mutateAsync(rec._id);
      } catch (err) {}
    }
  };

  // Disburse / Pay Record
  const handleExecutePayment = async (e) => {
    e.preventDefault();
    if (!payModalRecord) return;
    try {
      await payPayroll.mutateAsync({
        id: payModalRecord._id,
        paymentAccount: fundingAccount || (accounts[0] ? accounts[0]._id : undefined),
      });
      setPayModalRecord(null);
    } catch (err) {}
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employee?.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employee?.position?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  // Summaries
  const totalGross = records.reduce((sum, r) => sum + Number(r.baseSalary || 0), 0);
  const totalNet = records.reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + Number(r.paidAmount || (r.status === 'paid' ? r.netSalary : 0) || 0), 0);
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const approvedCount = records.filter((r) => r.status === 'approved').length;
  const paidCount = records.filter((r) => r.status === 'paid').length;

  const handleExport = () => {
    const rows = filteredRecords.map((r) => ({
      employee: r.employee?.name || 'Employee',
      department: r.employee?.department || r.employee?.position || '-',
      month: `${r.month} ${r.year}`,
      baseSalary: r.baseSalary,
      additions: r.ots || r.additions || 0,
      additionReason: r.additionReason || '',
      deductions: r.deductions || 0,
      deductionReason: r.deductionReason || '',
      netSalary: r.netSalary,
      status: r.status,
    }));
    exportToCSV(`payroll_register_${selectedMonth}_${selectedYear}`, rows, [
      { key: 'employee', label: 'Employee Name' },
      { key: 'department', label: 'Department / Role' },
      { key: 'month', label: 'Payroll Period' },
      { key: 'baseSalary', label: 'Base Salary (INR)' },
      { key: 'additions', label: 'Additions / Bonus (INR)' },
      { key: 'additionReason', label: 'Addition Reason' },
      { key: 'deductions', label: 'Deductions (INR)' },
      { key: 'deductionReason', label: 'Deduction Reason' },
      { key: 'netSalary', label: 'Net Payable (INR)' },
      { key: 'status', label: 'Status' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP KPI SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>TOTAL BASE SALARIES</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{formatINR(totalGross)}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Monthly salary commitments for {records.length} staff</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>NET APPROVED PAYROLL</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-600 tracking-tight">{formatINR(totalNet)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Net take-home after additions/deductions</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>DISBURSED SALARIES</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">{formatINR(totalPaid)}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-emerald-700">{paidCount}</span> of {records.length} employees paid
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>PENDING APPROVALS</span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 tracking-tight">{pendingCount} Employees</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting manager authorization</div>
        </div>
      </div>

      {/* ── ACTION & FILTER TOOLBAR ─────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period Selector & Primary Add Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-0 py-1 pl-1 pr-6 font-semibold text-xs text-slate-800 focus:ring-0 cursor-pointer"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent border-0 py-1 pl-1 pr-6 font-semibold text-xs text-slate-800 focus:ring-0 cursor-pointer"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

            {/* PRIMARY BUTTON: Manual Entry by Employee Selection */}
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs hover:shadow transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Enter Employee Payroll</span>
            </button>
          </div>

          {/* Search & Export Buttons */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56"
              />
            </div>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Records', count: records.length },
            { id: 'pending', label: 'Pending Approval', count: pendingCount },
            { id: 'approved', label: 'Approved', count: approvedCount },
            { id: 'paid', label: 'Disbursed / Paid', count: paidCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/80 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── PAYROLL REGISTER TABLE ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Payroll Register: {selectedMonth} {selectedYear}</span>
              <span className="text-xs font-normal text-slate-500">
                ({filteredRecords.length} {filteredRecords.length === 1 ? 'employee' : 'employees'})
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter employee salary, bonuses, and approved deductions manually. Approving books the salary expense; disbursing records bank outflow.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Employee</th>
                <th className="p-3.5">Base Salary</th>
                <th className="p-3.5">Additions / Bonus</th>
                <th className="p-3.5">Deductions</th>
                <th className="p-3.5 font-bold text-slate-700">Net Payable</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    Loading payroll records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-10 w-10 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="font-semibold text-slate-800 text-sm">
                        No payroll entries found for {selectedMonth} {selectedYear}
                      </div>
                      <p className="text-xs text-slate-500">
                        Click "Enter Employee Payroll" above to select an employee and input their salary, allowances, and deductions manually.
                      </p>
                      <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg shadow-xs hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4" /> Add First Entry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const additions = Number(rec.ots || rec.additions || 0);
                  const deductions = Number(rec.deductions || 0);

                  return (
                    <tr key={rec._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee Info */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                            {rec.employee?.name ? rec.employee.name.charAt(0) : 'E'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{rec.employee?.name || 'Employee'}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span>{rec.employee?.department || rec.employee?.position || 'Staff'}</span>
                              {rec.employee?.email && <span className="text-slate-300">·</span>}
                              <span className="text-slate-400">{rec.employee?.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Base Salary */}
                      <td className="p-3.5 font-semibold text-slate-800">
                        {formatINR(rec.baseSalary)}
                      </td>

                      {/* Additions */}
                      <td className="p-3.5">
                        {additions > 0 ? (
                          <div>
                            <span className="font-semibold text-emerald-600">+{formatINR(additions)}</span>
                            {rec.additionReason && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{rec.additionReason}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>

                      {/* Deductions */}
                      <td className="p-3.5">
                        {deductions > 0 ? (
                          <div>
                            <span className="font-semibold text-rose-600">-{formatINR(deductions)}</span>
                            {rec.deductionReason && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{rec.deductionReason}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>

                      {/* Net Payable */}
                      <td className="p-3.5 font-bold text-slate-900 text-sm">
                        {formatINR(rec.netSalary)}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rec.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rec.status === 'approved'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {rec.status === 'paid' && <Check className="h-3 w-3" />}
                          {rec.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rec.status === 'pending' && (
                            <button
                              onClick={() => approvePayroll.mutate(rec._id)}
                              disabled={approvePayroll.isPending}
                              className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors border border-blue-200"
                            >
                              Approve
                            </button>
                          )}

                          {rec.status === 'approved' && (
                            <button
                              onClick={() => {
                                setPayModalRecord(rec);
                                if (accounts[0]) setFundingAccount(accounts[0]._id);
                              }}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors shadow-2xs"
                            >
                              Disburse
                            </button>
                          )}

                          {rec.status === 'paid' && (
                            <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1 mr-1">
                              <Check className="h-3 w-3" /> Paid
                            </span>
                          )}

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit payroll entry"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Button (if not paid) */}
                          {rec.status !== 'paid' && (
                            <button
                              onClick={() => handleDeleteRecord(rec)}
                              title="Delete entry"
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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

      {/* ── MANUAL PAYROLL ENTRY MODAL (CREATE / EDIT) ──────────────────── */}
      <Dialog open={entryModalOpen} onOpenChange={setEntryModalOpen}>
        <DialogContent variant="center" size="lg" className="rounded-2xl border-border bg-card p-6 shadow-2xl max-w-lg">
          <DialogHeader className="border-b border-border pb-3 mb-4 pr-10">
            <DialogTitle className="text-base font-bold text-foreground">
              {editingRecord ? 'Edit Employee Payroll' : 'Manual Employee Payroll Entry'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-0.5">
              Period: <strong className="text-foreground">{selectedMonth} {selectedYear}</strong> · Directly enter base salary, bonus & deductions
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEntry} className="space-y-4 text-xs">
            {/* Employee Selection */}
            <div>
              <label className="block font-semibold text-foreground mb-1.5">Select Employee *</label>
              <select
                value={form.employee}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                disabled={Boolean(editingRecord)}
                required
                className="w-full h-9.5 rounded-xl border border-border px-3 text-xs font-medium text-foreground bg-background focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.department || emp.role || 'Staff'}) {emp.salary ? `— Base: ₹${emp.salary}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Base Salary & Approval Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-foreground mb-1.5">Base Monthly Salary (₹) *</label>
                <input
                  type="number"
                  value={form.baseSalary}
                  onChange={(e) => handleBaseSalaryChange(e.target.value)}
                  placeholder="e.g. 30000"
                  required
                  min="0"
                  className="w-full h-9.5 rounded-xl border border-border px-3 text-xs font-bold text-foreground bg-background focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-foreground mb-1.5">Approval Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-9.5 rounded-xl border border-border px-3 text-xs font-semibold text-foreground bg-background shadow-2xs"
                >
                  <option value="pending">Pending Approval (Draft)</option>
                  <option value="approved">Approved (Expense Recognized)</option>
                  <option value="paid">Paid / Disbursed</option>
                </select>
              </div>
            </div>

            {/* Additions / Incentives */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800 space-y-2">
              <div className="font-semibold text-emerald-900 dark:text-emerald-300 text-xs flex items-center justify-between">
                <span>Additions / Incentives / OTS (+)</span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">₹{Number(form.additions || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  value={form.additions}
                  onChange={(e) => handleAdditionsChange(e.target.value)}
                  placeholder="Addition Amount (₹)"
                  min="0"
                  className="h-9 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-background px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                />
                <input
                  type="text"
                  value={form.additionReason}
                  onChange={(e) => setForm({ ...form, additionReason: e.target.value })}
                  placeholder="Reason (e.g. Performance / OTS)"
                  className="h-9 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-background px-3 text-xs text-foreground"
                />
              </div>
            </div>

            {/* Deductions */}
            <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-800 space-y-2">
              <div className="font-semibold text-rose-900 dark:text-rose-300 text-xs flex items-center justify-between">
                <span>Deductions / TDS / Advances (-)</span>
                <span className="text-[11px] text-rose-700 dark:text-rose-400 font-mono font-bold">₹{Number(form.deductions || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  value={form.deductions}
                  onChange={(e) => handleDeductionsChange(e.target.value)}
                  placeholder="Deduction Amount (₹)"
                  min="0"
                  className="h-9 rounded-xl border border-rose-200 dark:border-rose-800 bg-background px-3 text-xs font-semibold text-rose-700 dark:text-rose-400"
                />
                <input
                  type="text"
                  value={form.deductionReason}
                  onChange={(e) => setForm({ ...form, deductionReason: e.target.value })}
                  placeholder="Reason (e.g. Leave / TDS / Advance)"
                  className="h-9 rounded-xl border border-rose-200 dark:border-rose-800 bg-background px-3 text-xs text-foreground"
                />
              </div>
            </div>

            {/* Net Take-Home Salary Display */}
            <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
              <div>
                <span className="text-indigo-950 dark:text-indigo-200 font-bold block text-xs">Calculated Net Payable:</span>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-400">Base (₹{form.baseSalary || 0}) + Add (₹{form.additions || 0}) − Ded (₹{form.deductions || 0})</span>
              </div>
              <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 tracking-tight">
                {formatINR(Number(form.netSalary || 0))}
              </div>
            </div>

            {/* If marked paid, choose account */}
            {form.status === 'paid' && (
              <div>
                <label className="block font-semibold text-foreground mb-1.5">Funding Bank / Cash Account *</label>
                <select
                  value={form.paymentAccount}
                  onChange={(e) => setForm({ ...form, paymentAccount: e.target.value })}
                  required
                  className="w-full h-9.5 rounded-xl border border-border px-3 text-xs text-foreground bg-background shadow-2xs"
                >
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.accountName} (Balance: ₹{a.currentBalance})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block font-medium text-foreground mb-1.5">Internal Notes (Optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Verified by Accounts"
                className="w-full h-9.5 rounded-xl border border-border px-3 text-xs text-foreground bg-background shadow-2xs"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEntryModalOpen(false)}
                className="h-9.5 px-4.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createPayroll.isPending || updatePayroll.isPending}
                className="h-9.5 px-5.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {createPayroll.isPending || updatePayroll.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{editingRecord ? 'Update Entry' : 'Save Payroll Entry'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DISBURSE SALARY MODAL ────────────────────────────────────────── */}
      <Dialog open={Boolean(payModalRecord)} onOpenChange={(open) => !open && setPayModalRecord(null)}>
        <DialogContent variant="center" size="sm" className="rounded-2xl border-border bg-card p-6 shadow-2xl max-w-md">
          <DialogHeader className="border-b border-border pb-3 mb-4 pr-10">
            <DialogTitle className="text-base font-bold text-foreground">
              Disburse Salary to {payModalRecord?.employee?.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-0.5">
              Net Amount: <strong className="text-foreground text-sm">{formatINR(payModalRecord?.netSalary || 0)}</strong> for {payModalRecord?.month} {payModalRecord?.year}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecutePayment} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">Disbursement Bank / Cash Account *</label>
              <select
                value={fundingAccount}
                onChange={(e) => setFundingAccount(e.target.value)}
                className="w-full h-9.5 rounded-xl border border-border px-3 text-xs font-medium text-foreground bg-background shadow-2xs"
              >
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.accountName} (₹{a.currentBalance?.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px] border border-emerald-100 dark:border-emerald-800">
              💡 <strong>Double-Entry Rule:</strong> Marking disbursed creates a cash outflow from the chosen bank account and clears the payable without duplicating the recognized salary expense.
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setPayModalRecord(null)}
                className="h-9.5 px-4.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={payPayroll.isPending}
                className="h-9.5 px-5.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {payPayroll.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Disbursing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Confirm Outflow & Disburse</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
