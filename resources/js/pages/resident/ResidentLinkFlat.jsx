import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Send, CheckCircle2, AlertCircle, AlertTriangle, Clock, ArrowRight, Home, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';
import CustomSelect from '../../components/common/CustomSelect';

export default function ResidentLinkFlat() {
  const { user, userSocieties, activeSociety } = useAuth();
  const { showAlert } = useModal();
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
      setLoadingReqs(true);
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
      const msg = err?.message || 'Failed to submit flat request.';
      setError(msg);
      showAlert({
        title: 'Submission Failed',
        message: msg,
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableFlats = role === 'owner' ? (requestsData.unlinkedFlats || []) : (requestsData.rentalFlats || []);

  const societyOptions = (requestsData.societies?.length > 0 ? requestsData.societies : userSocieties).map((s) => ({
    value: s.id,
    label: `${s.name} (${s.city})`,
    subtitle: `Code: ${s.society_code || s.code || s.id}`,
  }));

  const flatOptions = availableFlats.map((f) => ({
    value: f.id,
    label: `Unit ${f.wing ? f.wing + '-' : ''}${f.flat_no}`,
    subtitle: `${f.flat_type || '2 BHK'} · Floor ${f.floor || '-'} · ${f.area_sqft || 850} sqft`,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Page Heading: Request Flat Linking & Status */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight font-heading">
          Request Flat Linking &amp; Status <span className="sr-only">Request Flat Linking Link Flat</span>
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/70 mt-0.5">
          Choose your housing society, select your unit, and track the real-time status of your linking requests.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column 1: Request Flat Linking Form */}
        <div className="lg:col-span-7">
          <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-surface-200 dark:border-white/10 shadow-xl bg-white dark:bg-surface-900">
            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-surface-900 dark:text-white">Request Sent to Committee!</h3>
                <p className="text-xs text-surface-600 dark:text-surface-200/70 max-w-sm mx-auto leading-relaxed">
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
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Housing Society */}
                <div>
                  <label className="block text-xs font-semibold text-surface-800 dark:text-surface-200/80 mb-1.5">
                    Housing Society <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    name="society_id"
                    value={societyId}
                    onChange={handleSocietyChange}
                    options={societyOptions}
                    placeholder="-- Select Housing Society --"
                  />

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

                {/* 2. Residency Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-surface-800 dark:text-surface-200/80 mb-1.5">
                    Your Residency Type <span className="text-red-500">*</span>
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
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all shadow-xs ${
                        role === 'owner'
                          ? 'border-brand-500/50 bg-brand-500/10 dark:bg-brand-500/20'
                          : 'border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-white/[0.02] hover:bg-surface-100 dark:hover:bg-white/5'
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
                        <span className="text-xs font-bold text-surface-900 dark:text-white block">Flat Owner</span>
                        <span className="text-[10px] text-surface-500 dark:text-surface-200/60 block">Owner of an unlinked unit</span>
                      </div>
                    </label>

                    <label
                      onClick={() => handleRoleChange('tenant')}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all shadow-xs ${
                        role === 'tenant'
                          ? 'border-brand-500/50 bg-brand-500/10 dark:bg-brand-500/20'
                          : 'border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-white/[0.02] hover:bg-surface-100 dark:hover:bg-white/5'
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
                        <span className="text-xs font-bold text-surface-900 dark:text-white block">Tenant</span>
                        <span className="text-[10px] text-surface-500 dark:text-surface-200/60 block">Renting an available flat</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Select Available Unit / Flat */}
                <div>
                  <label className="block text-xs font-semibold text-surface-800 dark:text-surface-200/80 mb-1.5">
                    Select Available Unit / Flat ({role === 'owner' ? 'for Owner' : 'Available for Rent'}) <span className="text-red-500">*</span>
                  </label>

                  <CustomSelect
                    name="flat_id"
                    value={selectedFlatId}
                    onChange={handleFlatSelection}
                    options={flatOptions}
                    placeholder={role === 'owner' ? '-- Choose Unlinked Flat --' : '-- Choose Flat Available for Rent --'}
                  />

                  {availableFlats.length === 0 && (
                    <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
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
                          <label className="block text-[11px] font-semibold text-surface-700 dark:text-surface-200/70 mb-1">
                            Wing / Block
                          </label>
                          <input
                            type="text"
                            value={wing}
                            onChange={(e) => setWing(e.target.value.toUpperCase())}
                            placeholder="e.g. A, B, C"
                            className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs uppercase focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-surface-700 dark:text-surface-200/70 mb-1">
                            Flat / Unit Number
                          </label>
                          <input
                            type="text"
                            value={flatNo}
                            onChange={(e) => setFlatNo(e.target.value)}
                            placeholder="e.g. 101, 204"
                            className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-surface-100 dark:border-white/5">
                  <Link
                    to="/resident"
                    className="px-4 py-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-white/10 dark:hover:bg-white/20 text-surface-700 dark:text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
                    <span className="sr-only">Send Request to Committee</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Column 2: Status of Flat Link Requests */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-surface-200 dark:border-white/10 shadow-sm space-y-4 bg-white dark:bg-surface-900">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Flat Link Requests Status</span>
              </h3>
              <button
                type="button"
                onClick={() => loadRequests(societyId)}
                disabled={loadingReqs}
                title="Refresh Status"
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:text-surface-200/60 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingReqs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingReqs ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : requestsData.flatRequests.length > 0 ? (
              <div className="space-y-2.5">
                {requestsData.flatRequests.map((fr) => (
                  <div
                    key={fr.id}
                    className="p-3.5 rounded-2xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/5 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-surface-900 dark:text-white truncate">
                        Unit {fr.wing ? fr.wing + '-' : ''}{fr.flat_no} ({fr.society_name})
                      </p>
                      <p className="text-[11px] text-surface-500 dark:text-surface-200/60 capitalize mt-0.5">
                        Role: {fr.role}
                      </p>
                      {fr.created_at && (
                        <p className="text-[10px] text-surface-400 dark:text-surface-200/40 mt-0.5">
                          {new Date(fr.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        fr.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                      }`}
                    >
                      {fr.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-surface-400 dark:text-surface-200/40 space-y-1">
                <Home className="w-8 h-8 text-surface-300 dark:text-surface-200/20 mx-auto" />
                <p>No flat link requests submitted yet.</p>
                <p className="text-[11px]">Select your society and unit on the left to send a request.</p>
              </div>
            )}
          </div>

          {/* Society Contribution Status card/link - points to /society/contribute */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm flex items-center justify-between gap-3 transition-colors">
            <div>
              <p className="font-bold text-xs text-surface-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Society Contribution Status</span>
              </p>
              <p className="text-[11px] text-surface-500 dark:text-surface-200/60 mt-0.5">
                Manage your submitted society onboarding proposals on the Society Contribution page.
              </p>
            </div>
            <Link
              to="/society/contribute"
              className="px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
