import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, BarChart3, Download,
  Palette, Receipt, HeadphonesIcon, BookOpen, Bell, Moon, Sun,
  Menu, X, ChevronRight, LogOut, Settings, User, IndianRupee
} from 'lucide-react';
import PortalDashboard from './sections/PortalDashboard';
import ContentCalendarView from './sections/ContentCalendarView';
import PortalReports from './sections/PortalReports';
import PortalDownloads from './sections/PortalDownloads';
import BrandAssets from './sections/BrandAssets';
import PortalInvoices from './sections/PortalInvoices';
import PortalSupport from './sections/PortalSupport';
import PortalGuidelines from './sections/PortalGuidelines';
import PortalAdBudget from './sections/PortalAdBudget';

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard, color: '#6366f1' },
  { id: 'budget',     label: 'Ad Budget',        icon: IndianRupee,      color: '#10b981' },
  { id: 'calendar',   label: 'Content Calendar', icon: Calendar,         color: '#10b981' },
  { id: 'reports',    label: 'Reports',          icon: BarChart3,        color: '#3b82f6' },
  { id: 'downloads',  label: 'Downloads',        icon: Download,         color: '#8b5cf6' },
  { id: 'assets',     label: 'Brand Assets',     icon: Palette,          color: '#ec4899' },
  { id: 'invoices',   label: 'Invoices',         icon: Receipt,          color: '#14b8a6' },
  { id: 'support',    label: 'Support',          icon: HeadphonesIcon,   color: '#f97316' },
  { id: 'guidelines', label: 'Guidelines',       icon: BookOpen,         color: '#64748b' },
];

const SECTION_MAP = {
  dashboard:  PortalDashboard,
  budget:     PortalAdBudget,
  calendar:   ContentCalendarView,
  reports:    PortalReports,
  downloads:  PortalDownloads,
  assets:     BrandAssets,
  invoices:   PortalInvoices,
  support:    PortalSupport,
  guidelines: PortalGuidelines,
};

export default function ClientPortal() {
  const { user } = useSelector((s) => s.auth);
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dark, setDark] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const ActiveSection = SECTION_MAP[active] || PortalDashboard;

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? 'portal-dark' : 'portal-light'}`}
         style={{ background: dark ? '#0a0a14' : '#f1f5f9' }}>

      {/* ── Sidebar ───────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative flex flex-col shrink-0 z-30"
            style={{
              width: 260,
              background: dark
                ? 'linear-gradient(180deg, #0f0f23 0%, #12122a 100%)'
                : 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
              borderRight: '1px solid rgba(99,102,241,0.15)',
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <span className="text-white font-black text-sm">CP</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">Client Portal</p>
                <p className="text-indigo-300 text-[10px] mt-0.5">Agency OS</p>
              </div>
            </div>

            {/* User Card */}
            <div className="mx-3 mt-4 mb-2 rounded-xl p-3"
                 style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                  {user?.name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{user?.name || 'Client'}</p>
                  <p className="text-indigo-300 text-[10px] truncate">{user?.email || ''}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <p className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest px-5 pt-3 pb-1">
              Client Menu
            </p>
            <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActive(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left relative"
                    style={{
                      background: isActive ? `${item.color}22` : 'transparent',
                      border: isActive ? `1px solid ${item.color}40` : '1px solid transparent',
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                         style={{ background: isActive ? `${item.color}33` : 'rgba(255,255,255,0.05)' }}>
                      <Icon size={14} style={{ color: isActive ? item.color : '#94a3b8' }} />
                    </div>
                    <span className="text-xs font-medium flex-1"
                          style={{ color: isActive ? '#fff' : '#94a3b8' }}>
                      {item.label}
                    </span>
                    {item.badge && pendingCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                            style={{ background: '#f59e0b' }}>
                        {pendingCount}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight size={12} style={{ color: item.color }} />
                    )}
                  </motion.button>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="border-t border-white/10 p-3 space-y-1">
              <button onClick={() => setDark(!dark)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs">
                {dark ? <Sun size={14} /> : <Moon size={14} />}
                <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-5 py-3 shrink-0"
                style={{
                  background: dark ? 'rgba(10,10,20,0.9)' : 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(12px)',
                  borderBottom: dark ? '1px solid rgba(99,102,241,0.15)' : '1px solid rgba(0,0,0,0.08)',
                }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all">
            {sidebarOpen ? <X size={18} className={dark ? 'text-slate-400' : 'text-slate-600'} />
                         : <Menu size={18} className={dark ? 'text-slate-400' : 'text-slate-600'} />}
          </button>

          <div className="flex-1">
            <h1 className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
              {NAV_ITEMS.find(n => n.id === active)?.label || 'Dashboard'}
            </h1>
            <p className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <button className="relative p-2 rounded-lg hover:bg-white/10 transition-all">
            <Bell size={16} className={dark ? 'text-slate-400' : 'text-slate-600'} />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />
            )}
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ActiveSection
                dark={dark}
                user={user}
                setPendingCount={setPendingCount}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
