import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import api from '../../api';
import {
  Building2, Phone, Mail, ListChecks, ArrowRight,
  Briefcase, CheckCircle2, Clock, AlertCircle, Users,
  FileText, TrendingUp, Edit2, FolderOpen, Calendar,
  LockKeyhole, KeyRound, Eye, EyeOff, Copy, Check, ExternalLink, Plus, ChevronDown, ChevronUp, AtSign
} from '@/components/ui/muiIcons';
import { AddClientModal } from '../../components/modals/AddClientModal';
import { AddProjectModal } from '../../components/modals/AddProjectModal';
import ClientProjectsPanel from '../../components/ui/ClientProjectsPanel';
import {
  NotionDetailPage,
  NotionTabs,
} from '../../components/ui/NotionDetailTemplate';
import { formatINR } from '../../utils/currency';
import { getProjectCategoryMeta } from '../../utils/projectCategories';
import { useCredential } from '../../hooks/useClientCredentials';

const PLATFORM_MAP = {
  instagram: { label: 'Instagram', code: 'IG' },
  facebook: { label: 'Facebook', code: 'FB' },
  x: { label: 'X (Twitter)', code: 'X' },
  youtube: { label: 'YouTube', code: 'YT' },
  linkedin: { label: 'LinkedIn', code: 'IN' },
  threads: { label: 'Threads', code: 'TH' },
  tiktok: { label: 'TikTok', code: 'TT' },
  snapchat: { label: 'Snapchat', code: 'SC' },
  pinterest: { label: 'Pinterest', code: 'PI' },
  other: { label: 'Other', code: 'OT' },
};
const getPlatformMeta = (val) => PLATFORM_MAP[val] || { label: val || 'Account', code: 'AC' };

const onboardingStepLabels = {
  welcomeEmailSent: 'Welcome Email Sent',
  projectCreated: 'Project Created',
  teamAssigned: 'Team Assigned',
  kickoffCallScheduled: 'Kickoff Call Scheduled',
  portalActivated: 'Client Portal Activated',
};

const statusStyles = {
  Active: 'bg-primary text-primary-foreground ',
  Prospect: 'bg-secondary text-foreground ',
  Churned: 'bg-muted text-muted-foreground ',
  Inactive: 'bg-secondary text-muted-foreground ',
  Renew: 'bg-secondary text-foreground font-bold',
};

const ClientDetails = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);

  // If user is a client, restrict access strictly to their own client record
  const isClientUser = user?.role === 'client';
  const myClientId = user?.clientId || user?.client?._id || user?.client;
  if (isClientUser && myClientId && String(myClientId) !== String(id)) {
    return <Navigate to={`/clients/${myClientId}`} replace />;
  }

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || (isClientUser ? 'vault' : 'overview'));
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [activePasswordId, setActivePasswordId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    }, { replace: true });
  };

  const { data: revealedCredential } = useCredential(activePasswordId);

  const { data: credentials = [] } = useQuery({
    queryKey: ['client-credentials', id],
    queryFn: async () => {
      const res = await api.get(`/credentials/clients/${id}`);
      return res.data?.credentials || [];
    },
    enabled: Boolean(id),
  });

  const handleCopy = (text, copyKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(copyKey);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCard = (cardId) => setExpandedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      let clientRes = null;
      let projectsRes = null;
      let invoicesRes = null;
      let financeRes = null;
      let callRes = null;
      let referralRes = null;

      try {
        const results = await Promise.allSettled([
          api.get(`/clients/${id}`),
          api.get(`/projects?client=${id}`),
          api.get(`/finance/invoices?client=${id}`),
          api.get(`/finance?client=${id}`),
          api.get(`/finance/call-history?clientId=${id}`),
          api.get(`/referrals?client=${id}`),
        ]);
        [clientRes, projectsRes, invoicesRes, financeRes, callRes, referralRes] = results;
      } catch (err) {
        console.error('Failed to load client 360 bundle', err);
      }

      let client = clientRes?.status === 'fulfilled' ? clientRes.value?.data?.client : null;

      // Fallback 1: If not found in primary client table, attempt lookup via SMM clients endpoint
      if (!client) {
        try {
          const smmRes = await api.get(`/smm/clients/${encodeURIComponent(id)}`);
          if (smmRes.data?.data) {
            const smm = smmRes.data.data;
            client = {
              _id: smm._id,
              name: smm.primaryContact || smm.companyName,
              company: smm.companyName,
              email: smm.email || '',
              phone: smm.phone || '',
              status: smm.status === 'active' ? 'Active' : (smm.status || 'Active'),
              website: smm.website || '',
              services: ['Social Media Marketing'],
              onboardingSteps: smm.onboardingSteps || {},
              createdAt: smm.createdAt || new Date().toISOString(),
              ...smm,
            };
          }
        } catch (_) {}
      }

      // Fallback 2: Search all clients if id was a name/slug or partial match
      if (!client) {
        try {
          const allRes = await api.get('/clients?limit=500');
          const allList = allRes.data?.clients || allRes.data?.data || [];
          const decodedId = decodeURIComponent(id).toLowerCase().trim();
          const found = allList.find(c => 
            String(c._id) === id || 
            (c.company && c.company.toLowerCase().trim() === decodedId) ||
            (c.name && c.name.toLowerCase().trim() === decodedId)
          );
          if (found) {
            client = found;
          }
        } catch (_) {}
      }

      // If client was resolved and has a different _id than raw id param, ensure sub-resources load
      let projects = projectsRes?.status === 'fulfilled' ? (projectsRes.value.data.projects || projectsRes.value.data || []) : [];
      let invoices = invoicesRes?.status === 'fulfilled' ? invoicesRes.value.data.invoices || [] : [];
      let financeRecords = financeRes?.status === 'fulfilled' ? financeRes.value.data.records || [] : [];
      let callHistory = callRes?.status === 'fulfilled' ? callRes.value.data.calls || [] : [];
      let referrals = referralRes?.status === 'fulfilled' ? referralRes.value.data.referrals || [] : [];

      if (client?._id && String(client._id) !== String(id) && projects.length === 0) {
        try {
          const [subP, subI, subF] = await Promise.allSettled([
            api.get(`/projects?client=${client._id}`),
            api.get(`/finance/invoices?client=${client._id}`),
            api.get(`/finance?client=${client._id}`),
          ]);
          if (subP.status === 'fulfilled') projects = subP.value.data?.projects || subP.value.data || [];
          if (subI.status === 'fulfilled') invoices = subI.value.data?.invoices || [];
          if (subF.status === 'fulfilled') financeRecords = subF.value.data?.records || [];
        } catch (_) {}
      }

      return {
        client,
        projects,
        invoices,
        financeRecords,
        callHistory,
        referrals,
      };
    },
    enabled: Boolean(id) && id !== 'undefined',
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-card rounded-3xl " />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-card rounded-2xl " />)}
        </div>
      </div>
    );
  }

  if (!data?.client) {
    return (
      <div className="p-6 sm:p-10 text-center bg-card rounded-3xl max-w-md mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-secondary text-foreground flex items-center justify-center mx-auto">
          <Building2 size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">Client Profile Not Found</h3>
          <p className="text-xs text-muted-foreground">
            We couldn't locate client details for ID <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-[11px]">{id}</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Link
            to="/clients"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all inline-flex items-center gap-1.5"
          >
            <Users size={14} />
            <span>Return to Clients 360</span>
          </Link>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-secondary/80 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { client, projects, invoices, financeRecords = [], callHistory = [], referrals = [] } = data;

  const onboardingSteps = client.onboardingSteps || {};
  const completedSteps = Object.values(onboardingSteps).filter(Boolean).length;
  const totalSteps = Object.keys(onboardingStepLabels).length;
  const onboardingPercent = Math.round((completedSteps / totalSteps) * 100);

  const totalTasksAvailable = projects.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
  const totalCompletedTasks = projects.reduce((sum, p) => sum + (p.completedTasks ?? p.doneTasks ?? 0), 0);
  const totalOngoingTasks = projects.reduce((sum, p) => sum + (p.ongoingTasks || 0), 0);
  const totalPendingTasks = projects.reduce(
    (sum, p) => sum + (p.pendingTasks ?? Math.max(0, (p.totalTasks || 0) - (p.ongoingTasks || 0) - (p.completedTasks ?? p.doneTasks ?? 0))),
    0
  );
  const paymentNotes = financeRecords.flatMap((record) => record.paymentHistory || []);

  const isFinanceVisible = user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager' || !!user?.permissions?.canManageFinance;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'projects', label: `Projects (${projects.length})`, icon: Briefcase },
    { id: 'vault', label: `Client Vault (${credentials.length})`, icon: LockKeyhole },
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

      <NotionDetailPage
        className="pb-0"
        backTo={isClientUser ? null : '/clients'}
        backLabel={isClientUser ? null : 'Clients'}
        title={client.company || client.name}
        subtitle={[
          client.email,
          client.phone,
          client.website,
          client.createdAt ? `Created ${new Date(client.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}` : null,
        ].filter(Boolean).join(' | ')}
        icon={Building2}
        status={client.status}
        statusClassName={` ${statusStyles[client.status] || statusStyles.Active}`}
        actions={(
          <>
            <button
              type="button"
              onClick={() => handleTabChange('vault')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'vault'
                  ? ' bg-primary text-primary-foreground '
                  : ' bg-secondary text-foreground hover:bg-muted'
              }`}
            >
              <LockKeyhole size={16} className="shrink-0" /> Client Vault
            </button>
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <Mail size={16} className="shrink-0" /> Email Client
              </a>
            )}
            {client.driveLink && (
              <a
                href={client.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <FolderOpen size={16} className="shrink-0" /> Drive Folder
              </a>
            )}
            {user?.role !== 'client' && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
              >
                <Edit2 size={16} className="shrink-0" /> Edit Client
              </button>
            )}
          </>
        )}
      />

      {/* Tabs */}
      <NotionTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Projects & Task Overview (Initial Landing Section) */}
          <ClientProjectsPanel
            clientId={client._id}
            clientName={client.name}
            onAddProject={() => setShowProjectModal(true)}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Details */}
            <div className="lg:col-span-2 bg-card rounded-3xl p-6 space-y-6">
              <h2 className="font-bold text-lg">Client Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                {[
                  ['Type / Sector', client.industry || 'Not set'],
                  ['Account Tier', client.tier || 'Starter'],
                  ['Contract Start', client.contractStartDate ? new Date(client.contractStartDate).toLocaleDateString() : '—'],
                  ['Contract End', client.contractEndDate ? new Date(client.contractEndDate).toLocaleDateString() : 'Ongoing / Retainer (No End Date)'],
                  ['Requirements', client.services?.join(', ') || 'Not set'],
                  ['Active Projects', `${projects.filter((p) => p.status === 'In Progress' || p.status === 'active').length} of ${projects.length}`],
                ].map(([label, value]) => (
                  <div key={label} className="p-4 bg-secondary/30 rounded-2xl ">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                    <p className="font-semibold capitalize">{value}</p>
                  </div>
                ))}
                {/* Drive Link — full-width card */}
                <div className="sm:col-span-2 p-4 bg-secondary/30 rounded-2xl ">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FolderOpen size={13} /> Google Drive Folder
                  </p>
                  {client.driveLink ? (
                    <a
                      href={client.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:underline break-all"
                    >
                      <FolderOpen size={15} className="shrink-0" />
                      {client.driveLink}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No Drive folder linked yet.{' '}
                      {user?.role !== 'client' && (
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="text-foreground underline font-medium"
                        >
                          Add one
                        </button>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {client.notes && (
                <div className="p-4 bg-secondary/30 rounded-2xl ">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{client.notes}</p>
                </div>
              )}
            </div>

            {/* Onboarding Progress Card */}
            <div className="bg-card rounded-3xl p-6">
              <h2 className="font-bold text-lg mb-5">Onboarding Progress</h2>
              <div className="relative mb-6">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium tabular-nums">{completedSteps}/{totalSteps} steps</span>
                  <span className="text-2xl font-black text-foreground tabular-nums">{onboardingPercent}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    style={{ width: `${onboardingPercent}%` }}
                    className="h-full bg-primary rounded-full transition-[width] duration-500 ease-out"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(onboardingStepLabels).map(([key, label]) => {
                  const done = onboardingSteps[key];
                  return (
                    <div key={key} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${done ? ' bg-secondary/60' : ' bg-background'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-primary text-primary-foreground' : 'bg-secondary '}`}>
                        {done && <CheckCircle2 size={12} />}
                      </div>
                      <span className={`text-xs font-semibold ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-5">
          {/* Projects Header */}
          <div className="bg-card rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <Briefcase size={20} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">Projects & Completion Status</h2>
                <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                  {projects.length} {projects.length === 1 ? 'project' : 'projects'} · {totalTasksAvailable} tasks available · {totalCompletedTasks} completed
                </p>
              </div>
            </div>
            {user?.role !== 'client' && (
              <button
                type="button"
                onClick={() => setShowProjectModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>New Project</span>
              </button>
            )}
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => {
                const catMeta = getProjectCategoryMeta(proj.category);
                const CatIcon = catMeta.icon;
                const projStatus = String(proj.status || 'Planning').replace(/_/g, ' ');
                const isDoneStatus = projStatus.toLowerCase() === 'completed';
                const isActiveStatus = projStatus.toLowerCase() === 'in progress' || projStatus.toLowerCase() === 'active';
                const pTotal = proj.totalTasks || 0;
                const pOngoing = proj.ongoingTasks || 0;
                const pCompleted = proj.completedTasks ?? proj.doneTasks ?? 0;
                const pPending = proj.pendingTasks ?? Math.max(0, pTotal - pOngoing - pCompleted);
                const pProgress = proj.progress || 0;
                const endDateVal = proj.endDate || proj.dueDate;

                return (
                  <Link
                    key={proj._id}
                    to={`/projects/${proj._id}`}
                    className="bg-card rounded-3xl p-5 sm:p-6 hover:bg-secondary/40 transition-all flex flex-col justify-between gap-4 group"
                  >
                    {/* Header: Type, Project Status & Title */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-secondary text-foreground">
                          <CatIcon size={12} className="shrink-0" />
                          <span>{catMeta.shortLabel || catMeta.label}</span>
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                            isActiveStatus
                              ? 'bg-primary text-primary-foreground'
                              : isDoneStatus
                              ? 'bg-secondary text-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {projStatus}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {proj.name}
                        </h3>
                        <ArrowRight size={16} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                      </div>

                      {/* Start & End Dates */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums flex-wrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={12} className="shrink-0" />
                          <span>
                            Start: <strong className="text-foreground font-semibold">{proj.startDate ? new Date(proj.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>
                          </span>
                        </span>
                        <span>
                          End: <strong className="text-foreground font-semibold">{endDateVal ? new Date(endDateVal).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Tasks Completion Status Block */}
                    <div className="p-4 rounded-2xl bg-background space-y-3 tabular-nums">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground inline-flex items-center gap-1.5">
                          <ListChecks size={14} className="text-muted-foreground shrink-0" />
                          <span>Tasks Completion Status</span>
                        </span>
                        <span className="font-bold text-foreground">
                          {pCompleted}/{pTotal} ({pProgress}%)
                        </span>
                      </div>

                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(pProgress, 100)}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-0.5 text-center">
                        <div className="rounded-xl bg-card p-2">
                          <div className="text-[10px] font-medium text-muted-foreground">Available</div>
                          <div className="text-sm font-bold text-foreground mt-0.5">{pTotal}</div>
                        </div>
                        <div className="rounded-xl bg-card p-2">
                          <div className="text-[10px] font-medium text-muted-foreground">Ongoing</div>
                          <div className="text-sm font-bold text-foreground mt-0.5">{pOngoing}</div>
                        </div>
                        <div className="rounded-xl bg-card p-2">
                          <div className="text-[10px] font-medium text-muted-foreground">Pending</div>
                          <div className="text-sm font-bold text-foreground mt-0.5">{pPending}</div>
                        </div>
                        <div className="rounded-xl bg-card p-2">
                          <div className="text-[10px] font-medium text-muted-foreground">Done</div>
                          <div className="text-sm font-bold text-foreground mt-0.5">{pCompleted}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-card rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
                <Briefcase size={22} />
              </div>
              <p className="text-sm text-muted-foreground">No projects yet for this client.</p>
              {user?.role !== 'client' && (
                <button
                  type="button"
                  onClick={() => setShowProjectModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create First Project</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'vault' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-card rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-secondary text-foreground flex items-center justify-center font-bold text-xl shrink-0">
                <LockKeyhole size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  Client Vault & Logins
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-foreground tabular-nums">
                    {credentials.length} {credentials.length === 1 ? 'Record' : 'Records'}
                  </span>
                </h2>
              </div>
            </div>

            {!isClientUser && (
              <Link
                to="/client-vault"
                className="inline-flex items-center gap-2 text-xs font-bold text-foreground bg-secondary hover:bg-muted px-3.5 py-2 rounded-xl transition-all "
              >
                <KeyRound size={14} className="shrink-0" /> Open Full Vault Manager
              </Link>
            )}
          </div>

          {/* Cards or Empty State */}
          {credentials.length === 0 ? (
            <div className="bg-card rounded-3xl p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
                <LockKeyhole size={24} />
              </div>
              <h3 className="font-bold text-base">No Vault Credentials Added</h3>
              {!isClientUser && (
                <Link
                  to="/client-vault"
                  className="inline-flex items-center gap-2 text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-xl shadow hover:opacity-90 transition-all mt-2"
                >
                  <Plus size={14} className="shrink-0" /> Add Credential in Vault
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {credentials.map((item) => {
                const isRevealed = activePasswordId === item._id && Boolean(revealedCredential?.password);
                const isExpanded = expandedCards[item._id];
                const accounts = item.socialAccounts || [];

                return (
                  <div
                    key={item._id}
                    className="bg-card rounded-3xl p-5 space-y-4 flex flex-col justify-between transition-all"
                  >
                    <div className="space-y-3.5">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-secondary uppercase tracking-wider text-muted-foreground ">
                          {item.credentialType?.replace(/_/g, ' ') || 'Credential'}
                        </span>
                        {item.url && (
                          <a
                            href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground hover:underline"
                            title="Open login URL"
                          >
                            <span>Login Portal</span>
                            <ExternalLink size={11} className="shrink-0" />
                          </a>
                        )}
                      </div>

                      {/* Card Title */}
                      <div>
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                          <LockKeyhole size={16} className="text-foreground shrink-0" />
                          <span className="truncate">{item.credentialName}</span>
                        </h3>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Primary Credential Box */}
                      <div className="p-3.5 rounded-2xl bg-secondary/35 space-y-2 text-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                          <KeyRound size={11} className="shrink-0" /> Primary Credential
                        </div>

                        {/* Username */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground text-[11px]">User:</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-medium truncate max-w-[170px]">
                              {item.username || '—'}
                            </span>
                            {item.username && (
                              <button
                                type="button"
                                onClick={() => handleCopy(item.username, `user-${item._id}`)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                                title="Copy username"
                              >
                                {copiedId === `user-${item._id}` ? (
                                  <Check size={12} className="text-foreground" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Password */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground text-[11px]">Pass:</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-medium truncate max-w-[170px]">
                              {isRevealed ? revealedCredential.password : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setActivePasswordId(activePasswordId === item._id ? null : item._id)}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                              title={isRevealed ? 'Hide password' : 'View password'}
                            >
                              {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            {isRevealed && (
                              <button
                                type="button"
                                onClick={() => handleCopy(revealedCredential.password, `pass-${item._id}`)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                                title="Copy password"
                              >
                                {copiedId === `pass-${item._id}` ? (
                                  <Check size={12} className="text-foreground" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Email */}
                        {item.email && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-[11px]">Email:</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono font-medium truncate max-w-[170px]">
                                {item.email}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.email, `email-${item._id}`)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                              >
                                {copiedId === `email-${item._id}` ? (
                                  <Check size={12} className="text-foreground" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Mobile */}
                        {item.mobileNumber && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-[11px]">Mobile:</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono font-medium tabular-nums">{item.mobileNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.mobileNumber, `mob-${item._id}`)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                              >
                                {copiedId === `mob-${item._id}` ? (
                                  <Check size={12} className="text-foreground" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Platform Accounts Expandable Section */}
                      {accounts.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePasswordId(item._id);
                              toggleCard(item._id);
                            }}
                            className="w-full flex items-center justify-between text-xs font-semibold text-foreground px-3 py-2 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-all cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <AtSign size={13} className="text-foreground shrink-0" />
                              <span className="tabular-nums">{accounts.length} Platform Account{accounts.length > 1 ? 's' : ''}</span>
                              <span className="text-muted-foreground font-mono text-[10px] ml-1 uppercase">
                                {accounts.map((a) => getPlatformMeta(a.platform).code).join(' · ')}
                              </span>
                            </span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {isExpanded && (
                            <div className="space-y-2.5 pt-1">
                              {accounts.map((acc, accIdx) => {
                                const meta = getPlatformMeta(acc.platform);
                                const revealedAcc =
                                  isRevealed && revealedCredential?.socialAccounts?.[accIdx]
                                    ? { ...acc, password: revealedCredential.socialAccounts[accIdx].password }
                                    : acc;
                                const accPassRevealed = Boolean(revealedAcc.password);

                                return (
                                  <div
                                    key={accIdx}
                                    className="rounded-2xl bg-background p-3 space-y-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between font-bold text-foreground">
                                      <span className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-secondary text-[9px] font-mono">{meta.code}</span>
                                        <span>{acc.platformLabel || meta.label}</span>
                                      </span>
                                      {acc.pages && acc.pages.length > 0 && (
                                        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded bg-secondary tabular-nums">
                                          {acc.pages.length} page{acc.pages.length > 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] pt-1">
                                      {acc.accountHandle && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Handle:</span>
                                          <div className="flex items-center gap-1">
                                            <span className="font-mono font-medium truncate max-w-[120px]">
                                              {acc.accountHandle}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(acc.accountHandle, `hnd-${item._id}-${accIdx}`)}
                                              className="cursor-pointer"
                                            >
                                              {copiedId === `hnd-${item._id}-${accIdx}` ? (
                                                <Check size={10} className="text-foreground" />
                                              ) : (
                                                <Copy size={10} />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {acc.email && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Email:</span>
                                          <div className="flex items-center gap-1">
                                            <span className="font-mono font-medium truncate max-w-[120px]">
                                              {acc.email}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(acc.email, `aem-${item._id}-${accIdx}`)}
                                              className="cursor-pointer"
                                            >
                                              {copiedId === `aem-${item._id}-${accIdx}` ? (
                                                <Check size={10} className="text-foreground" />
                                              ) : (
                                                <Copy size={10} />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {acc.mobileNumber && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Mobile:</span>
                                          <div className="flex items-center gap-1">
                                            <span className="font-mono font-medium tabular-nums">
                                              {acc.mobileNumber}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(acc.mobileNumber, `amob-${item._id}-${accIdx}`)}
                                              className="cursor-pointer"
                                            >
                                              {copiedId === `amob-${item._id}-${accIdx}` ? (
                                                <Check size={10} className="text-foreground" />
                                              ) : (
                                                <Copy size={10} />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Password:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono font-medium truncate max-w-[120px]">
                                            {accPassRevealed ? revealedAcc.password : '••••••••'}
                                          </span>
                                          {accPassRevealed ? (
                                            <button
                                              type="button"
                                              onClick={() => handleCopy(revealedAcc.password, `apass-${item._id}-${accIdx}`)}
                                              className="cursor-pointer"
                                            >
                                              {copiedId === `apass-${item._id}-${accIdx}` ? (
                                                <Check size={10} className="text-foreground" />
                                              ) : (
                                                <Copy size={10} />
                                              )}
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setActivePasswordId(item._id)}
                                              title="Reveal password"
                                              className="cursor-pointer"
                                            >
                                              <Eye size={10} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Pages if any */}
                                    {acc.pages && acc.pages.length > 0 && (
                                      <div className="mt-2 pt-2 space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                          Pages & Roles
                                        </p>
                                        {acc.pages.map((p, pIdx) => (
                                          <div
                                            key={pIdx}
                                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-secondary/40 text-[11px]"
                                          >
                                            <div className="min-w-0">
                                              <span className="font-semibold">{p.pageName || 'Page'}</span>
                                              {p.pageId && (
                                                <span className="text-muted-foreground ml-1.5 text-[10px] font-mono">
                                                  ID: {p.pageId}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-secondary text-foreground">
                                                {p.role || 'Admin'}
                                              </span>
                                              {p.pageUrl && (
                                                <a
                                                  href={p.pageUrl.startsWith('http') ? p.pageUrl : `https://${p.pageUrl}`}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-foreground hover:underline"
                                                >
                                                  <ExternalLink size={10} />
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Tags / Footer */}
                    {item.tags && (Array.isArray(item.tags) ? item.tags.length > 0 : Boolean(item.tags)) && (
                      <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                        {(Array.isArray(item.tags) ? item.tags : item.tags.split(','))
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-card rounded-3xl overflow-hidden">
          <div className="p-5 bg-secondary/10">
            <h2 className="font-bold flex items-center gap-2"><FileText size={18} className="text-foreground shrink-0"/>Invoices</h2>
          </div>
          <div className="overflow-x-auto responsive-table-container">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="text-muted-foreground font-medium text-left">
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.05]">
                {invoices.length > 0 ? invoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-bold tabular-nums">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 font-bold text-foreground text-right tabular-nums">{formatINR(inv.total || inv.amount || 0)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inv.status?.toLowerCase() === 'paid' ? 'bg-primary text-primary-foreground ' :
                        inv.status?.toLowerCase() === 'overdue' ? 'bg-secondary text-foreground' :
                        'bg-secondary text-muted-foreground'
                      }`}>{inv.status}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground tabular-nums">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
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
            <div key={record._id} className="bg-card rounded-3xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{record.serviceName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{record.projectName || record.projectId?.name}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  record.paymentStatus === 'Paid' ? 'bg-primary text-primary-foreground ' :
                  record.paymentStatus === 'Overdue' ? 'bg-secondary text-foreground' :
                  record.paymentStatus === 'Partially Paid' ? 'bg-secondary text-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>{record.paymentStatus}</span>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-secondary/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</p>
                  <p className="mt-1 font-semibold tabular-nums">₹{Number(record.totalProjectAmount || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-secondary/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paid</p>
                  <p className="mt-1 font-semibold tabular-nums">₹{Number(record.totalPaidAmount || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-secondary/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Balance</p>
                  <p className="mt-1 font-semibold tabular-nums">₹{Number(record.balanceAmount || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground space-y-1 tabular-nums">
                <p>Invoice Status: <span className="font-semibold text-foreground">{record.invoiceStatus}</span></p>
                <p>Due Date: <span className="font-semibold text-foreground">{record.paymentDueDate ? new Date(record.paymentDueDate).toLocaleDateString() : '—'}</span></p>
                <p>Next Follow-up: <span className="font-semibold text-foreground">{record.nextFollowUpDate ? new Date(record.nextFollowUpDate).toLocaleDateString() : '—'}</span></p>
              </div>
            </div>
          )) : (
            <div className="bg-card rounded-3xl p-12 text-center text-muted-foreground lg:col-span-2">No finance records yet.</div>
          )}
        </div>
      )}

      {activeTab === 'paymentNotes' && (
        <div className="bg-card rounded-3xl overflow-hidden">
          <div className="p-5 bg-secondary/10">
            <h2 className="font-bold flex items-center gap-2"><AlertCircle size={18} className="text-foreground shrink-0"/>Payment Notes</h2>
          </div>
          <div className="divide-y divide-foreground/[0.05]">
            {paymentNotes.length > 0 ? paymentNotes.map((note, index) => (
              <div key={note._id || index} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{note.noteTitle || 'Payment note'}</p>
                    <p className="text-sm text-muted-foreground mt-1">{note.noteDescription || 'No description added'}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-bold text-foreground">₹{Number(note.amountPaid || 0).toLocaleString()}</p>
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
        <div className="bg-card rounded-3xl overflow-hidden">
          <div className="p-5 bg-secondary/10">
            <h2 className="font-bold flex items-center gap-2"><Phone size={18} className="text-primary"/>Call History</h2>
          </div>
          <div className="divide-y divide-foreground/[0.05]">
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
        <div className="bg-card rounded-3xl overflow-hidden">
          <div className="p-5 bg-secondary/10">
            <h2 className="font-bold flex items-center gap-2"><Users size={18} className="text-primary"/>Referrals</h2>
          </div>
          <div className="divide-y divide-foreground/[0.05]">
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
          <div className="bg-card rounded-3xl p-6">
            <h2 className="font-bold text-lg mb-5">Onboarding Checklist</h2>
            <div className="space-y-3">
              {Object.entries(onboardingStepLabels).map(([key, label]) => {
                const done = onboardingSteps[key];
                return (
                  <div key={key} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${done ? ' bg-secondary/50' : ' bg-background'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-primary text-primary-foreground' : 'bg-secondary '}`}>
                      {done ? <CheckCircle2 size={16} /> : <Clock size={16} className="text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${done ? 'text-foreground line-through' : 'text-foreground'}`}>{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{done ? 'Completed' : 'Pending'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-card rounded-3xl p-6">
            <h2 className="font-bold text-lg mb-5">Social Media</h2>
            {client.socialMedia && Object.entries(client.socialMedia).some(([, v]) => v) ? (
              <div className="space-y-3">
                {Object.entries(client.socialMedia).filter(([, v]) => v).map(([platform, handle]) => (
                  <div key={platform} className="flex items-center gap-3 p-4 bg-secondary/30 rounded-2xl ">
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
            onOpenChange={(open) => {
              setShowProjectModal(open);
              if (!open) refetch();
            }}
            defaultClientId={client._id}
          />
        </>
      )}
    </div>
  );
};

export default ClientDetails;
