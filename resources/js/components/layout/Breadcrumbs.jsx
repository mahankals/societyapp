import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Breadcrumbs() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const pathname = location.pathname;
  const segments = pathname.split('/').filter(Boolean);

  const isAdmin = pathname.startsWith('/admin');
  const isCommittee = pathname.startsWith('/committee');
  const homePath = isAdmin ? '/admin' : isCommittee ? '/committee' : '/resident';
  const homeLabel = isAdmin ? 'Admin' : isCommittee ? 'Committee' : 'Resident';

  return (
    <div className="breadcrumb-bar border-b border-surface-200/80 dark:border-white/5 py-1 px-4 text-xs bg-white/80 dark:bg-surface-950/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 text-surface-500 dark:text-surface-200/60 overflow-x-auto whitespace-nowrap scrollbar-none">
        <Link to={homePath} className="flex items-center gap-1 text-surface-600 hover:text-surface-900 dark:text-surface-200/60 dark:hover:text-white transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>{homeLabel}</span>
        </Link>
        {segments.length > 1 && (
          <>
            <ChevronRight className="w-3 h-3 text-surface-400 dark:text-surface-200/30 shrink-0" />
            <span className="text-surface-900 dark:text-white font-medium capitalize">
              {segments[segments.length - 1].replace(/-/g, ' ')}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
