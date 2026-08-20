import { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { toast } from 'sonner';

export function MobileAppInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Check if dismissed this session
    if (sessionStorage.getItem('rwm_install_dismissed') === 'true') {
      setIsDismissed(true);
    }

    // Capture Chrome/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('RiseWithMedia App installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const isIOS = () => {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !window.MSStream
    );
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          toast.success('Installing RiseWithMedia App...');
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
      return;
    }

    if (isIOS()) {
      setShowIosGuide(true);
      return;
    }

    // Android/Chrome fallback if prompt already consumed or not ready
    setShowAndroidGuide(true);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsDismissed(true);
    sessionStorage.setItem('rwm_install_dismissed', 'true');
  };

  // Don't render if already installed or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom-Right Install Button (Mobile Only) */}
      <div className="md:hidden fixed bottom-5 right-4 z-50 flex items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="relative group">
          {/* Glowing Aura Effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-emerald-500 rounded-full blur-xs opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse" />

          <button
            type="button"
            onClick={handleInstallClick}
            className="relative flex items-center gap-2 pl-3.5 pr-2.5 py-2.5 bg-black text-white rounded-full border border-primary/40 shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-bold select-none"
            aria-label="Download App"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Download size={13} className="stroke-[2.5]" />
            </div>

            <div className="flex flex-col text-left leading-tight pr-1">
              <span className="text-[11px] font-black tracking-tight text-white">Download App</span>
              <span className="text-[9px] font-medium text-emerald-400">Install for Mobile</span>
            </div>

            <span
              onClick={handleDismiss}
              title="Dismiss"
              className="ml-1 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={12} />
            </span>
          </button>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="max-w-sm rounded-3xl bg-zinc-950 text-white border-zinc-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <Smartphone className="text-primary" size={20} />
              <span>Install on iPhone / iPad</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Install RiseWithMedia directly to your home screen for full-screen mobile app experience.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs text-zinc-300">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                <Share2 size={16} />
              </div>
              <div>
                <p className="font-bold text-white">1. Tap the Share button</p>
                <p className="text-[11px] text-zinc-400">In Safari's bottom toolbar, tap the square Share icon.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <PlusSquare size={16} />
              </div>
              <div>
                <p className="font-bold text-white">2. Select "Add to Home Screen"</p>
                <p className="text-[11px] text-zinc-400">Scroll down in the share sheet options and tap "Add to Home Screen".</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <p className="font-bold text-white">3. Tap "Add"</p>
                <p className="text-[11px] text-zinc-400">Confirm by tapping Add in top-right to launch from your home screen anytime!</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Android / Chrome Manual Guide Modal */}
      <Dialog open={showAndroidGuide} onOpenChange={setShowAndroidGuide}>
        <DialogContent className="max-w-sm rounded-3xl bg-zinc-950 text-white border-zinc-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <Smartphone className="text-primary" size={20} />
              <span>Install on Android / Chrome</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Add RiseWithMedia directly to your phone apps.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs text-zinc-300">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                <ArrowUpRight size={16} />
              </div>
              <div>
                <p className="font-bold text-white">1. Tap Chrome Menu (⋮)</p>
                <p className="text-[11px] text-zinc-400">Tap the three vertical dots in the top-right corner of Chrome.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <Download size={16} />
              </div>
              <div>
                <p className="font-bold text-white">2. Tap "Install App" or "Add to Home Screen"</p>
                <p className="text-[11px] text-zinc-400">Choose Install App to add the app shortcut with instant launching.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MobileAppInstallButton;
