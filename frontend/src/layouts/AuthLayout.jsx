import { Outlet } from 'react-router-dom';
import MobileAppInstallButton from '../components/ui/MobileAppInstallButton';

const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 -left-4 w-48 sm:w-72 h-48 sm:h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-48 sm:w-72 h-48 sm:h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-48 sm:w-72 h-48 sm:h-72 bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md p-6 sm:p-8 glass rounded-2xl shadow-2xl relative z-10 mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 flex h-16 sm:h-20 w-16 sm:w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg shadow-primary/20">
            <img
              src="/branding/rise-with-media-logo.png"
              alt="RISE WITH MEDIA logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-center text-xl sm:text-2xl font-bold tracking-tight">RISE WITH MEDIA</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Welcome back to your workspace</p>
        </div>
        <Outlet />
      </div>

      {/* Floating PWA Download / Install App Button (Mobile Only) */}
      <MobileAppInstallButton />
    </div>
  );
};

export default AuthLayout;
