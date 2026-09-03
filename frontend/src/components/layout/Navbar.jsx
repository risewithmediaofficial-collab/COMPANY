import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellRing,
  Bell,
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
  Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toggleDarkMode, toggleSidebar } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import api from '../../api';
import { getAssetUrl } from '../../utils/assetUrl';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from '../../utils/browserNotification';
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
    '/smm/performance': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Performance', path: '/smm/performance' }],
    '/smm/reports': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'SMM Reports', path: '/smm/reports' }],
    '/smm/team': [{ label: 'Growth', path: '/smm' }, { label: 'Marketing', path: '/smm' }, { label: 'Team', path: '/smm/team' }],

    '/finance': [{ label: 'Business', path: '/finance' }, { label: 'Finance Status', path: '/finance' }],
    '/call-history': [{ label: 'Business', path: '/finance' }, { label: 'Call History', path: '/call-history' }],
    '/domain-renewals': [{ label: 'Business', path: '/domain-renewals' }, { label: 'Domain Renewals', path: '/domain-renewals' }],

    '/attendance': [{ label: 'Team', path: '/attendance' }, { label: 'Attendance & EOD', path: '/attendance' }],
    '/hr': [{ label: 'Team', path: '/hr' }, { label: 'HR & Hiring', path: '/hr' }],
    '/admin/users': [{ label: 'Team', path: '/admin/users' }, { label: 'User Directory', path: '/admin/users' }],
    '/admin/manager-assignments': [{ label: 'Team', path: '/admin/users' }, { label: 'Manager Assignments', path: '/admin/manager-assignments' }],

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
  const [pushPermission, setPushPermission] = useState(getBrowserNotificationPermission());

  // Quick Create Modals
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  const { data: notificationData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications', { params: { limit: 5 } });
      return response.data;
    },
    refetchInterval: 60000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.put('/notifications/mark-all-read'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markNotificationRead = useMutation({
    mutationFn: async (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
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
      <header className="sticky top-0 z-40 flex h-14 min-w-0 items-center justify-between border-b border-border bg-card/90 px-3.5 backdrop-blur-md sm:px-5 select-none">
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
                {notificationData?.unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-0.5 bg-primary text-white rounded-full border border-card text-[9px] font-bold flex items-center justify-center">
                    {Math.min(notificationData.unreadCount, 9)}
                  </span>
                )}
              </DropdownMenuTrigger>
            </AppTooltip>
            <DropdownMenuContent align="end" className="w-80 mt-2">
              <DropdownMenuLabel className="flex items-center justify-between text-xs">
                <span>Notifications</span>
                <button onClick={() => markAllRead.mutate()} className="text-[11px] text-primary font-semibold hover:underline">
                  Mark all read
                </button>
              </DropdownMenuLabel>

              {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
                <div className="mx-2 mb-2 p-2 bg-primary/10 border border-primary/20 rounded-xl text-xs flex items-center justify-between gap-2">
                  <span className="text-foreground flex items-center gap-1.5 font-medium text-[11px]">
                    <BellRing size={13} className="text-primary shrink-0" /> Desktop Alerts
                  </span>
                  <button
                    onClick={async () => {
                      const perm = await requestBrowserNotificationPermission();
                      setPushPermission(perm);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-primary text-primary-foreground font-bold text-[10px] hover:bg-primary/90 transition-all shrink-0"
                  >
                    Enable
                  </button>
                </div>
              )}

              <DropdownMenuSeparator />
              {(notificationData?.notifications || []).length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">No new notifications.</div>
              ) : (
                notificationData.notifications.map((notification) => (
                  <DropdownMenuItem key={notification._id} asChild>
                    <Link
                      to={notification.link || '/'}
                      onClick={() => !notification.isRead && markNotificationRead.mutate(notification._id)}
                      className="flex flex-col items-start gap-0.5 whitespace-normal p-2.5"
                    >
                      <span className="text-xs font-semibold text-foreground">{notification.title}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight">{notification.message}</span>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
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
                onClick={() => dispatch(logout())}
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

