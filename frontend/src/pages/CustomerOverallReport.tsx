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
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .overall-kpi-card {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 0.85rem 1rem 0.75rem;
          border: 1.5px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(11, 31, 58, 0.03);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 96px;
        }
        .overall-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(11, 31, 58, 0.07);
          border-color: #CBD5E1;
        }
        .overall-audit-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(11, 31, 58, 0.03);
          overflow: hidden;
          margin-bottom: 1.25rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .overall-audit-card:hover {
          border-color: #CBD5E1;
          box-shadow: 0 4px 12px rgba(11, 31, 58, 0.05);
        }
        .filter-select-input {
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1E293B;
          background-color: #FFFFFF;
          cursor: pointer;
          outline: none;
          transition: all 0.15s ease;
        }
        .filter-select-input:hover {
          border-color: #94A3B8;
        }
        .filter-select-input:focus {
          border-color: #1565C0;
          box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.1);
        }
      `}</style>

      <div style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
        
        {/* PAGE HEADER */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
              Overall Report
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.25rem', margin: 0 }}>
              Consolidated audit-wise vendor compliance performance and historical tracking.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1565C0', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.35rem 0.75rem', borderRadius: '999px' }}>
              {summary.totalAudits} Audit Sessions
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.35rem 0.75rem', borderRadius: '999px' }}>
              {summary.totalVendors} Associated Vendors
            </span>
          </div>
        </div>

        {/* SUMMARY KPI CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          {/* Card 1: Total Audits */}
          <div className="overall-kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Audits
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0B1F3A', lineHeight: 1.1, marginTop: '0.2rem' }}>
                  {summary.totalAudits}
                </div>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileCheck size={16} color="#1565C0" />
              </div>
            </div>
            <div style={{ marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500, display: 'block' }}>
                Active Audit Periods
              </span>
            </div>
          </div>

          {/* Card 2: Total Vendors */}
          <div className="overall-kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Vendors
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0B1F3A', lineHeight: 1.1, marginTop: '0.2rem' }}>
                  {summary.totalVendors}
                </div>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={16} color="#0D9488" />
              </div>
            </div>
            <div style={{ marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500, display: 'block' }}>
                Assigned Vendors
              </span>
            </div>
          </div>

          {/* Card 3: Completed Audits */}
          <div className="overall-kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Completed Audits
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857', lineHeight: 1.1, marginTop: '0.2rem' }}>
                  {summary.completedAudits}
                </div>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={16} color="#047857" />
              </div>
            </div>
            <div style={{ marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '0.7rem', color: '#065F46', fontWeight: 500, display: 'block' }}>
                Closed & Evaluated
              </span>
            </div>
          </div>

          {/* Card 4: Average Score */}
          <div className="overall-kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Average Compliance
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: summary.averageComplianceScore !== null && summary.averageComplianceScore >= 80 ? '#047857' : summary.averageComplianceScore !== null && summary.averageComplianceScore >= 50 ? '#B45309' : '#DC2626', lineHeight: 1.1, marginTop: '0.2rem' }}>
                  {summary.averageComplianceScore !== null ? `${summary.averageComplianceScore}%` : 'N/A'}
                </div>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BarChart3 size={16} color="#B45309" />
              </div>
            </div>
            <div style={{ marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500, display: 'block' }}>
                Single Source of Truth
              </span>
            </div>
          </div>
        </div>

        {/* CONTROLS BAR: SEARCH, FILTERS, SORT */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '1rem 1.25rem',
          border: '1px solid #E2E8F0', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(11, 31, 58, 0.03)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px', flex: '1' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search Audit ID, Period, Vendor Name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem',
                  borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8125rem', outline: 'none', color: '#0F172A',
                  background: '#FFFFFF'
                }}
              />
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', alignItems: 'center' }}>
              
              {/* Filter: Period */}
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="filter-select-input"
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
                className="filter-select-input"
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
                className="filter-select-input"
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
                className="filter-select-input"
                style={{ background: '#F8FAFC' }}
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
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #FECACA',
                    backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={13} /> Clear
                </button>
              )}
            </div>

          </div>
        </div>

        {/* AUDIT-WISE GROUPING LIST */}
        {filteredAudits.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '3.5rem 1.5rem',
            textAlign: 'center', border: '1px solid #E2E8F0', marginTop: '1rem'
          }}>
            <FileCheck size={44} color="#94A3B8" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem' }}>
              {hasActiveFilters ? 'No audit records match your filters' : 'No audit records available'}
            </h3>
            <p style={{ fontSize: '0.8375rem', color: '#64748B', margin: '0 0 1.25rem' }}>
              {hasActiveFilters ? 'Try adjusting or clearing your filters to see matching audit sessions.' : 'Consolidated audit records will appear here as audits are processed.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '0.5rem 1.25rem', backgroundColor: '#1565C0', color: '#FFFFFF',
                  borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 700, border: 'none', cursor: 'pointer'
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredAudits.map((group) => {
              const isExpanded = expandedGroups[group.auditPeriod] ?? true;
              const statusBadge = getStatusBadge(group.status);
              const avgScoreBadge = getScoreBadge(group.averageScore);

              return (
                <div key={group.auditPeriod} className="overall-audit-card">
                  {/* AUDIT SECTION HEADER */}
                  <div
                    onClick={() => toggleGroup(group.auditPeriod)}
                    style={{
                      padding: '1.125rem 1.5rem', backgroundColor: isExpanded ? '#FFFFFF' : '#FAFCFF',
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                      transition: 'background-color 0.15s ease', gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        backgroundColor: isExpanded ? '#1565C0' : '#F1F5F9',
                        color: isExpanded ? '#FFFFFF' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s ease',
                        boxShadow: isExpanded ? '0 2px 6px rgba(21, 101, 192, 0.25)' : 'none'
                      }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.01em' }}>
                            {group.auditPeriod} Audit
                          </h2>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1565C0', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.15rem 0.55rem', borderRadius: '6px', fontFamily: 'monospace' }}>
                            {group.auditIdString}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.35rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.725rem', color: '#475569', background: '#F1F5F9', padding: '0.15rem 0.5rem', borderRadius: '5px', fontWeight: 600 }}>
                            Type: {group.auditType || 'Standard'}
                          </span>
                          <span style={{ fontSize: '0.725rem', color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.15rem 0.5rem', borderRadius: '5px', fontWeight: 600 }}>
                            Vendors: {group.totalVendors}
                          </span>
                          <span style={{ fontSize: '0.725rem', color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.15rem 0.5rem', borderRadius: '5px', fontWeight: 700 }}>
                            Completed: {group.completedVendors}/{group.totalVendors}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Header Right Badges & Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                      {/* Audit Status Badge */}
                      <span style={{
                        padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.725rem', fontWeight: 700,
                        backgroundColor: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`
                      }}>
                        {statusBadge.label}
                      </span>

                      {/* Average Score Badge */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.725rem', fontWeight: 800,
                        backgroundColor: avgScoreBadge.bg, color: avgScoreBadge.color, border: `1px solid ${avgScoreBadge.border}`
                      }}>
                        <span style={{ opacity: 0.85, fontWeight: 600 }}>Avg Score:</span>
                        <span>{avgScoreBadge.label}</span>
                      </div>

                      {/* View Audit Details Button */}
                      {group.vendors.length > 0 && group.vendors[0].auditId && (
                        <button
                          onClick={() => navigate(`/customer/audits/${group.vendors[0].auditId}`)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.35rem 0.75rem', borderRadius: '7px', border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF', color: '#1565C0', fontSize: '0.75rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                        >
                          <Eye size={13} color="#1565C0" />
                          <span>View Audit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* VENDOR SECTION (COLLAPSIBLE CONTENT) */}
                  {isExpanded && (
                    <div style={{ width: '100%', overflowX: 'hidden' }}>
                      {group.vendors.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.8125rem' }}>
                          No vendors associated with this audit.
                        </div>
                      ) : (
                        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                          <colgroup>
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '8%' }} />
                          </colgroup>
                          <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              <th style={{ padding: '0.75rem 0.6rem' }}>Vendor</th>
                              <th style={{ padding: '0.75rem 0.6rem' }}>Compliance Score</th>
                              <th style={{ padding: '0.75rem 0.6rem' }}>Audit Status</th>
                              <th style={{ padding: '0.75rem 0.6rem' }}>Audit Progress</th>
                              <th style={{ padding: '0.75rem 0.6rem' }}>Findings</th>
                              <th style={{ padding: '0.75rem 0.6rem' }}>Historical Performance</th>
                              <th style={{ padding: '0.75rem 0.6rem', textAlign: 'right' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.vendors.map((vendor, idx) => {
                              const scoreBadge = getScoreBadge(vendor.complianceScore);
                              const vStatusBadge = getStatusBadge(vendor.auditStatus);

                              return (
                                <tr key={vendor.vendorId || idx} style={{ borderBottom: idx < group.vendors.length - 1 ? '1px solid #F1F5F9' : 'none', transition: 'background-color 0.15s ease' }}>
                                  
                                  {/* Vendor Name & ID */}
                                  <td style={{ padding: '0.75rem 0.6rem', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                      <div style={{
                                        width: '30px', height: '30px', borderRadius: '8px',
                                        backgroundColor: '#EFF6FF', color: '#1565C0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: '0.75rem', flexShrink: 0
                                      }}>
                                        {(vendor.vendorName || 'V').substring(0, 2).toUpperCase()}
                                      </div>
                                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={vendor.vendorName}>
                                          {vendor.vendorName}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`ID: ${vendor.vendorId}`}>
                                          #{vendor.vendorId ? vendor.vendorId.slice(0, 8) : 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Compliance Score */}
                                  <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap' }}>
                                    <span style={{
                                      display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '999px',
                                      fontSize: '0.725rem', fontWeight: 800, backgroundColor: scoreBadge.bg,
                                      color: scoreBadge.color, border: `1px solid ${scoreBadge.border}`
                                    }}>
                                      {scoreBadge.label}
                                    </span>
                                  </td>

                                  {/* Audit Status */}
                                  <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap' }}>
                                    <span style={{
                                      display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '999px',
                                      fontSize: '0.7rem', fontWeight: 700, backgroundColor: vStatusBadge.bg,
                                      color: vStatusBadge.color, border: `1px solid ${vStatusBadge.border}`
                                    }}>
                                      {vStatusBadge.label}
                                    </span>
                                  </td>

                                  {/* Audit Progress */}
                                  <td style={{ padding: '0.75rem 0.6rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                      <div style={{ flex: 1, backgroundColor: '#E2E8F0', height: '5px', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{
                                          width: `${vendor.auditProgress}%`,
                                          backgroundColor: vendor.auditProgress === 100 ? '#047857' : '#1565C0',
                                          height: '100%', borderRadius: '999px'
                                        }} />
                                      </div>
                                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', minWidth: '26px' }}>
                                        {vendor.auditProgress}%
                                      </span>
                                    </div>
                                  </td>

                                  {/* Findings Summary */}
                                  <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                      <span style={{
                                        padding: '0.15rem 0.45rem', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700,
                                        backgroundColor: vendor.criticalCount > 0 ? '#FEF2F2' : '#F1F5F9',
                                        color: vendor.criticalCount > 0 ? '#DC2626' : '#475569',
                                        border: `1px solid ${vendor.criticalCount > 0 ? '#FECACA' : '#E2E8F0'}`
                                      }}>
                                        Findings: {vendor.findingsCount}
                                      </span>
                                      {vendor.criticalCount > 0 && (
                                        <span style={{ fontSize: '0.675rem', color: '#DC2626', fontWeight: 700 }}>
                                          ({vendor.criticalCount} crit)
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Historical Performance */}
                                  <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                    {vendor.history && vendor.history.length > 0 ? (
                                      <button
                                        onClick={() => setSelectedHistoryVendor(vendor)}
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                          padding: '0.25rem 0.55rem', borderRadius: '6px', border: '1px solid #E2E8F0',
                                          backgroundColor: '#F8FAFC', color: '#1E293B', fontSize: '0.725rem', fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                        title="View Historical Audits"
                                      >
                                        <TrendingUp size={12} color="#1565C0" />
                                        <span>{vendor.history.length} Logged</span>
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                        None
                                      </span>
                                    )}
                                  </td>

                                  {/* Action Button */}
                                  <td style={{ padding: '0.75rem 0.6rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <button
                                      onClick={() => navigate(`/customer/vendors/${vendor.vendorId !== 'N/A' ? vendor.vendorId : vendor.auditId}`)}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.3rem 0.6rem', borderRadius: '7px', border: 'none',
                                        backgroundColor: '#1565C0', color: '#FFFFFF', fontSize: '0.725rem', fontWeight: 700,
                                        cursor: 'pointer', transition: 'background-color 0.15s ease'
                                      }}
                                    >
                                      <Eye size={12} />
                                      <span>View</span>
                                    </button>
                                  </td>

                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
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
