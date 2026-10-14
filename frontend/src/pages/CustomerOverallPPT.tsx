import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, Filter, Download,
  AlertCircle, Shield, FileText, CheckCircle2, AlertTriangle, X,
  Presentation, RefreshCw, Layers, FileBarChart
} from 'lucide-react';
import { getCustomerReports, downloadCustomerAuditPpt } from '../services/api';

export const CustomerOverallPPT: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditsData, setAuditsData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>({
    totalAudits: 0,
    completedAudits: 0,
    pptAvailable: 0,
    pendingPpt: 0
  });

  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [pptStatusFilter, setPptStatusFilter] = useState('ALL');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/customer' },
    { name: 'My Vendors', icon: Building2, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, active: true, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, path: '/customer/overall-report' }
  ];

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerReports();
      if (res.success && res.data) {
        setAuditsData(res.data);
        
        // Calculate real stats
        const totalAudits = res.data.length;
        const completedAudits = res.data.filter((item: any) => {
          const st = (item.status || '').toLowerCase();
          return item.completionPercentage === 100 || ['closed', 'completed', 'approved'].includes(st);
        }).length;
        const pptAvailable = res.data.filter((item: any) => item.reportAvailable || item.completionPercentage === 100).length;
        const pendingPpt = totalAudits - pptAvailable;

        setSummaryStats({
          totalAudits,
          completedAudits,
          pptAvailable,
          pendingPpt
        });
      } else {
        setError(res.error || 'Failed to fetch customer audit presentations data.');
      }
    } catch (err: any) {
      console.error('Error fetching customer PPT reports:', err);
      setError('Network error: Unable to load audit presentation data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadPpt = async (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isEligible = item.reportAvailable || item.completionPercentage === 100;
    if (!isEligible) {
      alert('Overall PPT PowerPoint presentation is pending audit completion.');
      return;
    }

    const targetId = item.id || item.auditIdString;

    try {
      setIsDownloading(item.id);
      setDownloadError(null);
      
      const blob = await downloadCustomerAuditPpt(targetId);
      
      const safeAuditId = (item.auditIdString || item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeVendor = (item.vendorName || 'Vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safePeriod = (item.auditPeriod || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeAuditId}_${safeVendor}_${safePeriod}_Overall-Audit.pptx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download PPT error:', err);
      let errorMsg = `Failed to download PowerPoint presentation for ${item.auditIdString || item.id}. Please try again.`;
      
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.error) {
            errorMsg = parsed.error;
          }
        } catch (e) {
          // fallback to default errorMsg
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setDownloadError(errorMsg);
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

  // Unique vendors list for dropdown
  const uniqueVendors = Array.from(
    new Set(auditsData.map(a => a.vendorName).filter(Boolean))
  );

  // Filtered Audits
  const filteredAudits = auditsData.filter(item => {
    const isPptAvailable = item.reportAvailable || item.completionPercentage === 100;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (item.reportTitle && item.reportTitle.toLowerCase().includes(q)) ||
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.auditIdString && item.auditIdString.toLowerCase().includes(q)) ||
      (item.vendorName && item.vendorName.toLowerCase().includes(q)) ||
      (item.auditPeriod && item.auditPeriod.toLowerCase().includes(q))
    );

    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      const st = (item.status || '').toLowerCase();
      if (statusFilter === 'CLOSED') matchesStatus = ['closed', 'completed', 'approved'].includes(st);
      else if (statusFilter === 'PENDING') matchesStatus = !['closed', 'completed', 'approved'].includes(st);
    }

    const matchesVendor = vendorFilter === 'ALL' || item.vendorName === vendorFilter;

    let matchesPptStatus = true;
    if (pptStatusFilter === 'AVAILABLE') matchesPptStatus = isPptAvailable;
    else if (pptStatusFilter === 'PENDING') matchesPptStatus = !isPptAvailable;

    return matchesSearch && matchesStatus && matchesVendor && matchesPptStatus;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setVendorFilter('ALL');
    setPptStatusFilter('ALL');
  };

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .ppt-reports-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
      `}</style>

      {/* Header Title Section */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
          Overall PPT
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          Download overall audit presentation reports for your assigned vendors.
        </p>
      </div>

      {downloadError && (
        <div style={{
          padding: '1rem 1.25rem', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle style={{ width: '18px', height: '18px', color: '#DC2626', flexShrink: 0 }} />
            <span>{downloadError}</span>
          </div>
          <button 
            onClick={() => setDownloadError(null)}
            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      )}

      {/* Top Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease 0.05s both' }}>
        <div className="ppt-reports-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers style={{ width: '26px', height: '26px', color: '#1565C0' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Audits</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', marginTop: '2px' }}>{summaryStats.totalAudits}</div>
          </div>
        </div>

        <div className="ppt-reports-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 style={{ width: '26px', height: '26px', color: '#047857' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Completed Audits</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>{summaryStats.completedAudits}</div>
          </div>
        </div>

        <div className="ppt-reports-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Presentation style={{ width: '26px', height: '26px', color: '#059669' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>PPT Available</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>{summaryStats.pptAvailable}</div>
          </div>
        </div>

        <div className="ppt-reports-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock style={{ width: '26px', height: '26px', color: '#B45309' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Pending PPT</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#B45309', marginTop: '2px' }}>{summaryStats.pendingPpt}</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="ppt-reports-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading overall audit PowerPoint presentations...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div className="ppt-reports-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Unable to load presentation data</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{error}</p>
          <button onClick={fetchData} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      ) : (
        /* Presentation Table & Controls */
        <div className="ppt-reports-card" style={{ padding: 0, overflow: 'hidden', animation: 'fadeIn 0.3s ease 0.1s both' }}>
          {/* Controls Bar */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Overall Audit Presentations ({filteredAudits.length})
            </h2>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                <option value="ALL">All Audit Statuses</option>
                <option value="CLOSED">Closed / Approved</option>
                <option value="PENDING">Pending Review / In Progress</option>
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

              <select
                value={pptStatusFilter}
                onChange={(e) => setPptStatusFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '0.775rem', fontWeight: 600, color: '#0B1F3A', background: 'white'
                }}
              >
                <option value="ALL">All PPT Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="PENDING">Pending</option>
              </select>

              {(searchQuery || statusFilter !== 'ALL' || vendorFilter !== 'ALL' || pptStatusFilter !== 'ALL') && (
                <button
                  onClick={clearFilters}
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

          {filteredAudits.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Audit / Report Name</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Audit ID</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Vendor</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Period</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Audit Status</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Completion</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Score</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>PPT Status</th>
                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.map((item) => {
                    const isEligible = item.reportAvailable || item.completionPercentage === 100;
                    const st = getStatusBadgeStyle(item.status);
                    const sc = getScoreBadgeStyle(item.score);
                    const pct = Number(item.completionPercentage || 0);

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0B1F3A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Presentation style={{ width: '18px', height: '18px', color: '#1565C0', flexShrink: 0 }} />
                            <span>{item.reportTitle || item.name || `${item.auditPeriod} Audit Presentation`}</span>
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#1565C0' }}>
                          {item.auditIdString || item.id}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0B1F3A' }}>
                          {item.vendorName || 'Vendor'}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 600 }}>
                          {item.auditPeriod || 'Q3 2026'}
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
                            background: isEligible ? '#ECFDF5' : '#FFFBEB',
                            color: isEligible ? '#047857' : '#B45309',
                            border: isEligible ? '1px solid #A7F3D0' : '1px solid #FDE68A'
                          }}>
                            {isEligible ? '✓ Available' : '○ Pending'}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          {isEligible ? (
                            <button
                              onClick={(e) => handleDownloadPpt(item, e)}
                              disabled={isDownloading === item.id}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.375rem 0.75rem', borderRadius: '8px',
                                background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0',
                                fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer',
                                opacity: isDownloading === item.id ? 0.6 : 1
                              }}
                            >
                              {isDownloading === item.id ? (
                                <>
                                  <RefreshCw style={{ width: '13px', height: '13px', animation: 'spin 0.8s linear infinite' }} />
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Download style={{ width: '13px', height: '13px' }} />
                                  <span>Download PPT</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>
                              Report Not Available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <Presentation style={{ width: '48px', height: '48px', color: '#CBD5E1', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>
                No audit presentation reports available
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>
                Completed audit presentations will automatically appear here when available.
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
