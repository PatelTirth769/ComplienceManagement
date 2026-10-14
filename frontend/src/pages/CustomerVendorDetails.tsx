import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, ArrowLeft, Eye, ShieldCheck, AlertTriangle,
  User, Mail, Phone, MapPin, Calendar, CheckCircle2, FileText, AlertCircle, RefreshCw, Presentation, FileBarChart
} from 'lucide-react';
import { getCustomerVendorById } from '../services/api';

export const CustomerVendorDetails: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorDetails, setVendorDetails] = useState<any | null>(null);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/customer' },
    { name: 'My Vendors', icon: Building2, active: true, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, path: '/customer/overall-report' }
  ];

  const fetchDetails = async () => {
    if (!vendorId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerVendorById(vendorId);
      if (res.success && res.data) {
        setVendorDetails(res.data);
      } else {
        setError(res.error || 'Failed to load vendor details.');
      }
    } catch (err: any) {
      console.error('Error fetching vendor details:', err);
      setError('Network error: Unable to retrieve vendor details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [vendorId]);

  const getStatusBadgeStyle = (statusStr?: string) => {
    if (!statusStr) return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'No Audit' };
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
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading vendor details...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !vendorDetails) {
    return (
      <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
        <div style={{ marginBottom: '1rem' }}>
          <Link to="/customer/vendors" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#1565C0', textDecoration: 'none', fontWeight: 700, fontSize: '0.8375rem' }}>
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Back to My Vendors
          </Link>
        </div>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '3rem 2rem', textAlign: 'center' }}>
          <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Unable to load vendor details</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{error || 'Vendor record not found.'}</p>
          <button onClick={fetchDetails} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const { vendor, currentAudit, findingsSummary, auditHistory } = vendorDetails;
  const currSt = getStatusBadgeStyle(currentAudit?.status);
  const currSc = getScoreBadgeStyle(currentAudit?.score);
  const currPct = currentAudit?.completionPercentage !== undefined && currentAudit?.completionPercentage !== null
    ? Number(currentAudit.completionPercentage)
    : 0;

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .details-card {
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
        <Link to="/customer/vendors" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#1565C0', textDecoration: 'none', fontWeight: 700, fontSize: '0.8375rem' }}>
          <ArrowLeft style={{ width: '16px', height: '16px' }} />
          Back to My Vendors
        </Link>
      </div>

      {/* Title Bar */}
      <div className="details-card" style={{ padding: '1.25rem 1.5rem', animation: 'fadeIn 0.3s ease 0.05s both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #BFDBFE' }}>
              <Building2 style={{ width: '24px', height: '24px', color: '#1565C0' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0B1F3A', margin: 0 }}>
                {vendor.companyName || vendor.name || 'Vendor Profile'}
              </h1>
              <div style={{ fontSize: '0.775rem', color: '#64748B', fontWeight: 600, marginTop: '2px', fontFamily: 'monospace' }}>
                Vendor ID: #{vendor.id}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', background: '#F1F5F9', padding: '0.35rem 0.75rem', borderRadius: '999px' }}>
              {auditHistory?.length || 0} Total Audits Recorded
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* VENDOR INFORMATION */}
        <div className="details-card" style={{ margin: 0, animation: 'fadeIn 0.3s ease 0.1s both' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
            Vendor Information
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.8375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Company Name:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{vendor.companyName || vendor.name || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Contact Person:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{vendor.contactPerson || vendor.representative || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Email Address:</span>
              <span style={{ fontWeight: 700, color: '#1565C0' }}>{vendor.email || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Phone:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{vendor.phone || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Establishment / Type:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{vendor.establishmentDetails || vendor.vendorType || 'Standard Vendor'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Location / Address:</span>
              <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{vendor.address || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* CURRENT AUDIT */}
        <div className="details-card" style={{ margin: 0, animation: 'fadeIn 0.3s ease 0.15s both' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
            Current Audit Status
          </h2>

          {currentAudit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.8375rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Audit ID:</span>
                <span style={{ fontWeight: 800, color: '#0B1F3A' }}>{currentAudit.auditIdString}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Audit Period:</span>
                <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{currentAudit.auditPeriod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Status:</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.625rem',
                  borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                  background: currSt.bg, color: currSt.color, border: `1px solid ${currSt.border}`
                }}>
                  {currSt.label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Audit Progress:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '140px' }}>
                  <div style={{ flexGrow: 1, height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${currPct}%`, background: currPct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1565C0' }}>{currPct}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Compliance Score:</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem',
                  borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 800,
                  background: currSc.bg, color: currSc.color, border: `1px solid ${currSc.border}`
                }}>
                  {currSc.label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Auditor Assigned:</span>
                <span style={{ fontWeight: 700, color: '#475569' }}>{currentAudit.auditorName || currentAudit.auditor || 'Auditor'}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <FileCheck style={{ width: '36px', height: '36px', color: '#CBD5E1', margin: '0 auto 0.5rem' }} />
              <p style={{ color: '#64748B', fontSize: '0.8375rem', fontWeight: 600, margin: 0 }}>No audit currently assigned.</p>
            </div>
          )}
        </div>
      </div>

      {/* FINDINGS SUMMARY */}
      <div className="details-card" style={{ animation: 'fadeIn 0.3s ease 0.2s both' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
          Findings & Corrective Actions Summary
        </h2>

        {findingsSummary && findingsSummary.totalFindings > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Findings</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', marginTop: '0.25rem' }}>{findingsSummary.totalFindings}</div>
            </div>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>Critical Findings</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626', marginTop: '0.25rem' }}>{findingsSummary.criticalFindings}</div>
            </div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Open / Pending</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D97706', marginTop: '0.25rem' }}>{findingsSummary.openFindings}</div>
            </div>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Resolved</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>{findingsSummary.resolvedFindings}</div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
            <AlertTriangle style={{ width: '32px', height: '32px', color: '#CBD5E1', margin: '0 auto 0.5rem' }} />
            <p style={{ color: '#64748B', fontSize: '0.8375rem', fontWeight: 600, margin: 0 }}>No findings available for current audit.</p>
          </div>
        )}
      </div>

      {/* AUDIT HISTORY */}
      <div className="details-card" style={{ padding: 0, overflow: 'hidden', animation: 'fadeIn 0.3s ease 0.25s both' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            Audit History
          </h2>
        </div>

        {auditHistory && auditHistory.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Audit ID</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Period</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Type</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Auditor</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Progress</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Score</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.map((audit: any) => {
                  const st = getStatusBadgeStyle(audit.status);
                  const sc = getScoreBadgeStyle(audit.score);
                  const pct = audit.completionPercentage !== undefined && audit.completionPercentage !== null
                    ? Number(audit.completionPercentage)
                    : 0;

                  return (
                    <tr key={audit.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0B1F3A' }}>
                        {audit.auditIdString}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 600 }}>
                        {audit.auditPeriod}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#64748B' }}>
                        {audit.establishmentType || 'Standard Audit'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#475569' }}>
                        {audit.auditorName || audit.auditor || 'Auditor'}
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
            <Clock style={{ width: '36px', height: '36px', color: '#CBD5E1', margin: '0 auto 0.5rem' }} />
            <p style={{ color: '#64748B', fontSize: '0.8375rem', fontWeight: 600, margin: 0 }}>No audit history available.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
