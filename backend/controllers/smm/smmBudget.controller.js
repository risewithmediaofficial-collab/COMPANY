// =============================================
// SMM CLIENT BUDGET CONTROLLER
// Dedicated Client Ad Budget Ledger (Decoupled from Campaigns)
// Fields: Client, From/To Date, Monthly Budget, Deposits[], Balance
// =============================================
import SmmBudget from '../../models/smm/smmBudget.model.js';
import Client from '../../models/client.model.js';
import SmmClient from '../../models/smm/smmClient.model.js';

// ─── Helper to resolve Client & Company names ─────────────────────────────────
const resolveClientNames = async (clientId) => {
  let companyName = '';
  let clientName = '';

  // 1. Try CRM Client model
  try {
    const crmClient = await Client.findById(clientId).select('name company companyName');
    if (crmClient) {
      companyName = crmClient.company || crmClient.companyName || '';
      clientName = crmClient.name || '';
      return { companyName, clientName };
    }
  } catch (e) {
    // ignore
  }

  // 2. Try SMM Client model
  try {
    const smmClient = await SmmClient.findById(clientId).select('companyName primaryContact');
    if (smmClient) {
      companyName = smmClient.companyName || '';
      clientName = smmClient.primaryContact || '';
      return { companyName, clientName };
    }
  } catch (e) {
    // ignore
  }

  return { companyName, clientName };
};

// ─── Helper: compute sum of deposits ──────────────────────────────────────────
const sumDeposits = (deposits = []) =>
  deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);

// ─── GET All Client Budgets ───────────────────────────────────────────────────
export const getBudgets = async (req, res) => {
  try {
    const { client, startDate, endDate, search, page = 1, limit = 200 } = req.query;
    const query = {};

    if (client) query.client = client;

    if (startDate || endDate) {
      query.fromDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.fromDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.fromDate.$lte = e;
      }
    }

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await SmmBudget.countDocuments(query);
    const budgets = await SmmBudget.find(query)
      .populate({
        path: 'client',
        select: 'name company companyName primaryContact email phone',
      })
      .populate('createdBy', 'name email')
      .sort({ fromDate: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: budgets,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('getBudgets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET Budget Summary (KPI Totals) ──────────────────────────────────────────
export const getBudgetSummary = async (req, res) => {
  try {
    const { client, startDate, endDate } = req.query;
    const query = {};

    if (client) query.client = client;

    if (startDate || endDate) {
      query.fromDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.fromDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.fromDate.$lte = e;
      }
    }

    const budgets = await SmmBudget.find(query);

    const totalMonthlyBudget = budgets.reduce((sum, b) => sum + (Number(b.monthlyBudget) || 0), 0);
    const totalAmountDeposited = budgets.reduce((sum, b) => sum + (Number(b.amountDeposited) || 0), 0);
    const totalBalance = budgets.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

    const uniqueClients = new Set(budgets.map((b) => String(b.client)));

    res.json({
      success: true,
      data: {
        totalMonthlyBudget,
        totalAmountDeposited,
        totalBalance,
        totalClients: uniqueClients.size,
        totalEntries: budgets.length,
      },
    });
  } catch (error) {
    console.error('getBudgetSummary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE Budget Entry ──────────────────────────────────────────────────────
export const addBudget = async (req, res) => {
  try {
    const { client, fromDate, toDate, monthlyBudget, deposits, notes } = req.body;

    if (!client) {
      return res.status(400).json({ success: false, message: 'Client is required' });
    }
    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'From Date and To Date are required' });
    }

    const parsedMonthly = Number(monthlyBudget) || 0;
    const parsedDeposits = Array.isArray(deposits) ? deposits : [];
    const totalDeposited = sumDeposits(parsedDeposits);
    const balance = parsedMonthly - totalDeposited;

    const entryFromDate = new Date(fromDate);
    const month = entryFromDate.toISOString().slice(0, 7); // 'YYYY-MM'

    // Resolve client & company name
    const { companyName, clientName } = await resolveClientNames(client);

    const budget = new SmmBudget({
      client,
      clientName,
      companyName,
      fromDate: entryFromDate,
      toDate: new Date(toDate),
      date: entryFromDate,
      month,
      monthlyBudget: parsedMonthly,
      deposits: parsedDeposits.map((d) => ({
        fromDate: d.fromDate ? new Date(d.fromDate) : null,
        toDate: d.toDate ? new Date(d.toDate) : null,
        depositDate: d.depositDate ? new Date(d.depositDate) : new Date(),
        amount: Number(d.amount) || 0,
        notes: d.notes || '',
      })),
      amountDeposited: totalDeposited,
      balance,
      notes: notes || '',
      createdBy: req.user?._id,
    });

    await budget.save();

    const populated = await SmmBudget.findById(budget._id)
      .populate('client', 'name company companyName primaryContact email phone')
      .populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('addBudget error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE Budget Entry ──────────────────────────────────────────────────────
export const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await SmmBudget.findById(id);

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget entry not found' });
    }

    const { client, fromDate, toDate, monthlyBudget, deposits, notes } = req.body;

    if (client && String(client) !== String(budget.client)) {
      budget.client = client;
      const { companyName, clientName } = await resolveClientNames(client);
      budget.companyName = companyName;
      budget.clientName = clientName;
    }

    if (fromDate) {
      budget.fromDate = new Date(fromDate);
      budget.date = budget.fromDate;
      budget.month = budget.fromDate.toISOString().slice(0, 7);
    }
    if (toDate) {
      budget.toDate = new Date(toDate);
    }

    const parsedMonthly = monthlyBudget !== undefined ? Number(monthlyBudget) || 0 : budget.monthlyBudget;
    budget.monthlyBudget = parsedMonthly;

    if (deposits !== undefined && Array.isArray(deposits)) {
      budget.deposits = deposits.map((d) => ({
        fromDate: d.fromDate ? new Date(d.fromDate) : null,
        toDate: d.toDate ? new Date(d.toDate) : null,
        depositDate: d.depositDate ? new Date(d.depositDate) : new Date(),
        amount: Number(d.amount) || 0,
        notes: d.notes || '',
      }));
    }

    const totalDeposited = sumDeposits(budget.deposits);
    budget.amountDeposited = totalDeposited;
    budget.balance = parsedMonthly - totalDeposited;

    if (notes !== undefined) budget.notes = notes;

    await budget.save();

    const populated = await SmmBudget.findById(budget._id)
      .populate('client', 'name company companyName primaryContact email phone')
      .populate('createdBy', 'name email');

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('updateBudget error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE Budget Entry ──────────────────────────────────────────────────────
export const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await SmmBudget.findByIdAndDelete(id);

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget entry not found' });
    }

    res.json({ success: true, message: 'Budget entry deleted successfully' });
  } catch (error) {
    console.error('deleteBudget error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── EXPORT Budget Report (CSV) ───────────────────────────────────────────────
export const exportBudgetReport = async (req, res) => {
  try {
    const { client, startDate, endDate } = req.query;
    const query = {};

    if (client) query.client = client;

    if (startDate || endDate) {
      query.fromDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.fromDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.fromDate.$lte = e;
      }
    }

    const budgets = await SmmBudget.find(query)
      .populate('client', 'name company companyName primaryContact')
      .sort({ fromDate: -1 })
      .limit(5000)
      .lean();

    const headers = [
      'Company Name',
      'Client Name',
      'From Date',
      'To Date',
      'Monthly Budget (INR)',
      'Amount Deposited (INR)',
      'Balance Amount (INR)',
      'Deposit Details',
      'Notes',
    ];

    const rows = budgets.map((b) => {
      const company = b.companyName || b.client?.company || b.client?.companyName || '';
      const clientPerson = b.clientName || b.client?.name || b.client?.primaryContact || '';
      const fromStr = b.fromDate ? new Date(b.fromDate).toISOString().slice(0, 10) : '';
      const toStr = b.toDate ? new Date(b.toDate).toISOString().slice(0, 10) : '';
      const depositDetails = (b.deposits || [])
        .map((d) => {
          const period = d.fromDate && d.toDate
            ? `(${new Date(d.fromDate).toISOString().slice(0, 10)} to ${new Date(d.toDate).toISOString().slice(0, 10)}) `
            : '';
          const depDate = d.depositDate ? new Date(d.depositDate).toISOString().slice(0, 10) : '';
          return `${period}Deposited on ${depDate}: ₹${d.amount}`;
        })
        .join(' | ');
      return [
        `"${company.replace(/"/g, '""')}"`,
        `"${clientPerson.replace(/"/g, '""')}"`,
        `"${fromStr}"`,
        `"${toStr}"`,
        b.monthlyBudget || 0,
        b.amountDeposited || 0,
        b.balance || 0,
        `"${depositDetails.replace(/"/g, '""')}"`,
        `"${(b.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="smm-ad-budget-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('exportBudgetReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
