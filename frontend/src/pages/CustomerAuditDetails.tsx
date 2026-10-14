import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, ArrowLeft, Eye, ShieldCheck, AlertTriangle,
  User, Calendar, CheckCircle2, FileText, Download, Lock, AlertCircle, RefreshCw, Presentation, FileBarChart
} from 'lucide-react';
import { getCustomerAuditById, API_BASE_URL } from '../services/api';

export const CustomerAuditDetails: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<any | null>(null);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/customer' },
    { name: 'My Vendors', icon: Building2, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, active: true, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, path: '/customer/overall-report' }
  ];

  const fetchAuditDetails = async () => {
    if (!auditId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerAuditById(auditId);
      if (res.success && res.data) {
        setAudit(res.data);
      } else {
        setError(res.error || 'Audit record not found.');
      }
    } catch (err: any) {
      console.error('Error fetching audit details:', err);
      setError('Network error: Unable to load audit details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditDetails();
  }, [auditId]);

  const handleDownloadExcel = async () => {
    if (!audit) return;
    try {
      setDownloadingExcel(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/customer/audits/${audit.id}/download-excel`, {
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
      link.download = `${audit.auditIdString || audit.id}_${(audit.auditPeriod || 'Report').replace(/\s+/g, '_')}_Complete-Audit.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download Excel error:', err);
      alert('Failed to download Excel report.');
    } finally {
      setDownloadingExcel(false);
    }
  };

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

  if (isLoading) {
    return (
      <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading audit details...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !audit) {
    return (
      <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
        <div style={{ marginBottom: '1rem' }}>
          <Link to="/customer/audits" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#1565C0', textDecoration: 'none', fontWeight: 700, fontSize: '0.8375rem' }}>
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Back to Audits
          </Link>
        </div>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '3rem 2rem', textAlign: 'center' }}>
          <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Unable to load audit details</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{error || 'Audit record not found.'}</p>
          <button onClick={fetchAuditDetails} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const st = getStatusBadgeStyle(audit.status);
  const sc = getScoreBadgeStyle(audit.score);
  const pct = audit.completionPercentage !== undefined && audit.completionPercentage !== null
    ? Number(audit.completionPercentage)
    : 0;
  const isCompleted = pct === 100 || ['closed', 'completed', 'approved'].includes((audit.status || '').toLowerCase());

  const summary = audit.summary || {};
  const catScores = audit.categoryScores || [];
  const findings = audit.nonCompliantItems || [];

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .audit-details-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
      `}</style>

      {/* Top Navigation */}
      <div style={{ marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease' }}>
        <Link to="/customer/audits" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#1565C0', textDecoration: 'none', fontWeight: 700, fontSize: '0.8375rem' }}>
          <ArrowLeft style={{ width: '16px', height: '16px' }} />
          Back to Audits
        </Link>
      </div>

      {/* Header Banner */}
      <div className="audit-details-card" style={{ padding: '1.25rem 1.5rem', animation: 'fadeIn 0.3s ease 0.05s both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0B1F3A', margin: 0 }}>
                {audit.auditIdString || audit.id}
              </h1>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.625rem',
                borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                background: st.bg, color: st.color, border: `1px solid ${st.border}`
              }}>
                {st.label}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.625rem',
                borderRadius: '999px', fontSize: '0.725rem', fontWeight: 700,
                background: '#F8FAFC', color: '#64748B', border: '1px solid #CBD5E1'
              }}>
                <Lock style={{ width: '12px', height: '12px' }} />
                Read-Only Review
              </span>
            </div>
            <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: '0.25rem 0 0' }}>
              Audit Period: <strong>{audit.auditPeriod}</strong> • Vendor: <strong>{audit.vendorName || audit.organisation || 'Vendor'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isCompleted && (
              <button
                onClick={handleDownloadExcel}
                disabled={downloadingExcel}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', borderRadius: '8px', background: '#059669',
                  color: 'white', fontWeight: 700, fontSize: '0.8125rem', border: 'none', cursor: 'pointer'
                }}
              >
                <Download style={{ width: '15px', height: '15px' }} />
                {downloadingExcel ? 'Downloading...' : 'Download Excel Report'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* SECTION 1: AUDIT INFORMATION */}
        <div className="audit-details-card" style={{ margin: 0, animation: 'fadeIn 0.3s ease 0.1s both' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
            Audit Information
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.8375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Audit ID:</span>
              <span style={{ fontWeight: 800, color: '#0B1F3A' }}>{audit.auditIdString || audit.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Vendor Name:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{audit.vendorName || audit.organisation || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Vendor ID:</span>
              <span style={{ fontWeight: 700, color: '#475569', fontFamily: 'monospace' }}>#{audit.vendorId ? audit.vendorId.slice(0, 8) : 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Establishment / Type:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{audit.establishmentType || 'Standard Audit'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Audit Period:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{audit.auditPeriod}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Auditor Assigned:</span>
              <span style={{ fontWeight: 700, color: '#1565C0' }}>{audit.auditorName || audit.auditor || 'Auditor'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Audit Start Date:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{audit.startDate || 'TBD'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Audit Due Date:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{audit.dueDate || 'TBD'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Audit Progress:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '140px' }}>
                <div style={{ flexGrow: 1, height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1565C0' }}>{pct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: COMPLIANCE RESULT */}
        <div className="audit-details-card" style={{ margin: 0, animation: 'fadeIn 0.3s ease 0.15s both' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
            Compliance Result & Score
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem', background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: sc.bg, border: `3px solid ${sc.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: sc.color }}>{sc.label}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0B1F3A' }}>Overall Compliance Score</div>
              <div style={{ fontSize: '0.775rem', color: '#64748B', marginTop: '2px' }}>
                Auditor evaluated score based on applicable statutory labor code requirements.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center', fontSize: '0.775rem' }}>
            <div style={{ background: '#F1F5F9', borderRadius: '8px', padding: '0.625rem 0.5rem' }}>
              <div style={{ color: '#64748B', fontWeight: 600 }}>Total Items</div>
              <div style={{ fontWeight: 800, color: '#0B1F3A', fontSize: '1rem', marginTop: '2px' }}>{summary.totalItems || audit.totalRequirements || 'N/A'}</div>
            </div>
            <div style={{ background: '#ECFDF5', borderRadius: '8px', padding: '0.625rem 0.5rem' }}>
              <div style={{ color: '#065F46', fontWeight: 600 }}>Compliant</div>
              <div style={{ fontWeight: 800, color: '#059669', fontSize: '1rem', marginTop: '2px' }}>{summary.compliantItems !== undefined ? summary.compliantItems : 'N/A'}</div>
            </div>
            <div style={{ background: '#FEF2F2', borderRadius: '8px', padding: '0.625rem 0.5rem' }}>
              <div style={{ color: '#991B1B', fontWeight: 600 }}>Non-Compliant</div>
              <div style={{ fontWeight: 800, color: '#DC2626', fontSize: '1rem', marginTop: '2px' }}>{summary.nonCompliantItems !== undefined ? summary.nonCompliantItems : findings.length}</div>
            </div>
            <div style={{ background: '#FFFBEB', borderRadius: '8px', padding: '0.625rem 0.5rem' }}>
              <div style={{ color: '#92400E', fontWeight: 600 }}>N/A</div>
              <div style={{ fontWeight: 800, color: '#D97706', fontSize: '1rem', marginTop: '2px' }}>{summary.naItems !== undefined ? summary.naItems : 'N/A'}</div>
            </div>
          </div>

          {/* Section Breakdown if present */}
          {catScores.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Category Score Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {catScores.map((cs: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', padding: '0.35rem 0.625rem', background: '#F8FAFC', borderRadius: '6px' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>{cs.category}</span>
                    <span style={{ fontWeight: 800, color: '#1565C0' }}>{Math.round(cs.score)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: FINDINGS (READ-ONLY) */}
      <div className="audit-details-card" style={{ padding: 0, overflow: 'hidden', animation: 'fadeIn 0.3s ease 0.2s both' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            Non-Compliant Findings & Vendor Responses
          </h2>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '0.2rem 0.625rem', borderRadius: '999px' }}>
            {findings.length} Findings
          </span>
        </div>

        {findings.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Requirement / Particulars</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Severity</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Auditor Observation</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Vendor Response</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((item: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0B1F3A', maxWidth: '240px' }}>
                      <div>{item.title || item.particulars || item.statutoryRequirement || 'Requirement'}</div>
                      <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 500 }}>{item.category || item.type || 'General'}</div>
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.5rem',
                        borderRadius: '6px', fontSize: '0.725rem', fontWeight: 700,
                        background: item.isCritical ? '#FEF2F2' : '#FFFBEB',
                        color: item.isCritical ? '#DC2626' : '#B45309',
                        border: item.isCritical ? '1px solid #FECACA' : '1px solid #FDE68A'
                      }}>
                        {item.isCritical ? 'Critical' : 'General'}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: '#475569', maxWidth: '260px' }}>
                      {item.remarks || item.auditorObservation || item.observation || 'Non-compliant requirement observation.'}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: '#0B1F3A', maxWidth: '240px' }}>
                      {item.vendorResponse ? (
                        <div style={{ background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontWeight: 600 }}>{item.vendorResponse}</div>
                          {item.actionPlan && <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '2px' }}>Action: {item.actionPlan}</div>}
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Pending vendor response</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.5rem',
                        borderRadius: '999px', fontSize: '0.725rem', fontWeight: 700,
                        background: item.status === 'Resolved' || item.vendorResponse ? '#ECFDF5' : '#FEF2F2',
                        color: item.status === 'Resolved' || item.vendorResponse ? '#059669' : '#DC2626',
                        border: item.status === 'Resolved' || item.vendorResponse ? '1px solid #A7F3D0' : '1px solid #FECACA'
                      }}>
                        {item.status === 'Resolved' || item.vendorResponse ? 'Responded' : 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <CheckCircle2 style={{ width: '36px', height: '36px', color: '#10B981', margin: '0 auto 0.5rem' }} />
            <p style={{ color: '#065F46', fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>No findings available for this audit.</p>
          </div>
        )}
      </div>

      {/* SECTION 4: AUDIT TIMELINE */}
      {Array.isArray(audit.timeline) && audit.timeline.length > 0 && (
        <div className="audit-details-card" style={{ animation: 'fadeIn 0.3s ease 0.25s both' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
            Audit Lifecycle Timeline
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {audit.timeline.map((event: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Clock style={{ width: '14px', height: '14px', color: '#1565C0' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '0.85rem' }}>{event.event || 'Audit Event'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                    Actor: <strong>{event.actor || 'System'}</strong> • Timestamp: {new Date(event.timestamp).toLocaleString()}
                  </div>
                  {event.notes && <div style={{ fontSize: '0.775rem', color: '#475569', marginTop: '4px', background: '#F8FAFC', padding: '0.375rem 0.625rem', borderRadius: '6px' }}>{event.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
