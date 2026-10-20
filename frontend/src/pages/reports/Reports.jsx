import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, IndianRupee, Users, Briefcase, CheckCircle2,
  AlertTriangle, Target, BarChart3, Award, ArrowUpRight, ArrowDownRight,
  FileSpreadsheet, FileText, Calendar, Clock, PhoneCall, Eye,
} from 'lucide-react';
import { useAdminReport, useMonthlyEmployeeReport } from '../../hooks/useReports';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { formatINR } from '../../utils/currency';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const formatTime = (isoString) => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEARS = [2025, 2026, 2027, 2028];

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const cleanCell = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const titleCase = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const Reports = () => {
  const { startDate, endDate } = useDateFilter();
  const { data, isLoading } = useAdminReport({ startDate, endDate });
  const [period, setPeriod] = useState('6m');
  const [activeTab, setActiveTab] = useState('overall'); // 'overall' | 'employees'
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [selectedEmployeeLogs, setSelectedEmployeeLogs] = useState(null);

  const { data: employeeReportData, isLoading: isEmployeeLoading } = useMonthlyEmployeeReport({
    month: reportMonth,
    year: reportYear
  });

  const stats = data?.stats || {};
  const charts = data?.charts || {};

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-card rounded-3xl border border-border" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-card rounded-2xl border border-border" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-72 bg-card rounded-2xl border border-border" />)}
        </div>
      </div>
    );
  }

  const revenue = (charts.revenueChart || []).map(item => ({
    month: `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(item._id?.month || 1) - 1]}`,
    revenue: item.revenue || 0,
  }));

  const leadFunnel = (charts.stageFunnel || []).map(item => ({
    stage: titleCase(item._id),
    count: item.count,
  }));

  const taskBreakdown = (charts.taskBreakdown || []).map(item => ({
    status: titleCase(item._id),
    count: item.count,
  }));

  const totalLeads = leadFunnel.reduce((s, i) => s + i.count, 0);
  const wonLeads = leadFunnel.find(l => l.stage.toLowerCase() === 'won')?.count || 0;
  const convRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;
  const formatCurrency = (value) => formatINR(value);
  const formatCompactCurrency = (value) => {
    const num = Number(value || 0);
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}k`;
    return formatINR(num);
  };

  const kpiCards = [
    {
      label: 'Revenue This Month',
      value: formatCurrency(stats.monthRevenue),
      icon: IndianRupee,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      trend: `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth || 0}%`,
      up: (stats.revenueGrowth || 0) >= 0,
      sub: 'vs last month',
    },
    {
      label: 'Lead Conversion',
      value: `${convRate}%`,
      icon: Target,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      trend: `${wonLeads} won`,
      up: true,
      sub: `${totalLeads} total leads`,
    },
    {
      label: 'Active Clients',
      value: stats.activeClients || 0,
      icon: Users,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      trend: `${stats.totalClients || 0} total`,
      up: true,
      sub: 'In active contracts',
    },
    {
      label: 'Active Projects',
      value: stats.activeProjects || 0,
      icon: Briefcase,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      trend: `${stats.totalProjects || 0} total`,
      up: true,
      sub: 'Currently in delivery',
    },
    {
      label: 'Tasks Overdue',
      value: stats.overdueTasks || 0,
      icon: AlertTriangle,
      color: stats.overdueTasks > 0 ? 'text-red-500' : 'text-emerald-500',
      bg: stats.overdueTasks > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
      trend: `${stats.totalTasks || 0} total`,
      up: stats.overdueTasks === 0,
      sub: 'Require attention',
    },
    {
      label: 'Team Members',
      value: stats.totalUsers || 0,
      icon: Award,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      trend: 'Active',
      up: true,
      sub: 'Active accounts',
    },
  ];

  const businessHealth = [
    {
      label: 'Lead Conversion Rate',
      value: Number(convRate),
      color: 'bg-emerald-500',
      note: `${wonLeads} won from ${totalLeads} leads`,
    },
    {
      label: 'Client Retention',
      value: stats.activeClients && stats.totalClients
        ? Math.round((stats.activeClients / stats.totalClients) * 100)
        : 0,
      color: 'bg-blue-500',
      note: `${stats.activeClients || 0} of ${stats.totalClients || 0} clients active`,
    },
    {
      label: 'Project Delivery',
      value: stats.activeProjects && stats.totalProjects
        ? Math.round((stats.activeProjects / stats.totalProjects) * 100)
        : 0,
      color: 'bg-indigo-500',
      note: `${stats.activeProjects || 0} active of ${stats.totalProjects || 0}`,
    },
    {
      label: 'Task Completion',
      value: stats.totalTasks > 0 && stats.overdueTasks !== undefined
        ? Math.max(0, Math.round(((stats.totalTasks - stats.overdueTasks) / stats.totalTasks) * 100))
        : 0,
      color: stats.overdueTasks > 0 ? 'bg-amber-500' : 'bg-emerald-500',
      note: `${stats.overdueTasks || 0} overdue tasks`,
    },
  ];

  const reportSections = activeTab === 'overall' ? [
    {
      title: 'KPI Summary',
      columns: ['Metric', 'Value', 'Trend', 'Status'],
      rows: kpiCards.map((card) => [card.label, card.value, card.trend, card.sub]),
    },
    {
      title: 'Revenue Trend',
      columns: ['Month', 'Revenue'],
      rows: revenue.map((row) => [row.month, formatCurrency(row.revenue)]),
    },
    {
      title: 'Task Status',
      columns: ['Status', 'Count'],
      rows: taskBreakdown.map((row) => [row.status, row.count]),
    },
    {
      title: 'Lead Funnel',
      columns: ['Stage', 'Count'],
      rows: leadFunnel.map((row) => [row.stage, row.count]),
    },
    {
      title: 'Business Health',
      columns: ['Metric', 'Value', 'Note'],
      rows: businessHealth.map((row) => [row.label, `${row.value}%`, row.note]),
    },
  ] : [
    {
      title: `Employee Monthly Performance Summary - ${MONTHS.find(m => m.value === reportMonth)?.label} ${reportYear}`,
      columns: ['Employee', 'Role', 'Department', 'Present', 'Absent', 'Leave', 'Holiday', 'Hours', 'Calls'],
      rows: (employeeReportData?.summary || []).map(row => [
        row.user?.name || 'Unknown',
        row.user?.position || row.user?.role || 'Staff',
        row.user?.department || 'General',
        row.present,
        row.absent,
        row.leave,
        row.holiday,
        `${row.totalHours} hrs`,
        row.callCount,
      ]),
    },
    {
      title: `Detailed Daily Attendance & Login/Logout Timings - ${MONTHS.find(m => m.value === reportMonth)?.label} ${reportYear}`,
      columns: ['Employee', 'Date', 'Day', 'Status', 'First In', 'Last Out', 'All Login & Logout Sessions', 'Hours'],
      rows: (employeeReportData?.summary || []).flatMap(emp =>
        (emp.dailyRecords || []).map(d => {
          const dObj = new Date(d.date);
          const dateStr = d.date ? dObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          const dayStr = dObj.toLocaleDateString([], { weekday: 'short' });
          const cIn = d.clockIn ? formatTime(d.clockIn) : '--:--';
          const cOut = d.clockOut ? formatTime(d.clockOut) : '--:--';
          let sessionsStr = '--';
          if (d.sessions && d.sessions.length > 0) {
            sessionsStr = d.sessions.map((s, idx) => `#${idx + 1}: In ${formatTime(s.clockIn)} - Out ${s.clockOut ? formatTime(s.clockOut) : 'Active'} (${s.durationHours ? s.durationHours.toFixed(1) : 0}h)`).join('; ');
          } else if (d.clockIn) {
            sessionsStr = `In ${formatTime(d.clockIn)} - Out ${formatTime(d.clockOut)}`;
          }
          return [
            emp.user?.name || 'Employee',
            dateStr,
            dayStr,
            (d.status || '').toUpperCase().replace(/_/g, ' '),
            cIn,
            cOut,
            sessionsStr,
            `${Number(d.totalHours || 0).toFixed(2)} hrs`,
          ];
        })
      ),
    }
  ];

  const handleDownloadPDF = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    let y = 14;

    const addPageIfNeeded = (height = 8) => {
      if (y + height > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    pdf.setFontSize(16);
    pdf.text('Analytics & Reports', margin, y);
    y += 8;
    pdf.setFontSize(9);
    pdf.setTextColor(90);
    pdf.text(`Downloaded: ${new Date().toLocaleString('en-IN')}`, margin, y);
    y += 10;

    reportSections.forEach((section) => {
      addPageIfNeeded(18);
      pdf.setTextColor(0);
      pdf.setFontSize(12);
      pdf.text(section.title, margin, y);
      y += 7;

      const colWidth = (pageWidth - margin * 2) / section.columns.length;
      pdf.setFontSize(8);
      pdf.setFillColor(240, 244, 248);
      pdf.rect(margin, y - 4.5, pageWidth - margin * 2, 7, 'F');
      section.columns.forEach((column, index) => {
        pdf.text(String(column), margin + index * colWidth + 2, y);
      });
      y += 6;

      section.rows.forEach((row) => {
        addPageIfNeeded(7);
        row.forEach((cell, index) => {
          const text = pdf.splitTextToSize(String(cell ?? ''), colWidth - 4);
          pdf.text(text.slice(0, 2), margin + index * colWidth + 2, y);
        });
        y += 7;
      });
      y += 5;
    });

    pdf.save(`agency-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF report downloaded');
  };

  const handleDownloadExcel = () => {
    const tables = reportSections.map((section) => `
      <h2>${cleanCell(section.title)}</h2>
      <table border="1">
        <thead>
          <tr>${section.columns.map((column) => `<th>${cleanCell(column)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${section.rows.map((row) => `<tr>${row.map((cell) => `<td>${cleanCell(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      <br />
    `).join('');

    const workbook = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; }
            th { background: #e8eef8; font-weight: bold; }
            th, td { padding: 8px; }
            h1, h2 { font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <h1>Analytics & Reports</h1>
          <p>Downloaded: ${cleanCell(new Date().toLocaleString('en-IN'))}</p>
          ${tables}
        </body>
      </html>
    `;

    downloadBlob(
      workbook,
      `agency-report-${new Date().toISOString().slice(0, 10)}.xls`,
      'application/vnd.ms-excel;charset=utf-8;',
    );
    toast.success('Excel report downloaded');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 size={24} className="text-primary" />
            Analytics & Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Company-wide revenue, pipeline health, and delivery metrics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'employees' ? (
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1 shadow-sm">
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                className="app-select !py-1 !px-2.5 !text-xs font-bold w-32 border-none bg-transparent"
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value, 10))}
                className="app-select !py-1 !px-2.5 !text-xs font-bold w-24 border-none bg-transparent"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1">
              {['3m', '6m', '12m'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {p === '3m' ? '3 Months' : p === '6m' ? '6 Months' : '12 Months'}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <FileText size={16} />
            PDF
          </button>
          <button
            onClick={handleDownloadExcel}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="border-b border-border flex items-center gap-6">
        <button
          onClick={() => setActiveTab('overall')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'overall' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Overall Summary
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'employees' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Employee Monthly Summary
        </button>
      </div>

      {activeTab === 'overall' ? (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {kpiCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-start gap-4 card-hover"
              >
                <div className={`p-3 rounded-2xl ${card.bg} ${card.color} flex-shrink-0`}>
                  <card.icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">{card.label}</p>
                  <p className="text-2xl font-bold mt-1 tracking-tight">{card.value}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {card.up
                      ? <ArrowUpRight size={12} className="text-emerald-500" />
                      : <ArrowDownRight size={12} className="text-red-500" />
                    }
                    <span className={`text-xs font-semibold ${card.up ? 'text-emerald-600' : 'text-red-600'}`}>{card.trend}</span>
                    <span className="text-xs text-muted-foreground">· {card.sub}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Revenue Trend - wide */}
            <div className="xl:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold">Revenue Trend</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Monthly revenue from paid invoices</p>
                </div>
                <TrendingUp size={18} className="text-primary" />
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={formatCompactCurrency} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                      formatter={v => [formatCurrency(v), 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Breakdown Pie */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold">Task Status</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Current task distribution</p>
                </div>
                <CheckCircle2 size={18} className="text-primary" />
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="count" nameKey="status">
                      {taskBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2">
                {taskBreakdown.slice(0, 4).map((item, i) => (
                  <div key={item.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground capitalize">{item.status}</span>
                    </div>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Lead Funnel */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold">Lead Funnel</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Leads by pipeline stage</p>
                </div>
                <Target size={18} className="text-primary" />
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadFunnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]}>
                      {leadFunnel.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Business Health Summary */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="mb-6">
                <h2 className="font-bold">Business Health</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Key performance ratios</p>
              </div>
              <div className="space-y-5">
                {businessHealth.map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">{metric.label}</span>
                      <span className="font-bold">{metric.value}%</span>
                    </div>
                    <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(metric.value, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${metric.color}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{metric.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-secondary/10 flex items-center justify-between">
            <div>
              <h2 className="font-bold flex items-center gap-2">
                <Users size={18} className="text-primary" />
                Employee Performance Summary
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Attendance and call logs breakdown for {MONTHS.find(m => m.value === reportMonth)?.label} {reportYear}
              </p>
            </div>
          </div>

          {isEmployeeLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">
              Loading employee monthly statistics...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground font-semibold border-b border-border bg-muted/20">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Role / Department</th>
                    <th className="px-6 py-4 text-center">Present</th>
                    <th className="px-6 py-4 text-center">Absent</th>
                    <th className="px-6 py-4 text-center">Leave</th>
                    <th className="px-6 py-4 text-center">Holiday</th>
                    <th className="px-6 py-4 text-center">Hours Logged</th>
                    <th className="px-6 py-4 text-center">Calls Logged</th>
                    <th className="px-6 py-4 text-center">Sessions Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(employeeReportData?.summary || []).map((row) => (
                    <tr key={row.user?._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-bold">
                        <div className="flex flex-col">
                          <span className="text-foreground">{row.user?.name}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">{row.user?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-xs">{row.user?.position || row.user?.role}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{row.user?.department || 'General'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-emerald-600">{row.present} Days</td>
                      <td className="px-6 py-4 text-center font-bold text-destructive">{row.absent} Days</td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600">{row.leave} Days</td>
                      <td className="px-6 py-4 text-center font-bold text-blue-600">{row.holiday} Days</td>
                      <td className="px-6 py-4 text-center font-bold">{row.totalHours} hrs</td>
                      <td className="px-6 py-4 text-center font-bold text-primary">{row.callCount} Calls</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeLogs(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors cursor-pointer"
                          title="View all daily login & logout timings"
                        >
                          <Eye size={13} />
                          View Timings
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!employeeReportData?.summary || employeeReportData.summary.length === 0) && (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-muted-foreground italic">
                        No employee records found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Employee Daily Login & Logout Timings Modal */}
      <Dialog open={Boolean(selectedEmployeeLogs)} onOpenChange={(open) => { if (!open) setSelectedEmployeeLogs(null); }}>
        <DialogContent size="large">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="text-primary h-5 w-5" />
              Daily Attendance &amp; Login/Logout Logs
            </DialogTitle>
            <DialogDescription>
              {selectedEmployeeLogs?.user?.name} ({selectedEmployeeLogs?.user?.email}) — {MONTHS.find(m => m.value === reportMonth)?.label} {reportYear}
            </DialogDescription>
          </DialogHeader>

          {selectedEmployeeLogs && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Present</span>
                  <div className="text-base font-black text-emerald-600 mt-0.5">{selectedEmployeeLogs.present} Days</div>
                </div>
                <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Absent</span>
                  <div className="text-base font-black text-destructive mt-0.5">{selectedEmployeeLogs.absent} Days</div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Holidays</span>
                  <div className="text-base font-black text-blue-600 mt-0.5">{selectedEmployeeLogs.holiday} Days</div>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Hours</span>
                  <div className="text-base font-black text-primary mt-0.5">{selectedEmployeeLogs.totalHours} hrs</div>
                </div>
              </div>

              <div className="max-h-[55vh] overflow-y-auto custom-scrollbar rounded-2xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 font-semibold sticky top-0 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">First In / Last Out</th>
                      <th className="px-4 py-3">All Login &amp; Logout Sessions</th>
                      <th className="px-4 py-3 text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(selectedEmployeeLogs.dailyRecords || []).map((record) => {
                      const dObj = new Date(record.date);
                      const isSunday = dObj.getDay() === 0;

                      return (
                        <tr key={record._id || record.date} className="hover:bg-secondary/20">
                          <td className="px-4 py-3">
                            <div className="font-bold text-foreground">
                              {dObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {dObj.toLocaleDateString([], { weekday: 'short' })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                record.status === 'present'
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : record.status === 'absent'
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                  : record.status === 'holiday' || isSunday
                                  ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                  : record.status === 'leave'
                                  ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                  : 'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {record.status?.replace(/_/g, ' ') || (isSunday ? 'holiday' : '—')}
                            </span>
                            {record.notes && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[140px] mt-0.5" title={record.notes}>
                                {record.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                              <span className="text-emerald-600">{formatTime(record.clockIn)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-amber-600">{formatTime(record.clockOut)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {record.sessions && record.sessions.length > 0 ? (
                              <div className="flex flex-col gap-1 text-[11px]">
                                {record.sessions.map((s, idx) => (
                                  <div key={idx} className="flex items-center gap-2 bg-secondary/30 px-2 py-1 rounded-lg">
                                    <span className="font-bold text-foreground/80">#{idx + 1}</span>
                                    <span className="text-emerald-600 font-semibold">{formatTime(s.clockIn)}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="text-amber-600 font-semibold">{s.clockOut ? formatTime(s.clockOut) : 'Active'}</span>
                                    <span className="text-primary font-bold ml-auto">({s.durationHours ? s.durationHours.toFixed(1) : 0}h)</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-foreground">
                            {Number(record.totalHours || 0).toFixed(2)} hrs
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeLogs(null)}
                  className="px-4 py-2 rounded-xl border border-border font-semibold text-xs hover:bg-secondary cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;

