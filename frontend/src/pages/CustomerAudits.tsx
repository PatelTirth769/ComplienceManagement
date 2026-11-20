import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, Filter, Eye, RefreshCw,
  AlertCircle, Calendar, User, FileText, CheckCircle2, TrendingUp, Shield, Presentation, FileBarChart
} from 'lucide-react';
import { getCustomerAudits, updateAuditorDocumentAccess, updateInterviewAuditAccess } from '../services/api';

export const CustomerAudits: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [updatingDocAccessId, setUpdatingDocAccessId] = useState<string | null>(null);
  const [updatingInterviewAuditId, setUpdatingInterviewAuditId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const p = searchParams.get('status')?.toUpperCase();
    if (p && ['ACTIVE', 'SCHEDULED', 'IN_PROGRESS', 'PENDING', 'CLOSED'].includes(p)) return p;
    if (p === 'COMPLETED') return 'CLOSED';
    return 'ALL';
  });
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [auditTypeFilter, setAuditTypeFilter] = useState<'Original' | 'Re-Audit'>('Original');

  useEffect(() => {
    const p = searchParams.get('status')?.toUpperCase();
    if (p && ['ACTIVE', 'SCHEDULED', 'IN_PROGRESS', 'PENDING', 'CLOSED'].includes(p)) {
      setStatusFilter(p);
    } else if (p === 'COMPLETED') {
      setStatusFilter('CLOSED');
    }
  }, [searchParams]);

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

  const handleToggleAuditorDocAccess = async (auditId: string, nextValue: boolean) => {
    try {
      setUpdatingDocAccessId(auditId);
      // Optimistic local update
      setAudits(prev => prev.map(a => (a.id === auditId || a.auditIdString === auditId) ? { ...a, allowAuditorToSeeDocuments: nextValue } : a));
      const res = await updateAuditorDocumentAccess(auditId, nextValue);
      if (!res.success) {
        // Rollback on failure
        setAudits(prev => prev.map(a => (a.id === auditId || a.auditIdString === auditId) ? { ...a, allowAuditorToSeeDocuments: !nextValue } : a));
        alert(res.error || 'Failed to update auditor document permission.');
      }
    } catch (err: any) {
      console.error('Failed to toggle auditor document access:', err);
      setAudits(prev => prev.map(a => (a.id === auditId || a.auditIdString === auditId) ? { ...a, allowAuditorToSeeDocuments: !nextValue } : a));
      const msg = err.response?.data?.error || err.message || 'Unable to update document access setting.';
      alert(msg);
    } finally {
      setUpdatingDocAccessId(null);
    }
  };

  const handleToggleInterviewAudit = async (auditId: string, nextValue: boolean) => {
    try {
      setUpdatingInterviewAuditId(auditId);
      // Optimistic local update
      setAudits(prev => prev.map(a => (a.id === auditId || a.auditIdString === auditId) ? { ...a, interviewAudit: nextValue } : a));
      const res = await updateInterviewAuditAccess(auditId, nextValue);
      if (!res.success) {
        // Rollback on failure
        setAudits(prev => prev.map(a => (a.id === auditId || a.auditIdString === auditId) ? { ...a, interviewAudit: !nextValue } : a));
        alert(res.error || 'Failed to update interview audit permission.');
      }
    } catch (err: any) {
      console.error('Failed to toggle interview audit:', err);
      setAudits(prev => prev.map(a => (a.id === auditId || a.auditIdString === auditId) ? { ...a, interviewAudit: !nextValue } : a));
      const msg = err.response?.data?.error || err.message || 'Unable to update interview audit setting.';
      alert(msg);
    } finally {
      setUpdatingInterviewAuditId(null);
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

  const auditTypeAudits = audits.filter(a => {
    const isRe = a.auditType === 'Re-Audit' || a.auditType === 'Re Audit';
    if (auditTypeFilter === 'Original') return !isRe;
    const st = (a.status || '').toLowerCase();
    return isRe && !(st === 'in progress' && (a.score === null || a.score === undefined));
  });

  // Derive Filter Dropdown Lists
  const uniqueVendors = Array.from(new Set(auditTypeAudits.map(a => a.vendorName || a.organisation || 'Vendor'))).filter(Boolean);
  const uniquePeriods = Array.from(new Set(auditTypeAudits.map(a => a.auditPeriod))).filter(Boolean);

  // Stats Counters
  const totalCount = auditTypeAudits.length;
  const activeCount = auditTypeAudits.filter(a => !['closed', 'completed', 'approved'].includes((a.status || '').toLowerCase())).length;
  const scheduledCount = auditTypeAudits.filter(a => (a.status || '').toLowerCase() === 'scheduled').length;
  const inProgressCount = auditTypeAudits.filter(a => (a.status || '').toLowerCase() === 'in progress').length;
  const pendingCount = auditTypeAudits.filter(a => ['pending sign-off', 'under review'].includes((a.status || '').toLowerCase())).length;
  const closedCount = auditTypeAudits.filter(a => ['closed', 'completed', 'approved'].includes((a.status || '').toLowerCase())).length;

  const filteredAudits = auditTypeAudits.filter(audit => {
    const q = searchQuery.toLowerCase().trim();
    const auditIdStr = (audit.auditIdString || audit.id || '').toLowerCase();
    const vendorName = (audit.vendorName || audit.organisation || '').toLowerCase();
    const period = (audit.auditPeriod || '').toLowerCase();
    const auditorName = (audit.auditorName || audit.auditor || '').toLowerCase();

    const matchesSearch = !q || auditIdStr.includes(q) || vendorName.includes(q) || period.includes(q) || auditorName.includes(q);
    if (!matchesSearch) return false;

    // Status Filter
    const st = (audit.status || '').toLowerCase();
    if (statusFilter === 'ACTIVE' && ['closed', 'completed', 'approved'].includes(st)) return false;
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

      {/* Production-Grade Filters Toolbar Card */}
      <div className="audit-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease 0.1s both' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Tier 1: Segmented Audit Type Switcher & Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            
            {/* Sleek Segmented Switch for Audit Type */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '4px', background: '#F1F5F9', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => setAuditTypeFilter('Original')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '7px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  border: 'none',
                  background: auditTypeFilter === 'Original' ? '#FFFFFF' : 'transparent',
                  color: auditTypeFilter === 'Original' ? '#0B1F3A' : '#64748B',
                  boxShadow: auditTypeFilter === 'Original' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Original Audits</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '1px 7px',
                  borderRadius: '999px',
                  background: auditTypeFilter === 'Original' ? '#EFF6FF' : '#E2E8F0',
                  color: auditTypeFilter === 'Original' ? '#1565C0' : '#64748B'
                }}>
                  {audits.filter(a => !(a.auditType === 'Re-Audit' || a.auditType === 'Re Audit')).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAuditTypeFilter('Re-Audit')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '7px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  border: 'none',
                  background: auditTypeFilter === 'Re-Audit' ? '#FFFFFF' : 'transparent',
                  color: auditTypeFilter === 'Re-Audit' ? '#7E22CE' : '#64748B',
                  boxShadow: auditTypeFilter === 'Re-Audit' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Re-Audits</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '1px 7px',
                  borderRadius: '999px',
                  background: auditTypeFilter === 'Re-Audit' ? '#F3E8FF' : '#E2E8F0',
                  color: auditTypeFilter === 'Re-Audit' ? '#7E22CE' : '#64748B'
                }}>
                  {audits.filter(a => {
                    const isRe = a.auditType === 'Re-Audit' || a.auditType === 'Re Audit';
                    const st = (a.status || '').toLowerCase();
                    return isRe && !(st === 'in progress' && (a.score === null || a.score === undefined));
                  }).length}
                </span>
              </button>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', flexGrow: 1, maxWidth: '440px', minWidth: '240px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search by audit ID, vendor, auditor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem 0.5rem 2.25rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.8375rem',
                  outline: 'none',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.background = '#FFFFFF';
                  e.target.style.borderColor = '#1565C0';
                  e.target.style.boxShadow = '0 0 0 3px rgba(21, 101, 192, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.background = '#F8FAFC';
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Tier 2: Secondary Dropdown Filters & Status Counts */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              {/* Status Filter Dropdown */}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <Filter style={{ position: 'absolute', left: '10px', width: '13px', height: '13px', color: '#64748B', pointerEvents: 'none' }} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    appearance: 'none',
                    padding: '0.45rem 2rem 0.45rem 2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#1E293B',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.1em 1.1em'
                  }}
                >
                  <option value="ALL">All Statuses ({auditTypeAudits.length})</option>
                  <option value="ACTIVE">Active Audits ({activeCount})</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending Sign-off</option>
                  <option value="CLOSED">Closed / Approved</option>
                </select>
              </div>

              {/* Vendor Filter Dropdown */}
              {uniqueVendors.length > 0 && (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <Building2 style={{ position: 'absolute', left: '10px', width: '13px', height: '13px', color: '#64748B', pointerEvents: 'none' }} />
                  <select
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                    style={{
                      appearance: 'none',
                      padding: '0.45rem 2rem 0.45rem 2rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#1E293B',
                      background: '#FFFFFF',
                      outline: 'none',
                      cursor: 'pointer',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.1em 1.1em'
                    }}
                  >
                    <option value="ALL">All Vendors ({uniqueVendors.length})</option>
                    {uniqueVendors.map((v, i) => (
                      <option key={i} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Period Filter Dropdown */}
              {uniquePeriods.length > 0 && (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <Calendar style={{ position: 'absolute', left: '10px', width: '13px', height: '13px', color: '#64748B', pointerEvents: 'none' }} />
                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    style={{
                      appearance: 'none',
                      padding: '0.45rem 2rem 0.45rem 2rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#1E293B',
                      background: '#FFFFFF',
                      outline: 'none',
                      cursor: 'pointer',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.1em 1.1em'
                    }}
                  >
                    <option value="ALL">All Periods ({uniquePeriods.length})</option>
                    {uniquePeriods.map((p, i) => (
                      <option key={i} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clear Filters Button */}
              {(searchQuery || statusFilter !== 'ALL' || vendorFilter !== 'ALL' || periodFilter !== 'ALL' || auditTypeFilter !== 'Original') && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setVendorFilter('ALL'); setPeriodFilter('ALL'); setAuditTypeFilter('Original'); }}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F1F5F9',
                    color: '#64748B',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B'; }}
                >
                  <span>Reset Filters</span>
                  <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>×</span>
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
              Showing <strong>{filteredAudits.length}</strong> of <strong>{auditTypeAudits.length}</strong> {auditTypeFilter === 'Original' ? 'original' : 're-audit'} records
            </div>
          </div>
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
        <div className="audit-card" style={{ animation: 'fadeIn 0.3s ease 0.15s both', overflow: 'hidden' }}>
          {filteredAudits.length > 0 ? (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                        <span>Audit Type</span>
                        <select
                          value={auditTypeFilter}
                          onChange={e => setAuditTypeFilter(e.target.value as 'Original' | 'Re-Audit')}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            cursor: 'pointer',
                            textTransform: 'none',
                            letterSpacing: 'normal',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            outline: 'none',
                            width: '100%'
                          }}
                          title="Quick toggle between Original and Re Audit"
                        >
                          <option value="Original">Original</option>
                          <option value="Re-Audit">Re Audit</option>
                        </select>
                      </div>
                    </th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>Audit ID</th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>Vendor</th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>Period</th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>Establishment</th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>Auditor</th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>Progress</th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>Score</th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }} title="Do you want Auditor to see the Document which assign by Vendor?">Auditor Doc Access</th>
                    <th style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }} title="Enable Interview Audit with Add Resources for the Auditor">Interview Audit</th>
                    <th style={{ padding: '0.875rem 1.125rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
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
                      <tr 
                        key={audit.id} 
                        style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                      >
                        {/* Audit Type Badge */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>
                          {audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? (
                            <span 
                              style={{ 
                                backgroundColor: '#F3E8FF', 
                                color: '#7E22CE', 
                                border: '1px solid #D8B4FE', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#9333EA' }}></span>
                              Re Audit
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                              <span 
                                style={{ 
                                  backgroundColor: '#EFF6FF', 
                                  color: '#1D4ED8', 
                                  border: '1px solid #BFDBFE', 
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '999px',
                                  fontSize: '0.75rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }}></span>
                                Original
                              </span>
                              {audit.isReadOnly && (
                                <span 
                                  style={{ 
                                    backgroundColor: '#FEF3C7', 
                                    color: '#92400E', 
                                    border: '1px solid #FDE68A', 
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '999px',
                                    fontSize: '0.7rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  🔒 Read-Only
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Audit ID */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.8125rem',
                            fontWeight: 800,
                            color: '#0F172A',
                            background: '#F1F5F9',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            display: 'inline-block',
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap'
                          }}>
                            {audit.auditIdString || audit.id}
                          </span>
                        </td>

                        {/* Vendor Name */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap', fontWeight: 700, color: '#0B1F3A' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                            <Building2 style={{ width: '15px', height: '15px', color: '#1565C0', flexShrink: 0 }} />
                            <span>{audit.vendorName || audit.organisation || 'Vendor'}</span>
                          </div>
                        </td>

                        {/* Audit Period */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap', color: '#334155', fontWeight: 600 }}>
                          {audit.auditPeriod}
                        </td>

                        {/* Establishment */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap', color: '#64748B' }}>
                          {audit.establishmentType || 'Standard Audit'}
                        </td>

                        {/* Auditor */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap', color: '#475569', fontWeight: 500 }}>
                          {audit.auditorName || audit.auditor || 'Auditor'}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`,
                            whiteSpace: 'nowrap',
                            lineHeight: 1.2
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: st.color }} />
                            {st.label}
                          </span>
                        </td>

                        {/* Progress Bar */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap', minWidth: '120px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                            <div style={{ flexGrow: 1, minWidth: '60px', height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                            </div>
                            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', minWidth: '32px' }}>{pct}%</span>
                          </div>
                        </td>

                        {/* Compliance Score */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '46px',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: sc.bg,
                            color: sc.color,
                            border: `1px solid ${sc.border}`,
                            whiteSpace: 'nowrap'
                          }}>
                            {sc.label}
                          </span>
                        </td>

                        {/* Auditor Document Access Toggle */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={audit.allowAuditorToSeeDocuments === true}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAuditorDocAccess(audit.id, !(audit.allowAuditorToSeeDocuments === true));
                              }}
                              disabled={updatingDocAccessId === audit.id}
                              title="Toggle whether Auditor can view vendor documents during calculation"
                              style={{
                                width: '36px',
                                height: '20px',
                                borderRadius: '999px',
                                background: audit.allowAuditorToSeeDocuments === true ? '#059669' : '#CBD5E1',
                                border: `1.5px solid ${audit.allowAuditorToSeeDocuments === true ? '#047857' : '#94A3B8'}`,
                                position: 'relative',
                                cursor: updatingDocAccessId === audit.id ? 'wait' : 'pointer',
                                transition: 'all 0.2s ease',
                                padding: 0,
                                flexShrink: 0
                              }}
                            >
                              <span
                                style={{
                                  display: 'block',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: '#FFFFFF',
                                  position: 'absolute',
                                  top: '1.5px',
                                  left: audit.allowAuditorToSeeDocuments === true ? '17px' : '2px',
                                  transition: 'left 0.2s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                                }}
                              />
                            </button>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: audit.allowAuditorToSeeDocuments === true ? '#047857' : '#64748B',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {audit.allowAuditorToSeeDocuments === true ? 'Auditor can view' : 'Restricted'}
                            </span>
                          </div>
                        </td>

                        {/* Interview Audit Toggle */}
                        <td style={{ padding: '0.875rem 1.125rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={audit.interviewAudit === true}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleInterviewAudit(audit.id, !(audit.interviewAudit === true));
                              }}
                              disabled={updatingInterviewAuditId === audit.id}
                              title="Toggle whether Interview Audit (Add Resources) is enabled for the Auditor"
                              style={{
                                width: '36px',
                                height: '20px',
                                borderRadius: '999px',
                                background: audit.interviewAudit === true ? '#2563EB' : '#CBD5E1',
                                border: `1.5px solid ${audit.interviewAudit === true ? '#1D4ED8' : '#94A3B8'}`,
                                position: 'relative',
                                cursor: updatingInterviewAuditId === audit.id ? 'wait' : 'pointer',
                                transition: 'all 0.2s ease',
                                padding: 0,
                                flexShrink: 0
                              }}
                            >
                              <span
                                style={{
                                  display: 'block',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: '#FFFFFF',
                                  position: 'absolute',
                                  top: '1.5px',
                                  left: audit.interviewAudit === true ? '17px' : '2px',
                                  transition: 'left 0.2s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                                }}
                              />
                            </button>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: audit.interviewAudit === true ? '#1D4ED8' : '#64748B',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {audit.interviewAudit === true ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td style={{ padding: '0.875rem 1.125rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => navigate(`/customer/audits/${audit.id}`)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '7px',
                              background: '#EFF6FF',
                              color: '#1565C0',
                              border: '1px solid #BFDBFE',
                              fontSize: '0.775rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#1565C0';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = '#EFF6FF';
                              e.currentTarget.style.color = '#1565C0';
                            }}
                          >
                            <Eye style={{ width: '13px', height: '13px' }} />
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
                {searchQuery || statusFilter !== 'ALL' || vendorFilter !== 'ALL' || periodFilter !== 'ALL' ? 'No matching audits found' : `No ${auditTypeFilter === 'Original' ? 'original audits' : 're-audits'} available.`}
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>
                {searchQuery || statusFilter !== 'ALL' ? 'Try adjusting your search query or filter selection.' : `Audit records for ${auditTypeFilter} will appear here once scheduled or initiated.`}
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
