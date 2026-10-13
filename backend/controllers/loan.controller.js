// =============================================
// LOAN CONTROLLER
// Business Loans & Repayment Tracking
// =============================================

import Loan from '../models/loan.model.js';
import { checkAndSendLoanReminders } from '../services/cron.service.js';

export const getLoans = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (req.user?.organizationId) {
      filter.organizationId = req.user.organizationId;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { loanName: { $regex: term, $options: 'i' } },
        { lender: { $regex: term, $options: 'i' } },
        { accountNumber: { $regex: term, $options: 'i' } },
      ];
    }

    const loans = await Loan.find(filter)
      .populate('createdBy', 'name email')
      .populate('payments.recordedBy', 'name email')
      .sort({ status: 1, nextPaymentDate: 1 });

    // Compute summary metrics across all organization's loans (ignoring current filter for global view)
    const baseFilter = req.user?.organizationId ? { organizationId: req.user.organizationId } : {};
    const allLoans = await Loan.find(baseFilter);

    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);

    let totalBorrowed = 0;
    let totalPayable = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let activeCount = 0;
    let closedCount = 0;
    let upcomingEmiCount = 0;
    let upcomingEmiAmount = 0;

    for (const l of allLoans) {
      totalBorrowed += Number(l.loanAmount || 0);
      totalPayable += Number(l.totalPayable || l.loanAmount || 0);
      totalPaid += Number(l.paidAmount || 0);

      if (l.status === 'active') {
        activeCount++;
        totalRemaining += Number(l.balanceAmount || 0);

        if (l.nextPaymentDate) {
          const dueKey = new Date(l.nextPaymentDate).toISOString().slice(0, 7);
          if (dueKey === currentMonthKey) {
            upcomingEmiCount++;
            upcomingEmiAmount += Number(l.emiAmount || 0);
          }
        }
      } else {
        closedCount++;
      }
    }

    return res.json({
      success: true,
      data: loans,
      summary: {
        totalBorrowed,
        totalPayable,
        totalPaid,
        totalRemaining,
        activeCount,
        closedCount,
        totalCount: allLoans.length,
        upcomingEmiCount,
        upcomingEmiAmount,
      },
    });
  } catch (error) {
    console.error('getLoans error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createLoan = async (req, res) => {
  try {
    const {
      loanName,
      lender,
      accountNumber,
      loanAmount,
      interestRate,
      totalPayable,
      emiAmount,
      tenureMonths,
      startDate,
      nextPaymentDate,
      initialPaidAmount,
      notes,
    } = req.body;

    if (!loanName || !loanName.trim()) {
      return res.status(400).json({ success: false, message: 'Loan Name is required' });
    }
    if (!lender || !lender.trim()) {
      return res.status(400).json({ success: false, message: 'Lender / Bank name is required' });
    }
    if (!loanAmount || Number(loanAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'Loan amount must be greater than 0' });
    }
    if (!emiAmount || Number(emiAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'EMI amount must be greater than 0' });
    }
    if (!nextPaymentDate) {
      return res.status(400).json({ success: false, message: 'Next payment date is required' });
    }

    const loanData = {
      organizationId: req.user?.organizationId,
      loanName: loanName.trim(),
      lender: lender.trim(),
      accountNumber: (accountNumber || '').trim(),
      loanAmount: Number(loanAmount),
      interestRate: Number(interestRate || 0),
      totalPayable: totalPayable ? Number(totalPayable) : undefined,
      emiAmount: Number(emiAmount),
      tenureMonths: Number(tenureMonths || 12),
      startDate: startDate ? new Date(startDate) : new Date(),
      nextPaymentDate: new Date(nextPaymentDate),
      notes: notes || '',
      createdBy: req.user?._id,
      payments: [],
    };

    if (initialPaidAmount && Number(initialPaidAmount) > 0) {
      loanData.payments.push({
        amount: Number(initialPaidAmount),
        paymentDate: loanData.startDate,
        paymentMode: 'Bank Transfer',
        reference: 'Initial Repayment Record',
        notes: 'Paid prior to tracking setup',
        recordedBy: req.user?._id,
      });
      loanData.paidAmount = Number(initialPaidAmount);
    }

    const loan = new Loan(loanData);
    await loan.save();

    return res.status(201).json({
      success: true,
      message: 'Loan added successfully',
      data: loan,
    });
  } catch (error) {
    console.error('createLoan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findById(id);

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const allowedFields = [
      'loanName',
      'lender',
      'accountNumber',
      'loanAmount',
      'interestRate',
      'totalPayable',
      'emiAmount',
      'tenureMonths',
      'startDate',
      'nextPaymentDate',
      'status',
      'notes',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'startDate' || field === 'nextPaymentDate') {
          loan[field] = req.body[field] ? new Date(req.body[field]) : loan[field];
        } else if (['loanAmount', 'interestRate', 'totalPayable', 'emiAmount', 'tenureMonths'].includes(field)) {
          loan[field] = Number(req.body[field]);
        } else {
          loan[field] = req.body[field];
        }
      }
    });

    await loan.save();

    return res.json({
      success: true,
      message: 'Loan updated successfully',
      data: loan,
    });
  } catch (error) {
    console.error('updateLoan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const recordLoanPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentMode, reference, notes, nextPaymentDate } = req.body;

    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    }

    // Add repayment entry
    loan.payments.push({
      amount: payAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMode: paymentMode || 'Bank Transfer',
      reference: reference || '',
      notes: notes || '',
      recordedBy: req.user?._id,
    });

    // Advance nextPaymentDate: either explicitly provided or advance by 1 month
    if (nextPaymentDate) {
      loan.nextPaymentDate = new Date(nextPaymentDate);
    } else if (loan.nextPaymentDate) {
      const currentNext = new Date(loan.nextPaymentDate);
      currentNext.setMonth(currentNext.getMonth() + 1);
      loan.nextPaymentDate = currentNext;
    }

    await loan.save();

    return res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: loan,
    });
  } catch (error) {
    console.error('recordLoanPayment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findByIdAndDelete(id);

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    return res.json({
      success: true,
      message: 'Loan deleted successfully',
    });
  } catch (error) {
    console.error('deleteLoan error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerLoanRemindersManually = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await checkAndSendLoanReminders(io);
    return res.json({
      success: true,
      message: `Loan reminders processed. ${result.sentCount || 0} reminder(s) sent.`,
      result,
    });
  } catch (error) {
    console.error('triggerLoanRemindersManually error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
