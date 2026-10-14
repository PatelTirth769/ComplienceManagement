import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, Eye, X, CheckCircle2,
  FileText, Presentation, FileBarChart, ChevronDown, ChevronUp, RotateCcw,
  TrendingUp, AlertCircle
} from 'lucide-react';
import { getCustomerOverallReport } from '../services/api';

interface VendorItem {
  vendorId: string;
  vendorName: string;
  complianceScore: number | null;
  criticalCount: number;
  generalCount: number;
  auditStatus: string;
  auditProgress: number;
  findingsCount: number;
  auditId: string;
  auditIdString: string;
  history?: Array<{
    auditId: string;
    auditIdString: string;
    period: string;
    score: number;
    status: string;
    date: string;
  }>;
}

interface AuditGroup {
  auditIdString: string;
  auditPeriod: string;
  auditType: string;
  status: string;
  progress: number;
  totalVendors: number;
  completedVendors: number;
  averageScore: number | null;
  vendors: VendorItem[];
}

export const CustomerOverallReport: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [summary, setSummary] = useState({
    totalAudits: 0,
    totalVendors: 0,
    completedAudits: 0,
    averageComplianceScore: null as number | null
  });
  
  const [audits, setAudits] = useState<AuditGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedHistoryVendor, setSelectedHistoryVendor] = useState<VendorItem | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortBy, setSortBy] = useState('PERIOD_DESC');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/customer' },
    { name: 'My Vendors', icon: Building2, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, active: true, path: '/customer/overall-report' }
  ];

  const fetchOverallReportData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await getCustomerOverallReport();
      if (res.success) {
        setSummary(res.summary || {
          totalAudits: 0,
          totalVendors: 0,
          completedAudits: 0,
          averageComplianceScore: null
        });
        const auditList: AuditGroup[] = res.audits || [];
        setAudits(auditList);
        
        // Expand the first/most recent audit by default
        const initialExpanded: Record<string, boolean> = {};
        auditList.forEach((ag, idx) => {
          initialExpanded[ag.auditPeriod] = idx === 0;
        });
        setExpandedGroups(initialExpanded);
      } else {
        setErrorMsg(res.error || 'Unable to load overall report data.');
      }
    } catch (err: any) {
      console.error('Failed to fetch overall report data:', err);
      setErrorMsg(err.message || 'Unable to load overall report data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverallReportData();
  }, []);

  const toggleGroup = (periodKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [periodKey]: !prev[periodKey]
    }));
  };

  // Options for filter dropdowns
  const availablePeriods = Array.from(new Set(audits.map(a => a.auditPeriod))).filter(Boolean);
  const availableVendors = Array.from(new Set(audits.flatMap(a => a.vendors.map(v => v.vendorName)))).filter(Boolean);
  const availableStatuses = Array.from(new Set(audits.map(a => a.status))).filter(Boolean);
  const availableTypes = Array.from(new Set(audits.map(a => a.auditType))).filter(Boolean);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedPeriod !== 'ALL' || selectedVendor !== 'ALL' || selectedStatus !== 'ALL' || selectedType !== 'ALL';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPeriod('ALL');
    setSelectedVendor('ALL');
    setSelectedStatus('ALL');
    setSelectedType('ALL');
    setSortBy('PERIOD_DESC');
  };

  // Filter & Sort logic
  const filteredAudits = audits.map(group => {
    if (selectedPeriod !== 'ALL' && group.auditPeriod !== selectedPeriod) return null;
    if (selectedStatus !== 'ALL' && group.status !== selectedStatus) return null;
    if (selectedType !== 'ALL' && group.auditType !== selectedType) return null;

    const matchingVendors = group.vendors.filter(v => {
      if (selectedVendor !== 'ALL' && v.vendorName !== selectedVendor) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSearch = 
          group.auditIdString.toLowerCase().includes(q) ||
          group.auditPeriod.toLowerCase().includes(q) ||
          (v.vendorName || '').toLowerCase().includes(q) ||
          (v.vendorId || '').toLowerCase().includes(q);
        if (!matchSearch) return false;
      }
      return true;
    });

    if (matchingVendors.length === 0 && searchQuery.trim() !== '') {
      // Check if audit level matches search
      const q = searchQuery.toLowerCase();
      const groupMatch = group.auditIdString.toLowerCase().includes(q) || group.auditPeriod.toLowerCase().includes(q);
      if (!groupMatch) return null;
    } else if (matchingVendors.length === 0 && selectedVendor !== 'ALL') {
      return null;
    }

    return {
      ...group,
      vendors: matchingVendors.length > 0 ? matchingVendors : group.vendors
    };
  }).filter(Boolean) as AuditGroup[];

  // Sorting
  filteredAudits.sort((a, b) => {
    if (sortBy === 'PERIOD_DESC') return b.auditPeriod.localeCompare(a.auditPeriod);
    if (sortBy === 'PERIOD_ASC') return a.auditPeriod.localeCompare(b.auditPeriod);
    if (sortBy === 'SCORE_DESC') return (b.averageScore || 0) - (a.averageScore || 0);
    if (sortBy === 'SCORE_ASC') return (a.averageScore || 0) - (b.averageScore || 0);
    return 0;
  });

  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    if (['closed / approved', 'closed', 'completed', 'approved'].includes(s)) {
      return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: 'Closed / Approved' };
    }
    if (s.includes('progress') || s.includes('review')) {
      return { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', label: statusStr };
    }
    return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: statusStr || 'Scheduled' };
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null || score === undefined) return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'N/A' };
    const r = Math.round(score);
    if (r >= 80) return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: `${r}%` };
    if (r >= 50) return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: `${r}%` };
    return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: `${r}%` };
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px' }}>
          <div style={{
            width: '44px', height: '44px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ marginTop: '16px', color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Loading consolidated overall report...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  if (errorMsg) {
    return (
      <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
        <div style={{ padding: '24px' }}>
          <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px',
            padding: '24px', textAlign: 'center', maxWidth: '600px', margin: '40px auto'
          }}>
            <AlertCircle size={40} color="#DC2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#991B1B', marginBottom: '8px' }}>Unable to load overall report data</h3>
            <p style={{ fontSize: '14px', color: '#7F1D1D', marginBottom: '20px' }}>{errorMsg}</p>
            <button
              onClick={fetchOverallReportData}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', backgroundColor: '#DC2626', color: '#FFFFFF',
                borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer'
              }}
            >
              <RotateCcw size={16} /> Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <div style={{ padding: '24px', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
        
        {/* PAGE HEADER */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Overall Report
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            View consolidated audit-wise vendor compliance performance.
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          {/* Card 1: Total Audits */}
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px',
            border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Audits
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCheck size={20} color="#1565C0" />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A' }}>
              {summary.totalAudits}
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Audit Sessions</span>
          </div>

          {/* Card 2: Total Vendors */}
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px',
            border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Vendors
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} color="#0D9488" />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A' }}>
              {summary.totalVendors}
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Associated Vendors</span>
          </div>

          {/* Card 3: Completed Audits */}
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px',
            border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Completed Audits
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} color="#047857" />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A' }}>
              {summary.completedAudits}
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Closed / Evaluated</span>
          </div>

          {/* Card 4: Average Score */}
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px',
            border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Average Compliance
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={20} color="#B45309" />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: summary.averageComplianceScore !== null && summary.averageComplianceScore >= 80 ? '#047857' : '#0F172A' }}>
              {summary.averageComplianceScore !== null ? `${summary.averageComplianceScore}%` : 'N/A'}
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Single Source of Truth Score</span>
          </div>
        </div>

        {/* CONTROLS BAR: SEARCH, FILTERS, SORT */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '18px',
          border: '1px solid #E2E8F0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '260px', flex: '1' }}>
              <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search Audit ID, Period, Vendor Name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '38px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px',
                  borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', color: '#0F172A'
                }}
              />
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              
              {/* Filter: Period */}
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '13px', color: '#334155', backgroundColor: '#FFFFFF', cursor: 'pointer'
                }}
              >
                <option value="ALL">All Periods</option>
                {availablePeriods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Filter: Vendor */}
              <select
                value={selectedVendor}
                onChange={e => setSelectedVendor(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '13px', color: '#334155', backgroundColor: '#FFFFFF', cursor: 'pointer'
                }}
              >
                <option value="ALL">All Vendors</option>
                {availableVendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              {/* Filter: Status */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '13px', color: '#334155', backgroundColor: '#FFFFFF', cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statuses</option>
                {availableStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '13px', color: '#334155', backgroundColor: '#F8FAFC', fontWeight: 500, cursor: 'pointer'
                }}
              >
                <option value="PERIOD_DESC">Sort: Period (Latest)</option>
                <option value="PERIOD_ASC">Sort: Period (Oldest)</option>
                <option value="SCORE_DESC">Sort: Score (Highest)</option>
                <option value="SCORE_ASC">Sort: Score (Lowest)</option>
              </select>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 14px', borderRadius: '8px', border: '1px solid #FECACA',
                    backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={14} /> Clear Filters
                </button>
              )}
            </div>

          </div>
        </div>

        {/* AUDIT-WISE GROUPING LIST */}
        {filteredAudits.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '48px 24px',
            textAlign: 'center', border: '1px solid #E2E8F0', marginTop: '20px'
          }}>
            <FileCheck size={48} color="#94A3B8" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              {hasActiveFilters ? 'No audit data matching your search or filters.' : 'No audit data available.'}
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
              {hasActiveFilters ? 'Try clearing your active filters or changing your search criteria.' : 'Consolidated audit records will appear here as audits are created and processed.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '8px 16px', backgroundColor: '#1565C0', color: '#FFFFFF',
                  borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer'
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredAudits.map((group) => {
              const isExpanded = expandedGroups[group.auditPeriod] ?? true;
              const statusBadge = getStatusBadge(group.status);
              const avgScoreBadge = getScoreBadge(group.averageScore);

              return (
                <div
                  key={group.auditPeriod}
                  style={{
                    backgroundColor: '#FFFFFF', borderRadius: '12px',
                    border: '1px solid #E2E8F0', overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* AUDIT SECTION HEADER */}
                  <div
                    onClick={() => toggleGroup(group.auditPeriod)}
                    style={{
                      padding: '20px 24px', backgroundColor: '#FFFFFF',
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '6px',
                        backgroundColor: isExpanded ? '#1565C0' : '#F1F5F9',
                        color: isExpanded ? '#FFFFFF' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                            {group.auditPeriod} Audit
                          </h2>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                            {group.auditIdString}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px', fontSize: '13px', color: '#64748B' }}>
                          <span>Type: <strong>{group.auditType}</strong></span>
                          <span>•</span>
                          <span>Vendors: <strong>{group.totalVendors}</strong></span>
                          <span>•</span>
                          <span>Completed: <strong>{group.completedVendors}/{group.totalVendors}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Header Right Badges & Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                      {/* Audit Status Badge */}
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        backgroundColor: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`
                      }}>
                        {statusBadge.label}
                      </span>

                      {/* Average Score Badge */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                        backgroundColor: avgScoreBadge.bg, color: avgScoreBadge.color, border: `1px solid ${avgScoreBadge.border}`
                      }}>
                        <span>Avg Score:</span>
                        <span>{avgScoreBadge.label}</span>
                      </div>

                      {/* View Audit Details Button */}
                      {group.vendors.length > 0 && group.vendors[0].auditId && (
                        <button
                          onClick={() => navigate(`/customer/audits/${group.vendors[0].auditId}`)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={14} color="#1565C0" /> View Audit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* VENDOR SECTION (COLLAPSIBLE CONTENT) */}
                  {isExpanded && (
                    <div>
                      {group.vendors.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                          No vendors associated with this audit.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor</th>
                                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compliance Score</th>
                                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Status</th>
                                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Progress</th>
                                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Findings</th>
                                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historical Performance</th>
                                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.vendors.map((vendor, idx) => {
                                const scoreBadge = getScoreBadge(vendor.complianceScore);
                                const vStatusBadge = getStatusBadge(vendor.auditStatus);

                                return (
                                  <tr key={vendor.vendorId || idx} style={{ borderBottom: idx < group.vendors.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                                    
                                    {/* Vendor Name & ID */}
                                    <td style={{ padding: '16px 20px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                          width: '34px', height: '34px', borderRadius: '8px',
                                          backgroundColor: '#EFF6FF', color: '#1565C0',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontWeight: 700, fontSize: '14px'
                                        }}>
                                          {(vendor.vendorName || 'V').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                                            {vendor.vendorName}
                                          </div>
                                          <div style={{ fontSize: '12px', color: '#64748B' }}>
                                            ID: {vendor.vendorId}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Compliance Score (Single Source of Truth) */}
                                    <td style={{ padding: '16px 20px' }}>
                                      <span style={{
                                        display: 'inline-block', padding: '6px 14px', borderRadius: '20px',
                                        fontSize: '13px', fontWeight: 700, backgroundColor: scoreBadge.bg,
                                        color: scoreBadge.color, border: `1px solid ${scoreBadge.border}`
                                      }}>
                                        {scoreBadge.label}
                                      </span>
                                    </td>

                                    {/* Audit Status */}
                                    <td style={{ padding: '16px 20px' }}>
                                      <span style={{
                                        display: 'inline-block', padding: '4px 10px', borderRadius: '12px',
                                        fontSize: '12px', fontWeight: 600, backgroundColor: vStatusBadge.bg,
                                        color: vStatusBadge.color, border: `1px solid ${vStatusBadge.border}`
                                      }}>
                                        {vStatusBadge.label}
                                      </span>
                                    </td>

                                    {/* Audit Progress (Same source as Vendor Portal) */}
                                    <td style={{ padding: '16px 20px', minWidth: '140px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ flex: 1, backgroundColor: '#E2E8F0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                          <div style={{
                                            width: `${vendor.auditProgress}%`,
                                            backgroundColor: vendor.auditProgress === 100 ? '#047857' : '#1565C0',
                                            height: '100%', borderRadius: '3px'
                                          }} />
                                        </div>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                                          {vendor.auditProgress}%
                                        </span>
                                      </div>
                                    </td>

                                    {/* Findings Summary */}
                                    <td style={{ padding: '16px 20px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                          padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                                          backgroundColor: vendor.criticalCount > 0 ? '#FEF2F2' : '#F1F5F9',
                                          color: vendor.criticalCount > 0 ? '#DC2626' : '#475569',
                                          border: `1px solid ${vendor.criticalCount > 0 ? '#FECACA' : '#CBD5E1'}`
                                        }}>
                                          Findings: {vendor.findingsCount}
                                        </span>
                                        {vendor.criticalCount > 0 && (
                                          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>
                                            ({vendor.criticalCount} Critical)
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Historical Performance */}
                                    <td style={{ padding: '16px 20px' }}>
                                      {vendor.history && vendor.history.length > 0 ? (
                                        <button
                                          onClick={() => setSelectedHistoryVendor(vendor)}
                                          style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0',
                                            backgroundColor: '#F8FAFC', color: '#1E293B', fontSize: '12px', fontWeight: 500,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <TrendingUp size={13} color="#1565C0" /> {vendor.history.length} Audits Logged
                                        </button>
                                      ) : (
                                        <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                                          Historical data not available
                                        </span>
                                      )}
                                    </td>

                                    {/* Action Button */}
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                      <button
                                        onClick={() => navigate(`/customer/vendors/${vendor.vendorId !== 'N/A' ? vendor.vendorId : vendor.auditId}`)}
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                                          padding: '6px 12px', borderRadius: '6px', border: 'none',
                                          backgroundColor: '#1565C0', color: '#FFFFFF', fontSize: '12px', fontWeight: 600,
                                          cursor: 'pointer', transition: 'background-color 0.15s ease'
                                        }}
                                      >
                                        <Eye size={13} /> View
                                      </button>
                                    </td>

                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* HISTORICAL PERFORMANCE MODAL */}
      {selectedHistoryVendor && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '14px', maxWidth: '520px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px', backgroundColor: '#0B1F3A', color: '#FFFFFF',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  Historical Compliance Performance
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#93C5FD' }}>
                  {selectedHistoryVendor.vendorName} ({selectedHistoryVendor.vendorId})
                </p>
              </div>
              <button
                onClick={() => setSelectedHistoryVendor(null)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedHistoryVendor.history && selectedHistoryVendor.history.map((h, i) => {
                  const badge = getScoreBadge(h.score);
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                          {h.period} Audit
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          {h.auditIdString} • Status: {h.status}
                        </div>
                      </div>

                      <div style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700,
                        backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`
                      }}>
                        {badge.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedHistoryVendor(null)}
                  style={{
                    padding: '8px 18px', backgroundColor: '#F1F5F9', color: '#334155',
                    borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: '1px solid #CBD5E1', cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
