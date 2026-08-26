// =============================================
// PAYSLIP MODAL - Notion Agency OS Style
// =============================================

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, Share2, CheckCircle, Clock, ShieldCheck, Building2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const PayslipModal = ({ open, onOpenChange, salary }) => {
  const payslipRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!salary) return null;

  const emp = salary.employee || {};
  const baseSalary = Number(salary.baseSalary || 0);
  const incentive = Number(salary.incentive || 0);
  const ots = Number(salary.ots || 0);
  const otherAllowances = Number(salary.otherAllowances || 0);
  const deductions = Number(salary.deductions || 0);
  const grossSalary = Number(salary.grossSalary || (baseSalary + incentive + ots + otherAllowances));
  const netSalary = Number(salary.netSalary || Math.max(0, grossSalary - deductions));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!payslipRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(payslipRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const fileName = `Payslip_${(emp.name || 'Employee').replace(/\s+/g, '_')}_${salary.month}_${salary.year}.pdf`;
      pdf.save(fileName);
      toast.success('Payslip downloaded successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to generate PDF payslip');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-card border border-border">
        <DialogHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <DialogTitle className="text-base font-black text-foreground">
              Payslip & Salary Breakdown
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="rounded-xl text-xs gap-1.5 h-8"
            >
              <Printer size={13} />
              <span>Print</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="rounded-xl text-xs font-bold gap-1.5 h-8 shadow-sm"
            >
              <Download size={13} />
              <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Notion Agency OS Payslip Sheet */}
        <div
          ref={payslipRef}
          className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs font-sans mt-2"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-slate-900 tracking-tight">RiseWithMedia</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 uppercase tracking-widest">
                  Agency OS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Digital Media & Growth Agency</p>
            </div>
            <div className="sm:text-right">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Payslip: {salary.month} {salary.year}
              </span>
              <p className="text-[11px] text-slate-500">Pay Period: {salary.payPeriod || `${salary.month} ${salary.year}`}</p>
            </div>
          </div>

          {/* Employee & Disbursal Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Employee Name</span>
              <p className="font-bold text-slate-900 text-xs mt-0.5">{emp.name || 'Team Member'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Role / Designation</span>
              <p className="font-semibold text-slate-800 text-xs mt-0.5">{emp.position || 'Specialist'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Department</span>
              <p className="font-semibold text-slate-800 text-xs mt-0.5">{emp.department || 'General'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Disbursal Status</span>
              <div className="mt-0.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                    salary.status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {salary.status}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Earnings & Deductions Tables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 text-[11px] uppercase tracking-wider flex justify-between">
                <span>Earnings & Perks</span>
                <span>Amount (INR)</span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="px-3.5 py-2 flex justify-between text-slate-700">
                  <span>Base Salary</span>
                  <span className="font-bold text-slate-900">{currency.format(baseSalary)}</span>
                </div>

                <div className="px-3.5 py-2 flex justify-between text-slate-700">
                  <div>
                    <span>Incentive / Bonus</span>
                    {salary.incentiveReason && (
                      <p className="text-[10px] text-slate-400">{salary.incentiveReason}</p>
                    )}
                  </div>
                  <span className="font-bold text-amber-700">{currency.format(incentive)}</span>
                </div>

                <div className="px-3.5 py-2 flex justify-between text-slate-700">
                  <div>
                    <span>OTS (Overtime Allowance)</span>
                    {salary.otsHours ? (
                      <p className="text-[10px] text-slate-400">{salary.otsHours} hrs {salary.otsReason ? `• ${salary.otsReason}` : ''}</p>
                    ) : salary.otsReason ? (
                      <p className="text-[10px] text-slate-400">{salary.otsReason}</p>
                    ) : null}
                  </div>
                  <span className="font-bold text-purple-700">{currency.format(ots)}</span>
                </div>

                <div className="px-3.5 py-2 flex justify-between text-slate-700">
                  <div>
                    <span>Other Allowances</span>
                    {salary.otherAllowancesReason && (
                      <p className="text-[10px] text-slate-400">{salary.otherAllowancesReason}</p>
                    )}
                  </div>
                  <span className="font-bold text-emerald-700">{currency.format(otherAllowances)}</span>
                </div>

                <div className="px-3.5 py-2 bg-slate-50 flex justify-between font-black text-slate-900">
                  <span>Gross Earnings</span>
                  <span>{currency.format(grossSalary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 text-[11px] uppercase tracking-wider flex justify-between">
                  <span>Deductions</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="px-3.5 py-2 flex justify-between text-slate-700">
                    <div>
                      <span>Deductions / Adjustments</span>
                      {salary.deductionReason && (
                        <p className="text-[10px] text-slate-400">{salary.deductionReason}</p>
                      )}
                    </div>
                    <span className="font-bold text-rose-700">{currency.format(deductions)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Note */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Mode:</span>
                  <span className="font-semibold text-slate-800">{salary.paymentMethod || 'Bank Transfer'}</span>
                </div>
                {salary.paymentDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date Settled:</span>
                    <span className="font-semibold text-slate-800">{new Date(salary.paymentDate).toLocaleDateString()}</span>
                  </div>
                )}
                {salary.transactionReference && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ref / UTR:</span>
                    <span className="font-mono font-semibold text-slate-800">{salary.transactionReference}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Net Salary Highlight Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Total Net Salary Disbursed
              </span>
              <p className="text-xs text-slate-300 mt-0.5">Take-home compensation after additions & deductions</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black tracking-tight text-white">{currency.format(netSalary)}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
            <span>Confidential Compensation Document</span>
            <span>Generated via RiseWithMedia Agency OS</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
