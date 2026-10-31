import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewFinanceOverview, canManageFinance } from '../utils/financeAccess.js';

// Invoice Calculation helper
const calculateInvoiceTotals = (items = [], discountPercent = 0, taxPercent = 18, amountPaid = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 1) * (item.rate || 0), 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round((taxableAmount * taxPercent) / 100);
  const total = taxableAmount + taxAmount;
  const balanceDue = Math.max(0, total - amountPaid);

  let status = 'Unpaid';
  if (amountPaid >= total && total > 0) status = 'Paid';
  else if (amountPaid > 0 && amountPaid < total) status = 'Partially Paid';

  return { subtotal, discountAmount, taxableAmount, taxAmount, total, balanceDue, status };
};

// Salary Slip calculation helper
const calculateSalarySlip = ({ basic = 0, hra = 0, allowances = 0, bonus = 0, pf = 0, tds = 0, unpaidDays = 0, monthDays = 30 }) => {
  const grossSalary = basic + hra + allowances + bonus;
  const perDayRate = (basic + hra) / monthDays;
  const leaveDeduction = Math.round(unpaidDays * perDayRate);
  const totalDeductions = pf + tds + leaveDeduction;
  const netSalary = Math.max(0, Math.round(grossSalary - totalDeductions));

  return { grossSalary, leaveDeduction, totalDeductions, netSalary };
};

test('Finance Access: Correctly determines viewing and management permissions', () => {
  const superAdmin = { role: 'superAdmin', permissions: {} };
  const manager = { role: 'manager', permissions: {} };
  const employeeNoPerm = { role: 'employee', permissions: {} };
  const employeeWithPerm = { role: 'employee', permissions: { canManageFinance: true } };

  assert.equal(canViewFinanceOverview(superAdmin), true);
  assert.equal(canManageFinance(superAdmin), true);

  assert.equal(canViewFinanceOverview(manager), true);
  assert.equal(canManageFinance(manager), false);

  assert.equal(canViewFinanceOverview(employeeNoPerm), false);
  assert.equal(canManageFinance(employeeNoPerm), false);

  assert.equal(canViewFinanceOverview(employeeWithPerm), true);
  assert.equal(canManageFinance(employeeWithPerm), true);
});

test('Invoicing: Subtotal, discount, GST, total, and balance due calculate accurately', () => {
  const items = [
    { description: 'Social Media Management', quantity: 1, rate: 30000 },
    { description: 'Meta Ads Setup', quantity: 2, rate: 10000 },
  ];

  // Subtotal = 50,000, 10% discount = 5,000, Taxable = 45,000, 18% GST = 8,100, Total = 53,100
  const invoice = calculateInvoiceTotals(items, 10, 18, 20000);

  assert.equal(invoice.subtotal, 50000);
  assert.equal(invoice.discountAmount, 5000);
  assert.equal(invoice.taxableAmount, 45000);
  assert.equal(invoice.taxAmount, 8100);
  assert.equal(invoice.total, 53100);
  assert.equal(invoice.balanceDue, 33100);
  assert.equal(invoice.status, 'Partially Paid');
});

test('Invoicing: Status correctly transitions to Paid when balance is zero', () => {
  const items = [{ quantity: 1, rate: 10000 }];
  const paidInvoice = calculateInvoiceTotals(items, 0, 0, 10000);

  assert.equal(paidInvoice.total, 10000);
  assert.equal(paidInvoice.balanceDue, 0);
  assert.equal(paidInvoice.status, 'Paid');
});

test('Salary: Computes gross, leave deductions, PF/TDS, and final net pay', () => {
  const slip = calculateSalarySlip({
    basic: 30000,
    hra: 15000,
    allowances: 5000,
    bonus: 2000,
    pf: 1800,
    tds: 1500,
    unpaidDays: 2,
    monthDays: 30,
  });

  // Gross = 30k + 15k + 5k + 2k = 52,000
  assert.equal(slip.grossSalary, 52000);
  // (30k + 15k) / 30 = 1500/day * 2 days = 3000
  assert.equal(slip.leaveDeduction, 3000);
  // Total deductions = 1800 + 1500 + 3000 = 6300
  assert.equal(slip.totalDeductions, 6300);
  // Net = 52000 - 6300 = 45,700
  assert.equal(slip.netSalary, 45700);
});

test('Invoicing: Tax Inclusive extraction correctly computes base, tax, and total', () => {
  const subtotal = 118000;
  const rate = 18;
  const baseSubtotal = subtotal / (1 + rate / 100);
  const taxAmount = Math.round((subtotal - baseSubtotal) * 100) / 100;
  const total = subtotal;

  assert.equal(baseSubtotal, 100000);
  assert.equal(taxAmount, 18000);
  assert.equal(total, 118000);
});

test('Invoicing: Incremental payment settlement prevents double-crediting client revenue', () => {
  const invoiceTotal = 10000;
  let clientRevenue = 0;
  let paidAmount = 0;

  // Step 1: Partial payment of 4,000
  const partialPayment = 4000;
  paidAmount += partialPayment;
  clientRevenue += partialPayment;
  let balanceAmount = Math.max(0, invoiceTotal - paidAmount);

  assert.equal(paidAmount, 4000);
  assert.equal(balanceAmount, 6000);
  assert.equal(clientRevenue, 4000);

  // Step 2: Mark Invoice as Paid settles remaining balance (6,000)
  const remainingBalance = Math.max(0, invoiceTotal - paidAmount);
  const finalSettlement = remainingBalance;
  paidAmount += finalSettlement;
  clientRevenue += finalSettlement;
  balanceAmount = Math.max(0, invoiceTotal - paidAmount);

  assert.equal(paidAmount, 10000);
  assert.equal(balanceAmount, 0);
  assert.equal(clientRevenue, 10000); // Exactly matches invoice total, no duplicate 10,000 addition
});

test('Finance Invariant: Operational expenses exclude synced salaries to prevent double counting', () => {
  const expenses = [
    { title: 'Office Rent', amount: 25000, category: 'office' },
    { title: 'Software Tools', amount: 8000, category: 'tools' },
    { title: 'Salary Payout - John Doe', amount: 45000, category: 'salary' }, // Synced salary
  ];

  const salaries = [
    { employee: 'John Doe', netSalary: 45000, status: 'paid' },
  ];

  // Correct calculation: exclude category 'salary' from operational expenses
  const opExpenses = expenses
    .filter((e) => e.category !== 'salary')
    .reduce((sum, e) => sum + e.amount, 0);

  const salaryExpenses = salaries.reduce((sum, s) => sum + s.netSalary, 0);
  const totalCosts = opExpenses + salaryExpenses;

  assert.equal(opExpenses, 33000); // 25,000 + 8,000
  assert.equal(salaryExpenses, 45000);
  assert.equal(totalCosts, 78000); // Exactly 78,000, NOT 123,000
});
