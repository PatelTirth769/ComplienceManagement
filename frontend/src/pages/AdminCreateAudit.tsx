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
    <DashboardLayout title="Admin Portal - Create Audit" sidebarItems={sidebarItems}>
      <div className="max-w-3xl mx-auto db-card">
        <div className="db-card-header">
          <h2 className="db-card-title">Create New Audit</h2>
        </div>
        <div className="db-card-body">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            <div className="db-form-grid">
              <div>
                <label className="db-label">Customer *</label>
                <select required className="db-select" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.companyName || c.email}</option>)}
                </select>
              </div>

              <div>
                <label className="db-label">Vendor *</label>
                <select required className="db-select" value={formData.vendorId} onChange={e => setFormData({...formData, vendorId: e.target.value})}>
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName || v.email}</option>)}
                </select>
              </div>

              <div>
                <label className="db-label">Auditor *</label>
                <select required className="db-select" value={formData.auditorId} onChange={e => setFormData({...formData, auditorId: e.target.value})}>
                  <option value="">Select Auditor</option>
                  {auditors.map(a => <option key={a.id} value={a.id}>{a.fullName || a.contactPerson || a.email}</option>)}
                </select>
              </div>

              <div>
                <label className="db-label">Audit Period *</label>
                <select required className="db-select" value={formData.auditPeriod} onChange={e => setFormData({...formData, auditPeriod: e.target.value})}>
                  <option value="Q1 2026">Q1 2026</option>
                  <option value="Q2 2026">Q2 2026</option>
                  <option value="Q3 2026">Q3 2026</option>
                  <option value="Q4 2026">Q4 2026</option>
                  <option value="Annual 2026">Annual 2026</option>
                </select>
              </div>

              <div>
                <label className="db-label">Start Date *</label>
                <input required type="date" className="db-input" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>

              <div>
                <label className="db-label">Due Date *</label>
                <input required type="date" className="db-input" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
              </div>

              <div>
                <label className="db-label">Establishment Type</label>
                <select required className="db-select" value={formData.establishmentType} onChange={e => setFormData({...formData, establishmentType: e.target.value})}>
                  <option value="Factory">Factory</option>
                  <option value="S&E">S&E</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
              <button type="button" className="db-btn db-btn-outline" onClick={() => navigate('/admin/audits')}>Cancel</button>
              <button type="submit" disabled={isSubmitting} className="db-btn db-btn-primary">
                {isSubmitting ? 'Creating...' : 'Create Audit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};
