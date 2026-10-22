import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  FileCheck, LayoutDashboard, Building2, Users, UserCheck, 
  ClipboardList, Search, Plus, Loader2, X, Filter, MapPin, 
  Globe2, Layers, CheckCircle2, AlertCircle, Info, ChevronDown
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';
import { SUPPORTED_STATES, type SupportedState } from '../types/compliance';

export const AdminChecklist: React.FC = () => {
  const [rawOther, setRawOther] = useState<any[]>([]);
  const [rawSec, setRawSec] = useState<any[]>([]);
  const [rawState, setRawState] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [establishmentFilter, setEstablishmentFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    vendorType: 'state-vendor',
    country: 'India',
    state: 'Maharashtra',
    id: '',
    serialNumber: '',
    title: '',
    type: 'CL Act',
    formNo: '',
    periodicity: 'Annual',
    particulars: '',
    statutoryRequirement: '',
    active: true
  });
  const [error, setError] = useState('');

  const sidebarItems = getAdminSidebarItems('Checklist');

  const fetchChecklist = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/checklist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        const other = (data.data.otherVendor || []).map((i: any) => ({
          ...i,
          vendorCategory: 'Other Vendor',
          country: i.country || 'India',
          state: i.state || 'N/A'
        }));
        const sec = (data.data.securityVendor || []).map((i: any) => ({
          ...i,
          vendorCategory: 'Security Vendor',
          country: i.country || 'India',
          state: i.state || 'N/A'
        }));
        const stateItems = (data.data.stateVendor || []).map((i: any) => ({
          ...i,
          vendorCategory: 'State Vendor',
          country: i.country || 'India'
        }));

        setRawOther(other);
        setRawSec(sec);
        setRawState(stateItems);
      }
    } catch (err) {
      console.error('Error fetching checklist items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, []);

  const handleToggleStatus = async (item: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE_URL}/admin/checklist/${item.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: item.active === false ? true : false })
      });
      fetchChecklist();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          vendorType: formData.vendorType, 
          item: {
            id: formData.id || `CUSTOM-${Date.now()}`,
            serialNumber: Number(formData.serialNumber) || Date.now(),
            country: 'India',
            state: formData.vendorType === 'state-vendor' ? formData.state : (formData.state || 'N/A'),
            title: formData.title,
            type: formData.type,
            formNo: formData.formNo,
            periodicity: formData.periodicity,
            particulars: formData.particulars || formData.title,
            statutoryRequirement: formData.statutoryRequirement,
            active: formData.active
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setFormData({
          vendorType: 'state-vendor',
          country: 'India',
          state: 'Maharashtra',
          id: '',
          serialNumber: '',
          title: '',
          type: 'CL Act',
          formNo: '',
          periodicity: 'Annual',
          particulars: '',
          statutoryRequirement: '',
          active: true
        });
        fetchChecklist();
      } else {
        setError(data.error || 'Failed to create criteria item');
      }
    } catch (err) {
      setError('An unexpected network error occurred.');
    }
  };

  /**
   * Helper: Consolidates state checklist items when "All" is selected,
   * handling duplicates across states by grouping identical statutory rubrics
   * (same Act, Form No, Description, Periodicity) and recording all applicable states.
   */
  const consolidateStateItems = (itemsList: any[]) => {
    const groups = new Map<string, any[]>();

    itemsList.forEach(item => {
      const act = (item.actNameInShort || item.type || '').trim().toLowerCase();
      const form = (item.formNo || item['Form No.'] || '').trim().toLowerCase();
      const desc = (item.description || item['Description'] || item.particulars || item.title || '').trim().toLowerCase();
      const period = (item.periodicity || item['Periodicity'] || '').trim().toLowerCase();
      const key = `${act}:::${form}:::${desc}:::${period}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    const consolidated: any[] = [];
    groups.forEach((groupItems) => {
      const first = groupItems[0];
      const states = Array.from(new Set(groupItems.map(g => g.state || g.State).filter(Boolean)));

      consolidated.push({
        ...first,
        applicableStates: states,
        state: states.length > 1 ? `All (${states.length} States)` : (states[0] || 'N/A'),
        isConsolidated: states.length > 1,
        duplicateCount: groupItems.length
      });
    });

    return consolidated;
  };

  /**
   * Filter and resolve applicable items based on State, Establishment, and Search.
   */
  const processedItems = useMemo(() => {
    let resolvedStateItems: any[] = [];

    if (stateFilter === 'All') {
      // Requirement 6: When All is selected, display combined applicable entries across the six states, handling duplicates appropriately
      resolvedStateItems = consolidateStateItems(rawState);
    } else if (stateFilter === 'N/A') {
      // Requirement 7: Keep N/A distinct from All. Implement N/A as unassigned/non-applicable state only. Do not treat as a wildcard.
      resolvedStateItems = rawState.filter(i => {
        const s = (i.state || i.State || '').trim().toLowerCase();
        return s === 'n/a' || s === 'na' || s === '';
      });
    } else {
      // Requirement 5: When a specific state is selected, display only applicable checklist entries for that state
      resolvedStateItems = rawState.filter(i => {
        const s = (i.state || i.State || '').trim().toLowerCase();
        return s === stateFilter.trim().toLowerCase();
      });
    }

    // Resolve General/Unassigned items (otherVendor & securityVendor)
    let generalItems: any[] = [];
    if (stateFilter === 'N/A' || stateFilter === 'All') {
      // Include non-state specific (N/A) items
      generalItems = [...rawOther, ...rawSec];
    }

    // Combine candidate items
    let pool: any[] = [];
    if (establishmentFilter === 'State Vendor') {
      pool = resolvedStateItems;
    } else if (establishmentFilter === 'Other Vendor') {
      pool = stateFilter === 'All' || stateFilter === 'N/A' ? rawOther : [];
    } else if (establishmentFilter === 'Security Vendor') {
      pool = stateFilter === 'All' || stateFilter === 'N/A' ? rawSec : [];
    } else {
      // 'All' Categories
      pool = [...resolvedStateItems, ...generalItems];
    }

    // Apply Search Term
    if (!searchTerm.trim()) return pool;

    const query = searchTerm.toLowerCase().trim();
    return pool.filter(i => {
      const idMatch = (i.id || '').toLowerCase().includes(query);
      const titleMatch = (i.title || '').toLowerCase().includes(query);
      const particularsMatch = (i.particulars || i.statutoryRequirement || i.description || '').toLowerCase().includes(query);
      const actMatch = (i.type || i.actNameInShort || i.nameOfAct || '').toLowerCase().includes(query);
      const formMatch = (i.formNo || i['Form No.'] || '').toLowerCase().includes(query);
      const stateMatch = (i.state || '').toLowerCase().includes(query);
      const countryMatch = (i.country || '').toLowerCase().includes(query);
      return idMatch || titleMatch || particularsMatch || actMatch || formMatch || stateMatch || countryMatch;
    });
  }, [rawOther, rawSec, rawState, stateFilter, establishmentFilter, searchTerm]);

  // Overall statistics
  const totalStateImportCount = rawState.length; // 180 entries
  const activeCount = processedItems.filter(i => i.active !== false).length;
  const categoriesCount = Array.from(new Set(processedItems.map(i => i.type || i.actNameInShort || 'Standard'))).length;

  return (
    <DashboardLayout title="Admin Portal - Checklist" sidebarItems={sidebarItems}>
      {/* 1. Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-header-title">Vendor Compliance Checklist</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> India State & Statutory Governance
            </span>
          </div>
          <p className="admin-header-subtitle">
            Comprehensive regulatory audit rubrics across Indian States (Maharashtra, Haryana, Telangana, Karnataka, MP, UP) and National Labour Codes.
          </p>
        </div>
        <button className="db-btn db-btn-primary" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-4 h-4 mr-1" /> Add Criteria Item
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="admin-kpi-grid-3col">
        <div className="admin-kpi-card blue">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Displayed Rubrics</span>
            <div className="admin-kpi-icon-wrapper blue">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{processedItems.length}</div>
          <span className="admin-kpi-subtext">
            {stateFilter === 'All' ? 'Combined state entries (deduplicated)' : `Filtered for ${stateFilter}`}
          </span>
          <span className="admin-kpi-badge">
            {totalStateImportCount} Imported State Records
          </span>
        </div>

        <div className="admin-kpi-card emerald">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Active Enforced</span>
            <div className="admin-kpi-icon-wrapper emerald">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{activeCount}</div>
          <span className="admin-kpi-subtext">Actively evaluated in field audits</span>
          <span className="admin-kpi-badge">Enforced</span>
        </div>

        <div className="admin-kpi-card cyan">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Jurisdictions</span>
            <div className="admin-kpi-icon-wrapper cyan">
              <Globe2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">6 States + N/A</div>
          <span className="admin-kpi-subtext">Country: India (All Jurisdictions)</span>
          <span className="admin-kpi-badge">{categoriesCount} Statutory Acts</span>
        </div>
      </div>

      {/* 3. Add Item Modal / Card */}
      {isAdding && (
        <div className="admin-form-card">
          <div className="admin-form-header">
            <div className="admin-form-title-wrap">
              <div className="admin-form-icon-pill">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <h3 className="admin-form-title">Add New Compliance Requirement</h3>
                <p className="admin-form-subtitle">Register a standardized statutory audit rubric or inspection clause with state jurisdiction.</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setIsAdding(false)} 
              className="admin-form-close-btn"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="admin-form-body">
            {error && (
              <div className="admin-form-error">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleAddSubmit} autoComplete="off" className="admin-form-grid">
              {/* Country Field (Set to India) */}
              <div className="admin-form-group">
                <label className="admin-form-label font-bold text-slate-800">
                  Country <span className="req">*</span>
                </label>
                <div className="relative">
                  <select 
                    disabled 
                    className="admin-form-select bg-slate-100 font-semibold text-slate-700 cursor-not-allowed" 
                    value="India"
                  >
                    <option value="India">🇮🇳 India</option>
                  </select>
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5">Fixed to India for statutory audit checklists.</span>
              </div>

              {/* State Dropdown */}
              <div className="admin-form-group">
                <label className="admin-form-label font-bold text-[#1565C0]">
                  State Jurisdiction <span className="req">*</span>
                </label>
                <select 
                  required 
                  className="admin-form-select font-semibold border-blue-300 bg-blue-50/40 text-[#0B1F3A]" 
                  value={formData.state} 
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                >
                  <option value="N/A">N/A (General / Unassigned)</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                </select>
                <span className="text-[11px] text-slate-500 mt-0.5">Select specific state or N/A for unassigned.</span>
              </div>

              {/* Establishment Type */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Establishment Classification <span className="req">*</span>
                </label>
                <select 
                  required 
                  className="admin-form-select" 
                  value={formData.vendorType} 
                  onChange={e => setFormData({ ...formData, vendorType: e.target.value })}
                >
                  <option value="state-vendor">State Vendor</option>
                  <option value="other-vendor">Other Vendor</option>
                  <option value="security-vendor">Security Vendor</option>
                </select>
              </div>

              {/* Labour Code / Act */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Labour Code / Act <span className="req">*</span>
                </label>
                <input 
                  required 
                  className="admin-form-input" 
                  placeholder="e.g. PoB Act, CLRA Act, MW Act" 
                  value={formData.type} 
                  onChange={e => setFormData({ ...formData, type: e.target.value })} 
                />
              </div>

              {/* Form No. */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Form No. (Optional)
                </label>
                <input 
                  className="admin-form-input" 
                  placeholder="e.g. Form D, Form 21, ER - I" 
                  value={formData.formNo} 
                  onChange={e => setFormData({ ...formData, formNo: e.target.value })} 
                />
              </div>

              {/* Periodicity */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Periodicity <span className="req">*</span>
                </label>
                <select 
                  className="admin-form-select"
                  value={formData.periodicity}
                  onChange={e => setFormData({ ...formData, periodicity: e.target.value })}
                >
                  <option value="Annual">Annual</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half Yearly">Half Yearly</option>
                  <option value="One Time">One Time</option>
                </select>
              </div>

              {/* Clause Title */}
              <div className="admin-form-group full-width">
                <label className="admin-form-label">
                  Clause Title / Description <span className="req">*</span>
                </label>
                <input 
                  required 
                  className="admin-form-input" 
                  placeholder="e.g. Bonus Return / CLRA Annual Return" 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                />
              </div>

              {/* Clause ID Code */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Clause ID Code (Optional)
                </label>
                <input 
                  className="admin-form-input" 
                  placeholder="Auto-generated if empty" 
                  value={formData.id} 
                  onChange={e => setFormData({ ...formData, id: e.target.value })} 
                />
              </div>

              {/* Statutory Requirement Particulars */}
              <div className="admin-form-group full-width">
                <label className="admin-form-label">
                  Statutory Requirement Particulars <span className="req">*</span>
                </label>
                <textarea 
                  required 
                  className="admin-form-textarea" 
                  rows={3} 
                  placeholder="Detailed legal compliance requirement particulars, Act reference, and audit rubric..." 
                  value={formData.statutoryRequirement} 
                  onChange={e => setFormData({ ...formData, statutoryRequirement: e.target.value })} 
                />
              </div>

              <div className="admin-form-actions">
                <button type="button" className="db-btn db-btn-outline text-xs" onClick={() => setIsAdding(false)}>
                  Cancel
                </button>
                <button type="submit" className="db-btn db-btn-primary text-xs">
                  Save Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Main Table Card */}
      <div className="db-card">
        {/* Table Toolbar with Search, Country, State Dropdown & Establishment Filter */}
        <div className="table-toolbar flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="search-input-wrapper flex-1">
            <Search className="search-input-icon" />
            <input 
              type="text" 
              placeholder="Search rubrics, Acts, Form No, or description..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Country Field (Set to India) */}
            <div className="filter-dropdown-wrapper" title="Country: India">
              <Globe2 className="filter-dropdown-icon text-emerald-600" />
              <select 
                className="filter-dropdown-select font-bold text-slate-800 bg-slate-50 cursor-default"
                disabled
                value="India"
              >
                <option value="India">Country: India</option>
              </select>
            </div>

            {/* State Dropdown Filter */}
            <div className="filter-dropdown-wrapper" title="Select State Jurisdiction">
              <MapPin className="filter-dropdown-icon text-[#1565C0]" />
              <select 
                id="stateFilterDropdown"
                className="filter-dropdown-select font-bold text-[#0B1F3A] border-blue-300"
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
              >
                <option value="All">State: All (Consolidated)</option>
                <option value="N/A">State: N/A (General / Unassigned)</option>
                <option value="Maharashtra">State: Maharashtra</option>
                <option value="Haryana">State: Haryana</option>
                <option value="Telangana">State: Telangana</option>
                <option value="Karnataka">State: Karnataka</option>
                <option value="Madhya Pradesh">State: Madhya Pradesh</option>
                <option value="Uttar Pradesh">State: Uttar Pradesh</option>
              </select>
            </div>

            {/* Establishment Filter */}
            <div className="filter-dropdown-wrapper">
              <Filter className="filter-dropdown-icon" />
              <select 
                className="filter-dropdown-select"
                value={establishmentFilter}
                onChange={e => setEstablishmentFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="State Vendor">State Vendor</option>
                <option value="Other Vendor">Other Vendor</option>
                <option value="Security Vendor">Security Vendor</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-bold px-2 py-1 bg-slate-100 rounded-md">
              Showing {processedItems.length}
            </span>
          </div>
        </div>

        {/* State Filter Context Info Banner */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              {stateFilter === 'All' ? (
                <>Displaying <strong>Combined State Entries</strong> across 6 Indian states with duplicates consolidated (showing all applicable states per rubric).</>
              ) : stateFilter === 'N/A' ? (
                <>Displaying <strong>N/A (General / Unassigned)</strong> statutory criteria (distinct from All, strictly non-state specific).</>
              ) : (
                <>Displaying state-specific checklist entries strictly applicable to <strong>{stateFilter}</strong> (Country: India).</>
              )}
            </span>
          </div>
          {stateFilter !== 'All' && (
            <button 
              onClick={() => setStateFilter('All')} 
              className="text-[#1565C0] hover:underline font-semibold text-[11px]"
            >
              Reset to All
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Code ID</th>
                <th style={{ width: '150px' }}>Jurisdiction</th>
                <th style={{ width: '130px' }}>Establishment</th>
                <th style={{ width: '140px' }}>Labour Code / Act</th>
                <th style={{ width: '130px' }}>Form & Period</th>
                <th>Requirement Details</th>
                <th style={{ width: '90px' }}>Status</th>
                <th style={{ width: '100px' }} className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="animate-spin w-8 h-8 mx-auto text-[#1565C0]" />
                    <p className="text-xs text-slate-500 mt-2 font-semibold">Loading state checklist rubrics...</p>
                  </td>
                </tr>
              ) : processedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No compliance items match selected state/filter</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {stateFilter === 'N/A' 
                        ? 'N/A strictly filters unassigned entries. Select "All" or a specific state to view state rubrics.' 
                        : 'Try adjusting your state filter or search keywords.'}
                    </p>
                  </td>
                </tr>
              ) : (
                processedItems.map(i => {
                  const isExpanded = expandedItemId === i.id;
                  const isStateConsolidated = i.isConsolidated || (i.applicableStates && i.applicableStates.length > 1);

                  return (
                    <React.Fragment key={i.id}>
                      <tr className={i.active === false ? 'opacity-60 bg-slate-50/50' : ''}>
                        {/* 1. Code ID */}
                        <td>
                          <span className="audit-id-badge font-mono text-xs">{i.id}</span>
                        </td>

                        {/* 2. Jurisdiction (State & Country) */}
                        <td>
                          <div className="flex flex-col gap-1">
                            <span 
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                                i.state === 'N/A' 
                                  ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                  : isStateConsolidated
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                              title={i.applicableStates ? `Applicable in: ${i.applicableStates.join(', ')}` : i.state}
                            >
                              <MapPin className="w-3 h-3 shrink-0" />
                              {i.state || 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold pl-0.5">
                              🇮🇳 {i.country || 'India'}
                            </span>
                          </div>
                        </td>

                        {/* 3. Establishment */}
                        <td>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            i.vendorCategory === 'State Vendor'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : i.vendorCategory === 'Security Vendor'
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {i.vendorCategory || 'Standard'}
                          </span>
                        </td>

                        {/* 4. Labour Code / Act */}
                        <td>
                          <div className="font-bold text-xs text-slate-900">
                            {i.actNameInShort || i.type || 'Labour Act'}
                          </div>
                          {i.nameOfAct && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[140px]" title={i.nameOfAct}>
                              {i.nameOfAct}
                            </div>
                          )}
                        </td>

                        {/* 5. Form & Periodicity */}
                        <td>
                          <div className="font-semibold text-xs text-slate-800">
                            {i.formNo && i.formNo !== '-' ? i.formNo : '—'}
                          </div>
                          {(i.periodicity || i['Periodicity']) && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 mt-0.5">
                              {i.periodicity || i['Periodicity']}
                            </span>
                          )}
                        </td>

                        {/* 6. Requirement Details */}
                        <td className="max-w-md">
                          <div className="font-bold text-xs text-slate-900">
                            {i.title}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {i.description || i.particulars || i.statutoryRequirement}
                          </div>

                          {/* Show Applicable States Pill if Multi-state */}
                          {i.applicableStates && i.applicableStates.length > 1 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              <span className="text-[10px] font-bold text-purple-700">States ({i.applicableStates.length}):</span>
                              {i.applicableStates.map((st: string) => (
                                <span key={st} className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-semibold">
                                  {st}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Expand Details Trigger */}
                          {(i['Nature of Register'] || i['Classifications']) && (
                            <button
                              type="button"
                              onClick={() => setExpandedItemId(isExpanded ? null : i.id)}
                              className="text-[10px] text-[#1565C0] hover:underline font-bold mt-1 inline-flex items-center gap-0.5"
                            >
                              {isExpanded ? 'Hide source details' : 'View full Excel columns'}
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </td>

                        {/* 7. Status */}
                        <td>
                          {i.active !== false ? (
                            <span className="db-badge completed">
                              <span className="db-badge-dot"></span> Active
                            </span>
                          ) : (
                            <span className="db-badge scheduled">
                              <span className="db-badge-dot"></span> Inactive
                            </span>
                          )}
                        </td>

                        {/* 8. Action */}
                        <td className="text-right">
                          <button 
                            onClick={() => handleToggleStatus(i)} 
                            className={`db-btn text-xs py-1 px-2.5 ${i.active !== false ? 'db-btn-outline text-amber-600 border-amber-300 hover:bg-amber-50' : 'db-btn-primary'}`}
                          >
                            {i.active !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Source Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-blue-50/30">
                          <td colSpan={8} className="p-3 text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-blue-100 shadow-xs">
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Original Sl.No</span>
                                <span className="font-semibold text-slate-800">{i['Sl.No'] || i.slNo || i.serialNumber}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">State Jurisdiction</span>
                                <span className="font-semibold text-slate-800">{i.state || i['State']}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Act Name in Short</span>
                                <span className="font-semibold text-slate-800">{i['Act Name in Short'] || i.actNameInShort || i.type}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Form Number</span>
                                <span className="font-semibold text-slate-800">{i['Form No.'] || i.formNo || '—'}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Nature of Register</span>
                                <span className="font-semibold text-slate-800">{i['Nature of Register'] || i.natureOfRegister || '—'}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Classifications</span>
                                <span className="font-semibold text-slate-800">{i['Classifications'] || i.classifications || '—'}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Periodicity</span>
                                <span className="font-semibold text-slate-800">{i['Periodicity'] || i.periodicity || '—'}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Country</span>
                                <span className="font-semibold text-slate-800">🇮🇳 {i.country || 'India'}</span>
                              </div>
                              <div className="col-span-2 md:col-span-4 mt-1 pt-1 border-t border-slate-100">
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Full Act Legal Title</span>
                                <span className="font-medium text-slate-700">{i['Name of the Act'] || i.nameOfAct || '—'}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};
