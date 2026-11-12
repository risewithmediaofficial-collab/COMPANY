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
  Crop,
  Clock,
  VolumeX,
  Volume2,
} from '@/components/ui/muiIcons';
import { toast } from 'sonner';
import { ProfileImageCropModal } from '../components/modals/ProfileImageCropModal';
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
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropImageFile, setCropImageFile] = useState(null);
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
        title: 'Banner Notification Working',
        message: 'Your in-app floating banner and system desktop notifications are verified and active.',
        link: '/settings',
        type: 'success',
      });

      // 2. Direct browser OS banner notification
      await sendBrowserNotification({
        title: 'Banner Notification Active',
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

  const handleAvatarFileSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
      setCropImageFile(file);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropCurrentAvatar = () => {
    if (!currentAvatar) return;
    setCropImageSrc(getAssetUrl(currentAvatar));
    setCropImageFile(null);
    setIsCropModalOpen(true);
  };

  const handleCropComplete = async (croppedFile) => {
    try {
      const uploadResult = await uploadProfileAvatar.mutateAsync(croppedFile);
      const uploadedUrl = uploadResult.url || uploadResult.file?.url || uploadResult.data?.url;

      if (!uploadedUrl) {
        toast.error('Profile picture uploaded, but the image URL was missing');
        return;
      }

      const saved = await updateProfile.mutateAsync({ avatar: uploadedUrl });
      setCurrentAvatar(saved.avatar || uploadedUrl);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview('');
      dispatch(updateCurrentUser(saved));
      setIsCropModalOpen(false);
      toast.success('Profile picture updated successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save profile picture');
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
    return <div className="h-96 rounded-2xl bg-card animate-pulse" />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        <div className="lg:col-span-1 flex flex-row overflow-x-auto lg:flex-col gap-1.5 pb-2 lg:pb-0 custom-scrollbar">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center px-4 py-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 lg:w-full cursor-pointer ${
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
              }`}
            >
              <section.icon size={18} className="mr-2 sm:mr-3 shrink-0" />
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <div
            key={activeSection}
            className="bg-card rounded-2xl p-6 md:p-8 animate-in fade-in duration-150"
          >
            {activeSection === 'profile' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-center gap-8 pb-4">
                  <div className="relative group">
                    <input
                      id="profile-avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileSelect}
                    />
                    <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold overflow-hidden">
                      {avatarPreview || currentAvatar ? <img src={getAssetUrl(avatarPreview || currentAvatar)} alt="" className="h-full w-full object-cover" /> : profileUser?.name?.charAt(0)}
                    </div>
                    <label
                      htmlFor="profile-avatar-upload"
                      aria-disabled={uploadProfileAvatar.isPending || updateProfile.isPending}
                      className={`absolute -bottom-2 -right-2 rounded-xl bg-background p-2 text-foreground shadow-sm transition-colors ${
                        uploadProfileAvatar.isPending || updateProfile.isPending
                          ? 'pointer-events-none opacity-60'
                          : 'cursor-pointer hover:bg-primary hover:text-primary-foreground'
                      }`}
                      title="Upload and crop photo"
                    >
                      <Camera size={16} />
                    </label>
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xl font-bold">{profileUser?.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{profileUser?.role} / {profileUser?.department || 'Operations'}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2.5 justify-center md:justify-start">
                      <label
                        htmlFor="profile-avatar-upload"
                        className={`inline-flex items-center rounded-xl bg-background px-4 py-2 text-sm font-semibold transition-colors ${
                          uploadProfileAvatar.isPending || updateProfile.isPending
                            ? 'pointer-events-none opacity-60'
                            : 'cursor-pointer hover:bg-secondary'
                        }`}
                      >
                        <Camera size={16} className="mr-2" />
                        {currentAvatar ? 'Change Photo & Crop' : 'Upload & Crop Photo'}
                      </label>
                      {currentAvatar ? (
                        <>
                          <button
                            type="button"
                            onClick={handleCropCurrentAvatar}
                            disabled={uploadProfileAvatar.isPending || updateProfile.isPending}
                            className="inline-flex items-center rounded-xl bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60 cursor-pointer"
                            title="Re-crop or adjust your current profile picture"
                          >
                            <Crop size={16} className="mr-2 text-primary" />
                            Crop / Adjust Current
                          </button>
                          <button
                            type="button"
                            onClick={removeAvatar}
                            disabled={updateProfile.isPending}
                            className="inline-flex items-center rounded-xl bg-background px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-secondary disabled:opacity-60 cursor-pointer"
                          >
                            <Trash2 size={16} className="mr-2" />
                            Remove
                          </button>
                        </>
                      ) : null}
                    </div>
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
                      <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
                      <div className="relative">
                        <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type={type}
                          name={name}
                          value={profileData[name]}
                          onChange={handleProfileChange}
                          disabled={name === 'email'}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-brand/40 transition-colors disabled:opacity-70"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={saveProfile}
                    disabled={updateProfile.isPending}
                    className="flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
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
                </div>

                {/* Native Desktop / Browser Push Notifications Card */}
                <div className="rounded-2xl bg-background p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-secondary text-foreground shrink-0">
                        <BellRing size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex flex-wrap items-center gap-2">
                          Banner &amp; Push Notifications
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-secondary text-foreground">
                            Heads-Up &amp; Desktop
                          </span>
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {browserPermission === 'granted' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                          <CheckCircle2 size={13} /> Banner Alerts Active
                        </span>
                      ) : browserPermission === 'denied' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-foreground">
                          <AlertTriangle size={13} /> Blocked in Browser
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-muted-foreground">
                          <AlertTriangle size={13} /> Not Enabled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {browserPermission !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleEnableBrowserNotifications}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        <BellRing size={14} />
                        Enable Banner Notifications
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isTestingNotification}
                      onClick={handleTestNotification}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                      title="Trigger both in-app top banner and desktop banner alert"
                    >
                      <BellRing size={14} className={isTestingNotification ? 'animate-bounce' : ''} />
                      {isTestingNotification ? 'Testing Banner...' : 'Test Banner Notification'}
                    </button>

                    <button
                      type="button"
                      disabled={isTestingDelayed}
                      onClick={handleDelayedPushTest}
                      className="flex items-center gap-2 px-3.5 py-2 bg-secondary text-secondary-foreground text-xs font-semibold rounded-xl hover:bg-secondary/80 transition-colors cursor-pointer disabled:opacity-50 tabular-nums"
                      title="Schedules a push in 10 seconds so you can close this tab and verify background delivery"
                    >
                      <Clock size={14} className={isTestingDelayed ? 'animate-spin' : ''} />
                      {delayedCountdown !== null ? `Arriving in ${delayedCountdown}s (close tab now!)` : 'Test Closed Tab (10s)'}
                    </button>

                    <button
                      type="button"
                      onClick={toggleBannerSound}
                      className="flex items-center gap-2 px-3.5 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      title="Toggle audio chime on banner alerts"
                    >
                      {bannerSoundMuted ? <VolumeX size={14} className="text-muted-foreground" /> : <Volume2 size={14} className="text-foreground" />}
                      <span>{bannerSoundMuted ? 'Sound Muted' : 'Sound Enabled'}</span>
                    </button>
                  </div>
                </div>

                {/* Event Preferences */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notification Types</h4>
                  {[
                    ['email', 'Email notifications'],
                    ['inApp', 'In-app notifications'],
                    ['taskUpdates', 'Task updates'],
                    ['leadUpdates', 'Lead updates'],
                    ['financeAlerts', 'Finance alerts'],
                    ['dailyDigest', 'Daily digest'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between rounded-xl bg-background p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                      <span className="text-sm font-semibold">{label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(preferences.notifications?.[key])}
                        onChange={(event) => setNotification(key, event.target.checked)}
                        className="h-5 w-5 rounded text-primary focus:ring-primary accent-foreground cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'company' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold">Company Details &amp; GST Settings</h3>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Name *</span>
                      <input value={companyProfile.name} onChange={(event) => setCompanyProfile((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl bg-background px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-brand/40" placeholder="RISE WITH MEDIA" />
                    </label>
                    <label className="space-y-2">
                      <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">GSTIN / GST Number</span>
                      <input value={companyProfile.gstNumber} onChange={(event) => setCompanyProfile((current) => ({ ...current, gstNumber: event.target.value }))} className="w-full rounded-xl bg-background px-4 py-3 text-sm font-bold tracking-wider text-primary outline-none focus:ring-2 focus:ring-brand/40" placeholder="29ABCDE1234F1Z5" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Logo Image / URL</span>
                      <div className="flex gap-3">
                        <input value={companyProfile.logoUrl} onChange={(event) => setCompanyProfile((current) => ({ ...current, logoUrl: event.target.value }))} className="flex-1 rounded-xl bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40" placeholder="https://domain.com/logo.png" />
                        {companyProfile.logoUrl && (
                          <div className="h-11 w-11 shrink-0 rounded-xl bg-white p-1.5 flex items-center justify-center overflow-hidden">
                            <img src={getAssetUrl(companyProfile.logoUrl)} alt="Company Logo" className="h-full w-full object-contain" />
                          </div>
                        )}
                      </div>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered Office Address</span>
                      <textarea value={companyProfile.address} onChange={(event) => setCompanyProfile((current) => ({ ...current, address: event.target.value }))} rows={3} className="w-full rounded-xl bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40" placeholder="Street Address, City, State, PIN Code" />
                    </label>
                    <label className="space-y-2">
                      <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Official Email</span>
                      <input value={companyProfile.email} onChange={(event) => setCompanyProfile((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-xl bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40" placeholder="hello@risewithmedia.com" />
                    </label>
                    <label className="space-y-2">
                      <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Official Phone Number</span>
                      <input value={companyProfile.phone} onChange={(event) => setCompanyProfile((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-xl bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40" placeholder="+91 9876543210" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services / Agency Tagline</span>
                      <textarea value={companyProfile.services} onChange={(event) => setCompanyProfile((current) => ({ ...current, services: event.target.value }))} rows={2} className="w-full rounded-xl bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40" placeholder="Social Media Management, Video Production, Meta & Google Ads, Web Development" />
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button onClick={() => updateCompany.mutate(companyProfile)} disabled={updateCompany.isPending} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => !darkMode && dispatch(toggleDarkMode())}
                    className={`p-6 rounded-2xl transition-all flex flex-col items-center gap-4 cursor-pointer ${
                      darkMode ? 'bg-secondary ring-2 ring-primary' : 'bg-background hover:bg-secondary/60'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                      <Palette size={24} />
                    </div>
                    <span className="font-bold">Dark Mode</span>
                  </button>
                  <button
                    onClick={() => darkMode && dispatch(toggleDarkMode())}
                    className={`p-6 rounded-2xl transition-all flex flex-col items-center gap-4 cursor-pointer ${
                      !darkMode ? 'bg-secondary ring-2 ring-primary' : 'bg-background hover:bg-secondary/60'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white text-neutral-900 flex items-center justify-center shadow-xs">
                      <Palette size={24} />
                    </div>
                    <span className="font-bold">Light Mode</span>
                  </button>
                </div>

                <div className="pt-4">
                  <h3 className="text-lg font-bold mb-4">Regional Settings</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ['language', 'Language', ['en-US', 'en-GB', 'es-ES', 'fr-FR']],
                      ['timezone', 'Timezone', ['Asia/Calcutta', 'UTC', 'America/New_York', 'Europe/London']],
                      ['currency', 'Currency', ['INR']],
                    ].map(([key, label, options]) => (
                      <label key={key} className="space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                        <select
                          value={preferences.regional?.[key] || options[0]}
                          onChange={(event) => setRegional(key, event.target.value)}
                          className="w-full rounded-xl bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40 cursor-pointer"
                        >
                          {options.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => savePreferences()}
                    disabled={updatePreferences.isPending}
                    className="mt-6 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
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
                </div>

                <div className="rounded-2xl bg-background p-5 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Password management</p>
                    </div>
                    <div className="rounded-xl bg-secondary p-3 text-foreground">
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
                        <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                        <div className="relative">
                          <input
                            type={showPasswordFields[name] ? 'text' : 'password'}
                            name={name}
                            value={passwordData[name]}
                            onChange={handlePasswordFieldChange}
                            className="w-full rounded-xl bg-card px-4 py-3 pr-11 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand/40"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordFields((prev) => ({ ...prev, [name]: !prev[name] }))}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
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
                      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
                    >
                      {changePassword.isPending ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'permissions' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Role &amp; Permissions</h3>
                <div className="rounded-2xl bg-background p-5">
                  <p className="text-sm font-semibold capitalize">{profileUser?.role}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-xl bg-background p-4">
                      <span className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={`text-xs font-bold ${value ? 'text-foreground' : 'text-muted-foreground'}`}>{value ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileImageCropModal
        open={isCropModalOpen}
        onOpenChange={setIsCropModalOpen}
        imageSrc={cropImageSrc}
        imageFile={cropImageFile}
        onCropComplete={handleCropComplete}
        isSaving={uploadProfileAvatar.isPending || updateProfile.isPending}
        profileUser={profileUser}
        onSelectNewImage={() => {
          document.getElementById('profile-avatar-upload')?.click();
        }}
      />
    </div>
  );
};

export default Settings;
