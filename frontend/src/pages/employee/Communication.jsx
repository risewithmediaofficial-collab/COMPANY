import { useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Send, 
  Trash2, 
  User, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock,
  Filter
} from '@/components/ui/muiIcons';
import { CommunicationModal } from '../../components/modals/CommunicationModal';
import {
  useCommunications,
  useDeleteCommunication,
  useReplyCommunication,
  useUpdateCommunication,
} from '../../hooks/useCommunications';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl } from '../../utils/assetUrl';

const statusStyles = {
  new: 'bg-secondary text-foreground border border-border',
  open: 'bg-secondary text-foreground border border-border',
  pending_client: 'bg-muted text-foreground border border-border',
  pending_internal: 'bg-muted text-foreground border border-border',
  resolved: 'bg-primary text-primary-foreground border border-primary',
  closed: 'bg-background text-muted-foreground border border-border',
};

const categoryStyles = {
  support: 'border-border text-foreground bg-secondary',
  project: 'border-border text-foreground bg-secondary',
  billing: 'border-border text-foreground bg-secondary',
  internal: 'border-border text-muted-foreground bg-muted',
  approval: 'border-border text-foreground bg-secondary',
  general: 'border-border text-muted-foreground bg-muted',
};

const Communication = () => {
  const { user } = useSelector((state) => state.auth);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data = [], isLoading } = useCommunications({ search });
  const messagesList = Array.isArray(data) ? data : [];
  
  const replyCommunication = useReplyCommunication();
  const updateCommunication = useUpdateCommunication();
  const deleteCommunication = useDeleteCommunication();

  const selectedThread = selected?._id
    ? messagesList.find((thread) => thread._id === selected._id)
    : null;
  const active = selectedThread || selected || messagesList[0];

  const sendReply = async () => {
    if (!active || !replyText.trim()) return;
    await replyCommunication.mutateAsync({ 
        id: active._id, 
        data: { content: replyText.trim(), isInternalNote: isInternal } 
    });
    setReplyText('');
    setIsInternal(false);
  };

  const updateStatus = async (status) => {
    if (!active) return;
    await updateCommunication.mutateAsync({ id: active._id, data: { status } });
    setSelected({ ...active, status });
  };

  const removeMessage = async (id) => {
    await deleteCommunication.mutateAsync(id);
    if (selected?._id === id) setSelected(null);
  };

  const isClientView = user?.role === 'client';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Message Center</h1>
          <p className="text-muted-foreground text-sm">
            {isClientView ? 'Communicate directly with your account team.' : 'Unified inbox for client support and internal team chatter.'}
          </p>
        </div>
        <button
          onClick={() => {
            setSelected(null);
            setShowModal(true);
          }}
          className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Plus size={18} className="mr-2 shrink-0" />
          New Conversation
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 flex items-center bg-card p-3 rounded-2xl border border-border shadow-sm">
          <Search size={16} className="absolute left-6 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations by subject..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
        {!isClientView && (
          <div className="flex space-x-2">
            <button className="flex items-center px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary cursor-pointer">
              <Filter size={16} className="mr-2 shrink-0" /> Filter
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        
        {/* Inbox Sidebar */}
        <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden flex flex-col h-[750px]">
          <div className="p-6 border-b border-border bg-secondary/40 flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center tracking-tight text-foreground">
              Messages
            </h2>
            <span className="text-[10px] font-black px-2 py-0.5 bg-secondary text-foreground rounded-full border border-border tabular-nums">{messagesList.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading threads...</div>
            ) : messagesList.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center">
                 <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                   <MessageSquare className="text-muted-foreground" opacity={0.5} />
                 </div>
                 No conversations found.
              </div>
            ) : messagesList.map((thread) => {
              const threadMessages = Array.isArray(thread.messages) ? thread.messages : [];
              const threadParticipants = Array.isArray(thread.participants) ? thread.participants : [];
              const latestMessage = threadMessages[threadMessages.length - 1];
              const initiator = threadParticipants.find(p => p.role === 'initiator')?.user;
              
              return (
                <button
                  key={thread._id}
                  onClick={() => setSelected(thread)}
                  className={`w-full text-left px-5 py-4 transition-all relative cursor-pointer ${active?._id === thread._id ? 'bg-secondary/70' : 'hover:bg-secondary/30'}`}
                >
                  {active?._id === thread._id && (
                    <motion.div layoutId="activeThread" className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${categoryStyles[thread.category] || categoryStyles.general}`}>
                          {thread.category}
                        </span>
                        {thread.priority === 'urgent' && <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-tighter">Urgent</span>}
                      </div>
                      <h3 className="text-sm font-bold truncate text-foreground">{thread.subject}</h3>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 leading-relaxed font-medium">
                        {latestMessage?.content || 'No messages yet.'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center text-[10px] font-bold text-muted-foreground">
                      <User size={10} className="mr-1.5 shrink-0" />
                      <span className="truncate max-w-[120px]">{initiator?.name || 'System'}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusStyles[thread.status] || statusStyles.open}`}>
                      {(thread.status || 'open').replace('_', ' ')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Conversation View */}
        <div className="bg-card rounded-[2rem] border border-border shadow-sm flex flex-col h-[750px] overflow-hidden relative">
          {active ? (
            <>
              {/* Thread Header */}
              <div className="px-8 py-6 border-b border-border bg-secondary/40 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-black tracking-tight text-foreground truncate">{active.subject}</h2>
                  <div className="flex items-center mt-2 text-[10px] font-bold text-muted-foreground gap-4 tabular-nums">
                    <span className="flex items-center uppercase tracking-widest"><Clock size={12} className="mr-1.5 shrink-0" /> {new Date(active.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center uppercase tracking-widest">#{active.threadId || active._id?.slice(-6) || 'thread'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!isClientView && (
                    <select
                      value={active.status}
                      onChange={(event) => updateStatus(event.target.value)}
                      className="rounded-xl border border-border bg-background px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground outline-none cursor-pointer hover:bg-secondary transition-colors"
                    >
                      <option value="new">New</option>
                      <option value="open">Open</option>
                      <option value="pending_client">Pending Client</option>
                      <option value="pending_internal">Pending Internal</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  )}
                  {isClientView && (
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${statusStyles[active.status] || statusStyles.open}`}>
                       {(active.status || 'open').replace('_', ' ')}
                    </div>
                  )}
                  {!isClientView && (
                    <button onClick={() => removeMessage(active._id)} className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Timeline */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-background/50 custom-scrollbar">
                <AnimatePresence>
                  {active.messages?.map((msg, idx) => {
                    const isMe = msg.sender?._id === user?._id;
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={msg._id || idx} 
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          {!isMe && (
                             <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[9px] font-black text-foreground overflow-hidden border border-border">
                                {msg.sender?.avatar ? <img src={getAssetUrl(msg.sender.avatar)} alt="" /> : msg.sender?.name?.charAt(0) || '?'}
                             </div>
                          )}
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                            {msg.sender?.name} {msg.isInternalNote && <span className="text-foreground ml-1">(Internal Note)</span>}
                          </span>
                        </div>
                        
                        <div className={`max-w-[80%] rounded-[1.5rem] px-5 py-3 shadow-sm text-[13px] font-medium leading-relaxed ${
                          msg.isInternalNote ? 'bg-muted border border-border text-foreground' :
                          isMe ? 'bg-primary text-primary-foreground border border-primary' : 'bg-secondary border border-border text-foreground'
                        }`}
                        style={{ borderRadius: isMe ? '1.5rem 1.5rem 0 1.5rem' : '1.5rem 1.5rem 1.5rem 0' }}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        
                        <span className="text-[9px] font-bold text-muted-foreground mt-1.5 px-1 uppercase tracking-widest tabular-nums">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Reply Box */}
              <div className="p-6 border-t border-border bg-secondary/20">
                {!isClientView && (
                  <div className="flex items-center mb-4 ml-2 space-x-4">
                    <label className="flex items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="mr-2 rounded border-border bg-background accent-primary"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                      />
                      <span className={`transition-colors flex items-center ${isInternal ? 'text-foreground' : 'group-hover:text-foreground'}`}>
                        {isInternal ? <Lock size={12} className="mr-1.5 shrink-0" /> : <Unlock size={12} className="mr-1.5 shrink-0" />}
                        Internal Note
                      </span>
                    </label>
                  </div>
                )}
                
                <div className={`flex items-end gap-3 p-2 rounded-[1.5rem] border transition-all ${isInternal ? 'border-foreground/40 bg-muted' : 'border-border bg-background focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15'}`}>
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder={isInternal ? "Write a private note..." : "Send a message..."}
                    className="flex-1 max-h-32 min-h-[44px] resize-none bg-transparent px-4 py-2.5 text-[13px] text-foreground placeholder-muted-foreground outline-none"
                    rows="1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={replyCommunication.isPending || !replyText.trim()}
                    className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:scale-95 cursor-pointer"
                  >
                    <Send size={18} className={replyText.trim() && !replyCommunication.isPending ? "translate-x-0.5 -translate-y-0.5" : ""} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={32} opacity={0.5} />
              </div>
              <p className="font-medium text-lg text-foreground">Your Workspace</p>
              <p className="text-sm mt-1">Select a conversation to view details.</p>
            </div>
          )}
        </div>
      </div>

      <CommunicationModal open={showModal} onOpenChange={setShowModal} communication={null} isClient={isClientView} />
    </div>
  );
};

export default Communication;
