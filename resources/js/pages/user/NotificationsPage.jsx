import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCircle2, AlertTriangle, AlertCircle, Megaphone } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function NotificationsPage() {
  const { refreshBootstrap } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/notifications');
        setNotifications(res.notifications || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      await refreshBootstrap();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Notifications &amp; Activity
          </h1>
          <p className="text-xs text-surface-200/60 mt-0.5">
            System announcements, billing receipts, and committee alerts
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-brand-300 text-xs font-semibold border border-white/10 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Mark all as read</span>
        </button>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-white/5">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl flex items-start gap-3 transition-colors ${
                  !n.is_read ? 'bg-brand-500/10' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-white truncate">{n.title}</p>
                    <span className="text-[10px] text-surface-200/40 shrink-0">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-surface-200/70 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-200/50">
            No notifications in your inbox.
          </div>
        )}
      </div>
    </div>
  );
}
