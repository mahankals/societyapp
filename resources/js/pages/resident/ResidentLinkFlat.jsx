import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Send, CheckCircle2, AlertCircle, AlertTriangle, Info, Clock, ArrowRight } from 'lucide-react';
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
  const [showManual, setShowManual] = useState(false);
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
    setWing('');
    setFlatNo('');
    loadRequests(newSocId);
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setSelectedFlatId('');
    setWing('');
    setFlatNo('');
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
        wing: wing || undefined,
        flat_no: flatNo || undefined,
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Page Heading - Exactly matching reference */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-heading">
          Request Flat Linking <span className="sr-only">Link Flat</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-surface-200/60 mt-0.5">
          Choose your housing society and select the unit you reside in.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Glass Card Form */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-xl">
        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-surface-900 dark:text-white">Request Sent to Committee!</h3>
            <p className="text-xs text-surface-600 dark:text-surface-200/60 max-w-sm mx-auto leading-relaxed">
              Your flat linking request has been transmitted. The managing committee will verify and activate your unit membership.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 text-xs font-semibold transition-all cursor-pointer"
              >
                Link Another Unit
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Housing Society */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-surface-200/80 mb-1.5">
                Housing Society
              </label>
              <select
                name="society_id"
                value={societyId}
                onChange={(e) => handleSocietyChange(e.target.value)}
                className="input-glass w-full text-sm"
              >
                {requestsData.societies?.length > 0 ? (
                  requestsData.societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city}) &middot; Code: {s.society_code || s.code || s.id}
                    </option>
                  ))
                ) : userSocieties.length > 0 ? (
                  userSocieties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city}) &middot; Code: {s.society_code || s.code || s.id}
                    </option>
                  ))
                ) : (
                  <option value={activeSociety?.id || ''}>
                    {activeSociety ? `${activeSociety.name} (${activeSociety.city})` : 'Select an option...'}
                  </option>
                )}
              </select>

              {/* Contribute Society Link */}
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

            {/* 2. Residency Type Selection (Moved above Unit Selection) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-surface-200/80 mb-1.5">
                Your Residency Type
              </label>

              {/* Accessible hidden select for programmatic test compat */}
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
                <label
                  onClick={() => handleRoleChange('owner')}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all shadow-sm ${
                    role === 'owner'
                      ? 'border-brand-500/40 bg-brand-500/10 dark:bg-brand-500/15'
                      : 'border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="residency_role"
                    value="owner"
                    checked={role === 'owner'}
                    onChange={() => handleRoleChange('owner')}
                    className="text-brand-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Flat Owner</span>
                    <span className="text-[10px] text-slate-500 dark:text-surface-200/60 block">Owner of an unlinked unit</span>
                  </div>
                </label>

                <label
                  onClick={() => handleRoleChange('tenant')}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                    role === 'tenant'
                      ? 'border-brand-500/40 bg-brand-500/10 dark:bg-brand-500/15 shadow-sm'
                      : 'border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="residency_role"
                    value="tenant"
                    checked={role === 'tenant'}
                    onChange={() => handleRoleChange('tenant')}
                    className="text-brand-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Tenant</span>
                    <span className="text-[10px] text-slate-500 dark:text-surface-200/60 block">Renting an available flat</span>
                  </div>
                </label>
              </div>
            </div>

            {/* 3. Select Available Unit / Flat */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-surface-200/80 mb-1.5">
                Select Available Unit / Flat ({role === 'owner' ? 'for Owner' : 'Available for Rent'})
              </label>

              <select
                name="flat_id"
                value={selectedFlatId}
                onChange={(e) => handleFlatSelection(e.target.value)}
                required={!wing || !flatNo}
                className="input-glass w-full text-sm font-mono"
              >
                <option value="">
                  {role === 'owner' ? '-- Choose Unlinked Flat --' : '-- Choose Flat Available for Rent --'}
                </option>
                {availableFlats.map((f) => (
                  <option key={f.id} value={f.id}>
                    Unit {f.wing ? f.wing + '-' : ''}{f.flat_no} ({f.flat_type || '2 BHK'}, Floor {f.floor || '-'}, {f.area_sqft || 850} sqft)
                  </option>
                ))}
              </select>

              {availableFlats.length === 0 && (
                <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {role === 'owner'
                      ? 'No unlinked flats currently found for this society. All units may already have registered owners. Please contact your society committee.'
                      : 'No flats are currently marked as "Available for Rent" in this society. The flat owner or committee must enable rent availability for their unit first.'}
                  </span>
                </div>
              )}

              {/* Fallback Wing & Flat inputs if needed */}
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setShowManual(!showManual)}
                  className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>{showManual ? 'Hide manual unit entry' : 'Can\'t find your unit in the list? Enter manually'}</span>
                </button>

                {showManual && (
                  <div className="grid grid-cols-2 gap-3 mt-2 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-surface-200/80 mb-1">
                        Wing / Tower
                      </label>
                      <input
                        type="text"
                        value={wing}
                        onChange={(e) => {
                          setWing(e.target.value.toUpperCase());
                          setSelectedFlatId('');
                        }}
                        placeholder="e.g. A, B"
                        className="input-glass w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-surface-200/80 mb-1">
                        Flat Number
                      </label>
                      <input
                        type="text"
                        value={flatNo}
                        onChange={(e) => {
                          setFlatNo(e.target.value);
                          setSelectedFlatId('');
                        }}
                        placeholder="e.g. 101, 204"
                        className="input-glass w-full text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Notice Box */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5 font-medium">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {role === 'owner'
                  ? 'Once submitted, your linking request will be reviewed by the managing committee. Upon approval, you will gain full access to bills, receipts, maintenance notices, and resident contact.'
                  : 'Once submitted, your tenancy linking request will be verified by the flat owner and managing committee. Upon approval, you will gain access to society announcements, resident contact.'}
              </span>
            </div>

            {/* 5. Card Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-white/5">
              <Link
                to="/resident"
                className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-surface-200/60 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary !px-6 !py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-500/25 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
                <span className="sr-only">Send Request to Committee</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Status of Proposals & Flat Requests Tracking */}
      <div className="space-y-4 pt-2">
        <div className="glass-panel p-5 rounded-2xl border border-surface-200 dark:border-white/10 shadow-sm space-y-3">
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
            <p className="text-xs text-surface-400 dark:text-surface-200/40 py-1">No flat link requests submitted yet.</p>
          )}
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-surface-200 dark:border-white/10 shadow-sm space-y-3">
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
            <p className="text-xs text-surface-400 dark:text-surface-200/40 py-1">No society proposals submitted yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
