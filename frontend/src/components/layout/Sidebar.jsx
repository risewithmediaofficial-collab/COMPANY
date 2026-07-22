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
  CreditCard,
  ClipboardList,
  StickyNote,
  X
} from 'lucide-react';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { motion } from 'framer-motion';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';
const badgePaths = {
  'Portal Manager': 'accessRequests',
  'Users': 'pendingUsers',
};

const Sidebar = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const canViewBadges = ['superAdmin', 'manager'].includes(user?.role);
  const { data: badgeCounts } = useSidebarBadges(canViewBadges);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarVariants = {
    mobile: {
      width: 256,
      x: sidebarOpen ? 0 : -256,
    },
    desktop: {
      width: sidebarOpen ? 256 : 80,
      x: 0,
    }
  };

  const menuItems = {
    superAdmin: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { name: 'CRM & Leads', icon: TrendingUp, path: '/crm/leads' },
      { name: 'Call History', icon: PhoneCall, path: '/call-history' },
      { name: 'Daily Tasks', icon: Calendar, path: '/daily-tasks' },
      { name: 'Clients', icon: Users, path: '/clients' },
      { name: 'Projects', icon: Briefcase, path: '/projects' },
      { name: 'Tasks', icon: CheckSquare, path: '/tasks' },
      { name: 'SOP Dashboard', icon: BookOpen, path: '/sop' },
      { name: 'Proposals', icon: FileText, path: '/proposals' },
      { name: 'Finance Status', icon: IndianRupee, path: '/finance' },
      { name: 'Client Follow-ups', icon: PhoneCall, path: '/client-followups' },
      { name: 'Client Vault', icon: KeyRound, path: '/client-vault' },
      { name: 'Domain Renewals', icon: Globe2, path: '/domain-renewals' },
      { name: 'Content Calendar', icon: Calendar, path: '/calendar' },
      { name: 'Message Center', icon: MessageSquare, path: '/chat' },
      { name: 'HR & Hiring', icon: Users2, path: '/hr' },
      { name: 'Attendance', icon: Clock, path: '/attendance' },
      { name: 'Reports', icon: BarChart3, path: '/reports' },
      { name: 'Asset Library', icon: Palette, path: '/assets' },
      { name: 'Portal Manager', icon: FileText, path: '/portal-manager' },
      { name: 'Manager Assignments', icon: CheckSquare, path: '/admin/manager-assignments' },
      { name: 'Manager Board', icon: ClipboardList, path: '/manager-board' },
      { name: 'Users', icon: Users2, path: '/admin/users' },
    ],
    manager: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { name: 'CRM & Leads', icon: TrendingUp, path: '/crm/leads' },
      { name: 'Call History', icon: PhoneCall, path: '/call-history' },
      { name: 'Daily Tasks', icon: Calendar, path: '/daily-tasks' },
      { name: 'Clients', icon: Users, path: '/clients' },
      { name: 'Projects', icon: Briefcase, path: '/projects' },
      { name: 'Manager Tasks', icon: CheckSquare, path: '/manager-tasks' },
      { name: 'SOP Dashboard', icon: BookOpen, path: '/sop' },
      { name: 'Proposals', icon: FileText, path: '/proposals' },
      { name: 'Ads Campaigns', icon: BarChart3, path: '/finance' },
      { name: 'Client Follow-ups', icon: PhoneCall, path: '/client-followups' },
      { name: 'Client Vault', icon: KeyRound, path: '/client-vault' },
      { name: 'Domain Renewals', icon: Globe2, path: '/domain-renewals' },
      { name: 'Content Calendar', icon: Calendar, path: '/calendar' },
      { name: 'Message Center', icon: MessageSquare, path: '/chat' },
      { name: 'Attendance', icon: Clock, path: '/attendance' },
      { name: 'Reports', icon: BarChart3, path: '/reports' },
      { name: 'Asset Library', icon: Palette, path: '/assets' },
      { name: 'Portal Manager', icon: FileText, path: '/portal-manager' },
      { name: 'Manager Board', icon: ClipboardList, path: '/manager-board' },
    ],
    employee: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { name: 'Daily Tasks', icon: Calendar, path: '/daily-tasks' },
      { name: 'My Tasks', icon: CheckSquare, path: '/tasks' },
      { name: 'Pending Notes', icon: StickyNote, path: '/pending-notes' },
      { name: 'SOP Dashboard', icon: BookOpen, path: '/sop' },
      { name: 'Content Calendar', icon: Calendar, path: '/calendar' },
      { name: 'Client Vault', icon: KeyRound, path: '/client-vault' },
      { name: 'Attendance', icon: Clock, path: '/attendance' },
      { name: 'Message Center', icon: MessageSquare, path: '/chat' },
    ],
    client: [
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
      { name: 'Message Center', icon: MessageSquare, path: '/chat' },
    ],
    referral: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { name: 'Leads', icon: TrendingUp, path: '/crm/leads' },
      { name: 'Content Calendar', icon: Calendar, path: '/calendar' },
      { name: 'Earnings', icon: Award, path: '/referral' },
    ],
  };

  const currentMenu = menuItems[user?.role] || menuItems.employee;

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop (clicking outside does NOT close it anymore) */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}

      <motion.aside 
        initial={false}
        animate={isMobile ? sidebarVariants.mobile : sidebarVariants.desktop}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-screen bg-card border-r border-border z-50 flex flex-col shadow-xl"
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-background p-1 shadow-sm">
              <img
                src="/branding/rise-with-media-logo.png"
                alt="RWM logo"
                className="h-full w-full object-contain"
              />
            </div>
            {(sidebarOpen || isMobile) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex min-w-0 flex-col leading-tight"
              >
                <span className="truncate text-base font-black uppercase tracking-[0.18em] text-black">RWM</span>
              </motion.div>
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

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {currentMenu.map((item) => {
            const badgeKey = badgePaths[item.name];
            const count = badgeKey ? (badgeCounts?.[badgeKey] || 0) : 0;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => isMobile && dispatch(toggleSidebar())}
                className={`flex items-center p-3 rounded-xl transition-all duration-200 group ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <item.icon size={22} className={`${location.pathname === item.path ? '' : 'group-hover:scale-110 transition-transform'}`} />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-[3px] bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-card">
                      {Math.min(count, 9)}
                    </span>
                  )}
                </div>
                {(sidebarOpen || isMobile) && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-3 font-medium text-sm flex-1"
                  >
                    {item.name}
                  </motion.span>
                )}
                {(sidebarOpen || isMobile) && count > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Section */}
        <div className="p-4 border-t border-border">
          <Link
            to="/settings"
            onClick={() => isMobile && dispatch(toggleSidebar())}
            className={`flex items-center p-3 rounded-xl transition-all ${
              location.pathname === '/settings' 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Settings size={22} />
            {(sidebarOpen || isMobile) && (
              <span className="ml-3 font-medium text-sm">Settings</span>
            )}
          </Link>
          
          {!isMobile && (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="mt-2 w-full flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors"
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
