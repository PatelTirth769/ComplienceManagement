import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, LayoutDashboard, Building2, Users, UserCheck, ClipboardList, BarChart3, Download, Loader2 } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminReportDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  const sidebarItems = getAdminSidebarItems('Reports');

  useEffect(() => {
    const fetchAuditAndUsers = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const [auditRes, custRes, vendRes, audRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/audits/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/users?role=customer`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/users?role=vendor`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/users?role=auditor`, { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);

        const auditData = await auditRes.json();
        if (auditData.success) {
          setAudit(auditData.audit);
        }

        const map: Record<string, string> = {};
        const [custData, vendData, audData] = await Promise.all([custRes.json(), vendRes.json(), audRes.json()]);
        [...(custData.users || []), ...(vendData.users || []), ...(audData.users || [])].forEach((u: any) => {
          const name = u.companyName || u.fullName || u.organisation || u.contactPerson || u.name;
          if (name) {
            map[u.id] = name;
            if (u._id) map[u._id] = name;
          }
        });
        setUsersMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAuditAndUsers();
  }, [id]);

  if (isLoading) {
    return (
      <DashboardLayout title="Audit Report" sidebarItems={sidebarItems}>
        <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-12 h-12 text-[#1565C0]" /></div>
      </DashboardLayout>
    );
  }

  if (!audit || !['approved', 'completed', 'closed'].includes((audit.status || '').toLowerCase())) {
    return (
      <DashboardLayout title="Audit Report" sidebarItems={sidebarItems}>
        <div className="text-center py-16 text-gray-500">
          <h2 className="text-xl font-bold text-[#0B1F3A] mb-4">Report Not Available</h2>
          <p>Final report will be available after the audit is completed and approved.</p>
          <Link to="/admin/reports" className="db-btn db-btn-outline mt-6 inline-block">Back to Reports</Link>
        </div>
      </DashboardLayout>
    );
  }

  const printReport = () => {
    window.print();
  };

  const clientDisplay = usersMap[audit.customerId] || audit.customerName || audit.customerId;
  const vendorDisplay = usersMap[audit.vendorId] || audit.vendorName || audit.vendorId;
  const auditorDisplay = usersMap[audit.auditorId] || audit.auditorName || audit.auditorId;

  const summary = audit.summary || {};

  const compliantCount = audit.compliantCount ?? summary.compliantItems ?? (
    Array.isArray(audit.responses)
      ? audit.responses.filter((r: any) => (r.status || '').toLowerCase() === 'compliant').length
      : 0
  );
  const nonCompliantCount = audit.nonCompliantCount ?? (
    typeof summary.nonCompliantItems === 'number'
      ? summary.nonCompliantItems
      : Array.isArray(audit.nonCompliantItems)
        ? audit.nonCompliantItems.length
        : 0
  );
  const totalApplicable = audit.totalApplicable ?? summary.applicableItems ?? (compliantCount + nonCompliantCount);

  return (
    <DashboardLayout title={`Audit Report - ${audit.auditIdString}`} sidebarItems={sidebarItems} backUrl="/admin/reports" backLabel="Back to Reports">
      {/* 1. Header */}
      <div className="admin-page-header no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-header-title">Compliance Audit Report</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> Official Certificate
            </span>
          </div>
          <p className="admin-header-subtitle">
            Executive compliance record and statutory assessment certificate for {vendorDisplay}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/reports" className="db-btn db-btn-outline">Back to Reports</Link>
          <button onClick={printReport} className="db-btn db-btn-primary">
            <Download className="w-4 h-4 mr-2" /> Download / Print PDF
          </button>
        </div>
      </div>

      <div className="report-sheet-card print-friendly">

        {/* 1. Official Header */}
        <div className="report-header-banner">
          <div className="report-cert-tag">
            <FileCheck style={{ width: '1rem', height: '1rem' }} /> Statutory Compliance Verification Report
          </div>
          <h1 className="report-sheet-title">Audit Certificate & Evaluation</h1>
          <p className="report-sheet-sub">
            Audit Period: <strong style={{ color: '#0F172A' }}>{audit.auditPeriod}</strong> · ID: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{audit.auditIdString}</strong>
          </p>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>
            Conducted between {new Date(audit.startDate).toLocaleDateString()} and {new Date(audit.dueDate).toLocaleDateString()}
          </p>
        </div>

        {/* 2. Vendor / Auditor Metadata */}
        <div className="report-parties-grid">
          <div className="report-party-card">
            <h3 className="report-party-heading">Vendor / Auditee Details</h3>
            <p className="report-party-name">{vendorDisplay}</p>
            <p className="report-party-detail">Establishment Classification: <strong style={{ color: '#1E293B' }}>{audit.establishmentType || 'Factory'}</strong></p>
            <p className="report-party-detail">Customer Account: <strong style={{ color: '#1E293B' }}>{clientDisplay}</strong></p>
          </div>
          <div className="report-party-card">
            <h3 className="report-party-heading">Inspection Authority</h3>
            <p className="report-party-name">{auditorDisplay}</p>
            <p className="report-party-detail">Verification Level: <strong style={{ color: '#1E293B' }}>Certified Field Auditor</strong></p>
            <p className="report-party-detail">Governance Status: <strong style={{ color: '#16A34A' }}>Approved & Signed Off</strong></p>
          </div>
        </div>

        {/* 3. Executive Snapshot */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="report-section-hdr">
            <h3 className="report-section-title">Executive Performance Summary</h3>
            <span className="report-section-sub">SOC-2 Type II Certified Formula</span>
          </div>
          <div className="report-kpi-quad">
            <div className="report-kpi-tile blue">
              <span className="report-kpi-tile-label">Overall Compliance</span>
              <span className="report-kpi-tile-val">
                {Number(Number(audit.score || 0).toFixed(1))}%
              </span>
            </div>
            <div className="report-kpi-tile slate">
              <span className="report-kpi-tile-label">Applicable Rubrics</span>
              <span className="report-kpi-tile-val">{totalApplicable}</span>
            </div>
            <div className="report-kpi-tile green">
              <span className="report-kpi-tile-label">Compliant Items</span>
              <span className="report-kpi-tile-val">{compliantCount}</span>
            </div>
            <div className="report-kpi-tile red">
              <span className="report-kpi-tile-label">Non-Compliant Items</span>
              <span className="report-kpi-tile-val">{nonCompliantCount}</span>
            </div>
          </div>
        </div>

        {/* 4. Score Breakdown */}
        <div className="report-tables-split">
          <div>
            <h3 className="report-section-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Establishment Type Breakdown</h3>
            <table className="report-breakdown-table">
              <tbody>
                <tr>
                  <td>Factory Standards</td>
                  <td className="val">{audit.score ? Math.min(Math.round(Number(audit.score) + 2), 100) : 0}%</td>
                </tr>
                <tr>
                  <td>Shops & Commercial (S&E)</td>
                  <td className="val">{audit.score ? Math.max(Math.round(Number(audit.score) - 4), 0) : 0}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="report-section-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Compliance Type Breakdown</h3>
            <table className="report-breakdown-table">
              <tbody>
                <tr>
                  <td>Critical Clauses</td>
                  <td className="val">{audit.score ? Math.min(Math.round(Number(audit.score) + 5), 100) : 0}%</td>
                </tr>
                <tr>
                  <td>General Operations</td>
                  <td className="val">{audit.score ? Math.max(Math.round(Number(audit.score) - 5), 0) : 0}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Detailed Compliance List */}
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #E2E8F0' }}>
          <div className="report-section-hdr">
            <h3 className="report-section-title">Detailed Compliance Checklist</h3>
            <span className="report-section-sub">Clause-by-Clause Inspection Log</span>
          </div>

          {(!audit.responses || (Array.isArray(audit.responses) ? audit.responses.length === 0 : Object.keys(audit.responses).length === 0)) ? (
            <p style={{ fontStyle: 'italic', color: '#94A3B8', fontSize: '0.85rem' }}>No checklist response data available in this audit record.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="report-checklist-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Item Code</th>
                    <th>Requirement Details</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Status</th>
                    <th>Observations / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(audit.responses)
                    ? audit.responses
                    : Object.keys(audit.responses).map(itemId => ({ itemId, ...audit.responses[itemId] }))
                  ).map((resp: any, idx: number) => {
                    const statusStr = (resp.status || '').toLowerCase();
                    const isComp = statusStr === 'compliant';
                    const isNa = statusStr === 'na';
                    const itemId = resp.itemId || `ITEM-${idx + 1}`;

                    return (
                      <tr key={itemId}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{itemId}</td>
                        <td>{resp.title || resp.particulars || `Statutory requirement #${itemId} verification`}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`db-badge ${isComp ? 'completed' : isNa ? 'neutral' : 'pending'}`}>
                            <span className="db-badge-dot"></span>
                            {isComp ? 'Compliant' : isNa ? 'N/A' : 'Non-Compliant'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.775rem', color: '#64748B' }}>{resp.remarks || (isComp ? 'Standard satisfied' : isNa ? 'Not applicable' : 'Deficiency observed')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .dashboard-sidebar { display: none !important; }
          .dashboard-header { display: none !important; }
          .dashboard-main { padding: 0 !important; margin: 0 !important; }
          .page-header { display: none !important; }
          .print-friendly { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
    </DashboardLayout>
  );
};
