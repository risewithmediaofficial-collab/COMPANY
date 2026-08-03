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
    serviceDetails: { type: String, default: '' },
    clientDetails: { type: clientDetailsSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
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
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  this.tax = this.taxAmount;
  this.total = this.subtotal + this.taxAmount - this.discount;
  this.totalAmount = this.total;
  this.balanceAmount = Math.max(this.total - Number(this.paidAmount || 0), 0);
  this.invoiceDate = this.invoiceDate || this.issueDate;
  this.clientId = this.clientId || this.client;
  this.projectId = this.projectId || this.project;

  if (this.balanceAmount === 0 && this.total > 0) {
    this.status = 'paid';
  } else if (Number(this.paidAmount || 0) > 0) {
    this.status = 'partially_paid';
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
