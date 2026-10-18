import React, { useEffect, useState } from 'react';
import { Receipt, CheckCircle, Download, FileText } from 'lucide-react';
import { api } from '../../services/api';

export default function ResidentReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/resident/receipts');
        setReceipts(res.receipts || []);
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
          Payment Receipts &amp; Ledger
        </h1>
        <p className="text-xs text-surface-200/60 mt-0.5">
          Download tax invoices and official digital receipts for maintenance payments
        </p>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : receipts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-surface-200/50">
                  <th className="pb-2.5 font-medium">Receipt #</th>
                  <th className="pb-2.5 font-medium">Particulars</th>
                  <th className="pb-2.5 font-medium">Amount</th>
                  <th className="pb-2.5 font-medium">Payment Mode</th>
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-mono text-brand-400">
                      REC-{String(r.id).padStart(5, '0')}
                    </td>
                    <td className="py-3 font-semibold text-white">
                      {r.bill_title || 'Maintenance Dues'}
                    </td>
                    <td className="py-3 font-semibold text-emerald-400">
                      ₹{parseFloat(r.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-surface-200/70 capitalize">
                      {r.payment_method || 'UPI'}
                    </td>
                    <td className="py-3 text-surface-200/70">
                      {r.payment_date ? new Date(r.payment_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => alert(`Downloading Receipt REC-${String(r.id).padStart(5, '0')}`)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-200/50">
            No payment receipts on file yet.
          </div>
        )}
      </div>
    </div>
  );
}
