import { useEffect, useState, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  Users,
  Copy,
  CheckCircle2,
  IndianRupee,
  Briefcase,
  Send,
  Clock,
  Check,
  Plus,
  Building2,
  Phone,
  Mail,
  X,
} from '@/components/ui/muiIcons';
import api from '../../api';
import { formatINR } from '../../utils/currency';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { useProjects } from '../../hooks/useProjects';
import { useUsers } from '../../hooks/useUsers';

const statusTone = {
  submitted: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30',
  contacted: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
  qualified: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  closed_won: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold',
  closed_lost: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 line-through',
};

const ReferralDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [search, setSearch] = useState('');

  const { data: projectsData = [] } = useProjects();
  const { data: usersData = [] } = useUsers();
  const projects = Array.isArray(projectsData) ? projectsData : projectsData.projects || [];
  const employees = (Array.isArray(usersData) ? usersData : usersData.users || []).filter(
    (u) => ['employee', 'manager', 'accountManager'].includes(u.role)
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    dealValue: '',
    notes: '',
    projectId: '',
    payoutType: 'one_time',
    referrerType: 'outside',
    outsideReferrerName: '',
    outsideReferrerContact: '',
    referrerEmployeeId: '',
  });

  const fetchReferrals = async () => {
    try {
      const res = await api.get('/referrals');
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleCopyLink = () => {
    if (!data?.referralCode) return;
    const link = `${window.location.origin}/register?ref=${data.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/referrals/submit-lead', formData);
      toast.success('Lead referred successfully!');
      setShowLeadForm(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        dealValue: '',
        notes: '',
        projectId: '',
        payoutType: 'one_time',
        referrerType: 'outside',
        outsideReferrerName: '',
        outsideReferrerContact: '',
        referrerEmployeeId: '',
      });
      fetchReferrals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit lead');
    } finally {
      setSubmitting(false);
    }
  };

  const referrals = useMemo(() => data?.referrals || [], [data?.referrals]);
  const filteredReferrals = useMemo(() => {
    if (!search.trim()) return referrals;
    const q = search.toLowerCase();
    return referrals.filter((r) => {
      const name = (r.leadName || r.name || '').toLowerCase();
      const comp = (r.company || '').toLowerCase();
      const email = (r.leadEmail || r.email || '').toLowerCase();
      return name.includes(q) || comp.includes(q) || email.includes(q);
    });
  }, [referrals, search]);

  const totalEarnings = data?.totalEarnings || 0;
  const pendingEarnings = data?.pendingEarnings || 0;
  const wonCount = referrals.filter((r) => r.status === 'closed_won' || r.status === 'won').length;

  // Table Columns
  const tableColumns = [
    {
      key: 'name',
      label: 'Referred Lead',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {(r.leadName || r.name || 'L').charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground">{r.leadName || r.name || 'Unnamed Lead'}</p>
            <p className="text-[11px] text-muted-foreground">{r.company || r.leadEmail || 'No company'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Contact Details',
      render: (r) => (
        <div className="text-xs space-y-0.5">
          {r.leadPhone && <p className="text-foreground font-mono">{r.leadPhone}</p>}
          {r.leadEmail && <p className="text-muted-foreground">{r.leadEmail}</p>}
        </div>
      ),
    },
    {
      key: 'dealValue',
      label: 'Est. Deal Value',
      render: (r) => (
        <span className="font-bold text-xs text-foreground tabular-nums">
          {r.dealValue ? formatINR(r.dealValue) : '—'}
        </span>
      ),
    },
    {
      key: 'project',
      label: 'Project',
      render: (r) => (
        <span className="text-xs font-semibold text-foreground">
          {r.projectId?.name || r.projectName || '—'}
        </span>
      ),
    },
    {
      key: 'referrer',
      label: 'Referrer',
      render: (r) => (
        <div className="text-xs space-y-0.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-secondary text-foreground">
            {r.referrerType || 'outside'}
          </span>
          <p className="font-semibold text-foreground truncate max-w-[140px]">
            {r.referrerType === 'outside'
              ? (r.outsideReferrerName || 'Outside Partner')
              : (r.referrer?.name || 'Internal Team')}
          </p>
        </div>
      ),
    },
    {
      key: 'payoutType',
      label: 'Payout',
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-primary/10 text-primary">
          {r.payoutType === 'monthly' ? 'Monthly' : 'One-Time'}
        </span>
      ),
    },
    {
      key: 'commission',
      label: 'Commission (10%)',
      render: (r) => (
        <span className="font-bold text-xs text-foreground tabular-nums">
          {r.commissionEarned ? formatINR(r.commissionEarned) : r.dealValue ? formatINR(r.dealValue * 0.1) : 'Pending'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${statusTone[r.status] || statusTone.submitted}`}>
          {(r.status || 'submitted').replace(/_/g, ' ')}
        </span>
      ),
    },
  ];

  // Cards Render
  const renderCard = (r) => (
    <div className="space-y-3 tabular-nums">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusTone[r.status] || statusTone.submitted}`}>
          {(r.status || 'submitted').replace(/_/g, ' ')}
        </span>
        <span className="text-xs font-bold text-foreground">
          {r.dealValue ? `Est: ${formatINR(r.dealValue)}` : ''}
        </span>
      </div>

      <div>
        <h4 className="font-bold text-sm text-foreground">{r.leadName || r.name}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Building2 size={12} className="shrink-0 text-muted-foreground/70" />
          <span>{r.company || 'Direct Contact'}</span>
        </p>
      </div>

      <div className="p-2.5 rounded-xl bg-secondary/40 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Phone:</span>
          <span className="font-mono text-foreground">{r.leadPhone || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Commission:</span>
          <span className="font-bold text-foreground">
            {r.commissionEarned ? formatINR(r.commissionEarned) : r.dealValue ? formatINR(r.dealValue * 0.1) : 'Pending'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Growth & Sales', 'Referral Hub']}
      title="Partner Referrals & Commission Hub"
      icon={Users}
      properties={[
        { label: 'Total Earnings', value: formatINR(totalEarnings), tone: 'neutral', icon: Award },
        { label: 'Pending Payout', value: formatINR(pendingEarnings), tone: 'neutral', icon: IndianRupee },
        { label: 'Referred Leads', value: referrals.length, icon: Users },
        { label: 'Won Deals', value: wonCount, tone: 'neutral', icon: CheckCircle2 },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {data?.referralCode && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[38px] cursor-pointer"
            >
              {copiedLink ? <Check size={13} className="text-foreground" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied Link' : 'Copy Partner Link'}</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowLeadForm(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl transition-all hover:bg-primary/90 min-h-[38px] cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Refer New Client</span>
          </Button>
        </div>
      }
    >
      <DatabaseView
        viewKey="rwm_referrals_view_v1"
        views={['cards', 'table']}
        items={filteredReferrals}
        totalCount={filteredReferrals.length}
        searchPlaceholder="Search referred leads by name, company, or email..."
        columns={tableColumns}
        renderCard={renderCard}
        onSearchChange={setSearch}
      />

      {/* Refer Lead Modal */}
      <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-xl max-h-[90dvh]">
          <form onSubmit={handleLeadSubmit} className="flex flex-col min-h-0 h-full">
            {/* Pinned Header */}
            <div className="shrink-0 bg-card px-6 py-5 flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                    Refer a Business Client
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Refer a Business Client
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-md">
                  ESC
                </span>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>

            {/* Scrollable Linear Body */}
            <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Contact Name *</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Rahul Sharma"
                  className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Company / Brand Name</label>
                <input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Apex Fitness / Modern Cafe"
                  className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Phone Number *</label>
                <input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full h-11 rounded-xl text-sm font-normal bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="client@brand.com"
                  className="w-full h-11 rounded-xl text-sm font-normal bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Estimated Deal / Budget (₹)</label>
                <input
                  type="number"
                  value={formData.dealValue}
                  onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full h-11 rounded-xl text-sm font-normal bg-background px-4 text-foreground tabular-nums focus:ring-2 focus:ring-primary/20 transition-all outline-hidden"
                />
              </div>

              {/* Project Selection */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Project (Optional)</label>
                <SelectDropdown
                  value={formData.projectId}
                  onChange={(val) => setFormData({ ...formData, projectId: val || '' })}
                  options={projects.map((p) => ({ value: p._id, label: p.name }))}
                  placeholder="Select Project (Optional)"
                  allOptionLabel="General / No Specific Project"
                  allowCustom={false}
                  className="w-full"
                  buttonClassName="h-11 bg-background text-sm font-normal rounded-xl border border-border/50"
                />
              </div>

              {/* Referral Payout Frequency: One-Time or Monthly */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Referral Payout Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'one_time', label: 'One-Time Payout', desc: 'Single lump sum commission' },
                    { id: 'monthly', label: 'Monthly Recurring', desc: 'Recurring monthly cut' },
                  ].map((pType) => (
                    <button
                      key={pType.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, payoutType: pType.id })}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        formData.payoutType === pType.id
                          ? 'border-primary bg-primary/10 text-foreground font-semibold'
                          : 'border-border/60 bg-background text-muted-foreground hover:bg-secondary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{pType.label}</span>
                        {formData.payoutType === pType.id && <Check size={14} className="text-primary" />}
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">{pType.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* To Whom (Referrer Type): Employee, Partner, or Outside */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Referrer (To Whom Commission is Paid)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'outside', label: 'Outside / External' },
                    { id: 'employee', label: 'Employee' },
                    { id: 'partner', label: 'Partner' },
                  ].map((refChoice) => (
                    <button
                      key={refChoice.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, referrerType: refChoice.id })}
                      className={`py-2 px-3 rounded-xl border text-center transition-colors text-xs font-bold cursor-pointer ${
                        formData.referrerType === refChoice.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border/60 bg-background text-muted-foreground hover:bg-secondary/40'
                      }`}
                    >
                      {refChoice.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* If Outside: enter name & contact */}
              {formData.referrerType === 'outside' && (
                <div className="space-y-4 p-4 rounded-2xl bg-secondary/30 border border-border/40">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Outside Referrer Person Name *</label>
                    <input
                      required
                      value={formData.outsideReferrerName}
                      onChange={(e) => setFormData({ ...formData, outsideReferrerName: e.target.value })}
                      placeholder="e.g. Vignesh (Marketing Agency / Friend)"
                      className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Outside Referrer Phone / UPI / Contact</label>
                    <input
                      value={formData.outsideReferrerContact}
                      onChange={(e) => setFormData({ ...formData, outsideReferrerContact: e.target.value })}
                      placeholder="+91 98765 00000 or upi@okhdfcbank"
                      className="w-full h-11 rounded-xl text-sm bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* If Employee: select employee */}
              {formData.referrerType === 'employee' && (
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40">
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Employee *</label>
                  <SelectDropdown
                    value={formData.referrerEmployeeId}
                    onChange={(val) => setFormData({ ...formData, referrerEmployeeId: val || '' })}
                    options={employees.map((u) => ({
                      value: u._id,
                      label: u.name,
                      subLabel: u.position || u.role,
                    }))}
                    placeholder="Choose referring employee"
                    allowCustom={false}
                    allowDeselect={false}
                    className="w-full"
                    buttonClassName="h-11 bg-background text-sm font-normal rounded-xl border border-border/50"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Requirements / Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Needs Instagram management and reels production..."
                  rows={3}
                  className="w-full rounded-xl bg-background p-3.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-hidden resize-none"
                />
              </div>
            </div>

            {/* Pinned Sticky Footer */}
            <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
              <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLeadForm(false)}
                  className="h-11 px-5 rounded-xl hover:bg-muted text-sm font-medium w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all w-full sm:w-auto"
                >
                  {submitting ? 'Submitting...' : 'Submit Lead'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
};

export default ReferralDashboard;
