import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../../api';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, IndianRupee, Users, Phone,
  UserPlus, Wallet, BarChart3, Download, RefreshCw
} from '@/components/ui/muiIcons';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatINR } from '../../../utils/currency';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import { useDateFilter } from '../../../context/DateFilterContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const KPI_CONFIG = [
  { key: 'adSpend',       label: 'Ad Spend',           icon: IndianRupee, currency: true },
  { key: 'optIns',        label: 'Opt-Ins',            icon: Users,       currency: false },
  { key: 'callsBooked',   label: 'Calls Booked',       icon: Phone,       currency: false },
  { key: 'newClients',    label: 'New Clients',        icon: UserPlus,    currency: false },
  { key: 'cashCollected', label: 'Cash Collected',     icon: Wallet,      currency: true },
  { key: 'totalRevenue',  label: 'Contracted Revenue', icon: BarChart3,   currency: true },
];

function fmt(n, currency = false) {
  if (n === undefined || n === null) return currency ? formatINR(0) : '0';
  if (currency) return formatINR(n);
  return Number(n).toLocaleString('en-IN');
}

export default function PortalReports() {
  const darkMode = useSelector((state) => state.ui?.darkMode);
  const { startDate, endDate } = useDateFilter();
  const year = startDate ? startDate.slice(0, 4) : new Date().getFullYear().toString();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('totalRevenue');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('year', year);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    api.get(`/portal/reporting?${params.toString()}`)
      .then(r => r.data)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [year, startDate, endDate]);

  // Format entries for charts
  const chartEntries = (data?.entries || []).map(e => ({
    ...e,
    name: MONTHS[parseInt(e.month?.split('-')[1] || 1) - 1] || e.month,
  }));

  const kpi = KPI_CONFIG.find(k => k.key === activeChart) || KPI_CONFIG[0];

  const handleExport = () => {
    const rows = [
      ['Month','Ad Spend','Opt-Ins','Calls Booked','New Clients','Cash Collected','Contracted Revenue'],
      ...(data?.entries || []).map(e => [
        e.month, e.adSpend, e.optIns, e.callsBooked, e.newClients, e.cashCollected, e.totalRevenue
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `report-${year}.csv`; a.click();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Performance Dashboard</h2>
          <p className="text-xs mt-0.5 text-muted-foreground">Monthly KPI tracking — AF Reporting Board</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shadow-xs min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all min-h-[38px]"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <ChartSkeleton />
          <TableSkeleton columns={7} rows={6} />
        </div>
      ) : !data?.entries?.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-border bg-card shadow-xs">
          <BarChart3 size={40} className="text-muted-foreground/60 mb-3" />
          <p className="text-sm font-semibold text-foreground">No reporting data for {year}</p>
          <p className="text-xs text-muted-foreground mt-1">Your account manager will update this monthly.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {KPI_CONFIG.map(k => {
              const val = data?.totals?.[k.key] ?? 0;
              const growth = data?.growth?.[k.key];
              const latestVal = data?.latestMonth?.[k.key] ?? 0;
              const isPos = parseFloat(growth) >= 0;
              const isActive = activeChart === k.key;
              return (
                <motion.button
                  key={k.key}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setActiveChart(k.key)}
                  className={`text-left rounded-2xl p-4 transition-colors shadow-xs border ${
                    isActive
                      ? 'border-foreground bg-secondary/70'
                      : 'border-border bg-card hover:border-foreground/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center shrink-0">
                      <k.icon size={15} />
                    </div>
                    {growth !== undefined && (
                      <div
                        className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums ${
                          isPos
                            ? 'bg-secondary border-border text-foreground'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        <span>{Math.abs(growth)}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xl font-bold mt-1 text-foreground tabular-nums">{fmt(val, k.currency)}</p>
                  <p className="text-[11px] font-medium mt-0.5 text-muted-foreground">{k.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    Latest: {fmt(latestVal, k.currency)}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {/* Main Trend Chart */}
          <div className="rounded-2xl p-5 border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">{kpi.label} — Monthly Trend</h3>
                <p className="text-[11px] text-muted-foreground tabular-nums">{year} performance</p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartEntries} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                    borderRadius: 12,
                    fontSize: 11,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 700 }}
                />
                <Line
                  type="monotone"
                  dataKey={activeChart}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2.5}
                  dot={{ fill: 'hsl(var(--foreground))', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Combined bar chart */}
          <div className="rounded-2xl p-5 border border-border bg-card shadow-xs">
            <h3 className="text-sm font-bold mb-4 text-foreground">All KPIs — Combined View</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartEntries} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                    borderRadius: 12,
                    fontSize: 11,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                  }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="optIns"      fill={darkMode ? '#f4f4f5' : '#18181b'} name="Opt-Ins"      radius={[3,3,0,0]} />
                <Bar dataKey="callsBooked" fill="#71717a" name="Calls Booked" radius={[3,3,0,0]} />
                <Bar dataKey="newClients"  fill={darkMode ? '#a1a1aa' : '#d4d4d8'} name="New Clients"  radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Data Table */}
          <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-xs">
            <div className="px-4 py-3 bg-secondary/40 border-b border-border">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Monthly Breakdown</h3>
            </div>
            <div className="responsive-table-container overflow-x-auto">
              <table className="w-full min-w-[650px] text-xs">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border">
                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap text-muted-foreground">Month</th>
                    {['Ad Spend','Opt-Ins','Calls Booked','New Clients','Cash Collected','Contracted Revenue'].map(h => (
                      <th key={h} className="text-right px-4 py-2.5 font-semibold whitespace-nowrap text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border tabular-nums">
                  {data.entries.map((e, i) => (
                    <tr key={e._id || i} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap">
                        {MONTHS[parseInt(e.month?.split('-')[1]||1)-1]} {e.month?.split('-')[0]}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground font-medium">{fmt(e.adSpend, true)}</td>
                      <td className="px-4 py-2.5 text-right text-foreground">{fmt(e.optIns)}</td>
                      <td className="px-4 py-2.5 text-right text-foreground">{fmt(e.callsBooked)}</td>
                      <td className="px-4 py-2.5 text-right text-foreground">{fmt(e.newClients)}</td>
                      <td className="px-4 py-2.5 text-right text-foreground font-semibold">{fmt(e.cashCollected, true)}</td>
                      <td className="px-4 py-2.5 text-right text-foreground font-semibold">{fmt(e.totalRevenue, true)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-secondary/60 border-t-2 border-border">
                    <td className="px-4 py-2.5 font-bold text-foreground">TOTAL</td>
                    <td className="px-4 py-2.5 text-right text-foreground font-bold">{fmt(data.totals?.adSpend, true)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-foreground">{fmt(data.totals?.optIns)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-foreground">{fmt(data.totals?.callsBooked)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-foreground">{fmt(data.totals?.newClients)}</td>
                    <td className="px-4 py-2.5 text-right text-foreground font-bold">{fmt(data.totals?.cashCollected, true)}</td>
                    <td className="px-4 py-2.5 text-right text-foreground font-bold">{fmt(data.totals?.totalRevenue, true)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
