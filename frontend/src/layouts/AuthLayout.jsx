import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Sun, Moon } from 'lucide-react';
import { toggleDarkMode } from '../store/slices/uiSlice';
import MobileAppInstallButton from '../components/ui/MobileAppInstallButton';

const AuthLayout = () => {
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.ui?.darkMode);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background relative overflow-x-hidden p-3 sm:p-6 py-10 sm:py-12 transition-colors duration-300">
      {/* Floating Theme Toggle (Top Right) */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <button
          type="button"
          onClick={() => dispatch(toggleDarkMode())}
          className="min-h-[40px] px-3 py-2 rounded-xl border border-border/80 bg-card/80 backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold"
          title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
          <span className="hidden sm:inline">{darkMode ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 -left-12 w-48 sm:w-96 h-48 sm:h-96 bg-primary/20 rounded-full filter blur-3xl opacity-60 dark:opacity-25 pointer-events-none animate-blob" />
      <div className="absolute top-1/4 -right-12 w-48 sm:w-96 h-48 sm:h-96 bg-blue-500/20 rounded-full filter blur-3xl opacity-60 dark:opacity-20 pointer-events-none animate-blob animation-delay-2000" />
      <div className="absolute -bottom-12 left-1/3 w-48 sm:w-96 h-48 sm:h-96 bg-purple-500/20 rounded-full filter blur-3xl opacity-60 dark:opacity-25 pointer-events-none animate-blob animation-delay-4000" />

      {/* Auth Card Container */}
      <div className="w-full max-w-md p-5 sm:p-8 rounded-3xl border border-border/80 bg-card/90 dark:bg-card/80 backdrop-blur-2xl shadow-2xl shadow-primary/5 dark:shadow-black/50 relative z-10 transition-all">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 flex h-16 sm:h-20 w-16 sm:w-20 items-center justify-center rounded-2xl bg-white dark:bg-secondary/80 border border-border/80 p-2.5 shadow-lg shadow-primary/10 dark:shadow-none transition-colors">
            <img
              src="/branding/rise-with-media-logo.png"
              alt="RISE WITH MEDIA logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-center text-xl sm:text-2xl font-black tracking-tight text-foreground">RISE WITH MEDIA</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Welcome back to your workspace</p>
        </div>
        <Outlet />
      </div>

      {/* Floating PWA Download / Install App Button (Mobile Only) */}
      <MobileAppInstallButton />
    </div>
  );
};

export default AuthLayout;
