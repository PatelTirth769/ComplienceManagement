import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  Users, Building2, UserCheck, FileCheck, Plus, 
  CheckCircle2, Clock, Eye, AlertCircle, ArrowRight, 
  ClipboardList, BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';

export const AdminDashboard: React.FC = () => {
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
        const auditNameLookup: Record<string, { vendorName?: string; customerName?: string }> = {};

        if (auditsRes && auditsRes.ok) {
          const auditsData = await auditsRes.json().catch(() => null);
          if (auditsData?.success && Array.isArray(auditsData.audits)) {
            auditsData.audits.forEach((aud: any) => {
              auditNameLookup[aud.id] = {
                vendorName: aud.vendorName,
                customerName: aud.customerName
              };
            });
          }
        }

        if (data.success) {
          if (Array.isArray(data.stats?.recentAudits)) {
            data.stats.recentAudits = data.stats.recentAudits.map((ra: any) => ({
              ...ra,
              vendorName: ra.vendorName || auditNameLookup[ra.id]?.vendorName || ra.vendorId,
              customerName: ra.customerName || auditNameLookup[ra.id]?.customerName || ra.customerId
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

  const sidebarItems = [
    { name: 'Dashboard', icon: FileCheck, active: true, path: '/admin' },
    { name: 'Vendors', icon: Building2, path: '/admin/vendors' },
    { name: 'Customers', icon: Users, path: '/admin/customers' },
    { name: 'Auditors', icon: UserCheck, path: '/admin/auditors' },
    { name: 'Audits', icon: FileCheck, path: '/admin/audits' },
    { name: 'Checklist', icon: ClipboardList, path: '/admin/checklist' },
    { name: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

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
        <span className="db-badge completed">
          <span className="db-badge-dot"></span> Closed
        </span>
      );
    }
    if (s === 'pending sign-off') {
      return (
        <span className="db-badge pending">
          <span className="db-badge-dot"></span> Pending Sign-off
        </span>
      );
    }
    return (
      <span className="db-badge progress">
        <span className="db-badge-dot"></span> {statusStr || 'In Progress'}
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
        <Link to="/admin/audits/create" className="db-btn db-btn-primary">
          <Plus className="w-4 h-4 mr-1" /> Create Audit
        </Link>
      </div>

      {/* 2. Responsive KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card blue">
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

        <div className="admin-kpi-card indigo">
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

        <div className="admin-kpi-card cyan">
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

        <div className="admin-kpi-card amber">
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
        <div className="audit-summary-card emerald">
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

        <div className="audit-summary-card amber">
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
      <div className="db-card mb-6">
        <div className="db-card-header flex justify-between items-center">
          <div>
            <h2 className="db-card-title text-slate-900">Recent Audits</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest compliance audit submissions and status updates</p>
          </div>
          <Link to="/admin/audits" className="text-xs font-bold text-[#0B63E5] hover:underline flex items-center gap-1.5 transition-colors">
            View All Audits <ArrowRight className="w-3.5 h-3.5" />
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
            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>Vendor Name</th>
                    <th>Customer Name</th>
                    <th>Audit Period</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((a: any) => {
                    const vendorDisplay = a.vendorName && a.vendorName !== 'N/A' ? a.vendorName : a.vendorId;
                    const customerDisplay = a.customerName && a.customerName !== 'N/A' ? a.customerName : a.customerId;
                    const formattedScore = a.score !== null && a.score !== undefined 
                      ? (typeof a.score === 'number' ? Math.round(a.score * 10) / 10 : a.score) 
                      : null;

                    return (
                      <tr key={a.id}>
                        <td>
                          <span className="audit-id-badge">{a.auditIdString}</span>
                        </td>
                        <td className="font-semibold text-slate-800">{vendorDisplay}</td>
                        <td className="font-semibold text-slate-800">{customerDisplay}</td>
                        <td className="font-semibold text-slate-800">{a.auditPeriod}</td>
                        <td>{getStatusBadge(a.status)}</td>
                        <td>
                          {formattedScore !== null ? (
                            <span className={`score-badge-pill ${Number(formattedScore) >= 80 ? 'high' : Number(formattedScore) >= 50 ? 'medium' : 'low'}`}>
                              {formattedScore}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">N/A</span>
                          )}
                        </td>
                        <td className="text-right">
                          <Link 
                            to={`/admin/audits/${a.id}`} 
                            className="db-btn db-btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
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
            <Building2 className="quick-access-icon" />
            <span className="quick-access-title">Vendors</span>
          </Link>
          <Link to="/admin/customers" className="quick-access-card">
            <Users className="quick-access-icon" />
            <span className="quick-access-title">Customers</span>
          </Link>
          <Link to="/admin/auditors" className="quick-access-card">
            <UserCheck className="quick-access-icon" />
            <span className="quick-access-title">Auditors</span>
          </Link>
          <Link to="/admin/audits" className="quick-access-card">
            <FileCheck className="quick-access-icon" />
            <span className="quick-access-title">Audits</span>
          </Link>
          <Link to="/admin/checklist" className="quick-access-card">
            <ClipboardList className="quick-access-icon" />
            <span className="quick-access-title">Checklist</span>
          </Link>
          <Link to="/admin/reports" className="quick-access-card">
            <BarChart3 className="quick-access-icon" />
            <span className="quick-access-title">Reports</span>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};
