import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, LayoutDashboard, Building2, Users, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminCreateAudit: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    vendorId: '',
    auditorId: '',
    auditPeriod: 'Q1 2026',
    startDate: '',
    dueDate: '',
    establishmentType: 'Factory'
  });

  const sidebarItems = getAdminSidebarItems('Audits');

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [cRes, vRes, aRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users?role=customer`, { headers }),
        fetch(`${API_BASE_URL}/admin/users?role=vendor`, { headers }),
        fetch(`${API_BASE_URL}/admin/users?role=auditor`, { headers })
      ]);
      
      const cData = await cRes.json();
      const vData = await vRes.json();
      const aData = await aRes.json();
      
      if (cData.success) setCustomers(cData.users);
      if (vData.success) setVendors(vData.users);
      if (aData.success) setAuditors(aData.users);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    if (new Date(formData.dueDate) < new Date(formData.startDate)) {
      setError('Due date cannot be before start date.');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/audits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        navigate('/admin/audits');
      } else {
        setError(data.error || 'Failed to create audit.');
      }
    } catch (err) {
      setError('An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Admin Portal - Create Audit" sidebarItems={sidebarItems} backUrl="/admin/audits" backLabel="Back to Audits">
      {/* 1. Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-header-title">Initiate Compliance Audit</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> Audit Provisioning
            </span>
          </div>
          <p className="admin-header-subtitle">Assign an auditor, select target vendor, bind customer scope, and configure cycle timelines.</p>
        </div>
      </div>

      {/* 2. Form Container */}
      <div className="max-w-3xl mx-auto">
        <div className="admin-form-card">
          <div className="admin-form-header">
            <div className="admin-form-title-wrap">
              <div className="admin-form-icon-pill">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="admin-form-title">Audit Engagement Parameters</h3>
                <p className="admin-form-subtitle">Configure regulatory parameters before dispatching to the field.</p>
              </div>
            </div>
            <span className="admin-kpi-badge">New Cycle</span>
          </div>

          <div className="admin-form-body">
            {error && (
              <div className="admin-form-error">
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Enterprise Client (Customer) <span className="req">*</span>
                  </label>
                  <select 
                    required 
                    className="admin-form-select" 
                    value={formData.customerId} 
                    onChange={e => setFormData({...formData, customerId: e.target.value})}
                  >
                    <option value="">Select Enterprise Client</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.companyName || c.email}</option>)}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Compliance Auditee (Vendor) <span className="req">*</span>
                  </label>
                  <select 
                    required 
                    className="admin-form-select" 
                    value={formData.vendorId} 
                    onChange={e => setFormData({...formData, vendorId: e.target.value})}
                  >
                    <option value="">Select Target Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName || v.email}</option>)}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Assigned Lead Auditor <span className="req">*</span>
                  </label>
                  <select 
                    required 
                    className="admin-form-select" 
                    value={formData.auditorId} 
                    onChange={e => setFormData({...formData, auditorId: e.target.value})}
                  >
                    <option value="">Assign Certified Auditor</option>
                    {auditors.map(a => <option key={a.id} value={a.id}>{a.fullName || a.contactPerson || a.email}</option>)}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Audit Cycle Period <span className="req">*</span>
                  </label>
                  <select 
                    required 
                    className="admin-form-select" 
                    value={formData.auditPeriod} 
                    onChange={e => setFormData({...formData, auditPeriod: e.target.value})}
                  >
                    <option value="Q1 2026">Q1 2026 (Jan - Mar)</option>
                    <option value="Q2 2026">Q2 2026 (Apr - Jun)</option>
                    <option value="Q3 2026">Q3 2026 (Jul - Sep)</option>
                    <option value="Q4 2026">Q4 2026 (Oct - Dec)</option>
                    <option value="Annual 2026">Annual Comprehensive 2026</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Scheduled Start Date <span className="req">*</span>
                  </label>
                  <input 
                    required 
                    type="date" 
                    className="admin-form-input" 
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})} 
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Compliance Due Date <span className="req">*</span>
                  </label>
                  <input 
                    required 
                    type="date" 
                    className="admin-form-input" 
                    value={formData.dueDate} 
                    onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                  />
                </div>

                <div className="admin-form-group full-width">
                  <label className="admin-form-label">
                    Facility / Establishment Classification <span className="req">*</span>
                  </label>
                  <select 
                    required 
                    className="admin-form-select" 
                    value={formData.establishmentType} 
                    onChange={e => setFormData({...formData, establishmentType: e.target.value})}
                  >
                    <option value="Factory">Industrial Factory / Manufacturing Facility</option>
                    <option value="S&E">Shops & Commercial Establishment (S&E)</option>
                  </select>
                </div>

                <div className="admin-form-actions">
                  <button 
                    type="button" 
                    className="db-btn db-btn-outline" 
                    onClick={() => navigate('/admin/audits')}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="db-btn db-btn-primary"
                  >
                    {isSubmitting ? 'Provisioning Audit...' : 'Schedule & Dispatch Audit'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
