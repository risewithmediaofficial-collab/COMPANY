import { useEffect, useState } from 'react';
import { 
  Award, 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  Copy, 
  CheckCircle2, 
  IndianRupee, 
  Briefcase,
  History,
  Send,
  Zap,
  MoreVertical,
  Clock
} from 'lucide-react';
import api from '../../api';
import { formatINR } from '../../utils/currency';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ReferralDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const copyRefCode = () => {
    if (!user?.referralCode) {
      toast.error('No referral code is available for this account');
      return;
    }

    navigator.clipboard.writeText(user.referralCode);
    toast.success('Referral code copied to clipboard!');
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/referrals/submit', {
        ...formData,
        dealValue: formData.dealValue ? Number(formData.dealValue) : undefined,
      });
      toast.success('Referral lead submitted successfully');
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        dealValue: '',
        notes: '',
      });
      setShowLeadForm(false);
      setLoading(true);
      await fetchReferrals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit referral lead');
    } finally {
      setSubmitting(false);
    }
  };

  const { isDateInRange } = useDateFilter();

  if (loading) return <div className="animate-pulse space-y-6"><div className="h-40 bg-card rounded-3xl"></div><div className="h-96 bg-card rounded-3xl"></div></div>;

  const rawReferrals = data?.referrals || [];
  const referrals = rawReferrals.filter((ref) => isDateInRange(ref.createdAt));
  const statsPayload = data?.stats || {};
  const stats = [
    { label: 'Total Earnings', value: formatINR(statsPayload.totalEarnings || 0), icon: IndianRupee, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Pending Payout', value: formatINR(statsPayload.pendingEarnings || 0), icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Referrals', value: referrals.length, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Conv. Rate', value: `${Number(statsPayload.conversionRate || 0)}%`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referral Partner Portal</h1>
          <p className="text-muted-foreground text-sm">Grow with us and earn rewards for your network</p>
        </div>
        <button
          onClick={() => setShowLeadForm(true)}
          className="flex items-center px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Send size={18} className="mr-2" />
          Submit New Lead
        </button>
      </div>

      <DateRangePicker title="Referral Date Filter (From Date to To Date)" />

      {/* Referral Banner */}
      <div className="bg-card rounded-3xl border border-border shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
            <Award size={40} />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-black tracking-tight">Your Partner Network</h2>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">Earn 10% commission on every lead that converts into a paying client.</p>
          </div>
        </div>

        <div className="relative z-10 bg-secondary/50 p-6 rounded-3xl border border-border flex flex-col items-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Unique Referral Link</p>
          <div className="flex items-center space-x-3">
            <code className="text-lg font-black text-primary tracking-widest px-4 py-2 bg-card rounded-xl border border-border shadow-sm">
              {user.referralCode || 'REF-XXXXXX'}
            </code>
            <button 
              onClick={copyRefCode}
              className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-between group card-hover"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* History Table */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/10">
          <h3 className="font-bold flex items-center">
            <History size={18} className="mr-2 text-primary" />
            Lead Submission History
          </h3>
          <button className="p-2 rounded-xl border border-border hover:bg-secondary transition-colors">
            <MoreVertical size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="w-full overflow-x-auto overflow-y-auto max-h-[400px] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground font-medium">
              <tr>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Submitted Lead</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Status</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Commission</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Total Paid</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Payout Status</th>
                <th className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {referrals.map((ref) => (
                <tr key={ref._id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold">{ref.lead?.name || 'Manual Submission'}</div>
                    <div className="text-[10px] text-muted-foreground">{ref.lead?.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ref.status === 'converted' ? 'bg-emerald-500/10 text-emerald-600' :
                      ref.status === 'qualified' ? 'bg-blue-500/10 text-blue-600' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {ref.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-emerald-600">
                      {formatINR(ref.commissionType === 'percentage' ? ref.commissionAmount : ref.monthlyAmount)}
                    </div>
                    <div className="text-[10px] text-muted-foreground capitalize">
                      {ref.commissionType}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {formatINR(ref.totalPaid || 0)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-xs font-medium">
                      {ref.isPaid ? (
                        <>
                          <CheckCircle2 size={14} className="mr-1.5 text-emerald-500" />
                          <span className="text-emerald-600">Paid</span>
                        </>
                      ) : (
                        <>
                          <Clock size={14} className="mr-1.5 text-amber-500" />
                          <span className="text-amber-600">Pending</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(ref.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {data.referrals.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground italic">No referrals submitted yet. Start sharing your link!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Referral Lead</DialogTitle>
            <DialogDescription>
              Send a qualified lead directly into the CRM and track its commission lifecycle here.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLeadSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lead Name</label>
                <input
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  placeholder="jane@company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <input
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Estimated Deal Value</label>
                <input
                  name="dealValue"
                  type="number"
                  min="0"
                  value={formData.dealValue}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  placeholder="25000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="min-h-[120px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                placeholder="Context about the lead, urgency, services needed, and best next step."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLeadForm(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Lead'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferralDashboard;
