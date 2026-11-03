import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, LayoutDashboard, Building2, Users, UserCheck, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';
import { DateInput } from '../components/DateInput';
import { 
  parseFlexibleDate, 
  formatDate, 
  AUDIT_MONTHS, 
  AUDIT_QUARTERS, 
  AUDIT_HALF_YEARS,
  calculateAuditCycle 
} from '../utils/dateUtils';

export const AdminCreateAudit: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically generate available years (current year and future years)
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableYears = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => currentYear + i);
  }, [currentYear]);

  // Initial calculation for Q1 of current year
  const initialCycle = useMemo(() => {
    return calculateAuditCycle('Quarterly', currentYear, 'Q1') || {
      summary: `Q1 ${currentYear} (Jan–Mar)`,
      startDate: `${currentYear}-01-01`,
      dueDate: `${currentYear}-03-31`
    };
  }, [currentYear]);

  const [formData, setFormData] = useState({
    customerId: '',
    vendorId: '',
    auditorId: '',
    auditFrequency: 'Quarterly',
    auditYear: currentYear,
    periodSelection: 'Q1',
    auditPeriod: initialCycle.summary,
    startDate: initialCycle.startDate,
    dueDate: initialCycle.dueDate,
    establishmentType: 'Factory',
    country: 'India',
    state: 'All'
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

  const handleFrequencyChange = (freq: string) => {
    let newPeriod = formData.periodSelection;
    if (freq === 'Monthly') {
      newPeriod = 'January';
    } else if (freq === 'Quarterly') {
      newPeriod = 'Q1';
    } else if (freq === 'Half-Yearly') {
      newPeriod = 'H1';
    } else {
      newPeriod = 'Annual';
    }

    const cycle = calculateAuditCycle(freq, formData.auditYear, newPeriod);
    setFormData(prev => ({
      ...prev,
      auditFrequency: freq,
      periodSelection: newPeriod,
      auditPeriod: cycle?.summary || '',
      startDate: cycle?.startDate || prev.startDate,
      dueDate: cycle?.dueDate || prev.dueDate
    }));
  };

  const handleYearChange = (yearVal: string | number) => {
    const y = Number(yearVal);
    const cycle = calculateAuditCycle(formData.auditFrequency, y, formData.periodSelection);
    setFormData(prev => ({
      ...prev,
      auditYear: y,
      auditPeriod: cycle?.summary || '',
      startDate: cycle?.startDate || prev.startDate,
      dueDate: cycle?.dueDate || prev.dueDate
    }));
  };

  const handlePeriodChange = (periodVal: string) => {
    const cycle = calculateAuditCycle(formData.auditFrequency, formData.auditYear, periodVal);
    setFormData(prev => ({
      ...prev,
      periodSelection: periodVal,
      auditPeriod: cycle?.summary || '',
      startDate: cycle?.startDate || prev.startDate,
      dueDate: cycle?.dueDate || prev.dueDate
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!formData.auditFrequency || !['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].includes(formData.auditFrequency)) {
      setError('Please select a valid audit frequency.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.auditYear || isNaN(Number(formData.auditYear))) {
      setError('Please select a valid audit year.');
      setIsSubmitting(false);
      return;
    }

    if (formData.auditFrequency === 'Monthly' && !formData.periodSelection) {
      setError('Please select a month for the monthly audit cycle.');
      setIsSubmitting(false);
      return;
    }

    if (formData.auditFrequency === 'Quarterly' && !formData.periodSelection) {
      setError('Please select a quarter for the quarterly audit cycle.');
      setIsSubmitting(false);
      return;
    }

    if (formData.auditFrequency === 'Half-Yearly' && !formData.periodSelection) {
      setError('Please select a half-yearly period.');
      setIsSubmitting(false);
      return;
    }

    const cycle = calculateAuditCycle(formData.auditFrequency, formData.auditYear, formData.periodSelection);
    if (!cycle) {
      setError('Unable to calculate valid audit cycle. Please check your selections.');
      setIsSubmitting(false);
      return;
    }
    
    const sDate = parseFlexibleDate(formData.startDate);
    const dDate = parseFlexibleDate(formData.dueDate);
    if (!sDate || !dDate) {
      setError('Please provide valid start and due dates.');
      setIsSubmitting(false);
      return;
    }

    if (dDate < sDate) {
      setError('Compliance due date cannot be before scheduled start date.');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const payload = {
        ...formData,
        auditPeriod: formData.auditPeriod || cycle.summary,
        startDate: cycle.startDate,
        dueDate: cycle.dueDate
      };

      const res = await fetch(`${API_BASE_URL}/admin/audits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        navigate('/admin/audits', { state: { newAudit: data.audit } });
      } else {
        setError(data.error || 'Failed to create audit.');
      }
    } catch (err) {
      setError('An unexpected error occurred while scheduling the audit.');
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

                {/* A. Audit Frequency */}
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Audit Frequency <span className="req">*</span>
                  </label>
                  <select 
                    required 
                    className="admin-form-select" 
                    value={formData.auditFrequency} 
                    onChange={e => handleFrequencyChange(e.target.value)}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                {/* B. Audit Year */}
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Audit Year <span className="req">*</span>
                  </label>
                  <select 
                    required 
                    className="admin-form-select" 
                    value={formData.auditYear} 
                    onChange={e => handleYearChange(e.target.value)}
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                {/* C. Period Selection (Dynamic based on Frequency) */}
                {formData.auditFrequency === 'Monthly' && (
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Select Month (Period) <span className="req">*</span>
                    </label>
                    <select 
                      required 
                      className="admin-form-select" 
                      value={formData.periodSelection} 
                      onChange={e => handlePeriodChange(e.target.value)}
                    >
                      {AUDIT_MONTHS.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.auditFrequency === 'Quarterly' && (
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Select Quarter (Period) <span className="req">*</span>
                    </label>
                    <select 
                      required 
                      className="admin-form-select" 
                      value={formData.periodSelection} 
                      onChange={e => handlePeriodChange(e.target.value)}
                    >
                      {AUDIT_QUARTERS.map(q => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.auditFrequency === 'Half-Yearly' && (
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Select Half-Yearly Period <span className="req">*</span>
                    </label>
                    <select 
                      required 
                      className="admin-form-select" 
                      value={formData.periodSelection} 
                      onChange={e => handlePeriodChange(e.target.value)}
                    >
                      {AUDIT_HALF_YEARS.map(h => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dynamic Cycle Summary Card */}
                <div className="admin-form-group full-width">
                  <div style={{
                    backgroundColor: '#F0F9FF',
                    border: '1.5px solid #BAE6FD',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar style={{ width: '1rem', height: '1rem', color: '#0284C7' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                        Selected Audit Cycle:
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0C4A6E' }}>
                        {formData.auditPeriod}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284C7' }}>
                      Auto-calculated Timeline: {formatDate(formData.startDate)} – {formatDate(formData.dueDate)}
                    </span>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Scheduled Start Date <span className="req">*</span>
                  </label>
                  <DateInput 
                    required 
                    className="admin-form-input" 
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})} 
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Compliance Due Date <span className="req">*</span>
                  </label>
                  <DateInput 
                    required 
                    className="admin-form-input" 
                    value={formData.dueDate} 
                    onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Country <span className="req">*</span>
                  </label>
                  <select 
                    disabled
                    className="admin-form-select bg-slate-50 text-slate-800" 
                    value={formData.country} 
                    onChange={e => setFormData({...formData, country: e.target.value})}
                  >
                    <option value="India">🇮🇳 India</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    State Jurisdiction <span className="req">*</span>
                  </label>
                  <select 
                    required 
                    className="admin-form-select font-semibold" 
                    value={formData.state} 
                    onChange={e => setFormData({...formData, state: e.target.value})}
                  >
                    <option value="All">All (Consolidated States)</option>
                    <option value="N/A">N/A (General / Unassigned)</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                  </select>
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

