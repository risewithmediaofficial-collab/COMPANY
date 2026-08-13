import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Suspense, lazy, useEffect } from 'react';
import { fetchMe } from './store/slices/authSlice';
import { Toaster as HotToaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Leads from './pages/crm/Leads';
import LeadDetails from './pages/crm/LeadDetails';
import SOPDashboard from './pages/sop/SOPDashboard';
import Proposals from './pages/proposals/Proposals';
import ProposalDetails from './pages/proposals/ProposalDetails';
import ClientProposals from './pages/proposals/ClientProposals';
import AddTask from './pages/tasks/AddTask';
import TaskDetails from './pages/tasks/TaskDetails';
import Projects from './pages/projects/Projects';
import ProjectDetails from './pages/projects/ProjectDetails';
import Clients from './pages/clients/Clients';
import ClientDetails from './pages/clients/ClientDetails';
import ClientVault from './pages/clients/ClientVault';
import ClientFollowups from './pages/clients/ClientFollowups';
import Tasks from './pages/tasks/Tasks';
import ContentCalendar from './pages/tasks/ContentCalendar';
import DMCalendar from './pages/dmCalendar/DMCalendar';
import InfluencersDashboard from './pages/influencers/InfluencersDashboard';
import PendingNotes from './pages/tasks/PendingNotes';
import ManagerBoard from './pages/tasks/ManagerBoard';
import Finance from './pages/finance/Finance';
import CallHistoryDashboard from './pages/finance/CallHistoryDashboard';
import HR from './pages/hr/HR';
import Reports from './pages/reports/Reports';
import Attendance from './pages/employee/Attendance';
import Communication from './pages/employee/Communication';
import ReferralDashboard from './pages/referral/ReferralDashboard';
import Users from './pages/admin/Users';
import DomainRenewals from './pages/admin/DomainRenewals';
import ManagerTaskAssignments from './pages/admin/ManagerTaskAssignments';
import AssetsLibrary from './pages/assets/AssetsLibrary';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import PortalDashboard from './pages/portal/sections/PortalDashboard';
import PortalReports from './pages/portal/sections/PortalReports';
import PortalDownloads from './pages/portal/sections/PortalDownloads';
import BrandAssets from './pages/portal/sections/BrandAssets';
import PortalSupport from './pages/portal/sections/PortalSupport';
import PortalGuidelines from './pages/portal/sections/PortalGuidelines';

// Social Media Manager Module Pages
import SMMDashboard from './pages/smm/SMMDashboard';
import SMMContent from './pages/smm/SMMContent';
import SMMLeads from './pages/smm/SMMLeads';
import SMMClients from './pages/smm/SMMClients';
import SMMProjects from './pages/smm/SMMProjects';
import Campaigns from './pages/smm/Campaigns';
import AdSets from './pages/smm/AdSets';
import Ads from './pages/smm/Ads';
import CreativeLibrary from './pages/smm/CreativeLibrary';
import SMMContentCalendar from './pages/smm/ContentCalendar';
import SMMPerformance from './pages/smm/Performance';
import SMMReports from './pages/smm/Reports';
import SMMTeam from './pages/smm/Team';

// ─── Shared Loading Screen ────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-[#090a0f] text-white">
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
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Fetch user profile once: token present, no user object, not already loading
    if (isAuthenticated && !user && !loading) {
      dispatch(fetchMe());
    }
  }, [dispatch, isAuthenticated, user, loading]);

  // Global boot-screen while the very first /me call is in-flight
  if (loading && !user && isAuthenticated) return null;

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <HotToaster position="top-right" reverseOrder={false} />
      <SonnerToaster position="top-right" richColors closeButton />
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
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client']}>
              <Clients />
            </ProtectedRoute>
          } />
          <Route path="/clients/:id" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client']}>
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
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client']}>
              <Tasks />
            </ProtectedRoute>
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

          {/* Pending Notes – employee writes notes to send to manager */}
          <Route path="/pending-notes" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <PendingNotes />
            </ProtectedRoute>
          } />

          {/* Manager Board – manager reviews & assigns notes */}
          <Route path="/manager-board" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
              <ManagerBoard />
            </ProtectedRoute>
          } />

          {/* Finance */}
          <Route path="/finance" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee', 'client']}>
              <Finance />
            </ProtectedRoute>
          } />
          <Route path="/call-history" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager']}>
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

          {/* Chat / Communication */}
          <Route path="/chat" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <Communication />
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
          <Route path="/smm/team" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['superAdmin', 'manager', 'employee']}>
              <SMMTeam />
            </ProtectedRoute>
          } />

          {/* Client Portal Sections */}
          <Route path="/portal/reports" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client', 'superAdmin', 'manager']}>
              <PortalReports dark={false} />
            </ProtectedRoute>
          } />
          <Route path="/portal/downloads" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client', 'superAdmin', 'manager']}>
              <PortalDownloads dark={false} />
            </ProtectedRoute>
          } />
          <Route path="/portal/assets" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client', 'superAdmin', 'manager']}>
              <BrandAssets dark={false} />
            </ProtectedRoute>
          } />
          <Route path="/portal/support" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client', 'superAdmin', 'manager']}>
              <PortalSupport dark={false} />
            </ProtectedRoute>
          } />
          <Route path="/portal/guidelines" element={
            <ProtectedRoute isAuthenticated={isAuthenticated} user={user} loading={loading} allowedRoles={['client', 'superAdmin', 'manager']}>
              <PortalGuidelines dark={false} />
            </ProtectedRoute>
          } />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
