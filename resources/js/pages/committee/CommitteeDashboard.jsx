import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Building2, Users, Clock, PlusCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function CommitteeDashboard() {
  const { activeSociety } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/committee/dashboard');
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = data?.stats || {
    flatsCount: 0,
    membersCount: 0,
    pendingRequests: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Management Committee Dashboard
          </h1>
          <p className="text-xs text-surface-200/60 mt-0.5">
            Overview for {activeSociety ? activeSociety.name : 'Active Society'}
          </p>
        </div>
        <Link
          to="/committee/flats"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-all shadow-sm"
        >
          <Building2 className="w-4 h-4" />
          <span>Flats Directory</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Total Registered Units</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-heading">
            {stats.flatsCount}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Verified Members</span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-heading">
            {stats.membersCount}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Pending Requests</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-red-400 mt-2 font-heading">
            {stats.pendingRequests}
          </p>
        </div>
      </div>
    </div>
  );
}
