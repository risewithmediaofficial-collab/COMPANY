import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Download, Receipt, Share2, AlertTriangle } from '@/components/ui/muiIcons';
import api from '../../../api';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { exportInvoiceToPDF } from '../../../utils/pdfExport';
import { ShareInvoiceModal } from '../../../components/modals/ShareInvoiceModal';
import { useDateFilter } from '../../../context/DateFilterContext';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const statusMeta = {
  Draft: { badgeClass: 'bg-muted text-muted-foreground border border-border', icon: Clock },
  Sent: { badgeClass: 'bg-secondary text-foreground border border-border', icon: Clock },
  Viewed: { badgeClass: 'bg-secondary text-foreground border border-border', icon: Clock },
  'Partially Paid': { badgeClass: 'bg-secondary text-foreground border border-border', icon: AlertTriangle },
  Paid: { badgeClass: 'bg-primary text-primary-foreground', icon: CheckCircle2 },
  Overdue: { badgeClass: 'bg-secondary text-foreground border border-foreground/40', icon: AlertTriangle },
  Cancelled: { badgeClass: 'bg-muted text-muted-foreground border border-border', icon: AlertTriangle },
};

const normalizeStatus = (status) => {
  const map = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
  };
  return map[status] || status || 'Draft';
};

export default function PortalInvoices() {
  const { isDateInRange } = useDateFilter();
  const [rawInvoices, setInvoices] = useState([]);
  const [financeRecords, setFinanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareInvoice, setShareInvoice] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    api.get('/portal/invoices')
      .then((response) => {
        const nextInvoices = response.data.invoices || [];
        setInvoices(nextInvoices);
        setFinanceRecords(response.data.financeRecords || []);
        nextInvoices
          .filter((invoice) => ['sent', 'draft'].includes(String(invoice.status).toLowerCase()))
          .forEach((invoice) => {
            api.post(`/finance/invoices/${invoice._id}/viewed`).catch(() => {});
          });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const invoices = useMemo(
    () => rawInvoices.filter((inv) => isDateInRange([inv.issueDate, inv.dueDate, inv.createdAt])),
    [rawInvoices, isDateInRange]
  );

  const summary = useMemo(() => ({
    total: invoices.reduce((sum, item) => sum + Number(item.totalAmount || item.total || 0), 0),
    paid: invoices.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
    balance: invoices.reduce((sum, item) => sum + Number(item.balanceAmount !== undefined ? item.balanceAmount : Math.max(0, (item.totalAmount || item.total || 0) - (item.paidAmount || 0))), 0),
    overdue: invoices.filter((item) => normalizeStatus(item.status) === 'Overdue').length,
  }), [invoices]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-black text-foreground">Finance & Invoices</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Review your quoted amounts, payments made, balance due, and download invoice PDFs.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Amount Quoted', val: currency.format(summary.total) },
          { label: 'Amount Paid', val: currency.format(summary.paid) },
          { label: 'Balance Due', val: currency.format(summary.balance) },
          { label: 'Overdue Invoices', val: summary.overdue },
        ].map((item) => (
          <motion.div key={item.label} whileHover={{ y: -2 }} className="rounded-2xl p-4 bg-card border border-border shadow-xs">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
            <p className="text-xl font-black text-foreground tabular-nums">{item.val}</p>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : !invoices.length ? (
        <div className="flex flex-col items-center rounded-2xl py-16 border border-border bg-card">
          <Receipt size={36} className="mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm font-medium text-muted-foreground">No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const normalizedStatus = normalizeStatus(invoice.status);
            const meta = statusMeta[normalizedStatus] || statusMeta.Draft;
            const Icon = meta.icon;
            const financeRecord = financeRecords.find((item) => (item.projectId?._id || item.projectId) === (invoice.project?._id || invoice.project));
            return (
              <div key={invoice._id} className="rounded-3xl p-4 sm:p-5 bg-card border border-border shadow-xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold ${meta.badgeClass}`}>
                        <Icon size={10} className="shrink-0" />
                        <span>{normalizedStatus}</span>
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-foreground tabular-nums">{invoice.invoiceNumber}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{invoice.projectName || invoice.project?.name || 'No linked project'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-semibold text-foreground transition-all hover:bg-secondary min-h-[38px] cursor-pointer"
                      onClick={() => exportInvoiceToPDF(invoice, { save: true })}
                    >
                      <Download size={14} className="shrink-0" />
                      Download PDF
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-semibold text-foreground transition-all hover:bg-secondary min-h-[38px] cursor-pointer"
                      onClick={() => {
                        setShareInvoice(invoice);
                        setShareModalOpen(true);
                      }}
                    >
                      <Share2 size={14} className="shrink-0" />
                      Share
                    </button>
                    {invoice.paymentLink ? (
                      <a href={invoice.paymentLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors min-h-[38px]">
                        Pay Now
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 tabular-nums">
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Amount Quoted</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{currency.format(Number(invoice.totalAmount || invoice.total || 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Amount Paid</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{currency.format(Number(invoice.paidAmount || 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Balance Due</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{currency.format(Number(invoice.balanceAmount !== undefined ? invoice.balanceAmount : Math.max(0, (invoice.totalAmount || invoice.total || 0) - (invoice.paidAmount || 0))))}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Due Date</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Payment Instructions</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{invoice.paymentTerms || 'No payment instructions shared yet.'}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Payment History</p>
                    {(financeRecord?.paymentHistory || invoice.paymentHistory || []).length ? (
                      <div className="mt-2 space-y-2 tabular-nums">
                        {(financeRecord?.paymentHistory || invoice.paymentHistory || []).map((item, index) => (
                          <div key={`${item._id || item.reference || index}`} className="rounded-xl bg-card border border-border/60 p-3 text-sm text-foreground shadow-xs">
                            <p className="font-semibold">{currency.format(Number(item.amountPaid || item.amount || 0))} via {item.paymentMode || item.method || 'Manual'}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.noteTitle || item.noteDescription || item.notes || 'Payment update'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No payment history available.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {shareModalOpen && shareInvoice && (
        <ShareInvoiceModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          invoice={shareInvoice}
        />
      )}
    </div>
  );
}
