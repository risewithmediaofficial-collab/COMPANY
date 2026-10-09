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
  Eye,
  EyeOff,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Send,
  Laptop,
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
import api from '../api';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
  triggerBannerNotification,
  isBrowserNotificationSupported,
} from '../utils/browserNotification';
import { sendTestPushNotification } from '../utils/webPush';

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
  const [showPasswordFields, setShowPasswordFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [browserPermission, setBrowserPermission] = useState(() => getBrowserNotificationPermission());
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isTestingDelayed, setIsTestingDelayed] = useState(false);
  const [delayedCountdown, setDelayedCountdown] = useState(null);
  const [bannerSoundMuted, setBannerSoundMuted] = useState(() => {
    return localStorage.getItem('rwm_banner_sound_muted') === 'true';
  });

  const toggleBannerSound = () => {
    const next = !bannerSoundMuted;
    setBannerSoundMuted(next);
    localStorage.setItem('rwm_banner_sound_muted', String(next));
    toast.success(next ? 'Banner notification sound muted' : 'Banner notification sound unmuted');
  };

  const handleEnableBrowserNotifications = async () => {
    const res = await requestBrowserNotificationPermission();
    const updatedPerm = res?.permission || getBrowserNotificationPermission();
    setBrowserPermission(updatedPerm);
    window.dispatchEvent(new CustomEvent('rwm-push-state-changed', { detail: { active: updatedPerm === 'granted' } }));
    if (updatedPerm === 'granted') {
      toast.success('Banner notifications enabled on this device!');
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      // 1. In-App Floating Banner
      triggerBannerNotification({
        title: '🔔 Banner Notification Working!',
        message: 'Your in-app floating banner and system desktop notifications are verified and active.',
        link: '/settings',
        type: 'success',
      });

      // 2. Direct browser OS banner notification
      await sendBrowserNotification({
        title: '🔔 Banner Notification Active!',
        message: 'Rise With Media system desktop alerts are connected successfully.',
        link: '/settings',
      });

      // 3. Real-time notification through backend Socket.io pipeline
      await api.post('/notifications/test');
      toast.success('Test notification dispatched to banner and system!');
    } catch (err) {
      console.error('Test notification failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to trigger test notification');
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleDelayedPushTest = async () => {
    setIsTestingDelayed(true);
    try {
      await sendTestPushNotification(10);
      setDelayedCountdown(10);
      const timer = setInterval(() => {
        setDelayedCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsTestingDelayed(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setIsTestingDelayed(false);
    }
  };

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

    try {
      await changePassword.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      // Error handled by mutation onError toast
    }
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
                  <p className="text-sm text-muted-foreground">Manage your real-time desktop push alerts and event preferences.</p>
                </div>

                {/* Native Desktop / Browser Push Notifications Card */}
                <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <BellRing size={20} className="animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          Banner & Push Notifications
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                            Heads-Up & Desktop
                          </span>
                        </h4>
                        <p className="text-xs text-muted-foreground">Receive instant popup banner alerts on your device for tasks, leads, and messages even when the app is closed.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {browserPermission === 'granted' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 size={13} /> Banner Alerts Active
                        </span>
                      ) : browserPermission === 'denied' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          <AlertTriangle size={13} /> Blocked in Browser
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <AlertTriangle size={13} /> Not Enabled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {browserPermission !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleEnableBrowserNotifications}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <BellRing size={14} />
                        Enable Banner Notifications
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isTestingNotification}
                      onClick={handleTestNotification}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Trigger both in-app top banner and desktop banner alert"
                    >
                      <BellRing size={14} className={isTestingNotification ? 'animate-bounce' : ''} />
                      {isTestingNotification ? 'Testing Banner...' : 'Test Banner Notification'}
                    </button>

                    <button
                      type="button"
                      disabled={isTestingDelayed}
                      onClick={handleDelayedPushTest}
                      className="flex items-center gap-2 px-3.5 py-2 bg-secondary text-secondary-foreground text-xs font-semibold rounded-xl hover:bg-secondary/80 transition-all border border-border cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Schedules a push in 10 seconds so you can close this tab and verify background delivery"
                    >
                      <Clock size={14} className={isTestingDelayed ? 'animate-spin' : ''} />
                      {delayedCountdown !== null ? `Arriving in ${delayedCountdown}s (close tab now!)` : 'Test Closed Tab (10s)'}
                    </button>

                    <button
                      type="button"
                      onClick={toggleBannerSound}
                      className="flex items-center gap-2 px-3 py-2 bg-secondary/60 hover:bg-secondary text-secondary-foreground text-xs font-semibold rounded-xl transition-all border border-border/80 cursor-pointer"
                      title="Toggle synthesizer audio chime on banner alerts"
                    >
                      {bannerSoundMuted ? <VolumeX size={14} className="text-muted-foreground" /> : <Volume2 size={14} className="text-emerald-500" />}
                      <span>{bannerSoundMuted ? 'Sound Muted' : 'Sound Enabled'}</span>
                    </button>
                  </div>

                  {/* Troubleshooting Helper Box */}
                  <div className="mt-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60 text-xs space-y-2 text-muted-foreground">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Laptop size={14} className="text-primary" /> How Banner Notifications Work:
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                      <li>
                        <strong className="text-foreground">In-App Floating Banners:</strong> When working inside the app, interactive slide-down banners appear at the top center of your screen with sound, view buttons, and auto-dismiss.
                      </li>
                      <li>
                        <strong className="text-foreground">System OS Desktop Banners:</strong> When minimized or browsing other tabs, persistent system desktop notifications pop up via Chrome/Edge and Windows Action Center / macOS Notification Center.
                      </li>
                      <li>
                        <strong className="text-foreground">Closed App Background Push:</strong> Through our Web Push gateway, notifications arrive on your devices even when all tabs and the browser are completely closed.
                      </li>
                      <li>
                        <strong className="text-foreground">Mobile Android Heads-Up:</strong> Enhanced vibration and high-urgency headers ensure notifications pop down as high-priority heads-up banners on Android devices.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Event Preferences */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notification Types</h4>
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
                        <div className="relative">
                          <input
                            type={showPasswordFields[name] ? 'text' : 'password'}
                            name={name}
                            value={passwordData[name]}
                            onChange={handlePasswordFieldChange}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordFields((prev) => ({ ...prev, [name]: !prev[name] }))}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                            aria-label={showPasswordFields[name] ? 'Hide password' : 'Show password'}
                          >
                            {showPasswordFields[name] ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
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
