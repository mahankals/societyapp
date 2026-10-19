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
  AlertCircle,
  CheckCircle, 
  Home, 
  Key, 
  UserCheck, 
  X, 
  CheckCircle2, 
  Phone,
  Search,
  Mail,
  User,
  UserMinus
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Tenant modal state
  const [selectedFlatForTenant, setSelectedFlatForTenant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingTenant, setSearchingTenant] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTenantUser, setSelectedTenantUser] = useState(null);
  const [tenantError, setTenantError] = useState('');
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
      showAlert({
        title: 'Update Failed',
        message: err?.message || 'Failed to update rent status.',
        variant: 'danger',
      });
    }
  };

  const handleRemoveTenant = async (flatId) => {
    const confirmed = await showConfirm({
      title: 'Remove Tenant Confirmation',
      message: 'Are you sure you want to remove this tenant from the unit? The unit will be marked as self occupied.',
      danger: true,
      confirmText: 'Remove Tenant',
      cancelText: 'Keep Tenant',
    });
    if (!confirmed) return;

    try {
      const res = await api.post(`/api/resident/flats/${flatId}/remove-tenant`);
      setMessage(res.message || 'Tenant removed successfully!');
      await loadData();
      showAlert({
        title: 'Tenant Removed',
        message: res.message || 'Tenant removed successfully! Unit is now marked as Self Occupied.',
        variant: 'success',
      });
    } catch (err) {
      showAlert({
        title: 'Removal Error',
        message: err?.message || 'Failed to remove tenant.',
        variant: 'danger',
      });
    }
  };

  const handleSearchTenant = async (queryToSearch) => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    if (q.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setSearchingTenant(true);
    setTenantError('');
    try {
      const res = await api.get(`/api/resident/search-tenant?query=${encodeURIComponent(q)}`);
      setSearchResults(res.users || []);
      setHasSearched(true);
    } catch (err) {
      setTenantError(err?.message || 'Failed to search registered users.');
    } finally {
      setSearchingTenant(false);
    }
  };

  const handleAssignTenant = async (e) => {
    e.preventDefault();
    if (!selectedFlatForTenant) return;
    if (!selectedTenantUser) {
      setTenantError('Please search and select a registered tenant user first.');
      return;
    }
    setSubmittingTenant(true);
    setTenantError('');
    try {
      const res = await api.post(`/api/resident/flats/${selectedFlatForTenant.flat_id}/assign-tenant`, {
        tenant_user_id: selectedTenantUser.id,
      });
      setMessage(res.message || 'Tenant linked successfully!');
      setSelectedFlatForTenant(null);
      setSelectedTenantUser(null);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      await loadData();
    } catch (err) {
      setTenantError(err?.message || 'Failed to assign tenant.');
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
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
            Welcome, {user?.name || 'Resident'}
          </h1>
          <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
            Your housing society dashboard and pending bills summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/resident/link-flat"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 text-surface-700 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-white text-xs font-semibold transition-all shadow-xs"
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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 text-surface-700 dark:bg-white/10 dark:hover:bg-white/15 dark:border-transparent dark:text-white text-xs font-semibold transition-all shadow-xs"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Directory</span>
          </Link>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Dues & Quick Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-600 dark:text-surface-200/60">Outstanding Dues</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-heading">
            ₹{totalDueAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-surface-500 dark:text-surface-200/50 mt-1">
            {pendingDues.length} pending maintenance bill{pendingDues.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-600 dark:text-surface-200/60">Linked Units</span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white mt-2 font-heading">
            {flats.length}
          </p>
          <p className="text-[11px] text-surface-500 dark:text-surface-200/50 mt-1">
            Active residential occupancy
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-600 dark:text-surface-200/60">Payment Status</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-heading">
            {totalDueAmount === 0 ? 'Clear' : 'Pending'}
          </p>
          <Link to="/resident/receipts" className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 mt-1 inline-flex items-center gap-1 font-medium">
            <span>Payment history</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Associated Units & Flats with Rental Control */}
      <div className="p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>My Associated Flats &amp; Tenancy Management</span>
          </h2>
          <Link to="/resident/link-flat" className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-semibold">
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
                <div key={f.id} className="p-4 rounded-2xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-bold text-surface-900 dark:text-white">
                        Unit {f.wing ? f.wing + '-' : ''}{f.flat_no}
                      </span>
                      <p className="text-xs text-surface-500 dark:text-surface-200/60">{f.society_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 capitalize">
                        {f.role || 'Resident'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isRented
                          ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                          : isAvailableForRent
                          ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30'
                          : 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                      }`}>
                        {isRented ? 'Rented' : isAvailableForRent ? 'Available for Rent' : 'Self Occupied'}
                      </span>
                    </div>
                  </div>

                  {/* Tenant Details & Remove Action if Rented */}
                  {isRented && (
                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="font-bold flex items-center gap-1.5 text-purple-950 dark:text-purple-100">
                            <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>Tenant: {f.tenant_name || 'Active Tenant'}</span>
                          </p>
                          {f.tenant_phone && (
                            <p className="text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              <span>{f.tenant_phone}</span>
                            </p>
                          )}
                        </div>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTenant(f.flat_id)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:hover:bg-red-500/25 dark:text-red-300 dark:border-red-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            title="Remove tenant from this unit"
                          >
                            <UserMinus className="w-3 h-3 text-red-600 dark:text-red-400" />
                            <span>Remove Tenant</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Owner Controls: Only visible when NO tenant is attached */}
                  {isOwner && !isRented && (
                    <div className="flex items-center gap-2 pt-1 border-t border-surface-200 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => handleToggleRent(f.flat_id)}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-200 text-surface-700 dark:bg-white/5 dark:hover:bg-white/10 dark:border-transparent dark:text-white text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Key className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                        <span>{isAvailableForRent ? 'Mark Self Occupied' : 'Make Available for Rent'}</span>
                      </button>

                      {isAvailableForRent && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFlatForTenant(f);
                            setSearchQuery('');
                            setSearchResults([]);
                            setHasSearched(false);
                            setSelectedTenantUser(null);
                            setTenantError('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 dark:text-purple-300 dark:border-purple-500/30 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
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
          <div className="py-8 text-center text-xs text-surface-500 dark:text-surface-200/50">
            You haven't linked any flat yet. Click &ldquo;+ Link Flat&rdquo; to associate your residence.
          </div>
        )}
      </div>

      {/* Link Tenant Modal - Search Registered Users Only */}
      {selectedFlatForTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-surface-950 border border-surface-200 dark:border-white/20 p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setSelectedFlatForTenant(null);
                setSelectedTenantUser(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-700 dark:text-surface-200/60 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Link Tenant to Unit {selectedFlatForTenant.wing}-{selectedFlatForTenant.flat_no}</span>
              </h2>
              <p className="text-xs text-surface-600 dark:text-surface-200/60 leading-relaxed">
                Search registered users by email or phone. Only app-registered users can be tenants.
              </p>
            </div>

            {tenantError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{tenantError}</span>
              </div>
            )}

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-surface-800 dark:text-surface-200/90">
                Search Tenant by Email or Mobile <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-surface-400 dark:text-surface-200/40" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (val.trim().length >= 2) {
                        handleSearchTenant(val);
                      } else {
                        setSearchResults([]);
                        setHasSearched(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchTenant();
                      }
                    }}
                    placeholder="Enter email or mobile number..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs placeholder-surface-400 dark:placeholder-surface-200/30 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearchTenant()}
                  disabled={searchingTenant || searchQuery.trim().length < 2}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Search className="w-3.5 h-3.5 text-white" />
                  <span>{searchingTenant ? 'Searching...' : 'Search'}</span>
                </button>
              </div>
            </div>

            {/* Search Results */}
            {hasSearched && (
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-bold text-surface-600 dark:text-surface-200/60 uppercase tracking-wider">
                  Registered Users ({searchResults.length})
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>No registered user found</span>
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300/80 pl-5">
                      Only registered app users can be tenants. Please ask your tenant to register on Society App first.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                    {searchResults.map((u) => {
                      const isSelected = selectedTenantUser?.id === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => setSelectedTenantUser(u)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-purple-50/80 dark:bg-purple-500/20 border-purple-400 dark:border-purple-500/50 ring-2 ring-purple-400/30 shadow-xs'
                              : 'bg-white dark:bg-white/[0.03] border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/[0.06] shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/25 text-purple-800 dark:text-purple-200 flex items-center justify-center font-extrabold text-sm shrink-0">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-surface-900 dark:text-white truncate">{u.name}</p>
                              <p className="text-[11px] text-surface-600 dark:text-surface-200/60 truncate">{u.email}</p>
                              {u.phone && (
                                <p className="text-[10px] text-surface-500 dark:text-surface-200/40 truncate">{u.phone}</p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTenantUser(u);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-surface-100 hover:bg-surface-200 border border-surface-200 text-surface-800 dark:bg-white/10 dark:hover:bg-white/20 dark:border-transparent dark:text-white'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Tenant Preview */}
            {selectedTenantUser && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Registered User Selected</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    Verified
                  </span>
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-surface-900 dark:text-white text-sm">{selectedTenantUser.name}</p>
                  <p className="text-surface-700 dark:text-surface-200/70">{selectedTenantUser.email}</p>
                  {selectedTenantUser.phone && (
                    <p className="text-surface-700 dark:text-surface-200/70">{selectedTenantUser.phone}</p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleAssignTenant} className="pt-2">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFlatForTenant(null);
                    setSelectedTenantUser(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedTenantUser || submittingTenant}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    !selectedTenantUser || submittingTenant
                      ? 'bg-surface-200 text-surface-400 dark:bg-white/10 dark:text-surface-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{submittingTenant ? 'Linking...' : 'Confirm Tenant'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
