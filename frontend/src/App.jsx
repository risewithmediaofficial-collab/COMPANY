import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Suspense, lazy, useEffect } from 'react';
import { fetchMe } from './store/slices/authSlice';
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
const InfluencersDashboard = lazy(() => import('./pages/influencers/InfluencersDashboard'));
const Finance = lazy(() => import('./pages/finance/Finance'));
const CallHistoryDashboard = lazy(() => import('./pages/finance/CallHistoryDashboard'));
const HR = lazy(() => import('./pages/hr/HR'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Attendance = lazy(() => import('./pages/employee/Attendance'));
const MyEODReports = lazy(() => import('./pages/employee/MyEODReports'));
const ReferralDashboard = lazy(() => import('./pages/referral/ReferralDashboard'));
const Users = lazy(() => import('./pages/admin/Users'));
const DomainRenewals = lazy(() => import('./pages/admin/DomainRenewals'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const RecycleBin = lazy(() => import('./pages/admin/RecycleBin'));
const AssetsLibrary = lazy(() => import('./pages/assets/AssetsLibrary'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PortalDashboard = lazy(() => import('./pages/portal/sections/PortalDashboard'));
const PortalInvoices = lazy(() => import('./pages/portal/sections/PortalInvoices'));
const PortalTasks = lazy(() => import('./pages/portal/sections/PortalTasks'));
const PortalAdBudget = lazy(() => import('./pages/portal/sections/PortalAdBudget'));
const PortalSMMTracker = lazy(() => import('./pages/portal/sections/PortalSMMTracker'));

// Social Media Manager Module Pages - One-Page Tracker Only
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
  <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0d0d0d] text-white">
    <div className="relative flex items-center justify-center">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-zinc-800 border-t-zinc-200 border-r-zinc-400" />
      <div className="absolute h-3.5 w-3.5 rounded-full bg-zinc-200" />
    </div>
    <p className="mt-6 text-sm font-bold tracking-widest uppercase text-zinc-200">
      Rise With Media
    </p>
    <span className="mt-1 text-[10px] text-zinc-500 tracking-wider">Connecting Hub…</span>
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

  const isResolvingInitialAuth = isAuthenticated && !user && !authChecked;

  return (
    <>
      <WebsiteLaunchLoader />
      {isResolvingInitialAuth ? (
        <LoadingScreen />
      ) : (
        <Router future={{ v7_relativeSplatPath: true }}>
      <SonnerToaster
        position="top-right"
        closeButton
        toastOptions={{
          className: 'bg-popover text-foreground border-0 shadow-[0_12px_32px_rgba(0,0,0,0.1)] rounded-xl',
        }}
      />
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
            element={user?.role === 'client' ? <PortalDashboard user={user} /> : <Dashboard />}
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
            user?.role === 'client' ? (
              <ClientProposals />
            ) : (
              <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
                <Proposals />
              </ProtectedRoute>
            )
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
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client']}>
              <ClientDetails />
            </ProtectedRoute>
          } />
          <Route path="/client-vault" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client']}>
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
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
              <Attendance />
            </ProtectedRoute>
          } />
          <Route path="/my-eod-reports" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager', 'employee']}>
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

          {/* System Audit Logs & Recycle Bin — Super Admin, Admin, Manager */}
          <Route path="/audit-logs" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager']}>
              <AuditLogs />
            </ProtectedRoute>
          } />
          <Route path="/recycle-bin" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'admin', 'manager']}>
              <RecycleBin />
            </ProtectedRoute>
          } />

          {/* Settings — any authenticated user */}
          <Route path="/settings" element={<Settings />} />

          {/* Social Media & Ads - One-Page Tracker Only */}
          <Route path="/smm" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMOnePageTracker />
            </ProtectedRoute>
          } />
          <Route path="/smm/tracker" element={<Navigate to="/smm" replace />} />
          <Route path="/smm/*" element={<Navigate to="/smm" replace />} />

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
              <PortalInvoices />
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
