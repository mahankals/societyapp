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
  Home, 
  Key, 
  UserCheck, 
  X, 
  CheckCircle2, 
  Phone 
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Tenant modal state
  const [selectedFlatForTenant, setSelectedFlatForTenant] = useState(null);
  const [tenantName, setTenantName] = useState('Rahul Verma');
  const [tenantPhone, setTenantPhone] = useState('+91 98234 56789');
  const [submittingTenant, setSubmittingTenant] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get('/api/resident/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleRent = async (flatId) => {
    try {
      const res = await api.post(`/api/resident/flats/${flatId}/toggle-rent`);
      setMessage(res.message || 'Rental status updated!');
      await loadData();
    } catch (err) {
      alert(err?.message || 'Failed to update rent status.');
    }
  };

  const handleAssignTenant = async (e) => {
    e.preventDefault();
    if (!selectedFlatForTenant) return;
    setSubmittingTenant(true);
    try {
      const res = await api.post(`/api/resident/flats/${selectedFlatForTenant.flat_id}/assign-tenant`, {
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
      });
      setMessage(res.message || 'Tenant linked successfully!');
      setSelectedFlatForTenant(null);
      await loadData();
    } catch (err) {
      alert(err?.message || 'Failed to assign tenant.');
    } finally {
      setSubmittingTenant(false);
    }
  };

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
          <Link
            to="/resident/members"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Directory</span>
          </Link>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

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

      {/* Associated Units & Flats with Rental Control */}
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-400" />
            <span>My Associated Flats &amp; Tenancy Management</span>
          </h2>
          <Link to="/resident/link-flat" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
            + Link Flat
          </Link>
        </div>

        {flats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {flats.map((f) => {
              const isOwner = f.role !== 'tenant';
              const isAvailableForRent = f.is_for_rent || f.occupancy_status === 'available_for_rent';
              const isRented = f.occupancy_status === 'rented' || Boolean(f.tenant_name);

              return (
                <div key={f.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-bold text-white">
                        Unit {f.wing ? f.wing + '-' : ''}{f.flat_no}
                      </span>
                      <p className="text-xs text-surface-200/60">{f.society_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 capitalize">
                        {f.role || 'Resident'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isRented
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : isAvailableForRent
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {isRented ? 'Rented' : isAvailableForRent ? 'Available for Rent' : 'Self Occupied'}
                      </span>
                    </div>
                  </div>

                  {/* Tenant Details if Rented */}
                  {isRented && (
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        <span>Tenant: {f.tenant_name || 'Active Tenant'}</span>
                      </p>
                      {f.tenant_phone && (
                        <p className="text-[11px] text-purple-300/80 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-purple-400" />
                          <span>{f.tenant_phone}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Owner Controls: Toggle Rent / Link Tenant */}
                  {isOwner && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => handleToggleRent(f.flat_id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Key className="w-3 h-3 text-brand-400" />
                        <span>{isAvailableForRent ? 'Mark Self Occupied' : 'Make Available for Rent'}</span>
                      </button>

                      {isAvailableForRent && (
                        <button
                          type="button"
                          onClick={() => setSelectedFlatForTenant(f)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Link Tenant</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-surface-200/50">
            You haven't linked any flat yet. Click &ldquo;+ Link Flat&rdquo; to associate your residence.
          </div>
        )}
      </div>

      {/* Link Tenant Modal */}
      {selectedFlatForTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-surface-950 border border-white/20 p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedFlatForTenant(null)}
              className="absolute top-4 right-4 p-1.5 text-surface-200/60 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Link Tenant to Unit {selectedFlatForTenant.wing}-{selectedFlatForTenant.flat_no}</span>
              </h2>
              <p className="text-xs text-surface-200/60">
                Register verified tenant details and contact information
              </p>
            </div>

            <form onSubmit={handleAssignTenant} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Tenant Full Name
                </label>
                <input
                  type="text"
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Tenant Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  placeholder="+91 98234 56789"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFlatForTenant(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTenant}
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
                >
                  {submittingTenant ? 'Linking...' : 'Confirm Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
