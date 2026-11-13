import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  CalendarClock,
  Clock,
  Globe,
  IndianRupee,
  Mail,
  Pencil,
  Phone,
  RefreshCcw,
  Tag,
  User,
  FileText,
  ExternalLink,
} from '@/components/ui/muiIcons';
import { format } from 'date-fns';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/page';
import {
  NotionDetailPage,
  NotionProperty,
  NotionPropertyGrid,
  NotionSection,
} from '../../components/ui/NotionDetailTemplate';
import { AddLeadModal } from '../../components/modals/AddLeadModal';
import { useLead } from '../../hooks/useLeads';
import { useProposals } from '../../hooks/useProposals';
import { formatINR } from '../../utils/currency';

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
  const { data: proposals = [], isLoading: isProposalsLoading } = useProposals({ lead: id });

  const fmt = (dateStr) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, h:mm a');
    } catch {
      return String(dateStr);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-8 w-64 rounded-xl bg-secondary/70" />
        <div className="h-96 rounded-3xl bg-card" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4 py-24 text-center">
        <AlertCircle className="mx-auto text-muted-foreground" size={40} />
        <p className="text-sm text-muted-foreground">Lead not found</p>
        <Button onClick={() => navigate('/crm/leads')}>Back to Leads</Button>
      </div>
    );
  }

  const dealValue = lead.budget ?? lead.value;
  const status = lead.status || lead.stage || 'New';

  return (
    <NotionDetailPage
      backTo="/crm/leads"
      backLabel="CRM & Leads"
      title={lead.name}
      subtitle={lead.company}
      icon={Building2}
      status={<StatusBadge tone={stageTone[status] || 'neutral'}>{status}</StatusBadge>}
      actions={(
        <Button size="sm" onClick={() => setEditing(true)} className="h-9 rounded-xl gap-2 text-xs font-bold ">
          <Pencil size={13} />
          Edit Lead
        </Button>
      )}
      className="max-w-7xl"
    >
      <div className="space-y-6">
        <NotionSection title="Contact">
          <NotionPropertyGrid>
            <NotionProperty icon={Phone} label="Phone" value={lead.phone} accent="text-muted-foreground" />
            <NotionProperty icon={Mail} label="Email" value={lead.email} accent="text-muted-foreground" />
            <NotionProperty icon={Building2} label="Company" value={lead.company} />
          </NotionPropertyGrid>
        </NotionSection>

        <NotionSection title="Deal Details">
          <NotionPropertyGrid>
            <NotionProperty icon={Tag} label="Source" value={lead.source} />
            <NotionProperty icon={Globe} label="Service Interested" value={lead.serviceInterest} accent="text-muted-foreground" />
            <NotionProperty icon={User} label="Decision Maker" value={lead.decisionMaker} />
            <NotionProperty
              icon={IndianRupee}
              label="Deal Value"
              value={dealValue ? formatINR(dealValue) : null}
              accent="text-muted-foreground"
            />
          </NotionPropertyGrid>
        </NotionSection>

        <NotionSection title="Assignment & Timeline">
          <NotionPropertyGrid>
            <NotionProperty icon={User} label="Assigned To" value={lead.assignedTo?.name} accent="text-muted-foreground" />
            <NotionProperty icon={CalendarClock} label="Follow-up Date" value={fmt(lead.followUpDate || lead.expectedCloseDate)} accent="text-muted-foreground" />
            <NotionProperty icon={RefreshCcw} label="Refollow Date" value={fmt(lead.refollowDate)} accent="text-muted-foreground" />
          </NotionPropertyGrid>
        </NotionSection>

        <NotionSection title="Record">
          <NotionPropertyGrid>
            <NotionProperty icon={Clock} label="Created" value={fmt(lead.createdAt)} />
            <NotionProperty icon={Clock} label="Updated" value={fmt(lead.updatedAt)} />
          </NotionPropertyGrid>
        </NotionSection>

        <NotionSection title={`Proposals Sent (${proposals.length})`}>
          {isProposalsLoading ? (
            <div className="h-20 rounded-2xl bg-secondary/30 animate-pulse" />
          ) : proposals.length === 0 ? (
            <div className="rounded-2xl bg-secondary/25 p-5 text-center text-xs text-muted-foreground">
              No proposals sent to this lead yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {proposals.map((prop) => (
                <div
                  key={prop._id}
                  onClick={() => navigate(`/proposals/${prop._id}`)}
                  className="p-4 rounded-2xl bg-card border border-border/50 hover:bg-secondary/40 transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground truncate">{prop.title}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">
                      {prop.status || 'Sent'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                    <span>{prop.proposalNumber || 'Proposal'}</span>
                    <span className="font-bold text-foreground">
                      {prop.totalAmount ? formatINR(prop.totalAmount) : '—'}
                    </span>
                  </div>
                  {prop.createdAt && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock size={11} />
                      <span>Sent {format(new Date(prop.createdAt), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </NotionSection>

        {lead.notes ? (
          <NotionSection title="Notes">
            <div className="rounded-2xl bg-secondary/35 px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{lead.notes}</p>
            </div>
          </NotionSection>
        ) : null}
      </div>

      <AddLeadModal
        open={editing}
        onOpenChange={(open) => {
          setEditing(open);
          if (!open) refetch();
        }}
        lead={lead}
      />
    </NotionDetailPage>
  );
};

export default LeadDetails;
