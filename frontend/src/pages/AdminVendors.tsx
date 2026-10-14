import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  Building2, Search, Plus, Loader2, Mail, Phone, 
  CheckCircle2, ShieldCheck, X, FileCheck, ClipboardList, BarChart3, Users, UserCheck
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminVendors: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ companyName: '', contactPerson: '', email: '', phone: '', address: '', password: '' });
  const [error, setError] = useState('');

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
          <h1 className="admin-header-title">Vendor Management</h1>
          <p className="admin-header-subtitle">Manage vendor accounts, contact details, and compliance status.</p>
        </div>
        <button className="db-btn db-btn-primary" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-4 h-4 mr-1" /> Add Vendor
        </button>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="admin-kpi-grid-3col">
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Total Vendors</span>
            <div className="admin-kpi-icon-wrapper indigo">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{vendors.length}</div>
          <span className="admin-kpi-subtext">Registered compliance vendors</span>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Active Pool</span>
            <div className="admin-kpi-icon-wrapper emerald">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{vendors.length}</div>
          <span className="admin-kpi-subtext">Verified active vendors</span>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Status</span>
            <div className="admin-kpi-icon-wrapper cyan">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value text-xl font-bold text-slate-800">Operational</div>
          <span className="admin-kpi-subtext">Vendor account readiness</span>
        </div>
      </div>

      {/* Add Vendor Form Drawer / Card */}
      {isAdding && (
        <div className="db-card p-5 mb-6 border-l-4 border-l-[#1565C0]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#1565C0]" /> Create New Vendor
            </h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleAddSubmit} autoComplete="off" className="admin-form-grid-2col">
            {/* Dummy fields to trick browser autofill */}
            <div style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0 }}>
              <input type="email" name="fake_email_dummy" tabIndex={-1} autoComplete="username" />
              <input type="password" name="fake_password_dummy" tabIndex={-1} autoComplete="current-password" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Vendor Name *</label>
              <input 
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none" 
                placeholder="e.g. Acme Services"
                value={formData.companyName} 
                onChange={e => setFormData({...formData, companyName: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person *</label>
              <input 
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none" 
                placeholder="e.g. John Doe"
                value={formData.contactPerson} 
                onChange={e => setFormData({...formData, contactPerson: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
              <input 
                required 
                type="email" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none" 
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
              <input 
                required 
                type="password" 
                minLength={6} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none" 
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone *</label>
              <input 
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none" 
                placeholder="+91 9876543210"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
              <input 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none" 
                placeholder="City, State"
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className="db-btn db-btn-outline text-xs" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="db-btn db-btn-primary text-xs">Save Vendor</button>
            </div>
          </form>
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
                <th>Email & Phone</th>
                <th>Status</th>
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
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{v.email}</span>
                          </div>
                          {v.phone && (
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{v.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="db-badge completed">
                          <span className="db-badge-dot"></span> Active
                        </span>
                      </td>
                    </tr>
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
