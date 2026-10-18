import React, { useState } from 'react';
import { Home, Building2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ResidentLinkFlat() {
  const { user, userSocieties, activeSociety } = useAuth();
  const [societyId, setSocietyId] = useState(activeSociety?.id || (userSocieties[0]?.id || ''));
  const [wing, setWing] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [role, setRole] = useState('owner');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
          Link Flat / Residential Unit
        </h1>
        <p className="text-xs text-surface-200/60 mt-0.5">
          Request verification from society committee to link your flat ownership or tenancy
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Request Sent to Committee!</h2>
            <p className="text-xs text-surface-200/60 max-w-sm mx-auto">
              Your flat linking request has been transmitted to the society committee. You will receive a notification once verified.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-2 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all cursor-pointer"
            >
              Link Another Unit
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-200/80 mb-1">
                Select Society
              </label>
              <select
                value={societyId}
                onChange={(e) => setSocietyId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
              >
                {userSocieties.length > 0 ? (
                  userSocieties.map((s) => (
                    <option key={s.id} value={s.id} className="bg-surface-950 text-white">
                      {s.name} ({s.city})
                    </option>
                  ))
                ) : (
                  <option value="1" className="bg-surface-950 text-white">
                    {activeSociety ? activeSociety.name : 'Default Housing Society'}
                  </option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Wing / Tower / Block
                </label>
                <input
                  type="text"
                  name="wing"
                  required
                  value={wing}
                  onChange={(e) => setWing(e.target.value.toUpperCase())}
                  placeholder="e.g. A, B, Tower-1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Flat / Unit Number
                </label>
                <input
                  type="text"
                  name="flat_no"
                  required
                  value={flatNo}
                  onChange={(e) => setFlatNo(e.target.value)}
                  placeholder="e.g. 101, 402"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-surface-200/30 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-200/80 mb-1">
                Occupancy / Association Type
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="owner" className="bg-surface-950 text-white">Flat Owner / Landlord</option>
                <option value="tenant" className="bg-surface-950 text-white">Tenant / Renter</option>
                <option value="family" className="bg-surface-950 text-white">Family Member</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting Request...' : 'Send Request to Committee'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
