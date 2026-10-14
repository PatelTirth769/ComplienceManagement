import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare, Download, FileText, CheckCircle2, ShieldCheck, FileSpreadsheet
} from 'lucide-react';
import { getVendorReports, downloadVendorReport, API_BASE_URL } from '../services/api';

export const VendorReports: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingExcelId, setDownloadingExcelId] = useState<string | null>(null);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor' },
    { name: 'My Profile', icon: User, path: '/vendor/profile' },
    { name: 'My Audits', icon: FileCheck, path: '/vendor/audits' },
    { name: 'Documents', icon: FolderOpen, path: '/vendor/documents' },
    { name: 'Findings & Actions', icon: AlertTriangle, path: '/vendor/findings' },
    { name: 'Audit Timeline', icon: Clock, path: '/vendor/timeline' },
    { name: 'Reports', icon: BarChart3, active: true, path: '/vendor/reports' },
    { name: 'Notifications', icon: Bell, path: '/vendor/notifications' },
    { name: 'Contact Auditor', icon: MessageSquare, path: '/vendor/contact' }
  ];

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await getVendorReports();
        if (response.success) {
          setReports(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch reports', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleDownloadReport = async (auditId: string) => {
    try {
      setDownloadingId(auditId);
      const res = await downloadVendorReport(auditId);
      if (res.success && res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
      } else {
        alert(res.error || 'Failed to download report PDF');
      }
    } catch (err: any) {
      console.error('Error downloading report PDF:', err);
      alert(err.response?.data?.error || 'Failed to generate and download PDF report');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadExcel = async (report: any) => {
    const compPct = report.completionPercentage ?? (
      ['closed', 'completed', 'approved'].includes((report.status || '').toLowerCase()) ? 100 : 0
    );
    if (compPct < 100) {
      alert('Excel download is available only after audit completion (100%).');
      return;
    }

    try {
      setDownloadingExcelId(report.id);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/vendor/audits/${report.id}/download-excel`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Excel download is available only after audit completion (100%).');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.auditIdString || report.id}_${(report.auditPeriod || 'Report').replace(/\s+/g, '_')}_Complete-Audit.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download Excel error:', err);
      alert('Failed to download Excel file. Please try again.');
    } finally {
      setDownloadingExcelId(null);
    }
  };

  const getScoreBadge = (score?: number) => {
    if (score == null) return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'N/A' };
    const roundScore = Math.round(score);
    if (roundScore >= 80) return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: `${roundScore}%` };
    if (roundScore >= 50) return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: `${roundScore}%` };
    return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: `${roundScore}%` };
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
          <div style={{
            width: '42px', height: '42px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Header Banner */}
      <div style={{ marginBottom: '1.75rem', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 style={{ width: '20px', height: '20px', color: '#1565C0' }} />
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>Audit Reports & Scorecards</h1>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, paddingLeft: '2.875rem' }}>
          Access official final compliance reports and downloadable PDF scorecards for completed audits.
        </p>
      </div>

      {/* Summary Stat Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem', animation: 'fadeIn 0.4s ease 0.1s both' }}>
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>Completed Reports</div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A' }}>{reports.length}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>Latest Score</div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: reports.length > 0 && reports[0].score != null ? '#047857' : '#64748B' }}>
            {reports.length > 0 && reports[0].score != null ? `${Math.round(reports[0].score)}%` : 'N/A'}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>Export Format</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1565C0', display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
            <FileText style={{ width: '18px', height: '18px' }} />
            Official PDF
          </div>
        </div>
      </div>

      {/* Reports Table Card */}
      <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden', animation: 'fadeIn 0.4s ease 0.2s both'
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Available Final Reports</h3>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '0.2rem 0.625rem', borderRadius: '999px' }}>
            {reports.length} Records
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Audit Period</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Completion Date</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Final Score</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>Auditor</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem' }}>
              {reports.length > 0 ? (
                reports.map((report) => {
                  const scoreBadge = getScoreBadge(report.score);
                  const completionDate = report.timeline?.find((t: any) => ['closed', 'approved', 'pending sign-off'].includes((t.status || '').toLowerCase()))?.timestamp;

                  return (
                    <tr key={report.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: '#0B1F3A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShieldCheck style={{ width: '16px', height: '16px', color: '#1565C0' }} />
                          </div>
                          <span>{report.auditPeriod || 'Q3 2026'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', color: '#64748B' }}>
                        {completionDate ? new Date(completionDate).toLocaleDateString() : '10/6/2026'}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem',
                          borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 800,
                          background: scoreBadge.bg, color: scoreBadge.color, border: `1px solid ${scoreBadge.border}`
                        }}>
                          {scoreBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', color: '#0B1F3A', fontWeight: 600 }}>
                        {report.auditorName || report.auditor || 'Auditor'}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            disabled={downloadingId === report.id}
                            onClick={() => handleDownloadReport(report.id)}
                            style={{
                              background: downloadingId === report.id ? '#94A3B8' : 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                              color: 'white', fontWeight: 700, fontSize: '0.8125rem',
                              padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                              cursor: downloadingId === report.id ? 'not-allowed' : 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                              boxShadow: downloadingId === report.id ? 'none' : '0 2px 8px rgba(21, 101, 192, 0.25)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Download style={{ width: '15px', height: '15px' }} />
                            {downloadingId === report.id ? 'Generating PDF...' : 'Download PDF Report'}
                          </button>

                          {(() => {
                            const is100 = (report.completionPercentage ?? (
                              ['closed', 'completed', 'approved'].includes((report.status || '').toLowerCase()) ? 100 : 0
                            )) === 100;

                            return (
                              <button
                                disabled={!is100 || downloadingExcelId === report.id}
                                onClick={() => handleDownloadExcel(report)}
                                title={is100 ? 'Download complete audit as Excel' : 'Excel download available after audit completion.'}
                                style={{
                                  background: is100 ? '#ECFDF5' : '#F1F5F9',
                                  color: is100 ? '#047857' : '#94A3B8',
                                  border: `1px solid ${is100 ? '#A7F3D0' : '#E2E8F0'}`,
                                  fontWeight: 700, fontSize: '0.8125rem',
                                  padding: '0.5rem 0.875rem', borderRadius: '8px',
                                  cursor: is100 ? 'pointer' : 'not-allowed',
                                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <FileSpreadsheet style={{ width: '15px', height: '15px' }} />
                                {downloadingExcelId === report.id ? 'Exporting...' : 'Excel'}
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <BarChart3 style={{ width: '40px', height: '40px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>No Reports Available</h3>
                    <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0, maxWidth: '360px', marginInline: 'auto' }}>
                      Reports and scorecards will automatically generate here once an audit is completed and signed off by your auditor.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

