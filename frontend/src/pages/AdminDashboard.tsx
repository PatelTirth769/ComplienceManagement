import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  Users, Building2, UserCheck, FileCheck, Plus, 
  CheckCircle2, Clock, Eye, AlertCircle, ArrowRight, 
  ClipboardList, BarChart3, Calendar, ShieldCheck, Scale
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const [statsRes, auditsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/admin/audits`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => null)
        ]);

        const data = await statsRes.json();
        const auditLookup: Record<string, { vendorName?: string; customerName?: string; auditType?: string; isReadOnly?: boolean }> = {};

        if (auditsRes && auditsRes.ok) {
          const auditsData = await auditsRes.json().catch(() => null);
          if (auditsData?.success && Array.isArray(auditsData.audits)) {
            auditsData.audits.forEach((aud: any) => {
              auditLookup[aud.id] = {
                vendorName: aud.vendorName,
                customerName: aud.customerName,
                auditType: aud.auditType,
                isReadOnly: aud.isReadOnly
              };
            });
          }
        }

        if (data.success) {
          if (Array.isArray(data.stats?.recentAudits)) {
            data.stats.recentAudits = data.stats.recentAudits.map((ra: any) => ({
              ...ra,
              vendorName: ra.vendorName || auditLookup[ra.id]?.vendorName || ra.vendorId,
              customerName: ra.customerName || auditLookup[ra.id]?.customerName || ra.customerId,
              auditType: ra.auditType || auditLookup[ra.id]?.auditType || 'Original',
              isReadOnly: ra.isReadOnly !== undefined ? ra.isReadOnly : (auditLookup[ra.id]?.isReadOnly || false)
            }));
          }
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const sidebarItems = getAdminSidebarItems('Dashboard');

  if (isLoading) {
    return (
      <DashboardLayout title="Admin Portal Overview" sidebarItems={sidebarItems} hideBackButton={true}>
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner border-[#1565C0] w-12 h-12"></div>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    if (s === 'completed' || s === 'closed' || s === 'approved') {
      return (
        <span 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#ECFDF5',
            color: '#047857',
            border: '1px solid #A7F3D0',
            fontWeight: 700,
            fontSize: '0.675rem',
            padding: '2px 6px',
            borderRadius: '999px',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
          Closed
        </span>
      );
    }
    if (s === 'pending sign-off') {
      return (
        <span 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FFFBEB',
            color: '#B45309',
            border: '1px solid #FDE68A',
            fontWeight: 700,
            fontSize: '0.675rem',
            padding: '2px 6px',
            borderRadius: '999px',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span>
          Pending Sign-off
        </span>
      );
    }
    return (
      <span 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#EFF6FF',
          color: '#1D4ED8',
          border: '1px solid #BFDBFE',
          fontWeight: 700,
          fontSize: '0.675rem',
          padding: '2px 6px',
          borderRadius: '999px',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span>
        {statusStr || 'In Progress'}
      </span>
    );
  };

  const recentAudits = stats?.recentAudits || [];

  return (
    <DashboardLayout title="Admin Portal Overview" sidebarItems={sidebarItems} hideBackButton={true}>
      {/* 1. Dashboard Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="admin-header-title">Admin Portal Overview</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> Live Operations
            </span>
          </div>
          <p className="admin-header-subtitle">Real-time compliance monitoring, audits tracking, and enterprise resource governance.</p>
        </div>
        <Link to="/admin/audits/create" className="db-btn db-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus className="w-4 h-4" /> Create Audit
        </Link>
      </div>

      {/* 2. Responsive KPI Cards */}
      <div className="admin-kpi-grid">
        <div 
          className="admin-kpi-card blue"
          onClick={() => navigate('/admin/customers')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Total Customers</span>
            <div className="admin-kpi-icon-wrapper blue">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{stats?.totalCustomers || 0}</div>
          <span className="admin-kpi-subtext">Registered customer accounts</span>
          <span className="admin-kpi-badge">Active Entities</span>
        </div>

        <div 
          className="admin-kpi-card indigo"
          onClick={() => navigate('/admin/vendors')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Total Vendors</span>
            <div className="admin-kpi-icon-wrapper indigo">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{stats?.totalVendors || 0}</div>
          <span className="admin-kpi-subtext">Active compliance vendors</span>
          <span className="admin-kpi-badge">Verified Pool</span>
        </div>

        <div 
          className="admin-kpi-card cyan"
          onClick={() => navigate('/admin/auditors')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Total Auditors</span>
            <div className="admin-kpi-icon-wrapper cyan">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{stats?.totalAuditors || 0}</div>
          <span className="admin-kpi-subtext">Assigned field auditors</span>
          <span className="admin-kpi-badge">Field Certified</span>
        </div>

        <div 
          className="admin-kpi-card amber"
          onClick={() => navigate('/admin/audits')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Active Audits</span>
            <div className="admin-kpi-icon-wrapper amber">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{stats?.activeAudits || 0}</div>
          <span className="admin-kpi-subtext">In-progress compliance audits</span>
          <span className="admin-kpi-badge">Real-time Cycle</span>
        </div>
      </div>

      {/* 3. Audit Overview Counts & Summary Bar */}
      <div className="audit-summary-grid">
        <div 
          className="audit-summary-card emerald"
          onClick={() => navigate('/admin/audits')}
          style={{ cursor: 'pointer' }}
        >
          <div className="audit-summary-left">
            <div className="audit-summary-icon-box emerald">
              <CheckCircle2 style={{ width: '1.4rem', height: '1.4rem' }} />
            </div>
            <div className="audit-summary-text">
              <span className="audit-summary-label">Completed / Closed Audits</span>
              <div className="audit-summary-count">{stats?.completedAudits || 0}</div>
            </div>
          </div>
          <Link to="/admin/audits" className="audit-summary-link emerald">
            <span>View All</span>
            <ArrowRight style={{ width: '0.875rem', height: '0.875rem' }} />
          </Link>
        </div>

        <div 
          className="audit-summary-card amber"
          onClick={() => navigate('/admin/audits')}
          style={{ cursor: 'pointer' }}
        >
          <div className="audit-summary-left">
            <div className="audit-summary-icon-box amber">
              <AlertCircle style={{ width: '1.4rem', height: '1.4rem' }} />
            </div>
            <div className="audit-summary-text">
              <span className="audit-summary-label">Pending Review Sign-offs</span>
              <div className="audit-summary-count">{stats?.pendingReviews || 0}</div>
            </div>
          </div>
          <Link to="/admin/audits" className="audit-summary-link amber">
            <span>Review Now</span>
            <ArrowRight style={{ width: '0.875rem', height: '0.875rem' }} />
          </Link>
        </div>
      </div>

      {/* 4. Recent Audits Table Section */}
      <div className="db-card mb-6" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        <div className="db-card-header flex justify-between items-center" style={{ padding: '1.125rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FFFFFF' }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
              border: '1px solid #BFDBFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.1)'
            }}>
              <FileCheck style={{ width: '18px', height: '18px', color: '#1565C0' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="db-card-title text-slate-900" style={{ fontSize: '1.05rem', fontWeight: 800 }}>Recent Audits</h2>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                  {recentAudits.length} Audits
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Latest compliance audit submissions and status updates</p>
            </div>
          </div>
          <Link 
            to="/admin/audits" 
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#0B63E5',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              textDecoration: 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#EFF6FF';
              e.currentTarget.style.borderColor = '#93C5FD';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            <span>View All Audits</span>
            <ArrowRight style={{ width: '14px', height: '14px' }} />
          </Link>
        </div>

        <div className="db-card-body p-0">
          {recentAudits.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">No Recent Audits Available</h3>
              <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                Create a new compliance audit to start monitoring.
              </p>
              <Link to="/admin/audits/create" className="db-btn db-btn-primary text-xs inline-flex">
                <Plus className="h-4 w-4 mr-1" /> Create Audit
              </Link>
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'hidden' }}>
              <table className="enterprise-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th style={{ width: '18%', padding: '0.65rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                      Audit ID
                    </th>
                    <th style={{ width: '18%', padding: '0.65rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                      Vendor
                    </th>
                    <th style={{ width: '18%', padding: '0.65rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                      Customer
                    </th>
                    <th style={{ width: '12%', padding: '0.65rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                      Period
                    </th>
                    <th style={{ width: '16%', padding: '0.65rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                      Status
                    </th>
                    <th style={{ width: '9%', padding: '0.65rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      Score
                    </th>
                    <th style={{ width: '9%', padding: '0.65rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((a: any) => {
                    const vendorDisplay = a.vendorName && a.vendorName !== 'N/A' ? a.vendorName : (a.vendorId || 'N/A');
                    const customerDisplay = a.customerName && a.customerName !== 'N/A' ? a.customerName : (a.customerId || 'N/A');
                    const formattedScore = a.score !== null && a.score !== undefined 
                      ? (typeof a.score === 'number' ? Math.round(a.score * 10) / 10 : a.score) 
                      : null;
                    const isRe = a.auditType === 'Re-Audit' || a.auditType === 'Re Audit';

                    return (
                      <tr key={a.id} style={{ transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                            <span className="audit-id-badge" style={{ whiteSpace: 'nowrap', fontSize: '0.725rem', padding: '1px 5px' }}>
                              {a.auditIdString || a.id}
                            </span>
                            {isRe ? (
                              <span 
                                style={{ 
                                  backgroundColor: '#F3E8FF', 
                                  color: '#7E22CE', 
                                  border: '1px solid #D8B4FE', 
                                  fontWeight: 700,
                                  fontSize: '0.6rem',
                                  padding: '1px 5px',
                                  borderRadius: '999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#9333EA' }} />
                                Re Audit
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap' }}>
                                <span 
                                  style={{ 
                                    backgroundColor: '#ECFDF5', 
                                    color: '#047857', 
                                    border: '1px solid #A7F3D0', 
                                    fontWeight: 700,
                                    fontSize: '0.6rem',
                                    padding: '1px 5px',
                                    borderRadius: '999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                                  Original
                                </span>
                                {a.isReadOnly && (
                                  <span 
                                    style={{ 
                                      backgroundColor: '#FEF3C7', 
                                      color: '#92400E', 
                                      border: '1px solid #FDE68A', 
                                      fontSize: '0.575rem', 
                                      padding: '1px 4px', 
                                      borderRadius: '3px', 
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Read-Only Original Audit"
                                  >
                                    Read-Only
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }} title={vendorDisplay}>
                            <Building2 style={{ width: '13px', height: '13px', color: '#1565C0', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.785rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {vendorDisplay}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }} title={customerDisplay}>
                            <Users style={{ width: '13px', height: '13px', color: '#4F46E5', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.785rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {customerDisplay}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.785rem' }}>
                            {a.auditPeriod}
                          </span>
                        </td>

                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {getStatusBadge(a.status)}
                        </td>

                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {formattedScore !== null ? (
                            <span 
                              className={`score-badge-pill ${Number(formattedScore) >= 80 ? 'high' : Number(formattedScore) >= 50 ? 'medium' : 'low'}`}
                              style={{ whiteSpace: 'nowrap', fontSize: '0.725rem', fontWeight: 800, padding: '2px 6px' }}
                            >
                              {formattedScore}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic font-medium">N/A</span>
                          )}
                        </td>

                        <td style={{ padding: '0.6rem 0.5rem', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Link 
                            to={`/admin/audits/${a.id}`} 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '0.32rem 0.625rem',
                              borderRadius: '6px',
                              backgroundColor: '#EFF6FF',
                              color: '#1565C0',
                              border: '1px solid #BFDBFE',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = '#1565C0';
                              e.currentTarget.style.color = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#1565C0';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = '#EFF6FF';
                              e.currentTarget.style.color = '#1565C0';
                              e.currentTarget.style.borderColor = '#BFDBFE';
                            }}
                          >
                            <Eye style={{ width: '12px', height: '12px' }} />
                            <span>View</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 5. Quick Access Navigation */}
      <div className="quick-access-section">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Quick Navigation Access</h3>
        <div className="quick-access-grid">
          <Link to="/admin/vendors" className="quick-access-card">
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 style={{ width: '20px', height: '20px', color: '#4F46E5' }} />
            </div>
            <span className="quick-access-title">Vendors</span>
          </Link>
          <Link to="/admin/customers" className="quick-access-card">
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users style={{ width: '20px', height: '20px', color: '#2563EB' }} />
            </div>
            <span className="quick-access-title">Customers</span>
          </Link>
          <Link to="/admin/auditors" className="quick-access-card">
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ECFEFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck style={{ width: '20px', height: '20px', color: '#0891B2' }} />
            </div>
            <span className="quick-access-title">Auditors</span>
          </Link>
          <Link to="/admin/audits" className="quick-access-card">
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileCheck style={{ width: '20px', height: '20px', color: '#D97706' }} />
            </div>
            <span className="quick-access-title">Audits</span>
          </Link>
          <Link to="/admin/checklist" className="quick-access-card">
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList style={{ width: '20px', height: '20px', color: '#16A34A' }} />
            </div>
            <span className="quick-access-title">Checklist</span>
          </Link>
          <Link to="/admin/reports" className="quick-access-card">
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 style={{ width: '20px', height: '20px', color: '#9333EA' }} />
            </div>
            <span className="quick-access-title">Reports</span>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

