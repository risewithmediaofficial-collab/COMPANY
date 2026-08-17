import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearchModal from '../components/modals/GlobalSearchModal';

const MainLayout = () => {
  const { sidebarOpen } = useSelector((state) => state.ui);
  const location = useLocation();
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar with search callback */}
      <Sidebar onOpenSearch={() => setGlobalSearchOpen(true)} />

      {/* Main Content Area */}
      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-250 ${sidebarOpen ? 'md:ml-[260px]' : 'md:ml-[72px]'}`}>
        <Navbar onOpenSearch={() => setGlobalSearchOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-secondary/20 p-3 sm:p-5 md:p-6 custom-scrollbar">
          <div className="mx-auto min-w-0 max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />
    </div>
  );
};

export default MainLayout;
