import { useState, useMemo } from 'react';
import {
  Building,
  ArrowRightLeft,
  CheckCircle2,
  RefreshCw,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Layers,
  Download,
  ArrowUpDown,
  X,
} from 'lucide-react';
import {
  useFinanceAccounts,
  useInternalTransfers,
  useReconcileAccount,
  useDailyCashbook,
} from '../../../hooks/useFinance';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';
import { toast } from 'sonner';

export default function CashFlowSection({ onQuickAdd }) {
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'transfers' | 'cashbook'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateSort, setDateSort] = useState('desc'); // 'desc' (newest first) | 'asc' (oldest first)

  const { data: accounts = [], isLoading: accountsLoading } = useFinanceAccounts();
  const { data: transfers = [] } = useInternalTransfers({
    startDate: fromDate || undefined,
    endDate: toDate || undefined,
    sortOrder: dateSort,
  });
  const { data: cashbookData = { items: [], totalInflow: 0, totalOutflow: 0, netCashFlow: 0 } } = useDailyCashbook({
    startDate: fromDate || undefined,
    endDate: toDate || undefined,
    sortOrder: dateSort,
  });

  const sortedTransfers = useMemo(() => {
    return [...transfers].sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return dateSort === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [transfers, dateSort]);

  const sortedCashbookItems = useMemo(() => {
    return [...(cashbookData.items || [])].sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return dateSort === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [cashbookData.items, dateSort]);

  const reconcileAccount = useReconcileAccount();

  const totalLiquidCash = accounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);

  const handleReconcile = async (accountId) => {
    try {
      await reconcileAccount.mutateAsync(accountId);
    } catch (err) {}
  };

  const handleExportCashbook = () => {
    const rows = (cashbookData.items || []).map((item) => ({
      date: formatDateIST(item.date),
      type: item.type,
      category: item.category,
      entity: item.entity,
      account: item.account,
      amount: item.amount,
      reference: item.reference || '',
    }));
    exportToCSV('daily_cashbook', rows, [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Flow Direction' },
      { key: 'category', label: 'Category' },
      { key: 'entity', label: 'Party / Description' },
      { key: 'account', label: 'Account' },
      { key: 'amount', label: 'Amount (INR)' },
      { key: 'reference', label: 'Reference' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Total Consolidated Cash */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 p-5 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-teal-300 text-[11px] font-bold uppercase tracking-wider">Treasury & Liquidity</span>
          <h2 className="text-2xl font-bold mt-0.5">{formatINR(totalLiquidCash)}</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Real-time consolidated balance across {accounts.length} active bank, cash, and UPI-linked accounts. Reconciles with source receipts, transfers, and disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuickAdd('transfer')}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 font-semibold text-xs rounded-xl transition-colors shadow-xs"
          >
            <ArrowRightLeft className="h-4 w-4" />
            + Internal Transfer
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'accounts'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Bank & Cash Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'transfers'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Internal Transfers ({transfers.length})
        </button>
        <button
          onClick={() => setActiveTab('cashbook')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'cashbook'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daily Cashbook Ledger
        </button>
      </div>

      {/* 1. ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        accounts.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Building className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Bank or Cash Accounts Added</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No bank accounts or petty cash vaults are currently configured. You can use all billing, expense, and payroll features without adding bank accounts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div key={acc._id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm">{acc.accountName}</span>
                      {acc.isDefault && (
                        <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold text-[10px]">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {acc.bankName ? `${acc.bankName} · ${acc.accountNumber || ''}` : 'Cash Vault'}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                    <Building className="h-5 w-5" />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current Balance</span>
                  <div className="text-2xl font-bold text-slate-900">{formatINR(acc.currentBalance)}</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Opening Cutover Balance:</span>
                    <span className="font-medium text-slate-800">{formatINR(acc.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cutover Date:</span>
                    <span className="text-slate-700">{formatDateIST(acc.cutoverDate)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
                  </span>
                  <button
                    onClick={() => handleReconcile(acc._id)}
                    disabled={reconcileAccount.isPending}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Reconcile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 2. TRANSFERS TAB */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Internal Account Transfers</h3>
              <p className="text-xs text-slate-500">
                Transfers move money between accounts without altering net profit or sales revenue
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date to Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-lg px-2 py-1">
                <Calendar className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500">Dates:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  title="From Date"
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  title="To Date"
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-teal-500"
                />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                    }}
                    className="p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Reset Date Range"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Date Sorting Dropdown */}
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold cursor-pointer"
              >
                <option value="desc">Date: Newest First (Desc)</option>
                <option value="asc">Date: Oldest First (Asc)</option>
              </select>

              <button
                onClick={() => onQuickAdd('transfer')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700"
              >
                <Plus className="h-3.5 w-3.5" />
                + Execute Transfer
              </button>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th
                    onClick={() => setDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    className="p-3 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    title="Click to toggle date sort (Newest / Oldest)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      <span className="text-teal-700 font-bold">{dateSort === 'desc' ? '↓' : '↑'}</span>
                    </div>
                  </th>
                  <th className="p-3">From Account (Outflow)</th>
                  <th className="p-3">To Account (Inflow)</th>
                  <th className="p-3">Bank Fee</th>
                  <th className="p-3">Reference / UTR</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTransfers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      No internal transfers recorded matching the criteria.
                    </td>
                  </tr>
                ) : (
                  sortedTransfers.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-slate-600 font-medium">{formatDateIST(t.date)}</td>
                      <td className="p-3 font-semibold text-rose-700">{t.fromAccount?.accountName}</td>
                      <td className="p-3 font-semibold text-emerald-700">{t.toAccount?.accountName}</td>
                      <td className="p-3 text-slate-500">{t.bankFee ? formatINR(t.bankFee) : '₹0.00'}</td>
                      <td className="p-3 font-mono text-slate-500">{t.reference || '-'}</td>
                      <td className="p-3 text-right font-bold text-slate-900 text-sm">{formatINR(t.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. DAILY CASHBOOK LEDGER */}
      {activeTab === 'cashbook' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daily Cashbook Inflows & Outflows</h3>
              <p className="text-xs text-slate-500">
                Chronological statement of client receipts, paid expenses, salaries, and account movements
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-emerald-600">Inflows: {formatINR(cashbookData.totalInflow)}</span>
                <span className="text-rose-600">Outflows: {formatINR(cashbookData.totalOutflow)}</span>
                <span className="text-slate-800">Net: {formatINR(cashbookData.netCashFlow)}</span>
              </div>

              {/* Date to Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-lg px-2 py-1">
                <Calendar className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500">Dates:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  title="From Date"
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
                  title="To Date"
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[11px] text-slate-800 cursor-pointer focus:ring-1 focus:ring-teal-500"
                />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                    }}
                    className="p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Reset Date Range"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Date Sorting Dropdown */}
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 font-semibold cursor-pointer"
              >
                <option value="desc">Date: Newest First (Desc)</option>
                <option value="asc">Date: Oldest First (Asc)</option>
              </select>

              <button
                onClick={handleExportCashbook}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> Export Cashbook
              </button>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th
                    onClick={() => setDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    className="p-3 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    title="Click to toggle date sort (Newest / Oldest)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      <span className="text-teal-700 font-bold">{dateSort === 'desc' ? '↓' : '↑'}</span>
                    </div>
                  </th>
                  <th className="p-3">Movement</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Party / Particulars</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCashbookItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No cashbook transactions found for this period.
                    </td>
                  </tr>
                ) : (
                  sortedCashbookItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-slate-600 font-medium">{formatDateIST(item.date)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            item.type === 'Inflow'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{item.category}</td>
                      <td className="p-3 font-semibold text-slate-900">{item.entity}</td>
                      <td className="p-3 text-slate-600">{item.account}</td>
                      <td className="p-3 font-mono text-slate-400">{item.reference || '-'}</td>
                      <td
                        className={`p-3 text-right font-bold text-sm ${
                          item.type === 'Inflow' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.type === 'Inflow' ? '+' : '-'}
                        {formatINR(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
