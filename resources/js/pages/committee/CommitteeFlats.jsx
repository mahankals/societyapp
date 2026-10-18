import React, { useEffect, useState } from 'react';
import { Building2, Search, User, Home, PlusCircle, X, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export default function CommitteeFlats() {
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [wing, setWing] = useState('B');
  const [flatNo, setFlatNo] = useState('');
  const [floor, setFloor] = useState('2');
  const [flatType, setFlatType] = useState('2 BHK');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/api/committee/flats');
      setFlats(res.flats || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateFlat = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    try {
      const res = await api.post('/api/committee/flats', {
        wing,
        flat_no: flatNo,
        floor,
        flat_type: flatType,
      });
      setSuccessMsg(res.message || 'Flat added successfully!');
      setShowAddModal(false);
      setFlatNo('');
      await load();
    } catch (err) {
      alert(err?.message || 'Failed to create flat.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = flats.filter((f) =>
    f.flat_no?.toLowerCase().includes(search.toLowerCase()) ||
    f.wing?.toLowerCase().includes(search.toLowerCase()) ||
    f.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.tenant_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
            Flats &amp; Occupancy Management
          </h1>
          <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
            Society inventory, ownership records, and tenant assignments
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Unit / Flat</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-surface-400 dark:text-surface-200/40 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by wing, flat number, owner, or tenant..."
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
                  <th className="pb-2.5 font-medium">Unit</th>
                  <th className="pb-2.5 font-medium">Floor</th>
                  <th className="pb-2.5 font-medium">Owner</th>
                  <th className="pb-2.5 font-medium">Tenant</th>
                  <th className="pb-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-white/5">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-surface-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-semibold text-surface-900 dark:text-white">
                      Unit {f.wing ? f.wing + '-' : ''}{f.flat_no}
                    </td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/70">{f.floor ?? '—'}</td>
                    <td className="py-3 text-surface-700 dark:text-surface-200/80">{f.owner_name || 'Unassigned'}</td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/60">{f.tenant_name || '—'}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        {f.tenant_name ? 'Rented' : 'Owner Occupied'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-500 dark:text-surface-200/50">
            No flats found matching your query.
          </div>
        )}
      </div>

      {/* Add Unit / Flat Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-surface-950 border border-surface-200 dark:border-white/20 p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-700 dark:text-surface-200/60 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Add Society Unit / Flat</span>
              </h2>
              <p className="text-xs text-surface-500 dark:text-surface-200/60">
                Register a new flat under wing/tower inventory
              </p>
            </div>

            <form onSubmit={handleCreateFlat} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Wing / Tower
                  </label>
                  <input
                    type="text"
                    required
                    value={wing}
                    onChange={(e) => setWing(e.target.value.toUpperCase())}
                    placeholder="e.g. A, B"
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Flat Number
                  </label>
                  <input
                    type="text"
                    required
                    value={flatNo}
                    onChange={(e) => setFlatNo(e.target.value)}
                    placeholder="e.g. 204"
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Floor Number
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Unit Type
                  </label>
                  <select
                    value={flatType}
                    onChange={(e) => setFlatType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:border-brand-500"
                  >
                    <option value="1 BHK" className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">1 BHK</option>
                    <option value="2 BHK" className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">2 BHK</option>
                    <option value="3 BHK" className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">3 BHK</option>
                    <option value="Penthouse" className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">Penthouse</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-medium transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
                >
                  {submitting ? 'Adding...' : 'Save Flat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
