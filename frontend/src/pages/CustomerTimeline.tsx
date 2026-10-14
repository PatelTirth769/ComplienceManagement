import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, Filter, Eye, RefreshCw,
  AlertCircle, CheckCircle2, Circle, AlertTriangle, ArrowRight, FileText, User, Shield, Presentation, FileBarChart
} from 'lucide-react';
import { getCustomerTimeline } from '../services/api';

const STANDARD_MILESTONES = [
  { id: 'REGISTRATION', title: 'Vendor Registration', description: 'Vendor account created and assigned' },
  { id: 'ORIENTATION', title: 'Orientation Deck Sent', description: 'Audit instructions and guidelines shared' },
  { id: 'SCHEDULED', title: 'Audit Scheduled', description: 'Audit period and due dates finalized' },
  { id: 'DOCS_REQUESTED', title: 'Documents Requested', description: 'Statutory compliance documents requested' },
  { id: 'DOCS_SUBMITTED', title: 'Documents Submitted', description: 'Vendor uploaded requested evidence' },
  { id: 'AUDIT_STARTED', title: 'Live Audit Started', description: 'Auditor began checklist evaluation' },
  { id: 'AUDITOR_SUBMITTED', title: 'Auditor Submitted', description: 'Auditor completed review & submitted report' },
  { id: 'REVIEWER_SIGNOFF', title: 'Reviewer Sign-off', description: 'Reviewer / Admin reviewed findings' },
  { id: 'FINAL_APPROVAL', title: 'Final Approval', description: 'Compliance score & report approved' },
  { id: 'AUDIT_CLOSED', title: 'Audit Closed', description: 'Audit completed and signed off' }
];

export const CustomerTimeline: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/customer' },
    { name: 'My Vendors', icon: Building2, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, active: true, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, path: '/customer/overall-report' }
  ];

  const fetchTimelineData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerTimeline();
      if (res.success && res.data) {
        const fetchedAudits = res.data.audits || [];
        setAudits(fetchedAudits);
        if (fetchedAudits.length > 0 && !selectedAuditId) {
          setSelectedAuditId(fetchedAudits[0].id);
        }
      } else {
        setError(res.error || 'Failed to fetch audit timeline data.');
      }
    } catch (err: any) {
      console.error('Error fetching customer timeline:', err);
      setError('Network error: Unable to load audit timeline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
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

  // Derive unique vendor list
  const uniqueVendors = Array.from(new Set(audits.map(a => a.vendorName))).filter(Boolean);

  // Summary counts
  const totalCount = audits.length;
  const inProgressCount = audits.filter(a => (a.status || '').toLowerCase() === 'in progress').length;
  const pendingCount = audits.filter(a => ['pending sign-off', 'under review'].includes((a.status || '').toLowerCase())).length;
  const scheduledCount = audits.filter(a => (a.status || '').toLowerCase() === 'scheduled').length;
  const closedCount = audits.filter(a => ['closed', 'completed', 'approved'].includes((a.status || '').toLowerCase())).length;

  const filteredAudits = audits.filter(audit => {
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

  const selectedAudit = audits.find(a => a.id === selectedAuditId) || (filteredAudits.length > 0 ? filteredAudits[0] : null);

  // Determine Milestone status for selected audit
  const getMilestoneState = (milestoneIndex: number, auditObj: any) => {
    if (!auditObj) return { state: 'UPCOMING', date: null, notes: '' };
    const st = (auditObj.status || '').toLowerCase();
    const timelineEvents = Array.isArray(auditObj.timeline) ? auditObj.timeline : [];

    // Stage order: Scheduled (0-3), In Progress (4-5), Pending Sign-off (6-7), Closed (8-9)
    let activeIndex = 2; // Scheduled
    if (st === 'in progress') activeIndex = 5;
    else if (st === 'pending sign-off' || st === 'under review') activeIndex = 7;
    else if (['closed', 'completed', 'approved'].includes(st)) activeIndex = 9;

    if (milestoneIndex < activeIndex) {
      const matchingEvent = timelineEvents.find((e: any) => e.event && e.event.toLowerCase().includes(STANDARD_MILESTONES[milestoneIndex].title.toLowerCase()));
      return {
        state: 'COMPLETED',
        date: matchingEvent ? new Date(matchingEvent.timestamp).toLocaleDateString() : 'Completed',
        notes: matchingEvent ? matchingEvent.notes : ''
      };
    } else if (milestoneIndex === activeIndex) {
      const matchingEvent = timelineEvents[timelineEvents.length - 1];
      return {
        state: 'CURRENT',
        date: matchingEvent ? new Date(matchingEvent.timestamp).toLocaleDateString() : 'Active Stage',
        notes: matchingEvent ? matchingEvent.notes : ''
      };
    } else {
      return { state: 'UPCOMING', date: null, notes: '' };
    }
  };

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .timeline-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          overflow: hidden;
        }
        .stat-badge-mini {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
          Audit Timeline
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          Track audit milestones and progress across your assigned vendors.
        </p>
      </div>

      {/* Summary Counters Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease 0.05s both' }}>
        <div className="stat-badge-mini">
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock style={{ width: '18px', height: '18px', color: '#1565C0' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Audits</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0B1F3A', lineHeight: 1.1, marginTop: '2px' }}>{totalCount}</div>
          </div>
        </div>

        <div className="stat-badge-mini">
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock style={{ width: '18px', height: '18px', color: '#1E40AF' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E40AF', lineHeight: 1.1, marginTop: '2px' }}>{inProgressCount}</div>
          </div>
        </div>

        <div className="stat-badge-mini">
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText style={{ width: '18px', height: '18px', color: '#4338CA' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Pending Review</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4338CA', lineHeight: 1.1, marginTop: '2px' }}>{pendingCount}</div>
          </div>
        </div>

        <div className="stat-badge-mini">
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock style={{ width: '18px', height: '18px', color: '#B45309' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Scheduled</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#B45309', lineHeight: 1.1, marginTop: '2px' }}>{scheduledCount}</div>
          </div>
        </div>

        <div className="stat-badge-mini">
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield style={{ width: '18px', height: '18px', color: '#047857' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Closed / Approved</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#047857', lineHeight: 1.1, marginTop: '2px' }}>{closedCount}</div>
          </div>
        </div>
      </div>

      {/* Main Layout: Split Audits List & Timeline View */}
      {isLoading ? (
        <div className="timeline-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading timeline milestones...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div className="timeline-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Unable to load timeline</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{error}</p>
          <button onClick={fetchTimelineData} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      ) : audits.length === 0 ? (
        <div className="timeline-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Clock style={{ width: '44px', height: '44px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>No audit timeline data available.</h3>
          <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>Timeline events will automatically appear here as vendor audits progress.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Audits Selection List */}
          <div className="timeline-card" style={{ padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.1s both' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem' }}>
              Select Audit ({filteredAudits.length})
            </h2>

            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search vendor or audit ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', background: 'white'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    flex: 1, padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1',
                    fontSize: '0.75rem', fontWeight: 600, color: '#0B1F3A', background: 'white'
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending Sign-off</option>
                  <option value="CLOSED">Closed</option>
                </select>

                {uniqueVendors.length > 0 && (
                  <select
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                    style={{
                      flex: 1, padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1',
                      fontSize: '0.75rem', fontWeight: 600, color: '#0B1F3A', background: 'white'
                    }}
                  >
                    <option value="ALL">All Vendors</option>
                    {uniqueVendors.map((v, i) => (
                      <option key={i} value={v}>{v}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '560px', overflowY: 'auto' }}>
              {filteredAudits.map((item) => {
                const isSelected = item.id === selectedAudit?.id;
                const st = getStatusBadgeStyle(item.status);
                const pct = item.completionPercentage !== undefined && item.completionPercentage !== null
                  ? Number(item.completionPercentage)
                  : 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAuditId(item.id)}
                    style={{
                      padding: '0.875rem 1rem', borderRadius: '10px', cursor: 'pointer',
                      border: isSelected ? '2px solid #1565C0' : '1px solid #E2E8F0',
                      background: isSelected ? '#F0F9FF' : 'white', transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <span style={{ fontWeight: 800, color: '#0B1F3A', fontSize: '0.85rem' }}>{item.vendorName}</span>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                        background: st.bg, color: st.color, border: `1px solid ${st.border}`
                      }}>
                        {st.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.auditIdString}</span>
                      <span>{item.auditPeriod}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flexGrow: 1, height: '5px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px' }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1565C0' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Timeline View */}
          {selectedAudit && (
            <div className="timeline-card" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s ease 0.15s both' }}>
              {/* Top Banner */}
              <div style={{ paddingBottom: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B1F3A', margin: 0 }}>
                      {selectedAudit.vendorName}
                    </h2>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8375rem', fontWeight: 700, color: '#1565C0', background: '#EFF6FF', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                      {selectedAudit.auditIdString}
                    </span>
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
                    Period: <strong>{selectedAudit.auditPeriod}</strong> • Auditor: <strong>{selectedAudit.auditorName}</strong> • Type: <strong>{selectedAudit.establishmentType}</strong>
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Audit Completion</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: selectedAudit.completionPercentage === 100 ? '#10B981' : '#1565C0', marginTop: '2px' }}>
                    {selectedAudit.completionPercentage || 0}%
                  </div>
                </div>
              </div>

              {/* Milestones Vertical Timeline */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.8375rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1.25rem' }}>
                  Milestones Lifecycle
                </h3>

                <div style={{ position: 'relative', paddingLeft: '1.75rem' }}>
                  {/* Vertical Connecting Line */}
                  <div style={{
                    position: 'absolute', left: '11px', top: '10px', bottom: '10px',
                    width: '2px', background: '#E2E8F0', zIndex: 0
                  }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {STANDARD_MILESTONES.map((m, idx) => {
                      const mState = getMilestoneState(idx, selectedAudit);
                      const isDone = mState.state === 'COMPLETED';
                      const isCurrent = mState.state === 'CURRENT';

                      return (
                        <div key={m.id} style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                          {/* Circle Icon */}
                          <div style={{
                            position: 'absolute', left: '-1.75rem', top: '2px',
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: isDone ? '#10B981' : (isCurrent ? '#1565C0' : 'white'),
                            border: isDone ? 'none' : (isCurrent ? '3px solid #BFDBFE' : '2px solid #CBD5E1'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {isDone ? (
                              <CheckCircle2 style={{ width: '16px', height: '16px', color: 'white' }} />
                            ) : isCurrent ? (
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                            ) : (
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#CBD5E1' }} />
                            )}
                          </div>

                          {/* Content */}
                          <div style={{
                            flexGrow: 1, padding: '0.75rem 1rem', borderRadius: '10px',
                            background: isCurrent ? '#F0F9FF' : (isDone ? '#FAFCFF' : '#F8FAFC'),
                            border: isCurrent ? '1px solid #BFDBFE' : '1px solid #F1F5F9'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isCurrent ? '#1565C0' : (isDone ? '#0B1F3A' : '#64748B') }}>
                                {m.title}
                              </span>
                              <span style={{
                                padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                                background: isDone ? '#ECFDF5' : (isCurrent ? '#EFF6FF' : '#F1F5F9'),
                                color: isDone ? '#047857' : (isCurrent ? '#1E40AF' : '#94A3B8')
                              }}>
                                {isDone ? `✓ Completed (${mState.date})` : (isCurrent ? `● Current Stage` : `○ Upcoming`)}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.775rem', color: '#64748B', margin: 0 }}>
                              {m.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Activity Log */}
              {Array.isArray(selectedAudit.timeline) && selectedAudit.timeline.length > 0 && (
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.8375rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem' }}>
                    Recent Timeline Activity Logs
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {selectedAudit.timeline.map((event: any, idx: number) => (
                      <div key={idx} style={{ padding: '0.625rem 0.875rem', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.775rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0B1F3A' }}>
                          <span>{event.event || 'Audit Event'}</span>
                          <span style={{ color: '#64748B', fontWeight: 500, fontSize: '0.725rem' }}>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        {event.notes && <div style={{ color: '#475569', marginTop: '2px' }}>{event.notes}</div>}
                        <div style={{ color: '#94A3B8', fontSize: '0.7rem', marginTop: '2px' }}>Performed by: {event.actor || 'System'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
