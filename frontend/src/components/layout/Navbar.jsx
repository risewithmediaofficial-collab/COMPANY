import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellRing,
  Bell,
  BellOff,
  Search,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  Menu,
  Plus,
  ChevronRight,
  CheckSquare,
  Briefcase,
  Users,
  TrendingUp,
  Sparkles,
  Smartphone,
  Activity
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toggleDarkMode, toggleSidebar } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import api from '../../api';
import { getAssetUrl } from '../../utils/assetUrl';
import {
  subscribeToWebPush,
  unsubscribeFromWebPush,
  sendTestPushNotification,
  getExistingPushSubscription,
  getWebPushPermission,
  isWebPushSupported,
  isIOSRequiresHomeInstall,
  reconcilePushSubscription,
} from '../../utils/webPush';
import {
  triggerBannerNotification,
  sendBrowserNotification,
  requestBrowserNotificationPermission,
} from '../../utils/browserNotification';
import { PushDiagnosticsModal } from '../modals/PushDiagnosticsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import GlobalSearchModal from '../modals/GlobalSearchModal';
import FavoritesPanel from '../modals/FavoritesPanel';
import { DateRangePicker } from '../ui/DateRangePicker';
import { AppTooltip } from '../ui/tooltip';
import { AddTaskModal } from '../modals/AddTaskModal';
import { AddProjectModal } from '../modals/AddProjectModal';
import { AddClientModal } from '../modals/AddClientModal';
import { AddLeadModal } from '../modals/AddLeadModal';

// Route path to structured breadcrumbs helper with clickable links
const getBreadcrumbs = (pathname) => {
  const path = pathname.replace(/\/$/, '') || '/';

  const exactMap = {
    '/': [{ label: 'Command Center', path: '/' }],
    '/tasks': [{ label: 'Delivery', path: '/tasks' }, { label: 'Tasks Database', path: '/tasks' }],
    '/manager-tasks': [{ label: 'Delivery', path: '/tasks' }, { label: 'Manager Tasks', path: '/manager-tasks' }],
    '/tasks/new': [{ label: 'Delivery', path: '/tasks' }, { label: 'Tasks', path: '/tasks' }, { label: 'New Task' }],
    '/projects': [{ label: 'Delivery', path: '/projects' }, { label: 'Projects', path: '/projects' }],
    '/calendar': [{ label: 'Delivery', path: '/tasks' }, { label: 'Content Calendar', path: '/calendar' }],
    '/dm-calendar': [{ label: 'Delivery', path: '/tasks' }, { label: 'Shoots & DM Calendar', path: '/dm-calendar' }],
    '/influencers': [{ label: 'Delivery', path: '/tasks' }, { label: 'Influencer Hub', path: '/influencers' }],
    '/manager-board': [{ label: 'Delivery', path: '/tasks' }, { label: 'Manager Board', path: '/manager-board' }],
    '/pending-notes': [{ label: 'Delivery', path: '/tasks' }, { label: 'Pending Notes', path: '/pending-notes' }],
    '/notes': [{ label: 'Delivery', path: '/tasks' }, { label: 'Pending Notes', path: '/pending-notes' }],
    '/task-notes': [{ label: 'Delivery', path: '/tasks' }, { label: 'Pending Notes', path: '/pending-notes' }],
    '/daily-tasks': [{ label: 'Delivery', path: '/tasks' }, { label: 'Daily Calendar', path: '/daily-tasks' }],

    '/clients': [{ label: 'Clients', path: '/clients' }, { label: 'Directory', path: '/clients' }],
    '/client-vault': [{ label: 'Clients', path: '/clients' }, { label: 'Client Vault', path: '/client-vault' }],
    '/client-followups': [{ label: 'Clients', path: '/clients' }, { label: 'Client Follow-ups', path: '/client-followups' }],

    '/crm/leads': [{ label: 'Growth', path: '/crm/leads' }, { label: 'CRM & Leads', path: '/crm/leads' }],
    '/proposals': [{ label: 'Growth', path: '/proposals' }, { label: 'Proposals', path: '/proposals' }],
    '/proposals/new': [{ label: 'Growth', path: '/proposals' }, { label: 'Proposals', path: '/proposals' }, { label: 'New Proposal' }],
    '/referral': [{ label: 'Growth', path: '/referral' }, { label: 'Referral Hub', path: '/referral' }],

    '/smm': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing OS', path: '/smm' }],
    '/smm/content': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Content', path: '/smm/content' }],
    '/smm/campaigns': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Campaigns', path: '/smm/campaigns' }],
    '/smm/leads': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'SMM Leads', path: '/smm/leads' }],
    '/smm/adsets': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Ad Sets', path: '/smm/adsets' }],
    '/smm/ads': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Ads', path: '/smm/ads' }],
    '/smm/budget': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Ad Budget', path: '/smm/budget' }],
    '/smm/creatives': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Creative Library', path: '/smm/creatives' }],
    '/smm/calendar': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'SMM Calendar', path: '/smm/calendar' }],
    '/smm/analytics': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Analytics', path: '/smm/analytics' }],
    '/smm/performance': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Performance', path: '/smm/performance' }],
    '/smm/daily-tracking': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Daily Tracking', path: '/smm/daily-tracking' }],
    '/smm/call-logs': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Call Logs', path: '/smm/call-logs' }],
    '/smm/team': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Team', path: '/smm/team' }],

    '/finance': [{ label: 'Business', path: '/finance' }, { label: 'Finance Status', path: '/finance' }],
    '/call-history': [{ label: 'Business', path: '/finance' }, { label: 'Call History', path: '/call-history' }],
    '/domain-renewals': [{ label: 'Business', path: '/domain-renewals' }, { label: 'Domain Renewals', path: '/domain-renewals' }],

    '/attendance': [{ label: 'Team', path: '/attendance' }, { label: 'Attendance & EOD', path: '/attendance' }],
    '/hr': [{ label: 'Team', path: '/hr' }, { label: 'HR & Hiring', path: '/hr' }],
    '/admin/users': [{ label: 'Team', path: '/admin/users' }, { label: 'User Directory', path: '/admin/users' }],
    '/admin/manager-assignments': [{ label: 'Delivery', path: '/tasks' }, { label: 'Manager Assignments', path: '/admin/manager-assignments' }],

    '/sop': [{ label: 'Knowledge', path: '/sop' }, { label: 'SOP Library', path: '/sop' }],
    '/assets': [{ label: 'Knowledge', path: '/assets' }, { label: 'Asset Library', path: '/assets' }],

    '/reports': [{ label: 'System', path: '/reports' }, { label: 'Reports & Analytics', path: '/reports' }],
    '/settings': [{ label: 'System', path: '/settings' }, { label: 'Settings', path: '/settings' }],

    '/client/proposals': [{ label: 'Client Portal', path: '/' }, { label: 'Proposals', path: '/client/proposals' }],
    '/portal/reports': [{ label: 'Client Portal', path: '/' }, { label: 'Reports', path: '/portal/reports' }],
    '/portal/downloads': [{ label: 'Client Portal', path: '/' }, { label: 'Downloads', path: '/portal/downloads' }],
    '/portal/assets': [{ label: 'Client Portal', path: '/' }, { label: 'Brand Assets', path: '/portal/assets' }],
    '/portal/support': [{ label: 'Client Portal', path: '/' }, { label: 'Support', path: '/portal/support' }],
    '/portal/guidelines': [{ label: 'Client Portal', path: '/' }, { label: 'Guidelines', path: '/portal/guidelines' }],
  };

  if (exactMap[path]) {
    return exactMap[path];
  }

  // Dynamic parameterized routes
  if (path.startsWith('/tasks/')) {
    return [{ label: 'Delivery', path: '/tasks' }, { label: 'Tasks', path: '/tasks' }, { label: 'Task Details' }];
  }
  if (path.startsWith('/projects/')) {
    return [{ label: 'Delivery', path: '/projects' }, { label: 'Projects', path: '/projects' }, { label: 'Project Details' }];
  }
  if (path.startsWith('/clients/')) {
    return [{ label: 'Clients', path: '/clients' }, { label: 'Directory', path: '/clients' }, { label: 'Client Details' }];
  }
  if (path.startsWith('/crm/leads/')) {
    return [{ label: 'Growth', path: '/crm/leads' }, { label: 'CRM & Leads', path: '/crm/leads' }, { label: 'Lead Details' }];
  }
  if (path.startsWith('/proposals/')) {
    return [{ label: 'Growth', path: '/proposals' }, { label: 'Proposals', path: '/proposals' }, { label: 'Proposal Details' }];
  }

  // Fallback: tokenize path segments
  const segments = path.split('/').filter(Boolean);
  let accumulated = '';
  return segments.map((seg, i) => {
    accumulated += `/${seg}`;
    const cleanLabel = seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      label: cleanLabel,
      path: i === segments.length - 1 ? undefined : accumulated,
    };
  });
};

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.ui);

  const [searchOpen, setSearchOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState(getWebPushPermission());
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkPush = async () => {
      setPushPermission(getWebPushPermission());
      const existing = await getExistingPushSubscription();
      if (isMounted) {
        setPushSubscribed(Boolean(existing));
      }

      // Auto-reconcile subscription in background if user already has granted permission
      if (Notification.permission === 'granted') {
        const res = await reconcilePushSubscription();
        if (isMounted && res?.success) {
          setPushSubscribed(true);
        }
      }
    };
    checkPush();

    const handlePushStateChange = () => checkPush();
    window.addEventListener('rwm-push-state-changed', handlePushStateChange);

    return () => {
      isMounted = false;
      window.removeEventListener('rwm-push-state-changed', handlePushStateChange);
    };
  }, []);

  const handleEnablePush = async () => {
    setPushLoading(true);
    try {
      const res = await requestBrowserNotificationPermission();
      const updatedPerm = res?.permission || getWebPushPermission();
      setPushPermission(updatedPerm);
      if (res?.success || updatedPerm === 'granted') {
        setPushSubscribed(true);
        window.dispatchEvent(new CustomEvent('rwm-push-state-changed', { detail: { active: true } }));
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    try {
      // 1. In-App Floating Banner
      triggerBannerNotification({
        title: '🔔 Banner Notifications Verified!',
        message: 'Interactive in-app floating banner and system alerts are functioning correctly.',
        link: '/settings',
        type: 'success',
      });

      // 2. Direct browser OS banner notification
      await sendBrowserNotification({
        title: '🔔 Banner Notification Active!',
        message: 'Rise With Media CRM desktop alerts are connected.',
        link: '/settings',
      });

      // 3. Background Web Push (if subscribed)
      if (pushSubscribed) {
        await sendTestPushNotification(0);
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleLogout = async () => {
    dispatch(logout());
    navigate('/login');
  };

  // Quick Create Modals
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  const { data: notificationData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications', { params: { limit: 20, unreadOnly: true } });
      return response.data;
    },
    refetchInterval: 30000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.put('/notifications/mark-all-read'),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], {
        notifications: [],
        unreadCount: 0,
        success: true,
      });
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markNotificationRead = useMutation({
    mutationFn: async (id) => api.put(`/notifications/${id}/read`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      if (previous) {
        const remaining = (previous.notifications || []).filter((n) => n._id !== id);
        queryClient.setQueryData(['notifications'], {
          ...previous,
          notifications: remaining,
          unreadCount: Math.max(0, (previous.unreadCount || 1) - 1),
        });
      }
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute structured dynamic breadcrumbs
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const canCreate = ['superAdmin', 'admin', 'manager'].includes(user?.role);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 min-w-0 items-center justify-between border-b border-border bg-card/90 px-3.5 backdrop-blur-md sm:px-5 select-none">
        {/* Left: Mobile Toggle & Dynamic Interactive Breadcrumbs */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 -ml-1 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground md:hidden flex-shrink-0"
            title="Toggle Navigation"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb Navigation with Clickable Links */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
            <Link
              to="/"
              className="font-bold text-foreground/80 hover:text-foreground transition-colors hidden sm:inline truncate"
            >
              RiseWithMedia
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={idx} className="flex items-center gap-1.5 min-w-0">
                  <ChevronRight size={12} className="text-muted-foreground/60 shrink-0" />
                  {crumb.path && !isLast ? (
                    <Link
                      to={crumb.path}
                      className="truncate text-muted-foreground hover:text-foreground transition-colors max-w-[120px] sm:max-w-[160px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={`truncate max-w-[140px] sm:max-w-[200px] ${
                        isLast ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground transition-colors'
                      }`}
                    >
                      {crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        </div>

        {/* Center/Right: Quick Search Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <AppTooltip content="Search Workspace (Ctrl+K / Cmd+K)">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border/80 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-xs"
              title="Search Workspace (Cmd+K)"
            >
              <Search size={14} />
              <span className="text-xs text-muted-foreground">Search...</span>
              <kbd className="px-1.5 py-0.2 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          </AppTooltip>

          {/* Quick Create Action Dropdown (+ New) */}
          {canCreate && (
            <DropdownMenu>
              <AppTooltip content="Quick Create Task, Project, Client, or Lead">
                <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm transition-all">
                  <Plus size={14} className="stroke-[2.5]" />
                  <span className="hidden sm:inline">New</span>
                </DropdownMenuTrigger>
              </AppTooltip>
              <DropdownMenuContent align="end" className="w-48 mt-2">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setCreateTaskOpen(true)}>
                  <CheckSquare size={14} className="text-primary" />
                  <span>Create Task</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setCreateProjectOpen(true)}>
                  <Briefcase size={14} className="text-primary" />
                  <span>Create Project</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setCreateClientOpen(true)}>
                  <Users size={14} className="text-primary" />
                  <span>Add Client</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setCreateLeadOpen(true)}>
                  <TrendingUp size={14} className="text-primary" />
                  <span>Add Lead</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Global Date Filter in Navbar */}
          <div className="hidden lg:flex items-center">
            <DateRangePicker compact />
          </div>

          {/* Favorites Panel */}
          <FavoritesPanel />

          {/* Theme Toggle */}
          <AppTooltip content={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}>
            <button
              onClick={() => dispatch(toggleDarkMode())}
              className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </AppTooltip>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <AppTooltip content="Notifications & Activity Alerts">
              <DropdownMenuTrigger className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground relative">
                <Bell size={17} />
                {(notificationData?.unreadCount > 0 || (notificationData?.notifications || []).filter((n) => !n.isRead).length > 0) && (
                  <span className="absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-0.5 bg-primary text-white rounded-full border border-card text-[9px] font-bold flex items-center justify-center">
                    {Math.min(notificationData?.unreadCount ?? (notificationData?.notifications || []).filter((n) => !n.isRead).length, 9)}
                  </span>
                )}
              </DropdownMenuTrigger>
            </AppTooltip>
            <DropdownMenuContent align="end" className="w-80 mt-2 p-0 overflow-hidden">
              {(() => {
                const unreadNotifications = (notificationData?.notifications || []).filter((n) => !n.isRead);
                return (
                  <>
                    <DropdownMenuLabel className="flex items-center justify-between text-xs px-3.5 py-2.5 border-b border-border bg-card">
                      <span className="font-bold text-foreground">Notifications</span>
                      {unreadNotifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllRead.mutate()}
                          disabled={markAllRead.isPending}
                          className="text-[11px] text-primary font-bold hover:underline cursor-pointer disabled:opacity-50"
                        >
                          Mark all read
                        </button>
                      )}
                    </DropdownMenuLabel>

                    {/* Web Push Setup only if permission not yet decided or denied */}
                    {isIOSRequiresHomeInstall() ? (
                      <div className="m-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                          <Smartphone size={13} className="shrink-0" />
                          <span>iPhone / iPad Setup</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Tap Share → <strong>Add to Home Screen</strong> to enable background alerts.
                        </p>
                      </div>
                    ) : pushPermission === 'denied' ? (
                      <div className="m-2 p-2 bg-destructive/10 border border-destructive/20 rounded-xl text-xs flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-destructive font-semibold text-[11px]">
                          <BellOff size={13} className="shrink-0" />
                          <span>Notifications Blocked</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Permission denied in browser address bar.
                        </p>
                      </div>
                    ) : !pushSubscribed && pushPermission !== 'granted' ? (
                      <div className="m-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs flex items-center justify-between gap-2">
                        <span className="text-foreground flex items-center gap-1.5 font-medium text-[11px]">
                          <BellRing size={13} className="text-indigo-500 shrink-0" />
                          Banner Alerts
                        </span>
                        <button
                          id="enable-web-push-btn"
                          onClick={handleEnablePush}
                          disabled={pushLoading}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-[10px] transition-all shrink-0 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {pushLoading ? 'Enabling...' : 'Enable Banners'}
                        </button>
                      </div>
                    ) : null}

                    {/* Unread Notifications List */}
                    {unreadNotifications.length === 0 ? (
                      <div className="px-3 py-8 text-center space-y-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold text-sm mb-1.5">
                          ✓
                        </div>
                        <p className="text-xs font-bold text-foreground">All caught up!</p>
                        <p className="text-[11px] text-muted-foreground">No unread notifications.</p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                        {unreadNotifications.map((notification) => (
                          <DropdownMenuItem key={notification._id} asChild>
                            <Link
                              to={notification.link || '/'}
                              onClick={() => markNotificationRead.mutate(notification._id)}
                              className="flex flex-col items-start gap-1 p-3 hover:bg-secondary/70 transition-colors cursor-pointer rounded-none"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-bold text-foreground">{notification.title}</span>
                                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                              </div>
                              <span className="text-[11px] text-muted-foreground leading-snug">{notification.message}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 hover:bg-secondary transition-colors focus:outline-none">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm">
                {user?.avatar ? (
                  <img src={getAssetUrl(user.avatar)} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 mt-2">
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold text-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer gap-2" asChild>
                <Link to="/settings">
                  <User size={14} />
                  <span>Profile & Account</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" asChild>
                <Link to="/settings">
                  <Settings size={14} />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive gap-2"
                onClick={handleLogout}
              >
                <LogOut size={14} />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Push Diagnostics & Closed-Tab Test Modal */}
      <PushDiagnosticsModal open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen} />

      {/* Global Quick Create Modals */}
      {createTaskOpen && (
        <AddTaskModal
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
        />
      )}
      {createProjectOpen && (
        <AddProjectModal
          open={createProjectOpen}
          onOpenChange={setCreateProjectOpen}
        />
      )}
      {createClientOpen && (
        <AddClientModal
          open={createClientOpen}
          onOpenChange={setCreateClientOpen}
        />
      )}
      {createLeadOpen && (
        <AddLeadModal
          open={createLeadOpen}
          onOpenChange={setCreateLeadOpen}
        />
      )}
    </>
  );
};

export default Navbar;

