import { useState, useEffect, useCallback, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import GlobalSearchModal from '../components/modals/GlobalSearchModal';
import MobileAppInstallButton from '../components/ui/MobileAppInstallButton';
import EnableBannerNotificationBar from '../components/notifications/EnableBannerNotificationBar';
import ErrorBoundary from '../components/ui/ErrorBoundary';

const PageLoadingFallback = () => (
  <div className="w-full py-12 flex flex-col items-center justify-center space-y-3">
    <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    <span className="text-[11px] font-semibold text-muted-foreground/80 tracking-wide animate-pulse">
      Loading view...
    </span>
  </div>
);

const MainLayout = () => {
  const location = useLocation();
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  const handleOpenSearch = useCallback(() => {
    setGlobalSearchOpen(true);
  }, []);

  // Clear any residual scroll lock on main element across route changes
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.style.removeProperty('overflow');
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar with stable search callback and path */}
      <Sidebar onOpenSearch={handleOpenSearch} currentPath={location.pathname} />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col h-full min-h-0 max-h-screen overflow-hidden transition-all duration-250 md:ml-[260px]">
        <Navbar onOpenSearch={handleOpenSearch} currentPath={location.pathname} />
        <EnableBannerNotificationBar />
        <main
          id="main-content-scroll"
          className="min-w-0 min-h-0 flex-1 overflow-y-auto bg-secondary/20 p-3 sm:p-5 md:p-6 custom-scrollbar overscroll-contain"
        >
          <div className="mx-auto min-w-0 max-w-7xl pb-16">
            <ErrorBoundary locationKey={location.pathname}>
              <Suspense fallback={<PageLoadingFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />

      {/* Floating PWA Download / Install App Button (Mobile Only) */}
      <MobileAppInstallButton />
    </div>
  );
};

export default MainLayout;
