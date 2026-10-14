import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, Filter, Eye, Download,
  AlertCircle, Shield, FileText, CheckCircle2, AlertTriangle, X, Presentation, FileBarChart
} from 'lucide-react';
import { getCustomerReports } from '../services/api';
import api from '../services/api';

export const CustomerReports: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>({
    totalReports: 0,
    completedAudits: 0,
    availableReports: 0,
    pendingReports: 0
  });

  // Selected report for modal view
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/customer' },
    { name: 'My Vendors', icon: Building2, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, active: true, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, path: '/customer/overall-report' }
  ];

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerReports();
      if (res.success && res.data) {
        setReportsData(res.data);
        if (res.summary) {
          setSummaryStats(res.summary);
        }
      } else {
        setError(res.error || 'Failed to fetch customer compliance reports.');
      }
    } catch (err: any) {
      console.error('Error fetching customer reports:', err);
      setError('Network error: Unable to load compliance reports.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownloadExcel = async (reportItem: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!reportItem.reportAvailable) {
      alert('Excel report download is available only after the audit is 100% completed/closed.');
      return;
    }

    try {
      setIsDownloading(reportItem.id);
      const response = await api.get(`/customer/audits/${reportItem.id}/download-excel`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `${reportItem.auditIdString || 'Audit'}_${reportItem.auditPeriod || 'Report'}_Complete.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download excel report error:', err);
      alert('Failed to download report workbook. Please try again.');
    } finally {
      setIsDownloading(null);
    }
  };

  const getStatusBadgeStyle = (statusStr?: string) => {
    if (!statusStr) return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'Scheduled' };
    const s = statusStr.toLowerCase();
    if (['closed', 'completed', 'approved'].includes(s)) {
      return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: 'Closed / Approved' };
    }
    if (s === 'pending sign-off' || s === 'under review') {
      return { bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE', label: 'Pending Review' };
    }
    if (s === 'in progress') {
      return { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', label: 'In Progress' };
    }
    return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: statusStr || 'Scheduled' };
  };

  const getScoreBadgeStyle = (score: number | null) => {
    if (score == null) return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'N/A' };
    const roundScore = Math.round(score);
    if (roundScore >= 80) return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: `${roundScore}%` };
    if (roundScore >= 50) return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: `${roundScore}%` };
    return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: `${roundScore}%` };
  };

  const uniqueVendors = Array.from(new Set(reportsData.map(r => r.vendorName))).filter(Boolean);

  const filteredReports = reportsData.filter(report => {
    const q = searchQuery.toLowerCase().trim();
    const auditIdStr = (report.auditIdString || report.id || '').toLowerCase();
    const vendorName = (report.vendorName || '').toLowerCase();
    const title = (report.reportTitle || '').toLowerCase();
    const period = (report.auditPeriod || '').toLowerCase();

    const matchesSearch = !q || auditIdStr.includes(q) || vendorName.includes(q) || title.includes(q) || period.includes(q);
    if (!matchesSearch) return false;

    const st = (report.status || '').toLowerCase();
    if (statusFilter === 'CLOSED' && !['closed', 'completed', 'approved'].includes(st)) return false;
    if (statusFilter === 'PENDING' && ['closed', 'completed', 'approved'].includes(st)) return false;

    if (vendorFilter !== 'ALL' && report.vendorName !== vendorFilter) return false;

    return true;
  });

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .reports-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .report-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(11, 31, 58, 0.6); backdrop-filter: blur(4px);
          z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
        }
        .report-modal-content {
          background: white; border-radius: 16px; width: 100%; max-width: 900px;
          max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          animation: fadeIn 0.25s ease;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
          Reports
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          View and analyze compliance audit reports for your assigned vendors.
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease 0.05s both' }}>
        <div className="reports-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText style={{ width: '26px', height: '26px', color: '#1565C0' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Reports</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', marginTop: '2px' }}>{summaryStats.totalReports || reportsData.length}</div>
          </div>
        </div>

        <div className="reports-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 style={{ width: '26px', height: '26px', color: '#047857' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Completed Audits</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>{summaryStats.completedAudits || 0}</div>
          </div>
        </div>

        <div className="reports-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Download style={{ width: '26px', height: '26px', color: '#059669' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Reports Available</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>{summaryStats.availableReports || 0}</div>
          </div>
        </div>

        <div className="reports-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock style={{ width: '26px', height: '26px', color: '#B45309' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Pending Reports</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#B45309', marginTop: '2px' }}>{summaryStats.pendingReports || 0}</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="reports-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading compliance audit reports...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div className="reports-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Unable to load reports</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{error}</p>
          <button onClick={fetchReports} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      ) : (
        /* Report Table & Controls */
        <div className="reports-card" style={{ padding: 0, overflow: 'hidden', animation: 'fadeIn 0.3s ease 0.1s both' }}>
          {/* Controls Bar */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Available Compliance Reports ({filteredReports.length})
            </h2>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search report, audit ID, vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '0.775rem', outline: 'none', background: 'white'
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '0.775rem', fontWeight: 600, color: '#0B1F3A', background: 'white'
                }}
              >
                <option value="ALL">All Report Statuses</option>
                <option value="CLOSED">Completed / Closed</option>
                <option value="PENDING">Pending / In Progress</option>
              </select>

              {uniqueVendors.length > 0 && (
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                    fontSize: '0.775rem', fontWeight: 600, color: '#0B1F3A', background: 'white'
                  }}
                >
                  <option value="ALL">All Vendors</option>
                  {uniqueVendors.map((v: any, i: number) => (
                    <option key={i} value={v}>{v}</option>
                  ))}
                </select>
              )}

              {(searchQuery || statusFilter !== 'ALL' || vendorFilter !== 'ALL') && (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setVendorFilter('ALL'); }}
                  style={{
                    padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                    background: '#F8FAFC', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {filteredReports.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Report Name</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Audit ID</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Vendor</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Period</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Audit Status</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Completion</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Score</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Report Status</th>
                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => {
                    const st = getStatusBadgeStyle(report.status);
                    const sc = getScoreBadgeStyle(report.score);
                    const pct = Number(report.completionPercentage || 0);

                    return (
                      <tr key={report.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0B1F3A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText style={{ width: '16px', height: '16px', color: '#1565C0', flexShrink: 0 }} />
                            <span>{report.reportTitle}</span>
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#1565C0' }}>
                          {report.auditIdString}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0B1F3A' }}>
                          {report.vendorName}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 600 }}>
                          {report.auditPeriod}
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.625rem',
                            borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                            background: st.bg, color: st.color, border: `1px solid ${st.border}`
                          }}>
                            {st.label}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', width: '110px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flexGrow: 1, height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px' }} />
                            </div>
                            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569' }}>{pct}%</span>
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.625rem',
                            borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800,
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`
                          }}>
                            {sc.label}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.2rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                            background: report.reportAvailable ? '#ECFDF5' : '#FFFBEB',
                            color: report.reportAvailable ? '#047857' : '#B45309',
                            border: report.reportAvailable ? '1px solid #A7F3D0' : '1px solid #FDE68A'
                          }}>
                            {report.reportAvailable ? '✓ Available' : '○ Pending'}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setSelectedReport(report)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.375rem 0.75rem', borderRadius: '8px',
                                background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE',
                                fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer'
                              }}
                            >
                              <Eye style={{ width: '14px', height: '14px' }} />
                              View Report
                            </button>

                            {report.reportAvailable ? (
                              <button
                                onClick={(e) => handleDownloadExcel(report, e)}
                                disabled={isDownloading === report.id}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                  padding: '0.375rem 0.75rem', borderRadius: '8px',
                                  background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0',
                                  fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer',
                                  opacity: isDownloading === report.id ? 0.6 : 1
                                }}
                              >
                                <Download style={{ width: '14px', height: '14px' }} />
                                {isDownloading === report.id ? 'Exporting...' : 'Download Excel'}
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.725rem', color: '#94A3B8', alignSelf: 'center', fontStyle: 'italic' }}>
                                Report Not Available
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <FileText style={{ width: '44px', height: '44px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>No audit reports available yet.</h3>
              <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>Reports will appear here automatically as vendor statutory audits complete.</p>
            </div>
          )}
        </div>
      )}

      {/* READ-ONLY REPORT VIEW MODAL */}
      {selectedReport && (
        <div className="report-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFCFF' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B1F3A', margin: 0 }}>
                    {selectedReport.reportTitle}
                  </h2>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8375rem', fontWeight: 700, color: '#1565C0', background: '#EFF6FF', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                    {selectedReport.auditIdString}
                  </span>
                </div>
                <p style={{ color: '#64748B', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
                  Vendor: <strong>{selectedReport.vendorName}</strong> • Period: <strong>{selectedReport.auditPeriod}</strong> • Auditor: <strong>{selectedReport.auditorName}</strong>
                </p>
              </div>

              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '0.25rem' }}>
                <X style={{ width: '22px', height: '22px' }} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Prelude & Context */}
              <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Establishment Type</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', marginTop: '2px' }}>{selectedReport.establishmentType}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Audit Status</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1565C0', marginTop: '2px' }}>{selectedReport.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Completion Progress</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: selectedReport.completionPercentage === 100 ? '#047857' : '#1565C0', marginTop: '2px' }}>
                    {selectedReport.completionPercentage || 0}%
                  </div>
                </div>
              </div>

              {/* Overall Snapshot */}
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem' }}>
                  Compliance Executive Snapshot
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1rem', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Compliance Score</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
                      {selectedReport.score != null ? `${Math.round(selectedReport.score)}%` : 'N/A'}
                    </div>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>Critical Findings</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                      {selectedReport.criticalCount || 0}
                    </div>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>General Findings</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>
                      {selectedReport.generalCount || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category / Labour Code Scores */}
              {Array.isArray(selectedReport.categoryScores) && selectedReport.categoryScores.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem' }}>
                    Category / Labour Code Breakdown
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {selectedReport.categoryScores.map((cs: any, idx: number) => (
                      <div key={idx} style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A' }}>{cs.category}</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: cs.score >= 80 ? '#047857' : (cs.score >= 50 ? '#B45309' : '#DC2626') }}>
                          {cs.score != null ? `${Math.round(cs.score)}%` : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Non-Compliant Items */}
              {Array.isArray(selectedReport.nonCompliantItems) && selectedReport.nonCompliantItems.length > 0 ? (
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem' }}>
                    Non-Compliant Findings Details ({selectedReport.nonCompliantItems.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {selectedReport.nonCompliantItems.map((item: any, idx: number) => (
                      <div key={idx} style={{ padding: '0.875rem 1rem', borderRadius: '10px', background: item.isCritical ? '#FEF2F2' : '#FFFBEB', border: item.isCritical ? '1px solid #FECACA' : '1px solid #FDE68A', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 800, color: '#0B1F3A' }}>{item.category || item.law || 'Statutory Code'} - Item #{item.itemNumber || idx + 1}</span>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                            background: item.isCritical ? '#DC2626' : '#B45309', color: 'white'
                          }}>
                            {item.isCritical ? 'Critical Non-Compliance' : 'General Finding'}
                          </span>
                        </div>
                        <p style={{ color: '#475569', margin: '0 0 0.25rem' }}>{item.requirement || item.finding || item.observation || 'Non-compliance observed during audit.'}</p>
                        {item.vendorResponse && (
                          <div style={{ color: '#047857', fontWeight: 600, fontSize: '0.75rem', marginTop: '0.25rem', padding: '0.375rem 0.5rem', background: '#ECFDF5', borderRadius: '6px' }}>
                            Vendor Response: {item.vendorResponse}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: '#ECFDF5', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                  <CheckCircle2 style={{ width: '28px', height: '28px', color: '#047857', margin: '0 auto 0.5rem' }} />
                  <p style={{ color: '#065F46', fontSize: '0.8375rem', fontWeight: 700, margin: 0 }}>No non-compliant findings recorded for this audit.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #E2E8F0', background: '#FAFCFF', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                Close View
              </button>

              {selectedReport.reportAvailable && (
                <button
                  onClick={() => handleDownloadExcel(selectedReport)}
                  disabled={isDownloading === selectedReport.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.5rem 1rem', borderRadius: '8px', background: '#047857', color: 'white',
                    fontWeight: 700, fontSize: '0.8125rem', border: 'none', cursor: 'pointer',
                    opacity: isDownloading === selectedReport.id ? 0.6 : 1
                  }}
                >
                  <Download style={{ width: '16px', height: '16px' }} />
                  {isDownloading === selectedReport.id ? 'Exporting...' : 'Download Full Excel Report'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
