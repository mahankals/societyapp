import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Building2 } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminPendingSocieties() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/api/admin/societies/pending');
      setProposals(res.pending || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id) => {
    setActionLoading(id);
    setMessage('');
    try {
      const res = await api.post(`/api/admin/societies/requests/${id}/approve`);
      setMessage(res.message || 'Society approved successfully!');
      await load();
    } catch (err) {
      alert(err?.message || 'Failed to approve society proposal.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this society proposal?')) return;
    setActionLoading(id);
    setMessage('');
    try {
      const res = await api.post(`/api/admin/societies/requests/${id}/reject`);
      setMessage(res.message || 'Society proposal rejected.');
      await load();
    } catch (err) {
      alert(err?.message || 'Failed to reject society proposal.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
          Pending Society Proposals
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
          Review community registrations awaiting administrative authorization
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : proposals.length > 0 ? (
          <div className="space-y-3">
            {proposals.map((p) => (
              <div key={p.id} data-proposal-card={p.name} className="p-4 rounded-2xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span className="text-sm font-bold text-surface-900 dark:text-white">{p.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      Pending
                    </span>
                  </div>
                  <p className="text-xs text-surface-600 dark:text-surface-200/60">
                    {p.address}, {p.city}, {p.state} - {p.pincode}
                  </p>
                  <p className="text-[11px] text-surface-500 dark:text-surface-200/40">
                    Submitted by: {p.submitter_name} ({p.submitter_email} / {p.submitter_phone || 'No phone'})
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={actionLoading === p.id}
                    onClick={() => handleApprove(p.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-300 dark:border-emerald-500/30 text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{actionLoading === p.id ? 'Approving...' : 'Approve'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading === p.id}
                    onClick={() => handleReject(p.id)}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-300 dark:border-red-500/30 text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-500 dark:text-surface-200/50">
            No pending society proposals at this time. All caught up!
          </div>
        )}
      </div>
    </div>
  );
}
