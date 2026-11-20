import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare,
  ArrowRight, Calendar, Building2, Shield, Search, Filter, TrendingUp, FileSpreadsheet
} from 'lucide-react';
import { getVendorAudits, API_BASE_URL } from '../services/api';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';

export const VendorAudits: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = (searchParams.get('status') || searchParams.get('filter') || 'all').toLowerCase();
  const statusFilter = ['all', 'active', 'completed'].includes(rawStatus) ? rawStatus : 'all';

  const [isLoading, setIsLoading] = useState(true);
  const [audits, setAudits] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState<'Original' | 'Re-Audit'>('Original');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor' },
    { name: 'My Profile', icon: User, path: '/vendor/profile' },
    { name: 'My Audits', icon: FileCheck, active: true, path: '/vendor/audits' },
    { name: 'Documents', icon: FolderOpen, path: '/vendor/documents' },
    { name: 'Findings & Actions', icon: AlertTriangle, path: '/vendor/findings' },
    { name: 'Audit Timeline', icon: Clock, path: '/vendor/timeline' },
    { name: 'Reports', icon: BarChart3, path: '/vendor/reports' },
    { name: 'Notifications', icon: Bell, path: '/vendor/notifications' },
    { name: 'Contact Auditor', icon: MessageSquare, path: '/vendor/contact' }
  ];

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const response = await getVendorAudits();
        if (response.success && response.data) {
          const sorted = response.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAudits(sorted);
        }
      } catch (error) {
        console.error('Failed to fetch audits', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAudits();
  }, []);

  const handleDownloadExcel = async (audit: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/vendor/audits/${audit.id}/download-excel`, {
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
      alert('Failed to download Excel file. Please try again.');
    }
  };

  const getStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'closed' || s === 'approved')
      return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', dot: '#10B981', label: status || 'Closed' };
    if (s === 'in progress')
      return { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', dot: '#3B82F6', label: 'In Progress' };
    if (s === 'pending sign-off')
      return { bg: '#FDF4FF', color: '#6B21A8', border: '#E9D5FF', dot: '#A855F7', label: 'Pending Sign-off' };
    if (s === 'scheduled')
      return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', dot: '#F59E0B', label: 'Scheduled' };
    return { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8', label: status || 'Unknown' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const auditTypeAudits = audits.filter(a => {
    const isRe = a.auditType === 'Re-Audit' || a.auditType === 'Re Audit';
    if (auditTypeFilter === 'Original') return !isRe;
    const st = (a.status || '').toLowerCase();
    return isRe && !(st === 'in progress' && (a.score === null || a.score === undefined));
  });

  const filteredAudits = auditTypeAudits.filter(a => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (a.auditPeriod || '').toLowerCase().includes(q) || (a.status || '').toLowerCase().includes(q) || (a.establishmentType || '').toLowerCase().includes(q);
    
    const st = (a.status || '').toLowerCase();
    const isCompleted = ['closed', 'approved', 'completed'].includes(st);
    const isActive = ['in progress', 'scheduled', 'pending sign-off'].includes(st);

    if (statusFilter === 'active') return matchesSearch && isActive;
    if (statusFilter === 'completed') return matchesSearch && isCompleted;
    return matchesSearch;
  });

  // Summary stats
  const totalAudits = auditTypeAudits.length;
  const completedAudits = auditTypeAudits.filter(a => ['closed', 'approved'].includes((a.status || '').toLowerCase())).length;
  const activeAudits = auditTypeAudits.filter(a => ['in progress', 'scheduled', 'pending sign-off'].includes((a.status || '').toLowerCase())).length;
  const avgScore = auditTypeAudits.filter(a => a.score != null).reduce((acc, a, _, arr) => acc + a.score / arr.length, 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
        <div className="flex justify-center items-center h-64">
          <div style={{ 
            width: '48px', height: '48px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, #1565C0, #1E3A8A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FileCheck style={{ width: '18px', height: '18px', color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
            My Audits
          </h1>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.9375rem', margin: 0, paddingLeft: '3.25rem' }}>
          View and manage all your compliance audits in one place.
        </p>
      </div>

      {/* Stats Strip */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem'
      }}>
        {[
          { id: 'all', label: 'Total Audits', value: totalAudits, icon: FileCheck, color: '#1565C0', bg: '#EFF6FF' },
          { id: 'active', label: 'Active', value: activeAudits, icon: TrendingUp, color: '#D97706', bg: '#FFFBEB' },
          { id: 'completed', label: 'Completed', value: completedAudits, icon: Shield, color: '#059669', bg: '#ECFDF5' },
          { id: 'score', label: 'Avg. Score', value: totalAudits > 0 && avgScore > 0 ? `${Math.round(avgScore)}%` : '--', icon: BarChart3, color: '#7C3AED', bg: '#F5F3FF' },
        ].map((stat, i) => {
          const isSelected = statusFilter === stat.id;
          return (
            <div 
              key={i} 
              onClick={() => {
                if (stat.id === 'score') {
                  navigate('/vendor/reports');
                  return;
                }
                if (stat.id === 'all') {
                  setSearchParams({});
                } else {
                  setSearchParams({ status: stat.id });
                }
                document.getElementById('audits-table-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              style={{
                background: 'white', borderRadius: '14px', padding: '1.25rem 1.5rem',
                border: isSelected ? `2px solid ${stat.color}` : '1px solid #E2E8F0',
                boxShadow: isSelected ? `0 4px 14px ${stat.color}25` : '0 1px 4px rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', gap: '1rem',
                transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s', cursor: 'pointer',
                transform: isSelected ? 'translateY(-2px)' : 'none'
              }}
              onMouseEnter={e => { 
                (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 18px ${stat.color}25`; 
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; 
              }}
              onMouseLeave={e => { 
                (e.currentTarget as HTMLElement).style.boxShadow = isSelected ? `0 4px 14px ${stat.color}25` : '0 1px 4px rgba(0,0,0,0.05)'; 
                (e.currentTarget as HTMLElement).style.transform = isSelected ? 'translateY(-2px)' : 'none'; 
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <stat.icon style={{ width: '20px', height: '20px', color: stat.color }} />
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', lineHeight: 1 }}>{stat.value}</div>
                  {isSelected && (
                    <span style={{ fontSize: '0.625rem', fontWeight: 800, color: stat.color, background: stat.bg, padding: '0.15rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Selected
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500, marginTop: '0.25rem' }}>{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Card */}
      <div id="audits-table-card" style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Card Header with Segmented Switch, Search & Filters */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Tier 1: Audit Type Tabs & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Segmented Audit Type Switcher */}
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

            {/* Search Box & Status Filter */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search audits..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.45rem 1rem 0.45rem 2.25rem',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.8375rem',
                    color: '#0B1F3A',
                    outline: 'none',
                    background: '#F8FAFC',
                    width: '210px',
                    transition: 'all 0.2s'
                  }}
                  onFocus={e => { e.target.style.background = '#FFFFFF'; e.target.style.borderColor = '#1565C0'; }}
                  onBlur={e => { e.target.style.background = '#F8FAFC'; e.target.style.borderColor = '#CBD5E1'; }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <Filter style={{ position: 'absolute', left: '10px', width: '13px', height: '13px', color: '#64748B', pointerEvents: 'none' }} />
                <select
                  value={statusFilter}
                  onChange={e => {
                    if (e.target.value === 'all') setSearchParams({});
                    else setSearchParams({ status: e.target.value });
                  }}
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
                  <option value="all">All Statuses ({totalAudits})</option>
                  <option value="active">Active ({activeAudits})</option>
                  <option value="completed">Completed ({completedAudits})</option>
                </select>
              </div>

              {statusFilter !== 'all' && (
                <button 
                  onClick={() => setSearchParams({})}
                  style={{
                    background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '7px',
                    padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600,
                    color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B'; }}
                >
                  <span>Reset status</span>
                  <span>×</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{
                  padding: '0.75rem 0.85rem', fontSize: '0.725rem', fontWeight: 700,
                  color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em',
                  textAlign: 'left', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap',
                  width: '105px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span>Audit Type</span>
                    <select
                      value={auditTypeFilter}
                      onChange={e => setAuditTypeFilter(e.target.value as 'Original' | 'Re-Audit')}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '5px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        cursor: 'pointer',
                        textTransform: 'none',
                        letterSpacing: 'normal',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        outline: 'none'
                      }}
                      title="Quick toggle between Original and Re Audit"
                    >
                      <option value="Original">Original</option>
                      <option value="Re-Audit">Re Audit</option>
                    </select>
                  </div>
                </th>
                {['Audit Period', 'Establishment', 'Timeline', 'Status', 'Progress', 'Score', 'Action'].map((h, i) => (
                  <th key={i} style={{
                    padding: '0.75rem 0.85rem', fontSize: '0.725rem', fontWeight: 700,
                    color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em',
                    textAlign: i === 6 ? 'right' : 'left', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAudits.length > 0 ? (
                filteredAudits.map((audit, idx) => {
                  const statusCfg = getStatusConfig(audit.status);
                  const hasScore = audit.score != null;
                  const scoreColor = hasScore ? getScoreColor(audit.score) : '#94A3B8';
                  const pct = audit.completionPercentage !== undefined && audit.completionPercentage !== null
                    ? Number(audit.completionPercentage)
                    : (['closed', 'completed', 'approved'].includes((audit.status || '').toLowerCase()) ? 100 : (
                        (audit.status || '').toLowerCase() === 'in progress' ? 60 : (
                          (audit.status || '').toLowerCase() === 'scheduled' ? 15 : (
                            (audit.status || '').toLowerCase() === 'pending sign-off' ? 80 : 0
                          )
                        )
                      ));
                  const is100Percent = pct === 100 || ['closed', 'completed', 'approved'].includes((audit.status || '').toLowerCase());

                  return (
                    <tr key={audit.id} style={{ 
                      borderBottom: idx < filteredAudits.length - 1 ? '1px solid #F1F5F9' : 'none',
                      transition: 'background 0.15s', cursor: 'pointer'
                    }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                        navigate(`/vendor/audits/${audit.id}`);
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFCFF'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'white'}
                    >
                      {/* Audit Type */}
                      <td style={{ padding: '0.875rem 0.85rem' }}>
                        {audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? (
                          <span 
                            style={{ 
                              backgroundColor: '#F3E8FF', 
                              color: '#7E22CE', 
                              border: '1px solid #D8B4FE', 
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.725rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#9333EA' }}></span>
                            Re Audit
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                            <span 
                              style={{ 
                                backgroundColor: '#ECFDF5', 
                                color: '#047857', 
                                border: '1px solid #A7F3D0', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '0.725rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
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
                                  gap: '3px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  whiteSpace: 'nowrap'
                                }}
                                title="This original audit has been re-audited and is now read-only"
                              >
                                Read-Only
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Audit Period */}
                      <td style={{ padding: '0.875rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: '38px', height: '38px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <FileCheck style={{ width: '16px', height: '16px', color: '#1565C0' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '0.9375rem' }}>{audit.auditPeriod}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px', fontFamily: 'ui-monospace, monospace', fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                              {audit.auditIdString || audit.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Establishment */}
                      <td style={{ padding: '0.875rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Building2 style={{ width: '14px', height: '14px', color: '#94A3B8' }} />
                          <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                            {audit.establishmentType || 'N/A'}
                          </span>
                        </div>
                      </td>
                      {/* Timeline */}
                      <td style={{ padding: '0.875rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Calendar style={{ width: '14px', height: '14px', color: '#94A3B8', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', lineHeight: 1.25 }}>
                            <span style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                              {formatDate(audit.startDate) || 'TBD'}
                            </span>
                            <span style={{ color: '#64748B', whiteSpace: 'nowrap', fontSize: '0.725rem' }}>
                              {formatDate(audit.dueDate) || 'TBD'}
                            </span>
                          </div>
                        </div>
                      </td>
                      {/* Status Badge */}
                      <td style={{ padding: '0.875rem 0.85rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '0.3rem 0.75rem', borderRadius: '999px',
                          background: statusCfg.bg, color: statusCfg.color,
                          border: `1px solid ${statusCfg.border}`,
                          fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap'
                        }}>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: statusCfg.dot,
                            boxShadow: ['scheduled', 'in progress'].includes((audit.status || '').toLowerCase())
                              ? `0 0 0 3px ${statusCfg.dot}30` : 'none'
                          }} />
                          {statusCfg.label}
                        </span>
                      </td>
                      {/* Progress Bar Column */}
                      <td style={{ padding: '0.875rem 0.85rem', width: '110px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flexGrow: 1, height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', minWidth: '28px' }}>{pct}%</span>
                        </div>
                      </td>
                      {/* Score */}
                      <td style={{ padding: '0.875rem 0.85rem' }}>
                        {hasScore ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <div style={{ 
                              width: '36px', height: '36px', borderRadius: '50%',
                              border: `2.5px solid ${scoreColor}`, display: 'flex',
                              alignItems: 'center', justifyContent: 'center'
                            }}>
                              <span style={{ fontSize: '0.625rem', fontWeight: 800, color: scoreColor }}>{Math.round(audit.score)}%</span>
                            </div>
                            <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: '#F1F5F9', overflow: 'hidden', width: '60px' }}>
                              <div style={{ width: `${audit.score}%`, height: '100%', borderRadius: '999px', background: scoreColor, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: '1rem', fontWeight: 600 }}>—</span>
                        )}
                      </td>
                      {/* Action */}
                      <td style={{ padding: '0.875rem 0.85rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Link to={`/vendor/audits/${audit.id}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.45rem 0.875rem', borderRadius: '8px',
                            background: '#EFF6FF', color: '#1565C0',
                            fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none',
                            border: '1px solid #BFDBFE', transition: 'all 0.2s'
                          }}>
                            View
                            <ArrowRight style={{ width: '13px', height: '13px' }} />
                          </Link>
                          {is100Percent ? (
                            <button 
                              onClick={() => handleDownloadExcel(audit)}
                              title="Download Complete Excel Report"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.45rem 0.875rem', borderRadius: '8px',
                                background: '#ECFDF5', color: '#047857',
                                fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                                border: '1px solid #A7F3D0', transition: 'all 0.2s'
                              }}
                            >
                              <FileSpreadsheet style={{ width: '14px', height: '14px', color: '#059669' }} />
                              Excel
                            </button>
                          ) : (
                            <button 
                              disabled
                              title="Excel download available after audit completion."
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.45rem 0.875rem', borderRadius: '8px',
                                background: '#F1F5F9', color: '#94A3B8',
                                fontSize: '0.8125rem', fontWeight: 600, cursor: 'not-allowed',
                                border: '1px solid #E2E8F0', opacity: 0.75
                              }}
                            >
                              <FileSpreadsheet style={{ width: '14px', height: '14px', color: '#94A3B8' }} />
                              Excel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        width: '72px', height: '72px', borderRadius: '20px',
                        background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px dashed #E2E8F0'
                      }}>
                        <FileCheck style={{ width: '32px', height: '32px', color: '#CBD5E1' }} />
                      </div>
                      <div>
                        <h3 style={{ fontWeight: 700, color: '#475569', margin: '0 0 0.375rem', fontSize: '1rem' }}>
                          {searchQuery ? 'No audits match your search' : `No ${auditTypeFilter === 'Original' ? 'original audits' : 're-audits'} found`}
                        </h3>
                        <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0 }}>
                          {searchQuery ? 'Try a different keyword or clear the search filter.' : `Audits assigned to you by the admin will appear here under ${auditTypeFilter}.`}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
};
