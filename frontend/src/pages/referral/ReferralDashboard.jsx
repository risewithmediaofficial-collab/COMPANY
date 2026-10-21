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
} from 'lucide-react';
import api from '../../api';
import { formatINR } from '../../utils/currency';
import toast from 'react-hot-toast';
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

const statusTone = {
  submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  contacted: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  qualified: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  closed_won: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  closed_lost: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const ReferralDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    dealValue: '',
    notes: '',
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
      setFormData({ name: '', email: '', phone: '', company: '', dealValue: '', notes: '' });
      fetchReferrals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit lead');
    } finally {
      setSubmitting(false);
    }
  };

  const referrals = data?.referrals || [];
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
        <span className="font-bold text-xs text-foreground">
          {r.dealValue ? formatINR(r.dealValue) : '—'}
        </span>
      ),
    },
    {
      key: 'commission',
      label: 'Commission (10%)',
      render: (r) => (
        <span className="font-bold text-xs text-emerald-600">
          {r.commissionEarned ? formatINR(r.commissionEarned) : r.dealValue ? formatINR(r.dealValue * 0.1) : 'Pending'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${statusTone[r.status] || statusTone.submitted}`}>
          {(r.status || 'submitted').replace(/_/g, ' ')}
        </span>
      ),
    },
  ];

  // Cards Render
  const renderCard = (r) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusTone[r.status] || statusTone.submitted}`}>
          {(r.status || 'submitted').replace(/_/g, ' ')}
        </span>
        <span className="text-xs font-bold text-emerald-600">
          {r.dealValue ? `Est: ${formatINR(r.dealValue)}` : ''}
        </span>
      </div>

      <div>
        <h4 className="font-bold text-sm text-foreground">{r.leadName || r.name}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">🏢 {r.company || 'Direct Contact'}</p>
      </div>

      <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Phone:</span>
          <span className="font-mono text-foreground">{r.leadPhone || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Commission:</span>
          <span className="font-bold text-emerald-600">
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
      subtitle="Track your referred agency leads, conversion progress, and earned commission payouts."
      icon="🤝"
      properties={[
        { label: 'Total Earnings', value: formatINR(totalEarnings), tone: 'success', icon: Award },
        { label: 'Pending Payout', value: formatINR(pendingEarnings), tone: pendingEarnings > 0 ? 'warning' : 'neutral', icon: IndianRupee },
        { label: 'Referred Leads', value: referrals.length, icon: Users },
        { label: 'Won Deals', value: wonCount, tone: 'info', icon: CheckCircle2 },
      ]}
      actions={
        <div className="flex items-center gap-2">
          {data?.referralCode && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied Link' : 'Copy Partner Link'}</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowLeadForm(true)}
            className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
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
        <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-xl max-h-[90vh]">
          <form onSubmit={handleLeadSubmit} className="flex flex-col min-h-0 h-full">
            {/* Pinned Header */}
            <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur-md px-6 py-5 flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                    Refer a Business Client
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-muted-foreground truncate">
                    Submit client details to earn 10% commission on deal close
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground/70 bg-muted/50 border border-border/60 px-2 py-0.5 rounded-md">
                  ESC
                </span>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
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
                  className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Company / Brand Name</label>
                <input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Apex Fitness / Modern Cafe"
                  className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Phone Number *</label>
                <input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="client@brand.com"
                  className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Estimated Deal / Budget (₹)</label>
                <input
                  type="number"
                  value={formData.dealValue}
                  onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full h-11 rounded-xl text-sm border-border bg-background px-4 text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs font-mono transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Requirements / Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Needs Instagram management and reels production..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background p-3.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all outline-hidden resize-none"
                />
              </div>
            </div>

            {/* Pinned Sticky Footer */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
              <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLeadForm(false)}
                  className="h-11 px-5 rounded-xl border-border hover:bg-muted text-sm font-medium w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-md transition-all w-full sm:w-auto"
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
