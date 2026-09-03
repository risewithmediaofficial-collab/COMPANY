import { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Phone, PhoneCall, Plus, Search, Calendar, User, Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import { useLeads, useUpdateLead } from '../../hooks/useLeads';
import { useCallHistory, useCreateCallHistory, useUpdateCallHistory, useDeleteCallHistory } from '../../hooks/useFinance';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { Button } from '../../components/ui/button';
import { PageHeader, PageToolbar, SectionCard, StatusBadge } from '../../components/ui/page';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';

const CALL_TYPES = ['Incoming', 'Outgoing', 'Missed', 'WhatsApp Call', 'Google Meet', 'Zoom', 'Direct Meeting'];
const CALL_PURPOSES = ['Payment Follow-up', 'Task Discussion', 'Requirement Collection', 'Approval Follow-up', 'Rework Discussion', 'General Update', 'Complaint', 'Other'];
const LEAD_STAGES = ['new', 'contacted', 'qualified', 'meeting_booked', 'proposal_sent', 'negotiation', 'won', 'lost', 'refollow_later'];
const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const LEAD_SOURCES = ['website', 'referral', 'social_media', 'cold_call', 'email_campaign', 'walk_in', 'other'];

export default function CallHistoryDashboard() {
  const { user } = useSelector((state) => state.auth);
  const canManage = ['superAdmin', 'admin', 'manager', 'employee'].includes(user?.role);

  // Queries
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: leads = [] } = useLeads();
  const [filterType, setFilterType] = useState('all'); // all, client, lead
  const [searchQuery, setSearchQuery] = useState('');

  const callHistoryQuery = useCallHistory();
  const createCallHistory = useCreateCallHistory();
  const updateCallHistory = useUpdateCallHistory();
  const deleteCallHistory = useDeleteCallHistory();
  const updateLead = useUpdateLead();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formType, setFormType] = useState('client'); // client, lead, unregistered
  const [form, setForm] = useState({
    clientId: '',
    leadId: '',
    projectId: '',
    callType: 'Outgoing',
    callPurpose: 'General Update',
    callDate: new Date().toISOString().split('T')[0],
    callTime: '',
    spokenWith: '',
    contactNumber: '',
    callSummary: '',
    clientResponse: '',
    nextAction: '',
    nextFollowUpDate: '',
    visibleToClient: false,
    // Extra lead details to update lead directly
    leadStage: 'contacted',
    leadValue: 0,
    leadPriority: 'medium',
    leadSource: 'other',
    unregisteredClientName: '',
    unregisteredClientPhone: '',
    unregisteredClientAddress: '',
  });

  // Load editing values
  const startEdit = (call) => {
    setIsEditing(true);
    setEditingId(call._id);
    const isLeadCall = !!call.leadId;
    const isUnregistered = !call.clientId && !call.leadId && !!call.unregisteredClientName;
    setFormType(isUnregistered ? 'unregistered' : (isLeadCall ? 'lead' : 'client'));
    setForm({
      clientId: call.clientId?._id || '',
      leadId: call.leadId?._id || '',
      projectId: call.projectId?._id || '',
      callType: call.callType || 'Outgoing',
      callPurpose: call.callPurpose || 'General Update',
      callDate: call.callDate ? new Date(call.callDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      callTime: call.callTime || '',
      spokenWith: call.spokenWith || '',
      contactNumber: call.contactNumber || '',
      callSummary: call.callSummary || '',
      clientResponse: call.clientResponse || '',
      nextAction: call.nextAction || '',
      nextFollowUpDate: call.nextFollowUpDate ? new Date(call.nextFollowUpDate).toISOString().split('T')[0] : '',
      visibleToClient: !!call.visibleToClient,
      leadStage: call.leadId?.stage || 'contacted',
      leadValue: call.leadId?.value || 0,
      leadPriority: call.leadId?.priority || 'medium',
      leadSource: call.leadId?.source || 'other',
      unregisteredClientName: call.unregisteredClientName || '',
      unregisteredClientPhone: call.unregisteredClientPhone || '',
      unregisteredClientAddress: call.unregisteredClientAddress || '',
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      clientId: '',
      leadId: '',
      projectId: '',
      callType: 'Outgoing',
      callPurpose: 'General Update',
      callDate: new Date().toISOString().split('T')[0],
      callTime: '',
      spokenWith: '',
      contactNumber: '',
      callSummary: '',
      clientResponse: '',
      nextAction: '',
      nextFollowUpDate: '',
      visibleToClient: false,
      leadStage: 'contacted',
      leadValue: 0,
      leadPriority: 'medium',
      leadSource: 'other',
      unregisteredClientName: '',
      unregisteredClientPhone: '',
      unregisteredClientAddress: '',
    });
  };

  // Pre-populate lead details if lead changes
  useEffect(() => {
    if (formType === 'lead' && form.leadId) {
      const selectedLead = leads.find((l) => l._id === form.leadId);
      if (selectedLead) {
        setForm((prev) => ({
          ...prev,
          spokenWith: selectedLead.name || prev.spokenWith,
          contactNumber: selectedLead.phone || prev.contactNumber,
          leadStage: selectedLead.stage || prev.leadStage,
          leadValue: selectedLead.value || prev.leadValue,
          leadPriority: selectedLead.priority || prev.leadPriority,
          leadSource: selectedLead.source || prev.leadSource,
        }));
      }
    }
  }, [form.leadId, formType, leads]);

  // Project dropdown filtering
  const filteredProjects = useMemo(() => {
    if (!form.clientId) return [];
    return projects.filter((p) => (p.client?._id || p.client) === form.clientId);
  }, [projects, form.clientId]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const isLead = formType === 'lead';
    const isUnregistered = formType === 'unregistered';

    const payload = {
      clientId: isLead || isUnregistered ? undefined : form.clientId || undefined,
      leadId: isLead ? form.leadId || undefined : undefined,
      projectId: isLead || isUnregistered ? undefined : form.projectId || undefined,
      callType: form.callType,
      callPurpose: form.callPurpose,
      callDate: form.callDate,
      callTime: form.callTime,
      spokenWith: form.spokenWith,
      contactNumber: isUnregistered ? form.unregisteredClientPhone : form.contactNumber,
      callSummary: form.callSummary,
      clientResponse: form.clientResponse,
      nextAction: form.nextAction,
      nextFollowUpDate: form.nextFollowUpDate || undefined,
      visibleToClient: form.visibleToClient,
      unregisteredClientName: isUnregistered ? form.unregisteredClientName : undefined,
      unregisteredClientPhone: isUnregistered ? form.unregisteredClientPhone : undefined,
      unregisteredClientAddress: isUnregistered ? form.unregisteredClientAddress : undefined,
    };

    try {
      if (isEditing) {
        await updateCallHistory.mutateAsync({ id: editingId, data: payload });
        setIsEditing(false);
        setEditingId(null);
      } else {
        await createCallHistory.mutateAsync(payload);
      }

      // If logging for lead and changing details, update lead model
      if (isLead && form.leadId) {
        await updateLead.mutateAsync({
          id: form.leadId,
          data: {
            stage: form.leadStage,
            value: Number(form.leadValue) || 0,
            priority: form.leadPriority,
            source: form.leadSource,
            followUpDate: form.nextFollowUpDate || undefined,
          },
        });
      }

      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this call log?')) {
      await deleteCallHistory.mutateAsync(id);
    }
  };

  const { isDateInRange } = useDateFilter();

  // Filter Call Logs
  const filteredCalls = useMemo(() => {
    const calls = callHistoryQuery.data || [];
    return calls.filter((call) => {
      if (!isDateInRange(call.calledAt || call.callDate || call.createdAt)) return false;
      // Type filter
      if (filterType === 'client' && !call.clientId) return false;
      if (filterType === 'lead' && !call.leadId) return false;
      if (filterType === 'unregistered' && !call.unregisteredClientName) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const clientName = call.clientId?.name || call.clientId?.company || '';
        const leadName = call.leadId?.name || call.leadId?.company || '';
        const unregisteredName = call.unregisteredClientName || '';
        const summary = call.callSummary || '';
        const spoken = call.spokenWith || '';
        const purpose = call.callPurpose || '';

        return (
          clientName.toLowerCase().includes(query) ||
          leadName.toLowerCase().includes(query) ||
          unregisteredName.toLowerCase().includes(query) ||
          summary.toLowerCase().includes(query) ||
          spoken.toLowerCase().includes(query) ||
          purpose.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [callHistoryQuery.data, filterType, searchQuery, isDateInRange]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call History & Client Touchpoints"
        description="Log every conversation with leads and clients, track outcomes, and organize next follow-up steps."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Call History Timeline List */}
        <div className="space-y-4">
          <PageToolbar className="flex-wrap gap-3">
            <div className="flex gap-1.5 rounded-2xl bg-secondary/40 p-1">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  filterType === 'all' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Calls
              </button>
              <button
                type="button"
                onClick={() => setFilterType('client')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  filterType === 'client' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Client Calls
              </button>
              <button
                type="button"
                onClick={() => setFilterType('lead')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  filterType === 'lead' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Lead Calls
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unregistered')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  filterType === 'unregistered' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Unregistered Calls
              </button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search call logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </PageToolbar>

          <div className="overflow-y-auto max-h-[calc(100vh-270px)] pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            {callHistoryQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center rounded-3xl border border-border bg-card">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-10 text-center">
                <Phone className="h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-4 font-bold text-foreground">No call logs found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try modifying your filters or log a new call note.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCalls.map((call) => {
                  const isLead = !!call.leadId;
                  const isUnregistered = !call.clientId && !call.leadId && !!call.unregisteredClientName;
                  const contactName = isUnregistered
                    ? call.unregisteredClientName
                    : (isLead ? call.leadId?.name : (call.clientId?.company || call.clientId?.name));
                  return (
                    <div key={call._id} className="group relative rounded-3xl border border-border bg-card p-6 transition-all hover:shadow-md">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                            isUnregistered ? 'bg-blue-500/10 text-blue-600' : (isLead ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600')
                          }`}>
                            <Phone size={18} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-foreground text-base">{contactName}</h3>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
                                isUnregistered ? 'bg-blue-100 text-blue-800' : (isLead ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                              }`}>
                                {isUnregistered ? 'New/Unregistered' : (isLead ? 'Lead' : 'Client')}
                              </span>
                              {call.projectId?.name && (
                                <span className="text-xs text-muted-foreground">
                                  • Project: <span className="font-semibold text-foreground">{call.projectId?.name}</span>
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-2">
                              <Calendar size={12} />
                              {new Date(call.callDate).toLocaleDateString()} {call.callTime ? `at ${call.callTime}` : ''}
                              <span>• Type: <span className="font-semibold text-foreground">{call.callType}</span></span>
                            </p>
                            {isUnregistered && (
                              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                {call.unregisteredClientPhone && (
                                  <p>Phone: <span className="font-semibold text-foreground">{call.unregisteredClientPhone}</span></p>
                                )}
                                {call.unregisteredClientAddress && (
                                  <p>Address: <span className="font-semibold text-foreground">{call.unregisteredClientAddress}</span></p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(call)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              title="Edit Call Note"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(call._id)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Delete Call Note"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-secondary/15 p-4 border border-border/40">
                          <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">Discussion Summary</h4>
                          <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{call.callSummary || 'No details provided.'}</p>
                        </div>
                        <div className="rounded-2xl bg-secondary/15 p-4 border border-border/40">
                          <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">Response & Next Steps</h4>
                          <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{call.clientResponse || 'No responses provided.'}</p>
                          {call.nextFollowUpDate && (
                            <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/5 px-2.5 py-1.5 rounded-xl border border-amber-500/10 w-fit font-medium">
                              <AlertCircle size={12} />
                              Next Follow-up: {new Date(call.nextFollowUpDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 border-t border-border/40 pt-3 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                        <span>Purpose: <span className="font-semibold text-foreground">{call.callPurpose}</span></span>
                        <span>Logged by: <span className="font-semibold text-foreground">{call.addedBy?.name || 'Unknown'}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Call Log Form Card */}
        <div>
          {canManage ? (
            <SectionCard
              title={isEditing ? 'Edit Call Note' : 'Log Call Note'}
              description="Record discussion points, update CRM pipeline stages, and schedule follow-ups."
              className="sticky top-6 border border-border/60 shadow-lg max-h-[calc(100vh-120px)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Form Type Selector */}
                {!isEditing && (
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary/30 p-1">
                    <button
                      type="button"
                      onClick={() => { setFormType('client'); resetForm(); }}
                      className={`rounded-xl py-2 text-[10px] font-semibold transition-all ${
                        formType === 'client' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Client Call
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFormType('lead'); resetForm(); }}
                      className={`rounded-xl py-2 text-[10px] font-semibold transition-all ${
                        formType === 'lead' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Lead Call
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFormType('unregistered'); resetForm(); }}
                      className={`rounded-xl py-2 text-[10px] font-semibold transition-all ${
                        formType === 'unregistered' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      New Client
                    </button>
                  </div>
                )}

                {/* Contact Selection */}
                {formType === 'client' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Select Client *</label>
                    <SelectDropdown
                      value={form.clientId}
                      onChange={(val) => setForm((prev) => ({ ...prev, clientId: val, projectId: '' }))}
                      options={clients.map((c) => ({ value: c._id, label: c.company || c.name }))}
                      placeholder="Choose client"
                    />
                  </div>
                )}
                {formType === 'lead' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Select Lead *</label>
                    <SelectDropdown
                      value={form.leadId}
                      onChange={(val) => setForm((prev) => ({ ...prev, leadId: val }))}
                      options={leads.map((l) => ({ value: l._id, label: `${l.name} (${l.company || 'Independent'})` }))}
                      placeholder="Choose lead"
                    />
                  </div>
                )}
                {formType === 'unregistered' && (
                  <div className="space-y-4 border-t border-border/40 pt-3 animate-fadeIn">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-500/5 px-2.5 py-1 rounded-lg w-fit">New Client Details</p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Client Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe / ABC Inc."
                        value={form.unregisteredClientName}
                        onChange={(e) => setForm((prev) => ({ ...prev, unregisteredClientName: e.target.value }))}
                        className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                      <input
                        type="text"
                        placeholder="Phone number"
                        value={form.unregisteredClientPhone}
                        onChange={(e) => setForm((prev) => ({ ...prev, unregisteredClientPhone: e.target.value }))}
                        className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Business Address</label>
                      <textarea
                        placeholder="Enter business address..."
                        rows={2}
                        value={form.unregisteredClientAddress}
                        onChange={(e) => setForm((prev) => ({ ...prev, unregisteredClientAddress: e.target.value }))}
                        className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Project Selection (Client only) */}
                {formType === 'client' && form.clientId && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-xs font-semibold text-muted-foreground">Select Project (Optional)</label>
                    <SelectDropdown
                      value={form.projectId}
                      onChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
                      options={filteredProjects.map((p) => ({ value: p._id, label: p.name }))}
                      placeholder="General / Select project"
                    />
                  </div>
                )}

                {/* Lead CRM Fields (Lead only) */}
                {formType === 'lead' && form.leadId && (
                  <div className="border-t border-border/40 pt-3 mt-2 space-y-3 animate-fadeIn">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-500/5 px-2.5 py-1 rounded-lg w-fit">Update Lead Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Lead Stage</label>
                        <SelectDropdown
                          value={form.leadStage}
                          onChange={(val) => setForm((prev) => ({ ...prev, leadStage: val }))}
                          options={LEAD_STAGES.map((s) => ({ value: s, label: s.replace('_', ' ').toUpperCase() }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Lead Value (INR)</label>
                        <input
                          type="number"
                          value={form.leadValue}
                          onChange={(e) => setForm((prev) => ({ ...prev, leadValue: e.target.value }))}
                          className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                        <SelectDropdown
                          value={form.leadPriority}
                          onChange={(val) => setForm((prev) => ({ ...prev, leadPriority: val }))}
                          options={LEAD_PRIORITIES.map((p) => ({ value: p, label: p.toUpperCase() }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Source</label>
                        <SelectDropdown
                          value={form.leadSource}
                          onChange={(val) => setForm((prev) => ({ ...prev, leadSource: val }))}
                          options={LEAD_SOURCES.map((s) => ({ value: s, label: s.replace('_', ' ').toUpperCase() }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Call Properties */}
                <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Call Type</label>
                    <SelectDropdown
                      value={form.callType}
                      onChange={(val) => setForm((prev) => ({ ...prev, callType: val }))}
                      options={CALL_TYPES}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Purpose</label>
                    <SelectDropdown
                      value={form.callPurpose}
                      onChange={(val) => setForm((prev) => ({ ...prev, callPurpose: val }))}
                      options={CALL_PURPOSES}
                    />
                    {form.callPurpose === 'Other' && (
                      <input
                        type="text"
                        placeholder="Specify call purpose..."
                        value={form.customCallPurpose || ''}
                        onChange={(e) => setForm((prev) => ({ ...prev, customCallPurpose: e.target.value }))}
                        className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Call Date</label>
                    <input
                      type="date"
                      value={form.callDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, callDate: e.target.value }))}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Call Time</label>
                    <input
                      type="time"
                      value={form.callTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, callTime: e.target.value }))}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Spoken With</label>
                    <input
                      type="text"
                      placeholder="e.g. CEO, Manager"
                      value={form.spokenWith}
                      onChange={(e) => setForm((prev) => ({ ...prev, spokenWith: e.target.value }))}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  {formType !== 'unregistered' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Contact Number</label>
                      <input
                        type="text"
                        placeholder="Phone number"
                        value={form.contactNumber}
                        onChange={(e) => setForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
                        className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Call Summary</label>
                  <textarea
                    placeholder="Key points of discussion..."
                    rows={3}
                    value={form.callSummary}
                    onChange={(e) => setForm((prev) => ({ ...prev, callSummary: e.target.value }))}
                    className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Client Response / Outcome</label>
                  <textarea
                    placeholder="Promises, objections, outcomes..."
                    rows={2}
                    value={form.clientResponse}
                    onChange={(e) => setForm((prev) => ({ ...prev, clientResponse: e.target.value }))}
                    className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Next Follow-up Date</label>
                    <input
                      type="date"
                      value={form.nextFollowUpDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, nextFollowUpDate: e.target.value }))}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  {formType === 'client' && (
                    <div className="flex items-end">
                      <label className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary/20">
                        <input
                          type="checkbox"
                          checked={form.visibleToClient}
                          onChange={(e) => setForm((prev) => ({ ...prev, visibleToClient: e.target.checked }))}
                          className="rounded text-primary focus:ring-primary/20"
                        />
                        Client Visible
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  {isEditing ? (
                    <>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={updateCallHistory.isPending}
                      >
                        {updateCallHistory.isPending ? 'Updating...' : 'Update Note'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createCallHistory.isPending}
                    >
                      {createCallHistory.isPending ? 'Saving...' : 'Add Call Note'}
                    </Button>
                  )}
                </div>
              </form>
            </SectionCard>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              You do not have permissions to log new calls.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
