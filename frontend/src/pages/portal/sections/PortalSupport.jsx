import { useState } from 'react';
import api from '../../../api';
import { motion } from 'framer-motion';
import { HeadphonesIcon, Send, CheckCircle2, MessageSquare, Mail, Phone, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const TOPICS = ['Content Feedback','Technical Issue','Billing Query','Campaign Performance','Revision Request','General Question','Other'];

export default function PortalSupport({ dark }) {
  const [form, setForm]       = useState({ topic: '', subject: '', message: '', priority: 'medium' });
  const [submitted, setSubmit] = useState(false);
  const [loading, setLoading] = useState(false);

  const txt    = dark ? 'text-white' : 'text-slate-800';
  const sub    = dark ? 'text-slate-400' : 'text-slate-500';
  const card   = dark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)';
  const inp    = dark ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

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
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h2 className={`text-xl font-black ${txt}`}>Support</h2>
        <p className={`text-xs mt-0.5 ${sub}`}>Get help, submit requests, or reach your account manager.</p>
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
            <motion.div key={c.label} whileHover={{ x: 3 }}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: card, border }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${c.color}20` }}>
                <c.icon size={16} style={{ color: c.color }} />
              </div>
              <div>
                <p className={`text-xs font-bold ${txt}`}>{c.label}</p>
                <p className={`text-[10px] ${sub}`}>{c.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Ticket form */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: card, border }}>
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 size={48} className="text-emerald-400 mb-4" />
              <h3 className={`text-lg font-black ${txt} mb-2`}>Ticket Submitted!</h3>
              <p className={`text-sm ${sub} mb-6 max-w-sm`}>
                Your support request has been received. Your account manager will respond within 24 business hours.
              </p>
              <button onClick={() => { setSubmit(false); setForm({ topic:'', subject:'', message:'', priority:'medium' }); }}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                Submit Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <HeadphonesIcon size={15} className="text-indigo-400" />
                <h3 className={`text-sm font-bold ${txt}`}>Submit a Support Ticket</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[10px] font-semibold ${sub} block mb-1`}>Topic</label>
                  <select value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${inp}`}>
                    <option value="">Select topic…</option>
                    {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.topic === 'Other' && (
                    <input
                      value={form.customTopic || ''}
                      onChange={e => setForm(f => ({ ...f, customTopic: e.target.value }))}
                      placeholder="Specify your topic..."
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-none mt-1 ${inp}`}
                    />
                  )}
                </div>
                <div>
                  <label className={`text-[10px] font-semibold ${sub} block mb-1`}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${inp}`}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-semibold ${sub} block mb-1`}>Subject</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief subject line…"
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${inp}`} />
              </div>

              <div>
                <label className={`text-[10px] font-semibold ${sub} block mb-1`}>Message *</label>
                <textarea rows={5} value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Describe your issue or question in detail…"
                  required
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none resize-none ${inp}`} />
              </div>

              <button type="submit" disabled={loading || !form.message.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Send size={13} /> {loading ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
