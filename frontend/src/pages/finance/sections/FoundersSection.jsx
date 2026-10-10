import { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  AlertTriangle,
  Layers,
  Banknote,
  Building,
} from 'lucide-react';
import { useFounderTransactions } from '../../../hooks/useFinance';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';

export default function FoundersSection({ onQuickAdd }) {
  const [selectedFounder, setSelectedFounder] = useState('all');

  const { data = { transactions: [], foundersSummary: [] } } = useFounderTransactions({
    founderName: selectedFounder !== 'all' ? selectedFounder : undefined,
  });

  const { transactions = [], foundersSummary = [] } = data;

  const handleExport = () => {
    const rows = transactions.map((t) => ({
      date: formatDateIST(t.date),
      founder: t.founderName,
      type: t.transactionType,
      direction: t.direction,
      amount: t.amount,
      mode: t.paymentMode,
      reference: t.reference || '',
      notes: t.notes || '',
    }));
    exportToCSV('founder_ledger_transactions', rows, [
      { key: 'date', label: 'Date' },
      { key: 'founder', label: 'Founder' },
      { key: 'type', label: 'Transaction Type' },
      { key: 'direction', label: 'Cash Direction' },
      { key: 'amount', label: 'Amount (INR)' },
      { key: 'mode', label: 'Payment Mode' },
      { key: 'reference', label: 'Reference' },
      { key: 'notes', label: 'Notes' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Strict Accounting Rules */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-indigo-300 text-[11px] font-bold uppercase tracking-wider">Equity & Partner Ledgers</span>
          <h2 className="text-xl font-bold mt-0.5">Founders Capital & Drawings Directory</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Founder capital introduced is isolated from sales revenue. Drawings are tracked as equity withdrawals rather than operating expenses. Loans are tracked as distinct liabilities.
          </p>
        </div>

        <button
          onClick={() => onQuickAdd('founder')}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs rounded-xl transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" />
          + Record Founder Entry
        </button>
      </div>

      {/* FOUNDER BALANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {foundersSummary.map((f) => (
          <div key={f.founderName} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Founder Account</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{f.founderName}</h3>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Capital Balance</span>
                <div className="text-xl font-bold text-indigo-700 mt-0.5">{formatINR(f.netCapitalBalance)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Equity Capital Introduced less Drawings</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Loan to Company</span>
                <div className="text-xl font-bold text-slate-800 mt-0.5">{formatINR(f.netLoanBalance)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Founder Loan Principal less Repayments</div>
              </div>
            </div>

            <div className="p-3 border border-slate-100 rounded-lg text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Total Capital Introduced:</span>
                <span className="font-semibold text-slate-800">{formatINR(f.capitalIntroduced)}</span>
              </div>
              <div className="flex justify-between">
                <span>Drawings Taken to Date:</span>
                <span className="font-semibold text-rose-600">{formatINR(f.drawings)}</span>
              </div>
              <div className="flex justify-between">
                <span>Profit Allocations (Paper):</span>
                <span className="font-semibold text-slate-800">{formatINR(f.profitAllocations)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTER & LEDGER TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Founder Account Ledger Transactions</h3>
            <p className="text-xs text-slate-500">Chronological history of capital injections, drawings, and loans</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedFounder}
              onChange={(e) => setSelectedFounder(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 bg-slate-50/50"
            >
              <option value="all">All Founders</option>
              <option value="Dinesh M">Dinesh M</option>
              <option value="Sathish Kumar">Sathish Kumar</option>
            </select>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Export Ledger
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[580px] text-xs">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Founder</th>
                <th className="p-3">Transaction Type</th>
                <th className="p-3">Cash Direction</th>
                <th className="p-3">Account / Mode</th>
                <th className="p-3">Reference / Notes</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No founder transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-slate-600 font-medium">{formatDateIST(tx.date)}</td>
                    <td className="p-3 font-bold text-slate-900">{tx.founderName}</td>
                    <td className="p-3 font-semibold capitalize text-slate-800">
                      {tx.transactionType.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          tx.direction === 'inflow'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.direction === 'outflow'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tx.direction}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {tx.account?.accountName ? `${tx.account.accountName} · ` : ''}{tx.paymentMode || 'Direct'}
                    </td>
                    <td className="p-3 text-slate-500 font-mono">{tx.reference || tx.notes || '-'}</td>
                    <td
                      className={`p-3 text-right font-bold text-sm ${
                        tx.direction === 'inflow' ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {formatINR(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
