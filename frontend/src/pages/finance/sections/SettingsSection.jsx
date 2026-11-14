import React, { useState, useEffect } from 'react';
import {
  Settings,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Landmark,
  Building,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  History,
} from '@/components/ui/muiIcons';
import api from '../../../api';
import { useFinanceAccounts } from '../../../hooks/useFinance';
import { formatINR } from '../../../utils/financeFormatters';
import { toast } from 'sonner';

export default function SettingsSection({ onLockFinance }) {
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Bank Accounts State
  const { data: accounts = [], isLoading: accLoading, refetch: refetchAcc } = useFinanceAccounts();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({
    accountName: '',
    accountType: 'Bank',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    openingBalance: '',
  });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      toast.error('New password must be at least 4 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setSubmittingPassword(true);
      const res = await api.post('/finance/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (res.data?.success) {
        toast.success('Finance password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/accounts', {
        ...accountForm,
        openingBalance: Number(accountForm.openingBalance) || 0,
      });
      toast.success('Account added');
      setShowAccountModal(false);
      setAccountForm({
        accountName: '',
        accountType: 'Bank',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        openingBalance: '',
      });
      refetchAcc();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add account');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ── 1. FINANCE SECURITY & SEPARATE PASSWORD SETTINGS ──────────── */}
      <div className="bg-card rounded-2xl p-5 sm:p-6 border border-border/40 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Finance Portal Security & Separate Login
              </h2>
              <p className="text-xs text-muted-foreground">
                Protect sensitive company financial records with a dedicated access password
              </p>
            </div>
          </div>

          {onLockFinance && (
            <button
              type="button"
              onClick={onLockFinance}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-xs transition-colors cursor-pointer"
            >
              <Lock size={13} />
              <span>Lock Finance Portal Now</span>
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-2">
          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <KeyRound size={15} className="text-primary" />
              <span>Change Finance Master Password</span>
            </h3>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Current Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter current password (or default RiseFinance@2026)"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">New Finance Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
              </button>

              <button
                type="submit"
                disabled={submittingPassword}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-60"
              >
                {submittingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Security Notice & Instructions */}
          <div className="p-4 rounded-xl bg-secondary/40 border border-border/30 text-xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Lock size={15} className="text-primary" />
                <span>Restricted Access Protocol</span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                When any team member clicks <strong>Finance Hub</strong> from the CRM navigation bar, it automatically opens in a <strong>separate browser tab</strong> and requires authentication using this Finance Password.
              </p>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Default setup password is <code className="px-1.5 py-0.5 rounded bg-card font-mono font-bold text-foreground border border-border/50">RiseFinance@2026</code>. Once changed, all future logins require the updated password.
              </p>
            </div>

            <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
              Session status: <span className="font-bold text-emerald-600 dark:text-emerald-400">Authenticated & Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. BANK, UPI & CASH ACCOUNTS ────────────────────────────── */}
      <div className="bg-card rounded-2xl p-5 sm:p-6 border border-border/40 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Landmark size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Bank, Cash & UPI Accounts
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage agency operating bank accounts, UPI handles and cash reserves
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAccountModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Account</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accLoading ? (
            <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
              No financial accounts configured yet.
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc._id}
                className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">{acc.accountName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary uppercase">
                    {acc.accountType}
                  </span>
                </div>
                {acc.bankName && (
                  <p className="text-muted-foreground">{acc.bankName}</p>
                )}
                {acc.accountNumber && (
                  <p className="font-mono text-muted-foreground text-[11px]">
                    •••• {acc.accountNumber.slice(-4)}
                  </p>
                )}
                <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Current Balance</span>
                  <span className="font-bold text-foreground tabular-nums text-sm">
                    {formatINR(acc.currentBalance ?? acc.openingBalance ?? 0)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
