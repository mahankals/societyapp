import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, PlusCircle, Search, MapPin } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminSocieties() {
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/admin/societies');
        setSocieties(res.societies || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = societies.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase()) ||
    s.society_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
            Housing Societies Management
          </h1>
          <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
            View and manage all approved residential communities
          </p>
        </div>
        <Link
          to="/society/contribute"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Society</span>
        </Link>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-surface-400 dark:text-surface-200/40 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, city, or society code..."
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
                  <th className="pb-2.5 font-medium">Society Name</th>
                  <th className="pb-2.5 font-medium">Code</th>
                  <th className="pb-2.5 font-medium">Address</th>
                  <th className="pb-2.5 font-medium">City</th>
                  <th className="pb-2.5 font-medium">Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-white/5">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-semibold text-surface-900 dark:text-white">{s.name}</td>
                    <td className="py-3 font-mono text-brand-600 dark:text-brand-400 font-semibold">{s.society_code}</td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/70">{s.address || '—'}</td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/70">{s.city || '—'}</td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/70">{s.flats_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-500 dark:text-surface-200/50">
            No societies found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
