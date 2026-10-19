import React, { useEffect, useState } from 'react';
import { Receipt, CheckCircle, Download, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { useModal } from '../../context/ModalContext';

export default function ResidentReceipts() {
  const { showAlert } = useModal();
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
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
          Payment Receipts &amp; Ledger
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
          Download tax invoices and official digital receipts for maintenance payments
        </p>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : receipts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-200 dark:border-white/10 text-surface-500 dark:text-surface-200/50">
                  <th className="pb-2.5 font-medium">Receipt #</th>
                  <th className="pb-2.5 font-medium">Particulars</th>
                  <th className="pb-2.5 font-medium">Amount</th>
                  <th className="pb-2.5 font-medium">Payment Mode</th>
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-white/5">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-mono text-brand-600 dark:text-brand-400 font-semibold">
                      {r.receipt_no || `REC-${String(r.id).padStart(5, '0')}`}
                    </td>
                    <td className="py-3 font-semibold text-surface-900 dark:text-white">
                      <div>{r.bill_title || 'Maintenance Dues'}</div>
                      <div className="text-[10px] text-surface-500 dark:text-surface-200/50 font-normal">
                        {r.society_name} {r.flat_no ? `• Unit ${r.wing ? r.wing + '-' : ''}${r.flat_no}` : ''}
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{parseFloat(r.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/70 uppercase">
                      {r.payment_method || 'UPI'}
                    </td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/70">
                      {r.payment_date ? new Date(r.payment_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <a
                        href={`/resident/receipts/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="View & Download PDF Voucher"
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-500 dark:text-surface-200/50">
            No payment receipts on file yet.
          </div>
        )}
      </div>
    </div>
  );
}
