import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, Bell, Search, Moon, Sun, LogOut, User, Settings, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toggleDarkMode, toggleSidebar } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import api from '../../api';
import { getAssetUrl } from '../../utils/assetUrl';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from '../../utils/browserNotification';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/DropdownMenu';
import GlobalSearchModal from '../modals/GlobalSearchModal';
import FavoritesPanel from '../modals/FavoritesPanel';
import { DateRangePicker } from '../ui/DateRangePicker';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.ui);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState(getBrowserNotificationPermission());

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

  const handleSearchClick = () => {
    setSearchOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 min-w-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
        {/* Mobile Toggle Menu & Search Bar */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground md:hidden flex-shrink-0"
            title="Toggle Navigation"
          >
            <Menu size={20} />
          </button>

          {/* Search Bar */}
          <div className="relative hidden min-w-0 flex-1 md:block md:max-w-sm lg:max-w-xl" onClick={handleSearchClick}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-muted-foreground" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-8 py-2 border border-border rounded-full bg-secondary/50 text-xs md:text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              placeholder="Search... (Cmd+K)"
              readOnly
            />
            <div className="absolute inset-y-0 right-3 flex items-center text-[10px] text-muted-foreground pointer-events-none">
              ⌘K
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
          {(user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager') && (
            <div className="hidden xl:block">
              <DateRangePicker compact />
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => dispatch(toggleDarkMode())}
            className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Favorites Panel */}
          <FavoritesPanel />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground relative">
              <Bell size={20} />
              {notificationData?.unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-primary text-white rounded-full border-2 border-card text-[9px] font-bold flex items-center justify-center">
                  {Math.min(notificationData.unreadCount, 9)}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 mt-2">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <button onClick={() => markAllRead.mutate()} className="text-xs text-primary font-semibold">Mark read</button>
              </DropdownMenuLabel>

              {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
                <div className="mx-2 mb-2 p-2 bg-primary/10 border border-primary/20 rounded-xl text-xs flex items-center justify-between gap-2">
                  <span className="text-foreground flex items-center gap-1.5 font-medium text-[11px]">
                    <BellRing size={14} className="text-primary shrink-0" /> Desktop Push Alerts
                  </span>
                  <button
                    onClick={async () => {
                      const perm = await requestBrowserNotificationPermission();
                      setPushPermission(perm);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-[10px] hover:bg-primary/90 transition-all shrink-0"
                  >
                    Enable
                  </button>
                </div>
              )}

              <DropdownMenuSeparator />
              {(notificationData?.notifications || []).length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
              ) : (
                notificationData.notifications.map((notification) => (
                  <DropdownMenuItem key={notification._id} asChild>
                    <Link
                      to={notification.link || '/'}
                      onClick={() => !notification.isRead && markNotificationRead.mutate(notification._id)}
                      className="flex flex-col items-start gap-1 whitespace-normal"
                    >
                      <span className="text-sm font-semibold">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">{notification.message}</span>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-1 hidden h-6 w-px bg-border sm:block"></div>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-w-0 items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-secondary focus:outline-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-blue-500 text-xs font-semibold text-white shadow-md shadow-primary/20">
                {user?.avatar ? (
                  <img src={getAssetUrl(user.avatar)} alt={user.name} className="w-full h-8 rounded-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="hidden min-w-0 text-left xl:block">
                <p className="truncate text-xs font-semibold leading-none">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize mt-1">{user?.role}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link to="/settings">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" asChild>
                <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => dispatch(logout())}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
};

export default Navbar;
