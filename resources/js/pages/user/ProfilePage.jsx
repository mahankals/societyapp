import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  KeyRound, 
  PhoneCall, 
  Share2, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  Upload, 
  ShieldCheck, 
  UserCheck, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import CustomCheckbox from '../../components/common/CustomCheckbox';
import DeveloperCredits from '../../components/common/DeveloperCredits';

export default function ProfilePage() {
  const { user, loading: authLoading, refreshBootstrap } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state
  const activeTab = searchParams.get('tab') || 'personal';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Profile data state
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Personal Info form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(true);

  // 2. Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 3. Emergency Contact form
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // 4. Security PIN form
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // File upload input ref
  const fileInputRef = useRef(null);

  const isMissingMobile = Boolean(user && (!user.phone || !user.phone.trim()));

  const loadProfile = async () => {
    try {
      setFetching(true);
      const res = await api.get('/api/profile');
      if (res.user) {
        setProfileData(res.user);
        setName(res.user.name || '');
        setPhone(res.user.phone || '');
        setIsWhatsapp(res.user.is_whatsapp === 1);
        setEmergencyName(res.user.emergency_contact_name || '');
        setEmergencyPhone(res.user.emergency_contact_phone || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
  };

  // Submit Personal Info
  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      showError('Please enter a valid mobile number with at least 10 digits.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/api/profile', {
        name,
        phone: phone.trim(),
        is_whatsapp: isWhatsapp ? 1 : 0,
      });
      await refreshBootstrap();
      await loadProfile();
      showSuccess(res.message || 'Personal details updated successfully!');

      if (isMissingMobile) {
        setTimeout(() => {
          navigate(user?.role === 'admin' ? '/admin' : '/resident');
        }, 1200);
      }
    } catch (err) {
      showError(err.message || 'Failed to update personal details.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('New passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/api/profile/password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadProfile();
      showSuccess(res.message || 'Password changed successfully!');
    } catch (err) {
      showError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Emergency Contact
  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/api/profile/emergency', {
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
      });
      await loadProfile();
      showSuccess(res.message || 'Emergency contact saved successfully!');
    } catch (err) {
      showError(err.message || 'Failed to update emergency contact.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Security PIN
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!/^\d{4}$/.test(pin)) {
      showError('Security PIN must be exactly 4 digits.');
      setLoading(false);
      return;
    }

    if (pin !== confirmPin) {
      showError('PIN confirmation does not match.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/api/profile/pin', {
        pin,
        confirm_pin: confirmPin,
      });
      setPin('');
      setConfirmPin('');
      await loadProfile();
      showSuccess(res.message || 'Security PIN saved successfully!');
    } catch (err) {
      showError(err.message || 'Failed to set security PIN.');
    } finally {
      setLoading(false);
    }
  };

  // Disconnect Google Account
  const handleDisconnectGoogle = async () => {
    const confirmed = await showConfirm({
      title: 'Unlink Google Account',
      message: 'Are you sure you want to unlink your Google account? You will need your password to sign in.',
      danger: true,
      confirmText: 'Unlink Account',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/api/profile/disconnect-google');
      await refreshBootstrap();
      await loadProfile();
      showSuccess(res.message || 'Google account unlinked successfully.');
    } catch (err) {
      showError(err.message || 'Failed to unlink Google account.');
    } finally {
      setLoading(false);
    }
  };

  // Upload Photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/api/profile/photo', formData);
      await refreshBootstrap();
      await loadProfile();
      showSuccess(res.message || 'Profile photo updated successfully!');
    } catch (err) {
      showError(err.message || 'Failed to upload photo.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: UserCheck, desc: 'Name, phone & avatar' },
    { id: 'password', label: 'Change Password', icon: KeyRound, desc: 'Login credentials' },
    { id: 'emergency', label: 'Emergency Contact', icon: PhoneCall, desc: 'Next of kin & contact' },
    { id: 'pin', label: 'Security PIN', icon: Lock, desc: 'Quick 4-digit PIN' },
    { id: 'accounts', label: 'Connected Accounts', icon: Share2, desc: 'Google SSO integration' },
  ];

  return (
    <div className="space-y-6 max-w-6xl transition-colors">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
          My Account &amp; Profile
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
          Manage your personal credentials, contact details, security credentials, and connected accounts
        </p>
      </div>

      {/* Mandatory Mobile Notice if Google or New User */}
      {isMissingMobile && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-200">
              Action Required: Provide Mobile Phone Number
            </h3>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
              To complete your account registration and access your society portal, please enter your mobile phone number in the Personal Information section below. Access to other sections is locked until your mobile number is saved.
            </p>
          </div>
        </div>
      )}

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-800 dark:text-red-300 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Layout: Left Tabs + Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Navigation Tabs */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-white/10 shadow-sm p-2 sm:p-3 space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (isMissingMobile && tab.id !== 'personal') {
                      showError('Please save your mobile number first before accessing other sections.');
                      return;
                    }
                    setActiveTab(tab.id);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-left ${
                    isActive
                      ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300 border border-brand-500/30 font-semibold shadow-xs'
                      : 'text-surface-700 dark:text-surface-200/70 hover:bg-surface-100 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive 
                        ? 'bg-brand-500 text-white' 
                        : 'bg-surface-100 dark:bg-white/5 text-surface-500 dark:text-surface-200/50'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="truncate">{tab.label}</div>
                      <div className="text-[10px] text-surface-400 dark:text-surface-200/40 font-normal truncate">
                        {tab.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    isActive ? 'text-brand-500 translate-x-0.5' : 'text-surface-300 dark:text-surface-200/30'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Tab Content Panel */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 sm:p-7 border border-surface-200 dark:border-white/10 shadow-sm">
            
            {/* 1. PERSONAL INFORMATION TAB */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white">Personal Information</h2>
                    <p className="text-xs text-surface-500 dark:text-surface-200/50">Update your primary identity, phone, and profile photo</p>
                  </div>
                </div>

                {/* Avatar Uploader */}
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start pb-6 border-b border-surface-200 dark:border-white/10">
                  <div className="relative group shrink-0">
                    {profileData?.profile_photo ? (
                      <img 
                        src={profileData.profile_photo} 
                        alt={name} 
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-500/40 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-brand-500/30">
                        {name ? name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-center sm:text-left">
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Profile Picture</h3>
                    <p className="text-xs text-surface-500 dark:text-surface-200/50">
                      Upload a square image (JPG, PNG or WebP, max 2MB)
                    </p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoUpload} 
                      accept="image/jpeg,image/png,image/webp" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-white/10 dark:hover:bg-white/15 text-surface-800 dark:text-white text-xs font-medium transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{loading ? 'Uploading...' : 'Choose Image'}</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handlePersonalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      Email Address (Login Identity)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                      </div>
                      <input
                        type="email"
                        disabled
                        value={profileData?.email || user?.email || ''}
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface-100 dark:bg-white/[0.02] border border-surface-200 dark:border-white/5 text-surface-400 dark:text-surface-200/40 text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="personal-phone" className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80">
                        Mobile Phone Number <span className="text-red-500">*</span>
                      </label>
                      {isMissingMobile && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                          Required to unlock app
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className={`w-4 h-4 ${isMissingMobile ? 'text-amber-500' : 'text-surface-400 dark:text-surface-200/30'}`} />
                      </div>
                      <input
                        id="personal-phone"
                        type="tel"
                        required
                        autoFocus={isMissingMobile}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210 (10 digits)"
                        className={`w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface-50 dark:bg-white/5 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none transition-all ${
                          isMissingMobile
                            ? 'border-amber-500 ring-2 ring-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20'
                            : 'border border-surface-300 dark:border-white/10 focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* WhatsApp Toggle */}
                  <div className="pt-2">
                    <CustomCheckbox
                      checked={isWhatsapp}
                      onChange={(e, val) => setIsWhatsapp(val !== undefined ? val : e.target.checked)}
                      label="Receive notifications via WhatsApp"
                      description="Receive instant receipts, emergency notices, and maintenance bills on WhatsApp"
                    />
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-brand-500/25 active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'Saving Changes...' : (isMissingMobile ? 'Save & Unlock Portal' : 'Save Personal Details')}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. CHANGE PASSWORD TAB */}
            {activeTab === 'password' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white">Change Account Password</h2>
                    <p className="text-xs text-surface-500 dark:text-surface-200/50">Manage your secure password for email/mobile login</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {profileData?.has_password && (
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                        Current Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                        </div>
                        <input
                          type="password"
                          name="current_password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                      </div>
                      <input
                        type="password"
                        name="new_password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                      </div>
                      <input
                        type="password"
                        name="confirm_password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-brand-500/25 active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'Updating Password...' : 'Update Password'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. EMERGENCY CONTACT TAB */}
            {activeTab === 'emergency' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white">Emergency Contact Details</h2>
                    <p className="text-xs text-surface-500 dark:text-surface-200/50">Primary emergency contact for society committee &amp; security</p>
                  </div>
                </div>

                <form onSubmit={handleEmergencySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      Emergency Contact Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                      </div>
                      <input
                        type="text"
                        name="emergency_contact_name"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="e.g. Mary Doe (Spouse / Relative)"
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      Emergency Contact Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="w-4 h-4 text-surface-400 dark:text-surface-200/30" />
                      </div>
                      <input
                        type="tel"
                        name="emergency_contact_phone"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-brand-500/25 active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'Saving...' : 'Save Emergency Contact'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. SECURITY PIN TAB */}
            {activeTab === 'pin' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-surface-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-surface-900 dark:text-white">Security PIN</h2>
                      <p className="text-xs text-surface-500 dark:text-surface-200/50">4-digit PIN for quick transactions and authorized actions</p>
                    </div>
                  </div>
                  <div>
                    {profileData?.has_pin ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        PIN Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-100 dark:bg-white/5 text-surface-500 text-[11px] font-semibold">
                        No PIN Set
                      </span>
                    )}
                  </div>
                </div>

                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      New 4-Digit PIN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="security_pin"
                      required
                      maxLength={4}
                      pattern="[0-9]{4}"
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 4-digit PIN"
                      className="w-48 h-12 text-center tracking-[0.2em] text-sm font-bold rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      Confirm 4-Digit PIN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirm_security_pin"
                      required
                      maxLength={4}
                      pattern="[0-9]{4}"
                      inputMode="numeric"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Confirm 4-digit PIN"
                      className="w-48 h-12 text-center tracking-[0.2em] text-sm font-bold rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-brand-500/25 active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'Saving...' : (profileData?.has_pin ? 'Update Security PIN' : 'Set Security PIN')}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 5. CONNECTED ACCOUNTS TAB */}
            {activeTab === 'accounts' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white">Connected Accounts</h2>
                    <p className="text-xs text-surface-500 dark:text-surface-200/50">Manage Single Sign-On (SSO) providers and linked profiles</p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-surface-50 dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-white/10 border border-surface-200 dark:border-white/10 flex items-center justify-center shadow-xs shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-surface-900 dark:text-white">Google Account</h4>
                      <p className="text-xs text-surface-500 dark:text-surface-200/50">
                        {profileData?.google_id ? 'Connected and authorized for One-Tap sign-in' : 'Connect for faster 1-click Google Sign-In'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {profileData?.google_id ? (
                      <button
                        type="button"
                        onClick={handleDisconnectGoogle}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Disconnect Google
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-white/5 text-surface-500 text-xs font-medium">
                        Not Linked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Shared Developer Credits */}
            <div className="pt-6 border-t border-surface-200 dark:border-white/10 flex justify-center">
              <DeveloperCredits />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
