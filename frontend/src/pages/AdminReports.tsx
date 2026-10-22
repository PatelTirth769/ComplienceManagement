import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, LayoutDashboard, Building2, Users, UserCheck, ClipboardList, BarChart3, Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const sidebarItems = getAdminSidebarItems('Reports');

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      // We pull completed/closed audits for reports alongside customer and vendor directories
      const [res, custRes, vendRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/audits`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/users?role=customer`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/users?role=vendor`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const data = await res.json();
      if (data.success) {
        // Filter only completed audits for reports
        const completed = data.audits.filter((a: any) => 
          ['approved', 'completed', 'closed'].includes((a.status || '').toLowerCase())
        );
        setReports(completed);
      }

      try {
        const map: Record<string, string> = {};
        const [custData, vendData] = await Promise.all([custRes.json(), vendRes.json()]);
        [...(custData.users || []), ...(vendData.users || [])].forEach((u: any) => {
          const name = u.companyName || u.fullName || u.organisation || u.contactPerson || u.name;
          if (name) {
            map[u.id] = name;
            if (u._id) map[u._id] = name;
          }
        });
        setUsersMap(map);
      } catch (e) {
        console.warn('Could not parse users map:', e);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = reports.filter(r => {
    const vName = r.vendorName || usersMap[r.vendorId] || r.vendorId || '';
    const cName = r.customerName || r.organisation || usersMap[r.customerId] || r.customerId || '';
    const term = searchTerm.toLowerCase();
    return (
      (r.auditIdString || '').toLowerCase().includes(term) ||
      vName.toLowerCase().includes(term) ||
      cName.toLowerCase().includes(term) ||
      (r.auditPeriod || '').toLowerCase().includes(term)
    );
  });

  const avgScore = reports.length > 0 
    ? Math.round(reports.reduce((acc, r) => acc + (Number(r.score) || 0), 0) / reports.length) 
    : 0;
  const uniqueVendors = Array.from(new Set(reports.map(r => r.vendorName || usersMap[r.vendorId] || r.vendorId))).length;

  return (
    <DashboardLayout title="Admin Portal - Reports" sidebarItems={sidebarItems}>
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-header-title">Executive Audit Reports</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> Certified Archives
            </span>
          </div>
          <p className="admin-header-subtitle">Historical compliance records, verified scorecards, and official downloadable audits.</p>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="admin-kpi-grid-3col">
        <div className="admin-kpi-card blue">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Finalized Reports</span>
            <div className="admin-kpi-icon-wrapper blue">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{reports.length}</div>
          <span className="admin-kpi-subtext">Completed & closed audits</span>
          <span className="admin-kpi-badge">Closed</span>
        </div>

        <div className="admin-kpi-card emerald">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Average Score</span>
            <div className="admin-kpi-icon-wrapper emerald">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{avgScore}%</div>
          <span className="admin-kpi-subtext">Portfolio-wide compliance health</span>
          <span className="admin-kpi-badge">Benchmark</span>
        </div>

        <div className="admin-kpi-card indigo">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Vendors Audited</span>
            <div className="admin-kpi-icon-wrapper indigo">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{uniqueVendors} Entities</div>
          <span className="admin-kpi-subtext">Entities with formal scorecards</span>
          <span className="admin-kpi-badge">Certified</span>
        </div>
      </div>

      {/* 3. Table Card */}
      <div className="db-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" />
            <input 
              type="text" 
              placeholder="Search by Audit ID, Vendor, or Customer..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
            Showing {filtered.length} of {reports.length} reports
          </span>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Audited Vendor</th>
                <th>Enterprise Client</th>
                <th>Cycle Period</th>
                <th>Compliance Score</th>
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
                    <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No completed audit reports found</p>
                    <p className="text-xs text-slate-400 mt-1">Audit reports become available once an audit is completed and signed off.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const score = Number(r.score) || 0;
                  const scoreClass = score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low';
                  const vendorName = r.vendorName || usersMap[r.vendorId] || r.vendorId;
                  const customerName = r.customerName || r.organisation || usersMap[r.customerId] || r.customerId;

                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="audit-id-badge">{r.auditIdString}</span>
                      </td>
                      <td>
                        <span className="font-bold text-slate-900 text-xs block">{vendorName}</span>
                        <span className="text-[11px] text-slate-400 font-medium">Compliance Auditee</span>
                      </td>
                      <td>
                        <span className="font-bold text-slate-800 text-xs">{customerName}</span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {r.auditPeriod}
                        </span>
                      </td>
                      <td>
                        <span className={`score-badge-pill ${scoreClass}`}>
                          {Number(score).toFixed(score % 1 === 0 ? 0 : 1)}% Compliant
                        </span>
                      </td>
                      <td className="text-right">
                        <Link 
                          to={`/admin/reports/${r.id}`} 
                          className="db-btn db-btn-primary text-xs py-1 px-3 inline-flex items-center gap-1.5"
                        >
                          <BarChart3 className="w-3.5 h-3.5" /> View Report
                        </Link>
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
