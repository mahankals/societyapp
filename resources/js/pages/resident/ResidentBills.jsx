import React, { useEffect, useState } from 'react';
import { CreditCard, QrCode, X, Check, ArrowRight, Building2, CheckSquare, Square, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export default function ResidentBills() {
  const [bills, setBills] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [paymentModalBills, setPaymentModalBills] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const loadBills = async (societyId) => {
    setLoading(true);
    try {
      const q = societyId ? `?society_id=${societyId}` : '';
      const res = await api.get(`/api/resident/bills${q}`);
      const socList = res.societies || [];
      setSocieties(socList);
      setBills(res.bills || []);
      const activeSocId = String(res.selected_society_id || (socList[0]?.id || ''));
      setSelectedSocietyId(activeSocId);
      setSelectedBillIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handleSocietyChange = (newSocietyId) => {
    setSelectedSocietyId(newSocietyId);
    loadBills(newSocietyId);
  };

  const unpaidBills = bills.filter((b) => b.status !== 'paid');
  const allUnpaidSelected = unpaidBills.length > 0 && unpaidBills.every((b) => selectedBillIds.includes(b.id));

  const handleToggleSelectAll = () => {
    if (allUnpaidSelected) {
      setSelectedBillIds([]);
    } else {
      setSelectedBillIds(unpaidBills.map((b) => b.id));
    }
  };

  const handleToggleBillSelect = (billId) => {
    setSelectedBillIds((prev) =>
      prev.includes(billId) ? prev.filter((id) => id !== billId) : [...prev, billId]
    );
  };

  const openPaymentForSingle = (bill) => {
    setPaymentSuccess('');
    setPaymentError('');
    setPaymentModalBills([bill]);
  };

  const openPaymentForSelected = () => {
    const selected = bills.filter((b) => selectedBillIds.includes(b.id) && b.status !== 'paid');
    if (selected.length === 0) return;
    setPaymentSuccess('');
    setPaymentError('');
    setPaymentModalBills(selected);
  };

  const handleConfirmPayment = async () => {
    if (!paymentModalBills || paymentModalBills.length === 0) return;
    setPaying(true);
    setPaymentError('');
    try {
      const billIds = paymentModalBills.map((b) => b.id);
      const res = await api.post('/api/resident/bills/pay', { bill_ids: billIds });
      setPaymentSuccess(res.message || 'Payment successfully recorded and reconciled!');
      setTimeout(async () => {
        setPaymentModalBills(null);
        setPaymentSuccess('');
        await loadBills(selectedSocietyId);
      }, 1500);
    } catch (err) {
      setPaymentError(err?.message || 'Failed to record payment.');
    } finally {
      setPaying(false);
    }
  };

  // Compute aggregates for modal
  const modalTotalAmount = paymentModalBills
    ? paymentModalBills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
    : 0;

  const currentSociety = societies.find((s) => String(s.id) === String(selectedSocietyId)) || societies[0];
  const modalUpiId = paymentModalBills?.[0]?.upi_id || currentSociety?.upi_id || 'society@upi';
  const modalUpiName = paymentModalBills?.[0]?.upi_name || currentSociety?.upi_name || currentSociety?.name || 'Housing Society';

  // Selected bills total
  const selectedTotalAmount = bills
    .filter((b) => selectedBillIds.includes(b.id))
    .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
          Maintenance Bills &amp; Dues
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
          Review generated bills, pay single or multiple dues via UPI QR code, and verify transaction receipts
        </p>
      </div>

      {/* Society Selector & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
          <span className="text-xs font-bold text-surface-900 dark:text-white">Society:</span>
          {societies.length > 0 ? (
            <select
              value={selectedSocietyId}
              onChange={(e) => handleSocietyChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
            >
              {societies.map((s) => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-surface-950 text-surface-900 dark:text-white">
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-surface-500 dark:text-surface-200/60">No societies registered</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-surface-500 dark:text-surface-200/50">
            Unpaid Dues in this Society:
          </span>
          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
            unpaidBills.length > 0
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
          }`}>
            {unpaidBills.length} {unpaidBills.length === 1 ? 'Bill' : 'Bills'}
          </span>
        </div>
      </div>

      {/* Multi-Bill Payment Action Bar (Visible when bills are selected) */}
      {selectedBillIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-brand-50 border border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="text-xs font-bold text-surface-900 dark:text-white">
              {selectedBillIds.length} {selectedBillIds.length === 1 ? 'bill' : 'bills'} selected
            </span>
            <span className="text-xs text-surface-400 dark:text-surface-200/40">•</span>
            <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">
              Total: ₹{selectedTotalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedBillIds([])}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-surface-100 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-transparent text-xs font-medium cursor-pointer transition-colors"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={openPaymentForSelected}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5 text-white" />
              <span>Pay Selected with UPI (₹{selectedTotalAmount.toLocaleString('en-IN')})</span>
            </button>
          </div>
        </div>
      )}

      {/* Bills Table */}
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
                  <th className="pb-2.5 font-medium w-8 text-center">
                    {unpaidBills.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allUnpaidSelected}
                        onChange={handleToggleSelectAll}
                        title="Select All Unpaid Bills"
                        className="rounded border-surface-300 text-brand-500 focus:ring-0 cursor-pointer"
                      />
                    )}
                  </th>
                  <th className="pb-2.5 font-medium">Bill Title</th>
                  <th className="pb-2.5 font-medium">Unit</th>
                  <th className="pb-2.5 font-medium">Amount</th>
                  <th className="pb-2.5 font-medium">Due Date</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-white/5">
                {bills.map((b) => {
                  const isUnpaid = b.status !== 'paid';
                  const isChecked = selectedBillIds.includes(b.id);
                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-surface-50 dark:hover:bg-white/[0.02] transition-colors ${
                        isChecked ? 'bg-brand-50/50 dark:bg-brand-500/5' : ''
                      }`}
                    >
                      <td className="py-3 text-center">
                        {isUnpaid ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleBillSelect(b.id)}
                            className="rounded border-surface-300 text-brand-500 focus:ring-0 cursor-pointer"
                          />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 font-semibold text-surface-900 dark:text-white">{b.title}</td>
                      <td className="py-3 text-surface-600 dark:text-surface-200/70 font-mono">
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
                        {isUnpaid ? (
                          <button
                            type="button"
                            onClick={() => openPaymentForSingle(b)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          >
                            <QrCode className="w-3 h-3 text-white" />
                            <span>Pay with UPI</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Cleared</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-surface-500 dark:text-surface-200/50">
            No maintenance bills found for this society. All clear!
          </div>
        )}
      </div>

      {/* Multi-Bill / Single-Bill UPI QR Payment Modal */}
      {paymentModalBills && paymentModalBills.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-surface-950 border border-surface-200 dark:border-white/20 p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setPaymentModalBills(null)}
              className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-700 dark:text-surface-200/60 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-surface-900 dark:text-white">Pay via UPI QR Code</h2>
              <p className="text-xs text-surface-500 dark:text-surface-200/60">
                {currentSociety?.name || 'Housing Society'} &bull; {paymentModalBills.length} {paymentModalBills.length === 1 ? 'Bill' : 'Bills'}
              </p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading pt-1">
                ₹{modalTotalAmount.toLocaleString('en-IN')}
              </p>
            </div>

            {/* List of included bills */}
            <div className="max-h-28 overflow-y-auto p-2.5 rounded-xl bg-surface-50 dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 space-y-1.5 text-xs">
              {paymentModalBills.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-surface-700 dark:text-surface-200/80">
                  <div className="truncate mr-2">
                    <span className="font-semibold text-surface-900 dark:text-white">{b.title}</span>
                    <span className="text-[10px] text-surface-400 dark:text-surface-200/50 block">Unit {b.wing ? b.wing + '-' : ''}{b.flat_no}</span>
                  </div>
                  <span className="font-mono font-bold text-surface-900 dark:text-white shrink-0">
                    ₹{parseFloat(b.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {paymentSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{paymentSuccess}</span>
              </div>
            )}

            {paymentError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Generated UPI QR Preview */}
            <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200 flex flex-col items-center justify-center shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=${encodeURIComponent(modalUpiId)}&pn=${encodeURIComponent(modalUpiName)}&am=${modalTotalAmount}&cu=INR`}
                alt="UPI QR Code"
                className="w-40 h-40 object-contain rounded-lg"
              />
              <p className="text-[11px] text-surface-700 font-semibold font-mono mt-2">
                Payee: {modalUpiName}
              </p>
              <p className="text-[10px] text-surface-500 font-mono">
                UPI ID: {modalUpiId}
              </p>
            </div>

            <p className="text-[11px] text-center text-surface-500 dark:text-surface-200/50 leading-relaxed">
              Scan with Google Pay, PhonePe, Paytm, or BHIM. Click confirm once paid.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPaymentModalBills(null)}
                className="py-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={paying}
                onClick={handleConfirmPayment}
                className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>{paying ? 'Recording...' : 'Confirm Paid'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
