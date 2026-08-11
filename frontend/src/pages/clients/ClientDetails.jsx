import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import api from '../../api';
import {
  ChevronLeft, Building2, Phone, Mail, Globe, IndianRupee,
  Briefcase, CheckCircle2, Clock, AlertCircle, Users,
  FileText, TrendingUp, MoreHorizontal, Edit2, MessageSquare, FolderOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AddClientModal } from '../../components/modals/AddClientModal';
import { AddProjectModal } from '../../components/modals/AddProjectModal';
import ClientFinancialSummary from '../../components/ui/ClientFinancialSummary';
import ClientProjectsPanel from '../../components/ui/ClientProjectsPanel';
import { formatINR } from '../../utils/currency';

const onboardingStepLabels = {
  welcomeEmailSent: 'Welcome Email Sent',
  projectCreated: 'Project Created',
  teamAssigned: 'Team Assigned',
  kickoffCallScheduled: 'Kickoff Call Scheduled',
  portalActivated: 'Client Portal Activated',
};

const statusStyles = {
  Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Inactive: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  Churned: 'bg-red-500/10 text-red-600 border-red-500/20',
  Prospect: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Renew: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const ClientDetails = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const [clientRes, projectsRes, invoicesRes, financeRes, callRes, referralRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get(`/projects?client=${id}&limit=10`),
        api.get(`/finance/invoices?client=${id}&limit=10`),
        api.get(`/finance/records/client/${id}`),
        api.get(`/finance/call-history/client/${id}`),
        api.get(`/referrals/client/${id}`),
      ]);
      return {
        client: clientRes.data.client,
        projects: projectsRes.data.projects || [],
        invoices: invoicesRes.data.invoices || [],
        financeRecords: financeRes?.data?.records || [],
        callHistory: callRes?.data?.calls || [],
        referrals: referralRes?.data?.referrals || [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-card rounded-3xl border border-border" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-card rounded-2xl border border-border" />)}
        </div>
      </div>
    );
  }

  if (!data?.client) return (
    <div className="p-12 text-center text-muted-foreground">Client not found.</div>
  );

  const { client, projects, invoices, financeRecords = [], callHistory = [], referrals = [] } = data;

  const onboardingSteps = client.onboardingSteps || {};
  const completedSteps = Object.values(onboardingSteps).filter(Boolean).length;
  const totalSteps = Object.keys(onboardingStepLabels).length;
  const onboardingPercent = Math.round((completedSteps / totalSteps) * 100);

  const paidInvoices = invoices.filter(inv => inv.status?.toLowerCase() === 'paid');
  const pendingInvoices = invoices.filter(inv => inv.status?.toLowerCase() !== 'paid' && inv.status?.toLowerCase() !== 'cancelled');
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
  const paymentNotes = financeRecords.flatMap((record) => record.paymentHistory || []);

  const isFinanceVisible = user?.role === 'superAdmin' || user?.role === 'manager' || !!user?.permissions?.canManageFinance;

  const stats = [
    ...(isFinanceVisible ? [
      { label: 'Total Revenue', value: formatINR(totalRevenue), icon: IndianRupee, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ] : []),
    { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    ...(isFinanceVisible ? [
      { label: 'Paid Invoices', value: paidInvoices.length, icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { label: 'Pending Invoices', value: pendingInvoices.length, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ] : []),
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'projects', label: `Projects (${projects.length})`, icon: Briefcase },
    ...(isFinanceVisible ? [
      { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
      { id: 'paymentNotes', label: 'Payment Notes', icon: AlertCircle },
      { id: 'callHistory', label: `Call History (${callHistory.length})`, icon: Phone },
      { id: 'referrals', label: `Referrals (${referrals.length})`, icon: Users },
    ] : []),
    { id: 'onboarding', label: 'Onboarding', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header Card */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-violet-500" />
        <div className="p-7 flex flex-col md:flex-row md:items-center gap-6">
          <Link to="/clients" className="absolute top-6 left-6 p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
            <ChevronLeft size={20} />
          </Link>

          <div className="flex items-center gap-5 md:ml-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black shadow-inner">
              {client.company?.charAt(0) || client.name?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{client.company || client.name}</h1>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${statusStyles[client.status] || statusStyles.Active}`}>
                  {client.status}
                </span>
                <span className="px-2 py-1 rounded-lg bg-secondary text-[10px] font-bold uppercase text-muted-foreground">
                  {client.tier}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {client.email && <span className="flex items-center gap-1.5"><Mail size={14}/>{client.email}</span>}
                {client.phone && <span className="flex items-center gap-1.5"><Phone size={14}/>{client.phone}</span>}
                {client.website && <span className="flex items-center gap-1.5"><Globe size={14}/>{client.website}</span>}
              </div>
            </div>
          </div>

          <div className="ml-auto flex gap-3">
            <Link to="/chat" className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              <MessageSquare size={16}/> Message
            </Link>
            {client.driveLink && (
              <a
                href={client.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-500/20 transition-colors"
              >
                <FolderOpen size={16}/> Drive Folder
              </a>
            )}
            {user?.role !== 'client' && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <Edit2 size={16}/> Edit Client
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-border">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`p-5 flex items-center gap-4 ${i < stats.length - 1 ? 'border-r border-border' : ''}`}
            >
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold mt-0.5">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-2xl p-1.5 w-full overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Financial Summary */}
          <ClientFinancialSummary 
            clientId={client._id}
            clientName={client.name}
            clientTier={client.tier}
          />

          {/* Projects Panel */}
          <ClientProjectsPanel
            clientId={client._id}
            clientName={client.name}
            onAddProject={() => setShowProjectModal(true)}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Details */}
            <div className="lg:col-span-2 bg-card rounded-3xl border border-border shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-lg">Client Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                {[
                  ['Type / Sector', client.industry || 'Not set'],
                  [
                    client.budgetType === 'overall' ? 'Overall Budget Amount' : 'Monthly Budget Amount',
                    client.contractValue ? `${formatINR(client.contractValue)} (${client.budgetType === 'overall' ? 'Overall' : 'Monthly'})` : '—',
                  ],
                  ['Billing Cycle', client.billingCycle || '—'],
                  ['Contract Start', client.contractStartDate ? new Date(client.contractStartDate).toLocaleDateString() : '—'],
                  ['Contract End', client.contractEndDate ? new Date(client.contractEndDate).toLocaleDateString() : 'Ongoing / Retainer (No End Date)'],
                  ['Requirements', client.services?.join(', ') || 'Not set'],
                ].map(([label, value]) => (
                  <div key={label} className="p-4 bg-secondary/30 rounded-2xl border border-border/50">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                    <p className="font-semibold capitalize">{value}</p>
                  </div>
                ))}
                {/* Drive Link — full-width card */}
                <div className="sm:col-span-2 p-4 bg-secondary/30 rounded-2xl border border-border/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FolderOpen size={13} /> Google Drive Folder
                  </p>
                  {client.driveLink ? (
                    <a
                      href={client.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline break-all"
                    >
                      <FolderOpen size={15} />
                      {client.driveLink}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No Drive folder linked yet.{' '}
                      {user?.role !== 'client' && (
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="text-primary underline font-medium"
                        >
                          Add one
                        </button>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {client.notes && (
                <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{client.notes}</p>
                </div>
              )}
            </div>

            {/* Onboarding Progress Card */}
            <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
              <h2 className="font-bold text-lg mb-5">Onboarding Progress</h2>
              <div className="relative mb-6">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{completedSteps}/{totalSteps} steps</span>
                  <span className="text-2xl font-black text-primary">{onboardingPercent}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${onboardingPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(onboardingStepLabels).map(([key, label]) => {
                  const done = onboardingSteps[key];
                  return (
                    <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-secondary/20'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500' : 'bg-secondary border-2 border-border'}`}>
                        {done && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span className={`text-xs font-semibold ${done ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/10 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2"><Briefcase size={18} className="text-primary"/>Projects</h2>
          </div>
          <div className="divide-y divide-border">
            {projects.length > 0 ? projects.map(proj => (
              <Link key={proj._id} to={`/projects/${proj._id}`} className="flex items-center justify-between p-5 hover:bg-secondary/20 transition-colors group">
                <div>
                  <p className="font-semibold group-hover:text-primary transition-colors">{proj.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{proj.status?.replace(/_/g, ' ')}</p>
                </div>
                <div className="text-right">
                  <div className="w-32 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${proj.progress || 0}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">{proj.progress || 0}% complete</span>
                </div>
              </Link>
            )) : (
              <div className="p-12 text-center text-muted-foreground text-sm">No projects yet for this client.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/10">
            <h2 className="font-bold flex items-center gap-2"><FileText size={18} className="text-primary"/>Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground font-medium border-b border-border text-left">
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.length > 0 ? invoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-bold">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{formatINR(inv.total || inv.amount || 0)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inv.status?.toLowerCase() === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                        inv.status?.toLowerCase() === 'overdue' ? 'bg-red-500/10 text-red-600' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>{inv.status}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {financeRecords.length > 0 ? financeRecords.map((record) => (
            <div key={record._id} className="bg-card rounded-3xl border border-border shadow-sm p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{record.serviceName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{record.projectName || record.projectId?.name}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  record.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' :
                  record.paymentStatus === 'Overdue' ? 'bg-red-500/10 text-red-600' :
                  record.paymentStatus === 'Partially Paid' ? 'bg-amber-500/10 text-amber-600' :
                  'bg-slate-500/10 text-slate-600'
                }`}>{record.paymentStatus}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-secondary/30 border border-border/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</p>
                  <p className="mt-1 font-semibold">₹{Number(record.totalProjectAmount || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-secondary/30 border border-border/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paid</p>
                  <p className="mt-1 font-semibold">₹{Number(record.totalPaidAmount || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-secondary/30 border border-border/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Balance</p>
                  <p className="mt-1 font-semibold">₹{Number(record.balanceAmount || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>Invoice Status: <span className="font-semibold text-foreground">{record.invoiceStatus}</span></p>
                <p>Due Date: <span className="font-semibold text-foreground">{record.paymentDueDate ? new Date(record.paymentDueDate).toLocaleDateString() : '—'}</span></p>
                <p>Next Follow-up: <span className="font-semibold text-foreground">{record.nextFollowUpDate ? new Date(record.nextFollowUpDate).toLocaleDateString() : '—'}</span></p>
              </div>
            </div>
          )) : (
            <div className="bg-card rounded-3xl border border-border shadow-sm p-12 text-center text-muted-foreground lg:col-span-2">No finance records yet.</div>
          )}
        </div>
      )}

      {activeTab === 'paymentNotes' && (
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/10">
            <h2 className="font-bold flex items-center gap-2"><AlertCircle size={18} className="text-primary"/>Payment Notes</h2>
          </div>
          <div className="divide-y divide-border">
            {paymentNotes.length > 0 ? paymentNotes.map((note, index) => (
              <div key={note._id || index} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{note.noteTitle || 'Payment note'}</p>
                    <p className="text-sm text-muted-foreground mt-1">{note.noteDescription || 'No description added'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">₹{Number(note.amountPaid || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{note.paymentDate ? new Date(note.paymentDate).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center text-muted-foreground">No payment notes yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'callHistory' && (
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/10">
            <h2 className="font-bold flex items-center gap-2"><Phone size={18} className="text-primary"/>Call History</h2>
          </div>
          <div className="divide-y divide-border">
            {callHistory.length > 0 ? callHistory.map((call) => (
              <div key={call._id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{call.callPurpose} • {call.callType}</p>
                    <p className="text-sm text-muted-foreground mt-1">{call.callSummary || 'No summary added'}</p>
                    <p className="text-xs text-muted-foreground mt-2">Spoken with {call.spokenWith || 'N/A'} • {call.nextFollowUpDate ? `Next follow-up ${new Date(call.nextFollowUpDate).toLocaleDateString()}` : 'No follow-up set'}</p>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">{call.callDate ? new Date(call.callDate).toLocaleDateString() : '—'}</p>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center text-muted-foreground">No call history yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/10">
            <h2 className="font-bold flex items-center gap-2"><Users size={18} className="text-primary"/>Referrals</h2>
          </div>
          <div className="divide-y divide-border">
            {referrals.length > 0 ? referrals.map((referral) => (
              <div key={referral._id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{referral.referralSource || 'Other'}</p>
                    <p className="text-sm text-muted-foreground mt-1">{referral.referralPersonName || 'Unknown person'} • {referral.campaignName || 'No campaign'}</p>
                    <p className="text-xs text-muted-foreground mt-2">{referral.notes || 'No notes added.'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">{referral.conversionStatus || referral.status}</p>
                    <p className="text-xs text-muted-foreground mt-1">{referral.leadQuality || '—'}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center text-muted-foreground">No referral records yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
            <h2 className="font-bold text-lg mb-5">Onboarding Checklist</h2>
            <div className="space-y-3">
              {Object.entries(onboardingStepLabels).map(([key, label]) => {
                const done = onboardingSteps[key];
                return (
                  <div key={key} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-secondary/10'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500' : 'bg-secondary'}`}>
                      {done ? <CheckCircle2 size={16} className="text-white" /> : <Clock size={16} className="text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${done ? 'text-emerald-700 dark:text-emerald-400 line-through' : ''}`}>{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{done ? 'Completed' : 'Pending'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
            <h2 className="font-bold text-lg mb-5">Social Media</h2>
            {client.socialMedia && Object.entries(client.socialMedia).some(([, v]) => v) ? (
              <div className="space-y-3">
                {Object.entries(client.socialMedia).filter(([, v]) => v).map(([platform, handle]) => (
                  <div key={platform} className="flex items-center gap-3 p-4 bg-secondary/30 rounded-2xl border border-border/50">
                    <span className="font-bold capitalize text-sm w-24">{platform}</span>
                    <span className="text-sm text-muted-foreground">{handle}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No social media accounts linked yet.</p>
            )}
          </div>
        </div>
      )}

      {user?.role !== 'client' && (
        <>
          <AddClientModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            client={client}
          />
          <AddProjectModal
            open={showProjectModal}
            onOpenChange={setShowProjectModal}
            defaultClientId={client._id}
          />
        </>
      )}
    </div>
  );
};

export default ClientDetails;
