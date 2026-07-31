import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check,
  Copy,
  Download,
  Mail,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { useSendInvoice } from '../../hooks/useFinance';
import { exportInvoiceToPDF } from '../../utils/pdfExport';

export const ShareInvoiceModal = ({ open, onOpenChange, invoice }) => {
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const sendInvoice = useSendInvoice();

  if (!invoice) return null;

  const clientName = invoice.clientDetails?.businessName || invoice.clientDetails?.name || invoice.client?.company || invoice.client?.name || invoice.clientName || 'Valued Client';
  const clientPhone = customPhone || invoice.clientDetails?.phone || invoice.client?.phone || '';
  const totalStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(invoice.totalAmount || invoice.total || invoice.amount || 0));
  const balanceStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(invoice.balanceAmount ?? invoice.totalAmount ?? 0));
  const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'On Receipt';
  
  const publicLink = invoice.invoicePublicLink || invoice.publicLink
    ? `${window.location.origin}/invoices/public/${invoice.invoicePublicLink || invoice.publicLink}`
    : invoice.paymentLink || window.location.href;

  const shareText = `Hello ${clientName},\n\n` +
    `Your invoice *${invoice.invoiceNumber || 'Invoice'}* from Rise With Media is ready.\n\n` +
    `📌 *Amount Due:* ${balanceStr} (Total: ${totalStr})\n` +
    `📅 *Due Date:* ${dueDateStr}\n` +
    (invoice.paymentLink ? `💳 *Payment Link:* ${invoice.paymentLink}\n` : '') +
    `🔗 *View Invoice:* ${publicLink}\n\n` +
    `Thank you for your business!`;

  const handleWhatsAppShare = () => {
    let rawPhone = clientPhone.replace(/[^0-9]/g, '');
    if (rawPhone.length === 10) {
      rawPhone = `91${rawPhone}`;
    }
    const whatsappUrl = rawPhone
      ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(shareText)}`
      : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      // Fallback
    }
  };

  const handleSendEmailPortal = () => {
    sendInvoice.mutate(invoice._id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleDownloadPDF = () => {
    exportInvoiceToPDF(invoice, { save: true });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice ${invoice.invoiceNumber} - Rise With Media (${totalStr})`,
          url: publicLink,
        });
      } catch (_) {
        // User cancelled or failed
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Share2 size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Share Invoice</DialogTitle>
              <DialogDescription className="text-xs">
                Send {invoice.invoiceNumber} to client via WhatsApp, Email, or Shareable Link.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary Box */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="flex justify-between items-center text-sm font-semibold text-foreground">
              <span>{invoice.invoiceNumber}</span>
              <span className="text-primary font-bold">{totalStr}</span>
            </div>
            <p className="text-xs text-muted-foreground">Client: {clientName}</p>
            {invoice.dueDate && (
              <p className="text-xs text-muted-foreground">Due Date: {dueDateStr}</p>
            )}
          </div>

          {/* Quick Sharing Options */}
          <div className="grid gap-3">
            {/* WhatsApp */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <MessageCircle size={18} />
                <span>Share via WhatsApp</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Client Phone (e.g. 9876543210)"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="bg-background text-xs"
                />
                <Button
                  onClick={handleWhatsAppShare}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs whitespace-nowrap"
                >
                  <MessageCircle size={14} /> Send WhatsApp
                </Button>
              </div>
            </div>

            {/* Email & Client Portal */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Email & Client Portal</p>
                  <p className="text-xs text-muted-foreground">Notify client portal & send email</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleSendEmailPortal}
                disabled={sendInvoice.isPending}
                className="text-xs"
              >
                {sendInvoice.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>

            {/* Copy Shareable Link */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <label className="text-xs font-semibold text-foreground block">Shareable Public Invoice Link</label>
              <div className="flex gap-2">
                <Input value={publicLink} readOnly className="bg-background text-xs text-muted-foreground" />
                <Button variant="outline" onClick={handleCopyLink} className="gap-2 text-xs">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={handleDownloadPDF} className="gap-2 text-xs">
              <Download size={14} /> Download PDF
            </Button>
            {navigator.share && (
              <Button variant="ghost" onClick={handleNativeShare} className="gap-2 text-xs text-muted-foreground">
                <Share2 size={14} /> Device Share
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
