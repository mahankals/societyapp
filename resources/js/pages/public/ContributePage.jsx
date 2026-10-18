import React, { useState } from 'react';
import { Building2, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function ContributePage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [totalFlats, setTotalFlats] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } catch (err) {
      setError(err?.message || 'Failed to submit proposal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${user ? 'py-1 sm:py-2' : 'py-8 px-4 sm:px-6 lg:px-8'} max-w-4xl mx-auto space-y-6 sm:space-y-8 transition-colors`}>
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-2 shadow-sm">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white font-heading">
          Register / Contribute a Housing Society
        </h1>
        <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-200/60 max-w-xl mx-auto leading-relaxed">
          Submit your residential society details for system admin review and automated onboarding.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm transition-colors">
        {submitted ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Proposal Submitted Successfully!</h2>
            <p className="text-xs text-surface-600 dark:text-surface-200/60 max-w-md mx-auto leading-relaxed">
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
  );
}
