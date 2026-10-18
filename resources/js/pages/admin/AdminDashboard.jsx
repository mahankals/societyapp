import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Clock, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle, 
  PlusCircle,
  ExternalLink 
} from 'lucide-react';
import { api } from '../../services/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/api/admin/dashboard');
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalSocieties: 0,
    pendingSocieties: 0,
    totalUsers: 0,
    activeMembers: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            System Administration
          </h1>
          <p className="text-xs text-surface-200/60 mt-0.5">
            Platform-wide governance, approved societies, and user security
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/societies/pending"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({stats.pendingSocieties})</span>
          </Link>
          <Link
            to="/society/contribute"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-all shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Society</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-brand-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Total Societies</span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-heading">
            {stats.totalSocieties}
          </p>
          <Link to="/admin/societies" className="text-[11px] text-brand-400 hover:text-brand-300 mt-2 inline-flex items-center gap-1">
            <span>Manage societies</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Pending Proposals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2 font-heading">
            {stats.pendingSocieties}
          </p>
          <Link to="/admin/societies/pending" className="text-[11px] text-amber-400 hover:text-amber-300 mt-2 inline-flex items-center gap-1">
            <span>Review requests</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Registered Users</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-heading">
            {stats.totalUsers}
          </p>
          <Link to="/admin/users" className="text-[11px] text-indigo-400 hover:text-indigo-300 mt-2 inline-flex items-center gap-1">
            <span>User directory</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Active Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2 font-heading">
            {stats.activeMembers}
          </p>
          <span className="text-[11px] text-surface-200/50 mt-2 block">
            Health: Operational
          </span>
        </div>
      </div>

      {/* Societies List Table */}
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-400" />
            <span>Active Housing Societies</span>
          </h2>
          <Link to="/admin/societies" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
            View All &rarr;
          </Link>
        </div>

        {data?.societies && data.societies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-surface-200/50">
                  <th className="pb-2.5 font-medium">Society</th>
                  <th className="pb-2.5 font-medium">Code</th>
                  <th className="pb-2.5 font-medium">Location</th>
                  <th className="pb-2.5 font-medium">Flats</th>
                  <th className="pb-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.societies.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-semibold text-white">{s.name}</td>
                    <td className="py-3 font-mono text-brand-400">{s.society_code}</td>
                    <td className="py-3 text-surface-200/70">{s.city || 'Metro'}</td>
                    <td className="py-3 text-surface-200/70">{s.flats_count || 0} units</td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/admin/societies`}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] transition-colors"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-surface-200/50">
            No societies registered yet. Click &ldquo;Add Society&rdquo; to create one.
          </div>
        )}
      </div>
    </div>
  );
}
