import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Printer, FileText, Camera, Users, IndianRupee, MapPin, Calendar, Clock, Plus, Trash2 } from 'lucide-react';

export const DMInvoiceModal = ({
  open,
  onOpenChange,
  eventItem = null,
}) => {
  if (!eventItem) return null;

  const item = eventItem.item || eventItem;
  const activityType = eventItem.activityType || (item.plannedContents !== undefined ? 'video_shoot' : item.platform ? 'vj_promotion' : 'rj_promotion');
  const isVideoShoot = activityType === 'video_shoot';

  // State for Invoice Mode & Customizations
  const [invoicePreset, setInvoicePreset] = useState('client_detailed'); // 'client_detailed' or 'videographer_workorder'
  const [showExpenses, setShowExpenses] = useState(true);
  const [showCrew, setShowCrew] = useState(true);
  const [showEquipment, setShowEquipment] = useState(true);

  // Editable fields
  const [invoiceTitle, setInvoiceTitle] = useState('PRODUCTION INVOICE');
  const [invoiceNumber, setInvoiceNumber] = useState(`RWM-INV-${Date.now().toString().slice(-6)}`);
  const [clientName, setClientName] = useState(item.client?.company || item.client?.name || 'Client');
  const [shootTitle, setShootTitle] = useState(item.shootTitle || item.promotionTitle || 'Shoot / Campaign Activity');
  const [shootLocation, setShootLocation] = useState(item.shootLocation || '');
  const [shootDate, setShootDate] = useState(
    item.shootDate || item.promotionDate ? new Date(item.shootDate || item.promotionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState(item.startTime ? new Date(item.startTime).toTimeString().slice(0, 5) : '09:00');
  const [endTime, setEndTime] = useState(item.endTime ? new Date(item.endTime).toTimeString().slice(0, 5) : '17:00');

  // Editable Financials & Expenses
  const [expensesList, setExpensesList] = useState(
    item.expensesList && item.expensesList.length > 0
      ? item.expensesList
      : [{ title: item.shootTitle || item.promotionTitle || 'Shoot Production Charge', amount: item.totalAmount || 0 }]
  );

  const [totalAmount, setTotalAmount] = useState(item.totalAmount || 0);
  const [amountPaid, setAmountPaid] = useState(item.amountPaid || 0);
  const [invoiceNotes, setInvoiceNotes] = useState('Thank you for choosing Rise With Media. Please verify shoot details and payment terms.');

  // Synchronize when item changes
  useEffect(() => {
    if (open && item) {
      setClientName(item.client?.company || item.client?.name || 'Client');
      setShootTitle(item.shootTitle || item.promotionTitle || 'Shoot Production');
      setShootLocation(item.shootLocation || '');
      setShootDate(
        item.shootDate || item.promotionDate
          ? new Date(item.shootDate || item.promotionDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setStartTime(item.startTime ? new Date(item.startTime).toTimeString().slice(0, 5) : '09:00');
      setEndTime(item.endTime ? new Date(item.endTime).toTimeString().slice(0, 5) : '17:00');
      setTotalAmount(item.totalAmount || 0);
      setAmountPaid(item.amountPaid || 0);
      setExpensesList(
        item.expensesList && item.expensesList.length > 0
          ? item.expensesList
          : [{ title: item.shootTitle || item.promotionTitle || 'Shoot Production Charge', amount: item.totalAmount || 0 }]
      );
    }
  }, [open, item]);

  // Handle Preset Switching
  const handlePresetChange = (preset) => {
    setInvoicePreset(preset);
    if (preset === 'videographer_workorder') {
      setInvoiceTitle('VIDEOGRAPHER WORK ORDER & SHOOT VOUCHER');
      setShowExpenses(false); // Hide internal expenses by default for videographer
      setShowCrew(true);
      setShowEquipment(true);
      setInvoiceNotes('Instructions for Videographer/Crew: Ensure gear preparation, verify shoot location address, and arrive 15 minutes before scheduled start time.');
    } else {
      setInvoiceTitle('CLIENT PRODUCTION INVOICE');
      setShowExpenses(true); // Show itemized expenses breakdown for client
      setShowCrew(true);
      setShowEquipment(false);
      setInvoiceNotes('Official billing invoice issued by Rise With Media. Please remit pending balance as per agreed terms.');
    }
  };

  const handleAddExpenseRow = () => {
    setExpensesList([...expensesList, { title: 'Custom Expense', amount: 1000 }]);
  };

  const handleRemoveExpenseRow = (index) => {
    const updated = expensesList.filter((_, i) => i !== index);
    setExpensesList(updated);
  };

  const handleExpenseChange = (index, field, value) => {
    const updated = [...expensesList];
    updated[index][field] = field === 'amount' ? Number(value) : value;
    setExpensesList(updated);
    if (field === 'amount') {
      const sum = updated.reduce((a, c) => a + Number(c.amount || 0), 0);
      setTotalAmount(sum);
    }
  };

  const balanceAmount = Math.max(Number(totalAmount) - Number(amountPaid), 0);

  // Print Invoice Action
  const handlePrintInvoice = () => {
    const formattedDate = new Date(shootDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const crewMembers = item.assignedTeam || item.rjMembers || item.vjMembers || [];
    const equipmentList = item.equipment || [];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${invoiceTitle} - ${clientName} - Rise With Media</title>
          <style>
            * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Helvetica, sans-serif; }
            body { margin: 0; padding: 40px; color: #1e293b; background: #ffffff; font-size: 13px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
            .brand { display: flex; align-items: center; gap: 14px; }
            .brand img { height: 52px; object-fit: contain; }
            .brand-text h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
            .brand-text p { margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .inv-title { text-align: right; }
            .inv-title h2 { margin: 0; font-size: 22px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px; }
            .inv-title p { margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: #64748b; }

            .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .meta-box h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
            .meta-box p { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; }

            .details-section { margin-top: 24px; }
            .section-title { font-size: 13px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
            .amount-col { text-align: right; font-weight: 700; }

            .totals-container { display: flex; justify-content: flex-end; margin-top: 20px; }
            .totals-table { width: 340px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 13px; }
            .totals-row.grand { background: #0f172a; color: #ffffff; font-weight: 800; font-size: 15px; border-radius: 8px; margin-top: 6px; }
            .totals-row.balance { color: #dc2626; font-weight: 800; font-size: 14px; }

            .crew-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
            .crew-tag { background: #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155; }

            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { border-top: 1.5px dashed #94a3b8; margin-top: 40px; padding-top: 6px; font-size: 11px; font-weight: 700; color: #475569; }

            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 22px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px;">
              🖨️ Print / Save PDF Invoice
            </button>
          </div>

          <div class="header">
            <div class="brand">
              <img src="/branding/rise-with-media-logo.png" alt="Rise With Media Logo" onerror="this.style.display='none'" />
              <div class="brand-text">
                <h1>RISE WITH MEDIA</h1>
                <p>Digital Marketing & Content Production</p>
              </div>
            </div>
            <div class="inv-title">
              <h2>${invoiceTitle}</h2>
              <p># ${invoiceNumber}</p>
              <p>Date: ${formattedDate}</p>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <h4>Client Name</h4>
              <p>${clientName}</p>
            </div>
            <div class="meta-box">
              <h4>Shoot / Activity Title</h4>
              <p>${shootTitle}</p>
              <span style="font-size: 11px; color: #64748b;">${startTime} - ${endTime}</span>
            </div>
            <div class="meta-box">
              <h4>Shoot Location / Address</h4>
              <p>${shootLocation || 'Studio / On-Location'}</p>
            </div>
          </div>

          ${showExpenses ? `
            <div class="details-section">
              <div class="section-title">Itemized Expenses Breakdown</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 50px;">#</th>
                    <th>Expense Description</th>
                    <th class="amount-col">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${expensesList.map((exp, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td style="font-weight: 600;">${exp.title || 'Production Item'}</td>
                      <td class="amount-col">₹${Number(exp.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${showCrew && crewMembers.length > 0 ? `
            <div class="details-section">
              <div class="section-title">Assigned Crew / Team Members</div>
              <div class="crew-tags">
                ${crewMembers.map((t) => `<span class="crew-tag">${t.name || t.user?.name || 'Member'} (${t.role})</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${showEquipment && equipmentList.length > 0 ? `
            <div class="details-section">
              <div class="section-title">Assigned Equipment & Gear</div>
              <div class="crew-tags">
                ${equipmentList.map((eq) => `<span class="crew-tag" style="background: #e0f2fe; color: #0369a1;">📷 ${eq}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <div class="totals-container">
            <div class="totals-table">
              <div class="totals-row">
                <span>Shoot Total Amount:</span>
                <span>₹${Number(totalAmount).toLocaleString('en-IN')}</span>
              </div>
              <div class="totals-row">
                <span>Amount Paid / Given:</span>
                <span style="color: #16a34a; font-weight: bold;">₹${Number(amountPaid).toLocaleString('en-IN')}</span>
              </div>
              <div class="totals-row balance">
                <span>Balance Amount Due:</span>
                <span>₹${balanceAmount.toLocaleString('en-IN')}</span>
              </div>
              <div class="totals-row grand">
                <span>Grand Total:</span>
                <span>₹${Number(totalAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <div style="font-size: 11px; color: #64748b; max-width: 360px;">
              <p style="margin: 0; font-weight: 700; color: #334155;">Instructions & Notes:</p>
              <p style="margin: 4px 0 0 0;">${invoiceNotes}</p>
            </div>
            <div class="signature-box">
              <div class="signature-line">Authorized Signatory</div>
              <span style="font-size: 10px; color: #64748b;">Rise With Media Team</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Customize & Generate Invoice / Work Order
          </DialogTitle>
          <DialogDescription>
            Admin and Manager can switch preset modes, edit shoot amounts, custom expenses, client details, and choose whether to include itemized expenses for client or send minimal shoot & balance voucher to videographer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Preset Selector */}
          <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
            <label className="text-xs font-bold text-foreground block">Select Invoice Preset / Target Audience *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePresetChange('client_detailed')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  invoicePreset === 'client_detailed'
                    ? 'border-primary bg-background shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Client Detailed Invoice
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Shows client name, itemized expenses breakdown list (Camera Rental, Travel, Food, etc.), total fee, paid, and balance due.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('videographer_workorder')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  invoicePreset === 'videographer_workorder'
                    ? 'border-primary bg-background shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-emerald-500" /> Videographer / Crew Work Order
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Minimal voucher for crew. Shows Shoot Name, Location Address, Date & Time, Equipment, Shoot Fee, Amount Given, and Balance.
                </p>
              </button>
            </div>
          </div>

          {/* Visibility Checkboxes */}
          <div className="flex flex-wrap items-center gap-6 p-3.5 rounded-xl border border-border/60 bg-card text-xs">
            <span className="font-bold text-foreground">Section Visibility:</span>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
              <input
                type="checkbox"
                checked={showExpenses}
                onChange={(e) => setShowExpenses(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              Include Itemized Expenses Breakdown List
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
              <input
                type="checkbox"
                checked={showCrew}
                onChange={(e) => setShowCrew(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              Include Assigned Crew & Roles
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
              <input
                type="checkbox"
                checked={showEquipment}
                onChange={(e) => setShowEquipment(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              Include Equipment Gear List
            </label>
          </div>

          {/* Editable Header Details */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Invoice & Header Customization</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Invoice Header Title</label>
                <Input value={invoiceTitle} onChange={(e) => setInvoiceTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Invoice Number</label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Client Name</label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Shoot / Activity Title</label>
                <Input value={shootTitle} onChange={(e) => setShootTitle(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Shoot Location Address</label>
                <Input value={shootLocation} onChange={(e) => setShootLocation(e.target.value)} placeholder="Type location address..." />
              </div>
            </div>
          </div>

          {/* Editable Itemized Expenses List */}
          {showExpenses ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Itemized Expenses Breakdown</h3>
                <Button size="sm" variant="outline" onClick={handleAddExpenseRow}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              </div>

              {expensesList.map((exp, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-background">
                  <Input
                    className="flex-1 h-9"
                    value={exp.title}
                    onChange={(e) => handleExpenseChange(idx, 'title', e.target.value)}
                    placeholder="Expense title (e.g., Camera Rental, Travel, Food)"
                  />
                  <div className="w-[160px] relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      className="h-9 pl-7 font-bold"
                      value={exp.amount}
                      onChange={(e) => handleExpenseChange(idx, 'amount', e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-destructive"
                    onClick={() => handleRemoveExpenseRow(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Editable Financial Totals */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Financial Totals & Payment Summary</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Shoot Total Amount (₹)</label>
                <Input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="font-bold text-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Amount Paid / Given (₹)</label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Balance Due (₹)</label>
                <div className="h-10 px-3 flex items-center font-bold text-lg text-rose-500 bg-background rounded-md border border-border/60 mt-1">
                  ₹{balanceAmount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Editable Notes */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Footer Notes & Terms</label>
            <Textarea
              className="min-h-20 text-xs"
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
            />
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePrintInvoice}>
              <Printer className="h-4 w-4 mr-2" /> Print / Save PDF Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
