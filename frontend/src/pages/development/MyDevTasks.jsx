import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import {
  CheckSquare,
  GitPullRequest,
  Bug,
  RefreshCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MyDevTasks() {
  const { user } = useSelector((state) => state.auth);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned'); // assigned | reviews | qa
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const fetchMyTasks = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await devApi.getTasks();
      if (res.data?.success) {
        setTasks(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load my dev tasks:', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  // Filter tasks based on activeTab
  const filteredTasks = tasks.filter((t) => {
    const dev = t.development || {};
    const uId = user?._id?.toString();

    if (activeTab === 'assigned') {
      const isDev = dev.developer?._id?.toString() === uId || dev.developer?.toString() === uId;
      const isAssigned = Array.isArray(t.assignedTo) && t.assignedTo.some((a) => (a._id || a).toString() === uId);
      return isDev || isAssigned;
    }

    if (activeTab === 'reviews') {
      const isReviewer = dev.reviewer?._id?.toString() === uId || dev.reviewer?.toString() === uId;
      return isReviewer || dev.stage === 'code_review';
    }

    if (activeTab === 'qa') {
      const isTester = dev.tester?._id?.toString() === uId || dev.tester?.toString() === uId;
      return isTester || dev.stage === 'qa_testing';
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Development Tasks"
        subtitle="Your personalized development queue: assigned tasks, code review requests, and testing runs"
        actions={
          <button
            onClick={fetchMyTasks}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all shadow-xs min-h-[38px]"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <DevelopmentSubNav />

      {/* ── Tabs Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto responsive-table-container">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shrink-0 min-h-[38px] transition-all ${
            activeTab === 'assigned'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          <CheckSquare size={14} /> My Assigned Tasks
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shrink-0 min-h-[38px] transition-all ${
            activeTab === 'reviews'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          <GitPullRequest size={14} /> Reviews Requested
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shrink-0 min-h-[38px] transition-all ${
            activeTab === 'qa'
              ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/20'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          <Bug size={14} /> QA Testing Runs
        </button>
      </div>

      {/* ── Task List ────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
            <RefreshCcw size={16} className="animate-spin text-primary" /> Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500/40" />
            <p className="font-semibold text-foreground">You are all caught up!</p>
            <p className="text-muted-foreground">No tasks found for the selected category.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTasks.map((task) => {
              const dev = task.development || {};
              const isBlocked = dev.isBlocked || dev.stage === 'blocked';

              return (
                <div
                  key={task._id}
                  onClick={() => {
                    setSelectedTaskId(task._id);
                    setShowTaskDetail(true);
                  }}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-secondary/20 transition-colors cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        {task.project?.name || 'CRM Task'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        {dev.stage?.replace(/_/g, ' ') || 'backlog'}
                      </span>
                      {isBlocked && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          Blocked: {dev.blockedReason}
                        </span>
                      )}
                      {dev.branch && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded">
                          🌿 {dev.branch}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {task.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {task.priority || 'Medium'}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Reusable Task Detail Modal ───────────────────────────────── */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          open={showTaskDetail}
          onOpenChange={(isOpen) => {
            setShowTaskDetail(isOpen);
            if (!isOpen) {
              setSelectedTaskId(null);
              fetchMyTasks();
            }
          }}
        />
      )}
    </div>
  );
}
