// =============================================
// SALARY & PAYROLL CONTROLLER - Finance Module
// =============================================

import SalaryRecord from '../models/salaryRecord.model.js';
import User from '../models/user.model.js';
import Expense from '../models/expense.model.js';
import { createActivityLog } from '../utils/activity.js';

const computeTotals = (data) => {
  const baseSalary = Math.max(0, Number(data.baseSalary || 0));
  const incentive = Math.max(0, Number(data.incentive || 0));
  const ots = Math.max(0, Number(data.ots || 0));
  const otherAllowances = Math.max(0, Number(data.otherAllowances || 0));
  const deductions = Math.max(0, Number(data.deductions || 0));
  const grossSalary = baseSalary + incentive + ots + otherAllowances;
  const netSalary = Math.max(0, grossSalary - deductions);
  return { baseSalary, incentive, ots, otherAllowances, deductions, grossSalary, netSalary };
};

// Sync paid salary to Finance Expense
const syncExpenseForSalary = async (salaryRecord, user) => {
  try {
    const employee = await User.findById(salaryRecord.employee).select('name department');
    const empName = employee?.name || 'Employee';
    const month = salaryRecord.month;
    const title = `Salary Payout - ${empName} (${month})`;

    if (salaryRecord.status === 'paid') {
      if (salaryRecord.expenseId) {
        // Update existing expense
        await Expense.findByIdAndUpdate(salaryRecord.expenseId, {
          title,
          amount: salaryRecord.netSalary,
          date: salaryRecord.paymentDate || new Date(),
          notes: `Base: ₹${salaryRecord.baseSalary} | Incentive: ₹${salaryRecord.incentive} | OTS: ₹${salaryRecord.ots} | Others: ₹${salaryRecord.otherAllowances} | Ded: ₹${salaryRecord.deductions}`,
          status: 'approved',
        });
      } else {
        // Create new expense
        const expense = await Expense.create({
          title,
          amount: salaryRecord.netSalary,
          category: 'salary',
          transactionType: 'Expense',
          date: salaryRecord.paymentDate || new Date(),
          status: 'approved',
          submittedBy: user?._id,
          approvedBy: user?._id,
          notes: `Base: ₹${salaryRecord.baseSalary} | Incentive: ₹${salaryRecord.incentive} | OTS: ₹${salaryRecord.ots} | Others: ₹${salaryRecord.otherAllowances} | Ded: ₹${salaryRecord.deductions}`,
        });
        salaryRecord.expenseId = expense._id;
        await salaryRecord.save();
      }
    } else if (salaryRecord.expenseId && salaryRecord.status !== 'paid') {
      // If status changed from paid to something else, remove the expense
      await Expense.findByIdAndDelete(salaryRecord.expenseId);
      salaryRecord.expenseId = null;
      await salaryRecord.save();
    }
  } catch (err) {
    console.error('Error syncing salary expense:', err);
  }
};

/**
 * Get all salary records with filters
 */
export const getSalaries = async (req, res) => {
  try {
    const { month, year, status, department, search, employeeId, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (month && month !== 'all') filter.month = month;
    if (year && year !== 'all') filter.year = Number(year);
    if (status && status !== 'all') filter.status = status;
    if (employeeId) filter.employee = employeeId;

    let query = SalaryRecord.find(filter)
      .populate('employee', 'name email avatar department position salary phone isActive')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 });

    const records = await query.exec();

    // Client-side / Populated filtering for search and department
    const filtered = records.filter((rec) => {
      if (!rec.employee) return false;
      if (department && department !== 'all') {
        const empDept = (rec.employee.department || '').toLowerCase();
        if (empDept !== department.toLowerCase()) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const empName = (rec.employee.name || '').toLowerCase();
        const empEmail = (rec.employee.email || '').toLowerCase();
        const empPos = (rec.employee.position || '').toLowerCase();
        const ref = (rec.transactionReference || '').toLowerCase();
        const notes = (rec.notes || '').toLowerCase();
        const matches =
          empName.includes(q) ||
          empEmail.includes(q) ||
          empPos.includes(q) ||
          ref.includes(q) ||
          notes.includes(q);
        if (!matches) return false;
      }
      return true;
    });

    res.json({
      success: true,
      count: filtered.length,
      salaries: filtered,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get aggregated salary / payroll summary
 */
export const getSalarySummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};
    if (month && month !== 'all') filter.month = month;
    if (year && year !== 'all') filter.year = Number(year);

    const records = await SalaryRecord.find(filter);

    let totalPayroll = 0;
    let totalBaseSalary = 0;
    let totalIncentive = 0;
    let totalOts = 0;
    let totalOtherAllowances = 0;
    let totalDeductions = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;

    records.forEach((rec) => {
      const net = Number(rec.netSalary || 0);
      totalPayroll += net;
      totalBaseSalary += Number(rec.baseSalary || 0);
      totalIncentive += Number(rec.incentive || 0);
      totalOts += Number(rec.ots || 0);
      totalOtherAllowances += Number(rec.otherAllowances || 0);
      totalDeductions += Number(rec.deductions || 0);

      if (rec.status === 'paid') {
        totalPaid += net;
        paidCount++;
      } else {
        totalPending += net;
        pendingCount++;
      }
    });

    res.json({
      success: true,
      summary: {
        totalPayroll,
        totalBaseSalary,
        totalIncentive,
        totalOts,
        totalOtherAllowances,
        totalDeductions,
        totalPaid,
        totalPending,
        paidCount,
        pendingCount,
        totalEmployees: records.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single salary record by ID
 */
export const getSalaryById = async (req, res) => {
  try {
    const salary = await SalaryRecord.findById(req.params.id)
      .populate('employee', 'name email avatar department position salary phone')
      .populate('processedBy', 'name email');

    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    res.json({ success: true, salary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new salary record
 */
export const createSalary = async (req, res) => {
  try {
    const {
      employee,
      month,
      year,
      payPeriod,
      baseSalary,
      incentive,
      incentiveReason,
      ots,
      otsHours,
      otsReason,
      otherAllowances,
      otherAllowancesReason,
      deductions,
      deductionReason,
      status = 'pending',
      paymentDate,
      paymentMethod,
      transactionReference,
      notes,
    } = req.body;

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee is required' });
    }

    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }

    const totals = computeTotals(req.body);

    const salary = new SalaryRecord({
      employee,
      month,
      year: year ? Number(year) : new Date().getFullYear(),
      payPeriod: payPeriod || `${month} ${year || new Date().getFullYear()}`,
      ...totals,
      incentiveReason: incentiveReason || '',
      otsHours: Number(otsHours || 0),
      otsReason: otsReason || '',
      otherAllowancesReason: otherAllowancesReason || '',
      deductionReason: deductionReason || '',
      status,
      paymentDate: paymentDate || (status === 'paid' ? new Date() : undefined),
      paymentMethod: paymentMethod || 'Bank Transfer',
      transactionReference: transactionReference || '',
      notes: notes || '',
      processedBy: req.user?._id,
    });

    await salary.save();
    await salary.populate('employee', 'name email avatar department position');

    if (status === 'paid') {
      await syncExpenseForSalary(salary, req.user);
    }

    await createActivityLog({
      actor: req.user,
      action: 'salary.created',
      entityType: 'salary',
      entityId: salary._id,
      title: 'Salary Entry Created',
      description: `Salary record created for ${salary.employee?.name || 'employee'} for ${month} (Net: ₹${salary.netSalary})`,
    });

    res.status(201).json({ success: true, salary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update an existing salary record
 */
export const updateSalary = async (req, res) => {
  try {
    const salary = await SalaryRecord.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    const {
      employee,
      month,
      year,
      payPeriod,
      baseSalary,
      incentive,
      incentiveReason,
      ots,
      otsHours,
      otsReason,
      otherAllowances,
      otherAllowancesReason,
      deductions,
      deductionReason,
      status,
      paymentDate,
      paymentMethod,
      transactionReference,
      notes,
    } = req.body;

    if (employee !== undefined) salary.employee = employee;
    if (month !== undefined) salary.month = month;
    if (year !== undefined) salary.year = Number(year);
    if (payPeriod !== undefined) salary.payPeriod = payPeriod;
    if (baseSalary !== undefined) salary.baseSalary = Number(baseSalary);
    if (incentive !== undefined) salary.incentive = Number(incentive);
    if (incentiveReason !== undefined) salary.incentiveReason = incentiveReason;
    if (ots !== undefined) salary.ots = Number(ots);
    if (otsHours !== undefined) salary.otsHours = Number(otsHours);
    if (otsReason !== undefined) salary.otsReason = otsReason;
    if (otherAllowances !== undefined) salary.otherAllowances = Number(otherAllowances);
    if (otherAllowancesReason !== undefined) salary.otherAllowancesReason = otherAllowancesReason;
    if (deductions !== undefined) salary.deductions = Number(deductions);
    if (deductionReason !== undefined) salary.deductionReason = deductionReason;
    if (status !== undefined) salary.status = status;
    if (paymentDate !== undefined) salary.paymentDate = paymentDate;
    if (paymentMethod !== undefined) salary.paymentMethod = paymentMethod;
    if (transactionReference !== undefined) salary.transactionReference = transactionReference;
    if (notes !== undefined) salary.notes = notes;

    salary.processedBy = req.user?._id;

    // Recalculate totals
    const totals = computeTotals(salary);
    salary.grossSalary = totals.grossSalary;
    salary.netSalary = totals.netSalary;

    await salary.save();
    await salary.populate('employee', 'name email avatar department position');

    await syncExpenseForSalary(salary, req.user);

    await createActivityLog({
      actor: req.user,
      action: 'salary.updated',
      entityType: 'salary',
      entityId: salary._id,
      title: 'Salary Entry Updated',
      description: `Salary record updated for ${salary.employee?.name || 'employee'} (${salary.month})`,
    });

    res.json({ success: true, salary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Quick status update (e.g. mark as Paid)
 */
export const updateSalaryStatus = async (req, res) => {
  try {
    const { status, paymentMethod, transactionReference, paymentDate } = req.body;
    const salary = await SalaryRecord.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    salary.status = status || salary.status;
    if (paymentMethod) salary.paymentMethod = paymentMethod;
    if (transactionReference) salary.transactionReference = transactionReference;
    if (status === 'paid' && !salary.paymentDate) {
      salary.paymentDate = paymentDate || new Date();
    }

    salary.processedBy = req.user?._id;
    await salary.save();
    await salary.populate('employee', 'name email avatar department position');

    await syncExpenseForSalary(salary, req.user);

    res.json({ success: true, salary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete a salary record
 */
export const deleteSalary = async (req, res) => {
  try {
    const salary = await SalaryRecord.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    // Clean up linked expense if any
    if (salary.expenseId) {
      await Expense.findByIdAndDelete(salary.expenseId);
    }

    await SalaryRecord.findByIdAndDelete(req.params.id);

    await createActivityLog({
      actor: req.user,
      action: 'salary.deleted',
      entityType: 'salary',
      entityId: salary._id,
      title: 'Salary Entry Deleted',
      description: `Salary record deleted for ${salary.month}`,
    });

    res.json({ success: true, message: 'Salary record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate monthly payroll for all active employees
 */
export const generateMonthlyPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }

    const currentYear = year ? Number(year) : new Date().getFullYear();

    // Find all active employees/team members
    const eligibleRoles = ['employee', 'manager', 'editor', 'designer', 'adsManager', 'intern', 'financeManager'];
    const activeEmployees = await User.find({
      role: { $in: eligibleRoles },
      $or: [{ employmentStatus: 'active' }, { isActive: true }],
    }).select('name email salary department position');

    // Find existing records for this month & year
    const existingRecords = await SalaryRecord.find({
      month,
      year: currentYear,
    }).select('employee');

    const existingEmpIds = new Set(existingRecords.map((r) => r.employee.toString()));

    const createdRecords = [];
    for (const emp of activeEmployees) {
      if (!existingEmpIds.has(emp._id.toString())) {
        const base = Number(emp.salary || 0);
        const newRecord = new SalaryRecord({
          employee: emp._id,
          month,
          year: currentYear,
          payPeriod: `${month} ${currentYear}`,
          baseSalary: base,
          incentive: 0,
          ots: 0,
          otherAllowances: 0,
          deductions: 0,
          grossSalary: base,
          netSalary: base,
          status: 'pending',
          paymentMethod: 'Bank Transfer',
          processedBy: req.user?._id,
        });
        await newRecord.save();
        createdRecords.push(newRecord);
      }
    }

    res.json({
      success: true,
      message: `Generated ${createdRecords.length} salary entries for ${month} ${currentYear}`,
      count: createdRecords.length,
      salaries: createdRecords,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
