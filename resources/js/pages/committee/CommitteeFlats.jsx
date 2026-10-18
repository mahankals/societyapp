import React, { useEffect, useState } from 'react';
import { Building2, Search, User, Home } from 'lucide-react';
import { api } from '../../services/api';

export default function CommitteeFlats() {
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/committee/flats');
        setFlats(res.flats || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = flats.filter((f) =>
    f.flat_no?.toLowerCase().includes(search.toLowerCase()) ||
    f.wing?.toLowerCase().includes(search.toLowerCase()) ||
    f.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.tenant_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
          Flats &amp; Occupancy Management
        </h1>
        <p className="text-xs text-surface-200/60 mt-0.5">
          Society inventory, ownership records, and tenant assignments
        </p>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-surface-200/40 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by wing, flat number, owner, or tenant..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
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
                <tr className="border-b border-white/10 text-surface-200/50">
                  <th className="pb-2.5 font-medium">Unit</th>
                  <th className="pb-2.5 font-medium">Floor</th>
                  <th className="pb-2.5 font-medium">Owner</th>
                  <th className="pb-2.5 font-medium">Tenant</th>
                  <th className="pb-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-semibold text-white">
                      Unit {f.wing ? f.wing + '-' : ''}{f.flat_no}
                    </td>
                    <td className="py-3 text-surface-200/70">{f.floor ?? '—'}</td>
                    <td className="py-3 text-surface-200/80">{f.owner_name || 'Unassigned'}</td>
                    <td className="py-3 text-surface-200/60">{f.tenant_name || '—'}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {f.tenant_name ? 'Rented' : 'Owner Occupied'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-200/50">
            No flats found matching your query.
          </div>
        )}
      </div>
    </div>
  );
}
