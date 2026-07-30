import React, { useEffect, useState } from 'react';
import { Users, CheckCircle2, Clock, Shield, Briefcase, Plus } from 'lucide-react';
import { smmApi } from '../../api/smm';
import { PageHeader } from '../../components/ui/page';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import api from '../../api/index';
import { toast } from 'react-hot-toast';

export default function Team() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      smmApi.getTasks({ limit: 200 }),
      smmApi.getCampaigns({ limit: 100 }),
    ]).then(([uRes, tRes, cRes]) => {
      if (uRes.data) {
        const list = uRes.data.users || uRes.data.data || (Array.isArray(uRes.data) ? uRes.data : []);
        setUsers(list);
      }
      if (tRes.data?.success) setTasks(tRes.data.data || []);
      if (cRes.data?.success) setCampaigns(cRes.data.data || []);
    }).catch(err => {
      toast.error('Failed to load team workload data');
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Management & Workloads"
        subtitle="Role-based SMM team assignments, pending tasks, and completion metrics"
      />

      <SMMSubNav />

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading team members...</div>
      ) : !Array.isArray(users) || users.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No team members found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((member) => {
            const assignedTasks = Array.isArray(tasks) ? tasks.filter(t => t.assignedTo?._id === member._id) : [];
            const completedTasks = assignedTasks.filter(t => t.status === 'Done');
            const pendingTasks = assignedTasks.filter(t => t.status !== 'Done');

            return (
              <div key={member._id} className="app-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold text-base flex items-center justify-center">
                    {member.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{member.name}</h4>
                    <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-secondary/50 rounded-xl border border-border text-center">
                    <span className="text-xs text-muted-foreground block font-medium">Pending Tasks</span>
                    <span className="text-lg font-bold text-amber-600">{pendingTasks.length}</span>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded-xl border border-border text-center">
                    <span className="text-xs text-muted-foreground block font-medium">Completed</span>
                    <span className="text-lg font-bold text-emerald-600">{completedTasks.length}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Current SMM Tasks</span>
                  {assignedTasks.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">No active SMM tasks</span>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {assignedTasks.slice(0, 4).map(t => (
                        <div key={t._id} className="text-xs p-2 rounded-lg bg-secondary/30 flex items-center justify-between">
                          <span className="truncate text-foreground font-medium">{t.title}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            t.status === 'Done' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>{t.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
