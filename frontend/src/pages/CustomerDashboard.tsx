import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, ShieldCheck, Eye, X, CheckCircle2,
  AlertTriangle, ArrowRight, User, Calendar, MapPin, ChevronRight, FileText, Presentation, FileBarChart
} from 'lucide-react';
import { getCustomerDashboardStats, getCustomerAuditById } from '../services/api';

export const CustomerDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<any>({
    totalVendors: 0,
    activeAudits: 0,
    completedAudits: 0,
    pendingActions: 0,
    overallCompliance: null,
    completedCount: 0,
    vendorStatuses: [],
    recentMilestones: []
  });
  const [selectedAuditModal, setSelectedAuditModal] = useState<any | null>(null);
  const [loadingAuditDetails, setLoadingAuditDetails] = useState(false);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, active: true, path: '/customer' },
    { name: 'My Vendors', icon: Building2, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, path: '/customer/overall-report' }
  ];

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const res = await getCustomerDashboardStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load customer dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenAuditDetails = async (auditId: string) => {
    try {
      setLoadingAuditDetails(true);
      const res = await getCustomerAuditById(auditId);
      if (res.success && res.data) {
        setSelectedAuditModal(res.data);
      } else {
        alert('Could not load audit details.');
      }
    } catch (err) {
      console.error('Error fetching audit details:', err);
      alert('Failed to load audit details.');
    } finally {
      setLoadingAuditDetails(false);
    }
  };

  const filteredVendorStatuses = (stats.vendorStatuses || []).filter((item: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.vendorName || '').toLowerCase().includes(q) ||
      (item.auditIdString || '').toLowerCase().includes(q) ||
      (item.auditPeriod || '').toLowerCase().includes(q) ||
      (item.status || '').toLowerCase().includes(q)
    );
  });

  const getStatusBadgeStyle = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
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
      <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems} hideBackButton={true}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
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
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems} hideBackButton={true}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .customer-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
        }
        .stat-card-custom {
          background: white;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        }
      `}</style>

      {/* Page Sub-Header */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
            Customer Portal Dashboard
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            Real-time compliance monitoring dashboard for assigned vendors and statutory audits.
          </p>
        </div>

        {/* Local Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search audits, vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '10px',
              border: '1px solid #CBD5E1', fontSize: '0.8375rem', outline: 'none', background: 'white'
            }}
          />
        </div>
      </div>

      {/* Top Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem', animation: 'fadeIn 0.4s ease' }}>
        <div className="stat-card-custom">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
            Total Vendors
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0B1F3A' }}>
            {stats.totalVendors || 0}
          </div>
        </div>

        <div className="stat-card-custom">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
            Active Audits
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1565C0' }}>
            {stats.activeAudits || 0}
          </div>
        </div>

        <div className="stat-card-custom">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
            Completed Audits
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>
            {stats.completedAudits || 0}
          </div>
        </div>

        <div className="stat-card-custom">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
            Pending Actions
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stats.pendingActions > 0 ? '#D97706' : '#64748B' }}>
            {stats.pendingActions || 0}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column — Vendor Audit Status Table */}
        <div className="customer-card" style={{ overflow: 'hidden', animation: 'fadeIn 0.4s ease 0.1s both' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Vendor Audit Status</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '0.2rem 0.625rem', borderRadius: '999px' }}>
              {filteredVendorStatuses.length} Audits
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {filteredVendorStatuses.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Vendor</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Audit ID</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Period</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Progress</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Score</th>
                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendorStatuses.map((audit: any) => {
                    const st = getStatusBadgeStyle(audit.status);
                    const sc = getScoreBadgeStyle(audit.score);
                    const pct = audit.completionPercentage !== undefined && audit.completionPercentage !== null
                      ? Number(audit.completionPercentage)
                      : (audit.auditCompletion !== undefined && audit.auditCompletion !== null ? Number(audit.auditCompletion) : 0);

                    return (
                      <tr key={audit.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0B1F3A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building2 style={{ width: '16px', height: '16px', color: '#1565C0', flexShrink: 0 }} />
                            <span>{audit.vendorName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#64748B', fontWeight: 600 }}>
                          {audit.auditIdString}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#475569' }}>
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
                              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px', transition: 'width 0.3s ease' }} />
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
                            onClick={() => handleOpenAuditDetails(audit.id)}
                            disabled={loadingAuditDetails}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                              padding: '0.375rem 0.75rem', borderRadius: '8px',
                              background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE',
                              fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Eye style={{ width: '14px', height: '14px' }} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <FileCheck style={{ width: '44px', height: '44px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>No audits available</h3>
                <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>You currently have no active vendor audits to monitor.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Overall Compliance & Recent Milestones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Overall Compliance */}
          <div className="customer-card" style={{ padding: '1.5rem', textAlign: 'center', animation: 'fadeIn 0.4s ease 0.2s both' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem' }}>
              Overall Compliance
            </h3>
            <div style={{
              background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '14px',
              padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: stats.overallCompliance != null ? '#047857' : '#94A3B8', marginBottom: '0.25rem' }}>
                {stats.overallCompliance != null ? `${stats.overallCompliance}%` : '--%'}
              </div>
              <p style={{ color: '#64748B', fontSize: '0.8125rem', margin: 0, maxWidth: '220px' }}>
                {stats.completedCount > 0
                  ? `Calculated based on ${stats.completedCount} completed audit(s)`
                  : 'Data will appear once audits are completed'}
              </p>
            </div>
          </div>

          {/* Recent Milestones */}
          <div className="customer-card" style={{ padding: '1.5rem', animation: 'fadeIn 0.4s ease 0.3s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B1F3A', margin: 0 }}>Recent Milestones</h3>
              <Clock style={{ width: '16px', height: '16px', color: '#64748B' }} />
            </div>

            {stats.recentMilestones && stats.recentMilestones.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {stats.recentMilestones.map((m: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1565C0', marginTop: '6px', flexShrink: 0 }} />
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A' }}>{m.event}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{m.vendorName} ({m.auditIdString})</div>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>
                        {m.timestamp ? new Date(m.timestamp).toLocaleString() : 'Recent'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.8375rem' }}>
                No timeline events available
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Read-Only Audit Details Modal */}
      {selectedAuditModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(11, 31, 58, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }}>
          <div style={{
            background: 'white', borderRadius: '20px', width: '100%', maxWidth: '780px',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid #E2E8F0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation: 'fadeIn 0.2s ease'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFCFF' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B1F3A', margin: 0 }}>
                    {selectedAuditModal.auditIdString || selectedAuditModal.id}
                  </h3>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, background: '#EFF6FF', color: '#1565C0', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid #BFDBFE' }}>
                    Customer View (Read-Only)
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                  {selectedAuditModal.vendorName || selectedAuditModal.organisation} &bull; Period: {selectedAuditModal.auditPeriod || 'Q3 2026'}
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditModal(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X style={{ width: '18px', height: '18px', color: '#64748B' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.75rem' }}>
              
              {/* Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#F8FAFC', padding: '0.875rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0B1F3A', marginTop: '2px' }}>{selectedAuditModal.status || 'Scheduled'}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.875rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Audit Progress</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1565C0', marginTop: '2px' }}>{selectedAuditModal.completionPercentage || 0}% Complete</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.875rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Compliance Score</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: selectedAuditModal.score != null ? '#047857' : '#64748B', marginTop: '2px' }}>
                    {selectedAuditModal.score != null ? `${Math.round(selectedAuditModal.score)}%` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Auditor & Location Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'white', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '0.25rem' }}>Auditor</div>
                  <div style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '0.9rem' }}>{selectedAuditModal.auditorName || selectedAuditModal.auditor || 'Auditor'}</div>
                </div>
                <div style={{ background: 'white', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '0.25rem' }}>Site / Location</div>
                  <div style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '0.9rem' }}>{selectedAuditModal.site || selectedAuditModal.conductedAt || 'Default Site'}</div>
                </div>
              </div>

              {/* Non-Compliant Findings List */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.75rem' }}>Non-Compliant Findings</h4>
                {selectedAuditModal.nonCompliantItems && selectedAuditModal.nonCompliantItems.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {selectedAuditModal.nonCompliantItems.map((nc: any, idx: number) => (
                      <div key={idx} style={{ padding: '0.875rem', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '0.85rem' }}>{nc.title || nc.particulars}</div>
                        <div style={{ fontSize: '0.8rem', color: '#7F1D1D', marginTop: '2px' }}>{nc.remarks || 'Observation recorded during audit'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.8375rem', color: '#64748B' }}>
                    No non-compliant findings recorded for this audit.
                  </div>
                )}
              </div>

              {/* Audit Timeline */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.75rem' }}>Audit Timeline</h4>
                {selectedAuditModal.timeline && selectedAuditModal.timeline.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedAuditModal.timeline.map((t: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0.875rem', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #F1F5F9', fontSize: '0.8125rem' }}>
                        <span style={{ fontWeight: 700, color: '#0B1F3A' }}>{t.event}</span>
                        <span style={{ color: '#64748B' }}>{t.timestamp ? new Date(t.timestamp).toLocaleDateString() : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>No timeline events recorded.</div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #F1F5F9', background: '#FAFCFF', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedAuditModal(null)}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#1565C0', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
