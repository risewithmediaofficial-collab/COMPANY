import React, { useState, useEffect } from 'react';
import api from '../../api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Bell,
  BellRing,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Send,
  Clock,
  Smartphone,
  Laptop,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  fetchPushDiagnostics,
  sendTestPushNotification,
  subscribeToWebPush,
  isIOSRequiresHomeInstall,
} from '../../utils/webPush';

export const PushDiagnosticsModal = ({ open, onOpenChange }) => {
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState(null);
  const [testing, setTesting] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPushDiagnostics();
      setDiagnostics(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleTestNow = async () => {
    setTesting(true);
    try {
      await sendTestPushNotification(0);
      await loadData();
    } finally {
      setTesting(false);
    }
  };

  const handleScheduledTest = async (seconds = 10) => {
    setTesting(true);
    try {
      await sendTestPushNotification(seconds);
      setCountdown(seconds);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setTesting(false);
    }
  };

  const handleResync = async () => {
    setTesting(true);
    try {
      await subscribeToWebPush();
      await loadData();
    } finally {
      setTesting(false);
    }
  };

  const platformName = (() => {
    if (typeof navigator === 'undefined') return 'Unknown';
    if (/Android/i.test(navigator.userAgent)) return 'Android Device';
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'Apple iOS (iPhone/iPad)';
    if (/Windows/i.test(navigator.userAgent)) return 'Windows PC';
    if (/Macintosh|Mac OS X/i.test(navigator.userAgent)) return 'Apple macOS';
    if (/Linux/i.test(navigator.userAgent)) return 'Linux';
    return 'Desktop / Mobile';
  })();

  const browserName = (() => {
    if (typeof navigator === 'undefined') return 'Browser';
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'Microsoft Edge';
    if (/Chrome\//.test(ua)) return 'Google Chrome';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Apple Safari';
    if (/Firefox\//.test(ua)) return 'Mozilla Firefox';
    return 'Web Browser';
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <BellRing size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Web Push Diagnostics & Testing</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Verify background delivery across Windows, Android, and iPhone/iPad
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
            <RefreshCw size={24} className="animate-spin text-primary" />
            <span>Scanning device PushManager capabilities...</span>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Status Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-border bg-card/60 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Device & OS</span>
                <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                  {platformName.includes('Android') || platformName.includes('iOS') ? (
                    <Smartphone size={13} className="text-primary shrink-0" />
                  ) : (
                    <Laptop size={13} className="text-primary shrink-0" />
                  )}
                  {platformName}
                </span>
                <span className="text-[10px] text-muted-foreground">{browserName}</span>
              </div>

              <div className="p-2.5 rounded-xl border border-border bg-card/60 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">PWA Mode</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  {diagnostics?.isStandalone ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Installed PWA
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Browser Tab</span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {diagnostics?.isStandalone ? 'Standalone Window' : 'Running in browser'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl border border-border bg-card/60 flex flex-col gap-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Permission</span>
                <span className="font-semibold capitalize flex items-center gap-1.5">
                  {diagnostics?.permission === 'granted' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Granted
                    </span>
                  ) : diagnostics?.permission === 'denied' ? (
                    <span className="text-destructive font-bold flex items-center gap-1">
                      <AlertCircle size={13} /> Blocked
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-medium">Prompt Needed</span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {diagnostics?.hasSubscription ? 'Subscription Active' : 'Not Subscribed'}
                </span>
              </div>
            </div>

            {/* iOS Safari Home Screen Warning */}
            {isIOSRequiresHomeInstall() && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold">
                  <Smartphone size={14} className="shrink-0" />
                  <span>iPhone / iPad Action Required</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Apple only supports background Web Push for web apps added to your Home Screen.
                  <br />
                  1. Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari.
                  <br />
                  2. Select <strong>"Add to Home Screen"</strong>.
                  <br />
                  3. Open <strong>RiseWithMedia</strong> from your Home Screen, then tap <strong>Enable Notifications</strong>.
                </p>
              </div>
            )}

            {/* Test Actions */}
            <div className="p-3.5 rounded-xl border border-border bg-secondary/20 space-y-2.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Send size={13} className="text-primary" /> Test Background Push Delivery
              </span>

              {countdown !== null && (
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="animate-spin shrink-0" /> Close this tab now! Push fires in:
                  </span>
                  <span className="text-base font-black px-2 py-0.5 bg-primary text-primary-foreground rounded-lg">
                    {countdown}s
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTestNow}
                  disabled={testing}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send size={12} />
                  <span>Send Test Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleScheduledTest(10)}
                  disabled={testing}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                  title="Gives you 10 seconds to close the browser tab or lock your phone"
                >
                  <Clock size={12} />
                  <span>Schedule in 10s (Test Closed Tab)</span>
                </button>

                <button
                  type="button"
                  onClick={handleResync}
                  disabled={testing}
                  className="px-2.5 py-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  title="Re-synchronize subscription with server"
                >
                  <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
                  <span>Re-sync</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setTesting(true);
                    try {
                      const res = await api.post('/notifications/trigger-attendance-reminders');
                      toast.success(res.data?.message || 'Attendance reminders simulated!');
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to trigger attendance reminders');
                    } finally {
                      setTesting(false);
                    }
                  }}
                  disabled={testing}
                  className="px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  title="Simulate 9:00 - 9:30 AM Attendance Reminder for unclocked staff"
                >
                  <Clock size={12} />
                  <span>Test Attendance Check</span>
                </button>
              </div>
            </div>

            {/* Registered Devices on Backend */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Registered Devices ({diagnostics?.backend?.deviceCount || 0})</span>
                <span className="text-[10px] text-muted-foreground">Multi-device delivery active</span>
              </div>

              {(diagnostics?.backend?.devices || []).length === 0 ? (
                <div className="p-3 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                  No active push subscriptions registered in database. Click "Enable Notifications" or "Re-sync" above.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {diagnostics.backend.devices.map((dev, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl border border-border/80 bg-card/70 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-[11px] truncate flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {dev.provider}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {dev.endpointDomain} &nbsp;•&nbsp; Registered {new Date(dev.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Troubleshooting & OS Tips */}
            <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1">
                <HelpCircle size={13} className="text-primary" /> Background Delivery Tips
              </span>
              <ul className="space-y-1 text-[11px] text-muted-foreground list-disc pl-4 leading-relaxed">
                <li>
                  <strong>Android:</strong> Go to Phone Settings &gt; Apps &gt; Chrome/Browser &gt; Battery &gt; Set to <em>Unrestricted</em> (prevents aggressive OS battery killers from delaying background push).
                </li>
                <li>
                  <strong>Windows:</strong> Check that Windows <em>Focus Assist</em> or <em>Do Not Disturb</em> is not silencing desktop banners.
                </li>
                <li>
                  <strong>iPhone (iOS 16.4+):</strong> Must be launched from Home Screen. Ensure iOS Settings &gt; Notifications &gt; RiseWithMedia is turned ON.
                </li>
                <li>
                  <strong>Tab Closed vs Browser Closed:</strong> Notifications arrive when the website tab is closed as long as the browser or operating system push daemon remains active.
                </li>
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PushDiagnosticsModal;
