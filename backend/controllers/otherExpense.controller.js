// =============================================
// OTHER EXPENSES / MEMO NOTES CONTROLLER
// Handles personal, informal, and miscellaneous expense notes.
// Strictly unbound from official company finance KPIs.
// =============================================

import OtherExpense from '../models/otherExpense.model.js';

/**
 * Get all Other / Memo Expenses with search and date filters
 */
export const getOtherExpenses = async (req, res) => {
  try {
    const { search, category, startDate, endDate } = req.query;
    const filter = {};

    if (req.user?.organizationId) {
      filter.$or = [
        { organizationId: req.user.organizationId },
        { organizationId: null },
      ];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (search) {
      const q = search.trim();
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { notes: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
          { paidBy: { $regex: q, $options: 'i' } },
        ],
      });
    }

    const otherExpenses = await OtherExpense.find(filter)
      .populate('recordedBy', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Summary calculations
    const now = new Date();
    const totalAmount = otherExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const thisMonthAmount = otherExpenses
      .filter((e) => {
        const d = new Date(e.date || e.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    res.json({
      success: true,
      count: otherExpenses.length,
      totalAmount,
      thisMonthAmount,
      otherExpenses,
    });
  } catch (error) {
    console.error('getOtherExpenses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new Other / Memo Expense
 */
export const createOtherExpense = async (req, res) => {
  try {
    const { title, amount, date, category, paymentMode, paidBy, notes, tag, isPersonal } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Expense title is required' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid non-negative amount' });
    }

    const newExpense = await OtherExpense.create({
      organizationId: req.user?.organizationId || null,
      title: title.trim(),
      amount: numAmount,
      date: date ? new Date(date) : new Date(),
      category: category ? category.trim() : 'Miscellaneous',
      paymentMode: paymentMode || 'Cash',
      paidBy: paidBy ? paidBy.trim() : (req.user?.name || 'Self'),
      notes: notes ? notes.trim() : '',
      tag: tag ? tag.trim() : '',
      isPersonal: isPersonal !== undefined ? Boolean(isPersonal) : true,
      isUnboundMemo: true,
      recordedBy: req.user?._id || null,
    });

    res.status(201).json({
      success: true,
      message: 'Expense memo note recorded',
      otherExpense: newExpense,
    });
  } catch (error) {
    console.error('createOtherExpense error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update an existing Other / Memo Expense
 */
export const updateOtherExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, date, category, paymentMode, paidBy, notes, tag, isPersonal } = req.body;

    const existing = await OtherExpense.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense note not found' });
    }

    if (title !== undefined) existing.title = title.trim();
    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ success: false, message: 'Please provide a valid non-negative amount' });
      }
      existing.amount = numAmount;
    }
    if (date !== undefined) existing.date = new Date(date);
    if (category !== undefined) existing.category = category.trim();
    if (paymentMode !== undefined) existing.paymentMode = paymentMode;
    if (paidBy !== undefined) existing.paidBy = paidBy.trim();
    if (notes !== undefined) existing.notes = notes.trim();
    if (tag !== undefined) existing.tag = tag.trim();
    if (isPersonal !== undefined) existing.isPersonal = Boolean(isPersonal);

    await existing.save();

    res.json({
      success: true,
      message: 'Expense memo note updated',
      otherExpense: existing,
    });
  } catch (error) {
    console.error('updateOtherExpense error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete an Other / Memo Expense
 */
export const deleteOtherExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await OtherExpense.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense note not found' });
    }

    await OtherExpense.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Expense memo note deleted successfully',
    });
  } catch (error) {
    console.error('deleteOtherExpense error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
