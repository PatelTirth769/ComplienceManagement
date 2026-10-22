import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  Building2, Search, Plus, Loader2, Mail, Phone, Eye, Trash2, AlertTriangle,
  CheckCircle2, ShieldCheck, X, FileCheck, ClipboardList, BarChart3, Users, UserCheck
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminVendors: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [formData, setFormData] = useState({ companyName: '', contactPerson: '', email: '', phone: '', address: '', password: '' });
  const [error, setError] = useState('');

  // Delete Vendor state
  const [selectedVendorToDelete, setSelectedVendorToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sidebarItems = getAdminSidebarItems('Vendors');

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/users?role=vendor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setVendors(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, role: 'vendor' })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setFormData({ companyName: '', contactPerson: '', email: '', phone: '', address: '', password: '' });
        fetchVendors();
      } else {
        setError(data.error || 'Failed to create vendor');
      }
    } catch (err) {
      setError('An error occurred.');
    }
  };

  const handleConfirmDeleteVendor = async () => {
    if (!selectedVendorToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/users/${selectedVendorToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedVendorToDelete(null);
        setToastMessage({ type: 'success', text: data.message || 'Vendor deleted successfully.' });
        fetchVendors();
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setDeleteError(data.error || 'Unable to delete the vendor. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setDeleteError('An unexpected network error occurred while deleting the vendor.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = vendors.filter(v => 
    (v.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Vendor Management" sidebarItems={sidebarItems}>
      {/* 1. Header Area */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="admin-header-title">Vendor Management</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> Active Directory
            </span>
          </div>
          <p className="admin-header-subtitle">Manage compliance vendors, onboarding credentials, and operational readiness.</p>
        </div>
        <button 
          className="db-btn db-btn-primary" 
          onClick={() => {
            setFormData({ companyName: '', contactPerson: '', email: '', phone: '', address: '', password: '' });
            setError('');
            setIsAdding(!isAdding);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Vendor
        </button>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="admin-kpi-grid-3col">
        <div className="admin-kpi-card indigo">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Total Vendors</span>
            <div className="admin-kpi-icon-wrapper indigo">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{vendors.length}</div>
          <span className="admin-kpi-subtext">Registered compliance vendors</span>
          <span className="admin-kpi-badge">Enterprise Pool</span>
        </div>

        <div className="admin-kpi-card emerald">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Active Pool</span>
            <div className="admin-kpi-icon-wrapper emerald">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{vendors.length}</div>
          <span className="admin-kpi-subtext">Verified active vendors</span>
          <span className="admin-kpi-badge">100% Verified</span>
        </div>

        <div className="admin-kpi-card cyan">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Status</span>
            <div className="admin-kpi-icon-wrapper cyan">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value text-xl font-bold text-slate-800">Operational</div>
          <span className="admin-kpi-subtext">Vendor account readiness</span>
          <span className="admin-kpi-badge">Live Sync</span>
        </div>
      </div>

      {/* Add Vendor Form Drawer / Card */}
      {isAdding && (
        <div className="admin-form-card">
          <div className="admin-form-header">
            <div className="admin-form-title-wrap">
              <div className="admin-form-icon-pill">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="admin-form-title">Create New Vendor</h3>
                <p className="admin-form-subtitle">Register a new compliance vendor and provision credentials.</p>
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
              {/* Dummy fields to trick browser autofill */}
              <div style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0 }}>
                <input type="email" name="fake_email_dummy" tabIndex={-1} autoComplete="username" />
                <input type="password" name="fake_password_dummy" tabIndex={-1} autoComplete="current-password" />
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Company / Vendor Name <span className="req">*</span>
                </label>
                <input 
                  required 
                  className="admin-form-input" 
                  placeholder="e.g. Acme Services"
                  value={formData.companyName} 
                  onChange={e => setFormData({...formData, companyName: e.target.value})} 
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Contact Person <span className="req">*</span>
                </label>
                <input 
                  required 
                  className="admin-form-input" 
                  placeholder="e.g. John Doe"
                  value={formData.contactPerson} 
                  onChange={e => setFormData({...formData, contactPerson: e.target.value})} 
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Email Address <span className="req">*</span>
                </label>
                <input 
                  required 
                  type="email" 
                  className="admin-form-input" 
                  autoComplete="off" 
                  readOnly 
                  onFocus={e => e.target.removeAttribute('readOnly')} 
                  name="random_email_field" 
                  id="random_email_field" 
                  placeholder="vendor@company.com"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Initial Password <span className="req">*</span>
                </label>
                <input 
                  required 
                  type="password" 
                  minLength={6} 
                  className="admin-form-input" 
                  autoComplete="new-password" 
                  readOnly 
                  onFocus={e => e.target.removeAttribute('readOnly')} 
                  name="random_password_field" 
                  id="random_password_field" 
                  placeholder="••••••••"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Phone Number <span className="req">*</span>
                </label>
                <input 
                  required 
                  className="admin-form-input" 
                  placeholder="+91 9876543210"
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Office / Facility Address
                </label>
                <input 
                  className="admin-form-input" 
                  placeholder="City, State"
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                />
              </div>

              <div className="admin-form-actions">
                <button type="button" className="db-btn db-btn-outline text-xs" onClick={() => setIsAdding(false)}>
                  Cancel
                </button>
                <button type="submit" className="db-btn db-btn-primary text-xs">
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Search Toolbar & Data Table */}
      <div className="db-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" />
            <input 
              type="text" 
              placeholder="Search vendors by name, email or contact..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
            Showing {filtered.length} vendor{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Contact Person</th>
                <th>Contact Details</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Loader2 className="animate-spin w-8 h-8 mx-auto text-[#1565C0]" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No vendors found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search filter or add a new vendor.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(v => {
                  const company = v.companyName || 'Vendor';
                  const initials = company.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className="auditor-user-cell">
                          <div className="auditor-avatar-badge">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{company}</div>
                            <div className="text-xs text-slate-400 font-medium">Compliance Vendor</div>
                          </div>
                        </div>
                      </td>
                      <td className="font-semibold text-slate-800">{v.contactPerson || '-'}</td>
                      <td>
                        <div className="contact-cell-stack">
                          <a href={`mailto:${v.email}`} className="contact-chip" title={v.email}>
                            <Mail className="contact-chip-icon" />
                            <span className="truncate">{v.email}</span>
                          </a>
                          {v.phone && (
                            <a href={`tel:${v.phone}`} className="contact-chip" title={v.phone}>
                              <Phone className="contact-chip-icon" />
                              <span>{v.phone}</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="db-badge completed">
                          <span className="db-badge-dot"></span> Active
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="table-action-cluster">
                          <button 
                            onClick={() => setSelectedVendor(v)}
                            className="btn-action-view"
                            title="View Vendor Profile"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Profile
                          </button>
                          <button 
                            onClick={() => { setSelectedVendorToDelete(v); setDeleteError(''); }}
                            className="btn-action-delete"
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Profile Modal */}
      {selectedVendor && (
        <div className="profile-modal-backdrop" onClick={() => setSelectedVendor(null)}>
          <div className="profile-modal-card" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div className="profile-header-user">
                <div className="profile-header-avatar">
                  {(selectedVendor.companyName || 'V')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div className="profile-header-meta">
                  <h3 className="profile-header-title">
                    {selectedVendor.companyName || 'Vendor Profile'}
                  </h3>
                  <span className="profile-header-badge">Registered Compliance Vendor</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVendor(null)}
                className="profile-close-btn"
                title="Close"
              >
                <X />
              </button>
            </div>

            <div className="profile-modal-body">
              <div className="profile-status-bar">
                <span className="profile-status-label">Account Status</span>
                <span className="db-badge completed">
                  <span className="db-badge-dot"></span> Active & Operational
                </span>
              </div>

              <div className="profile-card-group">
                <div className="profile-row-2col">
                  <div className="profile-field-block">
                    <span className="profile-field-label">Company / Vendor</span>
                    <div className="profile-field-value">
                      {selectedVendor.companyName || '-'}
                    </div>
                  </div>

                  <div className="profile-field-block">
                    <span className="profile-field-label">Contact Person</span>
                    <div className="profile-field-value">
                      {selectedVendor.contactPerson || '-'}
                    </div>
                  </div>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Registered Email</span>
                  <a 
                    href={`mailto:${selectedVendor.email}`} 
                    className="profile-field-link"
                    title={selectedVendor.email}
                  >
                    <Mail className="profile-field-icon" />
                    <span>{selectedVendor.email}</span>
                  </a>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Phone Number</span>
                  {selectedVendor.phone ? (
                    <a 
                      href={`tel:${selectedVendor.phone}`} 
                      className="profile-field-value" 
                      style={{ color: '#0F172A', textDecoration: 'none' }}
                    >
                      <Phone className="profile-field-icon" style={{ color: '#64748B' }} />
                      <span>{selectedVendor.phone}</span>
                    </a>
                  ) : (
                    <div className="profile-field-value" style={{ color: '#94A3B8' }}>
                      Not provided
                    </div>
                  )}
                </div>

                {selectedVendor.address && (
                  <div className="profile-field-block">
                    <span className="profile-field-label">Location / Address</span>
                    <div className="profile-field-value">
                      {selectedVendor.address}
                    </div>
                  </div>
                )}

                <div className="profile-field-block">
                  <span className="profile-field-label">System Vendor ID</span>
                  <div className="profile-system-token">
                    {selectedVendor.id || selectedVendor._id || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="profile-modal-actions">
                <button 
                  onClick={() => setSelectedVendor(null)}
                  className="profile-btn-primary"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedVendorToDelete && (
        <div className="modal-overlay" onClick={() => !isDeleting && setSelectedVendorToDelete(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-badge">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="modal-header-text">
                <h3 className="modal-title">Delete Vendor?</h3>
                <span className="modal-subtitle">Permanently delete this vendor account</span>
              </div>
            </div>
            
            <div className="modal-body">
              <p className="text-sm text-slate-600 mb-3 font-medium">
                Are you sure you want to delete this vendor?
              </p>

              <div className="modal-info-box">
                <div className="modal-info-row">
                  <span className="modal-info-label">Company Name:</span>
                  <span className="modal-info-value">{selectedVendorToDelete.companyName || 'N/A'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Contact Person:</span>
                  <span className="modal-info-value">{selectedVendorToDelete.contactPerson || 'N/A'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Email:</span>
                  <span className="modal-info-value mono">{selectedVendorToDelete.email || 'N/A'}</span>
                </div>
              </div>

              <div className="modal-warning-text">
                ⚠️ This action will permanently remove this vendor record and their access credentials. This action cannot be undone.
              </div>

              {deleteError && (
                <div className="modal-error-text mt-3">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                disabled={isDeleting}
                onClick={() => { setSelectedVendorToDelete(null); setDeleteError(''); }}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                disabled={isDeleting}
                onClick={handleConfirmDeleteVendor}
                className="btn-delete-confirm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1.5" /> Delete Vendor
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}
    </DashboardLayout>
  );
};
