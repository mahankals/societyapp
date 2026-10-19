import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Send, CheckCircle2, AlertCircle, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';

export default function ContributePage() {
  const { user } = useAuth();
  const { showAlert } = useModal();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [totalFlats, setTotalFlats] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  const loadProposals = async () => {
    if (!user) return;
    try {
      setLoadingProposals(true);
      const res = await api.get('/api/society/my-proposals');
      setProposals(res.proposals || []);
    } catch (err) {
      console.error('Failed to load proposals:', err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProposals();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/society/contribute', {
        society_name: name,
        address,
        city,
        state: state || 'Maharashtra',
        pincode,
        total_flats: totalFlats,
        contact_name: user?.name || 'Guest Contributor',
        contact_email: user?.email || '',
        contact_phone: user?.phone || '',
      });
      setSubmitted(true);
      setName('');
      setAddress('');
      setCity('');
      setPincode('');
      setTotalFlats('');
      if (user) {
        await loadProposals();
      }
    } catch (err) {
      const msg = err?.message || 'Failed to submit proposal.';
      setError(msg);
      showAlert({
        title: 'Submission Error',
        message: msg,
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-6 sm:space-y-8 transition-colors ${
      user ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2' : 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
    }`}>
      {/* Page Heading */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-2 shadow-sm">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white font-heading">
          Register / Contribute a Housing Society
        </h1>
        <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-200/70 max-w-xl mx-auto leading-relaxed">
          Submit your residential society details for system admin review and automated onboarding.
        </p>
      </div>

      {/* Grid: 2 columns responsive for logged in user, 1 column centered for guest */}
      <div className={user ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'max-w-2xl mx-auto'}>
        
        {/* Column 1: Form Card */}
        <div className={user ? 'lg:col-span-7' : 'w-full'}>
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm transition-colors">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto" />
                <h2 className="text-xl font-bold text-surface-900 dark:text-white">Proposal Submitted Successfully!</h2>
                <p className="text-xs text-surface-600 dark:text-surface-200/70 max-w-md mx-auto leading-relaxed">
                  Your society proposal has been routed to the system administration for review. You will receive an email once approved.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-white/10 dark:hover:bg-white/20 text-surface-800 dark:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Submit Another Society
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Society Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Green Valley Cooperative Housing Society"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Address / Street / Locality <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full street address and landmark"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Pune"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      PIN Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="411001"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Estimated Total Units / Flats
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={totalFlats}
                    onChange={(e) => setTotalFlats(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Submitting Proposal...' : 'Submit Society for Approval'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Column 2: Society Contribution Status (for logged in user) */}
        {user && (
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Society Contribution Status</span>
                </h3>
                <button
                  type="button"
                  onClick={loadProposals}
                  disabled={loadingProposals}
                  title="Refresh Status"
                  className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:text-surface-200/60 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProposals ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingProposals ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : proposals.length > 0 ? (
                <div className="space-y-2.5">
                  {proposals.map((sp) => (
                    <div
                      key={sp.id}
                      className="p-3.5 rounded-2xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/5 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-surface-900 dark:text-white truncate">
                          {sp.society_name}
                        </p>
                        <p className="text-[11px] text-surface-500 dark:text-surface-200/60 truncate">
                          {sp.city}, {sp.state}
                        </p>
                        {sp.created_at && (
                          <p className="text-[10px] text-surface-400 dark:text-surface-200/40 mt-0.5">
                            Submitted on {new Date(sp.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          sp.status === 'approved'
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                            : sp.status === 'rejected'
                            ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                            : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                        }`}
                      >
                        {sp.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-surface-400 dark:text-surface-200/40 space-y-1">
                  <Clock className="w-8 h-8 text-surface-300 dark:text-surface-200/20 mx-auto" />
                  <p>No society proposals submitted yet.</p>
                  <p className="text-[11px]">Fill the form on the left to submit a new society proposal.</p>
                </div>
              )}
            </div>

            {/* Note banner */}
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/10 text-xs text-surface-600 dark:text-surface-200/70 space-y-1">
              <p className="font-semibold text-surface-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Admin Review Process</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Proposals are verified by platform administrators. Once approved, the society becomes available for wing/flat creation and resident linking.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
