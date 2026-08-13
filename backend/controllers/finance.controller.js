// =============================================
// FINANCE CONTROLLER - Invoices, Payments & Expenses
// =============================================

import Invoice from '../models/invoice.model.js';
import Expense from '../models/expense.model.js';
import FinanceEntry from '../models/financeEntry.model.js';
import Finance from '../models/finance.model.js';
import PaymentNote from '../models/paymentNote.model.js';
import Referral from '../models/referral.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';
import Payment from '../models/payment.model.js';
import CallHistory from '../models/callHistory.model.js';
import Task from '../models/task.model.js';
import { createNotification } from '../utils/notification.js';
import { sendEmail } from '../utils/email.js';
import { createActivityLog } from '../utils/activity.js';
import { withWorkspaceScope } from '../middleware/auth.middleware.js';

const invoiceStatusMap = {
  Draft: 'draft',
  Sent: 'sent',
  Viewed: 'viewed',
  Pending: 'sent',
  'Partially Paid': 'partially_paid',
  Paid: 'paid',
  Overdue: 'overdue',
  Cancelled: 'cancelled',
};

const invoiceStatusLabels = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const normalizeStatus = (value = '') => invoiceStatusMap[value] || value.toString().toLowerCase();

const financeRoles = ['superAdmin', 'admin', 'manager', 'financeManager'];
const paymentModes = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return fallback;
};

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const canManageFinance = (user) => financeRoles.includes(user?.role) || Boolean(user?.permissions?.canManageFinance);

const getClientScopeForUser = async (user) => {
  if (!user) return { clientIds: [], projectIds: [] };
  if (canManageFinance(user) || user.role === 'superAdmin') return { unrestricted: true };

  if (user.role === 'client') {
    const client = await Client.findOne({ userId: user._id }).select('_id');
    return { clientIds: client ? [client._id] : [], projectIds: [] };
  }

  const [clients, projects, tasks] = await Promise.all([
    Client.find({ $or: [{ assignedManager: user._id }, { assignedTeam: user._id }] }).select('_id'),
    Project.find({ $or: [{ manager: user._id }, { team: user._id }] }).select('_id client'),
    Task.find({ assignedTo: user._id }).select('project client'),
  ]);

  return {
    clientIds: [
      ...clients.map((item) => item._id.toString()),
      ...projects.map((item) => item.client?.toString()).filter(Boolean),
      ...tasks.map((item) => item.client?.toString()).filter(Boolean),
    ],
    projectIds: [
      ...projects.map((item) => item._id.toString()),
      ...tasks.map((item) => item.project?.toString()).filter(Boolean),
    ],
  };
};

const buildScopedFilter = async (req, baseFilter = {}, { clientField = 'clientId', projectField = 'projectId', respectClientVisibility = false } = {}) => {
  const scope = withWorkspaceScope(req, { ...baseFilter });
  const access = await getClientScopeForUser(req.user);

  if (access.unrestricted) {
    if (req.user.role === 'client' && respectClientVisibility) {
      return { ...scope, visibleToClient: true };
    }
    return scope;
  }

  if (req.user.role === 'client') {
    const clientIds = access.clientIds || [];
    return {
      ...scope,
      [clientField]: { $in: clientIds.length ? clientIds : [null] },
      ...(respectClientVisibility ? { visibleToClient: true } : {}),
    };
  }

  const clientIds = [...new Set((access.clientIds || []).filter(Boolean))];
  const projectIds = [...new Set((access.projectIds || []).filter(Boolean))];

  return {
    ...scope,
    $or: [
      { [clientField]: { $in: clientIds.length ? clientIds : [null] } },
      { [projectField]: { $in: projectIds.length ? projectIds : [null] } },
    ],
  };
};

const serializeFinanceRecord = (record) => {
  const item = record?.toObject ? record.toObject() : record;
  if (!item) return null;

  return {
    ...item,
    totalAmount: item.totalProjectAmount,
    paidAmount: item.totalPaidAmount,
    clientName: item.clientName || item.clientId?.name || item.clientId?.company || '',
    projectName: item.projectName || item.projectId?.name || '',
  };
};

const serializePaymentNote = (note) => {
  const item = note?.toObject ? note.toObject() : note;
  if (!item) return null;
  return item;
};

const serializeInvoice = (invoice) => {
  const item = invoice?.toObject ? invoice.toObject() : invoice;
  if (!item) return null;

  return {
    ...item,
    amount: item.totalAmount || item.total,
    totalAmount: item.totalAmount || item.total,
    balanceAmount: item.balanceAmount ?? Math.max(Number(item.totalAmount || item.total || 0) - Number(item.paidAmount || 0), 0),
    description: item.lineItems?.[0]?.description || item.invoiceItems?.[0]?.description || item.notes || '',
    invoiceStatus: invoiceStatusLabels[item.status] || item.status,
    status: invoiceStatusLabels[item.status] || item.status,
  };
};

const normalizeFinanceEntryPayload = (body = {}) => ({
  ...body,
  amount: Number(body.amount) || 0,
  type: body.type || 'Expense',
  status: body.status || 'Completed',
  project: body.project || undefined,
  client: body.client || undefined,
});

const resolveClientProject = async ({ clientId, projectId }) => {
  const project = projectId ? await Project.findById(projectId).select('_id name client') : null;
  if (projectId && !project) return { ok: false, status: 404, message: 'Project not found' };

  const resolvedClientId = clientId || project?.client;
  const client = resolvedClientId ? await Client.findById(resolvedClientId).select('_id name company userId') : null;
  if (resolvedClientId && !client) return { ok: false, status: 404, message: 'Client not found' };

  if (project && client && project.client?.toString() !== client._id.toString()) {
    return { ok: false, status: 400, message: 'Selected project does not belong to the selected client' };
  }

  return { ok: true, client, project };
};

const recalculateFinanceRecord = async (financeId) => {
  const finance = await Finance.findById(financeId);
  if (!finance) return null;

  const notes = await PaymentNote.find({ financeId: finance._id });
  finance.totalPaidAmount = notes.reduce((sum, note) => sum + Number(note.amountPaid || 0), 0);
  finance.advancePaid = finance.totalPaidAmount;
  finance.balanceAmount = Math.max(Number(finance.totalProjectAmount || 0) - Number(finance.totalPaidAmount || 0), 0);

  if (finance.balanceAmount === 0 && finance.totalProjectAmount > 0) {
    finance.paymentStatus = 'Paid';
    finance.invoiceStatus = finance.invoiceStatus === 'Cancelled' ? 'Cancelled' : 'Paid';
  } else if (finance.totalPaidAmount > 0) {
    finance.paymentStatus = 'Partially Paid';
    if (finance.invoiceStatus !== 'Cancelled') finance.invoiceStatus = 'Partially Paid';
  } else {
    finance.paymentStatus = 'Not Paid';
  }

  if (finance.paymentDueDate && new Date(finance.paymentDueDate) < new Date() && finance.balanceAmount > 0) {
    finance.paymentStatus = 'Overdue';
  }

  if (notes.length) {
    const latestNote = notes.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
    finance.paymentMode = latestNote.paymentMode || finance.paymentMode;
    finance.paymentDate = latestNote.paymentDate || finance.paymentDate;
    finance.nextFollowUpDate = latestNote.nextFollowUpDate || finance.nextFollowUpDate;
  }

  await finance.save();
  return finance;
};

const buildFinanceRecordPayload = async (req, body = {}, currentRecord = null) => {
  const match = await resolveClientProject({
    clientId: body.clientId || body.client || currentRecord?.clientId,
    projectId: body.projectId || body.project || currentRecord?.projectId,
  });
  if (!match.ok) return match;

  const record = {
    serviceName: body.serviceName || currentRecord?.serviceName || '',
    totalProjectAmount: toNumber(body.totalProjectAmount ?? body.totalAmount, currentRecord?.totalProjectAmount || 0),
    advancePaid: toNumber(body.advancePaid, currentRecord?.advancePaid || 0),
    totalPaidAmount: toNumber(body.paidAmount ?? body.totalPaidAmount, currentRecord?.totalPaidAmount || 0),
    balanceAmount: 0,
    paymentStatus: body.paymentStatus || currentRecord?.paymentStatus || 'Not Paid',
    paymentMode: paymentModes.includes(body.paymentMode) ? body.paymentMode : (currentRecord?.paymentMode || 'Other'),
    paymentDate: body.paymentDate || currentRecord?.paymentDate || undefined,
    paymentDueDate: body.paymentDueDate || currentRecord?.paymentDueDate || undefined,
    nextFollowUpDate: body.nextFollowUpDate || currentRecord?.nextFollowUpDate || undefined,
    paymentNotesText: body.paymentNotes || body.paymentNotesText || currentRecord?.paymentNotesText || '',
    invoiceStatus: body.invoiceStatus || currentRecord?.invoiceStatus || 'Draft',
    allowAssignedPersonAccess: normalizeBoolean(body.allowAssignedPersonAccess, currentRecord?.allowAssignedPersonAccess || false),
    clientId: match.client?._id,
    projectId: match.project?._id,
    clientName: match.client?.name || match.client?.company || '',
    projectName: match.project?.name || '',
    updatedBy: req.user._id,
  };

  record.balanceAmount = Math.max(record.totalProjectAmount - record.totalPaidAmount, 0);
  return { ok: true, record, client: match.client, project: match.project };
};

const buildInvoicePayload = (body = {}) => {
  const amount = Number(body.amount || body.total || body.totalAmount || 0);
  const discount = Number(body.discount) || 0;
  const taxRate = Number(body.taxRate || body.tax || 0) || 0;
  const issueDate = body.issueDate || body.invoiceDate;
  const quotedAmount = Number(body.quotedAmount || body.total || body.totalAmount || amount || 0);
  const paymentRecords = Array.isArray(body.payments) ? body.payments.map((payment) => ({
    amount: Number(payment.amount || 0),
    method: payment.method || 'manual',
    reference: payment.reference || '',
    notes: payment.notes || '',
    paidAt: payment.paidAt || new Date(),
  })).filter((payment) => Number(payment.amount || 0) > 0) : [];
  const paidAmount = Number(body.paidAmount || paymentRecords.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0);

  const payload = {
    ...body,
    status: normalizeStatus(body.status || 'draft'),
    taxRate,
    discount,
    quotedAmount,
    paidAmount,
    payments: paymentRecords,
    issueDate,
    invoiceDate: issueDate,
    paymentTerms: body.paymentTerms || body.terms || '',
    serviceDetails: body.serviceDetails || body.description || '',
    paymentLink: body.paymentLink || '',
    allowAssignedPersonAccess: normalizeBoolean(body.allowAssignedPersonAccess),
  };

  if (!payload.invoiceNumber?.trim()) delete payload.invoiceNumber;

  const sourceItems = Array.isArray(body.invoiceItems) && body.invoiceItems.length
    ? body.invoiceItems
    : Array.isArray(body.lineItems) && body.lineItems.length
      ? body.lineItems
      : null;

  payload.lineItems = sourceItems
    ? sourceItems.map((item) => ({
      serviceName: item.serviceName || item.name || '',
      description: item.description || item.serviceName || 'Service item',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice ?? item.rate ?? 0) || 0,
      rate: Number(item.rate ?? item.unitPrice ?? 0) || 0,
      amount: Number(item.amount || 0) || ((Number(item.quantity) || 1) * (Number(item.unitPrice ?? item.rate ?? 0) || 0)),
    }))
    : [{
      serviceName: body.serviceName || 'Service',
      description: body.description || 'Professional services',
      quantity: 1,
      unitPrice: amount,
      rate: amount,
      amount,
    }];

  payload.invoiceItems = payload.lineItems;
  payload.balanceAmount = Math.max(amount - payload.paidAmount, 0);

  return payload;
};

const getClientForUser = async (userId) => Client.findOne({ userId }).select('_id name company assignedManager');

const applyClientInvoiceScope = async (req, filter = {}) => buildScopedFilter(req, filter, {
  clientField: 'client',
  projectField: 'project',
});

const assertInvoiceAccess = async (req, invoice) => {
  if (!invoice) return { allowed: false, status: 404, message: 'Invoice not found' };
  const scopedFilter = await applyClientInvoiceScope(req, { _id: invoice._id });
  const allowed = await Invoice.exists(scopedFilter);
  return allowed ? { allowed: true } : { allowed: false, status: 403, message: 'Access denied' };
};

const recordPayment = async ({
  invoice,
  amount,
  method,
  reference,
  notes,
  recordedBy,
}) => Payment.create({
  invoice: invoice._id,
  client: invoice.client,
  project: invoice.project,
  amount,
  currency: invoice.currency || 'INR',
  status: 'paid',
  method: method || 'manual',
  reference: reference || '',
  paidAt: invoice.paidDate || new Date(),
  recordedBy,
  notes: notes || '',
});

const maybeCreateReferralEarning = async ({ invoice, io }) => {
  const referral = await Referral.findOne({
    client: invoice.client,
    status: { $in: ['qualified', 'converted', 'approved'] },
  }).populate('referrer', 'name email');

  if (!referral) return null;

  let earnedAmount = 0;

  if (referral.commissionType === 'monthly') {
    earnedAmount = Number(referral.monthlyAmount || 0);
    referral.commissionAmount = Number(referral.commissionAmount || 0) + earnedAmount;
  } else {
    earnedAmount = Number(invoice.paidAmount || invoice.total || 0) * (Number(referral.commissionRate || 0) / 100);
    referral.commissionAmount = Number(referral.commissionAmount || 0) + earnedAmount;
  }

  referral.dealValue = Number(referral.dealValue || 0) + Number(invoice.paidAmount || invoice.total || 0);
  referral.status = 'approved';
  await referral.save();

  if (referral.referrer?._id && earnedAmount > 0) {
    await createNotification({
      recipient: referral.referrer._id,
      type: 'deal_won',
      title: 'Commission Earned',
      message: `${invoice.invoiceNumber} was paid. You earned Rs. ${earnedAmount.toFixed(2)} in referral commission.`,
      link: '/referral',
      metadata: { referralId: referral._id, invoiceId: invoice._id, earnedAmount },
    }, io);
  }

  return { referral, earnedAmount };
};

// ---- FINANCE RECORDS ----

export const getFinanceRecords = async (req, res) => {
  try {
    const { clientId, projectId, paymentStatus, invoiceStatus, search } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (projectId) filter.projectId = projectId;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (invoiceStatus) filter.invoiceStatus = invoiceStatus;
    if (search) {
      filter.$or = [
        { serviceName: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
      ];
    }

    const scopedFilter = await buildScopedFilter(req, filter);
    const records = await Finance.find(scopedFilter)
      .populate('clientId', 'name company email phone assignedManager assignedTeam')
      .populate('projectId', 'name manager team')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ updatedAt: -1, createdAt: -1 });

    res.json({ success: true, records: records.map(serializeFinanceRecord) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFinanceRecord = async (req, res) => {
  try {
    const scopedFilter = await buildScopedFilter(req, { _id: req.params.id });
    const record = await Finance.findOne(scopedFilter)
      .populate('clientId', 'name company email phone')
      .populate('projectId', 'name status')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!record) return res.status(404).json({ success: false, message: 'Finance record not found' });

    const [paymentNotes, callHistory] = await Promise.all([
      PaymentNote.find({ financeId: record._id })
        .populate('addedBy', 'name')
        .sort({ paymentDate: -1, createdAt: -1 }),
      CallHistory.find(await buildScopedFilter(req, { clientId: record.clientId, projectId: record.projectId }, { respectClientVisibility: req.user.role === 'client' }))
        .populate('addedBy', 'name')
        .sort({ callDate: -1, createdAt: -1 })
        .limit(10),
    ]);

    res.json({
      success: true,
      record: serializeFinanceRecord(record),
      paymentNotes: paymentNotes.map(serializePaymentNote),
      callHistory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFinanceRecord = async (req, res) => {
  try {
    const payload = await buildFinanceRecordPayload(req, req.body);
    if (!payload.ok) return res.status(payload.status).json({ success: false, message: payload.message });
    if (!payload.record.serviceName?.trim()) {
      return res.status(400).json({ success: false, message: 'Service name is required' });
    }

    const existing = await Finance.findOne(withWorkspaceScope(req, {
      clientId: payload.record.clientId,
      projectId: payload.record.projectId,
      serviceName: payload.record.serviceName,
    }));
    if (existing) {
      return res.status(400).json({ success: false, message: 'A finance record already exists for this client, project, and service' });
    }

    const record = await Finance.create({
      ...payload.record,
      organizationId: req.user.organizationId,
      brandId: req.headers['x-workspace-id'] || undefined,
      createdBy: req.user._id,
    });

    await createActivityLog({
      actor: req.user,
      action: 'finance.record.created',
      entityType: 'finance_record',
      entityId: record._id,
      title: 'Finance record created',
      description: `${record.serviceName} finance record was created.`,
      relatedClient: record.clientId,
      relatedProject: record.projectId,
      metadata: { totalProjectAmount: record.totalProjectAmount },
    });

    const populated = await Finance.findById(record._id)
      .populate('clientId', 'name company')
      .populate('projectId', 'name')
      .populate('createdBy', 'name');

    res.status(201).json({ success: true, record: serializeFinanceRecord(populated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateFinanceRecord = async (req, res) => {
  try {
    const current = await Finance.findOne(await buildScopedFilter(req, { _id: req.params.id }));
    if (!current) return res.status(404).json({ success: false, message: 'Finance record not found' });

    const payload = await buildFinanceRecordPayload(req, req.body, current);
    if (!payload.ok) return res.status(payload.status).json({ success: false, message: payload.message });

    Object.assign(current, payload.record);
    await current.save();
    await recalculateFinanceRecord(current._id);

    const populated = await Finance.findById(current._id)
      .populate('clientId', 'name company')
      .populate('projectId', 'name')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    await createActivityLog({
      actor: req.user,
      action: 'finance.record.updated',
      entityType: 'finance_record',
      entityId: current._id,
      title: 'Finance record updated',
      description: `${current.serviceName} finance record was updated.`,
      relatedClient: current.clientId,
      relatedProject: current.projectId,
      metadata: { fields: Object.keys(req.body || {}) },
    });

    res.json({ success: true, record: serializeFinanceRecord(populated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteFinanceRecord = async (req, res) => {
  try {
    const record = await Finance.findOneAndDelete(await buildScopedFilter(req, { _id: req.params.id }));
    if (!record) return res.status(404).json({ success: false, message: 'Finance record not found' });

    await PaymentNote.deleteMany({ financeId: record._id });

    await createActivityLog({
      actor: req.user,
      action: 'finance.record.deleted',
      entityType: 'finance_record',
      entityId: record._id,
      title: 'Finance record deleted',
      description: `${record.serviceName} finance record was deleted.`,
      relatedClient: record.clientId,
      relatedProject: record.projectId,
    });

    res.json({ success: true, message: 'Finance record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFinanceRecordsByClient = async (req, res) => {
  req.query.clientId = req.params.clientId;
  return getFinanceRecords(req, res);
};

export const getFinanceRecordsByProject = async (req, res) => {
  req.query.projectId = req.params.projectId;
  return getFinanceRecords(req, res);
};

export const addPaymentNote = async (req, res) => {
  try {
    const finance = await Finance.findOne(await buildScopedFilter(req, { _id: req.params.id }));
    if (!finance) return res.status(404).json({ success: false, message: 'Finance record not found' });

    if (!req.body.noteTitle?.trim()) {
      return res.status(400).json({ success: false, message: 'Note title is required' });
    }

    const amountPaid = toNumber(req.body.amountPaid);
    const nextBalance = Math.max(Number(finance.totalProjectAmount || 0) - (Number(finance.totalPaidAmount || 0) + amountPaid), 0);

    const note = await PaymentNote.create({
      organizationId: req.user.organizationId,
      financeId: finance._id,
      clientId: finance.clientId,
      projectId: finance.projectId,
      noteTitle: req.body.noteTitle,
      noteDescription: req.body.noteDescription || '',
      amountPaid,
      paymentMode: paymentModes.includes(req.body.paymentMode) ? req.body.paymentMode : 'Other',
      paymentDate: req.body.paymentDate || new Date(),
      balanceAfterPayment: nextBalance,
      nextFollowUpDate: req.body.nextFollowUpDate || undefined,
      visibleToClient: normalizeBoolean(req.body.visibleToClient),
      addedBy: req.user._id,
    });

    finance.paymentNotes.push(note._id);
    if (req.body.nextFollowUpDate) finance.nextFollowUpDate = req.body.nextFollowUpDate;
    if (req.body.paymentDate) finance.paymentDate = req.body.paymentDate;
    if (req.body.paymentMode) finance.paymentMode = req.body.paymentMode;
    await finance.save();
    await recalculateFinanceRecord(finance._id);

    const populated = await PaymentNote.findById(note._id).populate('addedBy', 'name');

    const client = await Client.findById(finance.clientId).select('userId name assignedManager assignedTeam');
    if (client?.userId && populated.visibleToClient) {
      await createNotification({
        recipient: client.userId,
        sender: req.user._id,
        type: 'invoice_paid',
        title: 'Payment Updated',
        message: `Payment status updated for ${client.name}.`,
        link: '/portal/invoices',
        metadata: { financeId: finance._id },
      }, req.app.get('io'));
    }

    await createActivityLog({
      actor: req.user,
      action: 'finance.payment_note.created',
      entityType: 'payment_note',
      entityId: note._id,
      title: 'Payment note added',
      description: `${note.noteTitle} was added.`,
      relatedClient: finance.clientId,
      relatedProject: finance.projectId,
      metadata: { amountPaid },
    });

    res.status(201).json({ success: true, note: serializePaymentNote(populated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getPaymentNotes = async (req, res) => {
  try {
    const finance = await Finance.findOne(await buildScopedFilter(req, { _id: req.params.id }));
    if (!finance) return res.status(404).json({ success: false, message: 'Finance record not found' });

    const notes = await PaymentNote.find({
      financeId: finance._id,
      ...(req.user.role === 'client' ? { visibleToClient: true } : {}),
    })
      .populate('addedBy', 'name')
      .sort({ paymentDate: -1, createdAt: -1 });

    res.json({ success: true, notes: notes.map(serializePaymentNote) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addInternalFinanceNote = async (req, res) => {
  try {
    const finance = await Finance.findOne(await buildScopedFilter(req, { _id: req.params.id }));
    if (!finance) return res.status(404).json({ success: false, message: 'Finance record not found' });

    finance.internalNotes.push({
      followUpNote: req.body.followUpNote || '',
      followUpDate: req.body.followUpDate || new Date(),
      nextFollowUpDate: req.body.nextFollowUpDate || undefined,
      spokenWith: req.body.spokenWith || '',
      clientResponse: req.body.clientResponse || '',
      paymentPromiseDate: req.body.paymentPromiseDate || undefined,
      amountPromised: toNumber(req.body.amountPromised),
      addedBy: req.user._id,
    });
    if (req.body.nextFollowUpDate) finance.nextFollowUpDate = req.body.nextFollowUpDate;
    await finance.save();

    res.status(201).json({ success: true, record: serializeFinanceRecord(finance) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getOverdueFinanceRecords = async (req, res) => {
  try {
    const filter = await buildScopedFilter(req, {
      paymentDueDate: { $lt: new Date() },
      balanceAmount: { $gt: 0 },
    });
    const records = await Finance.find(filter)
      .populate('clientId', 'name company')
      .populate('projectId', 'name')
      .sort({ paymentDueDate: 1 });

    res.json({ success: true, records: records.map(serializeFinanceRecord) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- FINANCE ENTRIES ----

export const getFinanceEntries = async (req, res) => {
  try {
    const { search, type, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (req.user.role === 'employee') filter.createdBy = req.user._id;
    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { paymentMethod: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await FinanceEntry.countDocuments(filter);
    const entries = await FinanceEntry.find(filter)
      .populate('createdBy', 'name email')
      .populate('client', 'name company')
      .populate('project', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFinanceEntry = async (req, res) => {
  try {
    const payload = normalizeFinanceEntryPayload(req.body);
    if (!payload.category?.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const match = await resolveClientProject({ clientId: payload.client, projectId: payload.project });
    if (!match.ok) return res.status(match.status).json({ success: false, message: match.message });

    const entry = await FinanceEntry.create({
      ...payload,
      client: match.client?._id,
      project: match.project?._id,
      createdBy: req.user._id,
    });

    await createActivityLog({
      actor: req.user,
      action: 'finance.entry.created',
      entityType: 'finance_entry',
      entityId: entry._id,
      title: 'Finance entry created',
      description: `${entry.type} entry for ${entry.category} was created.`,
      relatedClient: entry.client,
      relatedProject: entry.project,
      metadata: { amount: entry.amount, status: entry.status },
    });

    const populated = await FinanceEntry.findById(entry._id)
      .populate('createdBy', 'name email')
      .populate('client', 'name company')
      .populate('project', 'name');

    res.status(201).json({ success: true, entry: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateFinanceEntry = async (req, res) => {
  try {
    const current = await FinanceEntry.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Finance entry not found' });
    const payload = normalizeFinanceEntryPayload(req.body);
    const match = await resolveClientProject({
      clientId: payload.client || current.client,
      projectId: payload.project || current.project,
    });
    if (!match.ok) return res.status(match.status).json({ success: false, message: match.message });

    Object.assign(current, {
      ...payload,
      client: match.client?._id,
      project: match.project?._id,
    });
    await current.save();

    const entry = await FinanceEntry.findById(current._id)
      .populate('createdBy', 'name email')
      .populate('client', 'name company')
      .populate('project', 'name');
    if (!entry) return res.status(404).json({ success: false, message: 'Finance entry not found' });

    await createActivityLog({
      actor: req.user,
      action: 'finance.entry.updated',
      entityType: 'finance_entry',
      entityId: entry._id,
      title: 'Finance entry updated',
      description: `${entry.type} entry for ${entry.category} was updated.`,
      relatedClient: entry.client,
      relatedProject: entry.project,
      metadata: { fields: Object.keys(req.body || {}) },
    });

    res.json({ success: true, entry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteFinanceEntry = async (req, res) => {
  try {
    const entry = await FinanceEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Finance entry not found' });

    await createActivityLog({
      actor: req.user,
      action: 'finance.entry.deleted',
      entityType: 'finance_entry',
      entityId: entry._id,
      title: 'Finance entry deleted',
      description: `${entry.type} entry for ${entry.category} was deleted.`,
      relatedClient: entry.client,
      relatedProject: entry.project,
      metadata: { amount: entry.amount },
    });

    res.json({ success: true, message: 'Finance entry deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- INVOICES ----

export const getInvoices = async (req, res) => {
  try {
    const { status, client, search, page = 1, limit = 20 } = req.query;
    let filter = {};

    if (status) filter.status = normalizeStatus(status);
    if (client) filter.client = client;
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    filter = await applyClientInvoiceScope(req, filter);

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('client', 'name email company')
      .populate('project', 'name')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, invoices: invoices.map(serializeInvoice) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name email company address phone')
      .populate('project', 'name')
      .populate('issuedBy', 'name email');

    const access = await assertInvoiceAccess(req, invoice);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const payments = await Payment.find({ invoice: invoice._id })
      .populate('recordedBy', 'name')
      .sort({ paidAt: -1 });

    res.json({ success: true, invoice: serializeInvoice(invoice), payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const payload = buildInvoicePayload(req.body);
    if (!payload.client) {
      return res.status(400).json({ success: false, message: 'Client is required' });
    }

    const [client, project] = await Promise.all([
      Client.findById(payload.client).select('name email company userId'),
      payload.project ? Project.findById(payload.project).select('name client') : null,
    ]);

    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    if (payload.project && !project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project?.client?.toString() !== payload.client.toString()) {
      return res.status(400).json({ success: false, message: 'Selected project does not belong to the selected client' });
    }

    const invoice = await Invoice.create({
      ...payload,
      issuedBy: req.user._id,
      createdBy: req.user._id,
      client: client._id,
      clientId: client._id,
      project: project?._id,
      projectId: project?._id,
      clientDetails: {
        name: client.name || '',
        businessName: client.company || '',
        email: client.email || '',
        phone: client.phone || '',
        address: [
          client.address?.street,
          client.address?.city,
          client.address?.state,
          client.address?.country,
          client.address?.zip,
        ].filter(Boolean).join(', '),
      },
    });

    const existingFinance = project?._id
      ? await Finance.findOne(withWorkspaceScope(req, { clientId: client._id, projectId: project._id }))
      : null;
    if (existingFinance) {
      existingFinance.invoiceStatus = invoice.status === 'partially_paid' ? 'Partially Paid' : (invoiceStatusLabels[invoice.status] || 'Draft');
      existingFinance.paymentDueDate = invoice.dueDate || existingFinance.paymentDueDate;
      await existingFinance.save();
    }

    if (invoice.status === 'paid') {
      invoice.paidDate = invoice.issueDate || new Date();
      invoice.paidAmount = invoice.total;
      await invoice.save();
      await recordPayment({
        invoice,
        amount: invoice.total,
        method: 'manual',
        reference: 'created-as-paid',
        notes: 'Invoice created directly in paid state',
        recordedBy: req.user._id,
      });
      await Client.findByIdAndUpdate(client._id, { $inc: { totalRevenue: invoice.total } });
    }

    if (client.userId) {
      await createNotification({
        recipient: client.userId,
        sender: req.user._id,
        type: 'invoice_sent',
        title: 'New Invoice Created',
        message: `New invoice has been generated for ${project?.name || payload.serviceDetails || 'your project'}. Please review your invoice.`,
        link: '/portal/invoices',
      }, req.app.get('io'));
    }

    await createActivityLog({
      actor: req.user,
      action: 'invoice.created',
      entityType: 'invoice',
      entityId: invoice._id,
      title: 'Invoice created',
      description: `Invoice ${invoice.invoiceNumber} was created.`,
      relatedClient: invoice.client,
      relatedProject: invoice.project,
      metadata: { total: invoice.total, status: invoice.status },
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('client', 'name email company')
      .populate('project', 'name')
      .populate('issuedBy', 'name');

    res.status(201).json({ success: true, invoice: serializeInvoice(populated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot edit a paid invoice' });
    }

    const payload = buildInvoicePayload(req.body);
    if (payload.project) {
      const project = await Project.findById(payload.project).select('client');
      if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
      if ((payload.client || invoice.client).toString() !== project.client.toString()) {
        return res.status(400).json({ success: false, message: 'Selected project does not belong to the selected client' });
      }
    }

    Object.assign(invoice, payload);
    await invoice.save();

    await createActivityLog({
      actor: req.user,
      action: 'invoice.updated',
      entityType: 'invoice',
      entityId: invoice._id,
      title: 'Invoice updated',
      description: `Invoice ${invoice.invoiceNumber} was updated.`,
      relatedClient: invoice.client,
      relatedProject: invoice.project,
      metadata: { fields: Object.keys(req.body || {}) },
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('client', 'name email company')
      .populate('project', 'name')
      .populate('issuedBy', 'name');

    res.json({ success: true, invoice: serializeInvoice(populated) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client', 'name email userId');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.status = invoice.status === 'paid' ? 'paid' : 'sent';
    invoice.sentAt = new Date();
    await invoice.save();

    let deliveryMessage = 'Invoice marked as sent';
    const canEmail = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS && invoice.client?.email);

    if (canEmail) {
      try {
        await sendEmail({
          to: invoice.client.email,
          subject: `Invoice ${invoice.invoiceNumber} - RISE WITH MEDIA`,
html: `<p>Dear ${invoice.client.name},</p><p>Your invoice <strong>${invoice.invoiceNumber}</strong> for <strong>Rs. ${invoice.total.toFixed(2)}</strong> is now available.</p>`
        });
        deliveryMessage = 'Invoice sent to client';
      } catch (_) {
        deliveryMessage = 'Invoice marked as sent, but email delivery is unavailable';
      }
    } else {
      deliveryMessage = 'Invoice marked as sent. SMTP is not configured, so no email was sent';
    }

    if (invoice.client?.userId) {
      await createNotification({
        recipient: invoice.client.userId,
        sender: req.user._id,
        type: 'invoice_sent',
        title: 'Invoice Sent',
        message: `New invoice has been generated for ${invoice.project?.name || 'your project'}. Please review your invoice.`,
        link: '/portal/invoices',
      }, req.app.get('io'));
    }

    const finance = await Finance.findOne(withWorkspaceScope(req, { clientId: invoice.client?._id || invoice.client, projectId: invoice.project }));
    if (finance) {
      finance.invoiceStatus = 'Sent';
      await finance.save();
    }

    await createActivityLog({
      actor: req.user,
      action: 'invoice.sent',
      entityType: 'invoice',
      entityId: invoice._id,
      title: 'Invoice sent',
      description: `Invoice ${invoice.invoiceNumber} was marked as sent.`,
      relatedClient: invoice.client?._id || invoice.client,
      relatedProject: invoice.project,
    });

    res.json({ success: true, message: deliveryMessage, invoice: serializeInvoice(invoice) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markInvoicePaid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client', 'name email phone userId');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Invoice is already marked as paid' });
    }

    const paidAmount = Number(req.body.paidAmount || invoice.total || 0);
    invoice.status = 'paid';
    invoice.paidDate = new Date();
    invoice.paidAmount = paidAmount;
    invoice.balanceAmount = Math.max(Number(invoice.totalAmount || invoice.total || 0) - paidAmount, 0);
    invoice.paymentMethod = req.body.paymentMethod || invoice.paymentMethod || 'manual';
    invoice.paymentReference = req.body.paymentReference || invoice.paymentReference || '';
    await invoice.save();

    await Promise.all([
      recordPayment({
        invoice,
        amount: paidAmount,
        method: invoice.paymentMethod,
        reference: invoice.paymentReference,
        notes: req.body.notes,
        recordedBy: req.user._id,
      }),
      Client.findByIdAndUpdate(invoice.client?._id || invoice.client, { $inc: { totalRevenue: paidAmount } }),
      maybeCreateReferralEarning({ invoice, io: req.app.get('io') }),
    ]);

    const finance = await Finance.findOne(withWorkspaceScope(req, { clientId: invoice.client?._id || invoice.client, projectId: invoice.project }));
    if (finance) {
      finance.invoiceStatus = 'Paid';
      await finance.save();
    }

    if (invoice.client?.userId) {
      await createNotification({
        recipient: invoice.client.userId,
        sender: req.user._id,
        type: 'invoice_paid',
        title: 'Payment Received',
        message: `Payment status updated for ${invoice.client.name}.`,
        link: '/portal/invoices',
      }, req.app.get('io'));
    }

    await createActivityLog({
      actor: req.user,
      action: 'invoice.paid',
      entityType: 'invoice',
      entityId: invoice._id,
      title: 'Invoice paid',
      description: `Invoice ${invoice.invoiceNumber} was marked as paid.`,
      relatedClient: invoice.client?._id || invoice.client,
      relatedProject: invoice.project,
      metadata: {
        paidAmount,
        paymentMethod: invoice.paymentMethod,
        paymentReference: invoice.paymentReference,
      },
    });

    res.json({ success: true, message: 'Invoice marked as paid', invoice: serializeInvoice(invoice) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addPartialPaymentToInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client', 'name userId assignedManager assignedTeam');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const rawAmount = req.body.amountPaid ?? req.body.amount ?? req.body.paidAmount;
    const amount = toNumber(rawAmount);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount paid must be greater than zero' });
    }

    const nextPaidAmount = Number(invoice.paidAmount || 0) + amount;
    invoice.paidAmount = nextPaidAmount;
    invoice.balanceAmount = Math.max(Number(invoice.totalAmount || invoice.total || 0) - nextPaidAmount, 0);
    invoice.paymentMethod = req.body.paymentMethod || invoice.paymentMethod || 'manual';
    invoice.paymentReference = req.body.paymentReference || invoice.paymentReference || '';
    invoice.paidDate = req.body.paymentDate || new Date();
    invoice.status = invoice.balanceAmount === 0 ? 'paid' : 'partially_paid';
    if (invoice.status === 'paid') invoice.viewedByClient = true;
    await invoice.save();

    await recordPayment({
      invoice,
      amount,
      method: invoice.paymentMethod,
      reference: invoice.paymentReference,
      notes: req.body.notes || 'Partial payment',
      recordedBy: req.user._id,
    });

    const finance = await Finance.findOne(withWorkspaceScope(req, { clientId: invoice.client?._id || invoice.client, projectId: invoice.project }));
    if (finance) {
      finance.invoiceStatus = invoice.status === 'paid' ? 'Paid' : 'Partially Paid';
      await finance.save();
    }

    if (invoice.client?.userId) {
      await createNotification({
        recipient: invoice.client.userId,
        sender: req.user._id,
        type: 'invoice_paid',
        title: 'Payment Updated',
        message: `Payment status updated for ${invoice.client.name}.`,
        link: '/portal/invoices',
        metadata: { invoiceId: invoice._id, amountPaid: amount },
      }, req.app.get('io'));
    }

    res.json({ success: true, invoice: serializeInvoice(invoice) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const markInvoiceViewed = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client', 'name assignedManager assignedTeam');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.viewedByClient = true;
    invoice.viewedAt = new Date();
    if (invoice.status === 'sent') invoice.status = 'viewed';
    await invoice.save();

    const recipients = [
      invoice.createdBy,
      ...(invoice.client?.assignedTeam || []),
      invoice.client?.assignedManager,
    ].filter(Boolean);

    await Promise.all(recipients.map((recipient) => createNotification({
      recipient,
      sender: req.user._id,
      type: 'invoice_sent',
      title: 'Invoice Viewed',
      message: `Invoice ${invoice.invoiceNumber} was viewed by the client.`,
      link: '/finance',
      metadata: { invoiceId: invoice._id },
    }, req.app.get('io'))));

    res.json({ success: true, invoice: serializeInvoice(invoice) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInvoiceByPublicLink = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoicePublicLink: req.params.publicLink })
      .populate('client', 'name company email phone')
      .populate('project', 'name');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const payments = await Payment.find({ invoice: invoice._id }).sort({ paidAt: -1 });
    res.json({ success: true, invoice: serializeInvoice(invoice), payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    await Payment.deleteMany({ invoice: invoice._id });
    if (invoice.status === 'paid' && Number(invoice.paidAmount || 0) > 0) {
      await Client.findByIdAndUpdate(invoice.client, { $inc: { totalRevenue: -Number(invoice.paidAmount || 0) } });
    }

    await createActivityLog({
      actor: req.user,
      action: 'invoice.deleted',
      entityType: 'invoice',
      entityId: invoice._id,
      title: 'Invoice deleted',
      description: `Invoice ${invoice.invoiceNumber} was deleted.`,
      relatedClient: invoice.client,
      relatedProject: invoice.project,
      metadata: { total: invoice.total },
    });

    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPayments = async (req, res) => {
  try {
    const { client, search, page = 1, limit = 25 } = req.query;
    const filter = {};

    if (client) filter.client = client;
    if (req.user.role === 'client') {
      const clientRecord = await getClientForUser(req.user._id);
      filter.client = clientRecord?._id || null;
    }
    if (search) {
      filter.$or = [
        { method: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('invoice', 'invoiceNumber status total dueDate')
      .populate('client', 'name company')
      .populate('project', 'name')
      .populate('recordedBy', 'name')
      .sort({ paidAt: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- CALL HISTORY ----

export const getCallHistory = async (req, res) => {
  try {
    const { clientId, leadId, projectId, callPurpose, callDate, addedBy } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (leadId) filter.leadId = leadId;
    if (projectId) filter.projectId = projectId;
    if (callPurpose) filter.callPurpose = callPurpose;
    if (addedBy) filter.addedBy = addedBy;
    if (callDate) {
      const date = new Date(callDate);
      if (!Number.isNaN(date.getTime())) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        filter.callDate = { $gte: start, $lte: end };
      }
    }

    const scopedFilter = await buildScopedFilter(req, filter, {
      respectClientVisibility: req.user.role === 'client',
    });

    const calls = await CallHistory.find(scopedFilter)
      .populate('clientId', 'name company')
      .populate('leadId', 'name company')
      .populate('projectId', 'name')
      .populate('relatedTaskId', 'title taskTitle')
      .populate('relatedInvoiceId', 'invoiceNumber')
      .populate('addedBy', 'name')
      .sort({ callDate: -1, createdAt: -1 });

    res.json({ success: true, calls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCallHistory = async (req, res) => {
  try {
    let clientId = undefined;
    let projectId = undefined;
    const leadId = req.body.leadId || req.body.lead || undefined;

    if (!leadId && !req.body.unregisteredClientName) {
      const match = await resolveClientProject({
        clientId: req.body.clientId || req.body.client,
        projectId: req.body.projectId || req.body.project,
      });
      if (!match.ok) return res.status(match.status).json({ success: false, message: match.message });
      clientId = match.client?._id;
      projectId = match.project?._id;
    } else {
      projectId = req.body.projectId || req.body.project || undefined;
    }

    const call = await CallHistory.create({
      organizationId: req.user.organizationId,
      brandId: req.headers['x-workspace-id'] || undefined,
      clientId,
      leadId,
      projectId,
      callDate: req.body.callDate || new Date(),
      callTime: req.body.callTime || '',
      callType: req.body.callType || 'Outgoing',
      spokenWith: req.body.spokenWith || '',
      contactNumber: req.body.contactNumber || '',
      callPurpose: req.body.callPurpose || 'General Update',
      callSummary: req.body.callSummary || '',
      clientResponse: req.body.clientResponse || '',
      nextAction: req.body.nextAction || '',
      nextFollowUpDate: req.body.nextFollowUpDate || undefined,
      relatedTaskId: req.body.relatedTaskId || undefined,
      relatedInvoiceId: req.body.relatedInvoiceId || undefined,
      visibleToClient: normalizeBoolean(req.body.visibleToClient),
      allowAssignedPersonAccess: normalizeBoolean(req.body.allowAssignedPersonAccess, true),
      addedBy: req.user._id,
      unregisteredClientName: req.body.unregisteredClientName || '',
      unregisteredClientPhone: req.body.unregisteredClientPhone || '',
      unregisteredClientAddress: req.body.unregisteredClientAddress || '',
    });

    const populated = await CallHistory.findById(call._id)
      .populate('clientId', 'name company')
      .populate('leadId', 'name company')
      .populate('projectId', 'name')
      .populate('addedBy', 'name');

    res.status(201).json({ success: true, call: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCallHistory = async (req, res) => {
  try {
    const call = await CallHistory.findOne(await buildScopedFilter(req, { _id: req.params.id }, { respectClientVisibility: req.user.role === 'client' }));
    if (!call) return res.status(404).json({ success: false, message: 'Call history not found' });

    Object.assign(call, {
      clientId: req.body.clientId !== undefined ? (req.body.clientId || undefined) : call.clientId,
      leadId: req.body.leadId !== undefined ? (req.body.leadId || undefined) : call.leadId,
      projectId: req.body.projectId !== undefined ? (req.body.projectId || undefined) : call.projectId,
      callDate: req.body.callDate || call.callDate,
      callTime: req.body.callTime ?? call.callTime,
      callType: req.body.callType || call.callType,
      spokenWith: req.body.spokenWith ?? call.spokenWith,
      contactNumber: req.body.contactNumber ?? call.contactNumber,
      callPurpose: req.body.callPurpose || call.callPurpose,
      callSummary: req.body.callSummary ?? call.callSummary,
      clientResponse: req.body.clientResponse ?? call.clientResponse,
      nextAction: req.body.nextAction ?? call.nextAction,
      nextFollowUpDate: req.body.nextFollowUpDate || call.nextFollowUpDate,
      relatedTaskId: req.body.relatedTaskId || call.relatedTaskId,
      relatedInvoiceId: req.body.relatedInvoiceId || call.relatedInvoiceId,
      visibleToClient: req.body.visibleToClient !== undefined ? normalizeBoolean(req.body.visibleToClient) : call.visibleToClient,
      unregisteredClientName: req.body.unregisteredClientName !== undefined ? req.body.unregisteredClientName : call.unregisteredClientName,
      unregisteredClientPhone: req.body.unregisteredClientPhone !== undefined ? req.body.unregisteredClientPhone : call.unregisteredClientPhone,
      unregisteredClientAddress: req.body.unregisteredClientAddress !== undefined ? req.body.unregisteredClientAddress : call.unregisteredClientAddress,
    });
    await call.save();

    const populated = await CallHistory.findById(call._id)
      .populate('clientId', 'name company')
      .populate('leadId', 'name company')
      .populate('projectId', 'name')
      .populate('addedBy', 'name');

    res.json({ success: true, call: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCallHistory = async (req, res) => {
  try {
    const call = await CallHistory.findOneAndDelete(await buildScopedFilter(req, { _id: req.params.id }));
    if (!call) return res.status(404).json({ success: false, message: 'Call history not found' });
    res.json({ success: true, message: 'Call history deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCallHistoryByClient = async (req, res) => {
  req.query.clientId = req.params.clientId;
  return getCallHistory(req, res);
};

export const getCallHistoryByProject = async (req, res) => {
  req.query.projectId = req.params.projectId;
  return getCallHistory(req, res);
};

export const getTodayFollowUpCalls = async (req, res) => {
  try {
    const { start, end } = getTodayRange();
    const scopedFilter = await buildScopedFilter(req, { nextFollowUpDate: { $gte: start, $lte: end } }, {
      respectClientVisibility: req.user.role === 'client',
    });
    const calls = await CallHistory.find(scopedFilter)
      .populate('clientId', 'name company')
      .populate('projectId', 'name')
      .populate('addedBy', 'name')
      .sort({ nextFollowUpDate: 1 });

    res.json({ success: true, calls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- EXPENSES ----

export const getExpenses = async (req, res) => {
  try {
    const { status, category, transactionType, search, sort = 'date_desc', month, startDate, endDate, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (transactionType) filter.transactionType = transactionType;

    // SuperAdmin and Manager can view all company expenses, employees only see theirs
    if (!['superAdmin', 'manager'].includes(req.user.role) && !req.user?.permissions?.canManageFinance) {
      filter.submittedBy = req.user._id;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { customCategory: { $regex: search, $options: 'i' } },
      ];
    }

    if (month) {
      // Month format: YYYY-MM
      const [y, m] = month.split('-').map(Number);
      if (y && m) {
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        filter.date = { $gte: start, $lte: end };
      }
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.date.$lte = eDate;
      }
    }

    let sortOption = { date: -1 };
    if (sort === 'date_asc') sortOption = { date: 1 };
    else if (sort === 'date_desc') sortOption = { date: -1 };
    else if (sort === 'amount_desc') sortOption = { amount: -1 };
    else if (sort === 'amount_asc') sortOption = { amount: 1 };

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .populate('submittedBy', 'name avatar')
      .populate('approvedBy', 'name')
      .populate('updatedBy', 'name')
      .populate('project', 'name')
      .populate('client', 'name company')
      .sort(sortOption)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    if (!req.body.title?.trim()) {
      return res.status(400).json({ success: false, message: 'Expense title is required' });
    }

    const match = await resolveClientProject({ clientId: req.body.client, projectId: req.body.project });
    if (!match.ok) return res.status(match.status).json({ success: false, message: match.message });

    const isManagerOrAdmin = ['superAdmin', 'manager'].includes(req.user.role) || Boolean(req.user?.permissions?.canManageFinance);
    const defaultStatus = isManagerOrAdmin ? 'approved' : 'pending';

    const expense = await Expense.create({
      ...req.body,
      amount: Number(req.body.amount) || 0,
      client: match.client?._id,
      project: match.project?._id,
      submittedBy: req.user._id,
      approvedBy: isManagerOrAdmin ? req.user._id : undefined,
      status: req.body.status || defaultStatus,
      transactionType: req.body.transactionType || 'Expense',
      customCategory: req.body.customCategory?.trim() || '',
    });

    await createActivityLog({
      actor: req.user,
      action: 'expense.created',
      entityType: 'expense',
      entityId: expense._id,
      title: 'Expense created',
      description: `${expense.title} was recorded (${expense.transactionType}).`,
      relatedClient: expense.client,
      relatedProject: expense.project,
      metadata: { amount: expense.amount, status: expense.status, transactionType: expense.transactionType },
    });

    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense record not found' });

    const isManagerOrAdmin = ['superAdmin', 'manager'].includes(req.user.role) || Boolean(req.user?.permissions?.canManageFinance);
    if (!isManagerOrAdmin && expense.submittedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this expense' });
    }

    const match = await resolveClientProject({ clientId: req.body.client, projectId: req.body.project });
    if (!match.ok) return res.status(match.status).json({ success: false, message: match.message });

    if (req.body.title !== undefined) expense.title = req.body.title;
    if (req.body.amount !== undefined) expense.amount = Number(req.body.amount) || 0;
    if (req.body.category !== undefined) expense.category = req.body.category;
    if (req.body.customCategory !== undefined) expense.customCategory = req.body.customCategory.trim();
    if (req.body.transactionType !== undefined) expense.transactionType = req.body.transactionType;
    if (req.body.date !== undefined) expense.date = req.body.date;
    if (req.body.notes !== undefined) expense.notes = req.body.notes;
    if (req.body.status !== undefined) expense.status = req.body.status;
    expense.client = match.client?._id;
    expense.project = match.project?._id;
    expense.updatedBy = req.user._id;

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('submittedBy', 'name avatar')
      .populate('approvedBy', 'name')
      .populate('updatedBy', 'name')
      .populate('project', 'name')
      .populate('client', 'name company');

    await createActivityLog({
      actor: req.user,
      action: 'expense.updated',
      entityType: 'expense',
      entityId: expense._id,
      title: 'Expense updated',
      description: `${expense.title} was updated by ${req.user.name}.`,
      relatedClient: expense.client,
      relatedProject: expense.project,
      metadata: { amount: expense.amount, status: expense.status },
    });

    res.json({ success: true, expense: updatedExpense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense record not found' });

    const isManagerOrAdmin = ['superAdmin', 'manager'].includes(req.user.role) || Boolean(req.user?.permissions?.canManageFinance);
    if (!isManagerOrAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this expense' });
    }

    await expense.deleteOne();

    await createActivityLog({
      actor: req.user,
      action: 'expense.deleted',
      entityType: 'expense',
      entityId: req.params.id,
      title: 'Expense deleted',
      description: `${expense.title} was deleted.`,
    });

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveExpense = async (req, res) => {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
    }

    const expense = await Expense.findById(req.params.id).populate('submittedBy', 'name');
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    expense.status = action === 'approve' ? 'approved' : 'rejected';
    expense.approvedBy = req.user._id;
    await expense.save();

    if (expense.submittedBy?._id) {
      await createNotification({
        recipient: expense.submittedBy._id,
        sender: req.user._id,
        type: 'general',
        title: `Expense ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `${expense.title} was ${action === 'approve' ? 'approved' : 'rejected'}.`,
        link: '/finance',
      }, req.app.get('io'));
    }

    await createActivityLog({
      actor: req.user,
      action: 'expense.approval.updated',
      entityType: 'expense',
      entityId: expense._id,
      title: 'Expense status updated',
      description: `${expense.title} was ${action === 'approve' ? 'approved' : 'rejected'}.`,
      relatedClient: expense.client,
      relatedProject: expense.project,
      metadata: { status: expense.status },
    });

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyExpenseReport = async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || (now.getMonth() + 1);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const [monthlyInvoices, monthlyExpensesData] = await Promise.all([
      Invoice.aggregate([
        { $match: { status: 'paid', paidDate: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, totalRevenue: { $sum: '$paidAmount' } } },
      ]),
      Expense.find({
        date: { $gte: startOfMonth, $lte: endOfMonth },
        status: 'approved',
      })
        .populate('submittedBy', 'name')
        .populate('approvedBy', 'name')
        .populate('client', 'name company')
        .populate('project', 'name')
        .sort({ date: -1 }),
    ]);

    const totalRevenue = monthlyInvoices[0]?.totalRevenue || 0;
    
    // Total expenses vs profits logged in month
    let totalExpenses = 0;
    let totalProfitsAdded = 0;

    const categoryTotals = {
      rj: 0,
      video_shoot: 0,
      travel_allowance: 0,
      ads_campaign: 0,
      salary: 0,
      tools: 0,
      advertising: 0,
      travel: 0,
      office: 0,
      freelance: 0,
      misc: 0,
      other: 0,
    };

    monthlyExpensesData.forEach((item) => {
      const amt = Number(item.amount) || 0;
      if (item.transactionType === 'Profit') {
        totalProfitsAdded += amt;
      } else {
        totalExpenses += amt;
        const cat = item.category || 'misc';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });

    const netProfit = (totalRevenue + totalProfitsAdded) - totalExpenses;
    const profitMargin = (totalRevenue + totalProfitsAdded) > 0 
      ? Number((((netProfit) / (totalRevenue + totalProfitsAdded)) * 100).toFixed(1)) 
      : 0;

    res.json({
      success: true,
      report: {
        year,
        month,
        totalRevenue,
        totalExpenses,
        totalProfitsAdded,
        netProfit,
        profitMargin,
        categoryTotals,
        expensesCount: monthlyExpensesData.length,
        expenses: monthlyExpensesData,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFinanceSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRevenue, monthRevenue, totalExpenses, overdueInvoices, pendingInvoices] = await Promise.all([
      Invoice.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid', paidDate: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
      Expense.aggregate([{ $match: { status: 'approved', transactionType: { $ne: 'Profit' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Invoice.countDocuments({ status: 'overdue' }),
      Invoice.countDocuments({ status: { $in: ['draft', 'sent'] } }),
    ]);

    const revenueValue = totalRevenue[0]?.total || 0;
    const expenseValue = totalExpenses[0]?.total || 0;

    res.json({
      success: true,
      summary: {
        totalRevenue: revenueValue,
        monthRevenue: monthRevenue[0]?.total || 0,
        totalExpenses: expenseValue,
        profit: revenueValue - expenseValue,
        overdueInvoices,
        pendingInvoices,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- FINANCE DASHBOARD SUMMARY (for sidebar widget & finance page header) ----
// Available to superAdmin and manager — aggregates Finance records + expenses + invoices

export const getFinanceDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate Finance (payment tracking) records
    const [financeAgg, invoiceAgg, sentInvoicesCount, expenseAgg, overdueRecordsCount] = await Promise.all([
      Finance.aggregate([
        {
          $group: {
            _id: null,
            totalProjectAmount: { $sum: '$totalProjectAmount' },
            totalPaidAmount:    { $sum: '$totalPaidAmount' },
            totalBalance:       { $sum: '$balanceAmount' },
          },
        },
      ]),
      // Invoices: count by status
      Invoice.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total' },
            totalPaid:   { $sum: '$paidAmount' },
          },
        },
      ]),
      // Sent (active) invoices
      Invoice.countDocuments({ status: { $in: ['sent', 'viewed', 'partially_paid'] } }),
      // Approved expenses this month + all time
      Expense.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id: null,
            totalAllTime: { $sum: '$amount' },
            totalThisMonth: {
              $sum: {
                $cond: [{ $gte: ['$date', startOfMonth] }, '$amount', 0],
              },
            },
          },
        },
      ]),
      // Overdue finance records
      Finance.countDocuments({
        balanceAmount: { $gt: 0 },
        paymentDueDate: { $lt: now },
      }),
    ]);

    const fa = financeAgg[0] || {};
    const expenses = expenseAgg[0] || {};

    // Build invoice status map
    const invoiceStatusMap = {};
    invoiceAgg.forEach((row) => { invoiceStatusMap[row._id] = row; });

    const totalCollected  = fa.totalPaidAmount   || 0;
    const totalPending    = fa.totalBalance       || 0;
    const totalContracted = fa.totalProjectAmount || 0;
    const totalExpenses   = expenses.totalAllTime  || 0;
    const monthExpenses   = expenses.totalThisMonth || 0;
    const netProfit       = totalCollected - totalExpenses;
    const openInvoices    = sentInvoicesCount || 0;
    const paidInvoices    = invoiceStatusMap['paid']?.count || 0;
    const overdueInvoices = overdueRecordsCount || 0;

    res.json({
      success: true,
      summary: {
        totalContracted,
        totalCollected,
        totalPending,
        totalExpenses,
        monthExpenses,
        netProfit,
        openInvoices,
        paidInvoices,
        overdueRecords: overdueInvoices,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
