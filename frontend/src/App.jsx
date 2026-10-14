import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Suspense, lazy, useEffect } from 'react';
import { fetchMe } from './store/slices/authSlice';
import { Toaster as HotToaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';
import WebsiteLaunchLoader from './components/WebsiteLaunchLoader';
import BannerNotificationHost from './components/notifications/BannerNotificationHost';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Route-Level Code Splitting (Lazy-loaded chunks)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Leads = lazy(() => import('./pages/crm/Leads'));
const LeadDetails = lazy(() => import('./pages/crm/LeadDetails'));
const SOPDashboard = lazy(() => import('./pages/sop/SOPDashboard'));
const Proposals = lazy(() => import('./pages/proposals/Proposals'));
const ProposalDetails = lazy(() => import('./pages/proposals/ProposalDetails'));
const ClientProposals = lazy(() => import('./pages/proposals/ClientProposals'));
const AddTask = lazy(() => import('./pages/tasks/AddTask'));
const TaskDetails = lazy(() => import('./pages/tasks/TaskDetails'));
const Projects = lazy(() => import('./pages/projects/Projects'));
const ProjectDetails = lazy(() => import('./pages/projects/ProjectDetails'));
const Clients = lazy(() => import('./pages/clients/Clients'));
const ClientDetails = lazy(() => import('./pages/clients/ClientDetails'));
const ClientVault = lazy(() => import('./pages/clients/ClientVault'));
const ClientFollowups = lazy(() => import('./pages/clients/ClientFollowups'));
const Tasks = lazy(() => import('./pages/tasks/Tasks'));
const ContentCalendar = lazy(() => import('./pages/tasks/ContentCalendar'));
const DMCalendar = lazy(() => import('./pages/dmCalendar/DMCalendar'));
const InfluencersDashboard = lazy(() => import('./pages/influencers/InfluencersDashboard'));
const PendingNotes = lazy(() => import('./pages/tasks/PendingNotes'));
const ManagerBoard = lazy(() => import('./pages/tasks/ManagerBoard'));
const Finance = lazy(() => import('./pages/finance/Finance'));
const CallHistoryDashboard = lazy(() => import('./pages/finance/CallHistoryDashboard'));
const HR = lazy(() => import('./pages/hr/HR'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Attendance = lazy(() => import('./pages/employee/Attendance'));
const MyEODReports = lazy(() => import('./pages/employee/MyEODReports'));
const ReferralDashboard = lazy(() => import('./pages/referral/ReferralDashboard'));
const Users = lazy(() => import('./pages/admin/Users'));
const DomainRenewals = lazy(() => import('./pages/admin/DomainRenewals'));
const ManagerTaskAssignments = lazy(() => import('./pages/admin/ManagerTaskAssignments'));
const AssetsLibrary = lazy(() => import('./pages/assets/AssetsLibrary'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PortalDashboard = lazy(() => import('./pages/portal/sections/PortalDashboard'));
const PortalInvoices = lazy(() => import('./pages/portal/sections/PortalInvoices'));
const PortalTasks = lazy(() => import('./pages/portal/sections/PortalTasks'));
const PortalAdBudget = lazy(() => import('./pages/portal/sections/PortalAdBudget'));
const PortalSMMTracker = lazy(() => import('./pages/portal/sections/PortalSMMTracker'));

// Social Media Manager Module Pages
const SMMDashboard = lazy(() => import('./pages/smm/SMMDashboard'));
const SMMContent = lazy(() => import('./pages/smm/SMMContent'));
const SMMLeads = lazy(() => import('./pages/smm/SMMLeads'));
const SMMClients = lazy(() => import('./pages/smm/SMMClients'));
const SMMProjects = lazy(() => import('./pages/smm/SMMProjects'));
const Campaigns = lazy(() => import('./pages/smm/Campaigns'));
const AdSets = lazy(() => import('./pages/smm/AdSets'));
const Ads = lazy(() => import('./pages/smm/Ads'));
const CreativeLibrary = lazy(() => import('./pages/smm/CreativeLibrary'));
const SMMContentCalendar = lazy(() => import('./pages/smm/ContentCalendar'));
const SMMPerformance = lazy(() => import('./pages/smm/Performance'));
const SMMReports = lazy(() => import('./pages/smm/Reports'));
const SMMDailyTracking = lazy(() => import('./pages/smm/DailyTracking'));
const SMMCallLogs = lazy(() => import('./pages/smm/SMMCallLogs'));
const SMMTeam = lazy(() => import('./pages/smm/Team'));
const AdBudgetDashboard = lazy(() => import('./pages/smm/AdBudgetDashboard'));
const SMMOnePageTracker = lazy(() => import('./pages/smm/SMMOnePageTracker'));

// Development Module Pages
const DevelopmentDashboard = lazy(() => import('./pages/development/DevelopmentDashboard'));
const DevelopmentBoard = lazy(() => import('./pages/development/DevelopmentBoard'));
const MyDevTasks = lazy(() => import('./pages/development/MyDevTasks'));
const DevelopmentSprints = lazy(() => import('./pages/development/DevelopmentSprints'));
const DevelopmentReviews = lazy(() => import('./pages/development/DevelopmentReviews'));
const DevelopmentQA = lazy(() => import('./pages/development/DevelopmentQA'));
const DevelopmentReleases = lazy(() => import('./pages/development/DevelopmentReleases'));

// ─── Shared Loading Screen ────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] text-white">
    <div className="relative flex items-center justify-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500 border-r-indigo-500" />
      <div className="absolute h-10 w-10 animate-ping rounded-full bg-indigo-500/25" />
      <div className="absolute h-4 w-4 rounded-full bg-indigo-500" />
    </div>
    <p className="mt-6 text-sm font-bold tracking-widest uppercase text-indigo-400/80 animate-pulse">
      Rise With Media
    </p>
    <span className="mt-1 text-[10px] text-slate-500 tracking-wider">Connecting Hub…</span>
  </div>
);

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute = ({ isAuthenticated, user, loading, allowedRoles, children }) => {
  // Still resolving session — don't redirect prematurely
  if (loading && !user) return null;

  // Truly unauthenticated
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Token valid but user profile not yet fetched (edge case)
  if (!user) return null;

  // SuperAdmin and Admin have unrestricted access everywhere
  if (user.role === 'superAdmin' || user.role === 'admin') {
    return children;
  }

  // RBAC & Granular Permission check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const p = user.permissions || {};
    if (p.canAccessSmm && (allowedRoles.includes('employee') || allowedRoles.includes('manager'))) {
      return children;
    }
    if ((p.canManageFinance || p.canViewFinanceOverview) && (allowedRoles.includes('manager') || allowedRoles.includes('superAdmin'))) {
      return children;
    }
    if (p.canManageLeads && (allowedRoles.includes('manager') || allowedRoles.includes('employee') || allowedRoles.includes('referral'))) {
      return children;
    }
    if ((p.canManageHR || p.canManageEmployees) && (allowedRoles.includes('manager') || allowedRoles.includes('superAdmin'))) {
      return children;
    }
    if ((p.canViewReports || p.canViewAnalytics) && (allowedRoles.includes('manager') || allowedRoles.includes('superAdmin'))) {
      return children;
    }
    if (p.canUploadAssets && (allowedRoles.includes('employee') || allowedRoles.includes('manager'))) {
      return children;
    }
    if (p.canAssignTasks && (allowedRoles.includes('manager') || allowedRoles.includes('superAdmin'))) {
      return children;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

// ─── App ──────────────────────────────────────────────────────────────────────
const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading, authChecked } = useSelector((state) => state.auth);

  useEffect(() => {
    // Fetch user profile once: token present, no user object, not already loading, and not yet checked
    if (isAuthenticated && !user && !loading && !authChecked) {
      dispatch(fetchMe());
    }
  }, [dispatch, isAuthenticated, user, loading, authChecked]);

  const isResolvingInitialAuth = loading && !user && isAuthenticated && !authChecked;

  return (
    <>
      <WebsiteLaunchLoader />
      {!isResolvingInitialAuth && (
        <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <HotToaster position="top-right" reverseOrder={false} />
      <SonnerToaster position="top-right" richColors closeButton />
      <BannerNotificationHost />
      <Suspense fallback={null}>
        <Routes>
          {/* ── Auth Routes ─────────────────────────────────────────────── */}
          <Route element={<AuthLayout />}>
            <Route path="/login"          element={!isAuthenticated ? <Login />          : <Navigate to="/" />} />
            <Route path="/register"       element={!isAuthenticated ? <Register />       : <Navigate to="/" />} />
            <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/" />} />
            <Route path="/reset-password/:token" element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/" />} />
          </Route>

          {/* ── Protected Shell ─────────────────────────────────────────── */}
          <Route
            element={(
              <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading}>
                <MainLayout />
              </ProtectedRoute>
            )}
          >
          {/* Root */}
          <Route
            path="/"
            element={user?.role === 'client' ? <PortalDashboard dark={false} user={user} /> : <Dashboard />}
          />

          {/* CRM */}
          <Route path="/crm/leads" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'referral']}>
              <Leads />
            </ProtectedRoute>
          } />
          <Route path="/crm/leads/:id" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'referral']}>
              <LeadDetails />
            </ProtectedRoute>
          } />

          <Route path="/sop" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SOPDashboard />
            </ProtectedRoute>
          } />

          <Route path="/proposals" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <Proposals />
            </ProtectedRoute>
          } />
          <Route path="/proposals/new" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <ProposalDetails />
            </ProtectedRoute>
          } />
          <Route path="/proposals/:id" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'client']}>
              <ProposalDetails />
            </ProtectedRoute>
          } />
          <Route path="/client/proposals" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client']}>
              <ClientProposals />
            </ProtectedRoute>
          } />

          {/* Projects */}
          <Route path="/projects" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client']}>
              <Projects />
            </ProtectedRoute>
          } />
          <Route path="/projects/:id" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client']}>
              <ProjectDetails />
            </ProtectedRoute>
          } />

          {/* Clients */}
          <Route path="/clients" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <Clients />
            </ProtectedRoute>
          } />
          <Route path="/clients/:id" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <ClientDetails />
            </ProtectedRoute>
          } />
          <Route path="/client-vault" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <ClientVault />
            </ProtectedRoute>
          } />
          <Route path="/client-followups" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <ClientFollowups />
            </ProtectedRoute>
          } />



          {/* Tasks & Calendar */}
          <Route path="/tasks" element={
            user?.role === 'client' ? (
              <PortalTasks />
            ) : (
              <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
                <Tasks />
              </ProtectedRoute>
            )
          } />
          <Route path="/manager-tasks" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['manager']}>
              <Tasks />
            </ProtectedRoute>
          } />
          <Route path="/tasks/new" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <AddTask />
            </ProtectedRoute>
          } />
          <Route path="/tasks/:id" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client']}>
              <TaskDetails />
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client', 'referral']}>
              <ContentCalendar />
            </ProtectedRoute>
          } />
          <Route path="/dm-calendar" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <DMCalendar />
            </ProtectedRoute>
          } />
          <Route path="/influencers" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <InfluencersDashboard />
            </ProtectedRoute>
          } />
          <Route path="/daily-tasks" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client', 'referral']}>
              <ContentCalendar defaultView="day" />
            </ProtectedRoute>
          } />
          <Route path="/daily_tasks" element={<Navigate to="/daily-tasks" replace />} />

          {/* Task Change Notes & Ideas Hub */}
          <Route path="/pending-notes" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <PendingNotes />
            </ProtectedRoute>
          } />
          <Route path="/pending notes" element={<Navigate to="/pending-notes" replace />} />
          <Route path="/pending%20notes" element={<Navigate to="/pending-notes" replace />} />
          <Route path="/task-notes" element={<Navigate to="/pending-notes" replace />} />
          <Route path="/notes" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <PendingNotes />
            </ProtectedRoute>
          } />

          {/* Manager Board – manager reviews & assigns notes */}
          <Route path="/manager-board" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <ManagerBoard />
            </ProtectedRoute>
          } />

          {/* Finance OS */}
          <Route path="/finance" element={
            user?.role === 'client' ? <Navigate to="/" replace /> : (
              <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'financeManager', 'accountManager', 'employee']}>
                <Finance />
              </ProtectedRoute>
            )
          } />
          <Route path="/finance/:section" element={
            user?.role === 'client' ? <Navigate to="/" replace /> : (
              <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'financeManager', 'accountManager', 'employee']}>
                <Finance />
              </ProtectedRoute>
            )
          } />
          <Route path="/call-history" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee', 'intern', 'editor', 'designer', 'adsManager']}>
              <CallHistoryDashboard />
            </ProtectedRoute>
          } />

          {/* HR — admin/manager only */}
          <Route path="/hr" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <HR />
            </ProtectedRoute>
          } />

          {/* Reports — admin/manager only */}
          <Route path="/reports" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/assets" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <AssetsLibrary />
            </ProtectedRoute>
          } />
          <Route path="/domain-renewals" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <DomainRenewals />
            </ProtectedRoute>
          } />

          {/* Attendance */}
          <Route path="/attendance" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <Attendance />
            </ProtectedRoute>
          } />
          <Route path="/my-eod-reports" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <MyEODReports />
            </ProtectedRoute>
          } />

          {/* Referral */}
          <Route path="/referral" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'referral']}>
              <ReferralDashboard />
            </ProtectedRoute>
          } />

          {/* Admin — superAdmin only */}
          <Route path="/admin/users" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin']}>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/admin/manager-assignments" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin']}>
              <ManagerTaskAssignments />
            </ProtectedRoute>
          } />

          {/* Settings — any authenticated user */}
          <Route path="/settings" element={<Settings />} />

          {/* Social Media Manager Routes */}
          <Route path="/smm" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMDashboard />
            </ProtectedRoute>
          } />
          <Route path="/smm/content" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMContent />
            </ProtectedRoute>
          } />
          <Route path="/smm/campaigns" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <Campaigns />
            </ProtectedRoute>
          } />
          <Route path="/smm/leads" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMLeads />
            </ProtectedRoute>
          } />
          <Route path="/smm/adsets" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <AdSets />
            </ProtectedRoute>
          } />
          <Route path="/smm/ads" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <Ads />
            </ProtectedRoute>
          } />
          <Route path="/smm/budget" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <AdBudgetDashboard />
            </ProtectedRoute>
          } />
          <Route path="/smm/tracker" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMOnePageTracker />
            </ProtectedRoute>
          } />
          <Route path="/smm/creatives" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <CreativeLibrary />
            </ProtectedRoute>
          } />
          <Route path="/smm/calendar" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMContentCalendar />
            </ProtectedRoute>
          } />
          <Route path="/smm/analytics" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMPerformance />
            </ProtectedRoute>
          } />
          <Route path="/smm/performance" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMPerformance />
            </ProtectedRoute>
          } />
          <Route path="/smm/reports" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMReports />
            </ProtectedRoute>
          } />
          <Route path="/smm/daily-tracking" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMDailyTracking />
            </ProtectedRoute>
          } />
          <Route path="/smm/call-logs" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee', 'adsManager']}>
              <SMMCallLogs />
            </ProtectedRoute>
          } />
          <Route path="/smm/team" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMTeam />
            </ProtectedRoute>
          } />

          {/* Development Module Routes */}
          <Route path="/development" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <DevelopmentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/development/board" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <DevelopmentBoard />
            </ProtectedRoute>
          } />
          <Route path="/development/my-tasks" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <MyDevTasks />
            </ProtectedRoute>
          } />
          <Route path="/development/sprints" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <DevelopmentSprints />
            </ProtectedRoute>
          } />
          <Route path="/development/reviews" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <DevelopmentReviews />
            </ProtectedRoute>
          } />
          <Route path="/development/qa" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <DevelopmentQA />
            </ProtectedRoute>
          } />
          <Route path="/development/releases" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <DevelopmentReleases />
            </ProtectedRoute>
          } />

          {/* Client Portal Sections */}
          <Route path="/portal/invoices" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client', 'superAdmin', 'manager']}>
              <PortalInvoices dark={false} />
            </ProtectedRoute>
          } />
          <Route path="/portal/tasks" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client', 'superAdmin', 'manager']}>
              <PortalTasks />
            </ProtectedRoute>
          } />
          <Route path="/portal/tracker" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client', 'superAdmin', 'manager']}>
              <PortalSMMTracker />
            </ProtectedRoute>
          } />
          <Route path="/portal/ad-budget" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client', 'superAdmin', 'manager']}>
              <PortalAdBudget />
            </ProtectedRoute>
          } />
          <Route path="/portal/downloads" element={<Navigate to="/" replace />} />
          <Route path="/portal/reports" element={<Navigate to="/" replace />} />
          <Route path="/portal/assets" element={<Navigate to="/" replace />} />
          <Route path="/portal/support" element={<Navigate to="/" replace />} />
          <Route path="/portal/guidelines" element={<Navigate to="/" replace />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
        </Router>
      )}
    </>
  );
};

export default App;
