import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, Filter, Eye, RefreshCw,
  AlertCircle, Calendar, User, FileText, CheckCircle2, TrendingUp, Shield, Presentation, FileBarChart
} from 'lucide-react';
import { getCustomerAudits } from '../services/api';

export const CustomerAudits: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audits, setAudits] = useState<any[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL');

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

  const fetchAudits = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerAudits();
      if (res.success && res.data) {
        setAudits(res.data);
      } else {
        setError(res.error || 'Failed to fetch audits data.');
      }
    } catch (err: any) {
      console.error('Error fetching customer audits:', err);
      setError('Network error: Unable to load audits.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
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

  // Derive Filter Dropdown Lists
  const uniqueVendors = Array.from(new Set(audits.map(a => a.vendorName || a.organisation || 'Vendor'))).filter(Boolean);
  const uniquePeriods = Array.from(new Set(audits.map(a => a.auditPeriod))).filter(Boolean);

  // Stats Counters
  const totalCount = audits.length;
  const scheduledCount = audits.filter(a => (a.status || '').toLowerCase() === 'scheduled').length;
  const inProgressCount = audits.filter(a => (a.status || '').toLowerCase() === 'in progress').length;
  const pendingCount = audits.filter(a => ['pending sign-off', 'under review'].includes((a.status || '').toLowerCase())).length;
  const closedCount = audits.filter(a => ['closed', 'completed', 'approved'].includes((a.status || '').toLowerCase())).length;

  const filteredAudits = audits.filter(audit => {
    const q = searchQuery.toLowerCase().trim();
    const auditIdStr = (audit.auditIdString || audit.id || '').toLowerCase();
    const vendorName = (audit.vendorName || audit.organisation || '').toLowerCase();
    const period = (audit.auditPeriod || '').toLowerCase();
    const auditorName = (audit.auditorName || audit.auditor || '').toLowerCase();

    const matchesSearch = !q || auditIdStr.includes(q) || vendorName.includes(q) || period.includes(q) || auditorName.includes(q);
    if (!matchesSearch) return false;

    // Status Filter
    const st = (audit.status || '').toLowerCase();
    if (statusFilter === 'SCHEDULED' && st !== 'scheduled') return false;
    if (statusFilter === 'IN_PROGRESS' && st !== 'in progress') return false;
    if (statusFilter === 'PENDING' && !['pending sign-off', 'under review'].includes(st)) return false;
    if (statusFilter === 'CLOSED' && !['closed', 'completed', 'approved'].includes(st)) return false;

    // Vendor Filter
    if (vendorFilter !== 'ALL' && (audit.vendorName || audit.organisation) !== vendorFilter) return false;

    // Period Filter
    if (periodFilter !== 'ALL' && audit.auditPeriod !== periodFilter) return false;

    return true;
  });

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .audit-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          overflow: hidden;
        }
        .stat-badge-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
          Audits
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          Monitor audits across your assigned vendors.
        </p>
      </div>

      {/* Stats Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease 0.05s both' }}>
        <div className="stat-badge-card">
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileCheck style={{ width: '20px', height: '20px', color: '#1565C0' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Audits</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0B1F3A', lineHeight: 1.1, marginTop: '2px' }}>{totalCount}</div>
          </div>
        </div>

        <div className="stat-badge-card">
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock style={{ width: '20px', height: '20px', color: '#B45309' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Scheduled</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309', lineHeight: 1.1, marginTop: '2px' }}>{scheduledCount}</div>
          </div>
        </div>

        <div className="stat-badge-card">
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp style={{ width: '20px', height: '20px', color: '#1E40AF' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E40AF', lineHeight: 1.1, marginTop: '2px' }}>{inProgressCount}</div>
          </div>
        </div>

        <div className="stat-badge-card">
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText style={{ width: '20px', height: '20px', color: '#4338CA' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Pending Review</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4338CA', lineHeight: 1.1, marginTop: '2px' }}>{pendingCount}</div>
          </div>
        </div>

        <div className="stat-badge-card">
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield style={{ width: '20px', height: '20px', color: '#047857' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Closed / Approved</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857', lineHeight: 1.1, marginTop: '2px' }}>{closedCount}</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="audit-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease 0.1s both' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '220px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search audit ID, vendor, auditor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '8px',
                border: '1px solid #CBD5E1', fontSize: '0.8375rem', outline: 'none', background: 'white'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1',
              fontSize: '0.8125rem', fontWeight: 600, color: '#0B1F3A', background: 'white', outline: 'none'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING">Pending Sign-off</option>
            <option value="CLOSED">Closed / Approved</option>
          </select>

          {/* Vendor Filter */}
          {uniqueVendors.length > 0 && (
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                fontSize: '0.8125rem', fontWeight: 600, color: '#0B1F3A', background: 'white', outline: 'none'
              }}
            >
              <option value="ALL">All Vendors</option>
              {uniqueVendors.map((v, i) => (
                <option key={i} value={v}>{v}</option>
              ))}
            </select>
          )}

          {/* Audit Period Filter */}
          {uniquePeriods.length > 0 && (
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                fontSize: '0.8125rem', fontWeight: 600, color: '#0B1F3A', background: 'white', outline: 'none'
              }}
            >
              <option value="ALL">All Periods</option>
              {uniquePeriods.map((p, i) => (
                <option key={i} value={p}>{p}</option>
              ))}
            </select>
          )}

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'ALL' || vendorFilter !== 'ALL' || periodFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setVendorFilter('ALL'); setPeriodFilter('ALL'); }}
              style={{
                padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0',
                background: '#F8FAFC', color: '#64748B', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <div className="audit-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading audits...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div className="audit-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Unable to load audits</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{error}</p>
          <button
            onClick={fetchAudits}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626',
              color: 'white', fontWeight: 700, fontSize: '0.8125rem', border: 'none', cursor: 'pointer'
            }}
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} />
            Retry
          </button>
        </div>
      ) : (
        <div className="audit-card" style={{ animation: 'fadeIn 0.3s ease 0.15s both' }}>
          {filteredAudits.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Audit ID</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Vendor</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Period</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Establishment</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Auditor</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Progress</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Score</th>
                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.map((audit) => {
                    const st = getStatusBadgeStyle(audit.status);
                    const sc = getScoreBadgeStyle(audit.score);
                    const pct = audit.completionPercentage !== undefined && audit.completionPercentage !== null
                      ? Number(audit.completionPercentage)
                      : 0;

                    return (
                      <tr key={audit.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                        {/* Audit ID */}
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0B1F3A' }}>
                          {audit.auditIdString || audit.id}
                        </td>

                        {/* Vendor Name */}
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0B1F3A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building2 style={{ width: '15px', height: '15px', color: '#1565C0', flexShrink: 0 }} />
                            <span>{audit.vendorName || audit.organisation || 'Vendor'}</span>
                          </div>
                        </td>

                        {/* Audit Period */}
                        <td style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 600 }}>
                          {audit.auditPeriod}
                        </td>

                        {/* Establishment */}
                        <td style={{ padding: '1rem 1.25rem', color: '#64748B' }}>
                          {audit.establishmentType || 'Standard Audit'}
                        </td>

                        {/* Auditor */}
                        <td style={{ padding: '1rem 1.25rem', color: '#475569' }}>
                          {audit.auditorName || audit.auditor || 'Auditor'}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.625rem',
                            borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                            background: st.bg, color: st.color, border: `1px solid ${st.border}`
                          }}>
                            {st.label}
                          </span>
                        </td>

                        {/* Progress Bar */}
                        <td style={{ padding: '1rem 1.25rem', width: '120px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flexGrow: 1, height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                            </div>
                            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', minWidth: '28px' }}>{pct}%</span>
                          </div>
                        </td>

                        {/* Compliance Score */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.625rem',
                            borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800,
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`
                          }}>
                            {sc.label}
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/customer/audits/${audit.id}`)}
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
            </div>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <FileCheck style={{ width: '44px', height: '44px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>
                {searchQuery || statusFilter !== 'ALL' || vendorFilter !== 'ALL' || periodFilter !== 'ALL' ? 'No matching audits found' : 'No audits available.'}
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>
                {searchQuery || statusFilter !== 'ALL' ? 'Try adjusting your search query or filter selection.' : 'Audit records will appear here once scheduled or initiated.'}
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
