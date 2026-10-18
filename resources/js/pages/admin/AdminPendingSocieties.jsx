import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Building2 } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminPendingSocieties() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/admin/societies/pending');
        setProposals(res.pending || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
          Pending Society Proposals
        </h1>
        <p className="text-xs text-surface-200/60 mt-0.5">
          Review community registrations awaiting administrative authorization
        </p>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : proposals.length > 0 ? (
          <div className="space-y-3">
            {proposals.map((p) => (
              <div key={p.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-400" />
                    <span className="text-sm font-bold text-white">{p.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Pending
                    </span>
                  </div>
                  <p className="text-xs text-surface-200/60">
                    {p.address}, {p.city}, {p.state} - {p.pincode}
                  </p>
                  <p className="text-[11px] text-surface-200/40">
                    Submitted by: {p.submitter_name} ({p.submitter_email} / {p.submitter_phone || 'No phone'})
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold hover:bg-red-500/30 transition-all flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-200/50">
            No pending society proposals at this time. All caught up!
          </div>
        )}
      </div>
    </div>
  );
}
