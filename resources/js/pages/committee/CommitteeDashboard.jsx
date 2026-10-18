import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Building2, 
  Users, 
  Clock, 
  PlusCircle, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Upload, 
  X 
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function CommitteeDashboard() {
  const { activeSociety } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [reports, setReports] = useState(null);
  const [message, setMessage] = useState('');

  // Modals state
  const [showBillModal, setShowBillModal] = useState(false);
  const [billType, setBillType] = useState('Monthly Maintenance');
  const [billTitle, setBillTitle] = useState('Maintenance for Current Month');
  const [billAmount, setBillAmount] = useState('2500');
  const [billDueDate, setBillDueDate] = useState('');
  const [submittingBill, setSubmittingBill] = useState(false);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expensePaidTo, setExpensePaidTo] = useState('Apex Facility & Security Agency');
  const [expenseAmount, setExpenseAmount] = useState('4500');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('Attached verification invoice proof doc #INV-9823');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const loadAll = async () => {
    try {
      const [dashRes, reqsRes, repRes] = await Promise.all([
        api.get('/api/committee/dashboard'),
        api.get('/api/committee/requests'),
        api.get('/api/committee/reports'),
      ]);
      setData(dashRes);
      setRequests(reqsRes.requests || []);
      setReports(repRes.reports || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleApproveRequest = async (id) => {
    try {
      const res = await api.post(`/api/committee/requests/${id}/approve`);
      setMessage(res.message || 'Request approved successfully!');
      await loadAll();
    } catch (err) {
      alert(err?.message || 'Failed to approve request.');
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    setSubmittingBill(true);
    try {
      const res = await api.post('/api/committee/bills', {
        title: `${billType}: ${billTitle}`,
        amount: parseFloat(billAmount),
        due_date: billDueDate || undefined,
      });
      setMessage(res.message || 'Bill created successfully!');
      setShowBillModal(false);
      await loadAll();
    } catch (err) {
      alert(err?.message || 'Failed to generate bill.');
    } finally {
      setSubmittingBill(false);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setSubmittingExpense(true);
    try {
      const res = await api.post('/api/committee/expenses', {
        paid_to: expensePaidTo,
        amount: parseFloat(expenseAmount),
        expense_date: expenseDate,
        notes: expenseNotes,
      });
      setMessage(res.message || 'Expense voucher recorded successfully!');
      setShowExpenseModal(false);
      await loadAll();
    } catch (err) {
      alert(err?.message || 'Failed to record expense.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const stats = data?.stats || {
    flatsCount: 0,
    membersCount: 0,
    pendingRequests: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Management Committee Dashboard
          </h1>
          <p className="text-xs text-surface-200/60 mt-0.5">
            Operational and financial oversight for {activeSociety ? activeSociety.name : 'Active Society'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowBillModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>+ Create Bill</span>
          </button>
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Record Expense</span>
          </button>
          <Link
            to="/committee/flats"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Flats Directory</span>
          </Link>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Registered Flats</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-heading">
            {stats.flatsCount}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Verified Members</span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-heading">
            {stats.membersCount}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-200/60">Pending Flat Requests</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-red-400 mt-2 font-heading">
            {requests.length}
          </p>
        </div>
      </div>

      {/* Financial Reports & Summary */}
      {reports && (
        <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Society Financial Overview &amp; Reports</span>
            </h2>
            <span className="text-[11px] text-surface-200/50">Fiscal Year 2026</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[11px] text-surface-200/50">Total Collections</span>
              <p className="text-lg font-bold text-emerald-400">
                ₹{reports.totalCollections.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[11px] text-surface-200/50">Recorded Expenses</span>
              <p className="text-lg font-bold text-purple-400">
                ₹{reports.totalExpenses.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[11px] text-surface-200/50">Treasury Net Balance</span>
              <p className="text-lg font-bold text-brand-400">
                ₹{reports.netBalance.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[11px] text-surface-200/50">Outstanding Dues</span>
              <p className="text-lg font-bold text-amber-400">
                ₹{reports.pendingDuesAmount.toLocaleString('en-IN')} ({reports.pendingDuesCount} bills)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Flat Mapping Requests */}
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending Flat Link Requests ({requests.length})</span>
          </h2>
        </div>

        {requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-surface-200/50">
                  <th className="pb-2.5 font-medium">Resident</th>
                  <th className="pb-2.5 font-medium">Requested Unit</th>
                  <th className="pb-2.5 font-medium">Association</th>
                  <th className="pb-2.5 font-medium">Contact</th>
                  <th className="pb-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-semibold text-white">{r.user_name}</td>
                    <td className="py-3 text-surface-200/80 font-medium">
                      Unit {r.wing ? r.wing + '-' : ''}{r.flat_no}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 capitalize">
                        {r.role}
                      </span>
                    </td>
                    <td className="py-3 text-surface-200/60">{r.user_phone || r.user_email}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(r.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-sm inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-surface-200/40 py-4 text-center">
            No pending flat link requests awaiting approval.
          </p>
        )}
      </div>

      {/* Create Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-surface-950 border border-white/20 p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowBillModal(false)}
              className="absolute top-4 right-4 p-1.5 text-surface-200/60 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-400" />
                <span>Create Maintenance / Parking Bill</span>
              </h2>
              <p className="text-xs text-surface-200/60">
                Generate member billing and send payment notification
              </p>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Billing Category
                </label>
                <select
                  value={billType}
                  onChange={(e) => setBillType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="Monthly Maintenance" className="bg-surface-950 text-white">Monthly Maintenance Bill</option>
                  <option value="Parking Charges" className="bg-surface-950 text-white">Parking Slot Charges</option>
                  <option value="Clubhouse Amenity" className="bg-surface-950 text-white">Clubhouse / Facility Amenity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Bill Title / Particulars
                </label>
                <input
                  type="text"
                  required
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder="e.g. October 2026 Regular Maintenance"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-200/80 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="2500"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-200/80 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBill}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
                >
                  {submittingBill ? 'Generating...' : 'Issue Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-surface-950 border border-white/20 p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowExpenseModal(false)}
              className="absolute top-4 right-4 p-1.5 text-surface-200/60 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Record Society Expense &amp; Proof Document</span>
              </h2>
              <p className="text-xs text-surface-200/60">
                Document society operational outflow with receipt verification
              </p>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Paid To / Vendor Name
                </label>
                <input
                  type="text"
                  required
                  value={expensePaidTo}
                  onChange={(e) => setExpensePaidTo(e.target.value)}
                  placeholder="e.g. Apex Security Agency"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-200/80 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="4500"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-200/80 mb-1">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-200/80 mb-1">
                  Proof Document / Attachment Notes
                </label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Verification invoice or receipt attachment note"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
                >
                  {submittingExpense ? 'Recording...' : 'Record Outflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
