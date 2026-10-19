import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Building2, Send, CheckCircle2, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function ResidentLinkFlat() {
  const { user, userSocieties, activeSociety } = useAuth();
  const [societyId, setSocietyId] = useState(activeSociety?.id || (userSocieties[0]?.id || '1'));
  const [wing, setWing] = useState('A');
  const [flatNo, setFlatNo] = useState('');
  const [role, setRole] = useState('owner');
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestsData, setRequestsData] = useState({
    proposals: [],
    flatRequests: [],
    societies: [],
    unlinkedFlats: [],
    rentalFlats: [],
  });
  const [loadingReqs, setLoadingReqs] = useState(true);

  const loadRequests = async (targetSocietyId) => {
    try {
      const qSoc = targetSocietyId || societyId || '';
      const res = await api.get(`/api/resident/requests${qSoc ? `?society_id=${qSoc}` : ''}`);
      const socList = res.societies || [];
      setRequestsData({
        proposals: res.proposals || [],
        flatRequests: res.flatRequests || [],
        societies: socList,
        unlinkedFlats: res.unlinkedFlats || [],
        rentalFlats: res.rentalFlats || [],
      });
      if (socList.length > 0 && !targetSocietyId && (!societyId || societyId === '1')) {
        const initialSocId = String(socList[0].id);
        setSocietyId(initialSocId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReqs(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSocietyChange = (newSocId) => {
    setSocietyId(newSocId);
    setSelectedFlatId('');
    loadRequests(newSocId);
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setSelectedFlatId('');
  };

  const handleFlatSelection = (flatId) => {
    setSelectedFlatId(flatId);
    if (flatId) {
      const list = role === 'owner' ? requestsData.unlinkedFlats : requestsData.rentalFlats;
      const found = list.find((f) => String(f.id) === String(flatId));
      if (found) {
        setWing(found.wing || 'A');
        setFlatNo(found.flat_no || '');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/resident/link-flat', {
        society_id: societyId,
        flat_id: selectedFlatId || undefined,
        wing,
        flat_no: flatNo,
        role,
      });
      setSubmitted(true);
      setFlatNo('');
      setSelectedFlatId('');
      await loadRequests(societyId);
    } catch (err) {
      setError(err?.message || 'Failed to submit flat request.');
    } finally {
      setLoading(false);
    }
  };

  const availableFlats = role === 'owner' ? (requestsData.unlinkedFlats || []) : (requestsData.rentalFlats || []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
          Link Flat &amp; Request Tracking
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
          Request verification from society committee and track your active proposals
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Request Form */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-sm font-bold text-surface-900 dark:text-white">Link New Unit / Residence</h2>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-surface-900 dark:text-white">Request Sent to Committee!</h3>
              <p className="text-xs text-surface-600 dark:text-surface-200/60 max-w-xs mx-auto">
                Your flat linking request has been transmitted. The committee will verify and activate your unit.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-2 px-3.5 py-1.5 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 text-xs font-medium transition-all cursor-pointer"
              >
                Link Another Unit
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Society Selector */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                  Select Society
                </label>
                <select
                  value={societyId}
                  onChange={(e) => handleSocietyChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:border-brand-500 font-medium"
                >
                  {requestsData.societies?.length > 0 ? (
                    requestsData.societies.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">
                        {s.name} ({s.city})
                      </option>
                    ))
                  ) : userSocieties.length > 0 ? (
                    userSocieties.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">
                        {s.name} ({s.city})
                      </option>
                    ))
                  ) : (
                    <option value={activeSociety?.id || ''} className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">
                      {activeSociety ? activeSociety.name : 'Default Housing Society'}
                    </option>
                  )}
                </select>

                {/* Unregistered Society Link */}
                <div className="mt-2">
                  <Link
                    to="/society/contribute"
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Your Society Not listed? Click here to Contribute</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* 2. Occupancy Type (Moved BEFORE Flat Selection) */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1.5">
                  Occupancy Type
                </label>
                {/* Hidden select for accessibility and automated test compatibility */}
                <select
                  name="role"
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <option value="owner">Flat Owner / Resident</option>
                  <option value="tenant">Tenant / Renter</option>
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('owner')}
                    className={`p-3 rounded-xl border text-left cursor-pointer flex items-center gap-2.5 transition-all ${
                      role === 'owner'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300 shadow-xs'
                        : 'border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-white/[0.02] text-surface-700 dark:text-surface-200/70 hover:bg-surface-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role_radio"
                      value="owner"
                      checked={role === 'owner'}
                      onChange={() => handleRoleChange('owner')}
                      className="text-brand-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold block text-surface-900 dark:text-white">Flat Owner</span>
                      <span className="text-[10px] text-surface-500 dark:text-surface-200/60 block">Owner of an unlinked unit</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('tenant')}
                    className={`p-3 rounded-xl border text-left cursor-pointer flex items-center gap-2.5 transition-all ${
                      role === 'tenant'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300 shadow-xs'
                        : 'border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-white/[0.02] text-surface-700 dark:text-surface-200/70 hover:bg-surface-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role_radio"
                      value="tenant"
                      checked={role === 'tenant'}
                      onChange={() => handleRoleChange('tenant')}
                      className="text-brand-500 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-bold block text-surface-900 dark:text-white">Tenant</span>
                      <span className="text-[10px] text-surface-500 dark:text-surface-200/60 block">Renting an available flat</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Available Unmapped Flats List based on Occupancy Type */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                  {role === 'owner' ? 'Select Available Unlinked Unit' : 'Select Unit Available for Rent'}
                </label>
                <select
                  value={selectedFlatId}
                  onChange={(e) => handleFlatSelection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="" className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">
                    -- Choose from available flats ({availableFlats.length} found) --
                  </option>
                  {availableFlats.map((f) => (
                    <option key={f.id} value={f.id} className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">
                      Unit {f.wing ? f.wing + '-' : ''}{f.flat_no} {f.flat_type ? `(${f.flat_type})` : ''} {f.floor ? `• Floor ${f.floor}` : ''} {f.area_sqft ? `• ${f.area_sqft} sqft` : ''}
                    </option>
                  ))}
                </select>

                {availableFlats.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
                    {role === 'owner'
                      ? 'No unlinked flats found in this society. You can enter Wing and Flat No manually below.'
                      : 'No units currently marked available for rent in this society. You can specify details manually below.'}
                  </p>
                )}
              </div>

              {/* 4. Manual Wing and Flat (pre-filled or manual) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Wing / Tower
                  </label>
                  <input
                    type="text"
                    required
                    value={wing}
                    onChange={(e) => {
                      setWing(e.target.value.toUpperCase());
                      setSelectedFlatId('');
                    }}
                    placeholder="e.g. A, B"
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
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
                    onChange={(e) => {
                      setFlatNo(e.target.value);
                      setSelectedFlatId('');
                    }}
                    placeholder="e.g. 101, 204"
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Submitting Request...' : 'Send Request to Committee'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Status of Proposals & Flat Requests */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Flat Link Requests Status</span>
            </h3>
            {requestsData.flatRequests.length > 0 ? (
              <div className="space-y-2">
                {requestsData.flatRequests.map((fr) => (
                  <div key={fr.id} className="p-3 rounded-xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-surface-900 dark:text-white">
                        Unit {fr.wing ? fr.wing + '-' : ''}{fr.flat_no} ({fr.society_name})
                      </p>
                      <p className="text-[11px] text-surface-500 dark:text-surface-200/50 capitalize">Role: {fr.role}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      fr.status === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                    }`}>
                      {fr.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-surface-400 dark:text-surface-200/40 py-2">No flat link requests submitted yet.</p>
            )}
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Society Contribution Status</span>
            </h3>
            {requestsData.proposals.length > 0 ? (
              <div className="space-y-2">
                {requestsData.proposals.map((sp) => (
                  <div key={sp.id} className="p-3 rounded-xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-surface-900 dark:text-white">{sp.society_name}</p>
                      <p className="text-[11px] text-surface-500 dark:text-surface-200/50">{sp.city}, {sp.state}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      sp.status === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                    }`}>
                      {sp.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-surface-400 dark:text-surface-200/40 py-2">No society proposals submitted yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
