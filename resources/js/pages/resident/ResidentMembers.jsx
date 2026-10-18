import React, { useEffect, useState } from 'react';
import { Users, Search, Phone, Mail, Home } from 'lucide-react';
import { api } from '../../services/api';

export default function ResidentMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/resident/members');
        setMembers(res.members || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = members.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.flat_no?.toLowerCase().includes(search.toLowerCase()) ||
    m.wing?.toLowerCase().includes(search.toLowerCase()) ||
    m.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
          Society Resident Directory
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
          Directory of verified flat owners, tenants, and committee members
        </p>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-surface-400 dark:text-surface-200/40 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by resident name, wing, or flat number..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((m, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-surface-900 dark:text-white">{m.name}</p>
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1 mt-0.5">
                      <Home className="w-3.5 h-3.5" />
                      <span>Unit {m.wing ? m.wing + '-' : ''}{m.flat_no}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 capitalize">
                    {m.role || 'Resident'}
                  </span>
                </div>
                {m.phone && (
                  <p className="text-[11px] text-surface-600 dark:text-surface-200/60 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-surface-400 dark:text-surface-200/40" />
                    <span>{m.phone}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-500 dark:text-surface-200/50">
            No member directory found for the current society.
          </div>
        )}
      </div>
    </div>
  );
}
