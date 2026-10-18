import React, { useEffect, useState } from 'react';
import { Users, Search, Shield, UserCheck, Mail, Phone } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/admin/users');
        setUsers(res.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
          Platform User Accounts
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
          View registered users, assign roles, and audit account statuses
        </p>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-surface-400 dark:text-surface-200/40 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or role..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-200 dark:border-white/10 text-surface-500 dark:text-surface-200/50">
                  <th className="pb-2.5 font-medium">User</th>
                  <th className="pb-2.5 font-medium">Contact</th>
                  <th className="pb-2.5 font-medium">Role</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-white/5">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3">
                      <p className="font-semibold text-surface-900 dark:text-white">{u.name}</p>
                      <p className="text-[11px] text-surface-500 dark:text-surface-200/50">{u.email}</p>
                    </td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/70">{u.phone || '—'}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        u.role === 'admin'
                          ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                          : u.role === 'committee'
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          : 'bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3 text-surface-500 dark:text-surface-200/50 text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-500 dark:text-surface-200/50">
            No users found matching your search query.
          </div>
        )}
      </div>
    </div>
  );
}
