import React, { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Send, CheckCircle2, AlertCircle, Clock, ShieldCheck, 
  RefreshCw, Home, Key, User, Users, Plus, Trash2, Search, Check, ChevronDown 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';

export default function ContributePage() {
  const { user } = useAuth();
  const { showAlert } = useModal();
  
  // Society Details state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [totalFlats, setTotalFlats] = useState('');
  
  // Founding Committee Members & Flat Mapping state (Minimum 1 required)
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

  // Search user state per member
  const [searchQueries, setSearchQueries] = useState({});
  const [searchResults, setSearchResults] = useState({});
  const [searching, setSearching] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  // Sync member #1 with authenticated user if loaded after initial mount
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

  const loadProposals = async () => {
    if (!user) return;
    try {
      setLoadingProposals(true);
      const res = await api.get('/api/society/my-proposals');
      setProposals(res.proposals || []);
    } catch (err) {
      console.error('Failed to load proposals:', err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProposals();
    }
  }, [user]);

  // Handle member field changes
  const updateMember = (index, field, value) => {
    setMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add new committee member
  const addMember = () => {
    const nextId = Date.now();
    const nextWing = String.fromCharCode(65 + (members.length % 4)); // A, B, C, D...
    const nextFlatNo = `${members.length + 1}01`;
    setMembers(prev => [
      ...prev,
      {
        id: nextId,
        user_id: null,
        name: '',
        email: '',
        phone: '',
        role: 'committee',
        wing: nextWing,
        floor: '1',
        flat_no: nextFlatNo,
        flat_type: '2 BHK',
        area_sqft: '850',
        occupancy_status: 'self_occupied',
        is_primary: false,
      }
    ]);
  };

  // Remove committee member (enforcing minimum 1)
  const removeMember = (index) => {
    if (members.length <= 1) {
      showAlert({
        title: 'Requirement Notice',
        message: 'At least 1 committee member with flat mapping is required.',
        variant: 'warning',
      });
      return;
    }
    setMembers(prev => prev.filter((_, i) => i !== index));
  };

  // Search existing registered users
  const handleUserSearch = async (index, query) => {
    setSearchQueries(prev => ({ ...prev, [index]: query }));
    if (!query || query.trim().length < 2) {
      setSearchResults(prev => ({ ...prev, [index]: [] }));
      return;
    }
    setSearching(prev => ({ ...prev, [index]: true }));
    try {
      const res = await api.get(`/api/society/contribute/search-user?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(prev => ({ ...prev, [index]: res.users || [] }));
      setActiveDropdown(index);
    } catch (err) {
      console.error('User search error:', err);
    } finally {
      setSearching(prev => ({ ...prev, [index]: false }));
    }
  };

  const selectUser = (index, u) => {
    updateMember(index, 'user_id', u.id);
    updateMember(index, 'name', u.name);
    updateMember(index, 'email', u.email);
    updateMember(index, 'phone', u.phone || '');
    setSearchQueries(prev => ({ ...prev, [index]: '' }));
    setSearchResults(prev => ({ ...prev, [index]: [] }));
    setActiveDropdown(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!name.trim() || !city.trim() || !address.trim() || !pincode.trim()) {
      setError('Please fill all required society details.');
      setLoading(false);
      return;
    }

    if (members.length === 0) {
      setError('At least 1 founding committee member with flat mapping is required.');
      setLoading(false);
      return;
    }

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.name.trim()) {
        setError(`Please enter the full name for Committee Member #${i + 1}.`);
        setLoading(false);
        return;
      }
      if (!m.wing.trim() || !m.flat_no.trim()) {
        setError(`Please specify Wing and Flat Number for Member #${i + 1} (${m.name}).`);
        setLoading(false);
        return;
      }
    }

    try {
      await api.post('/api/society/contribute', {
        society_name: name,
        address,
        city,
        state: state || 'Maharashtra',
        pincode,
        total_flats: totalFlats,
        contact_name: members[0]?.name || user?.name || 'Guest Contributor',
        contact_email: members[0]?.email || user?.email || '',
        contact_phone: members[0]?.phone || user?.phone || '',
        members: members.map(m => ({
          user_id: m.user_id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          role: m.role,
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
      setAddress('');
      setCity('');
      setPincode('');
      setTotalFlats('');
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

      if (user) {
        await loadProposals();
      }
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
    <div className={`space-y-6 sm:space-y-8 transition-colors ${
      user ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2' : 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
    }`}>
      {/* Page Heading */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-2 shadow-sm">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white font-heading">
          Register / Contribute a Housing Society
        </h1>
        <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-200/70 max-w-xl mx-auto leading-relaxed">
          Submit your residential society details along with founding committee flat mappings for admin approval and instant onboarding.
        </p>
      </div>

      {/* Grid: 2 columns responsive for logged in user, 1 column centered for guest */}
      <div className={user ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'max-w-3xl mx-auto'}>
        
        {/* Column 1: Main Form */}
        <div className={user ? 'lg:col-span-7 space-y-6' : 'w-full space-y-6'}>
          {submitted ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm text-center space-y-4 transition-colors">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 dark:text-emerald-400 mx-auto" />
              <h2 className="text-xl font-bold text-surface-900 dark:text-white">Proposal Submitted Successfully!</h2>
              <p className="text-xs text-surface-600 dark:text-surface-200/70 max-w-md mx-auto leading-relaxed">
                Your society proposal with founding committee member and flat mapping has been routed to the system administration for review. 
                Notifications have been dispatched to all nominated members.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-brand-500/25"
              >
                Submit Another Society
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* CARD 1: Society Details */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm transition-colors space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-surface-100 dark:border-white/5">
                  <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">
                    1. Housing Society Details
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Society Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Green Valley Cooperative Housing Society"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Address / Street / Locality <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full street address and landmark"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                      PIN Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="411001"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                    Estimated Total Units / Flats
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={totalFlats}
                    onChange={(e) => setTotalFlats(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* CARD 2: Founding Committee Members with Flat Mapping */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm transition-colors space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-100 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <div>
                      <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">
                        2. Founding Committee & Flat Mapping
                      </h2>
                      <p className="text-[11px] text-surface-500 dark:text-surface-200/60">
                        Minimum 1 committee member with mapped flat is required to manage society upon approval.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addMember}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>

                {/* Info banner matching design screenshot */}
                <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span>
                    Link an already registered member account or fill their contact details for society records.
                  </span>
                </div>

                {/* Member Cards */}
                <div className="space-y-4">
                  {members.map((member, idx) => (
                    <div
                      key={member.id}
                      className="p-4 sm:p-5 rounded-2xl bg-surface-50/80 dark:bg-white/[0.02] border border-surface-200 dark:border-white/10 space-y-4 relative transition-colors"
                    >
                      {/* Member Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-surface-200/60 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-surface-900 dark:text-white">
                            {member.role ? member.role.toUpperCase() : 'COMMITTEE MEMBER'}
                          </span>
                          {member.is_primary && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              Primary Lead
                            </span>
                          )}
                        </div>
                        {members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMember(idx)}
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Select Occupancy Status - Match reference screenshot */}
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
                            const isSelected = member.occupancy_status === item.key;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => updateMember(idx, 'occupancy_status', item.key)}
                                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-50/80 dark:bg-brand-500/15 border-brand-500 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/30 font-semibold shadow-sm'
                                    : 'bg-white dark:bg-white/[0.04] border-surface-200 dark:border-white/10 text-surface-600 dark:text-surface-300 hover:border-surface-300 dark:hover:border-white/20'
                                }`}
                              >
                                <Icon className={`w-5 h-5 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-surface-500 dark:text-surface-400'}`} />
                                <span className="text-xs leading-tight">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Link Registered User Dropdown / Autocomplete */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                          Link Registered User (Committee Member)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQueries[idx] !== undefined ? searchQueries[idx] : (member.name ? `${member.name} (${member.email || member.phone || 'Linked'})` : '')}
                            onChange={(e) => handleUserSearch(idx, e.target.value)}
                            onFocus={() => {
                              if ((searchResults[idx] || []).length > 0) setActiveDropdown(idx);
                            }}
                            placeholder="-- Choose registered user or enter details manually --"
                            className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                          />
                          <ChevronDown className="w-4 h-4 text-surface-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>

                        {/* Search Dropdown list */}
                        {activeDropdown === idx && (searchResults[idx] || []).length > 0 && (
                          <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-white/15 shadow-xl p-1 space-y-1">
                            {searchResults[idx].map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => selectUser(idx, u)}
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

                      {/* 2 Columns: Full Name & Phone Number */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                            Member Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={member.name}
                            onChange={(e) => updateMember(idx, 'name', e.target.value)}
                            placeholder="Full name"
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            value={member.phone}
                            onChange={(e) => updateMember(idx, 'phone', e.target.value)}
                            placeholder="e.g. 9876543210"
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* 2 Columns: Email & Committee Role */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={member.email}
                            onChange={(e) => updateMember(idx, 'email', e.target.value)}
                            placeholder="member@example.com"
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-200/30 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-200/80 mb-1">
                            Role Designation
                          </label>
                          <select
                            value={member.role}
                            onChange={(e) => updateMember(idx, 'role', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-surface-800 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all cursor-pointer"
                          >
                            <option value="chairman">Chairman</option>
                            <option value="secretary">Secretary</option>
                            <option value="treasurer">Treasurer</option>
                            <option value="committee">Committee Member</option>
                          </select>
                        </div>
                      </div>

                      {/* Flat Mapping Grid: Wing, Flat No, Floor, Flat Type, Area */}
                      <div className="pt-2 border-t border-surface-200/60 dark:border-white/5">
                        <label className="block text-xs font-bold text-surface-800 dark:text-surface-200/90 mb-2">
                          Flat & Unit Mapping Details
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70 mb-1">
                              Wing <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={member.wing}
                              onChange={(e) => updateMember(idx, 'wing', e.target.value.toUpperCase())}
                              placeholder="A"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs text-center font-bold uppercase focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70 mb-1">
                              Flat No <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={member.flat_no}
                              onChange={(e) => updateMember(idx, 'flat_no', e.target.value)}
                              placeholder="101"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs text-center font-bold focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70 mb-1">
                              Floor
                            </label>
                            <input
                              type="text"
                              value={member.floor}
                              onChange={(e) => updateMember(idx, 'floor', e.target.value)}
                              placeholder="1"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs text-center focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-surface-600 dark:text-surface-200/70 mb-1">
                              Flat Type
                            </label>
                            <select
                              value={member.flat_type}
                              onChange={(e) => updateMember(idx, 'flat_type', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-surface-800 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500/40 focus:outline-none cursor-pointer"
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
                              value={member.area_sqft}
                              onChange={(e) => updateMember(idx, 'area_sqft', e.target.value)}
                              placeholder="850"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-surface-300 dark:border-white/10 text-surface-900 dark:text-white text-xs text-center focus:ring-2 focus:ring-brand-500/40 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Submitting Proposal & Notifying Members...' : 'Submit Society Proposal for Approval'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Column 2: Society Contribution Status (for logged in user) */}
        {user && (
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Society Contribution Status</span>
                </h3>
                <button
                  type="button"
                  onClick={loadProposals}
                  disabled={loadingProposals}
                  title="Refresh Status"
                  className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:text-surface-200/60 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProposals ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingProposals ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : proposals.length > 0 ? (
                <div className="space-y-2.5">
                  {proposals.map((sp) => (
                    <div
                      key={sp.id}
                      className="p-3.5 rounded-2xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/5 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-surface-900 dark:text-white truncate">
                          {sp.society_name}
                        </p>
                        <p className="text-[11px] text-surface-500 dark:text-surface-200/60 truncate">
                          {sp.city}, {sp.state}
                        </p>
                        {sp.created_at && (
                          <p className="text-[10px] text-surface-400 dark:text-surface-200/40 mt-0.5">
                            Submitted on {new Date(sp.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          sp.status === 'approved'
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                            : sp.status === 'rejected'
                            ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                            : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                        }`}
                      >
                        {sp.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-surface-400 dark:text-surface-200/40 space-y-1">
                  <Clock className="w-8 h-8 text-surface-300 dark:text-surface-200/20 mx-auto" />
                  <p>No society proposals submitted yet.</p>
                  <p className="text-[11px]">Fill the form on the left to submit a new society proposal.</p>
                </div>
              )}
            </div>

            {/* Note banner */}
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-white/[0.02] border border-surface-200 dark:border-white/10 text-xs text-surface-600 dark:text-surface-200/70 space-y-1">
              <p className="font-semibold text-surface-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Admin Review & Automatic Member Onboarding</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Proposals are verified by platform administrators. Once approved, the society and its founding committee flats are automatically created, and committee access is granted immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
