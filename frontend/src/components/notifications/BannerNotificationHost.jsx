import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  X,
  ExternalLink,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react';

/**
 * BannerNotificationHost
 * Renders high-priority in-app floating banner notifications at the top of the viewport
 * Listens to:
 * 1. window CustomEvent 'rwm-banner-notification' (fired by SocketContext & local actions)
 * 2. Service Worker 'message' events (fired when Push is received)
 */
export const BannerNotificationHost = () => {
  const [banners, setBanners] = useState([]);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('rwm_banner_sound_muted') === 'true';
  });
  const navigate = useNavigate();

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('rwm_banner_sound_muted', String(next));
  };

  const removeBanner = (id) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  useEffect(() => {
    const handleBannerEvent = (event) => {
      const bannerData = event.detail;
      if (!bannerData) return;

      const newBanner = {
        id: bannerData.id || `banner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: bannerData.title || '🔔 RISE WITH MEDIA Notification',
        message: bannerData.message || bannerData.body || '',
        link: bannerData.link || bannerData.url || '/',
        type: bannerData.type || 'system',
        createdAt: bannerData.createdAt || new Date().toISOString(),
        duration: bannerData.duration || 8000,
      };

      setBanners((prev) => {
        // Keep up to 2 active banners in view, prepend new banner
        const filtered = prev.filter((b) => b.id !== newBanner.id);
        return [newBanner, ...filtered].slice(0, 2);
      });
    };

    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED' && event.data?.payload) {
        handleBannerEvent({ detail: event.data.payload });
      }
    };

    window.addEventListener('rwm-banner-notification', handleBannerEvent);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('rwm-banner-notification', handleBannerEvent);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  return (
    <div
      id="banner-notifications-container"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] w-[94%] sm:w-[540px] max-w-full pointer-events-none flex flex-col items-center gap-2"
    >
      <AnimatePresence mode="popLayout">
        {banners.map((banner) => (
          <BannerItem
            key={banner.id}
            banner={banner}
            isMuted={isMuted}
            onToggleSound={toggleSound}
            onDismiss={() => removeBanner(banner.id)}
            onNavigate={(path) => {
              removeBanner(banner.id);
              if (path && path !== '#') {
                if (path.startsWith('http')) {
                  window.location.href = path;
                } else {
                  navigate(path);
                }
              }
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const BannerItem = ({ banner, isMuted, onToggleSound, onDismiss, onNavigate }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(banner.duration);
  const timerRef = useRef(null);

  const duration = banner.duration || 8000;

  useEffect(() => {
    if (isPaused) {
      clearInterval(timerRef.current);
      return;
    }

    const intervalStep = 50;
    timerRef.current = setInterval(() => {
      remainingTimeRef.current -= intervalStep;
      const pct = Math.max(0, (remainingTimeRef.current / duration) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(timerRef.current);
        onDismiss();
      }
    }, intervalStep);

    return () => clearInterval(timerRef.current);
  }, [isPaused, duration, onDismiss]);

  const typeConfig = {
    success: {
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      icon: <CheckCircle2 size={18} className="text-emerald-500" />,
    },
    warning: {
      gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      borderColor: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      barColor: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      icon: <AlertTriangle size={18} className="text-amber-500" />,
    },
    task: {
      gradient: 'from-indigo-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-indigo-500/40',
      badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      barColor: 'bg-gradient-to-r from-indigo-500 to-blue-400',
      icon: <BellRing size={18} className="text-indigo-500 animate-bounce" />,
    },
    lead: {
      gradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
      borderColor: 'border-purple-500/40',
      badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      barColor: 'bg-gradient-to-r from-purple-500 to-pink-400',
      icon: <BellRing size={18} className="text-purple-500" />,
    },
    system: {
      gradient: 'from-indigo-500/25 via-primary/15 to-transparent',
      borderColor: 'border-primary/40',
      badgeBg: 'bg-primary/15 text-primary',
      barColor: 'bg-gradient-to-r from-primary to-indigo-500',
      icon: <BellRing size={18} className="text-primary animate-pulse" />,
    },
  };

  const style = typeConfig[banner.type] || typeConfig.system;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -25, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto w-full relative overflow-hidden rounded-2xl border ${style.borderColor} bg-card/95 backdrop-blur-2xl shadow-2xl transition-all hover:shadow-indigo-500/10`}
    >
      {/* Background glow gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} pointer-events-none opacity-60`} />

      <div className="relative p-3.5 sm:p-4 flex items-start gap-3">
        {/* Animated Icon Avatar */}
        <div className={`relative shrink-0 p-2.5 rounded-xl ${style.badgeBg} shadow-inner`}>
          {style.icon}
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-secondary text-foreground/80 shrink-0">
                Banner Alert
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                <Clock size={11} />
                Just now
              </span>
            </div>

            {/* Quick Actions (Sound mute + Dismiss) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onToggleSound}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute banner sound' : 'Mute banner sound'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                title="Dismiss banner"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <h4 className="text-sm font-bold text-foreground tracking-tight leading-snug line-clamp-1">
            {banner.title}
          </h4>

          {banner.message && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
              {banner.message}
            </p>
          )}

          {/* Action Row */}
          <div className="mt-2.5 flex items-center gap-2">
            {banner.link && (
              <button
                type="button"
                onClick={() => onNavigate(banner.link)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <span>View Details</span>
                <ExternalLink size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="px-2.5 py-1 rounded-lg border border-border/80 hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>

      {/* Auto-dismiss progress countdown bar */}
      <div className="h-1 w-full bg-secondary/50 overflow-hidden">
        <motion.div
          className={`h-full ${style.barColor}`}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
};

export default BannerNotificationHost;
