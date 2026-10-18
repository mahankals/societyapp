import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  CreditCard, 
  Receipt, 
  Users, 
  PlusCircle, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle, 
  Home 
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/resident/dashboard');
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const flats = data?.flats || [];
  const pendingDues = data?.pendingDues || [];
  const totalDueAmount = data?.totalDueAmount || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Welcome, {user?.name || 'Resident'}
          </h1>
          <p className="text-xs text-surface-200/60 mt-0.5">
            Your housing society dashboard and pending bills summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/resident/link-flat"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Link Unit / Flat</span>
          </Link>
          <Link
            to="/resident/bills"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>View Bills</span>
          </Link>
        </div>
      </div>

      {/* Dues & Quick Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Outstanding Dues</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2 font-heading">
            ₹{totalDueAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-surface-200/50 mt-1">
            {pendingDues.length} pending maintenance bill{pendingDues.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Linked Units</span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-heading">
            {flats.length}
          </p>
          <p className="text-[11px] text-surface-200/50 mt-1">
            Active residential occupancy
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Payment Status</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2 font-heading">
            {totalDueAmount === 0 ? 'Clear' : 'Pending'}
          </p>
          <Link to="/resident/receipts" className="text-[11px] text-emerald-400 hover:text-emerald-300 mt-1 inline-flex items-center gap-1">
            <span>Payment history</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Associated Units & Flats */}
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-400" />
            <span>My Associated Flats &amp; Societies</span>
          </h2>
          <Link to="/resident/link-flat" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
            + Link Flat
          </Link>
        </div>

        {flats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {flats.map((f) => (
              <div key={f.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">
                      Unit {f.wing ? f.wing + '-' : ''}{f.flat_no}
                    </span>
                    <p className="text-xs text-surface-200/60">{f.society_name}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 capitalize">
                    {f.role || 'Resident'}
                  </span>
                </div>
                <p className="text-[11px] text-surface-200/40">
                  {f.address}, {f.city}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-surface-200/50">
            You haven't linked any flat yet. Click &ldquo;+ Link Flat&rdquo; to associate your residence.
          </div>
        )}
      </div>
    </div>
  );
}
