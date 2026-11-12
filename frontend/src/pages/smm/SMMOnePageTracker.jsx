import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { smmApi } from '../../api/smm';
import { useSocket } from '../../context/SocketContext';
import { SMMSubNav } from '../../components/smm/SMMSubNav';
import { ClientCompletionDashboard } from '../../components/smm/ClientCompletionDashboard';
import { TrackerDayDeliverablesDrawer } from '../../components/smm/TrackerDayDeliverablesDrawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Clock, RefreshCw,
  LayoutGrid, AlertCircle, Check, X, Info, Plus, Sparkles, ArrowDownToLine,
  Trash2, AlertTriangle, ListTodo, Radio, Smartphone, CalendarDays
} from '@/components/ui/muiIcons';
import { toast } from 'sonner';

// ── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Column pixel widths (Desktop & Responsive Mobile) ─────────────────────────
const COL_DESKTOP = { NO: 36, TEAM: 52, CLIENT: 176, PLAN: 104, DAY: 68, DONE: 68 };
const COL_MOBILE  = { NO: 28, TEAM: 48, CLIENT: 112, PLAN: 84,  DAY: 54, DONE: 54 };

export const COL = COL_DESKTOP;
export const L = {
  NO:     0,
  TEAM:   COL.NO,                          // 36
  CLIENT: COL.NO + COL.TEAM,               // 88
  PLAN:   COL.NO + COL.TEAM + COL.CLIENT,  // 264
};
// Total fixed width
export const FIXED_W = COL.NO + COL.TEAM + COL.CLIENT + COL.PLAN; // 368

const STATUS_CYCLE  = { todo:'pending', pending:'done', done:'skip', skip:'todo' };
const STATUS_LABEL  = { todo:'TODO', pending:'PENDING', done:'DONE', skip:'SKIP' };

const getDayOfWeek = (y, m, d) => new Date(y, m - 1, d).getDay();
const isSunday     = (y, m, d) => getDayOfWeek(y, m, d) === 0;

// ── Shared cell styles ───────────────────────────────────────────────────────
const HDR_BASE = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  background: '#18181b',
  color: '#fafafa',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  padding: '6px 6px',
  border: '1px solid rgba(255,255,255,0.08)',
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
const HDR_SUN = { ...HDR_BASE, background: '#27272a', color: '#d4d4d8' };
const HDR_TODAY = {
  ...HDR_BASE,
  background: '#083344',
  color: '#ffffff',
  boxShadow: 'inset 0 0 0 2px #12B7D4',
};

const CELL_BASE = {
  fontSize: 11,
  padding: '5px 4px',
  border: '1px solid hsl(var(--foreground) / 0.05)',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
  textAlign: 'center',
  background: 'hsl(var(--card))',
  color: 'inherit',
};
const CELL_STICKY = (left, width) => ({
  ...CELL_BASE,
  position: 'sticky',
  left,
  zIndex: 15,
  width,
  minWidth: width,
  maxWidth: width,
  background: 'hsl(var(--card))',
  boxShadow: left === L.PLAN ? '2px 0 6px -2px rgba(0,0,0,0.08)' : undefined,
});
const STATUS_CELL_STICKY = (left, width) => ({
  ...CELL_STICKY(left, width),
  background: 'hsl(var(--secondary))',
  padding: '4px 4px',
  zIndex: 15,
  boxShadow: left === L.PLAN ? '2px 0 6px -2px rgba(0,0,0,0.08)' : undefined,
});
const DAY_CELL = (sun, isToday) => ({
  ...CELL_BASE,
  width: COL.DAY,
  minWidth: COL.DAY,
  maxWidth: COL.DAY,
  background: isToday
    ? 'hsl(var(--secondary))'
    : sun
    ? 'hsl(var(--secondary) / 0.35)'
    : undefined,
  borderLeft: isToday ? '2px solid hsl(var(--foreground))' : undefined,
  borderRight: isToday ? '2px solid hsl(var(--foreground))' : undefined,
});
const STATUS_DAY_CELL = (sun, isToday) => ({
  ...DAY_CELL(sun, isToday),
  padding: '3px 2px',
  background: isToday
    ? 'hsl(var(--secondary))'
    : sun
    ? 'hsl(var(--secondary) / 0.5)'
    : 'hsl(var(--secondary) / 0.3)',
  borderLeft: isToday ? '2px solid hsl(var(--foreground))' : undefined,
  borderRight: isToday ? '2px solid hsl(var(--foreground))' : undefined,
});

// ── Helper: detect if label contains actual poster/content text (not just dashes or blank) ──
export const hasPosterContent = (label) => {
  if (!label) return false;
  const clean = String(label).trim();
  if (!clean) return false;
  return !/^[-—–\s]+$/.test(clean);
};

// ── Helper: determine if a day is before the live date (in the past) ────────
export const isDayBeforeToday = (dayNum, month, year) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const numYear = Number(year);
  const numMonth = Number(month);
  const numDay = Number(dayNum);

  if (numYear < currentYear) return true;
  if (numYear > currentYear) return false;
  if (numMonth < currentMonth) return true;
  if (numMonth > currentMonth) return false;
  return numDay < currentDay;
};

// ── Helper: resolve cell status, automatically making overdue posters pending ──
export const resolveCellStatus = (status, label, dayNum, month, year) => {
  const rawStatus = status || 'todo';
  // Respect user's explicit manual decisions:
  if (rawStatus === 'done' || rawStatus === 'skip') {
    return rawStatus;
  }
  // If date is before live date and has a poster, mark as pending automatically
  if (isDayBeforeToday(dayNum, month, year) && hasPosterContent(label)) {
    return 'pending';
  }
  return rawStatus;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status, items = [], onClick, onSelectStatus, onOpenDrawer }) => {
  const s = status || 'todo';
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef(null);

  const relevantItems = Array.isArray(items) ? items : [];
  const hasMultiple = relevantItems.length > 1;
  const doneCount = relevantItems.filter((it) => it.status === 'done').length;
  const totalCount = relevantItems.length;

  const displayLabel = hasMultiple
    ? doneCount === totalCount
      ? `${totalCount} DONE`
      : doneCount > 0
      ? `${doneCount}/${totalCount}`
      : `${totalCount} ${STATUS_LABEL[s] || 'TODO'}`
    : (STATUS_LABEL[s] || 'TODO');

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
    borderRadius: 6, fontSize: 9.5, fontWeight: 800,
    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  };
  const styles = {
    todo:    { ...baseStyle, background: 'hsl(var(--secondary))', color: 'hsl(var(--foreground))' },
    pending: { ...baseStyle, background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' },
    done:    { ...baseStyle, background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' },
    skip:    { ...baseStyle, background: 'hsl(var(--muted) / 0.6)', color: 'hsl(var(--muted-foreground))' },
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
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpenDrawer?.();
        }}
        onContextMenu={handleContextMenu}
        title={
          hasMultiple
            ? `${totalCount} items scheduled. Click to cycle, double-click for sidebar breakdown, right-click to select status`
            : `Status: ${STATUS_LABEL[s] || 'TODO'} (Click to cycle, right-click to select)`
        }
      >
        {s === 'done' && <CheckCircle2 size={9} className="shrink-0" />}
        {s === 'pending' && <Clock size={9} className="shrink-0" />}
        {s === 'todo' && <ListTodo size={9} className="shrink-0" />}
        <span>{displayLabel}</span>
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
            background: 'hsl(var(--popover))',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            border: 'none',
            borderRadius: 10,
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
                boxShadow: s === opt ? '0 0 0 1.5px hsl(var(--foreground))' : 'none',
              }}
            >
              {opt === 'done'    && <CheckCircle2 size={9} />}
              {opt === 'pending' && <Clock size={9} />}
              {opt === 'todo'    && <ListTodo size={9} />}
              <span>{STATUS_LABEL[opt]}</span>
            </button>
          ))}
          {onOpenDrawer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onOpenDrawer();
              }}
              className="text-[9px] font-bold text-foreground hover:bg-secondary p-1 rounded text-center mt-1 cursor-pointer"
            >
              Sidebar Details →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Interactive Day Cell Slot (Supports multiple deliverables + '+' button) ──
const DayCellDeliverableSlot = ({
  cell = {},
  field = 'postLabel',
  section = 'posts',
  onSaveLabel,
  onOpenDrawer,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef(null);

  const items = Array.isArray(cell.items) ? cell.items : [];
  const relevantItems = items.length > 0
    ? items.filter((it) => (section === 'stories' ? it.type === 'story' : ['reel', 'post', 'video', 'carousel'].includes(it.type)))
    : [];

  const hasMultiple = relevantItems.length > 1;
  const primaryItem = relevantItems[0];
  const displayVal = primaryItem ? primaryItem.label : (cell[field] || '');
  const extraCount = relevantItems.length - 1;

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = () => {
    onSaveLabel(draft.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <input
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          style={{
            width: '100%',
            fontSize: 10,
            padding: '2px 3px',
            border: '1px solid hsl(var(--foreground))',
            borderRadius: 4,
            outline: 'none',
            background: 'hsl(var(--background))',
            color: 'inherit',
            minWidth: 0,
          }}
        />
        <button onClick={commit} style={{ color: 'hsl(var(--foreground))', flexShrink: 0 }}>
          <Check size={11} />
        </button>
        <button onClick={() => setEditing(false)} style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
          <X size={11} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="group/cell flex items-center justify-center w-full min-h-[24px] px-1 py-0.5 rounded cursor-pointer hover:bg-secondary/80 hover:ring-1 hover:ring-border transition-colors select-none"
      onClick={() => onOpenDrawer()}
      title={
        hasMultiple
          ? `${relevantItems.length} deliverables on this date (${relevantItems.map((i) => i.label || i.type).join(', ')}). Click to open sidebar & add more!`
          : displayVal
          ? `${displayVal} (Click to open sidebar & details)`
          : 'Click to open sidebar & add Reel, Post, or Story'
      }
    >
      {hasMultiple ? (
        <div className="flex flex-col items-center justify-center w-full leading-tight py-0.5 gap-0.5">
          {relevantItems.slice(0, 2).map((it, idx) => (
            <span
              key={it.id || idx}
              className="truncate max-w-full text-[9px] font-bold text-foreground bg-secondary px-1 py-0.5 rounded block text-center w-full"
            >
              {it.label || `${it.type.toUpperCase()}${idx + 1}`}
            </span>
          ))}
          {relevantItems.length > 2 && (
            <span className="text-[8px] font-black text-muted-foreground tabular-nums">
              +{relevantItems.length - 2} more
            </span>
          )}
        </div>
      ) : (
        <span
          className={`truncate text-[10.5px] block w-full text-center ${
            displayVal ? 'font-bold text-foreground' : 'text-muted-foreground font-normal'
          }`}
        >
          {displayVal || '—'}
        </span>
      )}
    </div>
  );
};

const EditableLabel = memo(({ value, onSave }) => {
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
        style={{ width:'100%', fontSize:10, padding:'2px 3px', border:'1px solid hsl(var(--foreground))', borderRadius:4, outline:'none', background:'hsl(var(--background))', color:'inherit', minWidth:0 }}
      />
      <button onClick={commit} style={{ color:'hsl(var(--foreground))', flexShrink:0 }}><Check size={11}/></button>
      <button onClick={()=>setEditing(false)} style={{ color:'hsl(var(--muted-foreground))', flexShrink:0 }}><X size={11}/></button>
    </div>
  );

  return (
    <button
      onClick={() => { setDraft(value||''); setEditing(true); }}
      title={value || 'Click to edit'}
      style={{
        width:'100%', background:'none', border:'none', cursor:'pointer',
        fontSize:10, fontWeight: value ? 700 : 400,
        color: value ? 'inherit' : 'hsl(var(--muted-foreground))',
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        padding:'1px 2px', borderRadius:3,
      }}
    >
      {value || '—'}
    </button>
  );
});

const EditablePlan = memo(({ value, onSave, placeholder }) => {
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
      style={{ width:'100%', fontSize:10, padding:'3px 4px', border:'1px solid hsl(var(--foreground))', borderRadius:4, outline:'none', background:'hsl(var(--background))', color:'inherit' }}
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
});

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
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    client: null,
    dayNumber: null,
    dayCell: null,
    trackerId: null,
    rowIdx: null,
  });

  const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();
  const currentDayNumber = isCurrentMonth ? now.getDate() : null;
  const tableContainerRef = useRef(null);
  const hasAutoScrolledRef = useRef(false);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 768;
    return false;
  });

  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return 'day';
    return 'sheet';
  });

  const [focusedDay, setFocusedDay] = useState(() => {
    const n = new Date();
    if (month === n.getMonth() + 1 && year === n.getFullYear()) return n.getDate();
    return 1;
  });

  useEffect(() => {
    const checkResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkResize);
    return () => window.removeEventListener('resize', checkResize);
  }, []);

  useEffect(() => {
    const n = new Date();
    if (month === n.getMonth() + 1 && year === n.getFullYear()) {
      setFocusedDay(n.getDate());
    } else {
      setFocusedDay(1);
    }
  }, [month, year]);

  const scrollToToday = useCallback((smooth = true) => {
    if (isCurrentMonth && currentDayNumber && tableContainerRef.current) {
      const colDay = isMobile ? COL_MOBILE.DAY : COL_DESKTOP.DAY;
      const targetScroll = Math.max(0, (currentDayNumber - 1) * colDay);
      tableContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, [isCurrentMonth, currentDayNumber, isMobile]);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [month, year, section]);

  useEffect(() => {
    if (!loading && rows.length > 0 && isCurrentMonth && !hasAutoScrolledRef.current && viewMode === 'sheet') {
      const timer = setTimeout(() => {
        scrollToToday(true);
        hasAutoScrolledRef.current = true;
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, rows.length, isCurrentMonth, scrollToToday, viewMode]);

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
                if (data.cell) {
                  return { ...d, ...data.cell };
                }
                return { ...d, [data.field]: data.value };
              }
              return d;
            });

            return { ...row, days: updatedDays };
          });
        });

        // Also update open drawer state if currently inspecting this cell
        setDrawerState((prev) => {
          if (!prev.isOpen || prev.dayNumber !== Number(data.day)) return prev;
          const matchesDrawerTracker = data.trackerId && prev.trackerId && prev.trackerId.toString() === data.trackerId.toString();
          const matchesDrawerClient = data.clientId && prev.client?._id && prev.client._id.toString() === data.clientId.toString();
          if (!matchesDrawerTracker && !matchesDrawerClient) return prev;
          return {
            ...prev,
            dayCell: data.cell ? { ...(prev.dayCell || {}), ...data.cell } : { ...(prev.dayCell || {}), [data.field]: data.value },
          };
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
    }, 60000);

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
          const isPast = isDayBeforeToday(dayNum, month, year);
          const st = isDone ? 'done' : isSkip ? 'skip' : (isPast ? 'pending' : 'todo');

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
    const lf = field === 'postStatus' ? 'postLabel' : 'storyLabel';
    const current = resolveCellStatus(cell[field], cell[lf], dayNum, month, year);
    const next = STATUS_CYCLE[current] || 'todo';
    await handleStatusSet(rowIdx, dayNum, field, next);
  };

  const handleLabelSave = async (rowIdx, dayNum, field, value) => {
    const row = rows[rowIdx];
    const sf = field === 'postLabel' ? 'postStatus' : 'storyStatus';
    const cell = row.days.find(d => d.day === dayNum) || {};
    const autoPending = isDayBeforeToday(dayNum, month, year) && hasPosterContent(value) && (!cell[sf] || cell[sf] === 'todo');

    let updatedItems = cell.items;
    if (Array.isArray(cell.items) && cell.items.length > 0) {
      const targetTypes = field === 'storyLabel' ? ['story'] : ['reel', 'post', 'video', 'carousel'];
      const itemIdx = cell.items.findIndex((it) => targetTypes.includes(it.type));
      if (itemIdx >= 0) {
        updatedItems = cell.items.map((it, idx) => (idx === itemIdx ? { ...it, label: value } : it));
      }
    }

    setRows(prev => {
      const u = [...prev];
      const r = { ...u[rowIdx] };
      r.days = r.days.map(d => {
        if (d.day === dayNum) {
          const updated = { ...d, [field]: value };
          if (updatedItems) updated.items = updatedItems;
          if (autoPending) updated[sf] = 'pending';
          return updated;
        }
        return d;
      });
      u[rowIdx] = r;
      return u;
    });
    try {
      let saved = row;
      if (!row._id) saved = await ensureRow(row);
      const payload = { field, value };
      if (updatedItems) payload.items = updatedItems;
      await smmApi.updateTrackerDayCell(saved._id || row._id, dayNum, payload);
      if (autoPending) {
        await smmApi.updateTrackerDayCell(saved._id || row._id, dayNum, { field: sf, value: 'pending' });
      }
    } catch(err) {
      toast.error('Failed to save label');
      fetchData(true);
    }
  };

  const handleOpenDayDrawer = (rowIdx, dayNum) => {
    const row = rows[rowIdx];
    if (!row) return;
    const cell = (row.days || []).find((d) => d.day === dayNum) || { day: dayNum, items: [] };
    setDrawerState({
      isOpen: true,
      client: row.client,
      dayNumber: dayNum,
      dayCell: cell,
      trackerId: row._id || null,
      rowIdx,
    });
  };

  const handleSaveDayCell = async (dayNum, payload) => {
    if (drawerState.rowIdx === null || drawerState.rowIdx === undefined) return;
    const rowIdx = drawerState.rowIdx;
    const row = rows[rowIdx];
    if (!row) return;

    // Optimistic UI update
    setRows((prev) => {
      const u = [...prev];
      if (!u[rowIdx]) return prev;
      const r = { ...u[rowIdx] };
      r.days = (r.days || []).map((d) => {
        if (d.day === dayNum) {
          return { ...d, ...payload };
        }
        return d;
      });
      u[rowIdx] = r;
      return u;
    });

    setDrawerState((prev) => {
      if (!prev.isOpen || prev.dayNumber !== dayNum) return prev;
      return {
        ...prev,
        dayCell: { ...(prev.dayCell || {}), ...payload },
      };
    });

    try {
      let saved = row;
      if (!row._id) {
        saved = await ensureRow(row);
        setRows((prev) => {
          const u = [...prev];
          if (!u[rowIdx]) return prev;
          u[rowIdx] = {
            ...saved,
            days: (saved.days || []).map((d) => (d.day === dayNum ? { ...d, ...payload } : d)),
          };
          return u;
        });
        setDrawerState((prev) => ({ ...prev, trackerId: saved._id }));
      }
      await smmApi.updateTrackerDayCell(saved._id || row._id, dayNum, payload);
    } catch (err) {
      console.error('Failed to save day cell deliverables:', err);
      toast.error('Failed to save day deliverables');
      fetchData(true);
    }
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

  const curCol = isMobile ? COL_MOBILE : COL_DESKTOP;
  const curL = isMobile
    ? { NO: 0, TEAM: undefined, CLIENT: COL_MOBILE.NO, PLAN: undefined, DONE: undefined }
    : L;
  const totalW = isMobile
    ? (COL_MOBILE.NO + COL_MOBILE.TEAM + COL_MOBILE.CLIENT + COL_MOBILE.PLAN + COL_MOBILE.DONE + daysInMonth * COL_MOBILE.DAY)
    : (FIXED_W + COL.DONE + daysInMonth * COL.DAY);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LayoutGrid className="text-primary shrink-0" size={22} />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {MONTHS[month-1]} {year} Social Tracker
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-card rounded-xl px-1.5 py-1 h-10">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer" title="Previous Month"><ChevronLeft size={15}/></button>
            <span className="text-xs font-bold text-foreground w-28 text-center">{MONTHS[month-1]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer" title="Next Month"><ChevronRight size={15}/></button>
          </div>
          <button onClick={() => fetchData(false)} disabled={loading} className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-card hover:bg-secondary transition-colors cursor-pointer" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin text-foreground' : 'text-muted-foreground'}/>
          </button>
          <button
            onClick={handleSyncFromContent}
            disabled={isSyncing || loading}
            className="h-10 inline-flex items-center gap-1.5 px-3 bg-card text-foreground text-xs font-semibold rounded-xl hover:bg-secondary transition-colors cursor-pointer"
          >
            <ArrowDownToLine size={14} className={isSyncing ? 'animate-bounce text-foreground' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync from Content'}</span>
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              fetchClients();
            }}
            className="h-10 inline-flex items-center gap-1.5 px-4 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:opacity-90 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      <SMMSubNav/>

      {/* ── Section Tabs & View Mode Switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[{id:'posts',label:'Post & Reel Tracker'},{id:'stories',label:'30-Day Story Sheet'}].map(tab => (
            <button key={tab.id} onClick={() => setSection(tab.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer
                ${section===tab.id ? 'bg-primary text-primary-foreground ' : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-card rounded-xl p-1 ">
          <button
            type="button"
            onClick={() => setViewMode('sheet')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'sheet'
                ? 'bg-primary text-primary-foreground '
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Full monthly spreadsheet grid"
          >
            <LayoutGrid size={13} />
            <span>Month Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'day'
                ? 'bg-primary text-primary-foreground '
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Focused day cards with large touch buttons"
          >
            <Smartphone size={13} />
            <span>Day Cards</span>
          </button>
        </div>
      </div>

      {/* ── Legend & Quick Jump ── */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
          {/* Todo badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-card text-foreground text-[10.5px] font-bold">
            <ListTodo size={11}/>
            <span>Todo</span>
          </span>

          {/* Pending badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary text-foreground text-[10.5px] font-bold">
            <Clock size={11}/>
            <span>Pending</span>
          </span>

          {/* Done badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary text-primary-foreground text-[10.5px] font-bold">
            <CheckCircle2 size={11}/>
            <span>Done</span>
          </span>

          {/* Skip badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-[10.5px] font-bold">
            <span>Skip</span>
          </span>

          {/* Sunday */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary/60 text-muted-foreground text-[10.5px] font-bold">
            <span className="w-2 h-2 rounded-xs bg-zinc-500 inline-block" />
            <span>Sunday</span>
          </span>

          {/* Today / Live */}
          {isCurrentMonth && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary text-primary-foreground text-[10.5px] font-extrabold tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground inline-block" />
              <span>Today (Day {currentDayNumber})</span>
            </span>
          )}
        </div>

        {/* Quick jump to today button */}
        {isCurrentMonth && viewMode === 'sheet' && (
          <button
            type="button"
            onClick={() => scrollToToday(true)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors cursor-pointer shrink-0"
            title="Scroll horizontally to today's column"
          >
            <CalendarDays size={13} />
            <span>Scroll to Today</span>
          </button>
        )}
      </div>

      {/* ── Content View (Loading, Empty, Day Cards or Month Sheet) ── */}
      {loading ? (
        <div className="py-20 text-center bg-card rounded-2xl">
          <RefreshCw size={28} className="mx-auto animate-spin text-primary mb-3"/>
          <p className="text-sm text-muted-foreground font-semibold">Loading tracker…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-2xl p-6 space-y-4">
          <AlertCircle size={32} className="mx-auto text-muted-foreground/60"/>
          <h3 className="text-sm font-bold text-foreground">No Clients in {MONTHS[month-1]} {year} Tracker</h3>
          <button
            onClick={() => {
              setShowAddModal(true);
              fetchClients();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Client</span>
          </button>
        </div>
      ) : viewMode === 'day' ? (
        /* ── MOBILE DAY FOCUS VIEW ── */
        <div className="space-y-4">
          {/* Day Selector & Navigation Bar */}
          <div className="bg-card rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFocusedDay((d) => Math.max(1, d - 1))}
                  disabled={focusedDay <= 1}
                  className="p-1.5 rounded-xl bg-background hover:bg-secondary disabled:opacity-40 transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <span className="tabular-nums">Day {focusedDay} • {dayHeaders[focusedDay - 1]?.dow || ''}</span>
                    {isCurrentMonth && focusedDay === currentDayNumber && (
                      <span className="text-[9px] font-black uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded tracking-wide">
                        LIVE TODAY
                      </span>
                    )}
                  </h3>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {MONTHS[month-1]} {focusedDay}, {year}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusedDay((d) => Math.min(daysInMonth, d + 1))}
                  disabled={focusedDay >= daysInMonth}
                  className="p-1.5 rounded-xl bg-background hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => setFocusedDay(currentDayNumber)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    focusedDay === currentDayNumber
                      ? 'bg-primary text-primary-foreground '
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  <CalendarDays size={13} />
                  <span>{focusedDay === currentDayNumber ? 'Today Selected' : 'Go to Today'}</span>
                </button>
              )}
            </div>

            {/* Scrollable Day Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [touch-action:pan-x] [-webkit-overflow-scrolling:touch] custom-scrollbar">
              {dayHeaders.map(({ d, dow, sun, isToday: isLiveToday }) => {
                const isSelected = d === focusedDay;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFocusedDay(d)}
                    className={`flex flex-col items-center justify-center min-w-[36px] py-1 px-1 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground '
                        : isLiveToday
                        ? 'bg-secondary text-foreground '
                        : sun
                        ? 'bg-secondary/40 text-muted-foreground '
                        : 'bg-card text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className="text-[8.5px] font-medium opacity-80">{dow}</span>
                    <span className="text-xs font-black tabular-nums">{d}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Client Cards for selected focusedDay */}
          <div className="space-y-3">
            {rows.map((row, rowIdx) => {
              const name = row.client?.companyName || 'Unknown';
              const cell = (row.days || []).find((dc) => dc.day === focusedDay) || { day: focusedDay };
              const rawSt = cell[statusField] || 'todo';
              const st = resolveCellStatus(rawSt, cell[labelField], focusedDay, month, year);
              const relevantItems = Array.isArray(cell.items)
                ? (section === 'stories'
                    ? cell.items.filter((it) => it.type === 'story')
                    : cell.items.filter((it) => ['reel', 'post', 'video', 'carousel'].includes(it.type)))
                : [];
              const { done, total } = calcProgress(row, statusField);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const pctColor = pct === 100 ? 'hsl(var(--foreground))' : pct >= 60 ? '#52525b' : '#a1a1aa';

              return (
                <div key={row.client?._id || rowIdx} className="bg-card rounded-2xl p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-secondary text-foreground font-black text-xs flex items-center justify-center shrink-0 tabular-nums">
                        {rowIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate" title={name}>
                          {name}
                        </h4>
                        <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded ">
                          Team: {row.team || 'RWM'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteMode('month');
                        setClientToDelete(row);
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 cursor-pointer"
                      title={`Delete ${name} from tracker`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Quota & Progress Bar */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/30 p-2.5 rounded-xl ">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Plan Quota</span>
                      <EditablePlan
                        value={row[planField]}
                        placeholder={planPH}
                        onSave={(v) => handleMetaSave(rowIdx, planField, v)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Monthly Progress</span>
                      <div className="flex items-center justify-between font-bold text-[11px] tabular-nums">
                        <span>{done}/{total} done</span>
                        <span className="text-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-1">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: pctColor }} />
                      </div>
                    </div>
                  </div>

                  {/* Deliverable Slot for this specific day */}
                  <div className="bg-background rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold text-foreground tracking-wider tabular-nums">
                        Day {focusedDay} Deliverable
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenDayDrawer(rowIdx, focusedDay)}
                        className="text-[10px] font-bold text-foreground hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Sidebar Details →
                      </button>
                    </div>

                    <div className="py-1 min-h-[30px] flex items-center">
                      <DayCellDeliverableSlot
                        cell={cell}
                        field={labelField}
                        section={section}
                        onSaveLabel={(v) => handleLabelSave(rowIdx, focusedDay, labelField, v)}
                        onOpenDrawer={() => handleOpenDayDrawer(rowIdx, focusedDay)}
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground font-semibold">Status:</span>
                      <div className="w-36">
                        <StatusBadge
                          status={st}
                          items={relevantItems}
                          onClick={() => handleStatusToggle(rowIdx, focusedDay, statusField)}
                          onSelectStatus={(newSt) => handleStatusSet(rowIdx, focusedDay, statusField, newSt)}
                          onOpenDrawer={() => handleOpenDayDrawer(rowIdx, focusedDay)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── RESPONSIVE FULL MONTH SHEET (SPREADSHEET GRID) ── */
        <div className="bg-card rounded-2xl overflow-hidden ">
          {/* Title bar */}
          <div className="bg-zinc-900 border-b-2 border-brand/60 text-zinc-50 px-4 sm:px-5 py-2.5 flex items-center justify-between flex-wrap gap-2">
            <span className="font-black text-xs sm:text-sm tracking-wide">
              {section==='posts' ? 'POST & REEL TRACKER' : '30-DAY STORY SHEET — EVERY CLIENT / EVERY DAY'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-300">
              {section==='posts' ? 'INSTAGRAM + FACEBOOK • IST • CLICK STATUS TO UPDATE' : 'STORIES — EVERY CLIENT / EVERY DAY'}
            </span>
          </div>

          {/* Scrollable wrapper — overflow-x with touch scrolling */}
          <div
            ref={tableContainerRef}
            className="custom-scrollbar responsive-table-container"
            style={{
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 280px)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <table style={{ borderCollapse:'separate', borderSpacing:0, minWidth: totalW, tableLayout:'fixed', width: totalW }}>

              {/* ── colgroup — responsive column widths ── */}
              <colgroup>
                <col style={{ width: curCol.NO   }}/>
                <col style={{ width: curCol.TEAM }}/>
                <col style={{ width: curCol.CLIENT }}/>
                <col style={{ width: curCol.PLAN }}/>
                {dayHeaders.map(({d}) => <col key={d} style={{ width: curCol.DAY }}/>)}
                <col style={{ width: curCol.DONE }}/>
              </colgroup>

              {/* ── THEAD ── */}
              <thead>
                <tr>
                  <th style={HDR_STICKY(curL.NO, curCol.NO)}>NO</th>
                  <th style={isMobile ? { ...HDR_BASE, width: curCol.TEAM, minWidth: curCol.TEAM, maxWidth: curCol.TEAM, position: 'static' } : HDR_STICKY(curL.TEAM, curCol.TEAM)}>TEAM</th>
                  <th style={{ ...HDR_STICKY(curL.CLIENT, curCol.CLIENT), textAlign:'left', paddingLeft: isMobile ? 4 : 8, boxShadow: isMobile ? '2px 0 6px -2px rgba(0,0,0,0.2)' : undefined }}>CLIENT</th>
                  <th style={isMobile ? { ...HDR_BASE, width: curCol.PLAN, minWidth: curCol.PLAN, maxWidth: curCol.PLAN, position: 'static' } : HDR_STICKY(curL.PLAN, curCol.PLAN)}>PLAN</th>
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
                          width: curCol.DAY,
                          minWidth: curCol.DAY,
                          maxWidth: curCol.DAY,
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
                                background: '#fafafa',
                                color: '#09090b',
                                padding: '1px 4px',
                                borderRadius: 4,
                                letterSpacing: '0.06em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                              }}
                            >
                              LIVE
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
                  <th style={isMobile
                    ? { ...HDR_BASE, width: curCol.DONE, minWidth: curCol.DONE, maxWidth: curCol.DONE, position: 'static' }
                    : { ...HDR_STICKY('auto', curCol.DONE), right:0, left:'auto', zIndex:32, boxShadow:'-2px 0 6px -2px rgba(0,0,0,0.15)' }
                  }>DONE%</th>
                </tr>
              </thead>

              {/* ── TBODY ── */}
              <tbody>
                {rows.map((row, rowIdx) => {
                  const name = row.client?.companyName || 'Unknown';
                  const { done, total } = calcProgress(row, statusField);
                  const pct = total > 0 ? Math.round((done/total)*100) : 0;
                  const pctColor = pct===100 ? 'hsl(var(--foreground))' : pct>=60 ? '#52525b' : '#a1a1aa';

                  return (
                    <React.Fragment key={row.client?._id || rowIdx}>

                      {/* Content row */}
                      <tr>
                        <td style={CELL_STICKY(curL.NO, curCol.NO)}>
                          <span style={{ fontWeight:800, fontSize:10.5, fontVariantNumeric:'tabular-nums' }}>{rowIdx+1}</span>
                        </td>
                        <td style={isMobile ? { ...CELL_BASE, width: curCol.TEAM, minWidth: curCol.TEAM, maxWidth: curCol.TEAM, color:'hsl(var(--muted-foreground))', fontWeight:700, fontSize:10 } : { ...CELL_STICKY(curL.TEAM, curCol.TEAM), color:'hsl(var(--muted-foreground))', fontWeight:700, fontSize:10 }}>
                          {row.team || 'RWM'}
                        </td>
                        <td style={{ ...CELL_STICKY(curL.CLIENT, curCol.CLIENT), textAlign:'left', paddingLeft: isMobile ? 4 : 8, paddingRight: isMobile ? 4 : 6, boxShadow: isMobile ? '2px 0 6px -2px rgba(0,0,0,0.12)' : undefined }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:3 }}>
                            <span
                              style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:700, fontSize: isMobile ? 10 : 11 }}
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
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0 cursor-pointer"
                              title={`Delete ${name} from tracker`}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                        <td style={isMobile ? { ...CELL_BASE, width: curCol.PLAN, minWidth: curCol.PLAN, maxWidth: curCol.PLAN } : CELL_STICKY(curL.PLAN, curCol.PLAN)}>
                          <EditablePlan value={row[planField]} placeholder={planPH} onSave={v => handleMetaSave(rowIdx, planField, v)}/>
                        </td>
                        {dayHeaders.map(({d, sun, isToday}) => {
                          const cell = row.days.find(dc => dc.day===d) || {};
                          return (
                            <td key={d} style={{ ...DAY_CELL(sun, isToday), width: curCol.DAY, minWidth: curCol.DAY, maxWidth: curCol.DAY }}>
                              <DayCellDeliverableSlot
                                cell={cell}
                                field={labelField}
                                section={section}
                                onSaveLabel={v => handleLabelSave(rowIdx, d, labelField, v)}
                                onOpenDrawer={() => handleOpenDayDrawer(rowIdx, d)}
                              />
                            </td>
                          );
                        })}
                        <td style={isMobile
                          ? { ...CELL_BASE, width: curCol.DONE, minWidth: curCol.DONE, maxWidth: curCol.DONE }
                          : { ...CELL_STICKY('auto', curCol.DONE), right:0, left:'auto', zIndex:15, background:'hsl(var(--card))', boxShadow:'-2px 0 6px -2px rgba(0,0,0,0.08)' }
                        }>
                          <div style={{ fontWeight:800, fontSize:10, fontVariantNumeric:'tabular-nums' }}>{done}/{total}</div>
                          <div style={{ marginTop:2, height:4, background:'hsl(var(--secondary))', borderRadius:4, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:pctColor, borderRadius:4, transition:'width 0.3s' }}/>
                          </div>
                        </td>
                      </tr>

                      {/* Status row */}
                      <tr style={{ borderBottom:'2px solid hsl(var(--border))' }}>
                        <td style={STATUS_CELL_STICKY(curL.NO, curCol.NO)}/>
                        <td style={isMobile ? { ...CELL_BASE, width: curCol.TEAM, minWidth: curCol.TEAM, maxWidth: curCol.TEAM, background:'hsl(var(--secondary))' } : STATUS_CELL_STICKY(curL.TEAM, curCol.TEAM)}/>
                        <td style={{ ...STATUS_CELL_STICKY(curL.CLIENT, curCol.CLIENT), textAlign:'left', paddingLeft: isMobile ? 4 : 8, boxShadow: isMobile ? '2px 0 6px -2px rgba(0,0,0,0.12)' : undefined }}>
                          <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', color:'hsl(var(--muted-foreground))', whiteSpace:'nowrap' }}>
                            {statusRowLbl}
                          </span>
                        </td>
                        <td style={isMobile ? { ...CELL_BASE, width: curCol.PLAN, minWidth: curCol.PLAN, maxWidth: curCol.PLAN, background:'hsl(var(--secondary))' } : STATUS_CELL_STICKY(curL.PLAN, curCol.PLAN)}/>
                        {dayHeaders.map(({d, sun, isToday}) => {
                          const cell = row.days.find(dc => dc.day===d) || {};
                          const rawSt = cell[statusField] || 'todo';
                          const st = resolveCellStatus(rawSt, cell[labelField], d, month, year);
                          const relevantItems = Array.isArray(cell.items)
                            ? (section === 'stories'
                                ? cell.items.filter((it) => it.type === 'story')
                                : cell.items.filter((it) => ['reel', 'post', 'video', 'carousel'].includes(it.type)))
                            : [];
                          return (
                            <td key={d} style={{ ...STATUS_DAY_CELL(sun, isToday), width: curCol.DAY, minWidth: curCol.DAY, maxWidth: curCol.DAY }}>
                              <StatusBadge
                                status={st}
                                items={relevantItems}
                                onClick={() => handleStatusToggle(rowIdx, d, statusField)}
                                onSelectStatus={(newSt) => handleStatusSet(rowIdx, d, statusField, newSt)}
                                onOpenDrawer={() => handleOpenDayDrawer(rowIdx, d)}
                              />
                            </td>
                          );
                        })}
                        <td style={isMobile
                          ? { ...CELL_BASE, width: curCol.DONE, minWidth: curCol.DONE, maxWidth: curCol.DONE, background:'hsl(var(--secondary))' }
                          : { ...STATUS_CELL_STICKY('auto', curCol.DONE), right:0, left:'auto', zIndex:15, background:'hsl(var(--secondary))', boxShadow:'-2px 0 6px -2px rgba(0,0,0,0.08)' }
                        }/>
                      </tr>

                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 flex items-center justify-between bg-muted/20 gap-3 flex-wrap">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {rows.length} clients &nbsp;•&nbsp; {daysInMonth} days &nbsp;•&nbsp; {MONTHS[month-1]} {year}
            </span>
            <div className="flex items-center gap-4 text-[11px] font-semibold flex-wrap tabular-nums">
              <span className="inline-flex items-center gap-1 text-foreground">
                <ListTodo size={12} />
                <span>Todo: {rows.reduce((a,r)=>a+r.days.filter(d=>resolveCellStatus(d[statusField], d[labelField], d.day, month, year)==='todo').length, 0)}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-foreground">
                <Clock size={12} />
                <span>Pending: {rows.reduce((a,r)=>a+r.days.filter(d=>resolveCellStatus(d[statusField], d[labelField], d.day, month, year)==='pending').length, 0)}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-foreground font-bold">
                <CheckCircle2 size={12} />
                <span>Done: {rows.reduce((a,r)=>a+r.days.filter(d=>d[statusField]==='done').length, 0)}</span>
              </span>
              <span className="text-muted-foreground">
                Skip: {rows.reduce((a,r)=>a+r.days.filter(d=>d[statusField]==='skip').length, 0)}
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

      {/* ── Add Client Side Drawer ── */}
      <Dialog
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setDetectedContent(null);
        }}
      >
        <DialogContent
          variant="side"
          size="md"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card "
        >
          <DialogHeader className="px-5 py-4 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Plus size={18} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                  Add Client to Tracker
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Select from added clients or auto-sync content
                </DialogDescription>
              </div>
            </div>
            <DialogClose
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer shrink-0"
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleCreateClientTracker} className="flex flex-col flex-1 min-h-0 overflow-hidden text-left">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-7 space-y-5 custom-scrollbar">
              {/* Client Selection Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Choose Client *
                </label>
                <select
                  value={newClient.isCustom ? '__custom__' : newClient.clientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="app-select w-full"
                >
                  <option value="">-- Select Client from Added Clients --</option>
                  {availableClients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName || c.company || c.name}
                    </option>
                  ))}
                  <option value="__custom__">+ Add New Client Manually...</option>
                </select>
              </div>

              {/* Manual Name Input if Custom */}
              {newClient.isCustom && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">New Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ACME CORP"
                    value={newClient.companyName}
                    onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                    className="app-input w-full"
                  />
                </div>
              )}

              {/* Auto-detected Content Badge */}
              {loadingContent ? (
                <div className="bg-muted/40 rounded-xl p-3 text-xs flex items-center gap-2 text-muted-foreground">
                  <RefreshCw size={14} className="animate-spin text-foreground" />
                  <span>Checking Content module for scheduled Reels, Posts & Stories…</span>
                </div>
              ) : detectedContent?.total > 0 ? (
                <div className="bg-secondary/60 rounded-xl p-3 text-xs text-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Sparkles size={14} className="text-foreground" />
                    Auto-detected from Content Module ({MONTHS[month-1]} {year})
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Found <strong className="text-foreground">{detectedContent.reels} Reels</strong>, <strong className="text-foreground">{detectedContent.posts} Posts</strong>, and <strong className="text-foreground">{detectedContent.stories} Stories</strong>. Quotas and day upload schedules have been automatically filled!
                  </p>
                </div>
              ) : newClient.clientId ? (
                <div className="bg-muted/30 rounded-xl p-2.5 text-xs text-muted-foreground">
                  No scheduled items in Content module yet for {MONTHS[month-1]} {year}. Using default targets below.
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Team</label>
                  <input
                    type="text"
                    value={newClient.team}
                    onChange={(e) => setNewClient({ ...newClient, team: e.target.value })}
                    className="app-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Stories Quota</label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={newClient.stories}
                    onChange={(e) => setNewClient({ ...newClient, stories: parseInt(e.target.value) || 0 })}
                    className="app-input w-full tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Reels Target</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newClient.reels}
                    onChange={(e) => setNewClient({ ...newClient, reels: parseInt(e.target.value) || 0 })}
                    className="app-input w-full tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Posts Target</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newClient.posts}
                    onChange={(e) => setNewClient({ ...newClient, posts: parseInt(e.target.value) || 0 })}
                    className="app-input w-full tabular-nums"
                  />
                </div>
              </div>

              <div className="bg-muted/40 rounded-xl p-3 text-sm flex items-center justify-between text-muted-foreground">
                <span>Computed Plan:</span>
                <span className="font-bold text-foreground tabular-nums">{newClient.reels}R + {newClient.posts}P &bull; {newClient.stories} Stories</span>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2.5 px-6 py-4 bg-card">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setDetectedContent(null);
                }}
                className="h-11 px-5 text-sm font-semibold rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (!newClient.companyName && !newClient.clientId)}
                className="h-11 px-6 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Adding...' : 'Add to Tracker'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* ── Delete Client Confirmation Modal ── */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 ">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-secondary text-foreground shrink-0">
                  <Trash2 size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-foreground truncate">Remove Client from Tracker</h3>
                </div>
              </div>
              <button
                disabled={deleting}
                onClick={() => setClientToDelete(null)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Client Badge */}
            <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Selected Client:</span>
              <span className="font-black text-foreground text-sm">
                {clientToDelete.client?.companyName || 'Unknown Client'}
              </span>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              <label
                onClick={() => setDeleteMode('month')}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  deleteMode === 'month'
                    ? ' bg-brand/10 ring-1 ring-brand'
                    : ' bg-card hover:bg-secondary/50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'month'}
                  onChange={() => setDeleteMode('month')}
                  className="mt-0.5 text-primary focus:ring-brand/40"
                />
                <div className="text-xs font-semibold text-foreground">
                  Remove from {MONTHS[month - 1]} {year} only
                </div>
              </label>

              <label
                onClick={() => setDeleteMode('permanent')}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  deleteMode === 'permanent'
                    ? ' bg-brand/10 ring-1 ring-brand'
                    : ' bg-card hover:bg-secondary/50'
                }`}
              >
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'permanent'}
                  onChange={() => setDeleteMode('permanent')}
                  className="mt-0.5 text-primary focus:ring-brand/40"
                />
                <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Delete client permanently
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 ">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteClient}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
      {/* ── Day Deliverables Breakdown & Multi-Add Drawer ── */}
      <TrackerDayDeliverablesDrawer
        isOpen={drawerState.isOpen}
        onClose={() => setDrawerState((prev) => ({ ...prev, isOpen: false }))}
        client={drawerState.client}
        dayNumber={drawerState.dayNumber}
        monthName={MONTHS[month - 1]}
        year={year}
        dayOfWeek={
          drawerState.dayNumber
            ? DAYS_SHORT[getDayOfWeek(year, month, drawerState.dayNumber)]
            : ''
        }
        isToday={isCurrentMonth && drawerState.dayNumber === currentDayNumber}
        dayCell={drawerState.dayCell}
        trackerId={drawerState.trackerId}
        onSaveCell={handleSaveDayCell}
      />
    </div>
  );
};

export default SMMOnePageTracker;
