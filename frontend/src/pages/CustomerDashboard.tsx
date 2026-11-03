import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, ShieldCheck, Eye, X, CheckCircle2,
  AlertTriangle, ArrowRight, User, Calendar, MapPin, ChevronRight, FileText, Presentation, FileBarChart,
  Activity, ArrowUpRight, TrendingUp, Sparkles, Shield
} from 'lucide-react';
import { getCustomerDashboardStats, getCustomerAuditById } from '../services/api';
import { formatDate, formatDateTime } from '../utils/dateUtils';

export const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
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
          border-radius: 16px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04);
          transition: all 0.2s ease;
        }
        .stat-card-interactive {
          background: #FFFFFF;
          border-radius: 12px;
          border: 1.5px solid #E2E8F0;
          padding: 0.85rem 1rem 0.75rem;
          box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.03);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 96px;
          user-select: none;
        }
        .stat-card-interactive:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px -4px rgba(15, 23, 42, 0.08), 0 6px 12px -2px rgba(15, 23, 42, 0.04);
        }
        .stat-card-interactive.card-vendors:hover {
          border-color: #93C5FD;
          background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
        }
        .stat-card-interactive.card-active:hover {
          border-color: #7DD3FC;
          background: linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%);
        }
        .stat-card-interactive.card-completed:hover {
          border-color: #86EFAC;
          background: linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%);
        }
        .stat-card-interactive.card-pending:hover {
          border-color: #FDE68A;
          background: linear-gradient(180deg, #FFFFFF 0%, #FFFDF5 100%);
        }
        .stat-label {
          font-size: 0.725rem;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .stat-icon-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .stat-card-interactive:hover .stat-icon-badge {
          transform: scale(1.08);
        }
        .stat-card-footer {
          margin-top: 0.55rem;
          padding-top: 0.45rem;
          border-top: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .stat-arrow-icon {
          transition: transform 0.2s ease;
        }
        .stat-card-interactive:hover .stat-arrow-icon {
          transform: translateX(4px);
        }
        .dashboard-table-row {
          transition: background-color 0.15s ease;
        }
        .dashboard-table-row:hover {
          background-color: #F8FAFC;
        }
      `}</style>

      {/* Page Sub-Header */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              width: '100%', padding: '0.55rem 1rem 0.55rem 2.25rem', borderRadius: '10px',
              border: '1.5px solid #CBD5E1', fontSize: '0.8375rem', outline: 'none', background: 'white',
              boxSizing: 'border-box', transition: 'border-color 0.2s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            onFocus={e => e.target.style.borderColor = '#1565C0'}
            onBlur={e => e.target.style.borderColor = '#CBD5E1'}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Top Stats Grid - Interactive Clickable Cards with Redirection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem', animation: 'fadeIn 0.4s ease' }}>
        
        {/* BLOCK 1: Total Vendors -> /customer/vendors */}
        <div 
          className="stat-card-interactive card-vendors"
          onClick={() => navigate('/customer/vendors')}
          title="Click to view and manage all assigned vendors"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-label">TOTAL VENDORS</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1, marginTop: '0.2rem', letterSpacing: '-0.02em' }}>
                {stats.totalVendors || 0}
              </div>
            </div>
            <div className="stat-icon-badge" style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #DBEAFE' }}>
              <Building2 style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
          <div className="stat-card-footer">
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#2563EB' }}>Manage vendors</span>
            <ArrowRight className="stat-arrow-icon" style={{ width: '14px', height: '14px', color: '#2563EB' }} />
          </div>
        </div>

        {/* BLOCK 2: Active Audits -> /customer/audits?status=active */}
        <div 
          className="stat-card-interactive card-active"
          onClick={() => navigate('/customer/audits?status=active')}
          title="Click to view ongoing and scheduled audits"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-label">ACTIVE AUDITS</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284C7', lineHeight: 1.1, marginTop: '0.2rem', letterSpacing: '-0.02em' }}>
                {stats.activeAudits || 0}
              </div>
            </div>
            <div className="stat-icon-badge" style={{ backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD' }}>
              <Clock style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
          <div className="stat-card-footer">
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#0284C7' }}>View active audits</span>
            <ArrowRight className="stat-arrow-icon" style={{ width: '14px', height: '14px', color: '#0284C7' }} />
          </div>
        </div>

        {/* BLOCK 3: Completed Audits -> /customer/audits?status=completed */}
        <div 
          className="stat-card-interactive card-completed"
          onClick={() => navigate('/customer/audits?status=completed')}
          title="Click to view closed and completed audit records"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-label">COMPLETED AUDITS</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', lineHeight: 1.1, marginTop: '0.2rem', letterSpacing: '-0.02em' }}>
                {stats.completedAudits || 0}
              </div>
            </div>
            <div className="stat-icon-badge" style={{ backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
              <CheckCircle2 style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
          <div className="stat-card-footer">
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#059669' }}>View closed audits</span>
            <ArrowRight className="stat-arrow-icon" style={{ width: '14px', height: '14px', color: '#059669' }} />
          </div>
        </div>

        {/* BLOCK 4: Pending Actions -> /customer/audits?status=pending */}
        <div 
          className="stat-card-interactive card-pending"
          onClick={() => navigate('/customer/audits?status=pending')}
          title="Click to view audits requiring review or sign-off"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-label">PENDING ACTIONS</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.pendingActions > 0 ? '#D97706' : '#64748B', lineHeight: 1.1, marginTop: '0.2rem', letterSpacing: '-0.02em' }}>
                {stats.pendingActions || 0}
              </div>
            </div>
            <div className="stat-icon-badge" style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
              <AlertTriangle style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
          <div className="stat-card-footer">
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: stats.pendingActions > 0 ? '#D97706' : '#64748B' }}>
              {stats.pendingActions > 0 ? 'Review pending sign-offs' : 'No pending actions'}
            </span>
            <ArrowRight className="stat-arrow-icon" style={{ width: '14px', height: '14px', color: stats.pendingActions > 0 ? '#D97706' : '#64748B' }} />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left Column — Vendor Audit Status Table */}
        <div className="customer-card" style={{ overflow: 'hidden', animation: 'fadeIn 0.4s ease 0.1s both' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontWeight: 800, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Vendor Audit Status</h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.775rem', color: '#64748B' }}>
                Current progress and statutory compliance scores for your vendors.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E293B', background: '#F1F5F9', padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #E2E8F0' }}>
                {filteredVendorStatuses.length} Audits
              </span>
              <button
                type="button"
                onClick={() => navigate('/customer/audits')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  color: '#1565C0',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#DBEAFE')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
              >
                <span>View All Audits</span>
                <ArrowRight style={{ width: '13px', height: '13px' }} />
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {filteredVendorStatuses.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>Vendor</th>
                    <th style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>Audit ID</th>
                    <th style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>Period</th>
                    <th style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>Progress</th>
                    <th style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>Score</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Action</th>
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
                      <tr key={audit.id} className="dashboard-table-row" style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#0B1F3A', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Building2 style={{ width: '13px', height: '13px', color: '#1565C0', flexShrink: 0 }} />
                            <span>{audit.vendorName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '5px',
                            color: '#0F172A',
                            display: 'inline-block'
                          }}>
                            {audit.auditIdString}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', color: '#475569', whiteSpace: 'nowrap', fontWeight: 500, fontSize: '0.8rem' }}>
                          {audit.auditPeriod}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0.18rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: st.color, flexShrink: 0 }}></span>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', width: '110px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <div style={{ flexGrow: 1, height: '5px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', minWidth: '28px' }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.18rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            background: sc.bg,
                            color: sc.color,
                            border: `1px solid ${sc.border}`
                          }}>
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleOpenAuditDetails(audit.id)}
                            disabled={loadingAuditDetails}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              background: '#EFF6FF',
                              color: '#1565C0',
                              border: '1px solid #BFDBFE',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = '#1565C0';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = '#EFF6FF';
                              e.currentTarget.style.color = '#1565C0';
                            }}
                          >
                            <Eye style={{ width: '12px', height: '12px' }} />
                            <span>View</span>
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
                <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>You currently have no active vendor audits matching your search.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Overall Compliance & Recent Milestones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Executive Overall Compliance Widget */}
          <div className="customer-card" style={{ padding: '1.5rem', animation: 'fadeIn 0.4s ease 0.2s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck style={{ width: '18px', height: '18px', color: '#1565C0' }} />
                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  Overall Compliance
                </h3>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid #A7F3D0' }}>
                Active
              </span>
            </div>

            <div style={{
              background: stats.overallCompliance != null && stats.overallCompliance >= 80 ? '#F0FDF4' : (stats.overallCompliance != null && stats.overallCompliance >= 50 ? '#FFFBEB' : '#F8FAFC'),
              border: `1.5px solid ${stats.overallCompliance != null && stats.overallCompliance >= 80 ? '#BBF7D0' : (stats.overallCompliance != null && stats.overallCompliance >= 50 ? '#FDE68A' : '#E2E8F0')}`,
              borderRadius: '16px',
              padding: '1.5rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '2.75rem',
                fontWeight: 900,
                color: stats.overallCompliance != null && stats.overallCompliance >= 80 ? '#047857' : (stats.overallCompliance != null && stats.overallCompliance >= 50 ? '#B45309' : '#0F172A'),
                lineHeight: 1,
                letterSpacing: '-0.03em',
                marginBottom: '0.5rem'
              }}>
                {stats.overallCompliance != null ? `${stats.overallCompliance}%` : '--%'}
              </div>

              {stats.overallCompliance != null && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.725rem',
                  fontWeight: 800,
                  marginBottom: '0.75rem',
                  background: stats.overallCompliance >= 80 ? '#DCFCE7' : (stats.overallCompliance >= 50 ? '#FEF3C7' : '#FEE2E2'),
                  color: stats.overallCompliance >= 80 ? '#15803D' : (stats.overallCompliance >= 50 ? '#B45309' : '#B91C1C')
                }}>
                  {stats.overallCompliance >= 80 ? '✓ High Compliance' : (stats.overallCompliance >= 50 ? '▲ Moderate Compliance' : '⚠ Action Needed')}
                </div>
              )}

              {/* Progress meter bar */}
              <div style={{ width: '100%', maxWidth: '200px', height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden', margin: '0.25rem 0 0.75rem' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, stats.overallCompliance || 0)}%`,
                  background: stats.overallCompliance >= 80 ? '#10B981' : (stats.overallCompliance >= 50 ? '#F59E0B' : '#64748B'),
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>

              <p style={{ color: '#64748B', fontSize: '0.7875rem', margin: 0, lineHeight: 1.4 }}>
                {stats.completedCount > 0
                  ? `Calculated based on ${stats.completedCount} completed audit record(s).`
                  : 'Score will calculate automatically as vendor audits complete.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/customer/scores')}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.55rem 0.75rem',
                borderRadius: '9px',
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: '0.7875rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#1565C0';
                e.currentTarget.style.color = '#1565C0';
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.color = '#0F172A';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              <span>Explore Score Breakdown</span>
              <ChevronRight style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          {/* Recent Milestones */}
          <div className="customer-card" style={{ padding: '1.5rem', animation: 'fadeIn 0.4s ease 0.3s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock style={{ width: '17px', height: '17px', color: '#1565C0' }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  Recent Milestones
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/customer/timeline')}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#1565C0',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <span>Timeline</span>
                <ChevronRight style={{ width: '13px', height: '13px' }} />
              </button>
            </div>

            {stats.recentMilestones && stats.recentMilestones.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                {stats.recentMilestones.map((m: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: i === 0 ? '#1565C0' : '#94A3B8',
                      boxShadow: i === 0 ? '0 0 0 3px #DBEAFE' : 'none',
                      marginTop: '4px',
                      flexShrink: 0
                    }} />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A', lineHeight: 1.3 }}>{m.event}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.vendorName} &bull; {m.auditIdString}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>
                        {m.timestamp ? formatDateTime(m.timestamp) : 'Recent'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.8375rem' }}>
                No recent timeline activity
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
                        <span style={{ color: '#64748B' }}>{t.timestamp ? formatDate(t.timestamp) : ''}</span>
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
