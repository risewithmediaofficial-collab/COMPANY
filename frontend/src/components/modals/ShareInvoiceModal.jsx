import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
  X,
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
      <DialogContent
        variant="center"
        size="lg"
        noPadding
        hideCloseButton
        className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-xl max-h-[90dvh]"
      >
        {/* Pinned Sticky Header */}
        <DialogHeader className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-border bg-card shrink-0 select-none">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                <Share2 size={20} />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-xl font-bold text-foreground">
                  Share Invoice
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Send {invoice.invoiceNumber} to {clientName}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted border border-border rounded-md">
                ESC
              </span>
              <DialogClose className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
          {/* Summary Box */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1.5">
            <div className="flex justify-between items-center text-sm font-semibold text-foreground">
              <span className="font-bold">{invoice.invoiceNumber}</span>
              <span className="text-primary font-extrabold text-base">{totalStr}</span>
            </div>
            <p className="text-xs text-muted-foreground">Client: <span className="font-medium text-foreground">{clientName}</span></p>
            {invoice.dueDate && (
              <p className="text-xs text-muted-foreground">Due Date: <span className="font-medium text-foreground">{dueDateStr}</span></p>
            )}
          </div>

          {/* Quick Sharing Options */}
          <div className="space-y-5">
            {/* WhatsApp */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <MessageCircle size={18} />
                <span>Share via WhatsApp</span>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">Client Phone Number</label>
                <Input
                  placeholder="e.g. 9876543210 (with country code)"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="bg-background h-11 rounded-xl text-sm border-border"
                />
              </div>
              <Button
                onClick={handleWhatsAppShare}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11 rounded-xl text-sm font-semibold shadow-xs"
              >
                <MessageCircle size={16} /> Send via WhatsApp
              </Button>
            </div>

            {/* Email & Client Portal */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Email & Client Portal</p>
                  <p className="text-xs text-muted-foreground">Notify client portal & send notification email</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleSendEmailPortal}
                disabled={sendInvoice.isPending}
                className="h-11 px-5 rounded-xl text-sm font-semibold shrink-0"
              >
                {sendInvoice.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>

            {/* Copy Shareable Link */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <label className="text-sm font-semibold text-foreground block">Shareable Public Invoice Link</label>
              <div className="flex gap-2.5">
                <Input value={publicLink} readOnly className="bg-background h-11 rounded-xl text-sm text-muted-foreground" />
                <Button variant="outline" onClick={handleCopyLink} className="gap-2 h-11 px-5 rounded-xl text-sm shrink-0 font-semibold">
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Sticky Footer */}
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3 z-10 shadow-xs select-none">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} className="gap-2 h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold">
              <Download size={15} /> Download PDF
            </Button>
            {navigator.share && (
              <Button variant="ghost" onClick={handleNativeShare} className="gap-2 h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm text-muted-foreground font-semibold">
                <Share2 size={15} /> Device Share
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm ml-auto sm:ml-0"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

