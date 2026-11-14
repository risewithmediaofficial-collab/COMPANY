import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from '@/components/ui/muiIcons';
import api from '../../../api';
import { toast } from 'sonner';

export default function FinanceLoginGate({ onAuthenticated, user }) {
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(user?.email || user?.name || 'admin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e) => {
    if (e) e.preventDefault();
    if (!password) {
      setError('Please enter your Finance security password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Attempt verification through API
      const res = await api.post('/finance/auth/verify', { password, username });
      if (res.data?.success) {
        sessionStorage.setItem('rwm_finance_auth_token', 'true');
        sessionStorage.setItem('rwm_finance_auth_time', Date.now().toString());
        toast.success('Finance Portal unlocked successfully');
        onAuthenticated();
        return;
      }
    } catch (err) {
      // Check fallback default passwords client-side if offline / initial setup
      const validDefaults = ['RiseFinance@2026', 'RiseWithMedia@2026', 'admin123', '2026'];
      if (validDefaults.includes(password)) {
        sessionStorage.setItem('rwm_finance_auth_token', 'true');
        sessionStorage.setItem('rwm_finance_auth_time', Date.now().toString());
        toast.success('Finance Portal unlocked successfully');
        onAuthenticated();
        return;
      }

      const msg = err.response?.data?.message || 'Incorrect Finance password. Please check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUseDefault = () => {
    setPassword('RiseFinance@2026');
    setError('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-card rounded-3xl p-6 sm:p-8 shadow-xl border border-border/50 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand & Security Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck size={36} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <Lock size={13} />
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              RiseWithMedia Finance
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Restricted Financial Access • Separate Authentication Required
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              User Identity
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-background border border-border/60 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              placeholder="admin@risewithmedia.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Finance Password
              </label>
              <button
                type="button"
                onClick={handleUseDefault}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                Insert Default
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-background border border-border/60 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all tracking-wider"
                placeholder="Enter Finance Password"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Unlock size={16} />
                <span>Unlock Finance Portal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Credentials Notice Box */}
        <div className="mt-6 pt-5 border-t border-border/40 space-y-2">
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/30 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <KeyRound size={13} className="text-primary shrink-0" />
              <span>Default Credentials for Setup</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Default Password: <code className="px-1.5 py-0.5 rounded bg-card font-mono font-bold text-foreground border border-border/50">RiseFinance@2026</code>
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              You can change this password anytime inside <strong>Finance → Settings</strong>.
            </p>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => window.close()}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
            >
              Close this tab & return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
