import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Download, Receipt, Share2, TriangleAlert } from 'lucide-react';
import api from '../../../api';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { exportInvoiceToPDF } from '../../../utils/pdfExport';
import { ShareInvoiceModal } from '../../../components/modals/ShareInvoiceModal';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const statusMeta = {
  Draft: { color: '#64748b', icon: Clock },
  Sent: { color: '#3b82f6', icon: Clock },
  Viewed: { color: '#0ea5e9', icon: Clock },
  'Partially Paid': { color: '#f59e0b', icon: TriangleAlert },
  Paid: { color: '#10b981', icon: CheckCircle2 },
  Overdue: { color: '#ef4444', icon: TriangleAlert },
  Cancelled: { color: '#64748b', icon: TriangleAlert },
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

export default function PortalInvoices({ dark }) {
  const [invoices, setInvoices] = useState([]);
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

  const txt = dark ? 'text-white' : 'text-slate-800';
  const sub = dark ? 'text-slate-400' : 'text-slate-500';
  const border = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)';

  const summary = useMemo(() => ({
    total: invoices.reduce((sum, item) => sum + Number(item.totalAmount || item.total || 0), 0),
    paid: invoices.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
    balance: invoices.reduce((sum, item) => sum + Number(item.balanceAmount || 0), 0),
    overdue: invoices.filter((item) => normalizeStatus(item.status) === 'Overdue').length,
  }), [invoices]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div>
        <h2 className={`text-xl font-black ${txt}`}>Finance & Invoices</h2>
        <p className={`mt-0.5 text-xs ${sub}`}>Review invoices, paid amount, balance amount, due date, payment instructions, and client-visible payment history.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Amount', val: currency.format(summary.total), color: '#6366f1' },
          { label: 'Paid Amount', val: currency.format(summary.paid), color: '#10b981' },
          { label: 'Balance Amount', val: currency.format(summary.balance), color: '#f59e0b' },
          { label: 'Overdue', val: summary.overdue, color: '#ef4444' },
        ].map((item) => (
          <motion.div key={item.label} whileHover={{ y: -2 }} className="rounded-2xl p-4" style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
            <p className="mb-1 text-xs font-medium" style={{ color: item.color }}>{item.label}</p>
            <p className={`text-xl font-black ${txt}`}>{item.val}</p>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <TableSkeleton columns={6} rows={5} dark={dark} />
      ) : !invoices.length ? (
        <div className="flex flex-col items-center rounded-2xl py-16" style={{ border }}>
          <Receipt size={36} className="mb-3 text-slate-500" />
          <p className={`text-sm font-medium ${sub}`}>No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const normalizedStatus = normalizeStatus(invoice.status);
            const meta = statusMeta[normalizedStatus] || statusMeta.Draft;
            const Icon = meta.icon;
            const financeRecord = financeRecords.find((item) => (item.projectId?._id || item.projectId) === (invoice.project?._id || invoice.project));
            return (
              <div key={invoice._id} className="rounded-3xl p-5" style={{ border, background: dark ? 'rgba(255,255,255,0.03)' : '#fff' }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: `${meta.color}20`, color: meta.color }}>
                        <Icon size={10} className="mr-1 inline" /> {normalizedStatus}
                      </span>
                    </div>
                    <h3 className={`mt-3 text-lg font-bold ${txt}`}>{invoice.invoiceNumber}</h3>
                    <p className={`mt-1 text-sm ${sub}`}>{invoice.projectName || invoice.project?.name || 'No linked project'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-indigo-600 transition-all hover:bg-indigo-50"
                      onClick={() => exportInvoiceToPDF(invoice, { save: true })}
                    >
                      <Download size={14} />
                      Download PDF
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition-all hover:bg-indigo-50"
                      onClick={() => {
                        setShareInvoice(invoice);
                        setShareModalOpen(true);
                      }}
                    >
                      <Share2 size={14} />
                      Share
                    </button>
                    {invoice.paymentLink ? (
                      <a href={invoice.paymentLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                        Pay Now
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200/60 p-4">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${sub}`}>Total</p>
                    <p className={`mt-2 text-sm font-semibold ${txt}`}>{currency.format(Number(invoice.totalAmount || invoice.total || 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/60 p-4">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${sub}`}>Paid</p>
                    <p className={`mt-2 text-sm font-semibold ${txt}`}>{currency.format(Number(invoice.paidAmount || 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/60 p-4">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${sub}`}>Balance</p>
                    <p className={`mt-2 text-sm font-semibold ${txt}`}>{currency.format(Number(invoice.balanceAmount || 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/60 p-4">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${sub}`}>Due Date</p>
                    <p className={`mt-2 text-sm font-semibold ${txt}`}>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/60 p-4">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${sub}`}>Payment Instructions</p>
                    <p className={`mt-2 whitespace-pre-wrap text-sm ${txt}`}>{invoice.paymentTerms || 'No payment instructions shared yet.'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/60 p-4">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${sub}`}>Payment History</p>
                    {(financeRecord?.paymentHistory || invoice.paymentHistory || []).length ? (
                      <div className="mt-2 space-y-2">
                        {(financeRecord?.paymentHistory || invoice.paymentHistory || []).map((item, index) => (
                          <div key={`${item._id || item.reference || index}`} className="rounded-xl bg-slate-50/70 p-3 text-sm text-slate-700">
                            <p className="font-semibold">{currency.format(Number(item.amountPaid || item.amount || 0))} via {item.paymentMode || item.method || 'Manual'}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.noteTitle || item.noteDescription || item.notes || 'Payment update'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`mt-2 text-sm ${sub}`}>No payment history available.</p>
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
