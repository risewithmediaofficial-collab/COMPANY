import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Film,
  FileText,
  Camera,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  Calendar,
  Building,
  User,
  History,
  Send,
  Sparkles,
  Link as LinkIcon,
  Copy,
  Check,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { contentProductionApi } from '../../api/contentProduction';
import { useClients } from '../../hooks/useClients';
import { useUsers } from '../../hooks/useUsers';
import { StagePipelineStepper } from './StagePipelineStepper';
import { ScriptwriterStageForm } from './ScriptwriterStageForm';
import { VideographerStageForm } from './VideographerStageForm';
import { VideoEditorStageForm } from './VideoEditorStageForm';
import { SmmStageForm } from './SmmStageForm';
import { RequestRevisionModal } from './RequestRevisionModal';

export const ContentProductionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab from URL query or default to 'scriptwriter' or current stage
  const currentTabParam = searchParams.get('tab') || 'scriptwriter';
  const [activeTab, setActiveTab] = useState(currentTabParam);

  const [content, setContent] = useState(null);
  const [allContents, setAllContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  // Revision modal state
  const [revisionModalState, setRevisionModalState] = useState({
    isOpen: false,
    stage: 'Video Editing',
  });

  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();

  const fetchContentDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contentProductionApi.getById(id);
      if (res.data?.success) {
        setContent(res.data.data);

        // Fetch client contents for switcher
        if (res.data.data.client?._id || res.data.data.client) {
          const clientId = res.data.data.client._id || res.data.data.client;
          const listRes = await contentProductionApi.list({ client: clientId });
          if (listRes.data?.success) {
            setAllContents(listRes.data.data || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load content details:', err);
      toast.error('Failed to load content details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContentDetails();
  }, [fetchContentDetails]);

  // Sync tab with URL parameter
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const handleSaveStage = async (stageName, stageData) => {
    try {
      const res = await contentProductionApi.updateStage(content._id, stageName, stageData);
      if (res.data?.success) {
        setContent(res.data.data);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleCopyContentId = () => {
    if (!content?.contentId) return;
    navigator.clipboard.writeText(content.contentId);
    setCopiedId(true);
    toast.success('Content ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RefreshCcw size={28} className="animate-spin text-primary" />
        <span className="text-xs font-semibold text-muted-foreground">
          Loading production details…
        </span>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-foreground">Content record not found</h3>
        <Link
          to="/content-production"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs"
        >
          <ChevronLeft size={14} /> Back to Content Production
        </Link>
      </div>
    );
  }

  const rawFootage = content.videographer?.rawFootageDriveLink || content.videoEditor?.rawFootageDriveLink;
  const finalVideo = content.videoEditor?.finalVideoDriveLink || content.smm?.finalCreativeDriveLink;
  const brandAssets = content.videoEditor?.brandAssetsDriveLink;
  const publishedUrl = content.smm?.publishedPostUrl;

  const stageTabs = [
    { id: 'scriptwriter', label: '1. Scriptwriter', icon: FileText, status: content.scriptwriter?.status },
    { id: 'videographer', label: '2. Videographer', icon: Camera, status: content.videographer?.status },
    { id: 'videoEditor', label: '3. Video Editor', icon: Film, status: content.videoEditor?.status },
    { id: 'smm', label: '4. SMM Team', icon: Share2, status: content.smm?.status },
    { id: 'revisions', label: 'Revisions & Activity', icon: History, count: content.revisions?.length || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Back link & Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/content-production')}
            className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground border border-border transition-all"
            title="Back to All Content"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyContentId}
                className="font-mono text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md border border-primary/25 transition-all flex items-center gap-1"
                title="Click to copy Content ID"
              >
                <span>{content.contentId}</span>
                {copiedId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
              </button>
              <span className="text-xs text-muted-foreground font-semibold">
                {content.client?.name || content.clientName}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-foreground mt-0.5">
              {content.title}
            </h1>
          </div>
        </div>

        {/* Action button toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              setRevisionModalState({
                isOpen: true,
                stage:
                  activeTab === 'scriptwriter'
                    ? 'Scriptwriting'
                    : activeTab === 'videographer'
                    ? 'Videography'
                    : activeTab === 'smm'
                    ? 'SMM'
                    : 'Video Editing',
              })
            }
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-1.5"
          >
            <AlertCircle size={14} />
            Request Revision
          </button>

          <button
            onClick={fetchContentDetails}
            className="p-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-all"
            title="Refresh record"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      {/* Visual Pipeline Progression Stepper */}
      <StagePipelineStepper
        currentStage={content.currentStage}
        overallStatus={content.overallStatus}
        onStageClick={(targetStage) => {
          if (targetStage === 'Scriptwriting') handleTabChange('scriptwriter');
          else if (targetStage === 'Videography') handleTabChange('videographer');
          else if (targetStage === 'Video Editing') handleTabChange('videoEditor');
          else if (targetStage === 'SMM') handleTabChange('smm');
        }}
      />

      {/* Quick Drive Assets Fast-Access Toolbar */}
      <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <LinkIcon size={14} className="text-primary" />
          <span>Production Drive Links:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rawFootage ? (
            <a
              href={rawFootage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all"
            >
              <Camera size={13} />
              Raw Footage
              <ExternalLink size={11} />
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic px-2">No raw footage yet</span>
          )}

          {finalVideo ? (
            <a
              href={finalVideo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 transition-all"
            >
              <Film size={13} />
              Final Video
              <ExternalLink size={11} />
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic px-2">Final video pending</span>
          )}

          {brandAssets && (
            <a
              href={brandAssets}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all"
            >
              <Sparkles size={13} className="text-amber-500" />
              Brand Assets
              <ExternalLink size={11} />
            </a>
          )}

          {publishedUrl && (
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 transition-all"
            >
              <CheckCircle2 size={13} />
              Live Post
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Stage Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/80 overflow-x-auto pb-1 scrollbar-none">
        {stageTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-transparent text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.status && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                    isActive
                      ? 'bg-primary-foreground/25 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.status}
                </span>
              )}
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Stage Form Container */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xs">
        {activeTab === 'scriptwriter' && (
          <ScriptwriterStageForm
            content={content}
            users={users}
            onSaveStage={handleSaveStage}
            onRequestRevision={(st) => setRevisionModalState({ isOpen: true, stage: st })}
          />
        )}

        {activeTab === 'videographer' && (
          <VideographerStageForm
            content={content}
            users={users}
            onSaveStage={handleSaveStage}
            onRequestRevision={(st) => setRevisionModalState({ isOpen: true, stage: st })}
          />
        )}

        {activeTab === 'videoEditor' && (
          <VideoEditorStageForm
            content={content}
            clients={clients}
            allContents={allContents}
            users={users}
            onSaveStage={handleSaveStage}
            onRequestRevision={(st) => setRevisionModalState({ isOpen: true, stage: st })}
            onSwitchContent={(newContentId) => navigate(`/content-production/${newContentId}?tab=videoEditor`)}
          />
        )}

        {activeTab === 'smm' && (
          <SmmStageForm
            content={content}
            users={users}
            onSaveStage={handleSaveStage}
            onRequestRevision={(st) => setRevisionModalState({ isOpen: true, stage: st })}
          />
        )}

        {activeTab === 'revisions' && (
          <div className="space-y-6">
            {/* Revisions History */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-500" />
                  Revision Requests & Client Feedback
                </h3>
                <button
                  onClick={() => setRevisionModalState({ isOpen: true, stage: 'Video Editing' })}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                >
                  + Add Revision Request
                </button>
              </div>

              {(!content.revisions || content.revisions.length === 0) ? (
                <div className="p-8 rounded-xl bg-muted/30 border border-dashed border-border text-center text-xs text-muted-foreground">
                  No revisions have been requested for this content.
                </div>
              ) : (
                <div className="space-y-3">
                  {content.revisions.map((rev, idx) => (
                    <div
                      key={rev._id || idx}
                      className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/25 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-600">
                            {rev.stage}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {rev.requestedByName || 'Reviewer'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(rev.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {rev.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit / Activity Log */}
            <div className="pt-4 border-t border-border/80">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <History size={16} className="text-muted-foreground" />
                Production Activity Log
              </h3>
              {(!content.activityLog || content.activityLog.length === 0) ? (
                <div className="p-6 rounded-xl bg-muted/20 text-center text-xs text-muted-foreground">
                  No activity logged yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {content.activityLog.slice().reverse().map((log, idx) => (
                    <div
                      key={log._id || idx}
                      className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <div>
                          <span className="font-semibold text-foreground">{log.userName}: </span>
                          <span className="text-muted-foreground">{log.action}</span>
                          {log.stage && (
                            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                              {log.stage}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Revision Request Modal */}
      <RequestRevisionModal
        isOpen={revisionModalState.isOpen}
        initialStage={revisionModalState.stage}
        contentId={content._id}
        onClose={() => setRevisionModalState({ isOpen: false, stage: 'Video Editing' })}
        onRevisionSubmitted={(updatedRecord) => setContent(updatedRecord)}
      />
    </div>
  );
};

export default ContentProductionDetails;
