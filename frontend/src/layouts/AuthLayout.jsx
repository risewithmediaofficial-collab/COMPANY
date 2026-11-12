import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Sun, Moon } from '@/components/ui/muiIcons';
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
          className="min-h-[40px] px-3 py-2 rounded-xl bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={16} className="text-zinc-200" /> : <Moon size={16} className="text-zinc-700" />}
          <span className="hidden sm:inline">{darkMode ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-card relative z-10 transition-colors">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 flex h-16 sm:h-20 w-16 sm:w-20 items-center justify-center rounded-2xl bg-brand/10 ring-1 ring-brand/25 shadow-[0_8px_24px_-8px_hsl(var(--brand)/0.45)] p-2.5 transition-colors">
            <img
              src="/branding/rise-with-media-logo.png"
              alt="RISE WITH MEDIA logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-center text-xl sm:text-2xl font-black tracking-tight text-foreground">RISE WITH MEDIA</h1>
          <p className="text-center text-muted-foreground text-xs sm:text-sm mt-1">Welcome back to your workspace</p>
        </div>
        <Outlet />
      </div>

      {/* Floating PWA Download / Install App Button (Mobile Only) */}
      <MobileAppInstallButton />
    </div>
  );
};

export default AuthLayout;
