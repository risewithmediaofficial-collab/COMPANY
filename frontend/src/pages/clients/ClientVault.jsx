import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  CalendarClock,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link as LinkIcon,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Tags,
  UserRound,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  Building2,
  Check,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
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

const emptyForm = {
  clientId: '',
  credentialName: '',
  credentialType: 'password',
  username: '',
  password: '',
  url: '',
  notes: '',
  information: '',
  expiryDate: '',
  tags: '',
};

const typeLabels = credentialTypes.reduce((labels, type) => {
  labels[type.value] = type.label;
  return labels;
}, {});

const getClientName = (credential) => {
  if (!credential?.clientId) return 'No client linked';
  return credential.clientId.company || credential.clientId.name || 'Unnamed client';
};

const formatDate = (value) => {
  if (!value) return 'No expiry';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

const FormField = ({ label, children }) => (
  <label className="space-y-1.5 text-xs font-semibold text-foreground block">
    <span>{label}</span>
    {children}
  </label>
);

const CredentialFormDialog = ({ open, onOpenChange, credential, clients, onSave, saving }) => {
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(credential?._id);

  useEffect(() => {
    if (!open) return;
    setForm({
      clientId: credential?.clientId?._id || credential?.clientId || '',
      credentialName: credential?.credentialName || '',
      credentialType: credential?.credentialType || 'password',
      username: credential?.username || '',
      password: '',
      url: credential?.url || '',
      notes: credential?.notes || '',
      information: credential?.information || '',
      expiryDate: credential?.expiryDate ? credential.expiryDate.slice(0, 10) : '',
      tags: Array.isArray(credential?.tags) ? credential.tags.join(', ') : credential?.tags || '',
    });
  }, [credential, open]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      clientId: form.clientId || undefined,
      expiryDate: form.expiryDate || undefined,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
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
      <DialogContent className="max-w-xl bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-black text-foreground">
            {isEditing ? 'Edit Client Credential' : 'Add Secure Credential'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Credentials are encrypted with agency-grade AES security before storage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Client *">
              <select
                value={form.clientId}
                onChange={(e) => updateField('clientId', e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
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
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
              >
                {credentialTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Credential Name / Account Title *">
            <Input
              value={form.credentialName}
              onChange={(e) => updateField('credentialName', e.target.value)}
              placeholder="e.g. Instagram Official Account, Meta Business Manager"
              required
              className="h-9 text-xs rounded-xl"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Username / Email / Account ID">
              <Input
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="login@brand.com or @handle"
                className="h-9 text-xs rounded-xl"
              />
            </FormField>

            <FormField label={isEditing ? 'New Password (Leave blank to keep)' : 'Password / API Secret *'}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder={isEditing ? 'Leave blank to keep existing' : 'Enter password'}
                required={!isEditing}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Login URL / Portal Link">
              <Input
                value={form.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://instagram.com or business.facebook.com"
                className="h-9 text-xs rounded-xl"
              />
            </FormField>

            <FormField label="Expiry Date (Optional)">
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => updateField('expiryDate', e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </FormField>
          </div>

          <FormField label="Tags (Comma separated)">
            <Input
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="social, instagram, meta, ads"
              className="h-9 text-xs rounded-xl"
            />
          </FormField>

          <FormField label="Security Notes / 2FA Instructions">
            <Textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="e.g. 2FA sent to client phone number (+91 98765 43210)"
              rows={2}
              className="text-xs rounded-xl"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="rounded-xl text-xs font-bold">
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
      await createMutation.mutateAsync(data);
    }
  };

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
  const hostingCount = credentials.filter((c) => c.credentialType === 'hosting' || c.credentialType === 'domain' || c.credentialType === 'cpanel' || c.credentialType === 'wordpress').length;
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
      key: 'username',
      label: 'Username / Email',
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
        </div>

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
        { label: 'Hosting & CMS', value: hostingCount, tone: 'neutral' },
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
            className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
              typeFilter === type
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
        views={['table', 'cards']}
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
