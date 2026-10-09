import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Info,
} from 'lucide-react';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
  triggerBannerNotification,
} from '../../utils/browserNotification';
import {
  getExistingPushSubscription,
  reconcilePushSubscription,
  isIOSRequiresHomeInstall,
  isWebPushSupported,
} from '../../utils/webPush';

/**
 * EnableBannerNotificationBar
 * Prominent, high-converting banner bar shown at top of the app when banner notifications
 * are not yet enabled or subscribed on the current device.
 */
export const EnableBannerNotificationBar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const checkStatus = async () => {
    if (!isBrowserNotificationSupported()) {
      setIsVisible(false);
      return;
    }

    const currentPerm = getBrowserNotificationPermission();
    setPermission(currentPerm);

    // If permanently blocked in browser settings, don't show prompt banner
    if (currentPerm === 'denied') {
      setIsVisible(false);
      return;
    }

    // Check if dismissed recently (within 48 hours)
    const dismissedUntil = localStorage.getItem('rwm_banner_prompt_dismissed_until');
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      setIsVisible(false);
      return;
    }

    const existingSub = await getExistingPushSubscription();
    const hasActiveSub = Boolean(existingSub);
    setIsSubscribed(hasActiveSub);

    // If permission is already granted, attempt silent auto-reconcile in background
    if (currentPerm === 'granted') {
      if (!hasActiveSub) {
        const reconcileRes = await reconcilePushSubscription();
        if (reconcileRes?.success) {
          setIsSubscribed(true);
          setIsVisible(false);
          return;
        }
      } else {
        // Already granted and subscribed - no need to prompt
        setIsVisible(false);
        return;
      }
    }

    // Show if not granted, or granted without push subscription
    setIsVisible(true);
  };

  useEffect(() => {
    checkStatus();

    // Re-check when window regains focus or custom event triggers
    const handleRecheck = () => checkStatus();
    window.addEventListener('focus', handleRecheck);
    window.addEventListener('rwm-push-state-changed', handleRecheck);

    return () => {
      window.removeEventListener('focus', handleRecheck);
      window.removeEventListener('rwm-push-state-changed', handleRecheck);
    };
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await requestBrowserNotificationPermission();

      if (res?.permission === 'granted') {
        setIsVisible(false);
        setIsSubscribed(true);
        setPermission('granted');

        // Notify Navbar and other listeners
        window.dispatchEvent(new CustomEvent('rwm-push-state-changed', { detail: { active: true } }));
      } else if (res?.permission === 'denied') {
        setPermission('denied');
        setIsVisible(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss for 48 hours
    localStorage.setItem(
      'rwm_banner_prompt_dismissed_until',
      String(Date.now() + 48 * 60 * 60 * 1000)
    );
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full overflow-hidden border-b border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white shadow-md"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          {/* Left Info Column */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative shrink-0 flex items-center justify-center p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BellRing size={16} className="animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  Enable Banner Notifications
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                    Recommended
                  </span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-200/80 leading-tight truncate sm:whitespace-normal">
                {isIOSRequiresHomeInstall()
                  ? 'Add RiseWithMedia to your Home Screen on iPhone/iPad to enable background push alerts.'
                  : 'Receive real-time popup banner alerts for tasks, leads, and messages even when the app is closed.'}
              </p>
            </div>
          </div>

          {/* Right Action Column */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="enable-banner-notifications-bar-btn"
              type="button"
              onClick={handleEnable}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-amber-300" />
                  <span>Enable Banner Notifications</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss for 2 days"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnableBannerNotificationBar;
