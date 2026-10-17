import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, LayoutDashboard, Building2, Users, UserCheck, ClipboardList, Search, Plus, Loader2, X, Filter } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminChecklist: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [establishmentFilter, setEstablishmentFilter] = useState('All');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    vendorType: 'other-vendor',
    id: '',
    serialNumber: '',
    title: '',
    type: 'CL Act',
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
      if (data.success) {
        // Flatten the returned structure
        const other = (data.data.otherVendor || []).map((i: any) => ({ ...i, vendorCategory: 'Other Vendor' }));
        const sec = (data.data.securityVendor || []).map((i: any) => ({ ...i, vendorCategory: 'Security Vendor' }));
        setItems([...other, ...sec]);
      }
    } catch (err) {
      console.error(err);
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
            id: formData.id || `NEW-${Date.now()}`,
            serialNumber: Number(formData.serialNumber) || items.length + 1,
            title: formData.title,
            type: formData.type,
            particulars: formData.particulars,
            statutoryRequirement: formData.statutoryRequirement,
            active: formData.active
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setFormData({ vendorType: 'other-vendor', id: '', serialNumber: '', title: '', type: 'CL Act', particulars: '', statutoryRequirement: '', active: true });
        fetchChecklist();
      } else {
        setError(data.error || 'Failed to create item');
      }
    } catch (err) {
      setError('An error occurred.');
    }
  };

  const filtered = items.filter(i => {
    const s = (i.title || i.particulars || i.id || '').toLowerCase();
    const searchMatch = s.includes(searchTerm.toLowerCase());
    const estMatch = establishmentFilter === 'All' || (i.vendorCategory === establishmentFilter);
    return searchMatch && estMatch;
  });

  const activeCount = items.filter(i => i.active !== false).length;
  const categories = Array.from(new Set(items.map(i => i.type || 'Standard'))).length;

  return (
    <DashboardLayout title="Admin Portal - Checklist" sidebarItems={sidebarItems}>
      {/* 1. Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-header-title">Compliance Checklist</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> Statutory Governance
            </span>
          </div>
          <p className="admin-header-subtitle">Standardized regulatory criteria, labour code clauses, and verification rubrics.</p>
        </div>
        <button className="db-btn db-btn-primary" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-4 h-4 mr-1" /> Add Criteria Item
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="admin-kpi-grid-3col">
        <div className="admin-kpi-card blue">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Total Rubrics</span>
            <div className="admin-kpi-icon-wrapper blue">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{items.length}</div>
          <span className="admin-kpi-subtext">Statutory clauses mapped</span>
          <span className="admin-kpi-badge">Standard Library</span>
        </div>

        <div className="admin-kpi-card emerald">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Active Clauses</span>
            <div className="admin-kpi-icon-wrapper emerald">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{activeCount}</div>
          <span className="admin-kpi-subtext">Currently enforced in audits</span>
          <span className="admin-kpi-badge">Enforced</span>
        </div>

        <div className="admin-kpi-card cyan">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Frameworks</span>
            <div className="admin-kpi-icon-wrapper cyan">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{categories} Standards</div>
          <span className="admin-kpi-subtext">Labour code & security acts</span>
          <span className="admin-kpi-badge">Verified</span>
        </div>
      </div>

      {/* Add Item Modal / Card */}
      {isAdding && (
        <div className="admin-form-card">
          <div className="admin-form-header">
            <div className="admin-form-title-wrap">
              <div className="admin-form-icon-pill">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <h3 className="admin-form-title">Add New Compliance Requirement</h3>
                <p className="admin-form-subtitle">Register a standardized statutory audit rubric or inspection clause.</p>
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
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleAddSubmit} autoComplete="off" className="admin-form-grid">
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Establishment Type <span className="req">*</span>
                </label>
                <select 
                  required 
                  className="admin-form-select" 
                  value={formData.vendorType} 
                  onChange={e => setFormData({...formData, vendorType: e.target.value})}
                >
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
                  placeholder="e.g. CL Act, EPF, ESI" 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})} 
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Clause Title <span className="req">*</span>
                </label>
                <input 
                  required 
                  className="admin-form-input" 
                  placeholder="e.g. Registration Certificate" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
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
                  onChange={e => setFormData({...formData, id: e.target.value})} 
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
                  placeholder="Detailed legal compliance requirement particulars..." 
                  value={formData.statutoryRequirement} 
                  onChange={e => setFormData({...formData, statutoryRequirement: e.target.value})} 
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

      {/* Main Table Card */}
      <div className="db-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" />
            <input 
              type="text" 
              placeholder="Search compliance requirements or codes..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="filter-dropdown-wrapper">
              <Filter className="filter-dropdown-icon" />
              <select 
                className="filter-dropdown-select"
                value={establishmentFilter}
                onChange={e => setEstablishmentFilter(e.target.value)}
              >
                <option value="All">All Categories ({items.length})</option>
                <option value="Other Vendor">Other Vendor</option>
                <option value="Security Vendor">Security Vendor</option>
              </select>
            </div>
            <span className="text-xs text-slate-500 font-semibold hidden md:inline">
              Showing {filtered.length} of {items.length}
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Code ID</th>
                <th>Establishment</th>
                <th>Labour Code / Act</th>
                <th>Requirement Details</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="animate-spin w-8 h-8 mx-auto text-[#1565C0]" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No compliance items found</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing your filters or create a new requirement.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(i => (
                  <tr key={i.id} className={i.active === false ? 'opacity-60 bg-slate-50/50' : ''}>
                    <td>
                      <span className="audit-id-badge">{i.id}</span>
                    </td>
                    <td>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {i.vendorCategory}
                      </span>
                    </td>
                    <td>
                      <span className="font-bold text-xs text-slate-800 bg-blue-50/80 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                        {i.type}
                      </span>
                    </td>
                    <td className="max-w-md">
                      <div className="font-bold text-sm text-slate-900">{i.title}</div>
                      <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{i.statutoryRequirement}</div>
                    </td>
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
                    <td className="text-right">
                      <button 
                        onClick={() => handleToggleStatus(i)} 
                        className={`db-btn text-xs py-1 px-3 ${i.active !== false ? 'db-btn-outline text-amber-600 border-amber-300 hover:bg-amber-50' : 'db-btn-primary'}`}
                      >
                        {i.active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};
