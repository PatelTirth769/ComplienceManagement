import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, Filter, Eye, RefreshCw,
  AlertCircle, TrendingUp, TrendingDown, Award, Shield, AlertTriangle, FileText, Presentation, FileBarChart
} from 'lucide-react';
import { getCustomerComplianceScores } from '../services/api';

export const CustomerComplianceScores: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoresData, setScoresData] = useState<any | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/customer' },
    { name: 'My Vendors', icon: Building2, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, active: true, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, path: '/customer/overall-report' }
  ];

  const fetchScores = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerComplianceScores();
      if (res.success && res.data) {
        setScoresData(res.data);
      } else {
        setError(res.error || 'Failed to fetch compliance scores data.');
      }
    } catch (err: any) {
      console.error('Error fetching compliance scores:', err);
      setError('Network error: Unable to load compliance scores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  const getStatusBadgeStyle = (statusStr?: string) => {
    if (!statusStr) return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'Scheduled' };
    const s = statusStr.toLowerCase();
    if (['closed', 'completed', 'approved'].includes(s)) {
      return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: 'Closed' };
    }
    if (s === 'pending sign-off' || s === 'under review') {
      return { bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE', label: 'Pending Sign-off' };
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

  const audits = scoresData?.audits || [];
  const vendorPerformance = scoresData?.vendorPerformance || [];
  const labourCodeScores = scoresData?.labourCodeScores || [];
  const findingsSummary = scoresData?.findingsSummary || {};

  const uniqueVendors = Array.from(new Set(audits.map((a: any) => a.vendorName))).filter(Boolean);

  const filteredAudits = audits.filter((audit: any) => {
    const q = searchQuery.toLowerCase().trim();
    const auditIdStr = (audit.auditIdString || audit.id || '').toLowerCase();
    const vendorName = (audit.vendorName || '').toLowerCase();

    const matchesSearch = !q || auditIdStr.includes(q) || vendorName.includes(q);
    if (!matchesSearch) return false;

    const st = (audit.status || '').toLowerCase();
    if (statusFilter === 'SCHEDULED' && st !== 'scheduled') return false;
    if (statusFilter === 'IN_PROGRESS' && st !== 'in progress') return false;
    if (statusFilter === 'PENDING' && !['pending sign-off', 'under review'].includes(st)) return false;
    if (statusFilter === 'CLOSED' && !['closed', 'completed', 'approved'].includes(st)) return false;

    if (vendorFilter !== 'ALL' && audit.vendorName !== vendorFilter) return false;

    return true;
  });

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .scores-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
          Compliance Scores
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          Monitor statutory compliance scores and vendor audit performance analytics.
        </p>
      </div>

      {isLoading ? (
        <div className="scores-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading compliance performance scores...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div className="scores-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Unable to load scores</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{error}</p>
          <button onClick={fetchScores} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Top KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease 0.05s both' }}>
            <div className="scores-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#ECFDF5', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Award style={{ width: '28px', height: '28px', color: '#059669' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Overall Compliance Score</div>
                <div style={{ fontSize: '1.625rem', fontWeight: 800, color: scoresData?.overallCompliance != null ? '#047857' : '#64748B', marginTop: '2px' }}>
                  {scoresData?.overallCompliance != null ? `${scoresData.overallCompliance}%` : 'N/A'}
                </div>
              </div>
            </div>

            <div className="scores-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield style={{ width: '26px', height: '26px', color: '#1565C0' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Completed Audits</div>
                <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', marginTop: '2px' }}>
                  {scoresData?.completedAuditsCount || 0}
                </div>
              </div>
            </div>

            <div className="scores-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle style={{ width: '26px', height: '26px', color: '#DC2626' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>Total Findings</div>
                <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                  {findingsSummary?.totalFindings || 0}
                </div>
              </div>
            </div>

            <div className="scores-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BarChart3 style={{ width: '26px', height: '26px', color: '#059669' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Resolved Findings</div>
                <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {findingsSummary?.resolvedFindings || 0}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Vendor Performance & Period Comparison */}
            <div className="scores-card" style={{ margin: 0, animation: 'fadeIn 0.3s ease 0.1s both' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
                Vendor Performance & Trend Comparison
              </h2>

              {vendorPerformance.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {vendorPerformance.map((vp: any, idx: number) => {
                    const hasTrend = vp.change !== null;
                    const isUp = hasTrend && vp.change >= 0;

                    return (
                      <div key={idx} style={{ padding: '0.875rem 1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0B1F3A', fontSize: '0.875rem' }}>{vp.vendorName}</div>
                          <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '2px' }}>
                            Current Score: <strong>{vp.currentScore != null ? `${vp.currentScore}%` : 'N/A'}</strong>
                            {vp.previousScore != null && ` • Previous: ${vp.previousScore}%`}
                          </div>
                        </div>

                        {hasTrend ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: '999px', background: isUp ? '#ECFDF5' : '#FEF2F2', border: isUp ? '1px solid #A7F3D0' : '1px solid #FECACA', fontSize: '0.75rem', fontWeight: 800, color: isUp ? '#047857' : '#DC2626' }}>
                            {isUp ? <TrendingUp style={{ width: '14px', height: '14px' }} /> : <TrendingDown style={{ width: '14px', height: '14px' }} />}
                            {isUp ? `+${vp.change}%` : `${vp.change}%`}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.725rem', color: '#94A3B8', fontStyle: 'italic' }}>Historical data pending</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <p style={{ color: '#64748B', fontSize: '0.8375rem', fontWeight: 600, margin: 0 }}>Historical compliance data is not yet available.</p>
                </div>
              )}
            </div>

            {/* Labour Code Breakdown */}
            <div className="scores-card" style={{ margin: 0, animation: 'fadeIn 0.3s ease 0.15s both' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
                Labour Code Category Scores
              </h2>

              {labourCodeScores.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {labourCodeScores.map((lc: any, idx: number) => {
                    const sc = getScoreBadgeStyle(lc.score);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.8125rem' }}>
                        <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{lc.category}</span>
                        <span style={{
                          padding: '0.2rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800,
                          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`
                        }}>
                          {sc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <p style={{ color: '#64748B', fontSize: '0.8375rem', fontWeight: 600, margin: 0 }}>No completed audit score breakdown available.</p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Audit Scores Table */}
          <div className="scores-card" style={{ padding: 0, overflow: 'hidden', animation: 'fadeIn 0.3s ease 0.2s both' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Audit Compliance Scores ({filteredAudits.length})
              </h2>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '200px' }}>
                  <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search vendor or audit ID..."
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
                  <option value="ALL">All Statuses</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending Sign-off</option>
                  <option value="CLOSED">Closed / Approved</option>
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
              </div>
            </div>

            {filteredAudits.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Audit ID</th>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Vendor</th>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Period</th>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Progress</th>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Compliance Score</th>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Findings</th>
                      <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudits.map((audit: any) => {
                      const st = getStatusBadgeStyle(audit.status);
                      const sc = getScoreBadgeStyle(audit.score);
                      const pct = audit.completionPercentage !== undefined && audit.completionPercentage !== null
                        ? Number(audit.completionPercentage)
                        : 0;

                      return (
                        <tr key={audit.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0B1F3A' }}>
                            {audit.auditIdString || audit.id}
                          </td>

                          <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0B1F3A' }}>
                            {audit.vendorName}
                          </td>

                          <td style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 600 }}>
                            {audit.auditPeriod}
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

                          <td style={{ padding: '1rem 1.25rem', width: '120px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flexGrow: 1, height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px' }} />
                              </div>
                              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', minWidth: '28px' }}>{pct}%</span>
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

                          <td style={{ padding: '1rem 1.25rem', color: '#64748B' }}>
                            {audit.nonCompliantItems ? audit.nonCompliantItems.length : 0} Items
                          </td>

                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <button
                              onClick={() => navigate(`/customer/audits/${audit.id}`)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.375rem 0.75rem', borderRadius: '8px',
                                background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE',
                                fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer'
                              }}
                            >
                              <Eye style={{ width: '14px', height: '14px' }} />
                              View Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>No matching audit scores found.</p>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};
