import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Clock,
  Users,
  MailPlus,
  Settings,
  Receipt,
  CreditCard,
  Building,
  PlusCircle,
  User,
  Shield,
  FileText,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile }) {
  const { user, capabilities, activeSociety } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isAdminView = location.pathname.startsWith('/admin');
  const isCommitteeView = location.pathname.startsWith('/committee');

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/societies', label: 'Societies', icon: Building2, exact: true },
    { to: '/admin/societies/pending', label: 'Pending Proposals', icon: Clock },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/invitations', label: 'Invitations', icon: MailPlus },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const residentLinks = [
    { to: '/resident', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/resident/bills', label: 'Bills & Dues', icon: CreditCard },
    { to: '/resident/receipts', label: 'Receipts', icon: Receipt },
    { to: '/resident/members', label: 'Members', icon: Users },
    { to: '/resident/link-flat', label: 'Link Flat', icon: PlusCircle },
  ];

  const committeeLinks = [
    { to: '/committee', label: 'Dashboard', icon: Shield, exact: true },
    { to: '/committee/flats', label: 'Flats Management', icon: Building },
  ];

  const links = isAdminView ? adminLinks : isCommitteeView ? committeeLinks : residentLinks;
  const needsMobile = Boolean(!user.phone || !user.phone.trim());
  const showLabels = !isCollapsed || isMobileOpen;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="desktop-sidebar"
        className={`fixed top-13 bottom-0 left-0 bg-white/95 dark:bg-surface-950/95 backdrop-blur-md border-r border-surface-200 dark:border-white/10 flex flex-col justify-between transition-all duration-200 ${
          isMobileOpen
            ? 'z-50 w-64 max-w-[85vw] translate-x-0 shadow-2xl'
            : '-translate-x-full md:translate-x-0 z-30 ' + (isCollapsed ? 'md:w-16' : 'md:w-60')
        }`}
        style={{ top: '52px' }}
      >
        {/* Mobile Header with Close Button */}
        {isMobileOpen && (
          <div className="md:hidden flex items-center justify-between p-3 border-b border-surface-200 dark:border-white/10">
            <span className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">
              Navigation
            </span>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10 cursor-pointer"
              aria-label="Close Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {needsMobile ? (
          <div className="p-3 my-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs text-center space-y-1">
            {showLabels ? (
              <>
                <p className="font-semibold text-amber-900 dark:text-amber-200">Registration Incomplete</p>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-snug">
                  Please enter your mobile phone number on your Profile to unlock society features.
                </p>
              </>
            ) : (
              <User className="w-5 h-5 mx-auto text-amber-600 dark:text-amber-400 animate-pulse" />
            )}
          </div>
        ) : (
          links.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.to 
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                title={item.label}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-500/30'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-200/70 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {showLabels && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })
        )}
      </div>

      {/* Footer link section */}
      <div className="p-2 border-t border-surface-200 dark:border-white/10 space-y-1">
        {!needsMobile && (
          <NavLink
            to="/society/contribute"
            onClick={onCloseMobile}
            title="Contribute Society"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-200/70 dark:hover:text-white dark:hover:bg-white/5 transition-all"
          >
            <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {showLabels && <span className="truncate">Contribute Society</span>}
          </NavLink>
        )}
        <NavLink
          to="/profile"
          onClick={onCloseMobile}
          title="My Profile"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            needsMobile
              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/40 ring-1 ring-amber-500/50'
              : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-200/70 dark:hover:text-white dark:hover:bg-white/5'
          }`}
        >
          <User className={`w-4 h-4 ${needsMobile ? 'text-amber-600 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400'} shrink-0`} />
          {showLabels && (
            <span className="truncate flex items-center justify-between flex-1">
              <span>My Profile</span>
              {needsMobile && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-extrabold uppercase tracking-wider">
                  Required
                </span>
              )}
            </span>
          )}
        </NavLink>
      </div>
    </aside>
  </>
  );
}
