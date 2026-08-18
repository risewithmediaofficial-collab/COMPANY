import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Phone,
  Mail,
  User,
  CalendarClock,
  RefreshCcw,
  Tag,
  Globe,
  Building2,
  IndianRupee,
  Clock,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/page';
import { useLead } from '../../hooks/useLeads';
import { AddLeadModal } from '../../components/modals/AddLeadModal';
import { formatINR } from '../../utils/currency';
import { format } from 'date-fns';

/* ─── Notion-style property row ─── */
const Prop = ({ icon: Icon, label, value, accent }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors group">
      <div className={`mt-0.5 shrink-0 ${accent || 'text-muted-foreground'}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1 grid items-start gap-2" style={{ gridTemplateColumns: '140px 1fr' }}>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-0.5 leading-5">
          {label}
        </span>
        <span className="text-sm font-medium text-foreground break-words leading-5">{value}</span>
      </div>
    </div>
  );
};

/* ─── Section header ─── */
const Section = ({ title, children }) => (
  <div className="space-y-0.5">
    <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
      {title}
    </p>
    {children}
  </div>
);

/* ─── Status → gradient map ─── */
const stageGradient = {
  New: 'from-sky-500 to-blue-600',
  Contacted: 'from-blue-500 to-indigo-600',
  Qualified: 'from-emerald-500 to-teal-600',
  'Proposal Sent': 'from-amber-400 to-orange-500',
  Negotiation: 'from-orange-400 to-rose-500',
  Won: 'from-emerald-400 to-green-600',
  Lost: 'from-rose-400 to-red-600',
  'On Hold': 'from-gray-400 to-slate-500',
};

const stageTone = {
  New: 'info',
  Contacted: 'info',
  Qualified: 'success',
  'Proposal Sent': 'warning',
  Negotiation: 'warning',
  Won: 'success',
  Lost: 'danger',
  'On Hold': 'neutral',
};

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const { data: lead, isLoading, refetch } = useLead(id);

  /* Loading */
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
        <div className="h-32 rounded-t-3xl bg-secondary/50" />
        <div className="h-80 rounded-b-3xl bg-card border border-border" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-24 space-y-4">
        <AlertCircle className="mx-auto text-muted-foreground" size={40} />
        <p className="text-muted-foreground text-sm">Lead not found</p>
        <Button onClick={() => navigate('/crm/leads')}>Back to Leads</Button>
      </div>
    );
  }

  const dealValue = lead.budget ?? lead.value;
  const status = lead.status || lead.stage || 'New';
  const gradient = stageGradient[status] || 'from-primary to-indigo-600';

  const fmt = (dateStr) => {
    if (!dateStr) return null;
    try { return format(new Date(dateStr), 'dd MMM yyyy, h:mm a'); }
    catch { return String(dateStr); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-0">

      {/* ── Breadcrumb nav ── */}
      <div className="flex items-center gap-1.5 mb-4">
        <Link
          to="/crm/leads"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          CRM & Leads
        </Link>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">{lead.name}</span>
      </div>

      {/* ── Cover Banner ── */}
      <div
        className={`h-32 rounded-t-3xl bg-gradient-to-r ${gradient} relative overflow-hidden`}
      >
        {/* subtle diagonal stripe texture */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg,transparent,transparent 24px,rgba(255,255,255,.3) 24px,rgba(255,255,255,.3) 25px)',
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* ── Main card ── */}
      <div className="rounded-b-3xl border border-t-0 border-border bg-card shadow-sm">

        {/* Avatar + Heading */}
        <div className="px-8 pb-6 pt-0">
          <div className="relative -mt-9 mb-4 flex items-end justify-between gap-3 flex-wrap">
            {/* Avatar */}
            <div
              className={`h-[72px] w-[72px] rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-3xl font-black shadow-xl ring-4 ring-card shrink-0`}
            >
              {lead.name?.charAt(0)?.toUpperCase() || '?'}
            </div>

            {/* Edit button */}
            <Button
              size="sm"
              onClick={() => setEditing(true)}
              className="rounded-xl gap-2 shadow-sm h-9 text-xs font-bold"
            >
              <Pencil size={13} />
              Edit Lead
            </Button>
          </div>

          {/* Name + status */}
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground leading-tight">
              {lead.name}
            </h1>
            <StatusBadge tone={stageTone[status] || 'neutral'}>{status}</StatusBadge>
          </div>
          {lead.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Building2 size={13} />
              {lead.company}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/60 mx-6" />

        {/* ── Properties ── */}
        <div className="px-4 py-5 space-y-5">

          <Section title="Contact">
            <Prop icon={Phone} label="Phone" value={lead.phone} accent="text-emerald-500" />
            <Prop icon={Mail} label="Email" value={lead.email} accent="text-blue-500" />
            <Prop icon={Building2} label="Company" value={lead.company} />
          </Section>

          <Section title="Deal Details">
            <Prop icon={Tag} label="Source" value={lead.source} />
            <Prop icon={Globe} label="Service Interested" value={lead.serviceInterest} accent="text-violet-500" />
            <Prop icon={User} label="Decision Maker" value={lead.decisionMaker} />
            <Prop
              icon={IndianRupee}
              label="Deal Value"
              value={dealValue ? formatINR(dealValue) : null}
              accent="text-emerald-500"
            />
          </Section>

          <Section title="Assignment & Timeline">
            <Prop icon={User} label="Assigned To" value={lead.assignedTo?.name} accent="text-indigo-500" />
            <Prop icon={CalendarClock} label="Follow-up Date" value={fmt(lead.followUpDate || lead.expectedCloseDate)} accent="text-amber-500" />
            <Prop icon={RefreshCcw} label="Refollow Date" value={fmt(lead.refollowDate)} accent="text-orange-400" />
          </Section>

          <Section title="Record">
            <Prop icon={Clock} label="Created" value={fmt(lead.createdAt)} />
            <Prop icon={Clock} label="Updated" value={fmt(lead.updatedAt)} />
          </Section>

          {/* Notes */}
          {lead.notes && (
            <>
              <div className="h-px bg-border/60 mx-2" />
              <div className="px-4 pb-2 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Notes
                </p>
                <div className="rounded-2xl bg-secondary/40 border border-border/60 px-5 py-4">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {lead.notes}
                  </p>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      <AddLeadModal
        open={editing}
        onOpenChange={(open) => {
          setEditing(open);
          if (!open) refetch();
        }}
        lead={lead}
      />
    </div>
  );
};

export default LeadDetails;




