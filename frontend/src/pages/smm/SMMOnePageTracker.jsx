import React, { useCallback, useEffect, useRef, useState } from 'react';
import { smmApi } from '../../api/smm';
import { useSocket } from '../../context/SocketContext';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { ClientCompletionDashboard } from '../../components/smm/ClientCompletionDashboard';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Clock, RefreshCw,
  LayoutGrid, AlertCircle, Check, X, Info, Plus, Sparkles, ArrowDownToLine,
  Trash2, AlertTriangle, ListTodo, Radio
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Fixed column pixel widths (must match sticky left offsets exactly) ───────
const COL = { NO: 36, TEAM: 52, CLIENT: 176, PLAN: 104, DAY: 68, DONE: 68 };
// Sticky left offsets:
const L = {
  NO:     0,
  TEAM:   COL.NO,                          // 36
  CLIENT: COL.NO + COL.TEAM,               // 88
  PLAN:   COL.NO + COL.TEAM + COL.CLIENT,  // 264
};
// Total fixed width
const FIXED_W = COL.NO + COL.TEAM + COL.CLIENT + COL.PLAN; // 368

const STATUS_CYCLE  = { todo:'pending', pending:'done', done:'skip', skip:'todo' };
const STATUS_LABEL  = { todo:'TODO', pending:'PENDING', done:'DONE', skip:'SKIP' };

const getDayOfWeek = (y, m, d) => new Date(y, m - 1, d).getDay();
const isSunday     = (y, m, d) => getDayOfWeek(y, m, d) === 0;

// ── Shared cell styles ───────────────────────────────────────────────────────
const HDR_BASE = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  background: 'rgb(15,118,110)',  // teal-700
  color: '#fff',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  padding: '6px 6px',
  border: '1px solid rgba(255,255,255,0.15)',
  textAlign: 'center',
};
const HDR_STICKY = (left, width) => ({
  ...HDR_BASE,
  position: 'sticky',
  left,
  zIndex: 30,
  width,
  minWidth: width,
  maxWidth: width,
});
const HDR_SUN = { ...HDR_BASE, background: 'rgba(251,191,36,0.85)', color:'#78350f' };
const HDR_TODAY = {
  ...HDR_BASE,
  background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  border: '2px solid #60a5fa',
  boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
};

const CELL_BASE = {
  fontSize: 11,
  padding: '5px 4px',
  border: '1px solid rgba(0,0,0,0.08)',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
  textAlign: 'center',
  background: 'var(--card-bg, #fff)',
};
const CELL_STICKY = (left, width) => ({
  ...CELL_BASE,
  position: 'sticky',
  left,
  zIndex: 10,
  width,
  minWidth: width,
  maxWidth: width,
});
const STATUS_CELL_STICKY = (left, width) => ({
  ...CELL_STICKY(left, width),
  background: 'rgba(204,251,241,0.4)',  // teal-50 tint
  padding: '4px 4px',
});
const DAY_CELL = (sun, isToday) => ({
  ...CELL_BASE,
  width: COL.DAY,
  minWidth: COL.DAY,
  maxWidth: COL.DAY,
  background: isToday
    ? 'rgba(37, 99, 235, 0.08)'
    : sun
    ? 'rgba(252,211,77,0.08)'
    : undefined,
  borderLeft: isToday ? '2px solid #3b82f6' : undefined,
  borderRight: isToday ? '2px solid #3b82f6' : undefined,
});
const STATUS_DAY_CELL = (sun, isToday) => ({
  ...DAY_CELL(sun, isToday),
  padding: '3px 2px',
  background: isToday
    ? 'rgba(37, 99, 235, 0.14)'
    : sun
    ? 'rgba(252,211,77,0.08)'
    : 'rgba(204,251,241,0.2)',
  borderLeft: isToday ? '2px solid #3b82f6' : undefined,
  borderRight: isToday ? '2px solid #3b82f6' : undefined,
});

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status, onClick, onSelectStatus }) => {
  const s = status || 'todo';
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const baseStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 2.5, width: '100%', padding: '3px 2px',
    borderRadius: 5, fontSize: 9.5, fontWeight: 800,
    border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  };
  const styles = {
    todo:    { ...baseStyle, background: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc' },
    pending: { ...baseStyle, background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' },
    done:    { ...baseStyle, background: '#10b981', color: '#ffffff', borderColor: '#059669' },
    skip:    { ...baseStyle, background: '#f3f4f6', color: '#6b7280', borderColor: '#d1d5db' },
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        style={styles[s] || styles.todo}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onContextMenu={handleContextMenu}
        title={`Status: ${STATUS_LABEL[s] || 'TODO'} (Click to cycle → ${STATUS_CYCLE[s] || 'pending'}, Right-click to select)`}
      >
        {s === 'done'    && <CheckCircle2 size={9} className="shrink-0" />}
        {s === 'pending' && <Clock size={9} className="shrink-0" />}
        {s === 'todo'    && <ListTodo size={9} className="shrink-0" />}
        <span>{STATUS_LABEL[s] || 'TODO'}</span>
      </button>

      {/* Popover to directly select any status */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            marginTop: 4,
            background: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            minWidth: 84,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {['todo', 'pending', 'done', 'skip'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectStatus?.(opt);
                setMenuOpen(false);
              }}
              style={{
                ...styles[opt],
                padding: '4px 6px',
                borderRadius: 5,
                boxShadow: s === opt ? '0 0 0 1.5px #2563eb' : 'none',
              }}
            >
              {opt === 'done'    && <CheckCircle2 size={9} />}
              {opt === 'pending' && <Clock size={9} />}
              {opt === 'todo'    && <ListTodo size={9} />}
              <span>{STATUS_LABEL[opt]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const EditableLabel = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { onSave(draft.trim()); setEditing(false); };

  if (editing) return (
    <div style={{ display:'flex', alignItems:'center', gap:2 }}>
      <input
        ref={ref} value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if(e.key==='Enter') commit(); if(e.key==='Escape') setEditing(false); }}
        style={{ width:'100%', fontSize:10, padding:'2px 3px', border:'1px solid #6366f1', borderRadius:4, outline:'none', background:'var(--input,#fff)', color:'inherit', minWidth:0 }}
      />
      <button onClick={commit} style={{ color:'#10b981', flexShrink:0 }}><Check size={11}/></button>
      <button onClick={()=>setEditing(false)} style={{ color:'#9ca3af', flexShrink:0 }}><X size={11}/></button>
    </div>
  );

  return (
    <button
      onClick={() => { setDraft(value||''); setEditing(true); }}
      title={value || 'Click to edit'}
      style={{
        width:'100%', background:'none', border:'none', cursor:'pointer',
        fontSize:10, fontWeight: value ? 700 : 400,
        color: value ? 'inherit' : '#9ca3af',
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        padding:'1px 2px', borderRadius:3,
      }}
    >
      {value || '—'}
    </button>
  );
};

const EditablePlan = ({ value, onSave, placeholder }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);
  useEffect(() => { if(editing) ref.current?.focus(); }, [editing]);
  const commit = () => { onSave(draft.trim()); setEditing(false); };

  if (editing) return (
    <input
      ref={ref} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if(e.key==='Enter') commit(); if(e.key==='Escape') setEditing(false); }}
      style={{ width:'100%', fontSize:10, padding:'3px 4px', border:'1px solid #6366f1', borderRadius:4, outline:'none', background:'var(--input,#fff)', color:'inherit' }}
      placeholder={placeholder}
    />
  );

  return (
    <button
      onClick={() => { setDraft(value||''); setEditing(true); }}
      style={{
        width:'100%', background:'none', border:'none', cursor:'pointer',
        fontSize:10, fontWeight:700, whiteSpace:'nowrap',
        color: value ? 'inherit' : '#9ca3af', padding:'2px 4px', borderRadius:3,
        textAlign:'center',
      }}
    >
      {value || <span style={{ fontStyle:'italic', fontWeight:400, fontSize:9 }}>{placeholder}</span>}
    </button>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const SMMOnePageTracker = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [rows, setRows]       = useState([]);
  const [daysInMonth, setDIM] = useState(30);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('posts');
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [detectedContent, setDetectedContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [newClient, setNewClient] = useState({
    clientId: '',
    companyName: '',
    reels: 8,
    posts: 4,
    stories: 30,
    team: 'RWM',
    isCustom: false,
  });
  const socket = useSocket();
  const [submitting, setSubmitting] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [deleteMode, setDeleteMode] = useState('month'); // 'month' | 'permanent'
  const [deleting, setDeleting] = useState(false);

  const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();
  const currentDayNumber = isCurrentMonth ? now.getDate() : null;
  const tableContainerRef = useRef(null);
  const hasAutoScrolledRef = useRef(false);

  const scrollToToday = useCallback((smooth = true) => {
    if (isCurrentMonth && currentDayNumber && tableContainerRef.current) {
      // (currentDayNumber - 1) * COL.DAY puts today at the first visible day spot next to sticky columns
      const targetScroll = Math.max(0, (currentDayNumber - 1) * COL.DAY);
      tableContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, [isCurrentMonth, currentDayNumber]);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [month, year, section]);

  useEffect(() => {
    if (!loading && rows.length > 0 && isCurrentMonth && !hasAutoScrolledRef.current) {
      const timer = setTimeout(() => {
        scrollToToday(true);
        hasAutoScrolledRef.current = true;
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, rows.length, isCurrentMonth, scrollToToday]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await smmApi.getMonthlyTrackers({ month, year });
      if (res.data?.success) {
        setRows(res.data.data.rows || []);
        setDIM(res.data.data.daysInMonth || 30);
      }
    } catch (err) {
      console.error('fetchData error:', err);
      if (!silent) toast.error('Failed to load tracker data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Real-time Socket Synchronization across multiple systems ───────────
  useEffect(() => {
    if (!socket) return;

    const handleCellUpdated = (data) => {
      if (!data) return;
      if (Number(data.month) === Number(month) && Number(data.year) === Number(year)) {
        setRows((prevRows) => {
          return prevRows.map((row) => {
            const rowTrackerId = row._id ? row._id.toString() : null;
            const rowClientId = row.client?._id ? row.client._id.toString() : (row.client ? row.client.toString() : null);

            const matchesTracker = data.trackerId && rowTrackerId && rowTrackerId === data.trackerId.toString();
            const matchesClient = data.clientId && rowClientId && rowClientId === data.clientId.toString();

            if (!matchesTracker && !matchesClient) return row;

            const updatedDays = (row.days || []).map((d) => {
              if (d.day === Number(data.day)) {
                return { ...d, [data.field]: data.value };
              }
              return d;
            });

            return { ...row, days: updatedDays };
          });
        });
      }
    };

    const handleMetaUpdated = (data) => {
      if (!data) return;
      if (Number(data.month) === Number(month) && Number(data.year) === Number(year)) {
        setRows((prevRows) => {
          return prevRows.map((row) => {
            const rowTrackerId = row._id ? row._id.toString() : null;
            const rowClientId = row.client?._id ? row.client._id.toString() : null;
            const matchesTracker = data.trackerId && rowTrackerId && rowTrackerId === data.trackerId.toString();
            const matchesClient = data.clientId && rowClientId && rowClientId === data.clientId.toString();
            if (!matchesTracker && !matchesClient) return row;

            return {
              ...row,
              plan: data.plan !== undefined ? data.plan : row.plan,
              storyPlan: data.storyPlan !== undefined ? data.storyPlan : row.storyPlan,
              team: data.team !== undefined ? data.team : row.team,
            };
          });
        });
      }
    };

    const handleTrackerUpdated = (data) => {
      if (!data || !data.month || (Number(data.month) === Number(month) && Number(data.year) === Number(year))) {
        fetchData(true);
      }
    };

    const handleTrackerDeleted = (data) => {
      if (!data || !data.month || (Number(data.month) === Number(month) && Number(data.year) === Number(year))) {
        fetchData(true);
      }
    };

    const handleClientChanged = () => {
      fetchData(true);
    };

    socket.on('smmTrackerCellUpdated', handleCellUpdated);
    socket.on('smmTrackerMetaUpdated', handleMetaUpdated);
    socket.on('smmTrackerUpdated', handleTrackerUpdated);
    socket.on('smmTrackerDeleted', handleTrackerDeleted);
    socket.on('clientCreated', handleClientChanged);
    socket.on('clientUpdated', handleClientChanged);
    socket.on('clientDeleted', handleClientChanged);

    return () => {
      socket.off('smmTrackerCellUpdated', handleCellUpdated);
      socket.off('smmTrackerMetaUpdated', handleMetaUpdated);
      socket.off('smmTrackerUpdated', handleTrackerUpdated);
      socket.off('smmTrackerDeleted', handleTrackerDeleted);
      socket.off('clientCreated', handleClientChanged);
      socket.off('clientUpdated', handleClientChanged);
      socket.off('clientDeleted', handleClientChanged);
    };
  }, [socket, month, year, fetchData]);

  // ── Background Polling Safety Net & Tab Focus Refetch ──────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          fetchData(true);
        }
      }
    }, 5000);

    const handleFocus = () => {
      fetchData(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchData]);

  const prevMonth = () => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const fetchClients = useCallback(async () => {
    try {
      const res = await smmApi.getClients();
      if (res.data?.success) {
        setAvailableClients(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleClientSelect = async (selectedId) => {
    if (selectedId === '__custom__') {
      setNewClient(prev => ({ ...prev, clientId: '', companyName: '', isCustom: true }));
      setDetectedContent(null);
      return;
    }

    const selected = availableClients.find(c => c._id === selectedId);
    if (!selected) {
      setNewClient(prev => ({ ...prev, clientId: '', companyName: '', isCustom: false }));
      setDetectedContent(null);
      return;
    }

    const cName = selected.companyName || selected.company || selected.name || '';
    setNewClient(prev => ({
      ...prev,
      clientId: selectedId,
      companyName: cName,
      isCustom: false,
    }));

    // Auto-detect Content items for this client for the current month/year
    setLoadingContent(true);
    try {
      const res = await smmApi.getContents({ limit: 1000 });
      if (res.data?.success) {
        const all = res.data.data || [];
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        const items = all.filter(c => {
          const matchesId = c.client?._id === selectedId || c.client === selectedId;
          const matchesName = (c.client?.companyName || c.client?.company || c.client?.name || '').trim().toLowerCase() === cName.trim().toLowerCase();
          if (!matchesId && !matchesName) return false;
          const d = new Date(c.scheduledDate || c.actualPostedDate || c.createdAt);
          return d >= startOfMonth && d <= endOfMonth;
        });

        const rCount = items.filter(c => ['Reel', 'Video', 'Short', 'Reel / Story'].includes(c.contentType)).length;
        const pCount = items.filter(c => c.contentType === 'Post').length;
        const sCount = items.filter(c => ['Story', 'Reel / Story'].includes(c.contentType)).length;

        if (items.length > 0) {
          setDetectedContent({
            reels: rCount,
            posts: pCount,
            stories: sCount,
            total: items.length,
            items,
          });
          setNewClient(prev => ({
            ...prev,
            reels: rCount > 0 ? rCount : prev.reels,
            posts: pCount > 0 ? pCount : prev.posts,
            stories: sCount > 0 ? sCount : prev.stories,
          }));
        } else {
          setDetectedContent({ reels: 0, posts: 0, stories: 0, total: 0, items: [] });
        }
      }
    } catch (err) {
      console.error('Error checking content:', err);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSyncFromContent = async () => {
    setIsSyncing(true);
    try {
      const res = await smmApi.syncContentTracker({ month, year });
      if (res.data?.success) {
        toast.success(res.data.message || 'Tracker synced with Content module!');
        fetchData();
      }
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('Failed to sync with Content module');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateClientTracker = async (e) => {
    e.preventDefault();
    if (!newClient.companyName.trim()) {
      toast.error('Please select or enter a client');
      return;
    }
    setSubmitting(true);
    try {
      let targetClientId = newClient.clientId;
      if (!targetClientId) {
        const clientRes = await smmApi.createClient({ companyName: newClient.companyName.trim(), status: 'Active' });
        const createdClient = clientRes.data?.data;
        if (!createdClient?._id) throw new Error('Failed to create client');
        targetClientId = createdClient._id;
      }

      const plan = `${newClient.reels}R + ${newClient.posts}P`;
      const storyPlan = `${newClient.stories} STORIES`;

      // Build days array, pre-populating with detected content if any
      const days = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        postLabel: '',
        postStatus: 'todo',
        storyLabel: '',
        storyStatus: 'todo',
        note: '',
      }));

      if (detectedContent?.items?.length > 0) {
        let rIdx = 1, pIdx = 1, sIdx = 1;
        detectedContent.items.forEach(item => {
          const dDate = item.scheduledDate || item.actualPostedDate || item.createdAt;
          const dayNum = new Date(dDate).getDate();
          const dayCell = days.find(d => d.day === dayNum);
          if (!dayCell) return;

          const timeStr = item.scheduledTime || '';
          const isDone = item.postingStatus === 'Published';
          const isSkip = item.postingStatus === 'Cancelled';
          const st = isDone ? 'done' : isSkip ? 'skip' : 'pending';

          if (['Reel', 'Video', 'Short'].includes(item.contentType)) {
            dayCell.postLabel = `R${rIdx++} ${timeStr}`.trim();
            dayCell.postStatus = st;
          } else if (item.contentType === 'Post') {
            dayCell.postLabel = `P${pIdx++} ${timeStr}`.trim();
            dayCell.postStatus = st;
          } else if (item.contentType === 'Story') {
            dayCell.storyLabel = `S${sIdx++} ${timeStr}`.trim();
            dayCell.storyStatus = st;
          } else if (item.contentType === 'Reel / Story') {
            dayCell.postLabel = `R${rIdx++} ${timeStr}`.trim();
            dayCell.postStatus = st;
            dayCell.storyLabel = `S${sIdx++} ${timeStr}`.trim();
            dayCell.storyStatus = st;
          }
        });
      }

      await smmApi.upsertTracker({
        clientId: targetClientId,
        month,
        year,
        plan,
        storyPlan,
        team: newClient.team || 'RWM',
        days,
      });

      toast.success(`Client "${newClient.companyName}" added to tracker!`);
      setShowAddModal(false);
      setNewClient({ clientId: '', companyName: '', reels: 8, posts: 4, stories: 30, team: 'RWM', isCustom: false });
      setDetectedContent(null);
      fetchData();
      fetchClients();
    } catch (err) {
      console.error('Error adding client:', err);
      toast.error(err.response?.data?.message || 'Failed to add client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    setDeleting(true);
    try {
      const isPermanent = deleteMode === 'permanent';
      const trackerId = clientToDelete._id || 'scaffold';
      const clientId = clientToDelete.client?._id;
      const clientName = clientToDelete.client?.companyName || 'Client';

      await smmApi.deleteTracker(trackerId, {
        params: {
          clientId,
          month,
          year,
          deleteClient: isPermanent,
        },
      });

      toast.success(
        isPermanent
          ? `"${clientName}" permanently deleted`
          : `"${clientName}" removed from ${MONTHS[month - 1]} ${year} tracker`
      );

      setClientToDelete(null);
      setDeleteMode('month');
      fetchData();
      fetchClients();
    } catch (err) {
      console.error('Failed to delete client:', err);
      toast.error(err.response?.data?.message || 'Failed to delete client from tracker');
    } finally {
      setDeleting(false);
    }
  };

  const ensureRow = async (row) => {
    if (row._id) return row;
    const res = await smmApi.upsertTracker({ clientId:row.client._id, month, year, plan:row.plan, storyPlan:row.storyPlan, team:row.team, days:row.days });
    return res.data?.data || row;
  };

  const handleStatusSet = async (rowIdx, dayNum, field, next) => {
    const row = rows[rowIdx];
    setRows(prev => {
      const u = [...prev];
      const r = { ...u[rowIdx] };
      r.days = r.days.map(d => d.day === dayNum ? { ...d, [field]: next } : d);
      u[rowIdx] = r;
      return u;
    });
    try {
      let saved = row;
      if (!row._id) {
        saved = await ensureRow(row);
        setRows(prev => {
          const u = [...prev];
          u[rowIdx] = { ...saved, days: saved.days.map(d => d.day === dayNum ? { ...d, [field]: next } : d) };
          return u;
        });
      }
      await smmApi.updateTrackerDayCell(saved._id || row._id, dayNum, { field, value: next });
    } catch(err) {
      toast.error('Failed to update');
      fetchData(true);
    }
  };

  const handleStatusToggle = async (rowIdx, dayNum, field) => {
    const row = rows[rowIdx];
    const cell = row.days.find(d => d.day === dayNum) || { day: dayNum };
    const current = cell[field] || 'todo';
    const next = STATUS_CYCLE[current] || 'todo';
    await handleStatusSet(rowIdx, dayNum, field, next);
  };

  const handleLabelSave = async (rowIdx, dayNum, field, value) => {
    const row = rows[rowIdx];
    setRows(prev => { const u=[...prev]; const r={...u[rowIdx]}; r.days=r.days.map(d=>d.day===dayNum?{...d,[field]:value}:d); u[rowIdx]=r; return u; });
    try {
      let saved = row; if (!row._id) saved = await ensureRow(row);
      await smmApi.updateTrackerDayCell(saved._id||row._id, dayNum, { field, value });
    } catch(err) { toast.error('Failed to save label'); fetchData(true); }
  };

  const handleMetaSave = async (rowIdx, field, value) => {
    const row = rows[rowIdx];
    setRows(prev => { const u=[...prev]; u[rowIdx]={...u[rowIdx],[field]:value}; return u; });
    try {
      if (row._id) { await smmApi.updateTrackerMeta(row._id, { [field]:value }); }
      else {
        const res = await smmApi.upsertTracker({ clientId:row.client._id, month, year, [field]:value, plan:field==='plan'?value:row.plan, storyPlan:field==='storyPlan'?value:row.storyPlan, team:field==='team'?value:row.team, days:row.days });
        if (res.data?.data) setRows(prev => { const u=[...prev]; u[rowIdx]=res.data.data; return u; });
      }
    } catch(err) { toast.error('Failed to save'); fetchData(true); }
  };

  const calcProgress = (row, sf) => {
    const lf = sf === 'postStatus' ? 'postLabel' : 'storyLabel';
    const total = row.days.filter(d => d[lf]).length || daysInMonth;
    const done  = row.days.filter(d => d[sf] === 'done').length;
    return { done, total };
  };

  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const isToday = isCurrentMonth && d === currentDayNumber;
    return {
      d,
      dow: DAYS_SHORT[getDayOfWeek(year, month, d)],
      sun: isSunday(year, month, d),
      isToday,
    };
  });

  const labelField    = section === 'posts' ? 'postLabel'  : 'storyLabel';
  const statusField   = section === 'posts' ? 'postStatus' : 'storyStatus';
  const statusRowLbl  = section === 'posts' ? 'TASK STATUS' : 'STORY STATUS';
  const planField     = section === 'posts' ? 'plan'       : 'storyPlan';
  const planPH        = section === 'posts' ? 'e.g. 15R + 2P' : '30 STORIES';

  const totalW = FIXED_W + COL.DONE + daysInMonth * COL.DAY;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-primary" size={22} />
            <h1 className="text-xl font-black text-foreground tracking-tight">
              RWM — {MONTHS[month-1].toUpperCase()} {year} SOCIAL MEDIA ONE PAGE TRACKER
            </h1>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <Info size={11}/>
            INSTAGRAM + FACEBOOK &nbsp;•&nbsp; IST &nbsp;•&nbsp; Click status badge to toggle DONE / PENDING / SKIP
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-2xs" title="Live sync connected: real-time updates active without page refresh">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Sync</span>
          </div>
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1.5 shadow-xs">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={16}/></button>
            <span className="text-xs font-bold text-foreground w-32 text-center">{MONTHS[month-1]} {year}</span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-secondary transition-colors"><ChevronRight size={16}/></button>
          </div>
          <button onClick={() => fetchData(false)} disabled={loading} className="p-2 rounded-xl border border-border bg-card hover:bg-secondary transition-colors" title="Manual Refresh">
            <RefreshCw size={15} className={loading ? 'animate-spin text-primary' : 'text-muted-foreground'}/>
          </button>
          <button
            onClick={handleSyncFromContent}
            disabled={isSyncing || loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 text-xs font-bold rounded-xl hover:bg-cyan-100 dark:hover:bg-cyan-900/50 shadow-xs transition-all"
            title="Auto-populate Reels, Posts, and Stories from the Content module"
          >
            <ArrowDownToLine size={14} className={isSyncing ? 'animate-bounce text-primary' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync from Content'}</span>
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              fetchClients();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 shadow-sm transition-all"
            title="Add a client to the tracker"
          >
            <Plus size={15} />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      <SMMSubNav/>

      {/* ── Section Tabs ── */}
      <div className="flex items-center gap-2">
        {[{id:'posts',label:'📸 Post & Reel Tracker'},{id:'stories',label:'🎬 30-Day Story Sheet'}].map(tab => (
          <button key={tab.id} onClick={() => setSection(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200
              ${section===tab.id ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' : 'bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Legend & Navigation ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Todo badge */}
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:8, background:'#e0f2fe', color:'#0369a1', fontSize:11, fontWeight:700, border:'1px solid #7dd3fc' }}>
            <ListTodo size={11}/>
            Todo (Initial)
          </span>

          {/* Pending badge */}
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:8, background:'#fef3c7', color:'#92400e', fontSize:11, fontWeight:700, border:'1px solid #fcd34d' }}>
            <Clock size={11}/>
            Pending
          </span>

          {/* Done badge */}
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:8, background:'#10b981', color:'#ffffff', fontSize:11, fontWeight:700, border:'1px solid #059669' }}>
            <CheckCircle2 size={11}/>
            Done
          </span>

          {/* Skip badge */}
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:8, background:'#f3f4f6', color:'#6b7280', fontSize:11, fontWeight:700, border:'1px solid #d1d5db' }}>
            Skip
          </span>

          {/* Sunday */}
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:8, background:'rgba(251,191,36,0.2)', color:'#92400e', fontSize:11, fontWeight:700, border:'1px solid rgba(251,191,36,0.4)' }}>
            <span style={{ width:10, height:10, background:'rgba(251,191,36,0.8)', borderRadius:2, display:'inline-block' }}/>Sunday
          </span>

          {/* Today / Live */}
          {isCurrentMonth && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:8, background:'linear-gradient(135deg, #2563eb, #1d4ed8)', color:'#ffffff', fontSize:11, fontWeight:800, border:'1px solid #60a5fa', boxShadow:'0 1px 4px rgba(37,99,235,0.25)' }}>
              <span style={{ width:7, height:7, background:'#ef4444', borderRadius:'50%', display:'inline-block', boxShadow:'0 0 6px #ef4444' }}/>
              Today (Live: Day {currentDayNumber})
            </span>
          )}
        </div>

        {/* Quick jump to today button */}
        {isCurrentMonth && (
          <button
            type="button"
            onClick={() => scrollToToday(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition-all cursor-pointer shadow-xs"
            title="Scroll horizontally to today's column"
          >
            <span>📍 Scroll to Today</span>
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw size={28} className="mx-auto animate-spin text-primary mb-3"/>
          <p className="text-sm text-muted-foreground font-semibold">Loading tracker…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-2xl p-8 space-y-4 shadow-xs">
          <AlertCircle size={36} className="mx-auto text-muted-foreground/80"/>
          <div>
            <h3 className="text-sm font-bold text-foreground">No Active Clients in Tracker</h3>
            <p className="text-xs text-muted-foreground mt-1">
              There are no clients listed for {MONTHS[month-1]} {year}. Add clients to start tracking.
            </p>
          </div>
          <button
            onClick={() => {
              setShowAddModal(true);
              fetchClients();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Add Client to Tracker</span>
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          {/* Title bar */}
          <div className="bg-teal-600 dark:bg-teal-700 text-white px-5 py-2.5 flex items-center justify-between">
            <span className="font-black text-sm tracking-wide">
              {section==='posts' ? 'POST & REEL TRACKER' : '30-DAY STORY SHEET — EVERY CLIENT / EVERY DAY'}
            </span>
            <span className="text-[11px] font-semibold opacity-80">
              {section==='posts' ? 'INSTAGRAM + FACEBOOK • IST • SELECT DONE → GREEN STATUS' : 'STORIES — EVERY CLIENT / EVERY DAY'}
            </span>
          </div>

          {/* Scrollable wrapper — overflow-x ONLY on this div; vertical handled by the table height */}
          <div
            ref={tableContainerRef}
            className="custom-scrollbar"
            style={{ overflowX:'auto', overflowY:'auto', maxHeight:'calc(100vh - 310px)' }}
          >
            <table style={{ borderCollapse:'separate', borderSpacing:0, minWidth:totalW, tableLayout:'fixed', width: totalW }}>

              {/* ── colgroup — single source of truth for widths ── */}
              <colgroup>
                <col style={{ width:COL.NO   }}/>
                <col style={{ width:COL.TEAM }}/>
                <col style={{ width:COL.CLIENT }}/>
                <col style={{ width:COL.PLAN }}/>
                {dayHeaders.map(({d}) => <col key={d} style={{ width:COL.DAY }}/>)}
                <col style={{ width:COL.DONE }}/>
              </colgroup>

              {/* ── THEAD ── */}
              <thead>
                <tr>
                  <th style={HDR_STICKY(L.NO,     COL.NO)}>NO</th>
                  <th style={HDR_STICKY(L.TEAM,   COL.TEAM)}>TEAM</th>
                  <th style={{ ...HDR_STICKY(L.CLIENT, COL.CLIENT), textAlign:'left', paddingLeft:8 }}>CLIENT</th>
                  <th style={HDR_STICKY(L.PLAN,   COL.PLAN)}>PLAN</th>
                  {dayHeaders.map(({d, dow, sun, isToday}) => {
                    let thStyle = HDR_BASE;
                    if (isToday) {
                      thStyle = HDR_TODAY;
                    } else if (sun) {
                      thStyle = HDR_SUN;
                    }

                    return (
                      <th
                        key={d}
                        style={{
                          ...thStyle,
                          position: 'sticky',
                          top: 0,
                          zIndex: isToday ? 25 : 20,
                        }}
                      >
                        {isToday && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                            <span
                              style={{
                                fontSize: 8,
                                fontWeight: 900,
                                background: '#ef4444',
                                color: '#ffffff',
                                padding: '1px 5px',
                                borderRadius: 4,
                                letterSpacing: '0.06em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                              }}
                            >
                              ● LIVE
                            </span>
                          </div>
                        )}
                        <div style={{ lineHeight: '1.2', fontSize: isToday ? 12 : 10, fontWeight: isToday ? 900 : 800 }}>
                          {d}
                        </div>
                        <div style={{ fontWeight: isToday ? 700 : 500, opacity: isToday ? 1 : 0.8, fontSize: 9 }}>
                          {dow}
                        </div>
                      </th>
                    );
                  })}
                  <th style={{ ...HDR_STICKY('auto', COL.DONE), right:0, left:'auto' }}>DONE%</th>
                </tr>
              </thead>

              {/* ── TBODY ── */}
              <tbody>
                {rows.map((row, rowIdx) => {
                  const name = row.client?.companyName || 'Unknown';
                  const { done, total } = calcProgress(row, statusField);
                  const pct = total > 0 ? Math.round((done/total)*100) : 0;
                  const pctColor = pct===100 ? '#10b981' : pct>=60 ? '#3b82f6' : '#fbbf24';

                  return (
                    <React.Fragment key={row.client?._id || rowIdx}>

                      {/* Content row */}
                      <tr>
                        <td style={CELL_STICKY(L.NO, COL.NO)}>
                          <span style={{ fontWeight:800, fontSize:11 }}>{rowIdx+1}</span>
                        </td>
                        <td style={{ ...CELL_STICKY(L.TEAM, COL.TEAM), color:'#6366f1', fontWeight:700, fontSize:10 }}>
                          {row.team || 'RWM'}
                        </td>
                        <td style={{ ...CELL_STICKY(L.CLIENT, COL.CLIENT), textAlign:'left', paddingLeft:8, paddingRight:6 }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
                            <span
                              style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:700, fontSize:11 }}
                              title={name}
                            >
                              {name}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteMode('month');
                                setClientToDelete(row);
                              }}
                              className="p-1 rounded text-muted-foreground/40 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex-shrink-0 cursor-pointer"
                              title={`Delete ${name} from tracker`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                        <td style={CELL_STICKY(L.PLAN, COL.PLAN)}>
                          <EditablePlan value={row[planField]} placeholder={planPH} onSave={v => handleMetaSave(rowIdx, planField, v)}/>
                        </td>
                        {dayHeaders.map(({d, sun, isToday}) => {
                          const cell = row.days.find(dc => dc.day===d) || {};
                          return (
                            <td key={d} style={DAY_CELL(sun, isToday)}>
                              <EditableLabel value={cell[labelField]} placeholder={section==='posts'?'R/P':'S#'} onSave={v => handleLabelSave(rowIdx, d, labelField, v)}/>
                            </td>
                          );
                        })}
                        <td style={{ ...CELL_STICKY('auto', COL.DONE), right:0, left:'auto' }}>
                          <div style={{ fontWeight:800, fontSize:10 }}>{done}/{total}</div>
                          <div style={{ marginTop:2, height:4, background:'#e5e7eb', borderRadius:4, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:pctColor, borderRadius:4, transition:'width 0.3s' }}/>
                          </div>
                        </td>
                      </tr>

                      {/* Status row */}
                      <tr style={{ borderBottom:'2px solid rgba(0,0,0,0.08)' }}>
                        <td style={STATUS_CELL_STICKY(L.NO, COL.NO)}/>
                        <td style={STATUS_CELL_STICKY(L.TEAM, COL.TEAM)}/>
                        <td style={{ ...STATUS_CELL_STICKY(L.CLIENT, COL.CLIENT), textAlign:'left', paddingLeft:8 }}>
                          <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#0f766e', whiteSpace:'nowrap' }}>
                            {statusRowLbl}
                          </span>
                        </td>
                        <td style={STATUS_CELL_STICKY(L.PLAN, COL.PLAN)}/>
                        {dayHeaders.map(({d, sun, isToday}) => {
                          const cell = row.days.find(dc => dc.day===d) || {};
                          const st = cell[statusField] || 'todo';
                          return (
                            <td key={d} style={STATUS_DAY_CELL(sun, isToday)}>
                              <StatusBadge
                                status={st}
                                onClick={() => handleStatusToggle(rowIdx, d, statusField)}
                                onSelectStatus={(newSt) => handleStatusSet(rowIdx, d, statusField, newSt)}
                              />
                            </td>
                          );
                        })}
                        <td style={{ ...STATUS_CELL_STICKY('auto', COL.DONE), right:0, left:'auto' }}/>
                      </tr>

                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 px-4 py-2.5 flex items-center justify-between bg-muted/20">
            <span className="text-[11px] text-muted-foreground">
              {rows.length} clients &nbsp;•&nbsp; {daysInMonth} days &nbsp;•&nbsp; {MONTHS[month-1]} {year}
            </span>
            <div className="flex items-center gap-4 text-[11px] font-semibold flex-wrap">
              <span className="text-sky-600 dark:text-sky-400">
                📋 Todo: {rows.reduce((a,r)=>a+r.days.filter(d=>(d[statusField]||'todo')==='todo').length, 0)}
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                ⏳ Pending: {rows.reduce((a,r)=>a+r.days.filter(d=>d[statusField]==='pending').length, 0)}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                ✅ Done: {rows.reduce((a,r)=>a+r.days.filter(d=>d[statusField]==='done').length, 0)}
              </span>
              <span className="text-muted-foreground">
                ⏭ Skip: {rows.reduce((a,r)=>a+r.days.filter(d=>d[statusField]==='skip').length, 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Client Completion Dashboard & Bar Graph Visual ── */}
      {!loading && rows.length > 0 && (
        <ClientCompletionDashboard
          rows={rows}
          daysInMonth={daysInMonth}
          onUpdatePlan={(rowIdx, newReels, newPosts) => {
            const planStr = `${newReels}R + ${newPosts}P`;
            handleMetaSave(rowIdx, 'plan', planStr);
          }}
          onUpdateStories={(rowIdx, newStories) => {
            const storyStr = `${newStories} STORIES`;
            handleMetaSave(rowIdx, 'storyPlan', storyStr);
          }}
          onDeleteClient={(row) => {
            setDeleteMode('month');
            setClientToDelete(row);
          }}
        />
      )}

      {/* ── Add Client Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-foreground">Add Client to Tracker</h3>
                <p className="text-xs text-muted-foreground">Select from added clients or auto-sync content</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setDetectedContent(null);
                }}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClientTracker} className="space-y-4">
              {/* Client Selection Dropdown */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Choose Client *
                </label>
                <select
                  value={newClient.isCustom ? '__custom__' : newClient.clientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:border-primary outline-none text-foreground font-semibold"
                >
                  <option value="">-- Select Client from Added Clients --</option>
                  {availableClients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName || c.company || c.name}
                    </option>
                  ))}
                  <option value="__custom__">➕ + Add New Client Manually...</option>
                </select>
              </div>

              {/* Manual Name Input if Custom */}
              {newClient.isCustom && (
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">New Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ACME CORP"
                    value={newClient.companyName}
                    onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:border-primary outline-none text-foreground font-semibold"
                  />
                </div>
              )}

              {/* Auto-detected Content Badge */}
              {loadingContent ? (
                <div className="bg-muted/40 rounded-xl p-3 text-xs flex items-center gap-2 text-muted-foreground animate-pulse">
                  <RefreshCw size={14} className="animate-spin text-primary" />
                  <span>Checking Content module for scheduled Reels, Posts & Stories…</span>
                </div>
              ) : detectedContent?.total > 0 ? (
                <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-400 dark:border-cyan-700 rounded-xl p-3 text-xs text-cyan-900 dark:text-cyan-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-800 dark:text-cyan-300">
                    <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400" />
                    Auto-detected from Content Module ({MONTHS[month-1]} {year})
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Found <strong>{detectedContent.reels} Reels</strong>, <strong>{detectedContent.posts} Posts</strong>, and <strong>{detectedContent.stories} Stories</strong>. Quotas and day upload schedules have been automatically filled!
                  </p>
                </div>
              ) : newClient.clientId ? (
                <div className="bg-muted/30 rounded-xl p-2.5 text-[11px] text-muted-foreground">
                  No scheduled items in Content module yet for {MONTHS[month-1]} {year}. Using default targets below.
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Team</label>
                  <input
                    type="text"
                    value={newClient.team}
                    onChange={(e) => setNewClient({ ...newClient, team: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:border-primary outline-none text-foreground font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Stories Quota</label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={newClient.stories}
                    onChange={(e) => setNewClient({ ...newClient, stories: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:border-primary outline-none text-foreground font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Reels Target</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newClient.reels}
                    onChange={(e) => setNewClient({ ...newClient, reels: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:border-primary outline-none text-foreground font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Posts Target</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newClient.posts}
                    onChange={(e) => setNewClient({ ...newClient, posts: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:border-primary outline-none text-foreground font-semibold"
                  />
                </div>
              </div>

              <div className="bg-muted/40 rounded-xl p-3 text-xs flex items-center justify-between text-muted-foreground">
                <span>Computed Plan:</span>
                <span className="font-bold text-primary">{newClient.reels}R + {newClient.posts}P &bull; {newClient.stories} Stories</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setDetectedContent(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!newClient.companyName && !newClient.clientId)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add to Tracker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Delete Client Confirmation Modal ── */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Delete Client from Tracker</h3>
                  <p className="text-xs text-muted-foreground">Choose how you want to remove this client</p>
                </div>
              </div>
              <button
                disabled={deleting}
                onClick={() => setClientToDelete(null)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Client Badge */}
            <div className="bg-muted/40 rounded-xl p-3 border border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Selected Client:</span>
              <span className="font-black text-foreground text-sm">
                {clientToDelete.client?.companyName || 'Unknown Client'}
              </span>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              <label
                onClick={() => setDeleteMode('month')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deleteMode === 'month'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-secondary/50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'month'}
                  onChange={() => setDeleteMode('month')}
                  className="mt-0.5 text-primary"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground">
                    Remove from {MONTHS[month - 1]} {year} tracker only{' '}
                    <span className="text-[10px] text-primary font-semibold">(Recommended)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Hides this client from this month's tracker grid and analytics. The client remains active in SMM Clients and can be re-added anytime.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setDeleteMode('permanent')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deleteMode === 'permanent'
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-500'
                    : 'border-border bg-card hover:bg-secondary/50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'permanent'}
                  onChange={() => setDeleteMode('permanent')}
                  className="mt-0.5 text-red-600"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Delete client permanently from SMM
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Permanently deletes this client, associated content, and all monthly trackers from your system. This cannot be undone.
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteClient}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting && <RefreshCw size={13} className="animate-spin" />}
                <Trash2 size={13} />
                <span>
                  {deleting
                    ? 'Deleting...'
                    : deleteMode === 'month'
                    ? 'Remove from Tracker'
                    : 'Delete Permanently'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMMOnePageTracker;
