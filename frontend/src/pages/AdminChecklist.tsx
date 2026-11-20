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
import './AdminChecklist.css';

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
      resolvedStateItems = consolidateStateItems(rawState);
    } else if (stateFilter === 'N/A') {
      resolvedStateItems = rawState.filter(i => {
        const s = (i.state || i.State || '').trim().toLowerCase();
        return s === 'n/a' || s === 'na' || s === '';
      });
    } else {
      resolvedStateItems = rawState.filter(i => {
        const s = (i.state || i.State || '').trim().toLowerCase();
        return s === stateFilter.trim().toLowerCase();
      });
    }

    let generalItems: any[] = [];
    if (stateFilter === 'N/A' || stateFilter === 'All') {
      generalItems = [...rawOther, ...rawSec];
    }

    let pool: any[] = [];
    if (establishmentFilter === 'State Vendor') {
      pool = resolvedStateItems;
    } else if (establishmentFilter === 'Other Vendor') {
      pool = stateFilter === 'All' || stateFilter === 'N/A' ? rawOther : [];
    } else if (establishmentFilter === 'Security Vendor') {
      pool = stateFilter === 'All' || stateFilter === 'N/A' ? rawSec : [];
    } else {
      pool = [...resolvedStateItems, ...generalItems];
    }

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

  const totalStateImportCount = rawState.length;
  const activeCount = processedItems.filter(i => i.active !== false).length;
  const categoriesCount = Array.from(new Set(processedItems.map(i => i.type || i.actNameInShort || 'Standard'))).length;

  return (
    <DashboardLayout title="Admin Portal - Checklist" sidebarItems={sidebarItems}>
      <div className="admin-checklist-container">
        {/* 1. Header */}
        <div className="checklist-header">
          <div className="checklist-title-group">
            <div className="checklist-title-row">
              <h1 className="checklist-main-title">Vendor Compliance Checklist</h1>
              <span className="checklist-badge-header">
                <span className="pulse-indicator"></span> India State & Statutory Governance
              </span>
            </div>
            <p className="checklist-subtitle">
              Comprehensive regulatory audit rubrics across Indian States (Maharashtra, Haryana, Telangana, Karnataka, MP, UP) and National Labour Codes.
            </p>
          </div>
          <button className="db-btn db-btn-primary" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Criteria Item
          </button>
        </div>

        {/* 2. KPI Summary Cards */}
        <div className="checklist-kpi-grid">
          <div className="checklist-kpi-card blue">
            <div className="kpi-header">
              <span className="kpi-title">Displayed Rubrics</span>
              <div className="kpi-icon-pill">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <div className="kpi-value">{processedItems.length}</div>
            <span className="kpi-subtext">
              {stateFilter === 'All' ? 'Combined state entries (consolidated)' : `Filtered for ${stateFilter}`}
            </span>
            <span className="kpi-pill">
              {totalStateImportCount} Imported State Records
            </span>
          </div>

          <div className="checklist-kpi-card emerald">
            <div className="kpi-header">
              <span className="kpi-title">Active Enforced</span>
              <div className="kpi-icon-pill">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="kpi-value">{activeCount}</div>
            <span className="kpi-subtext">Actively evaluated in field audits</span>
            <span className="kpi-pill">Enforced</span>
          </div>

          <div className="checklist-kpi-card purple">
            <div className="kpi-header">
              <span className="kpi-title">Jurisdictions</span>
              <div className="kpi-icon-pill">
                <Globe2 className="w-4 h-4" />
              </div>
            </div>
            <div className="kpi-value">6 States + N/A</div>
            <span className="kpi-subtext">Country: India (All Jurisdictions)</span>
            <span className="kpi-pill">{categoriesCount} Statutory Acts</span>
          </div>
        </div>

        {/* 3. Add Item Modal / Form Card */}
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
                <div className="admin-form-group">
                  <label className="admin-form-label font-bold text-slate-800">
                    Country <span className="req">*</span>
                  </label>
                  <select 
                    disabled 
                    className="admin-form-select bg-slate-100 font-semibold text-slate-700 cursor-not-allowed" 
                    value="India"
                  >
                    <option value="India">🇮🇳 India</option>
                  </select>
                  <span className="text-[11px] text-slate-500 mt-0.5">Fixed to India for statutory audit checklists.</span>
                </div>

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
        <div className="checklist-table-card">
          {/* Table Toolbar */}
          <div className="checklist-toolbar-container">
            {/* Search Box */}
            <div className="checklist-search-box">
              <Search className="checklist-search-icon" />
              <input 
                type="text" 
                className="checklist-search-input"
                placeholder="Search rubrics, Acts, Form No, or description..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => setSearchTerm('')} 
                  className="checklist-search-clear"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="checklist-filters-group">
              {/* Country Pill */}
              <div className="filter-select-pill" title="Country: India">
                <Globe2 className="filter-select-pill-icon text-emerald-600" />
                <select 
                  className="filter-select-element cursor-default font-bold text-slate-800"
                  disabled
                  value="India"
                >
                  <option value="India">Country: India</option>
                </select>
              </div>

              {/* State Dropdown Filter */}
              <div className="filter-select-pill" title="Select State Jurisdiction">
                <MapPin className="filter-select-pill-icon text-blue-600" />
                <select 
                  id="stateFilterDropdown"
                  className={`filter-select-element ${stateFilter !== 'All' ? 'active-state' : ''}`}
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
              <div className="filter-select-pill" title="Filter Establishment Classification">
                <Filter className="filter-select-pill-icon text-slate-500" />
                <select 
                  className="filter-select-element"
                  value={establishmentFilter}
                  onChange={e => setEstablishmentFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  <option value="State Vendor">State Vendor</option>
                  <option value="Other Vendor">Other Vendor</option>
                  <option value="Security Vendor">Security Vendor</option>
                </select>
              </div>

              <span className="checklist-counter-badge">
                Showing {processedItems.length} rubrics
              </span>
            </div>
          </div>

          {/* State Filter Context Info Banner */}
          <div className="checklist-context-banner">
            <div className="context-banner-left">
              <Info className="context-banner-icon" />
              <span className="context-banner-text">
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
                type="button"
                onClick={() => setStateFilter('All')} 
                className="context-banner-reset-btn"
              >
                Reset to All
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="checklist-table-scroll">
            <table className="checklist-table">
              <thead>
                <tr>
                  <th style={{ width: '115px' }}>Code ID</th>
                  <th style={{ width: '150px' }}>Jurisdiction</th>
                  <th style={{ width: '135px' }}>Establishment</th>
                  <th style={{ width: '170px' }}>Labour Code / Act</th>
                  <th style={{ width: '120px' }}>Form & Period</th>
                  <th>Requirement Details</th>
                  <th style={{ width: '95px' }}>Status</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="checklist-state-message">
                      <Loader2 className="animate-spin w-8 h-8 mx-auto text-blue-600 mb-2" />
                      <p className="font-semibold text-slate-700">Loading statutory checklist rubrics...</p>
                    </td>
                  </tr>
                ) : processedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="checklist-state-message">
                      <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <h4>No compliance items match selected state/filter</h4>
                      <p>
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
                        <tr className={i.active === false ? 'row-inactive' : ''}>
                          {/* 1. Code ID */}
                          <td>
                            <span className="checklist-code-pill">{i.id}</span>
                          </td>

                          {/* 2. Jurisdiction (State & Country) */}
                          <td>
                            <div className="jurisdiction-wrapper">
                              <span 
                                className={`jurisdiction-state-pill ${
                                  i.state === 'N/A' 
                                    ? 'unassigned' 
                                    : isStateConsolidated 
                                    ? 'consolidated' 
                                    : 'single-state'
                                }`}
                                title={i.applicableStates ? `Applicable in: ${i.applicableStates.join(', ')}` : i.state}
                              >
                                {isStateConsolidated ? (
                                  <Layers className="w-3.5 h-3.5 shrink-0" />
                                ) : (
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span>{i.state || 'N/A'}</span>
                              </span>
                              <span className="jurisdiction-country-label">
                                <span>🇮🇳</span>
                                <span>{i.country || 'India'}</span>
                              </span>
                            </div>
                          </td>

                          {/* 3. Establishment */}
                          <td>
                            <span className={`establishment-pill ${
                              i.vendorCategory === 'State Vendor'
                                ? 'state-vendor'
                                : i.vendorCategory === 'Security Vendor'
                                ? 'security-vendor'
                                : 'other-vendor'
                            }`}>
                              {i.vendorCategory || 'Standard'}
                            </span>
                          </td>

                          {/* 4. Labour Code / Act */}
                          <td>
                            <div className="act-cell-wrapper">
                              <div className="act-short-name">
                                {i.actNameInShort || i.type || 'Labour Act'}
                              </div>
                              {i.nameOfAct && (
                                <div className="act-full-title" title={i.nameOfAct}>
                                  {i.nameOfAct}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Form & Periodicity */}
                          <td>
                            <div className="form-period-wrapper">
                              <div className="form-number-text">
                                {i.formNo && i.formNo !== '-' ? i.formNo : '—'}
                              </div>
                              {(i.periodicity || i['Periodicity']) && (
                                <span className="periodicity-chip">
                                  {i.periodicity || i['Periodicity']}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. Requirement Details */}
                          <td>
                            <div className="requirement-cell-wrapper">
                              <div className="req-main-title">
                                {i.title}
                              </div>
                              <div className="req-particulars-text">
                                {i.description || i.particulars || i.statutoryRequirement}
                              </div>

                              {/* Show Applicable States Chips if Multi-state */}
                              {i.applicableStates && i.applicableStates.length > 1 && (
                                <div className="applicable-states-row">
                                  <span className="applicable-states-caption">
                                    States ({i.applicableStates.length}):
                                  </span>
                                  {i.applicableStates.map((st: string) => (
                                    <span key={st} className="state-chip-badge">
                                      {st}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Expand Excel Details Trigger */}
                              {(i['Nature of Register'] || i['Classifications']) && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedItemId(isExpanded ? null : i.id)}
                                  className={`btn-excel-toggle ${isExpanded ? 'open' : ''}`}
                                >
                                  <span>{isExpanded ? 'Hide Excel columns' : 'View full Excel columns'}</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 7. Status */}
                          <td>
                            <span className={`checklist-status-pill ${i.active !== false ? 'active' : 'inactive'}`}>
                              <span className="status-dot-indicator"></span>
                              <span>{i.active !== false ? 'Active' : 'Inactive'}</span>
                            </span>
                          </td>

                          {/* 8. Action */}
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              type="button"
                              onClick={() => handleToggleStatus(i)} 
                              className={`btn-toggle-active ${i.active !== false ? 'deactivate' : 'activate'}`}
                            >
                              {i.active !== false ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Source Details Drawer */}
                        {isExpanded && (
                          <tr className="checklist-drawer-cell">
                            <td colSpan={8}>
                              <div className="drawer-grid-container">
                                <div className="drawer-field-item">
                                  <span className="drawer-field-label">Original Sl.No</span>
                                  <span className="drawer-field-value">{i['Sl.No'] || i.slNo || i.serialNumber || '—'}</span>
                                </div>
                                <div className="drawer-field-item">
                                  <span className="drawer-field-label">State Jurisdiction</span>
                                  <span className="drawer-field-value">{i.state || i['State'] || '—'}</span>
                                </div>
                                <div className="drawer-field-item">
                                  <span className="drawer-field-label">Act Name in Short</span>
                                  <span className="drawer-field-value">{i['Act Name in Short'] || i.actNameInShort || i.type || '—'}</span>
                                </div>
                                <div className="drawer-field-item">
                                  <span className="drawer-field-label">Form Number</span>
                                  <span className="drawer-field-value">{i['Form No.'] || i.formNo || '—'}</span>
                                </div>
                                <div className="drawer-field-item">
                                  <span className="drawer-field-label">Nature of Register</span>
                                  <span className="drawer-field-value">{i['Nature of Register'] || i.natureOfRegister || '—'}</span>
                                </div>
                                <div className="drawer-field-item">
                                  <span className="drawer-field-label">Classifications</span>
                                  <span className="drawer-field-value">{i['Classifications'] || i.classifications || '—'}</span>
                                </div>
                                <div className="drawer-field-item">
                                  <span className="drawer-field-label">Periodicity</span>
                                  <span className="drawer-field-value">{i['Periodicity'] || i.periodicity || '—'}</span>
                                </div>
                                <div className="drawer-field-item">
                                  <span className="drawer-field-label">Country</span>
                                  <span className="drawer-field-value">🇮🇳 {i.country || 'India'}</span>
                                </div>
                                <div className="drawer-field-item full-width">
                                  <span className="drawer-field-label">Full Act Legal Title</span>
                                  <span className="drawer-field-value text-slate-700">{i['Name of the Act'] || i.nameOfAct || '—'}</span>
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
      </div>
    </DashboardLayout>
  );
};

