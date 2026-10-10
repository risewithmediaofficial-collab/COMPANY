// =============================================
// INVOICE MODEL - Finance Module
// =============================================

import mongoose from 'mongoose';
import crypto from 'crypto';

const lineItemSchema = new mongoose.Schema({
  serviceName: { type: String, default: '' },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, min: 0 },
  rate: { type: Number, min: 0 },
  amount: { type: Number, min: 0 },
  total: { type: Number }, // computed: quantity * unitPrice
  itemType: {
    type: String,
    enum: ['service', 'ad_budget_pass_through', 'management_fee'],
    default: 'service',
  },
});

const clientDetailsSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  businessName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
}, { _id: false });

const invoiceSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },
    invoiceNumber: { type: String, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    servicePeriod: { type: String, default: '' }, // e.g. "October 2026"
    servicePeriodStart: { type: Date },
    servicePeriodEnd: { type: Date },
    isRetainer: { type: Boolean, default: false },
    serviceDetails: { type: String, default: '' },
    clientDetails: { type: clientDetailsSchema, default: () => ({}) },
    workflowStatus: {
      type: String,
      enum: ['draft', 'under_review', 'issued', 'void'],
      default: 'draft',
    },
    status: {
      type: String,
      enum: ['draft', 'unpaid', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled', 'void'],
      default: 'draft',
    },
    voidReason: { type: String, default: '' },
    voidedAt: { type: Date },
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    taxType: {
      type: String,
      enum: ['exempt', 'exclusive', 'inclusive', 'gst_18', 'custom'],
      default: 'exclusive',
    },
    serviceRevenue: { type: Number, default: 0 },
    passThroughAdBudget: { type: Number, default: 0 },
    managementFee: { type: Number, default: 0 },
    lineItems: [lineItemSchema],
    invoiceItems: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 }, // percentage
    taxAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    issueDate: { type: Date, default: Date.now },
    invoiceDate: { type: Date },
    dueDate: { type: Date },
    paidDate: { type: Date },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentMethod: { type: String },
    paymentReference: { type: String },
    paymentLink: { type: String, default: '' },
    notes: { type: String },
    quotedAmount: { type: Number, default: 0 },
    payments: [{
      amount: { type: Number, default: 0 },
      method: { type: String, default: 'manual' },
      reference: { type: String, default: '' },
      paidAt: { type: Date, default: Date.now },
      notes: { type: String, default: '' },
    }],
    terms: { type: String, default: 'Payment due within 30 days' },
    paymentTerms: { type: String, default: '' },
    pdfUrl: { type: String },
    sentAt: { type: Date },
    viewedAt: { type: Date },
    viewedByClient: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    invoicePublicLink: { type: String, unique: true, sparse: true },
    allowAssignedPersonAccess: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto generate invoice number
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`;
  }
  if (!this.invoicePublicLink) {
    this.invoicePublicLink = crypto.randomBytes(10).toString('hex');
  }

  const sourceItems = this.invoiceItems?.length ? this.invoiceItems : this.lineItems;
  // Compute line item totals
  this.lineItems = sourceItems.map((item) => {
    const raw = item?.toObject ? item.toObject() : item;
    const unitPrice = Number(raw.unitPrice ?? raw.rate ?? 0);
    const quantity = Number(raw.quantity || 1);
    const total = Number(raw.amount ?? raw.total ?? unitPrice * quantity);
    return {
      ...raw,
      unitPrice,
      rate: unitPrice,
      quantity,
      amount: total,
      total,
    };
  });
  this.invoiceItems = this.lineItems;
  this.subtotal = this.lineItems.reduce((sum, item) => sum + item.total, 0);

  // Distinguish service revenue, agency management fee, and pass-through client ad budget
  let svcRev = 0;
  let passThrough = 0;
  let mgmtFee = 0;
  this.lineItems.forEach((item) => {
    if (item.itemType === 'ad_budget_pass_through') {
      passThrough += item.total;
    } else if (item.itemType === 'management_fee') {
      mgmtFee += item.total;
      svcRev += item.total;
    } else {
      svcRev += item.total;
    }
  });
  this.serviceRevenue = svcRev;
  this.passThroughAdBudget = passThrough;
  this.managementFee = mgmtFee;

  if (this.taxType === 'exempt') {
    this.taxRate = 0;
    this.taxAmount = 0;
  } else if (this.taxType === 'gst_18' && !this.taxRate) {
    this.taxRate = 18;
    this.taxAmount = (this.subtotal * 18) / 100;
  } else {
    this.taxAmount = (this.subtotal * (this.taxRate || 0)) / 100;
  }
  this.tax = this.taxAmount;
  this.total = this.subtotal + this.taxAmount - (this.discount || 0);
  this.totalAmount = this.total;
  this.balanceAmount = Math.max(this.total - Number(this.paidAmount || 0), 0);
  this.invoiceDate = this.invoiceDate || this.issueDate;
  this.clientId = this.clientId || this.client;
  this.projectId = this.projectId || this.project;

  // Derive status
  if (this.workflowStatus === 'void' || this.status === 'void') {
    this.status = 'void';
    this.workflowStatus = 'void';
  } else if (this.workflowStatus === 'draft' || this.status === 'draft') {
    this.status = 'draft';
  } else if (this.balanceAmount === 0 && this.total > 0) {
    this.status = 'paid';
  } else if (Number(this.paidAmount || 0) > 0) {
    this.status = 'partially_paid';
  } else {
    this.status = 'unpaid';
  }

  next();
});

invoiceSchema.index({ client: 1 });
invoiceSchema.index({ organizationId: 1 });
invoiceSchema.index({ brandId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
