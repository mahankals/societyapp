import React, { useEffect, useState, useRef } from 'react';
import {
  CreditCard,
  QrCode,
  X,
  Check,
  Building2,
  CheckSquare,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Share2,
  Printer,
  Download,
  RotateCw,
} from 'lucide-react';
import { api } from '../../services/api';
import CustomSelect from '../../components/common/CustomSelect';
import CustomCheckbox from '../../components/common/CustomCheckbox';
import { useModal } from '../../context/ModalContext';

export default function ResidentBills() {
  const [bills, setBills] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [paymentModalBills, setPaymentModalBills] = useState(null);

  // Payment states: 'input' | 'awaiting_upi' | 'processing' | 'success' | 'failed'
  const [paymentStatus, setPaymentStatus] = useState('input');
  const [manualTxnId, setManualTxnId] = useState('');
  const [txnIdError, setTxnIdError] = useState('');
  const [upiAppTxnRef, setUpiAppTxnRef] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState(null);
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

  const resetModalState = (billsList) => {
    setPaymentModalBills(billsList);
    setPaymentStatus('input');
    setManualTxnId('');
    setTxnIdError('');
    setUpiAppTxnRef('');
    setPaymentReceipt(null);
    setPaymentError('');
  };

  const openPaymentForSingle = (bill) => {
    resetModalState([bill]);
  };

  const openPaymentForSelected = () => {
    const selected = bills.filter((b) => selectedBillIds.includes(b.id) && b.status !== 'paid');
    if (selected.length === 0) return;
    resetModalState(selected);
  };

  // Aggregates for current payment
  const modalTotalAmount = paymentModalBills
    ? paymentModalBills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
    : 0;

  const currentSociety = societies.find((s) => String(s.id) === String(selectedSocietyId)) || societies[0];
  const modalUpiId = paymentModalBills?.[0]?.upi_id || currentSociety?.upi_id || 'society@upi';
  const modalUpiName = paymentModalBills?.[0]?.upi_name || currentSociety?.upi_name || currentSociety?.name || 'Housing Society';

  // Core execution of bill payment with actual status
  const executePayment = async (transactionId, outcome = 'completed', failureReason = '') => {
    if (!paymentModalBills || paymentModalBills.length === 0) return;
    setPaymentStatus('processing');
    setPaymentError('');

    try {
      const billIds = paymentModalBills.map((b) => b.id);
      const res = await api.post('/api/resident/bills/pay', {
        bill_ids: billIds,
        transaction_id: transactionId,
        status: outcome,
        reason: failureReason,
      });

      if (res && res.status === 'failed') {
        throw new Error(res.error || 'Payment was declined or cancelled in UPI app.');
      }

      const receiptData = {
        transaction_id: res.transaction_ref || transactionId,
        receipt_no: res.receipt_no || `REC-${Date.now().toString().slice(-6)}`,
        paid_at: res.paid_at || new Date().toLocaleString('en-IN'),
        total_amount: modalTotalAmount,
        paid_count: paymentModalBills.length,
        bills: [...paymentModalBills],
        payee_name: modalUpiName,
        society_name: currentSociety?.name || 'Housing Society',
        upi_id: modalUpiId,
      };

      setPaymentReceipt(receiptData);
      setPaymentStatus('success');
    } catch (err) {
      setPaymentError(err?.message || (outcome === 'failed' ? 'UPI transaction was declined or cancelled.' : 'Payment submission failed. Please try again.'));
      setPaymentStatus('failed');
    }
  };

  // 1. Manual "Confirm Paid" with required transaction ID
  const handleConfirmPaid = () => {
    if (!manualTxnId.trim()) {
      setTxnIdError('Transaction ID / UTR is required to confirm payment.');
      return;
    }
    setTxnIdError('');
    executePayment(manualTxnId.trim(), 'completed');
  };

  // 2. "Pay with UPI App" triggers intent and transitions to awaiting status verification
  const handlePayWithUpiApp = () => {
    setPaymentError('');
    const autoTxnId = `UPI${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
    setUpiAppTxnRef(autoTxnId);

    const upiLink = `upi://pay?pa=${encodeURIComponent(modalUpiId)}&pn=${encodeURIComponent(modalUpiName)}&am=${modalTotalAmount}&cu=INR&tn=${encodeURIComponent('Society Bills')}`;

    // Attempt to trigger UPI intent link on supported devices
    try {
      window.location.href = upiLink;
    } catch (e) {
      console.warn('UPI app scheme trigger warning', e);
    }

    // Move to awaiting UPI response view instead of blindly assuming success
    setPaymentStatus('awaiting_upi');
  };

  // User confirms payment succeeded in UPI app
  const handleConfirmUpiSuccess = () => {
    const finalTxnId = (upiAppTxnRef || '').trim() || `UPI${Date.now().toString().slice(-8)}`;
    executePayment(finalTxnId, 'completed');
  };

  // User reports payment failed or was cancelled in UPI app
  const handleConfirmUpiFailure = () => {
    const finalTxnId = (upiAppTxnRef || '').trim() || `UPI${Date.now().toString().slice(-8)}`;
    executePayment(finalTxnId, 'failed', 'Payment was declined or cancelled in UPI app.');
  };

  // Close modal and refresh bills
  const handleCloseModal = async () => {
    const wasSuccess = paymentStatus === 'success';
    setPaymentModalBills(null);
    setPaymentStatus('input');
    setPaymentReceipt(null);
    if (wasSuccess) {
      await loadBills(selectedSocietyId);
    }
  };

  // Share & Print receipt acknowledgment as Image / Print
  const handleShareOrPrintReceipt = async () => {
    if (!paymentReceipt) return;

    // Create Canvas for crisp GPay-style Acknowledgment Image
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Background & Card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 720);

    // Green Header Bar
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, 600, 12);

    // Success Status
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✓ Payment Successful', 300, 65);

    // Society & Payee Name
    ctx.fillStyle = '#64748b';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(paymentReceipt.society_name, 300, 95);

    // Big Amount
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(`₹${paymentReceipt.total_amount.toLocaleString('en-IN')}`, 300, 150);

    // Divider Line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 180);
    ctx.lineTo(560, 180);
    ctx.stroke();

    // Data rows
    ctx.textAlign = 'left';
    const rows = [
      ['Transaction ID (UTR)', paymentReceipt.transaction_id],
      ['Receipt Number', paymentReceipt.receipt_no],
      ['Date & Time', paymentReceipt.paid_at],
      ['Payment Method', 'UPI App / QR'],
      ['Payee UPI ID', paymentReceipt.upi_id],
      ['Bills Paid', `${paymentReceipt.paid_count} Bill(s)`],
    ];

    let y = 220;
    rows.forEach(([label, val]) => {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(label, 50, y);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(val), 550, y);
      ctx.textAlign = 'left';
      y += 38;
    });

    // Breakdown box
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(40, y + 10, 520, 140);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(40, y + 10, 520, 140);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('Items Cleared:', 55, y + 35);

    let itemY = y + 60;
    paymentReceipt.bills.slice(0, 3).forEach((b) => {
      ctx.fillStyle = '#475569';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${b.title} (Unit ${b.wing ? b.wing + '-' : ''}${b.flat_no})`, 55, itemY);
      ctx.textAlign = 'right';
      ctx.fillText(`₹${parseFloat(b.amount).toLocaleString('en-IN')}`, 545, itemY);
      ctx.textAlign = 'left';
      itemY += 24;
    });

    // Watermark Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SocietyApp • Digital Payment Acknowledgment', 300, 680);

    // Download Image
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Payment_Receipt_${paymentReceipt.receipt_no}.png`;
    link.href = dataUrl;
    link.click();

    // Also trigger native share if available
    if (navigator.share && navigator.canShare) {
      try {
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `Payment_Receipt_${paymentReceipt.receipt_no}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'Payment Acknowledgment',
                text: `Payment of ₹${paymentReceipt.total_amount} to ${paymentReceipt.society_name} (Txn: ${paymentReceipt.transaction_id})`,
                files: [file],
              });
            }
          }
        });
      } catch (err) {
        console.log('Share canceled or not supported', err);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Selected bills total
  const selectedTotalAmount = bills
    .filter((b) => selectedBillIds.includes(b.id))
    .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header (Reduced Description) */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white font-heading">
          Maintenance Bills &amp; Dues
        </h1>
        <p className="text-xs text-surface-600 dark:text-surface-200/60 mt-0.5">
          Pay society dues with instant UPI reconciliation
        </p>
      </div>

      {/* Society Selector Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
          <span className="text-xs font-bold text-surface-900 dark:text-white">Society:</span>
          {societies.length > 0 ? (
            <CustomSelect
              value={selectedSocietyId}
              onChange={(val) => handleSocietyChange(val)}
              options={societies.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Select Society"
              className="min-w-[200px]"
            />
          ) : (
            <span className="text-xs text-surface-500 dark:text-surface-200/60">No societies registered</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-surface-500 dark:text-surface-200/50">Unpaid Dues:</span>
          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
            unpaidBills.length > 0
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
          }`}>
            {unpaidBills.length} {unpaidBills.length === 1 ? 'Bill' : 'Bills'}
          </span>
        </div>
      </div>

      {/* Multi-Bill Payment Action Bar (Compact, reduced description) */}
      {selectedBillIds.length > 0 && (
        <div className="p-3 rounded-2xl bg-brand-50 border border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="text-xs font-bold text-surface-900 dark:text-white">
              {selectedBillIds.length} {selectedBillIds.length === 1 ? 'bill' : 'bills'} selected
            </span>
            <span className="text-xs text-surface-400 dark:text-surface-200/40">&bull;</span>
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
              Clear
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
                      <CustomCheckbox
                        checked={allUnpaidSelected}
                        onChange={handleToggleSelectAll}
                        title="Select All Unpaid Bills"
                        className="mx-auto"
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
                          <CustomCheckbox
                            checked={isChecked}
                            onChange={() => handleToggleBillSelect(b.id)}
                            title={`Select Unit ${b.wing ? b.wing + '-' : ''}${b.flat_no}`}
                            className="mx-auto"
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

      {/* Unified UPI Payment Modal */}
      {paymentModalBills && paymentModalBills.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-surface-950 border border-surface-200 dark:border-white/20 p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-700 dark:text-surface-200/60 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* ============================================================ */}
            {/* SUCCESS STATE: Replaces Modal Body with GPay-style Receipt   */}
            {/* ============================================================ */}
            {paymentStatus === 'success' && paymentReceipt && (
              <div className="space-y-4 animate-in zoom-in-95 duration-200 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-surface-900 dark:text-white">Payment Successful</h2>
                  <p className="text-xs text-surface-500 dark:text-surface-200/60 mt-0.5">
                    Paid to {paymentReceipt.payee_name}
                  </p>
                  <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading my-2">
                    ₹{paymentReceipt.total_amount.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Receipt Details Card (GPay style) */}
                <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 text-left text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-200 dark:border-white/5">
                    <span className="text-surface-500 dark:text-surface-200/60">UPI Transaction ID (UTR)</span>
                    <span className="font-mono font-bold text-surface-900 dark:text-white">
                      {paymentReceipt.transaction_id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-surface-500 dark:text-surface-200/60">Receipt No</span>
                    <span className="font-mono font-semibold text-surface-900 dark:text-white">
                      {paymentReceipt.receipt_no}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-surface-500 dark:text-surface-200/60">Date &amp; Time</span>
                    <span className="text-surface-700 dark:text-surface-200/80">
                      {paymentReceipt.paid_at}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-surface-500 dark:text-surface-200/60">Society</span>
                    <span className="font-medium text-surface-900 dark:text-white">
                      {paymentReceipt.society_name}
                    </span>
                  </div>

                  {/* Bills Cleared Summary */}
                  <div className="pt-2 border-t border-surface-200 dark:border-white/5 space-y-1">
                    <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-200/60 block">
                      Bills Cleared ({paymentReceipt.paid_count}):
                    </span>
                    {paymentReceipt.bills.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-[11px] text-surface-600 dark:text-surface-200/70">
                        <span className="truncate mr-2">{b.title} (Unit {b.wing ? b.wing + '-' : ''}{b.flat_no})</span>
                        <span className="font-mono font-semibold text-surface-900 dark:text-white shrink-0">
                          ₹{parseFloat(b.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions: Share / Print / Done */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleShareOrPrintReceipt}
                    className="py-2.5 px-3 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    <span>Save / Share Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="py-2.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* AWAITING UPI APP RESPONSE STATE                              */}
            {/* ============================================================ */}
            {paymentStatus === 'awaiting_upi' && (
              <div className="space-y-4 animate-in zoom-in-95 duration-200 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                  <Smartphone className="w-8 h-8 animate-pulse" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-surface-900 dark:text-white">
                    UPI App Payment in Progress
                  </h2>
                  <p className="text-xs text-surface-500 dark:text-surface-200/60 mt-1 max-w-xs mx-auto">
                    Please approve the payment in your UPI app (Google Pay, PhonePe, Paytm, or BHIM).
                  </p>
                  <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-heading my-2">
                    ₹{modalTotalAmount.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Status Box & Reference */}
                <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-white/[0.03] border border-surface-200 dark:border-white/10 text-left text-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-200 dark:border-white/5">
                    <span className="text-surface-500 dark:text-surface-200/60">Payee</span>
                    <span className="font-semibold text-surface-900 dark:text-white">{modalUpiName}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-surface-200 dark:border-white/5">
                    <span className="text-surface-500 dark:text-surface-200/60">UPI ID</span>
                    <span className="font-mono text-surface-700 dark:text-surface-200/80">{modalUpiId}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70">
                      UPI Reference / UTR Number
                    </label>
                    <input
                      type="text"
                      value={upiAppTxnRef}
                      onChange={(e) => setUpiAppTxnRef(e.target.value)}
                      placeholder="e.g. 12-digit UTR from app"
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 text-xs font-mono focus:outline-none focus:border-brand-500"
                    />
                    <p className="text-[10px] text-surface-400 dark:text-surface-200/40">
                      Auto-generated reference. You can edit if your UPI app gave a specific UTR.
                    </p>
                  </div>
                </div>

                {/* Actual Status Confirmation Buttons */}
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-surface-600 dark:text-surface-200/70">
                    Did your transaction succeed in the UPI app?
                  </p>

                  <button
                    type="button"
                    onClick={handleConfirmUpiSuccess}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>Confirm Payment Succeeded</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmUpiFailure}
                    className="w-full py-2 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-300 dark:border-red-900/40 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4 text-red-500" />
                    <span>Payment Failed or Cancelled</span>
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('input')}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    &larr; Back to QR Code &amp; Manual Entry
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* PROCESSING STATE: Shows spinner while calling API            */}
            {/* ============================================================ */}
            {paymentStatus === 'processing' && (
              <div className="space-y-4 animate-in zoom-in-95 duration-200 text-center py-8">
                <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-inner animate-spin">
                  <RotateCw className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-surface-900 dark:text-white">Recording Payment...</h2>
                  <p className="text-xs text-surface-500 dark:text-surface-200/60 mt-1">
                    Please wait while your transaction status is being recorded and verified.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* FAILED STATE: Replaces Modal Body with Error & Retry Option */}
            {/* ============================================================ */}
            {paymentStatus === 'failed' && (
              <div className="space-y-4 animate-in zoom-in-95 duration-200 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-surface-900 dark:text-white">Payment Failed / Declined</h2>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs mx-auto">
                    {paymentError || 'Unable to record payment transaction. Please verify details and retry.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-left text-xs text-surface-700 dark:text-surface-200/80">
                  <p className="font-semibold text-red-700 dark:text-red-300 mb-1">Status: Unpaid / Pending</p>
                  <p className="text-[11px] text-surface-500 dark:text-surface-200/60">
                    Your bills remain unpaid. No dues have been cleared. You can retry paying via UPI or scan the QR code.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="py-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('input')}
                    className="py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* INPUT / ACTIVE PAYMENT STATE                                  */}
            {/* ============================================================ */}
            {paymentStatus === 'input' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold text-surface-900 dark:text-white">Pay via UPI QR Code</h2>
                  <p className="text-xs text-surface-500 dark:text-surface-200/60">
                    {currentSociety?.name || 'Housing Society'} &bull; {paymentModalBills.length} {paymentModalBills.length === 1 ? 'Bill' : 'Bills'}
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading pt-1">
                    ₹{modalTotalAmount.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Option A: Quick Pay with UPI App */}
                <div>
                  <button
                    type="button"
                    onClick={handlePayWithUpiApp}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pay with UPI App (GPay / PhonePe / Paytm)</span>
                  </button>
                  <p className="text-[10px] text-center text-surface-400 dark:text-surface-200/50 mt-1">
                    Opens your UPI app and allows you to confirm the actual payment status.
                  </p>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-surface-200 dark:border-white/10"></div>
                  <span className="shrink mx-2 text-[10px] uppercase font-bold text-surface-400 dark:text-surface-200/40">OR SCAN QR</span>
                  <div className="flex-grow border-t border-surface-200 dark:border-white/10"></div>
                </div>

                {/* Generated UPI QR Preview */}
                <div className="p-3.5 rounded-2xl bg-surface-50 border border-surface-200 flex flex-col items-center justify-center shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=${encodeURIComponent(modalUpiId)}&pn=${encodeURIComponent(modalUpiName)}&am=${modalTotalAmount}&cu=INR`}
                    alt="UPI QR Code"
                    className="w-36 h-36 object-contain rounded-lg"
                  />
                  <p className="text-[11px] text-surface-700 font-semibold font-mono mt-1.5">
                    Payee: {modalUpiName}
                  </p>
                  <p className="text-[10px] text-surface-500 font-mono">
                    UPI ID: {modalUpiId}
                  </p>
                </div>

                <p className="text-[11px] text-center text-surface-500 dark:text-surface-200/50">
                  Scan with Google Pay, PhonePe, Paytm, or BHIM.
                </p>

                {/* Required Transaction ID Input for Manual Confirm */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80">
                    UPI Transaction ID / UTR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualTxnId}
                    onChange={(e) => {
                      setManualTxnId(e.target.value);
                      setTxnIdError('');
                    }}
                    placeholder="Enter 12-digit UTR from payment app"
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs font-mono focus:outline-none focus:border-brand-500"
                  />
                  {txnIdError && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                      {txnIdError}
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="py-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPaid}
                    className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Confirm Paid</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
