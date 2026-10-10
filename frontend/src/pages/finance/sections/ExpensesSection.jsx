import { useState } from 'react';
import {
  Download,
  Filter,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  CreditCard,
  Building,
  Check,
  AlertCircle,
  CalendarCheck,
} from 'lucide-react';
import {
  useModuleExpenses,
  usePayVendorBill,
  useSubscriptions,
  usePostSubscriptionRenewal,
} from '../../../hooks/useFinance';
import { formatINR, formatDateIST, exportToCSV } from '../../../utils/financeFormatters';

export default function ExpensesSection({ onQuickAdd }) {
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'subscriptions'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: expenses = [] } = useModuleExpenses({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
  });

  const { data: subscriptions = [] } = useSubscriptions();

  const payVendorBill = usePayVendorBill();
  const postRenewal = usePostSubscriptionRenewal();

  const filteredExpenses = expenses.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const title = (e.title || '').toLowerCase();
    const vendor = (e.vendor || '').toLowerCase();
    const cat = (e.category || '').toLowerCase();
    return title.includes(q) || vendor.includes(q) || cat.includes(q);
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const unpaidBills = filteredExpenses.filter((e) => e.paymentStatus === 'unpaid');
  const totalUnpaidBills = unpaidBills.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const handleExport = () => {
    const rows = filteredExpenses.map((e) => ({
      date: formatDateIST(e.date),
      title: e.title,
      vendor: e.vendor || '',
      category: e.category,
      costType: e.costType,
      amount: e.amount,
      status: e.paymentStatus,
      account: e.fundingAccount?.accountName || 'Bank',
    }));
    exportToCSV('agency_expenses_and_bills', rows, [
      { key: 'date', label: 'Date' },
      { key: 'title', label: 'Item / Title' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'category', label: 'Category' },
      { key: 'costType', label: 'Cost Type' },
      { key: 'amount', label: 'Amount (INR)' },
      { key: 'status', label: 'Payment Status' },
      { key: 'account', label: 'Funding Account' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>TOTAL POSTED EXPENSES</span>
            <ArrowUpRight className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatINR(totalExpenses)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Recognized operating agency costs</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>UNPAID VENDOR BILLS</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{formatINR(totalUnpaidBills)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{unpaidBills.length} vendor bills pending payment</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
            <span>RECURRING SUBSCRIPTIONS</span>
            <CalendarCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{subscriptions.length} Active Tools</div>
          <div className="text-[11px] text-slate-500 mt-1">Scheduled software & hosting commitments</div>
        </div>
      </div>

      {/* Sub Tabs: Expenses / Subscriptions */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'expenses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Operational Expenses & Vendor Bills ({filteredExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'subscriptions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Recurring Subscriptions ({subscriptions.length})
        </button>
      </div>

      {activeTab === 'expenses' ? (
        <>
          {/* Filters & Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title, vendor, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50/50 text-slate-700"
              >
                <option value="all">All Categories</option>
                <option value="production_shoot">Production / Shoot</option>
                <option value="travel">Travel</option>
                <option value="freelancers">Freelancers</option>
                <option value="software_subscriptions">Software / Subscriptions</option>
                <option value="rent">Rent</option>
                <option value="internet">Internet & Utilities</option>
                <option value="marketing">Marketing</option>
                <option value="office">Office Expenses</option>
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50/50 text-slate-700"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid Expenses</option>
                <option value="unpaid">Unpaid Vendor Bills</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                onClick={() => onQuickAdd('expense')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Expense / Bill
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Item / Description</th>
                    <th className="p-3">Vendor / Payee</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Cost Type</th>
                    <th className="p-3">Payment Status</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        No expenses or vendor bills found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-slate-600 font-medium">{formatDateIST(exp.date)}</td>
                        <td className="p-3 font-semibold text-slate-900">{exp.title}</td>
                        <td className="p-3 text-slate-700">{exp.vendor || '-'}</td>
                        <td className="p-3">
                          <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                            {exp.category?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              exp.costType === 'client_project'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {exp.costType === 'client_project' ? 'Client Direct' : 'Overhead'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              exp.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {exp.paymentStatus === 'paid' ? 'Paid' : 'Unpaid Bill'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 text-sm">{formatINR(exp.amount)}</td>
                        <td className="p-3 text-right">
                          {exp.paymentStatus === 'unpaid' ? (
                            <button
                              onClick={() => payVendorBill.mutate({ id: exp._id })}
                              disabled={payVendorBill.isPending}
                              className="px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold text-[11px] hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                              Pay Bill
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Paid</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Recurring Subscriptions Tab */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Software & Agency Subscriptions</h3>
              <p className="text-xs text-slate-500">
                Scheduled commitments automatically forecasted without unauthorized auto-debits
              </p>
            </div>
            <button
              onClick={() => onQuickAdd('subscription')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              + Schedule Subscription
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Tool / Service</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Expected Amount</th>
                  <th className="p-3">Next Renewal Date</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No recurring subscriptions scheduled.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{sub.serviceName}</td>
                      <td className="p-3 text-slate-600">{sub.vendor || sub.serviceName}</td>
                      <td className="p-3 capitalize">{sub.frequency}</td>
                      <td className="p-3 font-bold text-slate-900">{formatINR(sub.expectedAmount)}</td>
                      <td className="p-3 font-medium text-amber-700">{formatDateIST(sub.nextRenewalDate)}</td>
                      <td className="p-3 capitalize">{sub.costClassification}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => postRenewal.mutate({ id: sub._id, actualAmount: sub.expectedAmount })}
                          disabled={postRenewal.isPending}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          Confirm & Post Renewal
                        </button>
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
