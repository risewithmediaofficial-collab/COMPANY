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
import { AddTaskModal } from '../modals/AddTaskModal';
import { AddProjectModal } from '../modals/AddProjectModal';
import { AddClientModal } from '../modals/AddClientModal';
import { AddLeadModal } from '../modals/AddLeadModal';

// Route path to breadcrumb label mapping
const ROUTE_LABELS = {
  '/': ['Command Center'],
  '/tasks': ['Delivery', 'Tasks Database'],
  '/manager-tasks': ['Delivery', 'Manager Tasks'],
  '/tasks/new': ['Delivery', 'Tasks', 'New Task'],
  '/projects': ['Delivery', 'Projects'],
  '/calendar': ['Delivery', 'Content Calendar'],
  '/dm-calendar': ['Delivery', 'Shoots & DM Calendar'],
  '/influencers': ['Delivery', 'Influencer Hub'],
  '/manager-board': ['Delivery', 'Manager Board'],
  '/pending-notes': ['Delivery', 'Pending Notes'],
  '/clients': ['Clients', 'Clients 360'],
  '/client-vault': ['Clients', 'Client Vault'],
  '/client-followups': ['Clients', 'Client Follow-ups'],
  '/crm/leads': ['Growth', 'CRM & Leads'],
  '/proposals': ['Growth', 'Proposals'],
  '/referral': ['Growth', 'Referral Hub'],
  '/smm': ['Growth', 'Marketing OS'],
  '/smm/content': ['Growth', 'Marketing', 'Content'],
  '/smm/campaigns': ['Growth', 'Marketing', 'Campaigns'],
  '/smm/ads': ['Growth', 'Marketing', 'Ads'],
  '/smm/creatives': ['Growth', 'Marketing', 'Creatives'],
  '/smm/calendar': ['Growth', 'Marketing', 'Calendar'],
  '/smm/performance': ['Growth', 'Marketing', 'Performance'],
  '/smm/reports': ['Growth', 'Marketing', 'Reports'],
  '/finance': ['Business', 'Finance Status'],
  '/call-history': ['Business', 'Call History'],
  '/domain-renewals': ['Business', 'Domain Renewals'],
  '/attendance': ['Team', 'Attendance & EOD'],
  '/hr': ['Team', 'HR & Hiring'],
  '/admin/users': ['Team', 'User Directory'],
  '/admin/manager-assignments': ['Team', 'Manager Assignments'],
  '/sop': ['Knowledge', 'SOP Library'],
  '/assets': ['Knowledge', 'Asset Library'],
  '/chat': ['System', 'Team Chat'],
  '/reports': ['System', 'Reports & Analytics'],
  '/settings': ['System', 'Settings'],
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

  // Compute breadcrumb path
  const currentPath = location.pathname;
  const breadcrumbs = ROUTE_LABELS[currentPath] || [
    currentPath.split('/')[1]?.replace(/-/g, ' ') || 'Workspace'
  ];

  const canCreate = ['superAdmin', 'admin', 'manager'].includes(user?.role);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 min-w-0 items-center justify-between border-b border-border bg-card/90 px-3.5 backdrop-blur-md sm:px-5 select-none">
        {/* Left: Mobile Toggle & Dynamic Breadcrumbs */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 -ml-1 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground md:hidden flex-shrink-0"
            title="Toggle Navigation"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
            <span className="font-bold text-foreground/80 hover:text-foreground transition-colors hidden sm:inline">
              RiseWithMedia
            </span>
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5 min-w-0">
                <ChevronRight size={12} className="text-muted-foreground/60 shrink-0" />
                <span
                  className={`truncate capitalize ${
                    idx === breadcrumbs.length - 1
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground hover:text-foreground transition-colors'
                  }`}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Center/Right: Quick Search Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
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

          {/* Quick Create Action Dropdown (+ New) */}
          {canCreate && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm transition-all">
                <Plus size={14} className="stroke-[2.5]" />
                <span className="hidden sm:inline">New</span>
              </DropdownMenuTrigger>
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

          {/* Date Filter for Managers/Admins */}
          {(user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager') && (
            <div className="hidden 2xl:block">
              <DateRangePicker compact />
            </div>
          )}

          {/* Favorites Panel */}
          <FavoritesPanel />

          {/* Theme Toggle */}
          <button
            onClick={() => dispatch(toggleDarkMode())}
            className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground relative">
              <Bell size={17} />
              {notificationData?.unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-0.5 bg-primary text-white rounded-full border border-card text-[9px] font-bold flex items-center justify-center">
                  {Math.min(notificationData.unreadCount, 9)}
                </span>
              )}
            </DropdownMenuTrigger>
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

