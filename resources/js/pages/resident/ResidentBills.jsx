import React, { useEffect, useState } from 'react';
import { CreditCard, QrCode, X, Check, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

export default function ResidentBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/resident/bills');
        setBills(res.bills || []);
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
          Maintenance Bills &amp; Dues
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
          Review generated bills, pay via UPI QR code, and verify transaction receipts
        </p>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs space-y-4">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : bills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-200 dark:border-white/10 text-surface-500 dark:text-surface-200/50">
                  <th className="pb-2.5 font-medium">Bill Title</th>
                  <th className="pb-2.5 font-medium">Unit</th>
                  <th className="pb-2.5 font-medium">Amount</th>
                  <th className="pb-2.5 font-medium">Due Date</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-white/5">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-semibold text-surface-900 dark:text-white">{b.title}</td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/70">
                      Unit {b.wing ? b.wing + '-' : ''}{b.flat_no}
                    </td>
                    <td className="py-3 font-semibold text-surface-900 dark:text-white">
                      ₹{parseFloat(b.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-surface-600 dark:text-surface-200/70">
                      {b.due_date ? new Date(b.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        b.status === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {b.status !== 'paid' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedBill(b)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1.5 ml-auto transition-all cursor-pointer shadow-xs"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Pay with UPI</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Cleared</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-500 dark:text-surface-200/50">
            No maintenance bills found. All clear!
          </div>
        )}
      </div>

      {/* UPI QR Payment Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-surface-950 border border-surface-200 dark:border-white/20 p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedBill(null)}
              className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-700 dark:text-surface-200/60 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-surface-900 dark:text-white">Pay via UPI QR Code</h2>
              <p className="text-xs text-surface-500 dark:text-surface-200/60">{selectedBill.title}</p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading pt-2">
                ₹{parseFloat(selectedBill.amount).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Generated UPI QR Preview */}
            <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200 flex flex-col items-center justify-center shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=${encodeURIComponent(selectedBill.upi_id || 'society@upi')}&pn=${encodeURIComponent(selectedBill.upi_name || 'Society')}&am=${selectedBill.amount}&cu=INR`}
                alt="UPI QR Code"
                className="w-44 h-44 object-contain rounded-lg"
              />
              <p className="text-[10px] text-surface-500 font-mono mt-2">
                UPI ID: {selectedBill.upi_id || 'society@upi'}
              </p>
            </div>

            <p className="text-[11px] text-center text-surface-500 dark:text-surface-200/50 leading-relaxed">
              Scan with Google Pay, PhonePe, Paytm, or BHIM. Dues are reconciled automatically.
            </p>

            <button
              type="button"
              onClick={() => setSelectedBill(null)}
              className="w-full py-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
