import React, { useState, useEffect } from 'react';
import { 
  Building2, Send, CheckCircle2, AlertCircle, ShieldCheck, 
  Home, Key, User, Plus, Trash2, Check, ChevronDown, Edit2, X, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';

export default function ContributePage() {
  const { user } = useAuth();
  const { showAlert } = useModal();
  
  // Society Details (minimal: Society Name & City)
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  
  // Founding Committee Members list (minimum 1 required)
  const [members, setMembers] = useState([
    {
      id: 1,
      user_id: user?.id || null,
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      role: 'chairman',
      wing: 'A',
      floor: '1',
      flat_no: '101',
      flat_type: '2 BHK',
      area_sqft: '850',
      occupancy_status: 'self_occupied',
      is_primary: true,
    }
  ]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  
  // Modal Form State (matches screenshot)
  const [memberForm, setMemberForm] = useState({
    user_id: null,
    name: '',
    email: '',
    phone: '',
    role: 'committee',
    wing: 'A',
    floor: '1',
    flat_no: '101',
    flat_type: '2 BHK',
    area_sqft: '850',
    occupancy_status: 'self_occupied',
    is_primary: false,
  });

  // User search inside modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync member #1 with authenticated user once loaded
  useEffect(() => {
    if (user) {
      setMembers(prev => {
        if (prev.length === 1 && !prev[0].user_id) {
          return [
            {
              ...prev[0],
              user_id: user.id,
              name: prev[0].name || user.name || '',
              email: prev[0].email || user.email || '',
              phone: prev[0].phone || user.phone || '',
            }
          ];
        }
        return prev;
      });
    }
  }, [user]);

  // Open modal for Adding new member
  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setSearchQuery('');
    setSearchResults([]);
    setDropdownOpen(false);
    const nextWing = String.fromCharCode(65 + (members.length % 4));
    const nextFlatNo = `${members.length + 1}01`;
    setMemberForm({
      user_id: null,
      name: '',
      email: '',
      phone: '',
      role: members.length === 0 ? 'chairman' : 'committee',
      wing: nextWing,
      floor: '1',
      flat_no: nextFlatNo,
      flat_type: '2 BHK',
      area_sqft: '850',
      occupancy_status: 'self_occupied',
      is_primary: members.length === 0,
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing existing member
  const handleOpenEditModal = (idx) => {
    setEditingIndex(idx);
    setSearchQuery('');
    setSearchResults([]);
    setDropdownOpen(false);
    setMemberForm({ ...members[idx] });
    setIsModalOpen(true);
  };

  // Remove member (enforce minimum 1)
  const handleRemoveMember = (idx) => {
    if (members.length <= 1) {
      showAlert({
        title: 'Requirement Notice',
        message: 'At least 1 committee member with flat mapping is required.',
        variant: 'warning',
      });
      return;
    }
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  // Handle user search in modal
  const handleSearchUsers = async (q) => {
    setSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/api/society/contribute/search-user?q=${encodeURIComponent(q.trim())}`);
      setSearchResults(res.users || []);
      setDropdownOpen(true);
    } catch (err) {
      console.error('User search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Select user from dropdown
  const handleSelectUser = (u) => {
    setMemberForm(prev => ({
      ...prev,
      user_id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
    }));
    setSearchQuery('');
    setSearchResults([]);
    setDropdownOpen(false);
  };

  // Save member from modal
  const handleSaveMember = (e) => {
    e.preventDefault();
    if (!memberForm.name.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Member Full Name is required.',
        variant: 'danger',
      });
      return;
    }
    if (!memberForm.wing.trim() || !memberForm.flat_no.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Wing and Flat Number are required for flat mapping.',
        variant: 'danger',
      });
      return;
    }

    if (editingIndex !== null) {
      // Update existing
      setMembers(prev => {
        const updated = [...prev];
        updated[editingIndex] = { ...memberForm };
        return updated;
      });
    } else {
      // Add new
      setMembers(prev => [
        ...prev,
        {
          ...memberForm,
          id: Date.now(),
        }
      ]);
    }
    setIsModalOpen(false);
  };

  // Submit Society Proposal
  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!name.trim() || !city.trim()) {
      setError('Please provide Society Name and City.');
      setLoading(false);
      return;
    }

    if (members.length === 0) {
      setError('At least 1 founding committee member with flat mapping is required.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/society/contribute', {
        society_name: name,
        city,
        state: 'Maharashtra',
        address: '',
        pincode: '',
        contact_name: members[0]?.name || user?.name || 'Guest Contributor',
        contact_email: members[0]?.email || user?.email || '',
        contact_phone: members[0]?.phone || user?.phone || '',
        members: members.map(m => ({
          user_id: m.user_id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          role: m.role || 'committee',
          wing: m.wing,
          floor: m.floor,
          flat_no: m.flat_no,
          area_sqft: parseFloat(m.area_sqft) || 850,
          flat_type: m.flat_type,
          occupancy_status: m.occupancy_status,
          is_primary: !!m.is_primary,
        })),
      });

      setSubmitted(true);
      setName('');
      setCity('');
      setMembers([
        {
          id: Date.now(),
          user_id: user?.id || null,
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          role: 'chairman',
          wing: 'A',
          floor: '1',
          flat_no: '101',
          flat_type: '2 BHK',
          area_sqft: '850',
          occupancy_status: 'self_occupied',
          is_primary: true,
        }
      ]);
    } catch (err) {
      const msg = err?.message || 'Failed to submit proposal.';
      setError(msg);
      showAlert({
        title: 'Submission Error',
        message: msg,
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 sm:space-y-8 transition-colors">
      {/* Page Heading */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-2 shadow-sm">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white font-heading">
          Propose / Onboard a Housing Society
        </h1>
        <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-200/70 max-w-xl mx-auto leading-relaxed">
          Register a new society instance. You can search and add committee members dynamically.
        </p>
      </div>

      {submitted ? (
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm text-center space-y-4 transition-colors">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 dark:text-emerald-400 mx-auto" />
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">Proposal Submitted Successfully!</h2>
          <p className="text-xs text-surface-600 dark:text-surface-200/70 max-w-md mx-auto leading-relaxed">
            Your housing society proposal along with founding committee members has been submitted for administrative review.
            Notifications have been dispatched to all nominated members.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-4 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-brand-500/25"
          >
            Submit Another Society
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmitProposal} className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* MAIN CARD: Society Details & Committee Members Table */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm transition-colors space-y-6">
            {/* Society Name & City (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                  Society Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Shivneri CHS"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Pune"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Committee Members & Unit Allocation Header */}
            <div className="pt-4 border-t border-surface-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-surface-900 dark:text-white">
                  Committee Members & Unit Allocation
                </h2>
                <p className="text-xs text-surface-500 dark:text-surface-200/60 mt-0.5">
                  Search registered users to add them to this society proposal. Minimum 1 committee member with flat mapping is required.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-brand-500/25 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Member</span>
              </button>
            </div>

            {/* Committee Members Table */}
            <div className="overflow-x-auto rounded-2xl border border-surface-200 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-50 dark:bg-white/[0.03] text-surface-500 dark:text-surface-200/60 uppercase tracking-wider text-[10px] border-b border-surface-200 dark:border-white/10">
                    <th className="py-3 px-4 font-bold">MEMBER</th>
                    <th className="py-3 px-4 font-bold">CONTACT</th>
                    <th className="py-3 px-4 font-bold">FLAT LOCATION</th>
                    <th className="py-3 px-4 font-bold">SPECIFICATION</th>
                    <th className="py-3 px-4 font-bold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-white/5">
                  {members.map((m, idx) => (
                    <tr key={m.id || idx} className="hover:bg-surface-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-surface-900 dark:text-white">
                            {m.name || 'Unnamed Member'}
                          </span>
                          {m.is_primary ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              Primary Lead
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-semibold capitalize">
                              {m.role || 'Committee'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-surface-600 dark:text-surface-200/70">
                        <p>{m.email || 'No email provided'}</p>
                        {m.phone && <p className="text-[11px] text-surface-400 dark:text-surface-200/50">{m.phone}</p>}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-surface-800 dark:text-surface-200">
                        Wing {m.wing} · Flat {m.flat_no}
                      </td>
                      <td className="py-3.5 px-4 text-surface-600 dark:text-surface-200/70">
                        <span>{m.flat_type} ({m.area_sqft} sq.ft)</span>
                        <span className="mx-1.5 text-surface-300 dark:text-surface-200/30">·</span>
                        <span className="capitalize">{m.occupancy_status ? m.occupancy_status.replace(/_/g, ' ') : 'Self occupied'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(idx)}
                            className="px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 dark:bg-white/10 dark:hover:bg-white/15 text-surface-700 dark:text-white font-medium text-xs transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(idx)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 font-medium text-xs transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions: Cancel & Submit Society Proposal */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-surface-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  setName('');
                  setCity('');
                }}
                className="px-4 py-2.5 rounded-xl border border-surface-300 dark:border-white/15 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Submitting Proposal...' : 'Submit Society Proposal'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ADD / EDIT COMMITTEE MEMBER MODAL (Modeled after reference screenshot) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/15 shadow-2xl p-6 sm:p-7 space-y-4 my-auto relative transition-colors">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h3 className="text-base font-bold text-surface-900 dark:text-white">
                  {editingIndex !== null ? `Manage Flat ${memberForm.wing}-${memberForm.flat_no} Occupancy` : 'Add Committee Member & Flat'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              {/* Select Occupancy Status (3 Segmented Cards from Screenshot) */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-2">
                  Select Occupancy Status
                </label>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {[
                    { key: 'self_occupied', label: 'Self occupied', icon: Home },
                    { key: 'available_for_rent', label: 'Available for rent', icon: Key },
                    { key: 'rented', label: 'Rented', icon: User },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = memberForm.occupancy_status === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setMemberForm(prev => ({ ...prev, occupancy_status: item.key }))}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-brand-50/90 dark:bg-brand-500/20 border-brand-500 text-surface-900 dark:text-white ring-2 ring-brand-500/30 font-bold shadow-xs'
                            : 'bg-surface-50/60 dark:bg-white/[0.03] border-surface-200 dark:border-white/10 text-surface-600 dark:text-surface-300 hover:border-surface-300 dark:hover:border-white/20'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-surface-500 dark:text-surface-400'}`} />
                        <span className="text-xs leading-tight font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informational Alert Banner (from Screenshot) */}
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-800 dark:text-purple-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Link an already registered member account or fill their contact details for society records.</span>
              </div>

              {/* Link Registered User Dropdown (from Screenshot) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                  Link Registered User (Committee Member)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery !== '' ? searchQuery : (memberForm.name ? `${memberForm.name} (${memberForm.email || memberForm.phone || 'Linked'})` : '')}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setDropdownOpen(true);
                    }}
                    placeholder="-- Choose registered member or enter details manually --"
                    className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                  <ChevronDown className="w-4 h-4 text-surface-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {dropdownOpen && searchResults.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-white/15 shadow-xl p-1 space-y-1">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10 flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="font-semibold text-surface-900 dark:text-white">{u.name}</p>
                          <p className="text-[11px] text-surface-500 dark:text-surface-200/60">{u.email} {u.phone ? `• ${u.phone}` : ''}</p>
                        </div>
                        <Check className="w-3.5 h-3.5 text-brand-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2 Columns: Full Name | Phone Number (from Screenshot) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Member Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={memberForm.name}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Member Full Name"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Member Phone Number
                  </label>
                  <input
                    type="text"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Member Phone Number"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* 2 Columns: Email Address | Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email Address"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Role Designation
                  </label>
                  <select
                    value={memberForm.role}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all cursor-pointer"
                  >
                    <option value="chairman">Chairman</option>
                    <option value="secretary">Secretary</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="committee">Committee Member</option>
                  </select>
                </div>
              </div>

              {/* Flat Mapping: Wing, Flat Number, Floor, Flat Type, Area */}
              <div className="pt-2 border-t border-surface-100 dark:border-white/10">
                <label className="block text-xs font-bold text-surface-800 dark:text-surface-200/90 mb-2">
                  Flat Mapping & Specifications
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70 mb-1">
                      Wing <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={memberForm.wing}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, wing: e.target.value.toUpperCase() }))}
                      placeholder="A"
                      className="w-full px-2 py-1.5 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs text-center font-bold uppercase focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70 mb-1">
                      Flat No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={memberForm.flat_no}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, flat_no: e.target.value }))}
                      placeholder="101"
                      className="w-full px-2 py-1.5 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs text-center font-bold focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70 mb-1">
                      Floor
                    </label>
                    <input
                      type="text"
                      value={memberForm.floor}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, floor: e.target.value }))}
                      placeholder="1"
                      className="w-full px-2 py-1.5 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs text-center focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70 mb-1">
                      Flat Type
                    </label>
                    <select
                      value={memberForm.flat_type}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, flat_type: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500/40 focus:outline-none cursor-pointer"
                    >
                      <option value="1 RK">1 RK</option>
                      <option value="1 BHK">1 BHK</option>
                      <option value="2 BHK">2 BHK</option>
                      <option value="3 BHK">3 BHK</option>
                      <option value="4 BHK">4 BHK</option>
                      <option value="Penthouse">Penthouse</option>
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70 mb-1">
                      Area (sq.ft)
                    </label>
                    <input
                      type="number"
                      value={memberForm.area_sqft}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, area_sqft: e.target.value }))}
                      placeholder="850"
                      className="w-full px-2 py-1.5 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs text-center focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Bottom Buttons (Cancel & Save from Screenshot) */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-surface-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-surface-300 dark:border-white/15 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-all shadow-md shadow-brand-600/25 flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Save Member & Flat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
