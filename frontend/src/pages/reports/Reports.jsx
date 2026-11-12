import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, IndianRupee, Users, Briefcase, CheckCircle2,
  AlertTriangle, Target, BarChart3, Award, ArrowUpRight, ArrowDownRight,
  FileSpreadsheet, FileText, Calendar, Clock, PhoneCall, Eye, X,
} from '@/components/ui/muiIcons';
import { useAdminReport, useMonthlyEmployeeReport } from '../../hooks/useReports';
import { toast } from 'sonner';
import { formatINR } from '../../utils/currency';
import { useDateFilter } from '../../context/DateFilterContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';

const COLORS = ['#12B7D4', '#0891b2', '#38bdf8', '#0284c7', '#64748b', '#94a3b8'];

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
        <div className="h-32 bg-card rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-card rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-72 bg-card rounded-2xl" />)}
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
      trend: `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth || 0}%`,
      up: (stats.revenueGrowth || 0) >= 0,
      sub: 'vs last month',
    },
    {
      label: 'Lead Conversion',
      value: `${convRate}%`,
      icon: Target,
      trend: `${wonLeads} won`,
      up: true,
      sub: `${totalLeads} total leads`,
    },
    {
      label: 'Active Clients',
      value: stats.activeClients || 0,
      icon: Users,
      trend: `${stats.totalClients || 0} total`,
      up: true,
      sub: 'In active contracts',
    },
    {
      label: 'Active Projects',
      value: stats.activeProjects || 0,
      icon: Briefcase,
      trend: `${stats.totalProjects || 0} total`,
      up: true,
      sub: 'Currently in delivery',
    },
    {
      label: 'Tasks Overdue',
      value: stats.overdueTasks || 0,
      icon: AlertTriangle,
      trend: `${stats.totalTasks || 0} total`,
      up: stats.overdueTasks === 0,
      sub: 'Require attention',
    },
    {
      label: 'Team Members',
      value: stats.totalUsers || 0,
      icon: Award,
      trend: 'Active',
      up: true,
      sub: 'Active accounts',
    },
  ];

  const businessHealth = [
    {
      label: 'Lead Conversion Rate',
      value: Number(convRate),
      note: `${wonLeads} won from ${totalLeads} leads`,
    },
    {
      label: 'Client Retention',
      value: stats.activeClients && stats.totalClients
        ? Math.round((stats.activeClients / stats.totalClients) * 100)
        : 0,
      note: `${stats.activeClients || 0} of ${stats.totalClients || 0} clients active`,
    },
    {
      label: 'Project Delivery',
      value: stats.activeProjects && stats.totalProjects
        ? Math.round((stats.activeProjects / stats.totalProjects) * 100)
        : 0,
      note: `${stats.activeProjects || 0} active of ${stats.totalProjects || 0}`,
    },
    {
      label: 'Task Completion',
      value: stats.totalTasks > 0 && stats.overdueTasks !== undefined
        ? Math.max(0, Math.round(((stats.totalTasks - stats.overdueTasks) / stats.totalTasks) * 100))
        : 0,
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

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
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
            th { background: #f4f4f5; font-weight: bold; }
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BarChart3 size={24} className="text-foreground shrink-0" />
            <span>Analytics &amp; Reports</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'employees' && (
            <div className="flex items-center gap-2 bg-card rounded-xl p-1">
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                className="app-select !py-1.5 !px-2.5 !text-xs font-bold w-32 bg-transparent"
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value, 10))}
                className="app-select !py-1.5 !px-2.5 !text-xs font-bold w-24 bg-transparent tabular-nums"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary cursor-pointer"
          >
            <FileText size={16} className="shrink-0" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleDownloadExcel}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            <FileSpreadsheet size={16} className="shrink-0" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="inline-flex items-center gap-1 rounded-xl bg-card p-1 overflow-x-auto custom-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('overall')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors shrink-0 min-h-[38px] cursor-pointer ${
            activeTab === 'overall'
              ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Overall Summary
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors shrink-0 min-h-[38px] cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Employee Monthly Summary
        </button>
      </div>

      {activeTab === 'overall' ? (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {kpiCards.map((card) => (
              <div
                key={card.label}
                className="bg-card rounded-2xl p-5 sm:p-6 flex items-start gap-4 card-hover"
              >
                <div className="p-3 rounded-xl bg-background text-foreground shrink-0">
                  <card.icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{card.label}</p>
                  <p className="text-2xl font-bold mt-1.5 tracking-tight text-foreground tabular-nums">{card.value}</p>
                  <div className="flex items-center gap-1.5 mt-1 tabular-nums">
                    {card.up
                      ? <ArrowUpRight size={12} className="text-foreground shrink-0" />
                      : <ArrowDownRight size={12} className="text-muted-foreground shrink-0" />
                    }
                    <span className={`text-xs font-semibold ${card.up ? 'text-foreground' : 'text-muted-foreground'}`}>{card.trend}</span>
                    <span className="text-xs text-muted-foreground">· {card.sub}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Revenue Trend - wide */}
            <div className="xl:col-span-2 bg-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-foreground">Revenue Trend</h2>
                </div>
                <TrendingUp size={18} className="text-foreground shrink-0" />
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground) / 0.06)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={formatCompactCurrency} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                      formatter={v => [formatCurrency(v), 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#12B7D4"
                      strokeWidth={2.5}
                      fillOpacity={0.14}
                      fill="#12B7D4"
                      dot={{ fill: '#12B7D4', strokeWidth: 0, r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Breakdown Pie */}
            <div className="bg-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-foreground">Task Status</h2>
                </div>
                <CheckCircle2 size={18} className="text-foreground shrink-0" />
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="count" nameKey="status">
                      {taskBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2">
                {taskBreakdown.slice(0, 4).map((item, i) => (
                  <div key={item.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground capitalize truncate">{item.status}</span>
                    </div>
                    <span className="font-bold text-foreground tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Lead Funnel */}
            <div className="bg-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-foreground">Lead Funnel</h2>
                <Target size={18} className="text-foreground shrink-0" />
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadFunnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--foreground) / 0.06)" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    />
                    <Bar dataKey="count" fill="#12B7D4" radius={[0, 8, 8, 0]}>
                      {leadFunnel.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Business Health Summary */}
            <div className="bg-card rounded-2xl p-6">
              <div className="mb-6">
                <h2 className="font-bold text-foreground">Business Health</h2>
              </div>
              <div className="space-y-5">
                {businessHealth.map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-foreground">{metric.label}</span>
                      <span className="font-bold text-foreground tabular-nums">{metric.value}%</span>
                    </div>
                    <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(metric.value, 100)}%` }}
                        className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Users size={18} className="text-foreground shrink-0" />
              <span>Employee Performance Summary</span>
            </h2>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              {MONTHS.find(m => m.value === reportMonth)?.label} {reportYear}
            </span>
          </div>

          {isEmployeeLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">
              Loading employee monthly statistics...
            </div>
          ) : (
            <div className="responsive-table-container overflow-x-auto px-3 pb-3">
              <table className="w-full text-left text-sm min-w-[700px] border-collapse">
                <thead>
                  <tr className="text-muted-foreground font-semibold bg-secondary/70 text-xs">
                    <th className="px-5 py-3.5 rounded-l-xl">Employee</th>
                    <th className="px-5 py-3.5">Role / Department</th>
                    <th className="px-5 py-3.5 text-center">Present</th>
                    <th className="px-5 py-3.5 text-center">Absent</th>
                    <th className="px-5 py-3.5 text-center">Leave</th>
                    <th className="px-5 py-3.5 text-center">Holiday</th>
                    <th className="px-5 py-3.5 text-center">Hours Logged</th>
                    <th className="px-5 py-3.5 text-center">Calls Logged</th>
                    <th className="px-5 py-3.5 text-center rounded-r-xl">Sessions Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
                  {(employeeReportData?.summary || []).map((row) => (
                    <tr key={row.user?._id} className="hover:bg-background/60 transition-colors">
                      <td className="px-5 py-4 font-semibold">
                        <div className="flex flex-col">
                          <span className="text-foreground">{row.user?.name}</span>
                          <span className="text-[11px] text-muted-foreground font-normal">{row.user?.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-xs">{row.user?.position || row.user?.role}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{row.user?.department || 'General'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-semibold text-foreground">{row.present} Days</td>
                      <td className="px-5 py-4 text-center font-semibold text-muted-foreground">{row.absent} Days</td>
                      <td className="px-5 py-4 text-center font-semibold text-muted-foreground">{row.leave} Days</td>
                      <td className="px-5 py-4 text-center font-semibold text-muted-foreground">{row.holiday} Days</td>
                      <td className="px-5 py-4 text-center font-semibold text-foreground">{row.totalHours} hrs</td>
                      <td className="px-5 py-4 text-center font-semibold text-foreground">{row.callCount} Calls</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeLogs(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background hover:bg-secondary text-foreground font-semibold text-xs transition-colors cursor-pointer"
                          title="View all daily login & logout timings"
                        >
                          <Eye size={13} className="shrink-0" />
                          <span>View Timings</span>
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
        <DialogContent
          size="lg"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-background w-[calc(100vw-24px)] max-w-4xl max-h-[90dvh]"
        >
          {/* Pinned Sticky Header */}
          <DialogHeader className="px-6 py-5 bg-background shrink-0 select-none">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                    Daily Attendance — {selectedEmployeeLogs?.user?.name}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Employee daily login logs
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-secondary rounded-md">
                  ESC
                </span>
                <DialogClose className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          {selectedEmployeeLogs && (
            <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
              {/* Scrollable Body */}
              <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center tabular-nums">
                  <div className="p-3.5 rounded-xl bg-card">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Present</span>
                    <div className="text-base sm:text-lg font-bold text-foreground mt-0.5">{selectedEmployeeLogs.present} Days</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Absent</span>
                    <div className="text-base sm:text-lg font-bold text-foreground mt-0.5">{selectedEmployeeLogs.absent} Days</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Holidays</span>
                    <div className="text-base sm:text-lg font-bold text-foreground mt-0.5">{selectedEmployeeLogs.holiday} Days</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Hours</span>
                    <div className="text-base sm:text-lg font-bold text-foreground mt-0.5">{selectedEmployeeLogs.totalHours} hrs</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl bg-card p-2">
                  <div className="responsive-table-container overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px] border-collapse">
                      <thead className="bg-secondary/70 font-semibold text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 rounded-l-lg">Date</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">First In / Last Out</th>
                          <th className="px-4 py-3">All Login &amp; Logout Sessions</th>
                          <th className="px-4 py-3 text-right rounded-r-lg">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-foreground/[0.05] tabular-nums">
                        {(selectedEmployeeLogs.dailyRecords || []).map((record) => {
                          const dObj = new Date(record.date);
                          const isSunday = dObj.getDay() === 0;

                          return (
                            <tr key={record._id || record.date} className="hover:bg-background/60 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-foreground">
                                  {dObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {dObj.toLocaleDateString([], { weekday: 'short' })}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    record.status === 'present'
                                      ? 'bg-primary text-primary-foreground'
                                      : record.status === 'absent' || record.status === 'leave'
                                      ? 'bg-background text-foreground'
                                      : 'bg-background text-muted-foreground'
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
                                  <span className="text-foreground">{formatTime(record.clockIn)}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-muted-foreground">{formatTime(record.clockOut)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {record.sessions && record.sessions.length > 0 ? (
                                  <div className="flex flex-col gap-1 text-[11px]">
                                    {record.sessions.map((s, idx) => (
                                      <div key={idx} className="flex items-center gap-2 bg-background px-2.5 py-1 rounded-lg">
                                        <span className="font-bold text-foreground">#{idx + 1}</span>
                                        <span className="text-foreground font-semibold">{formatTime(s.clockIn)}</span>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="text-muted-foreground font-semibold">{s.clockOut ? formatTime(s.clockOut) : 'Active'}</span>
                                        <span className="text-foreground font-bold ml-auto">({s.durationHours ? s.durationHours.toFixed(1) : 0}h)</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-foreground">
                                {Number(record.totalHours || 0).toFixed(2)} hrs
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Pinned Sticky Footer */}
              <div className="shrink-0 bg-background px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
                <span className="text-xs text-muted-foreground hidden sm:inline">Press ESC to exit</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeLogs(null)}
                  className="h-11 px-6 rounded-xl bg-secondary font-semibold text-sm text-foreground hover:bg-secondary/80 cursor-pointer transition-colors ml-auto"
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

