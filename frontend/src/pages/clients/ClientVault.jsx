import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Copy,
  Eye,
  EyeOff,
  LockKeyhole,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Check,
  AtSign,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Minus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useClients } from '../../hooks/useClients';
import {
  credentialTypes,
  useCreateCredential,
  useCredential,
  useCredentialsVault,
  useDeleteCredential,
  useUpdateCredential,
} from '../../hooks/useClientCredentials';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', emoji: '📸' },
  { value: 'facebook', label: 'Facebook', emoji: '📘' },
  { value: 'x', label: 'X (Twitter)', emoji: '🐦' },
  { value: 'youtube', label: 'YouTube', emoji: '▶️' },
  { value: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { value: 'threads', label: 'Threads', emoji: '🧵' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { value: 'snapchat', label: 'Snapchat', emoji: '👻' },
  { value: 'pinterest', label: 'Pinterest', emoji: '📌' },
  { value: 'other', label: 'Other', emoji: '🔗' },
];

const getPlatform = (value) => PLATFORMS.find((p) => p.value === value) || PLATFORMS[PLATFORMS.length - 1];

const emptyAccount = {
  platform: 'instagram',
  platformLabel: '',
  accountHandle: '',
  email: '',
  mobileNumber: '',
  password: '',
  recoveryEmail: '',
  notes: '',
  pages: [],
};

const emptyPage = { pageName: '', pageId: '', pageUrl: '', role: 'Admin' };

const PAGES_PLATFORMS = ['instagram', 'facebook'];

const emptyForm = {
  clientId: '',
  credentialName: '',
  credentialType: 'social_media',
  username: '',
  password: '',
  email: '',
  mobileNumber: '',
  url: '',
  notes: '',
  expiryDate: '',
  tags: '',
  socialAccounts: [],
};

const typeLabels = credentialTypes.reduce((labels, type) => {
  labels[type.value] = type.label;
  return labels;
}, {});

const getClientName = (credential) => {
  if (!credential?.clientId) return 'No client linked';
  return credential.clientId.company || credential.clientId.name || 'Unnamed client';
};

const FormField = ({ label, children, hint }) => (
  <div className="space-y-1.5 block">
    <label className="text-sm font-semibold text-foreground flex items-center justify-between select-none mb-1">
      <span>{label}</span>
    </label>
    {children}
    {hint && <span className="text-xs text-muted-foreground mt-1 block font-normal">{hint}</span>}
  </div>
);

// ─── Social Account Row (inside form) ────────────────────────────────────────
const SocialAccountRow = ({ account, index, onChange, onRemove, isEditing }) => {
  const [showPass, setShowPass] = useState(false);
  const platform = getPlatform(account.platform);
  const supportsPages = PAGES_PLATFORMS.includes(account.platform);

  const updatePage = (pi, field, value) => {
    const pages = [...(account.pages || [])];
    pages[pi] = { ...pages[pi], [field]: value };
    onChange(index, 'pages', pages);
  };

  const addPage = () => onChange(index, 'pages', [...(account.pages || []), { ...emptyPage }]);

  const removePage = (pi) =>
    onChange(index, 'pages', (account.pages || []).filter((_, i) => i !== pi));

  return (
    <div className="border border-border/80 rounded-2xl overflow-hidden bg-secondary/15 shadow-2xs transition-all">
      {/* Row header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-secondary/25">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-background border border-border text-base leading-none shadow-2xs">
            {platform.emoji}
          </span>
          <select
            value={account.platform}
            onChange={(e) => onChange(index, 'platform', e.target.value)}
            className="h-10 px-3 pr-8 rounded-xl border border-border bg-background text-sm font-semibold appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20 shadow-2xs"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {account.platform === 'other' && (
            <Input
              value={account.platformLabel}
              onChange={(e) => onChange(index, 'platformLabel', e.target.value)}
              placeholder="Platform name"
              className="h-10 text-sm w-36 rounded-xl"
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
          title="Remove this account"
        >
          <Minus size={15} />
        </button>
      </div>

      {/* Fields Linear Stack */}
      <div className="p-4 sm:p-5 space-y-4">
        <FormField label="Account Handle / Username">
          <Input
            value={account.accountHandle}
            onChange={(e) => onChange(index, 'accountHandle', e.target.value)}
            placeholder="@handle or username"
            className="h-11 text-sm rounded-xl font-mono px-3.5 focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </FormField>

        <FormField label="Email">
          <Input
            type="email"
            value={account.email}
            onChange={(e) => onChange(index, 'email', e.target.value)}
            placeholder="login@email.com"
            className="h-11 text-sm rounded-xl px-3.5 focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </FormField>

        <FormField label="Mobile Number">
          <Input
            value={account.mobileNumber}
            onChange={(e) => onChange(index, 'mobileNumber', e.target.value)}
            placeholder="+91 98765 43210"
            className="h-11 text-sm rounded-xl px-3.5 focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </FormField>

        <FormField label={isEditing ? 'Password (blank = keep existing)' : 'Password'}>
          <div className="relative">
            <Input
              type={showPass ? 'text' : 'password'}
              value={account.password}
              onChange={(e) => onChange(index, 'password', e.target.value)}
              placeholder={isEditing ? 'Leave blank to keep' : 'Enter password'}
              className="h-11 text-sm rounded-xl font-mono px-3.5 pr-10 focus:ring-2 focus:ring-primary/20 shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>

        <FormField label="Recovery Email (Optional)">
          <Input
            type="email"
            value={account.recoveryEmail}
            onChange={(e) => onChange(index, 'recoveryEmail', e.target.value)}
            placeholder="recovery@email.com"
            className="h-11 text-sm rounded-xl px-3.5 focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </FormField>

        <FormField label="Notes / 2FA Info">
          <Input
            value={account.notes}
            onChange={(e) => onChange(index, 'notes', e.target.value)}
            placeholder="2FA via app / SMS to +91..."
            className="h-11 text-sm rounded-xl px-3.5 focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </FormField>
      </div>
      {/* ── Pages sub-section (Facebook & Instagram only) ── */}
      {supportsPages && (
        <div className="border-t border-border/60 px-3 pb-3 pt-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span>{platform.emoji}</span>
              {account.platform === 'facebook' ? 'Facebook Pages' : 'Instagram Profiles / Pages'}
              <span className="text-muted-foreground font-normal">({(account.pages || []).length})</span>
            </p>
            <button
              type="button"
              onClick={addPage}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary px-2 py-1 rounded-lg border border-primary/30 hover:bg-primary/5 transition-all"
            >
              <PlusCircle size={11} />
              Add Page
            </button>
          </div>

          {(account.pages || []).length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-3 text-center text-[11px] text-muted-foreground">
              No pages added.{' '}
              <button type="button" onClick={addPage} className="text-primary font-semibold hover:underline">
                Add a {account.platform === 'facebook' ? 'Facebook Page' : 'Profile/Page'}
              </button>
            </div>
          )}

          {(account.pages || []).map((page, pi) => (
            <div key={pi} className="rounded-lg border border-border bg-background/70 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <span className="text-base">{account.platform === 'facebook' ? '📄' : '📋'}</span>
                  <span>Page {pi + 1}</span>
                  {page.pageName && (
                    <span className="text-muted-foreground font-normal">— {page.pageName}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removePage(pi)}
                  className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                >
                  <Minus size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Page Name">
                  <Input
                    value={page.pageName}
                    onChange={(e) => updatePage(pi, 'pageName', e.target.value)}
                    placeholder={account.platform === 'facebook' ? 'My Brand Page' : 'My Profile Name'}
                    className="h-8 text-xs rounded-lg"
                  />
                </FormField>
                <FormField label="Role">
                  <select
                    value={page.role}
                    onChange={(e) => updatePage(pi, 'role', e.target.value)}
                    className="w-full h-8 px-2.5 pr-7 rounded-lg border border-border bg-background text-xs appearance-none cursor-pointer"
                  >
                    {['Admin', 'Editor', 'Moderator', 'Advertiser', 'Analyst', 'Other'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Ad Account Number (Optional)">
                  <Input
                    value={page.pageId}
                    onChange={(e) => updatePage(pi, 'pageId', e.target.value)}
                    placeholder="123456789"
                    className="h-8 text-xs rounded-lg font-mono"
                  />
                </FormField>
                <FormField label="Page URL (Optional)">
                  <Input
                    value={page.pageUrl}
                    onChange={(e) => updatePage(pi, 'pageUrl', e.target.value)}
                    placeholder="facebook.com/mypagename"
                    className="h-8 text-xs rounded-lg"
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Revealed Social Account Detail Row (in card) ────────────────────────────
const RevealedAccountRow = ({ account, copiedId, onCopy }) => {
  const [showPass, setShowPass] = useState(false);
  const platform = getPlatform(account.platform);

  return (
    <div className="rounded-lg border border-border/50 bg-background/60 p-2.5 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 font-bold text-foreground">
        <span>{platform.emoji}</span>
        <span>{account.platformLabel || platform.label}</span>
        {account.pages && account.pages.length > 0 && (
          <span className="ml-auto text-[10px] font-normal text-muted-foreground">
            {account.pages.length} page{account.pages.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        {account.accountHandle && (
          <>
            <span className="text-muted-foreground">Handle</span>
            <div className="flex items-center gap-1 font-mono font-medium">
              <span className="truncate max-w-[110px]">{account.accountHandle}</span>
              <button onClick={() => onCopy(account.accountHandle, `handle-${account._id}`)}>
                {copiedId === `handle-${account._id}` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
              </button>
            </div>
          </>
        )}
        {account.email && (
          <>
            <span className="text-muted-foreground">Email</span>
            <div className="flex items-center gap-1 font-mono font-medium">
              <span className="truncate max-w-[110px]">{account.email}</span>
              <button onClick={() => onCopy(account.email, `aemail-${account._id}`)}>
                {copiedId === `aemail-${account._id}` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
              </button>
            </div>
          </>
        )}
        {account.mobileNumber && (
          <>
            <span className="text-muted-foreground">Mobile</span>
            <div className="flex items-center gap-1 font-mono font-medium">
              <span>{account.mobileNumber}</span>
              <button onClick={() => onCopy(account.mobileNumber, `amob-${account._id}`)}>
                {copiedId === `amob-${account._id}` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
              </button>
            </div>
          </>
        )}
        {(account.hasPassword !== false || account.password) && (
          <>
            <span className="text-muted-foreground">Password</span>
            <div className="flex items-center gap-1">
              {account.password ? (
                <>
                  <span className="font-mono font-medium">{showPass ? account.password : '••••••••'}</span>
                  <button onClick={() => setShowPass((v) => !v)}>{showPass ? <EyeOff size={10} /> : <Eye size={10} />}</button>
                  {showPass && (
                    <button onClick={() => onCopy(account.password, `apass-${account._id}`)}>
                      {copiedId === `apass-${account._id}` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                    </button>
                  )}
                </>
              ) : (
                <span className="font-mono text-muted-foreground">••••••••</span>
              )}
            </div>
          </>
        )}
        {account.recoveryEmail && (
          <>
            <span className="text-muted-foreground">Recovery</span>
            <span className="font-mono font-medium truncate max-w-[110px]">{account.recoveryEmail}</span>
          </>
        )}
        {account.notes && (
          <>
            <span className="text-muted-foreground">Notes</span>
            <span className="text-foreground">{account.notes}</span>
          </>
        )}
      </div>

      {/* Pages list */}
      {account.pages && account.pages.length > 0 && (
        <div className="mt-2 space-y-1.5 pt-2 border-t border-border/40">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {platform.emoji} {platform.label === 'Facebook' ? 'Facebook Pages' : 'Pages / Profiles'}
          </p>
          {account.pages.map((page, pi) => (
            <div key={pi} className="flex items-start justify-between gap-2 rounded-md bg-secondary/40 px-2 py-1.5 text-[11px]">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground truncate">{page.pageName || '—'}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">{page.role}</span>
                </div>
                {page.pageId && <p className="text-muted-foreground font-mono">ID: {page.pageId}</p>}
              </div>
              {page.pageUrl && (
                <a
                  href={page.pageUrl.startsWith('http') ? page.pageUrl : `https://${page.pageUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-primary hover:underline flex items-center gap-0.5"
                >
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CredentialFormDialog = ({ open, onOpenChange, credential, clients, onSave, saving }) => {
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(credential?._id);

  useEffect(() => {
    if (!open) return;
    setForm({
      clientId: credential?.clientId?._id || credential?.clientId || '',
      credentialName: credential?.credentialName || '',
      credentialType: credential?.credentialType || 'social_media',
      username: credential?.username || '',
      password: '',
      email: credential?.email || '',
      mobileNumber: credential?.mobileNumber || '',
      url: credential?.url || '',
      notes: credential?.notes || '',
      expiryDate: credential?.expiryDate ? credential.expiryDate.slice(0, 10) : '',
      tags: Array.isArray(credential?.tags) ? credential.tags.join(', ') : credential?.tags || '',
      socialAccounts: (credential?.socialAccounts || []).map((acc) => ({ ...acc, password: '' })),
    });
  }, [credential, open]);

  const updateField = (field, value) => setForm((cur) => ({ ...cur, [field]: value }));

  const updateAccount = (index, field, value) => {
    setForm((cur) => {
      const accounts = [...cur.socialAccounts];
      accounts[index] = { ...accounts[index], [field]: value };
      return { ...cur, socialAccounts: accounts };
    });
  };

  const addAccount = () =>
    setForm((cur) => ({ ...cur, socialAccounts: [...cur.socialAccounts, { ...emptyAccount }] }));

  const removeAccount = (index) =>
    setForm((cur) => ({ ...cur, socialAccounts: cur.socialAccounts.filter((_, i) => i !== index) }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      clientId: form.clientId || undefined,
      expiryDate: form.expiryDate || undefined,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (isEditing && !payload.password) {
      delete payload.password;
    }

    await onSave({ id: credential?._id, data: payload });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" noPadding hideCloseButton className="max-w-2xl bg-card border border-border p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 pr-6 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <LockKeyhole size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {isEditing ? 'Edit Client Credential' : 'Add Secure Credential'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                Credentials are encrypted with agency-grade AES security before storage.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
              <X size={16} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            {/* Linear One-by-One Field Flow (Google Form Style) */}
            <div className="space-y-6">
              <FormField label="Client *">
                <select
                  value={form.clientId}
                  onChange={(e) => updateField('clientId', e.target.value)}
                  required
                  className="w-full h-11 px-3.5 pr-8 rounded-xl border border-border bg-background text-sm font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20 shadow-2xs"
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.company || c.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Category Type *">
                <select
                  value={form.credentialType}
                  onChange={(e) => updateField('credentialType', e.target.value)}
                  required
                  className="w-full h-11 px-3.5 pr-8 rounded-xl border border-border bg-background text-sm font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20 shadow-2xs"
                >
                  {credentialTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Credential Name / Account Title *">
                <Input
                  value={form.credentialName}
                  onChange={(e) => updateField('credentialName', e.target.value)}
                  placeholder="e.g. Client Brand Social Accounts, Meta Business Manager"
                  required
                  className="h-11 text-sm rounded-xl px-4 focus:ring-2 focus:ring-primary/20 shadow-2xs placeholder:text-muted-foreground/60"
                />
              </FormField>
            </div>

            {/* ── Primary Credential Card (Linear Flow) ── */}
            <div className="rounded-2xl border border-border/80 bg-secondary/15 p-5 sm:p-6 space-y-5 shadow-2xs">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <LockKeyhole size={16} className="text-primary" /> Primary / Master Credential
              </p>
              <div className="space-y-5">
                <FormField label="Username / Email / Account ID">
                  <Input
                    value={form.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    placeholder="login@brand.com or @handle"
                    className="h-11 text-sm rounded-xl px-4 focus:ring-2 focus:ring-primary/20 shadow-2xs placeholder:text-muted-foreground/60"
                  />
                </FormField>

                <FormField label={isEditing ? 'New Password (leave blank to keep)' : 'Password / API Secret'}>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder={isEditing ? 'Leave blank to keep existing' : 'Enter password'}
                    className="h-11 text-sm rounded-xl px-4 font-mono focus:ring-2 focus:ring-primary/20 shadow-2xs placeholder:text-muted-foreground/60"
                  />
                </FormField>

                <FormField label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="primary@email.com"
                    className="h-11 text-sm rounded-xl px-4 focus:ring-2 focus:ring-primary/20 shadow-2xs placeholder:text-muted-foreground/60"
                  />
                </FormField>

                <FormField label="Mobile Number">
                  <Input
                    value={form.mobileNumber}
                    onChange={(e) => updateField('mobileNumber', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-11 text-sm rounded-xl px-4 focus:ring-2 focus:ring-primary/20 shadow-2xs placeholder:text-muted-foreground/60"
                  />
                </FormField>

                <FormField label="Login URL / Portal Link">
                  <Input
                    value={form.url}
                    onChange={(e) => updateField('url', e.target.value)}
                    placeholder="https://business.facebook.com"
                    className="h-11 text-sm rounded-xl px-4 focus:ring-2 focus:ring-primary/20 shadow-2xs placeholder:text-muted-foreground/60"
                  />
                </FormField>

                <FormField label="Expiry Date (Optional)">
                  <Input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => updateField('expiryDate', e.target.value)}
                    className="h-11 text-sm rounded-xl px-4 focus:ring-2 focus:ring-primary/20 shadow-2xs"
                  />
                </FormField>

                <FormField label="Tags (Comma separated)">
                  <Input
                    value={form.tags}
                    onChange={(e) => updateField('tags', e.target.value)}
                    placeholder="social, instagram, meta, ads"
                    className="h-11 text-sm rounded-xl px-4 focus:ring-2 focus:ring-primary/20 shadow-2xs placeholder:text-muted-foreground/60"
                  />
                </FormField>

                <FormField label="Security Notes / 2FA Instructions">
                  <Textarea
                    value={form.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="e.g. 2FA sent to client phone number (+91 98765 43210)"
                    className="min-h-[90px] text-sm rounded-xl p-3.5 focus:ring-2 focus:ring-primary/20 shadow-2xs placeholder:text-muted-foreground/60"
                  />
                </FormField>
              </div>
            </div>

            {/* ── Platform Accounts (Linear Flow) ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AtSign size={16} className="text-primary" /> Platform Accounts
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (Instagram, Facebook, X, YouTube, etc.)
                  </span>
                </p>
                <button
                  type="button"
                  onClick={addAccount}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-all px-3 py-1.5 rounded-xl border border-primary/30 hover:bg-primary/5 cursor-pointer shadow-2xs"
                >
                  <PlusCircle size={14} />
                  Add Platform
                </button>
              </div>

              {form.socialAccounts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground bg-secondary/10">
                  No platform accounts added yet.{' '}
                  <button type="button" onClick={addAccount} className="text-primary font-bold hover:underline cursor-pointer">
                    Add one
                  </button>{' '}
                  to store Instagram, Facebook, X, YouTube passwords.
                </div>
              )}

              {form.socialAccounts.map((account, index) => (
                <SocialAccountRow
                  key={index}
                  account={account}
                  index={index}
                  onChange={updateAccount}
                  onRemove={removeAccount}
                  isEditing={isEditing}
                />
              ))}
            </div>
          </div>

          {/* Modern Pinned Sticky Bottom Action Bar */}
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-end gap-3 z-10 shadow-xs select-none">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Store Securely'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function ClientVault() {
  const { user } = useSelector((state) => state.auth);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [activePasswordId, setActivePasswordId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

  const { data: clients = [] } = useClients();
  const { data: credentials = [], isLoading } = useCredentialsVault();
  const { data: revealedCredential } = useCredential(activePasswordId);
  const createMutation = useCreateCredential();
  const updateMutation = useUpdateCredential();
  const deleteMutation = useDeleteCredential();

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = async ({ id, data }) => {
    if (id) {
      await updateMutation.mutateAsync({ id, data });
    } else {
      await createMutation.mutateAsync({ clientId: data.clientId, data });
    }
  };

  const toggleCard = (id) => setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));

  const filteredCredentials = useMemo(() => {
    return credentials.filter((item) => {
      const q = search.toLowerCase();
      const name = (item.credentialName || '').toLowerCase();
      const client = getClientName(item).toLowerCase();
      const username = (item.username || '').toLowerCase();
      const tags = (Array.isArray(item.tags) ? item.tags.join(' ') : '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || client.includes(q) || username.includes(q) || tags.includes(q);
      const matchesType = typeFilter === 'all' || item.credentialType === typeFilter;
      const matchesClient = clientFilter === 'all' || (item.clientId?._id || item.clientId) === clientFilter;

      return matchesSearch && matchesType && matchesClient;
    });
  }, [credentials, search, typeFilter, clientFilter]);

  // Statistics
  const total = credentials.length;
  const socialCount = credentials.filter((c) => c.credentialType === 'social_media' || c.credentialType === 'instagram' || c.credentialType === 'facebook').length;
  const totalPlatformAccounts = credentials.reduce((sum, c) => sum + (c.socialAccounts?.length || 0), 0);
  const adCount = credentials.filter((c) => c.credentialType === 'meta_ads' || c.credentialType === 'google_ads' || c.credentialType === 'ad_account').length;

  // Table Columns
  const tableColumns = [
    {
      key: 'credentialName',
      label: 'Account / Title',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            <LockKeyhole size={14} />
          </div>
          <div>
            <p className="font-bold text-foreground">{item.credentialName}</p>
            <p className="text-[11px] text-muted-foreground">🏢 {getClientName(item)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'credentialType',
      label: 'Category',
      render: (item) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-foreground capitalize">
          {typeLabels[item.credentialType] || item.credentialType}
        </span>
      ),
    },
    {
      key: 'platforms',
      label: 'Platforms',
      render: (item) => {
        const accounts = item.socialAccounts || [];
        if (accounts.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {accounts.slice(0, 5).map((acc, i) => (
              <span key={i} className="text-sm" title={getPlatform(acc.platform).label}>
                {getPlatform(acc.platform).emoji}
              </span>
            ))}
            {accounts.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{accounts.length - 5}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (item) => (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {item.email && (
            <div className="flex items-center gap-1">
              <Mail size={10} />
              <span>{item.email}</span>
            </div>
          )}
          {item.mobileNumber && (
            <div className="flex items-center gap-1">
              <Phone size={10} />
              <span>{item.mobileNumber}</span>
            </div>
          )}
          {!item.email && !item.mobileNumber && <span>—</span>}
        </div>
      ),
    },
    {
      key: 'username',
      label: 'Username',
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-foreground">{item.username || '—'}</span>
          {item.username && (
            <button
              onClick={() => handleCopy(item.username, `user-${item._id}`)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Copy username"
            >
              {copiedId === `user-${item._id}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'password',
      label: 'Password',
      render: (item) => {
        const isRevealed = activePasswordId === item._id && Boolean(revealedCredential?.password);
        const passText = isRevealed ? revealedCredential.password : '••••••••••••';
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-foreground font-semibold">{passText}</span>
            <button
              onClick={() => setActivePasswordId(activePasswordId === item._id ? null : item._id)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title={isRevealed ? 'Hide' : 'Reveal'}
            >
              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            {isRevealed && (
              <button
                onClick={() => handleCopy(revealedCredential.password, `pass-${item._id}`)}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                title="Copy Password"
              >
                {copiedId === `pass-${item._id}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'url',
      label: 'Portal URL',
      render: (item) =>
        item.url ? (
          <a
            href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <span>Open Link</span>
            <ExternalLink size={11} />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      render: (item) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setSelectedCredential(item);
              setOpenDialog(true);
            }}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteId(item._id)}
            className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Cards Renderer
  const renderCard = (item) => {
    const isRevealed = activePasswordId === item._id && Boolean(revealedCredential?.password);
    const isExpanded = expandedCards[item._id];
    const accounts = item.socialAccounts || [];

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary uppercase tracking-wider">
            {typeLabels[item.credentialType] || item.credentialType}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSelectedCredential(item);
                setOpenDialog(true);
              }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground"
              title="Edit"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => setDeleteId(item._id)}
              className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-sm text-foreground">{item.credentialName}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">🏢 {getClientName(item)}</p>
        </div>

        {/* Primary credential */}
        <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">User:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-medium">{item.username || '—'}</span>
              {item.username && (
                <button onClick={() => handleCopy(item.username, `user-${item._id}`)}>
                  {copiedId === `user-${item._id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pass:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-medium">{isRevealed ? revealedCredential.password : '••••••••'}</span>
              <button onClick={() => setActivePasswordId(activePasswordId === item._id ? null : item._id)}>
                {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
              {isRevealed && (
                <button onClick={() => handleCopy(revealedCredential.password, `pass-${item._id}`)}>
                  {copiedId === `pass-${item._id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                </button>
              )}
            </div>
          </div>

          {item.email && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium truncate max-w-[130px]">{item.email}</span>
                <button onClick={() => handleCopy(item.email, `cemail-${item._id}`)}>
                  {copiedId === `cemail-${item._id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          )}

          {item.mobileNumber && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mobile:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium">{item.mobileNumber}</span>
                <button onClick={() => handleCopy(item.mobileNumber, `cmob-${item._id}`)}>
                  {copiedId === `cmob-${item._id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Platform accounts expandable */}
        {accounts.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => {
                setActivePasswordId(item._id);
                toggleCard(item._id);
              }}
              className="w-full flex items-center justify-between text-xs font-semibold text-foreground px-2.5 py-2 rounded-lg border border-border hover:bg-secondary transition-all"
            >
              <span className="flex items-center gap-1.5">
                <AtSign size={12} />
                {accounts.length} Platform Account{accounts.length > 1 ? 's' : ''}
                <span className="text-muted-foreground font-normal text-[10px]">
                  {accounts.map((a) => getPlatform(a.platform).emoji).join(' ')}
                </span>
              </span>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {isExpanded && (
              <div className="space-y-2">
                {accounts.map((acc, i) => {
                  const revealedAcc =
                    isRevealed && revealedCredential?.socialAccounts?.[i]
                      ? { ...acc, password: revealedCredential.socialAccounts[i].password }
                      : acc;
                  return (
                    <RevealedAccountRow key={i} account={revealedAcc} copiedId={copiedId} onCopy={handleCopy} />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {item.url && (
          <a
            href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs text-primary hover:bg-secondary transition-all font-semibold"
          >
            <span>Open Login Portal</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    );
  };

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Client Lifecycle', 'Client Vault']}
      title="Client Vault & Credentials"
      subtitle="Encrypted credential repository for client social media accounts, CMS, domain hosting, ad managers, and brand assets."
      icon="🔐"
      properties={[
        { label: 'Total Vault Items', value: total, icon: LockKeyhole },
        { label: 'Social Logins', value: socialCount, tone: 'info' },
        { label: 'Platform Accounts', value: totalPlatformAccounts, tone: 'neutral' },
        { label: 'Ad Accounts', value: adCount, tone: 'warning' },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setSelectedCredential(null);
            setOpenDialog(true);
          }}
          className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Add Credential</span>
        </Button>
      }
    >
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {['all', 'social_media', 'meta_ads', 'google_ads', 'wordpress', 'hosting', 'domain'].map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${typeFilter === type
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
          >
            {type === 'all' ? 'All Categories' : typeLabels[type] || type.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <DatabaseView
        viewKey="rwm_vault_view_v1"
        views={['cards', 'table']}
        items={filteredCredentials}
        totalCount={filteredCredentials.length}
        searchPlaceholder="Search by account title, client name, username, or tags..."
        columns={tableColumns}
        renderCard={renderCard}
        onSearchChange={setSearch}
      />

      <CredentialFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        credential={selectedCredential}
        clients={clients}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Credential?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this credential from the secure vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}
