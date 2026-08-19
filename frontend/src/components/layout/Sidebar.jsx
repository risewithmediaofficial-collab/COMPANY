import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  Users2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  FileText,
  Clock,
  MessageSquare,
  BarChart3,
  Award,
  IndianRupee,
  Download,
  Palette,
  Receipt,
  HeadphonesIcon,
  BookOpen,
  Calendar,
  KeyRound,
  PhoneCall,
  Globe2,
  ClipboardList,
  Sparkles,
  StickyNote,
  Share2,
  Star,
  Search,
  FolderKanban,
  Target,
  UserCheck,
  Video,
  Plus,
  Compass,
  X
} from 'lucide-react';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const badgePaths = {
  'Portal Manager': 'accessRequests',
  'Users': 'pendingUsers',
  'User Directory': 'pendingUsers',
};

const SECTIONS_STORAGE_KEY = 'rwm_sidebar_open_sections_v3';
const PINNED_STORAGE_KEY = 'rwm_sidebar_pinned_v2';

export default function Sidebar({ onOpenSearch }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pinnedPaths, setPinnedPaths] = useState(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['/tasks', '/calendar'];
    } catch {
      return ['/tasks', '/calendar'];
    }
  });

  // Track open sections: by default only user-expanded or active sections are open
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = localStorage.getItem(SECTIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const canViewBadges = ['superAdmin', 'manager'].includes(user?.role);
  const { data: badgeCounts } = useSidebarBadges(canViewBadges);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (sectionTitle) => {
    setOpenSections((prev) => {
      const isCurrentlyOpen = Boolean(prev[sectionTitle]);
      const updated = { ...prev, [sectionTitle]: !isCurrentlyOpen };
      localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const togglePin = (e, path) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedPaths((prev) => {
      const updated = prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [...prev, path];
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const role = user?.role || 'employee';
  const p = user?.permissions || {};

  // Build hierarchical workspace navigation per role
  const getNavSections = () => {
    if (role === 'client') {
      return [
        {
          title: 'CLIENT PORTAL',
          items: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
            { name: 'Proposals', icon: FileText, path: '/client/proposals' },
            { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
            { name: 'Content Calendar', icon: Calendar, path: '/calendar' },
            { name: 'Reports', icon: BarChart3, path: '/portal/reports' },
            { name: 'Downloads', icon: Download, path: '/portal/downloads' },
            { name: 'Brand Assets', icon: Palette, path: '/portal/assets' },
            { name: 'Invoices', icon: Receipt, path: '/finance' },
            { name: 'Support', icon: HeadphonesIcon, path: '/portal/support' },
            { name: 'Guidelines', icon: BookOpen, path: '/portal/guidelines' },
          ],
        },
      ];
    }

    if (role === 'referral') {
      return [
        {
          title: 'PARTNER PORTAL',
          items: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
            { name: 'Leads & Pipeline', icon: TrendingUp, path: '/crm/leads' },
            { name: 'Content Calendar', icon: Calendar, path: '/calendar' },
            { name: 'Earnings & Rewards', icon: Award, path: '/referral' },
          ],
        },
      ];
    }

    if (role === 'employee') {
      const employeeDelivery = [
        { name: 'My Tasks', icon: CheckSquare, path: '/tasks' },
        { name: 'Daily Calendar', icon: Calendar, path: '/daily-tasks' },
        { name: 'Pending Notes', icon: StickyNote, path: '/pending-notes' },
        { name: 'Client Vault', icon: KeyRound, path: '/client-vault' },
      ];
      if (p.canAccessSmm) {
        employeeDelivery.unshift({ name: 'Content OS', icon: Share2, path: '/smm' });
      }

      return [
        {
          title: 'COMMAND CENTER',
          items: [
            { name: 'Overview', icon: LayoutDashboard, path: '/' },
          ],
        },
        {
          title: 'DELIVERY / WORK',
          items: employeeDelivery,
        },
        {
          title: 'TEAM & WORKLOAD',
          items: [
            { name: 'Attendance & EOD', icon: Clock, path: '/attendance' },
          ],
        },
        {
          title: 'KNOWLEDGE',
          items: [
            { name: 'SOP Dashboard', icon: BookOpen, path: '/sop' },
          ],
        },
      ];
    }

    // superAdmin, admin, manager
    const sections = [
      {
        title: 'COMMAND CENTER',
        items: [
          { name: 'Overview', icon: LayoutDashboard, path: '/' },
        ],
      },
      {
        title: 'GROWTH & SALES',
        items: [
          { name: 'CRM & Leads', icon: TrendingUp, path: '/crm/leads' },
          { name: 'Proposals', icon: FileText, path: '/proposals' },
          { name: 'Social & Ads OS', icon: Share2, path: '/smm' },
          { name: 'Referral Hub', icon: Award, path: '/referral' },
        ],
      },
      {
        title: 'CLIENT LIFECYCLE',
        items: [
          { name: 'Clients 360', icon: Users, path: '/clients' },
          { name: 'Client Follow-ups', icon: PhoneCall, path: '/client-followups' },
          ...(role !== 'employee' ? [{ name: 'Client Vault', icon: KeyRound, path: '/client-vault' }] : []),
        ],
      },
      {
        title: 'DELIVERY / FULFILLMENT',
        items: [
          { name: 'Projects', icon: Briefcase, path: '/projects' },
          { name: role === 'manager' ? 'Manager Tasks' : 'Tasks Database', icon: CheckSquare, path: role === 'manager' ? '/manager-tasks' : '/tasks' },
          { name: 'Content Calendar', icon: Calendar, path: '/calendar' },
          { name: 'Shoots & DM Calendar', icon: Video, path: '/dm-calendar' },
          { name: 'Influencer Hub', icon: Sparkles, path: '/influencers' },
          { name: 'Manager Board', icon: ClipboardList, path: '/manager-board' },
          { name: 'Pending Notes', icon: StickyNote, path: '/pending-notes' },
        ],
      },
      {
        title: 'BUSINESS & FINANCE',
        items: [
          { name: 'Finance Status', icon: IndianRupee, path: '/finance' },
          { name: 'Call History', icon: PhoneCall, path: '/call-history' },
          { name: 'Domain Renewals', icon: Globe2, path: '/domain-renewals' },
        ],
      },
      {
        title: 'TEAM & WORKLOAD',
        items: [
          { name: 'Attendance & EOD', icon: Clock, path: '/attendance' },
          ...(role === 'superAdmin' || role === 'admin' ? [
            { name: 'HR & Hiring', icon: Users2, path: '/hr' },
            { name: 'User Directory', icon: UserCheck, path: '/admin/users' },
            { name: 'Manager Assignments', icon: CheckSquare, path: '/admin/manager-assignments' },
          ] : [
            { name: 'HR & Hiring', icon: Users2, path: '/hr' },
          ]),
        ],
      },
      {
        title: 'KNOWLEDGE & ASSETS',
        items: [
          { name: 'SOP Library', icon: BookOpen, path: '/sop' },
          { name: 'Asset Library', icon: Palette, path: '/assets' },
        ],
      },
      {
        title: 'SYSTEM & SETTINGS',
        items: [
          { name: 'Reports & Analytics', icon: BarChart3, path: '/reports' },
          { name: 'Settings', icon: Settings, path: '/settings' },
        ],
      },
    ];

    return sections;
  };

  const navSections = getNavSections();

  // Extract all available items for pinned lookup
  const allItems = navSections.flatMap((s) => s.items);
  const pinnedItems = allItems.filter((item) => pinnedPaths.includes(item.path));

  const sidebarVariants = {
    mobile: {
      width: 270,
      x: sidebarOpen ? 0 : -270,
    },
    desktop: {
      width: sidebarOpen ? 260 : 72,
      x: 0,
    },
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => dispatch(toggleSidebar())}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}

      <motion.aside
        initial={false}
        animate={isMobile ? sidebarVariants.mobile : sidebarVariants.desktop}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-screen bg-card border-r border-border z-50 flex flex-col shadow-xl select-none"
      >
        {/* Workspace Brand / Header */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-background border border-border/80 p-1 shadow-sm">
              <img
                src="/branding/rise-with-media-logo.png"
                alt="RWM logo"
                className="h-full w-full object-contain"
              />
            </div>
            {(sidebarOpen || isMobile) && (
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-black tracking-tight text-foreground">
                  RiseWithMedia
                </span>
                <span className="truncate text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Agency OS
                </span>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Close Navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Workspace Switcher */}
        {sidebarOpen && (
          <div className="border-b border-border/60">
            <WorkspaceSwitcher sidebarOpen={sidebarOpen} />
          </div>
        )}

        {/* Navigation Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 custom-scrollbar">
          {/* Quick Search Shortcut */}
          {(sidebarOpen || isMobile) ? (
            <button
              onClick={() => onOpenSearch && onOpenSearch()}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-border/80 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all text-xs font-medium"
            >
              <span className="flex items-center gap-2">
                <Search size={14} className="text-muted-foreground" />
                <span>Quick Search...</span>
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          ) : (
            <button
              onClick={() => onOpenSearch && onOpenSearch()}
              className="w-full flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Search (Cmd+K)"
            >
              <Search size={18} />
            </button>
          )}

          {/* Pinned / Favorites Section */}
          {pinnedItems.length > 0 && (
            <div className="space-y-0.5">
              {(sidebarOpen || isMobile) && (
                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 flex items-center gap-1.5">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span>Favorites</span>
                </div>
              )}
              {pinnedItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={`pinned-${item.path}`}
                    to={item.path}
                    onClick={() => isMobile && dispatch(toggleSidebar())}
                    className={`group relative flex items-center px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <item.icon size={16} className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    {(sidebarOpen || isMobile) && (
                      <>
                        <span className="ml-2.5 truncate flex-1">{item.name}</span>
                        <button
                          type="button"
                          onClick={(e) => togglePin(e, item.path)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
                          title="Unpin from favorites"
                        >
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                        </button>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Workspace Hierarchical Sections */}
          {navSections.map((section) => {
            const hasActiveRoute = section.items.some((item) => item.path === location.pathname);
            // Default to closed unless explicitly opened by user or contains active route
            const isOpen = openSections[section.title] !== undefined
              ? Boolean(openSections[section.title])
              : hasActiveRoute;

            return (
              <div key={section.title} className="space-y-0.5">
                {(sidebarOpen || isMobile) && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40 rounded-lg transition-colors group"
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                )}

                {/* Section Items (Collapsible on Desktop/Mobile) */}
                <div className={`${(sidebarOpen || isMobile) && !isOpen ? 'hidden' : 'space-y-0.5'}`}>
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    const badgeKey = badgePaths[item.name];
                    const count = badgeKey ? badgeCounts?.[badgeKey] || 0 : 0;
                    const isPinned = pinnedPaths.includes(item.path);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => isMobile && dispatch(toggleSidebar())}
                        title={!sidebarOpen && !isMobile ? item.name : undefined}
                        className={`group relative flex items-center px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <div className="relative shrink-0 flex items-center justify-center">
                          <item.icon
                            size={16}
                            className={`${
                              isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                            } transition-transform group-hover:scale-105`}
                          />
                          {!sidebarOpen && !isMobile && count > 0 && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                          )}
                        </div>

                        {(sidebarOpen || isMobile) && (
                          <>
                            <span className="ml-2.5 truncate flex-1">{item.name}</span>

                            {/* Badge count if pending */}
                            {count > 0 && (
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                              }`}>
                                {count}
                              </span>
                            )}

                            {/* Pin / Star Toggle Icon */}
                            <button
                              type="button"
                              onClick={(e) => togglePin(e, item.path)}
                              className={`p-0.5 transition-opacity ${
                                isPinned ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-400'
                              }`}
                              title={isPinned ? 'Unpin from favorites' : 'Pin to favorites'}
                            >
                              <Star size={12} className={isPinned ? 'fill-amber-400' : ''} />
                            </button>
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer / Settings & Collapse Toggle */}
        <div className="p-2.5 border-t border-border bg-card shrink-0 space-y-1">
          <Link
            to="/settings"
            onClick={() => isMobile && dispatch(toggleSidebar())}
            className={`flex items-center px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              location.pathname === '/settings'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Settings size={16} />
            {(sidebarOpen || isMobile) && <span className="ml-2.5">Settings</span>}
          </Link>

          {!isMobile && (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="w-full flex items-center justify-center p-1.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-xs"
              title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              {sidebarOpen ? (
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <ChevronLeft size={14} />
                  <span>Collapse</span>
                </div>
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}

