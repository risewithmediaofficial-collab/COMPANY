import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  Briefcase,
  Camera,
  Globe,
  KeyRound,
  Lock,
  Mail,
  Palette,
  Phone,
  Save,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { toggleDarkMode } from '../store/slices/uiSlice';
import { updateCurrentUser } from '../store/slices/authSlice';
import {
  useChangePassword,
  useSettings,
  useUpdateCompanySettings,
  useUpdatePreferences,
  useUpdateProfileSettings,
  useUploadProfileAvatar,
} from '../hooks/useSettings';
import { getAssetUrl } from '../utils/assetUrl';

const sections = [
  { id: 'profile', label: 'Profile Info', icon: User },
  { id: 'company', label: 'Company & GST Details', icon: Briefcase },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'permissions', label: 'Permissions', icon: Shield },
];

const Settings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.ui);
  const { data, isLoading } = useSettings();
  const updateProfile = useUpdateProfileSettings();
  const updateCompany = useUpdateCompanySettings();
  const uploadProfileAvatar = useUploadProfileAvatar();
  const updatePreferences = useUpdatePreferences();
  const changePassword = useChangePassword();
  const [activeSection, setActiveSection] = useState('profile');
  // Payment modal removed: purchases are disabled in this build.

  const settings = data?.settings;
  const profileUser = data?.user || user;
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
  });
  const [currentAvatar, setCurrentAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [companyProfile, setCompanyProfile] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    gstNumber: '',
    services: '',
    logoUrl: '',
  });

  const [preferences, setPreferences] = useState({
    notifications: {},
    appearance: {},
    regional: {},
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!profileUser) return;
    setProfileData({
      name: profileUser.name || '',
      email: profileUser.email || '',
      phone: profileUser.phone || '',
      department: profileUser.department || '',
      position: profileUser.position || '',
    });
    setCurrentAvatar(profileUser.avatar || '');
  }, [profileUser]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!settings) return;
    setPreferences({
      notifications: settings.notifications || {},
      appearance: settings.appearance || {},
      regional: settings.regional || {},
    });
    setCompanyProfile({
      name: settings.companyProfile?.name || '',
      address: settings.companyProfile?.address || '',
      email: settings.companyProfile?.email || '',
      phone: settings.companyProfile?.phone || '',
      gstNumber: settings.companyProfile?.gstNumber || '',
      services: settings.companyProfile?.services || '',
      logoUrl: settings.companyProfile?.logoUrl || '',
    });
  }, [settings]);

  const permissions = useMemo(() => {
    if (profileUser?.role === 'superAdmin' || profileUser?.role === 'admin') {
      return {
        canViewReports: true,
        canManageFinance: true,
        canManageLeads: true,
        canManageHR: true,
        canApproveContent: true,
        canAssignTasks: true,
        canUploadAssets: true,
        canViewAnalytics: true,
        canManageEmployees: true,
        canAccessSmm: true,
        canViewFinanceOverview: true,
      };
    }
    return profileUser?.permissions || {};
  }, [profileUser]);

  const handleProfileChange = (event) => {
    setProfileData({ ...profileData, [event.target.name]: event.target.value });
  };

  const saveProfile = async () => {
    const saved = await updateProfile.mutateAsync({
      name: profileData.name,
      phone: profileData.phone,
      department: profileData.department,
      position: profileData.position,
    });
    dispatch(updateCurrentUser(saved));
    return saved;
  };

  const removeAvatar = async () => {
    const saved = await updateProfile.mutateAsync({ avatar: '' });
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview('');
    setCurrentAvatar('');
    dispatch(updateCurrentUser(saved));
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(previewUrl);

    try {
      const uploadResult = await uploadProfileAvatar.mutateAsync(file);
      const uploadedUrl = uploadResult.url || uploadResult.file?.url || uploadResult.data?.url;

      if (!uploadedUrl) {
        toast.error('Profile picture uploaded, but the image URL was missing');
        setAvatarPreview('');
        URL.revokeObjectURL(previewUrl);
        return;
      }

      const saved = await updateProfile.mutateAsync({ avatar: uploadedUrl });
      setCurrentAvatar(saved.avatar || uploadedUrl);
      setAvatarPreview('');
      URL.revokeObjectURL(previewUrl);
      dispatch(updateCurrentUser(saved));
    } catch (_error) {
      setAvatarPreview('');
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handlePasswordFieldChange = (event) => {
    setPasswordData({ ...passwordData, [event.target.name]: event.target.value });
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    await changePassword.mutateAsync({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const savePreferences = async (nextPreferences = preferences) => {
    await updatePreferences.mutateAsync(nextPreferences);
  };

  const setNotification = (key, value) => {
    const next = {
      ...preferences,
      notifications: { ...preferences.notifications, [key]: value },
    };
    setPreferences(next);
    savePreferences(next);
  };

  const setRegional = (key, value) => {
    setPreferences({
      ...preferences,
      regional: { ...preferences.regional, [key]: value },
    });
  };

  if (isLoading) {
    return <div className="h-96 rounded-2xl border border-border bg-card animate-pulse" />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your profile, security, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === section.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <section.icon size={18} className="mr-3" />
              {section.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8"
          >
            {activeSection === 'profile' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-center gap-8 border-b border-border pb-8">
                  <div className="relative group">
                    <input
                      id="profile-avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl overflow-hidden">
                      {avatarPreview || currentAvatar ? <img src={getAssetUrl(avatarPreview || currentAvatar)} alt="" className="h-full w-full object-cover" /> : profileUser?.name?.charAt(0)}
                    </div>
                    <label
                      htmlFor="profile-avatar-upload"
                      aria-disabled={uploadProfileAvatar.isPending || updateProfile.isPending}
                      className={`absolute -bottom-2 -right-2 rounded-xl border border-border bg-card p-2 text-primary shadow-lg transition-all ${
                        uploadProfileAvatar.isPending || updateProfile.isPending
                          ? 'pointer-events-none opacity-60'
                          : 'cursor-pointer hover:bg-primary hover:text-white'
                      }`}
                    >
                      <Camera size={16} />
                    </label>
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xl font-bold">{profileUser?.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{profileUser?.role} / {profileUser?.department || 'Operations'}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {uploadProfileAvatar.isPending || updateProfile.isPending ? 'Uploading profile picture...' : 'Email changes are restricted to administrators.'}
                    </p>
                    <label
                      htmlFor="profile-avatar-upload"
                      className={`mt-4 inline-flex items-center rounded-xl border border-border px-4 py-2 text-sm font-bold transition-all ${
                        uploadProfileAvatar.isPending || updateProfile.isPending
                          ? 'pointer-events-none opacity-60'
                          : 'cursor-pointer hover:border-primary hover:text-primary'
                      }`}
                    >
                      <Camera size={16} className="mr-2" />
                      {currentAvatar ? 'Change Profile Picture' : 'Add Profile Picture'}
                    </label>
                    {currentAvatar ? (
                      <button
                        type="button"
                        onClick={removeAvatar}
                        disabled={updateProfile.isPending}
                        className="ml-2 mt-4 inline-flex items-center rounded-xl border border-destructive/20 px-4 py-2 text-sm font-bold text-destructive transition-all hover:bg-destructive/10 disabled:opacity-60"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    ['name', 'Full Name', User, 'text'],
                    ['email', 'Email Address', Mail, 'email'],
                    ['phone', 'Phone Number', Phone, 'text'],
                    ['department', 'Department', Briefcase, 'text'],
                    ['position', 'Position', Briefcase, 'text'],
                  ].map(([name, label, Icon, type]) => (
                    <div key={name} className="space-y-2">
                      <label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
                      <div className="relative">
                        <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type={type}
                          name={name}
                          value={profileData[name]}
                          onChange={handleProfileChange}
                          disabled={name === 'email'}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary/30 border border-border text-sm focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-70"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={saveProfile}
                    disabled={updateProfile.isPending}
                    className="flex items-center px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-60"
                  >
                    <Save size={18} className="mr-2" />
                    {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold">Notification Preferences</h3>
                  <p className="text-sm text-muted-foreground">Choose which updates should reach you.</p>
                </div>
                {[
                  ['email', 'Email notifications'],
                  ['inApp', 'In-app notifications'],
                  ['taskUpdates', 'Task updates'],
                  ['leadUpdates', 'Lead updates'],
                  ['financeAlerts', 'Finance alerts'],
                  ['dailyDigest', 'Daily digest'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-4">
                    <span className="text-sm font-semibold">{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(preferences.notifications?.[key])}
                      onChange={(event) => setNotification(key, event.target.checked)}
                      className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                ))}
              </div>
            )}

            {activeSection === 'company' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold">Company Details & GST Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure your agency name, GSTIN, address, contact details, and logo to appear on official invoices & proposals.</p>
                </div>

                <div className="rounded-2xl border border-border bg-secondary/20 p-5 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Company Name *</span>
                      <input value={companyProfile.name} onChange={(event) => setCompanyProfile((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground" placeholder="RISE WITH MEDIA" />
                    </label>
                    <label className="space-y-2">
                      <span className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">GSTIN / GST Number</span>
                      <input value={companyProfile.gstNumber} onChange={(event) => setCompanyProfile((current) => ({ ...current, gstNumber: event.target.value }))} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold tracking-wider text-primary" placeholder="29ABCDE1234F1Z5" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Company Logo Image / URL</span>
                      <div className="flex gap-3">
                        <input value={companyProfile.logoUrl} onChange={(event) => setCompanyProfile((current) => ({ ...current, logoUrl: event.target.value }))} className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="https://domain.com/logo.png" />
                        {companyProfile.logoUrl && (
                          <div className="h-11 w-11 shrink-0 rounded-xl border border-border bg-white p-1 shadow-sm flex items-center justify-center overflow-hidden">
                            <img src={getAssetUrl(companyProfile.logoUrl)} alt="Company Logo" className="h-full w-full object-contain" />
                          </div>
                        )}
                      </div>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Registered Office Address</span>
                      <textarea value={companyProfile.address} onChange={(event) => setCompanyProfile((current) => ({ ...current, address: event.target.value }))} rows={3} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Street Address, City, State, PIN Code" />
                    </label>
                    <label className="space-y-2">
                      <span className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Official Email</span>
                      <input value={companyProfile.email} onChange={(event) => setCompanyProfile((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="hello@risewithmedia.com" />
                    </label>
                    <label className="space-y-2">
                      <span className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Official Phone Number</span>
                      <input value={companyProfile.phone} onChange={(event) => setCompanyProfile((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="+91 9876543210" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Services / Agency Tagline</span>
                      <textarea value={companyProfile.services} onChange={(event) => setCompanyProfile((current) => ({ ...current, services: event.target.value }))} rows={2} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Social Media Management, Video Production, Meta & Google Ads, Web Development" />
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button onClick={() => updateCompany.mutate(companyProfile)} disabled={updateCompany.isPending} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-60">
                      {updateCompany.isPending ? 'Saving...' : 'Save Company Details & GST Settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold">Theme Preferences</h3>
                  <p className="text-sm text-muted-foreground">Customize how the platform looks for you.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => !darkMode && dispatch(toggleDarkMode())}
                    className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 ${darkMode ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-lg">
                      <Palette size={24} />
                    </div>
                    <span className="font-bold">Dark Mode</span>
                  </button>
                  <button
                    onClick={() => darkMode && dispatch(toggleDarkMode())}
                    className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 ${!darkMode ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center shadow-lg border border-border">
                      <Palette size={24} />
                    </div>
                    <span className="font-bold">Light Mode</span>
                  </button>
                </div>

                <div className="pt-8 border-t border-border">
                  <h3 className="text-lg font-bold mb-4">Regional Settings</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ['language', 'Language', ['en-US', 'en-GB', 'es-ES', 'fr-FR']],
                      ['timezone', 'Timezone', ['Asia/Calcutta', 'UTC', 'America/New_York', 'Europe/London']],
                      ['currency', 'Currency', ['INR']],
                    ].map(([key, label, options]) => (
                      <label key={key} className="space-y-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                        <select
                          value={preferences.regional?.[key] || options[0]}
                          onChange={(event) => setRegional(key, event.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        >
                          {options.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => savePreferences()}
                    disabled={updatePreferences.isPending}
                    className="mt-6 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    <Globe size={16} className="mr-2" />
                    Save Regional Settings
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold">Security</h3>
                  <p className="text-sm text-muted-foreground">Manage your password for this account.</p>
                </div>

                <div className="rounded-2xl border border-border bg-secondary/20 p-5 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Password management</p>
                      <p className="mt-1 text-sm text-muted-foreground">Change your password here, or keep using the reset-email flow from the sign-in screen if you ever get locked out.</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-3 text-primary">
                      <KeyRound size={18} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ['currentPassword', 'Current password'],
                      ['newPassword', 'New password'],
                      ['confirmPassword', 'Confirm new password'],
                    ].map(([name, label]) => (
                      <label key={name} className="space-y-2">
                        <span className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                        <input
                          type="password"
                          name={name}
                          value={passwordData[name]}
                          onChange={handlePasswordFieldChange}
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleChangePassword}
                      disabled={changePassword.isPending}
                      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-60"
                    >
                      {changePassword.isPending ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'permissions' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Role & Permissions</h3>
                <div className="rounded-xl border border-border bg-secondary/20 p-5">
                  <p className="text-sm font-semibold capitalize">{profileUser?.role}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Access is enforced by protected API routes and role checks.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-xl border border-border p-4">
                      <span className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={`text-xs font-bold ${value ? 'text-emerald-600' : 'text-muted-foreground'}`}>{value ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
