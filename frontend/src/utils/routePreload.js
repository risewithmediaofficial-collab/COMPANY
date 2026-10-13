// =============================================
// ROUTE PRELOAD UTILITY
// Eliminates lazy-loading chunk delays on hover/focus
// =============================================

const routeLoaders = {
  '/': () => import('../pages/Dashboard'),
  '/tasks': () => import('../pages/tasks/Tasks'),
  '/manager-tasks': () => import('../pages/tasks/Tasks'),
  '/projects': () => import('../pages/projects/Projects'),
  '/clients': () => import('../pages/clients/Clients'),
  '/client-vault': () => import('../pages/clients/ClientVault'),
  '/client-followups': () => import('../pages/clients/ClientFollowups'),
  '/finance': () => import('../pages/finance/Finance'),
  '/call-history': () => import('../pages/finance/CallHistoryDashboard'),
  '/crm/leads': () => import('../pages/crm/Leads'),
  '/proposals': () => import('../pages/proposals/Proposals'),
  '/smm': () => import('../pages/smm/SMMDashboard'),
  '/smm/content': () => import('../pages/smm/SMMContent'),
  '/smm/campaigns': () => import('../pages/smm/Campaigns'),
  '/smm/leads': () => import('../pages/smm/SMMLeads'),
  '/smm/adsets': () => import('../pages/smm/AdSets'),
  '/smm/ads': () => import('../pages/smm/Ads'),
  '/smm/budget': () => import('../pages/smm/AdBudgetDashboard'),
  '/smm/tracker': () => import('../pages/smm/SMMOnePageTracker'),
  '/referral': () => import('../pages/referral/ReferralDashboard'),
  '/calendar': () => import('../pages/tasks/ContentCalendar'),
  '/daily-tasks': () => import('../pages/tasks/ContentCalendar'),
  '/dm-calendar': () => import('../pages/dmCalendar/DMCalendar'),
  '/influencers': () => import('../pages/influencers/InfluencersDashboard'),
  '/manager-board': () => import('../pages/tasks/ManagerBoard'),
  '/pending-notes': () => import('../pages/tasks/PendingNotes'),
  '/development': () => import('../pages/development/DevelopmentDashboard'),
  '/development/board': () => import('../pages/development/DevelopmentBoard'),
  '/development/my-tasks': () => import('../pages/development/MyDevTasks'),
  '/development/sprints': () => import('../pages/development/DevelopmentSprints'),
  '/development/reviews': () => import('../pages/development/DevelopmentReviews'),
  '/development/qa': () => import('../pages/development/DevelopmentQA'),
  '/development/releases': () => import('../pages/development/DevelopmentReleases'),
  '/domain-renewals': () => import('../pages/admin/DomainRenewals'),
  '/attendance': () => import('../pages/employee/Attendance'),
  '/my-eod-reports': () => import('../pages/employee/MyEODReports'),
  '/hr': () => import('../pages/hr/HR'),
  '/admin/users': () => import('../pages/admin/Users'),
  '/admin/manager-assignments': () => import('../pages/admin/ManagerTaskAssignments'),
  '/sop': () => import('../pages/sop/SOPDashboard'),
  '/assets': () => import('../pages/assets/AssetsLibrary'),
  '/reports': () => import('../pages/reports/Reports'),
  '/settings': () => import('../pages/Settings'),
};

const preloadedRoutes = new Set();

/**
 * Preload route chunk into browser cache on link hover/focus.
 * Safe to call multiple times.
 */
export function preloadRoute(path) {
  if (!path) return;
  const normalizedPath = path.split('?')[0].replace(/\/$/, '') || '/';
  if (preloadedRoutes.has(normalizedPath)) return;

  const loader = routeLoaders[normalizedPath];
  if (typeof loader === 'function') {
    preloadedRoutes.add(normalizedPath);
    loader().catch(() => {
      // Allow retry if network failed during hover
      preloadedRoutes.delete(normalizedPath);
    });
  }
}
