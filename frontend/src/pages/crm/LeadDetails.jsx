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
} from 'lucide-react';
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
      <div className="mx-auto max-w-7xl animate-pulse space-y-4">
        <div className="h-8 w-64 rounded-xl bg-secondary/70" />
        <div className="h-96 rounded-3xl border border-border bg-card" />
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
        <Button size="sm" onClick={() => setEditing(true)} className="h-9 rounded-xl gap-2 text-xs font-bold shadow-sm">
          <Pencil size={13} />
          Edit Lead
        </Button>
      )}
      className="max-w-7xl"
    >
      <div className="space-y-6">
        <NotionSection title="Contact">
          <NotionPropertyGrid>
            <NotionProperty icon={Phone} label="Phone" value={lead.phone} accent="text-emerald-500" />
            <NotionProperty icon={Mail} label="Email" value={lead.email} accent="text-blue-500" />
            <NotionProperty icon={Building2} label="Company" value={lead.company} />
          </NotionPropertyGrid>
        </NotionSection>

        <NotionSection title="Deal Details">
          <NotionPropertyGrid>
            <NotionProperty icon={Tag} label="Source" value={lead.source} />
            <NotionProperty icon={Globe} label="Service Interested" value={lead.serviceInterest} accent="text-violet-500" />
            <NotionProperty icon={User} label="Decision Maker" value={lead.decisionMaker} />
            <NotionProperty
              icon={IndianRupee}
              label="Deal Value"
              value={dealValue ? formatINR(dealValue) : null}
              accent="text-emerald-500"
            />
          </NotionPropertyGrid>
        </NotionSection>

        <NotionSection title="Assignment & Timeline">
          <NotionPropertyGrid>
            <NotionProperty icon={User} label="Assigned To" value={lead.assignedTo?.name} accent="text-indigo-500" />
            <NotionProperty icon={CalendarClock} label="Follow-up Date" value={fmt(lead.followUpDate || lead.expectedCloseDate)} accent="text-amber-500" />
            <NotionProperty icon={RefreshCcw} label="Refollow Date" value={fmt(lead.refollowDate)} accent="text-orange-400" />
          </NotionPropertyGrid>
        </NotionSection>

        <NotionSection title="Record">
          <NotionPropertyGrid>
            <NotionProperty icon={Clock} label="Created" value={fmt(lead.createdAt)} />
            <NotionProperty icon={Clock} label="Updated" value={fmt(lead.updatedAt)} />
          </NotionPropertyGrid>
        </NotionSection>

        {lead.notes ? (
          <NotionSection title="Notes">
            <div className="rounded-2xl border border-border/60 bg-secondary/35 px-5 py-4">
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
