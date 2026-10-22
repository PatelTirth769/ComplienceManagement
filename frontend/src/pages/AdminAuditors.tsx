import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  UserCheck, Search, Loader2, Plus, 
  Mail, CheckCircle2, ShieldCheck, Phone, X, Eye, Trash2, AlertTriangle,
  Building2, Users, FileCheck, ClipboardList, BarChart3
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export const AdminAuditors: React.FC = () => {
  const [auditors, setAuditors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [selectedAuditor, setSelectedAuditor] = useState<any | null>(null);

  // Delete Auditor state
  const [selectedAuditorToDelete, setSelectedAuditorToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sidebarItems = [
    { name: 'Dashboard', icon: FileCheck, path: '/admin' },
    { name: 'Vendors', icon: Building2, path: '/admin/vendors' },
    { name: 'Customers', icon: Users, path: '/admin/customers' },
    { name: 'Auditors', icon: UserCheck, active: true, path: '/admin/auditors' },
    { name: 'Audits', icon: FileCheck, path: '/admin/audits' },
    { name: 'Checklist', icon: ClipboardList, path: '/admin/checklist' },
    { name: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  const fetchAuditors = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/users?role=auditor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAuditors(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditors();
  }, []);

  const handleAddAuditor = async (e: React.FormEvent) => {
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
        body: JSON.stringify({ ...formData, role: 'auditor' })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setFormData({ fullName: '', email: '', phone: '', password: '' });
        fetchAuditors();
      } else {
        setError(data.error || 'Failed to add auditor');
      }
    } catch (err: any) {
      setError(err.message || 'Error adding auditor');
    }
  };

  const handleConfirmDeleteAuditor = async () => {
    if (!selectedAuditorToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/users/${selectedAuditorToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAuditorToDelete(null);
        setToastMessage({ type: 'success', text: data.message || 'Auditor deleted successfully.' });
        fetchAuditors();
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setDeleteError(data.error || 'Unable to delete the auditor. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setDeleteError('An unexpected network error occurred while deleting the auditor.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = auditors.filter(a => 
    (a.fullName || a.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Auditor Management" sidebarItems={sidebarItems}>
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-header-title">Auditor Management</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> Certified Field Staff
            </span>
          </div>
          <p className="admin-header-subtitle">Manage certified field auditors, assign review teams, and monitor credentials.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ fullName: '', email: '', phone: '', password: '' });
            setError('');
            setIsAdding(!isAdding);
          }}
          className="db-btn db-btn-primary"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>Add New Auditor</span>
        </button>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="admin-kpi-grid-3col">
        <div className="admin-kpi-card cyan">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Total Auditors</span>
            <div className="admin-kpi-icon-wrapper cyan">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{auditors.length}</div>
          <span className="admin-kpi-subtext">Active auditor pool</span>
          <span className="admin-kpi-badge">Staff Pool</span>
        </div>

        <div className="admin-kpi-card emerald">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Active Officers</span>
            <div className="admin-kpi-icon-wrapper emerald">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{auditors.length}</div>
          <span className="admin-kpi-subtext">Verified & assigned officers</span>
          <span className="admin-kpi-badge">100% Certified</span>
        </div>

        <div className="admin-kpi-card indigo">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Deployment</span>
            <div className="admin-kpi-icon-wrapper indigo">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value text-xl font-bold text-slate-800">Operational</div>
          <span className="admin-kpi-subtext">Compliance reviewer status</span>
          <span className="admin-kpi-badge">Ready</span>
        </div>
      </div>

      {/* Add Auditor Form Modal / Card */}
      {isAdding && (
        <div className="admin-form-card">
          <div className="admin-form-header">
            <div className="admin-form-title-wrap">
              <div className="admin-form-icon-pill">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="admin-form-title">Create New Auditor</h3>
                <p className="admin-form-subtitle">Provision certified field auditor account and verification access.</p>
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

            <form onSubmit={handleAddAuditor} autoComplete="off" className="admin-form-grid">
              {/* Dummy fields to trick browser autofill */}
              <div style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0 }}>
                <input type="email" name="fake_email_dummy" tabIndex={-1} autoComplete="username" />
                <input type="password" name="fake_password_dummy" tabIndex={-1} autoComplete="current-password" />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Full Legal Name <span className="req">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  className="admin-form-input"
                  placeholder="e.g. John Auditor"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Email Address <span className="req">*</span>
                </label>
                <input 
                  type="email" 
                  required 
                  className="admin-form-input"
                  autoComplete="off"
                  readOnly
                  onFocus={e => e.target.removeAttribute('readOnly')}
                  name="random_auditor_email"
                  id="random_auditor_email"
                  placeholder="auditor@compliance.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Phone Number
                </label>
                <input 
                  type="text" 
                  className="admin-form-input"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Initial Password <span className="req">*</span>
                </label>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  className="admin-form-input"
                  autoComplete="new-password"
                  readOnly
                  onFocus={e => e.target.removeAttribute('readOnly')}
                  name="random_auditor_password"
                  id="random_auditor_password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="admin-form-actions">
                <button type="button" onClick={() => setIsAdding(false)} className="db-btn db-btn-outline text-xs">
                  Cancel
                </button>
                <button type="submit" className="db-btn db-btn-primary text-xs">
                  Save Auditor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3 & 4. Search Toolbar & Data Table */}
      <div className="db-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" />
            <input 
              type="text" 
              placeholder="Search auditors by name or email..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
            Showing {filtered.length} auditor{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Auditor Name</th>
                <th>Contact Details</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <Loader2 className="animate-spin w-8 h-8 mx-auto text-[#1565C0]" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">
                    <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No auditors found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search filter or add a new auditor.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(a => {
                  const name = a.fullName || a.contactPerson || 'Auditor';
                  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="auditor-user-cell">
                          <div className="auditor-avatar-badge">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{name}</div>
                            <div className="text-xs text-slate-400 font-medium">Compliance Auditor</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-cell-stack">
                          <a href={`mailto:${a.email}`} className="contact-chip" title={a.email}>
                            <Mail className="contact-chip-icon" />
                            <span className="truncate">{a.email}</span>
                          </a>
                          {a.phone && (
                            <a href={`tel:${a.phone}`} className="contact-chip" title={a.phone}>
                              <Phone className="contact-chip-icon" />
                              <span>{a.phone}</span>
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
                            onClick={() => setSelectedAuditor(a)}
                            className="btn-action-view"
                            title="View Auditor Profile"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Profile
                          </button>
                          <button 
                            onClick={() => { setSelectedAuditorToDelete(a); setDeleteError(''); }}
                            className="btn-action-delete"
                            title="Delete Auditor"
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

      {/* Auditor Profile Modal */}
      {selectedAuditor && (
        <div className="profile-modal-backdrop" onClick={() => setSelectedAuditor(null)}>
          <div className="profile-modal-card" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div className="profile-header-user">
                <div className="profile-header-avatar">
                  {(selectedAuditor.fullName || selectedAuditor.contactPerson || 'A')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div className="profile-header-meta">
                  <h3 className="profile-header-title">
                    {selectedAuditor.fullName || selectedAuditor.contactPerson || 'Auditor'}
                  </h3>
                  <span className="profile-header-badge">Certified Field Auditor</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAuditor(null)} 
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
                  <span className="db-badge-dot"></span> Active & Certified
                </span>
              </div>

              <div className="profile-card-group">
                <div className="profile-row-2col">
                  <div className="profile-field-block">
                    <span className="profile-field-label">Auditor Name</span>
                    <div className="profile-field-value">
                      {selectedAuditor.fullName || selectedAuditor.contactPerson || 'Auditor'}
                    </div>
                  </div>

                  <div className="profile-field-block">
                    <span className="profile-field-label">Role Classification</span>
                    <div className="profile-field-value">
                      Field Review Officer
                    </div>
                  </div>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Registered Email</span>
                  <a 
                    href={`mailto:${selectedAuditor.email}`} 
                    className="profile-field-link"
                    title={selectedAuditor.email}
                  >
                    <Mail className="profile-field-icon" />
                    <span>{selectedAuditor.email}</span>
                  </a>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Phone Number</span>
                  {selectedAuditor.phone ? (
                    <a 
                      href={`tel:${selectedAuditor.phone}`} 
                      className="profile-field-value" 
                      style={{ color: '#0F172A', textDecoration: 'none' }}
                    >
                      <Phone className="profile-field-icon" style={{ color: '#64748B' }} />
                      <span>{selectedAuditor.phone}</span>
                    </a>
                  ) : (
                    <div className="profile-field-value" style={{ color: '#94A3B8' }}>
                      Not provided
                    </div>
                  )}
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">System Identifier</span>
                  <div className="profile-system-token">
                    {selectedAuditor.id || selectedAuditor._id || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="profile-modal-actions">
                <button 
                  onClick={() => setSelectedAuditor(null)}
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
      {selectedAuditorToDelete && (
        <div className="modal-overlay" onClick={() => !isDeleting && setSelectedAuditorToDelete(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-badge">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="modal-header-text">
                <h3 className="modal-title">Delete Auditor?</h3>
                <span className="modal-subtitle">Permanently delete this auditor account</span>
              </div>
            </div>
            
            <div className="modal-body">
              <p className="text-sm text-slate-600 mb-3 font-medium">
                Are you sure you want to delete this auditor?
              </p>

              <div className="modal-info-box">
                <div className="modal-info-row">
                  <span className="modal-info-label">Full Name:</span>
                  <span className="modal-info-value">{selectedAuditorToDelete.fullName || selectedAuditorToDelete.contactPerson || 'N/A'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Email:</span>
                  <span className="modal-info-value mono">{selectedAuditorToDelete.email || 'N/A'}</span>
                </div>
                {selectedAuditorToDelete.phone && (
                  <div className="modal-info-row">
                    <span className="modal-info-label">Phone:</span>
                    <span className="modal-info-value">{selectedAuditorToDelete.phone}</span>
                  </div>
                )}
              </div>

              <div className="modal-warning-text">
                ⚠️ This action will permanently remove this auditor account and credentials. This action cannot be undone.
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
                onClick={() => { setSelectedAuditorToDelete(null); setDeleteError(''); }}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                disabled={isDeleting}
                onClick={handleConfirmDeleteAuditor}
                className="btn-delete-confirm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1.5" /> Delete Auditor
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
