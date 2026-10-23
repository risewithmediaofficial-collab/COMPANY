import { useState } from 'react';
import api from '../../../api';
import { motion } from 'framer-motion';
import { HeadphonesIcon, Send, CheckCircle2, MessageSquare, Mail, Phone, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const TOPICS = ['Content Feedback','Technical Issue','Billing Query','Campaign Performance','Revision Request','General Question','Other'];

export default function PortalSupport() {
  const [form, setForm]       = useState({ topic: '', subject: '', message: '', priority: 'medium' });
  const [submitted, setSubmit] = useState(false);
  const [loading, setLoading] = useState(false);

  const inp = "w-full px-3 py-2.5 rounded-xl text-xs border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setLoading(true);
    try {
      await api.post('/tickets', {
        title: form.subject || form.topic,
        description: form.message,
        priority: form.priority,
        category: form.topic,
      });
      setSubmit(true);
    } catch (err) {
      toast.error('Failed to submit ticket. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="pb-2 border-b border-border/60">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Support & Help Desk</h2>
        <p className="text-xs mt-0.5 text-muted-foreground">Get help, submit requests, or reach your dedicated account manager.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Contact cards */}
        <div className="space-y-3">
          {[
            { icon: MessageSquare, label: 'Live Chat', detail: 'Available Mon–Fri, 9am–6pm', color: '#6366f1' },
            { icon: Mail,          label: 'Email Us',  detail: 'support@agency.com',          color: '#10b981' },
            { icon: Phone,         label: 'Call Us',   detail: '+1 (555) 000-0000',           color: '#f59e0b' },
            { icon: Clock,         label: 'Response',  detail: 'Within 24 business hours',    color: '#8b5cf6' },
          ].map(c => (
            <motion.div
              key={c.label}
              whileHover={{ x: 3 }}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-all"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${c.color}18` }}
              >
                <c.icon size={18} style={{ color: c.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{c.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Ticket form */}
        <div className="lg:col-span-2 rounded-2xl p-5 sm:p-6 bg-card border border-border shadow-xs">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-lg font-black text-foreground mb-2">Ticket Submitted!</h3>
              <p className="text-xs text-muted-foreground mb-6 max-w-sm">
                Your support request has been received. Your account manager will respond within 24 business hours.
              </p>
              <button
                onClick={() => { setSubmit(false); setForm({ topic:'', subject:'', message:'', priority:'medium' }); }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/60">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <HeadphonesIcon size={16} />
                </div>
                <h3 className="text-sm font-bold text-foreground">Submit a Support Ticket</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Topic</label>
                  <select
                    value={form.topic}
                    onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                    className={inp}
                  >
                    <option value="">Select topic…</option>
                    {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.topic === 'Other' && (
                    <input
                      value={form.customTopic || ''}
                      onChange={e => setForm(f => ({ ...f, customTopic: e.target.value }))}
                      placeholder="Specify your topic..."
                      className={`mt-2 ${inp}`}
                    />
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className={inp}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Subject</label>
                <input
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief subject line…"
                  className={inp}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Message *</label>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Describe your issue or question in detail…"
                  required
                  className={`${inp} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !form.message.trim()}
                className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                <Send size={14} /> {loading ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
