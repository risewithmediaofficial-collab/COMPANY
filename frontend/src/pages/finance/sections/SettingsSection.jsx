import { useState } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  History,
  AlertTriangle,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  Save,
} from 'lucide-react';
import {
  usePeriodLocks,
  useTogglePeriodLock,
  useFinanceAuditLogs,
  useFinanceBudgets,
  useSetFinanceBudget,
} from '../../../hooks/useFinance';
import { formatINR, formatDateTimeIST } from '../../../utils/financeFormatters';
import { toast } from 'sonner';

export default function SettingsSection() {
  const [activeTab, setActiveTab] = useState('periods'); // 'periods' | 'audit' | 'budgets' | 'general'

  const { data: periodLocks = [] } = usePeriodLocks();
  const { data: auditLogs = [] } = useFinanceAuditLogs();
  const { data: budgets = [] } = useFinanceBudgets();

  const togglePeriodLock = useTogglePeriodLock();
  const setBudget = useSetFinanceBudget();

  // Period Lock Form
  const [targetPeriod, setTargetPeriod] = useState(
    new Date().toISOString().slice(0, 7) // "YYYY-MM"
  );
  const [reopenReason, setReopenReason] = useState('');

  // Budget Form
  const [budgetForm, setBudgetForm] = useState({
    category: 'office',
    month: new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date()),
    year: new Date().getFullYear(),
    monthlyBudget: 50000,
    thresholdPercentage: 80,
  });

  const handleToggleLock = (period, currentStatus) => {
    if (currentStatus) {
      // Reopening requires a reason
      const reason = window.prompt('Enter reason for reopening closed accounting period:');
      if (!reason) return;
      togglePeriodLock.mutate({ period, isLocked: false, reason });
    } else {
      togglePeriodLock.mutate({ period, isLocked: true });
    }
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    setBudget.mutate(budgetForm);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('periods')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'periods'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🔒 Monthly Close Controls
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📜 Immutable Audit History ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'budgets'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📊 Expense Budgets & Thresholds
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-2.5 transition-all border-b-2 ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ⚙️ Regional & Currency Settings
        </button>
      </div>

      {/* 1. PERIOD LOCKS */}
      {activeTab === 'periods' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Monthly Accounting Close Controls</h3>
            <p className="text-xs text-slate-500 mb-4 max-w-2xl">
              Locking an accounting period prevents any new invoices, payments, or expenses from being posted to that month. Only Founders/Admins can reopen closed periods with a mandatory audit reason.
            </p>

            <div className="flex items-center gap-3 text-xs">
              <input
                type="month"
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-slate-50"
              />
              <button
                onClick={() => togglePeriodLock.mutate({ period: targetPeriod, isLocked: true })}
                disabled={togglePeriodLock.isPending}
                className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                🔒 Lock Period {targetPeriod}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Accounting Period History</h4>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Period</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Lock Date</th>
                    <th className="p-3">Last Reopened</th>
                    <th className="p-3">Reopening Reason</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodLocks.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400">
                        No periods currently locked.
                      </td>
                    </tr>
                  ) : (
                    periodLocks.map((lock) => (
                      <tr key={lock._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{lock.period}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              lock.isLocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {lock.isLocked ? 'Locked / Closed' : 'Open'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{lock.lockedAt ? formatDateTimeIST(lock.lockedAt) : '-'}</td>
                        <td className="p-3 text-slate-600">{lock.reopenedAt ? formatDateTimeIST(lock.reopenedAt) : '-'}</td>
                        <td className="p-3 text-slate-500">{lock.reopenReason || '-'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleToggleLock(lock.period, lock.isLocked)}
                            className="font-semibold text-indigo-600 hover:underline"
                          >
                            {lock.isLocked ? 'Reopen Period' : 'Lock Period'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Immutable Financial Audit Trail</h3>
            <p className="text-xs text-slate-500">Every write, void, payment, and approval is immutably logged with actor & timestamps</p>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] text-xs">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Timestamp (IST)</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Reference / Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono text-slate-600">{formatDateTimeIST(log.createdAt)}</td>
                      <td className="p-3 font-semibold text-slate-900">{log.actor?.name || log.actorName || 'User'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-slate-100 text-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-indigo-700">{log.entityType}</td>
                      <td className="p-3 text-slate-700">{log.description || log.referenceNumber || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. BUDGETS */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Set Category Budget & Alert Threshold</h3>
            <p className="text-xs text-slate-500 mb-4">
              Trigger in-app alerts when expenditures reach or exceed defined thresholds (default 80%).
            </p>

            <form onSubmit={handleSaveBudget} className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs items-end">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs"
                >
                  <option value="software_subscriptions">Software & Subscriptions</option>
                  <option value="production_shoot">Production / Shoot</option>
                  <option value="travel">Travel</option>
                  <option value="freelancers">Freelancers</option>
                  <option value="rent">Office Rent</option>
                  <option value="office">Office & Amenities</option>
                  <option value="marketing">Agency Marketing</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Monthly Budget (₹)</label>
                <input
                  type="number"
                  value={budgetForm.monthlyBudget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, monthlyBudget: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Warning Threshold (%)</label>
                <input
                  type="number"
                  value={budgetForm.thresholdPercentage}
                  onChange={(e) => setBudgetForm({ ...budgetForm, thresholdPercentage: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Month / Year</label>
                <input
                  type="text"
                  value={`${budgetForm.month} ${budgetForm.year}`}
                  disabled
                  className="w-full rounded-md border border-slate-200 bg-slate-100 p-2 text-xs text-slate-500"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={setBudget.isPending}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-2xs"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. GENERAL REGIONAL & CURRENCY SETTINGS */}
      {activeTab === 'general' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900">Regional & System Financial Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <span className="font-bold text-slate-900">Currency & Formatting</span>
              <p className="text-slate-600">Base Currency: <strong>Indian Rupees (INR / ₹)</strong></p>
              <p className="text-slate-600">Number Formatting: <strong>₹1,25,000.00 (Indian Number System)</strong></p>
              <p className="text-slate-600">Timezone: <strong>Asia/Kolkata (IST, UTC+05:30)</strong></p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <span className="font-bold text-slate-900">Tax & Revenue Accounting</span>
              <p className="text-slate-600">Tax Modes: <strong>GST 18% Exclusive / Tax Exempt</strong></p>
              <p className="text-slate-600">Pass-Through Ad Budgets: <strong>Segregated from Agency Service Revenue</strong></p>
              <p className="text-slate-600">Invariants: <strong>Strict double-entry balance verification active</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
