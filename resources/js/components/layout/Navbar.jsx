import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  PanelLeftClose, 
  PanelLeft, 
  Building2, 
  ChevronDown, 
  Check, 
  Bell, 
  Sun, 
  Moon, 
  Monitor, 
  User, 
  LogOut, 
  HelpCircle, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar({ onToggleSidebar, isSidebarCollapsed }) {
  const { 
    user, 
    capabilities, 
    activeSociety, 
    userSocieties, 
    unreadNotifications, 
    latestNotifications, 
    appConfig, 
    logout, 
    switchSociety 
  } = useAuth();
  
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [societyMenuOpen, setSocietyMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const societyRef = useRef(null);
  const notifRef = useRef(null);
  const themeRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (societyRef.current && !societyRef.current.contains(event.target)) setSocietyMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotificationsOpen(false);
      if (themeRef.current && !themeRef.current.contains(event.target)) setThemeMenuOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdminView = location.pathname.startsWith('/admin');
  const isCommitteeView = location.pathname.startsWith('/committee');

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header 
      id="main-header" 
      className="fixed top-0 left-0 right-0 z-50 h-13 bg-white/90 dark:bg-surface-950/90 backdrop-blur-md border-b border-surface-200/80 dark:border-white/10 shadow-sm transition-all duration-200"
      style={{ height: '52px' }}
    >
      <div className={`h-full ${user ? 'w-full px-4 sm:px-6' : 'max-w-7xl mx-auto px-3 sm:px-4'} flex items-center justify-between gap-3`}>
        {/* Left Section: Logo & Sidebar Toggle & Society Switcher */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo brand */}
          <Link to={user ? (isAdminView ? '/admin' : '/resident') : '/'} className="flex items-center gap-2 group shrink-0">
            <img 
              src={appConfig.appLogo || '/assets/icons/logo.svg'} 
              alt={appConfig.appName} 
              className="w-7 h-7 rounded-lg object-contain" 
            />
            <span className="text-sm font-bold text-surface-900 dark:text-white tracking-tight hidden sm:inline">
              {appConfig.appName}
            </span>
          </Link>

          {/* Sidebar Toggle (Positioned after logo) */}
          {user && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex items-center justify-center p-1.5 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-200/70 dark:hover:text-white dark:hover:bg-white/10 transition-colors focus:outline-none"
              title="Toggle Sidebar"
              aria-label="Toggle Sidebar"
            >
              {isSidebarCollapsed ? (
                <PanelLeft className="w-4 h-4 text-surface-600 dark:text-surface-200" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-surface-600 dark:text-surface-200" />
              )}
            </button>
          )}

          {/* Society Switcher Dropdown */}
          {user && !isAdminView && userSocieties.length > 0 && (
            <div className="relative" ref={societyRef}>
              <button
                type="button"
                onClick={() => setSocietyMenuOpen(!societyMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-200 text-surface-800 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-white text-xs font-medium transition-all max-w-[160px] sm:max-w-[220px]"
              >
                <Building2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                <span className="truncate">{activeSociety ? activeSociety.name : 'Select Society'}</span>
                {userSocieties.length > 1 && (
                  <ChevronDown className="w-3 h-3 text-surface-400 dark:text-surface-200/50 shrink-0" />
                )}
              </button>

              {societyMenuOpen && userSocieties.length > 1 && (
                <div className="absolute left-0 mt-1.5 w-64 border border-surface-200 dark:border-white/20 bg-white/95 dark:bg-surface-950/95 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl z-50 py-1">
                  <div className="px-3 py-1.5 border-b border-surface-200 dark:border-white/10 text-[10px] font-semibold text-surface-500 dark:text-surface-200/50 uppercase tracking-wider">
                    My Societies
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
                    {userSocieties.map((s) => {
                      const isActive = activeSociety && activeSociety.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            switchSociety(s.id);
                            setSocietyMenuOpen(false);
                          }}
                          className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isActive
                              ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 font-semibold'
                              : 'text-surface-700 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-200 dark:hover:text-white dark:hover:bg-white/10'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate font-medium">{s.name}</p>
                            <p className="text-[10px] text-surface-500 dark:text-surface-200/50 truncate">
                              {s.city} {s.flat_no ? `· Unit ${s.wing ? s.wing + '-' : ''}${s.flat_no}` : ''}
                            </p>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {isAdminView && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30">
              System Admin
            </span>
          )}
        </div>

        {/* Right Section: Notifications, Theme Switcher, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notifications Dropdown */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-1.5 text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-200/70 dark:hover:text-white dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-1.5 w-80 border border-surface-200 dark:border-white/20 bg-white/95 dark:bg-surface-950/95 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl z-50">
                  <div className="p-3 border-b border-surface-200 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-900 dark:text-white">Notifications</span>
                    {unreadNotifications > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30">
                        {unreadNotifications} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-surface-200 dark:divide-white/5">
                    {latestNotifications.length > 0 ? (
                      latestNotifications.map((n) => (
                        <Link
                          key={n.id}
                          to={n.action_url || '/notifications'}
                          onClick={() => setNotificationsOpen(false)}
                          className="block p-2.5 hover:bg-surface-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <p className="text-xs font-medium text-surface-900 dark:text-white truncate">{n.title}</p>
                          <p className="text-[11px] text-surface-500 dark:text-surface-200/60 line-clamp-2 mt-0.5">{n.message}</p>
                        </Link>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-surface-500 dark:text-surface-200/50">
                        No unread notifications
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t border-surface-200 dark:border-white/10 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      View all notifications &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Theme Selector */}
          <div className="relative" ref={themeRef}>
            <button
              type="button"
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="p-1.5 text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-200/70 dark:hover:text-white dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Theme Mode"
              aria-label="Theme Mode"
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {themeMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-32 border border-surface-200 dark:border-white/20 bg-white/95 dark:bg-surface-950/95 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl z-50 py-1">
                {[
                  { value: 'light', label: 'Light', icon: Sun, color: 'text-amber-500' },
                  { value: 'dark', label: 'Dark', icon: Moon, color: 'text-blue-400' },
                  { value: 'system', label: 'System', icon: Monitor, color: 'text-purple-400' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setTheme(item.value);
                      setThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs transition-colors ${
                      theme === item.value 
                        ? 'bg-surface-100 dark:bg-white/10 text-surface-900 dark:text-white font-medium' 
                        : 'text-surface-600 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    {theme === item.value && <Check className="w-3 h-3 text-brand-500 dark:text-brand-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Dropdown / Login button */}
          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Profile menu"
              >
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt={user.name} className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <ChevronDown className="w-3 h-3 text-surface-400 dark:text-surface-200/50" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 border border-surface-200 dark:border-white/20 bg-white/95 dark:bg-surface-950/95 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl z-50">
                  <div className="p-2.5 border-b border-surface-200 dark:border-white/10">
                    <p className="text-xs font-semibold text-surface-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-surface-500 dark:text-surface-200/50 truncate">{user.email}</p>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {capabilities.isAdmin && !isAdminView && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-white/10 rounded-lg transition-colors font-medium"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                        <span>Admin View</span>
                      </Link>
                    )}
                    {isAdminView && (
                      <Link
                        to="/resident"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-white/10 rounded-lg transition-colors font-medium"
                      >
                        <Building2 className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                        <span>Resident View</span>
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-surface-700 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-200 dark:hover:text-white dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-surface-500 dark:text-surface-200" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-surface-700 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-200 dark:hover:text-white dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>Help &amp; Support</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition-all active:scale-95"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
