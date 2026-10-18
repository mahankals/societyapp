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
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isCollapsed, onCloseMobile }) {
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

  return (
    <aside
      id="desktop-sidebar"
      className={`fixed top-13 bottom-0 left-0 z-40 bg-surface-950/95 dark:bg-surface-950/95 backdrop-blur-md border-r border-white/10 flex flex-col justify-between transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
      style={{ top: '52px' }}
    >
      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {links.map((item) => {
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
                  ? 'bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30'
                  : 'text-surface-200/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Footer link section */}
      <div className="p-2 border-t border-white/10 space-y-1">
        <NavLink
          to="/society/contribute"
          onClick={onCloseMobile}
          title="Contribute Society"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-surface-200/70 hover:text-white hover:bg-white/5 transition-all"
        >
          <Building className="w-4 h-4 text-emerald-400 shrink-0" />
          {!isCollapsed && <span className="truncate">Contribute Society</span>}
        </NavLink>
        <NavLink
          to="/profile"
          onClick={onCloseMobile}
          title="My Profile"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-surface-200/70 hover:text-white hover:bg-white/5 transition-all"
        >
          <User className="w-4 h-4 text-brand-400 shrink-0" />
          {!isCollapsed && <span className="truncate">My Profile</span>}
        </NavLink>
      </div>
    </aside>
  );
}
