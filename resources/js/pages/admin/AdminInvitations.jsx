import React, { useEffect, useState } from 'react';
import { MailPlus, Copy, Check, Users, Building2 } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/admin/invitations');
        setInvitations(res.invitations || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCopy = (invite) => {
    const link = `${window.location.origin}/join?code=${invite.code || invite.token || invite.id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
          Society Invitations
        </h1>
        <p className="text-xs text-surface-200/60 mt-0.5">
          Share invite links for seamless resident and committee onboarding
        </p>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : invitations.length > 0 ? (
          <div className="space-y-3">
            {invitations.map((i) => (
              <div key={i.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-400" />
                    <span className="text-sm font-semibold text-white">{i.society_name || 'All Societies'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-brand-500/20 text-brand-300 border border-brand-500/30 capitalize">
                      {i.role || 'resident'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-surface-200/60">
                    Invite Code: {i.code || i.token || 'INV-' + i.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(i)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  {copiedId === i.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-surface-200" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-200/50">
            No active invitation links generated.
          </div>
        )}
      </div>
    </div>
  );
}
