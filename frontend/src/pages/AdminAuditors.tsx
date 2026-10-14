import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  UserCheck, Search, Loader2, Plus, 
  Mail, CheckCircle2, ShieldCheck, Phone, X, Eye, 
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

  const filtered = auditors.filter(a => 
    (a.fullName || a.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Auditor Management" sidebarItems={sidebarItems}>
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-header-title">Auditor Management</h1>
          <p className="admin-header-subtitle">Manage certified field auditors and compliance reviewers.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="db-btn db-btn-primary"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>Add New Auditor</span>
        </button>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="admin-kpi-grid-3col">
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Total Auditors</span>
            <div className="admin-kpi-icon-wrapper blue">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{auditors.length}</div>
          <span className="admin-kpi-subtext">Active auditor pool</span>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Active Officers</span>
            <div className="admin-kpi-icon-wrapper emerald">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{auditors.length}</div>
          <span className="admin-kpi-subtext">Verified & assigned officers</span>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Status</span>
            <div className="admin-kpi-icon-wrapper cyan">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value text-xl font-bold text-slate-800">Certified</div>
          <span className="admin-kpi-subtext">Compliance reviewer status</span>
        </div>
      </div>

      {/* Add Auditor Form Modal / Card */}
      {isAdding && (
        <div className="db-card p-5 mb-6 border-l-4 border-l-[#1565C0]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#1565C0]" /> Create New Auditor
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

          <form onSubmit={handleAddAuditor} className="admin-form-grid-2col">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input 
                type="text" 
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none"
                placeholder="e.g. John Auditor"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <input 
                type="email" 
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none"
                placeholder="auditor@compliance.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
              <input 
                type="password" 
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-[#1565C0] outline-none"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="db-btn db-btn-outline text-xs">
                Cancel
              </button>
              <button type="submit" className="db-btn db-btn-primary text-xs">
                Save Auditor
              </button>
            </div>
          </form>
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
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{a.email}</span>
                          </div>
                          {a.phone && (
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{a.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="db-badge completed">
                          <span className="db-badge-dot"></span> Active
                        </span>
                      </td>
                      <td className="text-right">
                        <button className="db-btn db-btn-outline text-xs py-1 px-2.5 inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> View Profile
                        </button>
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
