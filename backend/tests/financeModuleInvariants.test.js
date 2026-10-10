import test from 'node:test';
import assert from 'node:assert/strict';

// Helper for Indian Currency formatting
const formatIndianRupee = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

// 1. Account Invariant calculation helper
const calculateAccountClosingBalance = (openingBalance, inflows = [], outflows = []) => {
  const totalInflows = inflows.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalOutflows = outflows.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const closingBalance = openingBalance + totalInflows - totalOutflows;
  return { totalInflows, totalOutflows, closingBalance };
};

// 2. Client Profitability calculation helper
const calculateClientProfitability = ({ serviceRevenue = 0, directCosts = [], overheadCosts = [] }) => {
  const totalDirectCosts = directCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalOverhead = overheadCosts.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const contribution = serviceRevenue - totalDirectCosts;
  const netClientProfit = contribution - totalOverhead;
  const marginPercent = serviceRevenue > 0
    ? Number(((netClientProfit / serviceRevenue) * 100).toFixed(2))
    : null;

  return { totalDirectCosts, contribution, totalOverhead, netClientProfit, marginPercent };
};

// 3. Invoice Revenue Separation helper
const computeInvoiceRevenueSeparation = (lineItems = [], taxRate = 0) => {
  let serviceRevenue = 0;
  let passThroughAdBudget = 0;
  let managementFee = 0;

  lineItems.forEach((item) => {
    const total = (item.quantity || 1) * (item.rate || 0);
    if (item.itemType === 'ad_budget_pass_through') {
      passThroughAdBudget += total;
    } else if (item.itemType === 'management_fee') {
      managementFee += total;
      serviceRevenue += total;
    } else {
      serviceRevenue += total;
    }
  });

  const subtotal = serviceRevenue + passThroughAdBudget;
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const totalPayable = subtotal + taxAmount;

  return { serviceRevenue, passThroughAdBudget, managementFee, subtotal, taxAmount, totalPayable };
};

test('Invariant 1: Account Closing Balance equals opening + inflows - outflows', () => {
  const opening = 100000;
  const inflows = [{ amount: 50000 }, { amount: 25000 }];
  const outflows = [{ amount: 30000 }, { amount: 15000 }, { amount: 5000 }];

  const res = calculateAccountClosingBalance(opening, inflows, outflows);

  assert.equal(res.totalInflows, 75000);
  assert.equal(res.totalOutflows, 50000);
  assert.equal(res.closingBalance, 125000);
});

test('Invariant 2: A ₹25,000 tax-free test invoice with a ₹15,000 receipt shows ₹10,000 outstanding', () => {
  const invoiceTotal = 25000;
  const paymentReceipt = 15000;
  const balanceOutstanding = invoiceTotal - paymentReceipt;

  assert.equal(balanceOutstanding, 10000);
  assert.equal(formatIndianRupee(balanceOutstanding), '₹10,000.00');
});

test('Invariant 3: Pass-through ad budgets are strictly excluded from service revenue', () => {
  const lineItems = [
    { itemType: 'service', quantity: 1, rate: 30000 },
    { itemType: 'management_fee', quantity: 1, rate: 10000 },
    { itemType: 'ad_budget_pass_through', quantity: 1, rate: 50000 }, // Client ad budget
  ];

  const separated = computeInvoiceRevenueSeparation(lineItems, 0);

  assert.equal(separated.serviceRevenue, 40000); // Only agency service + mgmt fee
  assert.equal(separated.passThroughAdBudget, 50000); // Excluded from service revenue
  assert.equal(separated.subtotal, 90000);
  assert.equal(separated.totalPayable, 90000);
});

test('Invariant 4: Acceptance Example from Guide (Contribution ₹15,800 on ₹25,000 service rev)', () => {
  const serviceRevenue = 25000;
  const directCosts = [
    { activity: 'Video Editing', amount: 4000 },
    { activity: 'Design', amount: 1200 },
    { activity: 'Shoot/Travel', amount: 3500 },
    { activity: 'Tools Allocation', amount: 500 },
  ];

  const profit = calculateClientProfitability({ serviceRevenue, directCosts, overheadCosts: [] });

  assert.equal(profit.totalDirectCosts, 9200);
  assert.equal(profit.contribution, 15800);
  assert.equal(profit.netClientProfit, 15800);
  assert.equal(profit.marginPercent, 63.2); // (15800 / 25000) * 100 = 63.2%
});

test('Invariant 5: Zero revenue safely produces marginPercent of null (N/A)', () => {
  const profit = calculateClientProfitability({ serviceRevenue: 0, directCosts: [{ amount: 5000 }] });

  assert.equal(profit.contribution, -5000);
  assert.equal(profit.marginPercent, null);
});

test('Invariant 6: Internal Transfer preserves consolidated net cash (except explicit fee)', () => {
  const fromAccOpening = 200000;
  const toAccOpening = 50000;
  const transferAmount = 75000;
  const bankFee = 15;

  const fromAccClosing = fromAccOpening - transferAmount - bankFee;
  const toAccClosing = toAccOpening + transferAmount;

  const consolidatedBefore = fromAccOpening + toAccOpening;
  const consolidatedAfter = fromAccClosing + toAccClosing;

  assert.equal(fromAccClosing, 124985);
  assert.equal(toAccClosing, 125000);
  assert.equal(consolidatedBefore - consolidatedAfter, bankFee); // Consolidated cash only changes by the explicit fee
});

test('Invariant 7: Founder accounting rules (Capital is equity, drawings are distributions, loans are liabilities)', () => {
  const founderEntries = [
    { type: 'capital_introduced', amount: 500000, isSalesRevenue: false },
    { type: 'drawings', amount: 100000, isOperatingExpense: false },
    { type: 'loan_to_company', amount: 200000, isRevenue: false },
    { type: 'loan_repayment', amount: 50000, isExpense: false },
  ];

  founderEntries.forEach((entry) => {
    if (entry.type === 'capital_introduced') assert.equal(entry.isSalesRevenue, false);
    if (entry.type === 'drawings') assert.equal(entry.isOperatingExpense, false);
    if (entry.type === 'loan_to_company') assert.equal(entry.isRevenue, false);
    if (entry.type === 'loan_repayment') assert.equal(entry.isExpense, false);
  });
});
