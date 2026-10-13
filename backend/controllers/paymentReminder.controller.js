// =============================================
// PAYMENT REMINDER CONTROLLER
// Isolated tracking for referral / client-side payments
// STRICTLY SEPARATE: No impact on expenses, revenue, or profit calculations
// =============================================

import PaymentReminder from '../models/paymentReminder.model.js';

export const getPaymentReminders = async (req, res) => {
  try {
    const { status, search, fromDate, toDate } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { partyName: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
      ];
    }

    if (fromDate || toDate) {
      filter.dueDate = {};
      if (fromDate) filter.dueDate.$gte = new Date(fromDate);
      if (toDate) filter.dueDate.$lte = new Date(toDate);
    }

    const reminders = await PaymentReminder.find(filter)
      .populate('createdBy', 'name email')
      .populate('client', 'name company')
      .sort({ createdAt: -1 });

    // Compute summary metrics
    const allReminders = await PaymentReminder.find({});
    const summary = {
      totalTracked: allReminders.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0),
      totalPaid: allReminders.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0),
      totalPending: allReminders.reduce((s, r) => s + (Number(r.balanceAmount) || 0), 0),
      pendingCount: allReminders.filter((r) => r.status === 'pending').length,
      partiallyPaidCount: allReminders.filter((r) => r.status === 'partially_paid').length,
      paidCount: allReminders.filter((r) => r.status === 'paid').length,
      totalCount: allReminders.length,
    };

    res.json({
      success: true,
      data: reminders,
      summary,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPaymentReminder = async (req, res) => {
  try {
    const {
      title,
      partyName,
      client,
      category,
      totalAmount,
      paidAmount = 0,
      dueDate,
      paymentMode,
      contactInfo,
      notes,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (!partyName || !partyName.trim()) {
      return res.status(400).json({ success: false, message: 'Party / Client name is required' });
    }
    if (totalAmount == null || Number(totalAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid total amount is required' });
    }

    const initialPaid = Math.max(0, Number(paidAmount || 0));
    const initialTotal = Number(totalAmount);

    const history = [];
    if (initialPaid > 0) {
      history.push({
        amount: initialPaid,
        paymentDate: new Date(),
        paymentMode: paymentMode || 'Bank Transfer',
        reference: 'Initial Payment',
        notes: 'Recorded upon creation',
        recordedBy: req.user?._id,
      });
    }

    const reminder = new PaymentReminder({
      title: title.trim(),
      partyName: partyName.trim(),
      client: client || null,
      category: category || 'referral',
      totalAmount: initialTotal,
      paidAmount: initialPaid,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      paymentMode: paymentMode || '',
      contactInfo: contactInfo || '',
      notes: notes || '',
      createdBy: req.user?._id,
      paymentHistory: history,
    });

    await reminder.save();

    res.status(201).json({
      success: true,
      data: reminder,
      message: 'Payment reminder created successfully',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatePaymentReminder = async (req, res) => {
  try {
    const reminder = await PaymentReminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Payment reminder not found' });
    }

    const {
      title,
      partyName,
      client,
      category,
      totalAmount,
      dueDate,
      paymentMode,
      contactInfo,
      notes,
    } = req.body;

    if (title) reminder.title = title.trim();
    if (partyName) reminder.partyName = partyName.trim();
    if (client !== undefined) reminder.client = client || null;
    if (category) reminder.category = category;
    if (totalAmount != null) reminder.totalAmount = Math.max(0, Number(totalAmount));
    if (dueDate !== undefined) reminder.dueDate = dueDate ? new Date(dueDate) : null;
    if (paymentMode !== undefined) reminder.paymentMode = paymentMode;
    if (contactInfo !== undefined) reminder.contactInfo = contactInfo;
    if (notes !== undefined) reminder.notes = notes;

    await reminder.save();

    res.json({
      success: true,
      data: reminder,
      message: 'Payment reminder updated successfully',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const recordPaymentOnReminder = async (req, res) => {
  try {
    const reminder = await PaymentReminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Payment reminder not found' });
    }

    const { amount, paymentDate, paymentMode, reference, notes, markAsFull } = req.body;

    if (markAsFull) {
      // Mark remainder as paid in full
      const remaining = Math.max(0, reminder.totalAmount - reminder.paidAmount);
      if (remaining > 0) {
        reminder.paymentHistory.push({
          amount: remaining,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMode: paymentMode || reminder.paymentMode || 'Bank Transfer',
          reference: reference || 'Full Settlement',
          notes: notes || 'Marked as paid in full',
          recordedBy: req.user?._id,
        });
      }
      reminder.paidAmount = reminder.totalAmount;
      reminder.status = 'paid';
    } else {
      const payAmount = Number(amount);
      if (!payAmount || payAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
      }

      reminder.paymentHistory.push({
        amount: payAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMode: paymentMode || reminder.paymentMode || 'Bank Transfer',
        reference: reference || '',
        notes: notes || '',
        recordedBy: req.user?._id,
      });

      reminder.paidAmount = Math.min(reminder.totalAmount, (reminder.paidAmount || 0) + payAmount);
    }

    await reminder.save();

    res.json({
      success: true,
      data: reminder,
      message: reminder.status === 'paid' ? 'Payment reminder marked as paid' : 'Payment installment recorded',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deletePaymentReminder = async (req, res) => {
  try {
    const reminder = await PaymentReminder.findByIdAndDelete(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Payment reminder not found' });
    }
    res.json({ success: true, message: 'Payment reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
