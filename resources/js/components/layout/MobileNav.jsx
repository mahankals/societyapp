import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, MailPlus, Settings, CreditCard, Receipt, PlusCircle, Shield, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isAdminView = location.pathname.startsWith('/admin');
  const isCommitteeView = location.pathname.startsWith('/committee');

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/societies', label: 'Societies', icon: Building2 },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/invitations', label: 'Invites', icon: MailPlus },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const residentLinks = [
    { to: '/resident', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/resident/bills', label: 'Bills', icon: CreditCard },
    { to: '/resident/receipts', label: 'Receipts', icon: Receipt },
    { to: '/resident/members', label: 'Members', icon: Users },
    { to: '/resident/link-flat', label: 'Link Flat', icon: PlusCircle },
  ];

  const committeeLinks = [
    { to: '/committee', label: 'Dashboard', icon: Shield, exact: true },
    { to: '/committee/flats', label: 'Flats', icon: Building2 },
  ];

  const links = isAdminView ? adminLinks : isCommitteeView ? committeeLinks : residentLinks;
  const needsMobile = Boolean(!user.phone || !user.phone.trim());

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-950/95 dark:bg-surface-950/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
      <div className="flex items-center justify-around">
        {needsMobile ? (
          <NavLink
            to="/profile"
            className="flex items-center gap-2 text-amber-400 font-bold py-1 px-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs animate-pulse"
          >
            <User className="w-4 h-4" />
            <span>Add Mobile Number to Unlock</span>
          </NavLink>
        ) : (
          links.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.to 
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 transition-colors ${
                  isActive ? 'text-brand-400 font-semibold' : 'text-surface-200/60 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            );
          })
        )}
      </div>
    </nav>
  );
}
