import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare,
  CheckCircle2, PlayCircle, Calendar, ArrowRight, ShieldCheck, UserCheck, Building2, Layers
} from 'lucide-react';
import { getVendorDashboardStats, getVendorAudits, getAuditorContact } from '../services/api';

interface Milestone {
  id: number;
  name: string;
  description: string;
  key: string;
  state: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING';
  date?: string;
}

export const VendorTimeline: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [audits, setAudits] = useState<any[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [auditorContact, setAuditorContact] = useState<any>(null);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor' },
    { name: 'My Profile', icon: User, path: '/vendor/profile' },
    { name: 'My Audits', icon: FileCheck, path: '/vendor/audits' },
    { name: 'Documents', icon: FolderOpen, path: '/vendor/documents' },
    { name: 'Findings & Actions', icon: AlertTriangle, path: '/vendor/findings' },
    { name: 'Audit Timeline', icon: Clock, active: true, path: '/vendor/timeline' },
    { name: 'Reports', icon: BarChart3, path: '/vendor/reports' },
    { name: 'Notifications', icon: Bell, path: '/vendor/notifications' },
    { name: 'Contact Auditor', icon: MessageSquare, path: '/vendor/contact' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [auditsRes, contactRes] = await Promise.all([
          getVendorAudits().catch(() => ({ success: false, data: [] })),
          getAuditorContact().catch(() => ({ success: false }))
        ]);

        if (auditsRes.success && Array.isArray(auditsRes.data) && auditsRes.data.length > 0) {
          const auditList = auditsRes.data;
          setAudits(auditList);
          
          // Default select audit with findings or non-scheduled status first, or the first audit
          const activeOrPending = auditList.find((a: any) => 
            ['pending sign-off', 'in progress', 'closed'].includes((a.status || '').toLowerCase())
          ) || auditList[0];

          setSelectedAuditId(activeOrPending.id);
        }

        if (contactRes.success && contactRes.data) {
          setAuditorContact(contactRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch timeline data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeAudit = audits.find(a => a.id === selectedAuditId) || (audits.length > 0 ? audits[0] : null);

  // Determine stage & lifecycle progress dynamically from real audit status
  const getStageInfo = (auditObj: any) => {
    if (!auditObj) return { currentIdx: 2, progress: 15, label: 'Audit Scheduled' };
    const s = (auditObj.status || '').toLowerCase();
    
    if (s === 'closed' || s === 'approved' || s === 'completed') {
      return { currentIdx: 9, progress: 100, label: 'Audit Closed' };
    }

    const items = auditObj.nonCompliantItems || [];
    const respondedCount = items.filter((i: any) => 
      (i.vendorResponse && String(i.vendorResponse).trim().length > 0) || 
      i.status === 'Responded'
    ).length;

    if (s === 'scheduled') {
      return { currentIdx: 2, progress: 15, label: 'Audit Scheduled' };
    }

    if (s === 'in progress') {
      return { currentIdx: 5, progress: 50, label: 'Live Audit / Audit In Progress' };
    }

    if (s === 'pending sign-off') {
      if (items.length > 0 && respondedCount >= items.length) {
        return { currentIdx: 8, progress: 100, label: 'Final Approval (Pending Auditor Sign-off)' };
      }
      if (items.length === 0) {
        return { currentIdx: 8, progress: 100, label: 'Final Approval (Pending Auditor Sign-off)' };
      }
      const calcProgress = Math.min(99, 80 + Math.round((respondedCount / items.length) * 20));
      return { currentIdx: 7, progress: calcProgress, label: `Corrective Actions (${respondedCount}/${items.length})` };
    }

    return { currentIdx: 2, progress: 15, label: 'Audit Scheduled' };
  };

  const currentStageInfo = activeAudit ? getStageInfo(activeAudit) : { currentIdx: 2, progress: 15, label: 'Audit Scheduled' };

  // Define 10 lifecycle milestones
  const rawMilestones = [
    { id: 1, name: 'Vendor Registration', description: 'Vendor account created and verified on Compliance Platform.', key: 'registration' },
    { id: 2, name: 'Introduction / Orientation Deck Sent', description: 'Compliance audit guidelines and orientation material shared.', key: 'orientation' },
    { id: 3, name: 'Audit Scheduled', description: 'Audit timeline, period, and assigned auditor confirmed.', key: 'scheduled' },
    { id: 4, name: 'Documents Requested', description: 'Checklist statutory documents requested for auditor review.', key: 'docs_requested' },
    { id: 5, name: 'Documents Submitted', description: 'Vendor uploads required compliance registers and licenses.', key: 'docs_submitted' },
    { id: 6, name: 'Live Audit / Audit In Progress', description: 'Auditor evaluates responses and inspects uploaded evidence.', key: 'live_audit' },
    { id: 7, name: 'Auditor Submitted', description: 'Auditor completes score calculation and non-compliance findings.', key: 'auditor_submitted' },
    { id: 8, name: 'Reviewer / Sign-off', description: 'Management sign-off and final quality review of audit findings.', key: 'reviewer_signoff' },
    { id: 9, name: 'Final Approval', description: 'Audit results approved and compliance certificate generated.', key: 'final_approval' },
    { id: 10, name: 'Audit Closed', description: 'Audit cycle officially closed and final PDF report released.', key: 'audit_closed' }
  ];

  // Map state and real timeline dates
  const milestones: Milestone[] = rawMilestones.map((m, idx) => {
    let state: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' = 'UPCOMING';
    if (idx < currentStageInfo.currentIdx) {
      state = 'COMPLETED';
    } else if (idx === currentStageInfo.currentIdx) {
      state = 'IN_PROGRESS';
    }

    // Try to match timestamp from real audit timeline array
    let date = undefined;
    if (activeAudit && activeAudit.timeline && Array.isArray(activeAudit.timeline)) {
      const match = activeAudit.timeline.find((t: any) => 
        (t.event || '').toLowerCase().includes(m.name.toLowerCase()) ||
        (t.status || '').toLowerCase().includes(m.key)
      );
      if (match && match.timestamp) {
        date = new Date(match.timestamp).toLocaleDateString();
      }
    }

    // Fallback date for completed milestones if not explicitly in timeline array
    if (!date && state === 'COMPLETED' && activeAudit?.createdAt) {
      date = new Date(activeAudit.createdAt).toLocaleDateString();
    }

    return { ...m, state, date };
  });

  const currentMilestone = milestones.find(m => m.state === 'IN_PROGRESS') || milestones[milestones.length - 1];
  const nextMilestone = milestones.find((m, i) => i > milestones.findIndex(x => x.state === 'IN_PROGRESS'));

  if (isLoading) {
    return (
      <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '240px' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(21, 101, 192, 0.4); } 50% { box-shadow: 0 0 0 8px rgba(21, 101, 192, 0); } }
      `}</style>

      {/* Header Banner */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock style={{ width: '20px', height: '20px', color: '#1565C0' }} />
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>AUDIT TIMELINE</h1>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, paddingLeft: '2.875rem' }}>
          Real-time lifecycle milestones and stage progress tracking for your compliance audit.
        </p>
      </div>

      {/* Audit Switcher Selector Bar */}
      {audits.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem',
          background: 'white', padding: '0.75rem 1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)', animation: 'fadeIn 0.35s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8375rem', fontWeight: 700, color: '#0B1F3A', flexShrink: 0 }}>
            <Layers style={{ width: '16px', height: '16px', color: '#1565C0' }} />
            Select Audit Period:
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {audits.map((a) => {
              const isSelected = a.id === activeAudit?.id;
              const statusLower = (a.status || '').toLowerCase();
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAuditId(a.id)}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: '8px',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                    background: isSelected ? 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)' : '#F8FAFC',
                    color: isSelected ? 'white' : '#475569',
                    border: `1px solid ${isSelected ? '#1565C0' : '#E2E8F0'}`,
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    transition: 'all 0.2s ease', boxShadow: isSelected ? '0 2px 8px rgba(21, 101, 192, 0.25)' : 'none'
                  }}
                >
                  <span>{a.auditPeriod}</span>
                  <span style={{
                    fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: '4px',
                    background: isSelected ? 'rgba(255,255,255,0.2)' : '#E2E8F0',
                    color: isSelected ? 'white' : '#64748B'
                  }}>
                    {a.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact Audit Summary Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0B1F3A 0%, #1565C0 100%)',
        borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem',
        color: 'white', boxShadow: '0 4px 14px rgba(11, 31, 58, 0.15)', animation: 'fadeIn 0.4s ease 0.1s both'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {activeAudit?.auditIdString || `#${(activeAudit?.id || 'AUD-2026-0001').slice(-8)}`}
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', color: 'white' }}>
              {activeAudit?.auditPeriod || 'Q3 2026 Compliance Audit'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              padding: '0.35rem 0.875rem', borderRadius: '999px',
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.8rem', fontWeight: 700
            }}>
              Status: {activeAudit?.status || 'Scheduled'}
            </span>
            <span style={{
              padding: '0.35rem 0.875rem', borderRadius: '999px',
              background: currentStageInfo.progress === 100 ? '#10B981' : '#3B82F6', color: 'white', fontSize: '0.8rem', fontWeight: 800
            }}>
              {currentStageInfo.progress}% Complete
            </span>
          </div>
        </div>

        {/* Audit Details Summary Row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem',
          paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: '0.8125rem'
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.725rem', fontWeight: 600, textTransform: 'uppercase' }}>Vendor Name</div>
            <div style={{ fontWeight: 700, marginTop: '2px' }}>{activeAudit?.vendorName || 'Vendor'}</div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.725rem', fontWeight: 600, textTransform: 'uppercase' }}>Establishment Type</div>
            <div style={{ fontWeight: 700, marginTop: '2px' }}>{activeAudit?.establishmentType || 'Factory'}</div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.725rem', fontWeight: 600, textTransform: 'uppercase' }}>Start Date</div>
            <div style={{ fontWeight: 700, marginTop: '2px' }}>{activeAudit?.startDate || 'N/A'}</div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.725rem', fontWeight: 600, textTransform: 'uppercase' }}>Due Date</div>
            <div style={{ fontWeight: 700, marginTop: '2px' }}>{activeAudit?.dueDate || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
        padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', animation: 'fadeIn 0.4s ease 0.15s both'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B1F3A' }}>Audit Progress</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1565C0' }}>{currentStageInfo.progress}%</span>
        </div>

        <div style={{ height: '10px', borderRadius: '999px', background: '#F1F5F9', overflow: 'hidden', marginBottom: '1rem' }}>
          <div style={{
            height: '100%', borderRadius: '999px', width: `${currentStageInfo.progress}%`,
            background: 'linear-gradient(90deg, #1565C0 0%, #10B981 100%)',
            transition: 'width 0.8s ease'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8375rem' }}>
          <div>
            <span style={{ color: '#64748B' }}>Current Stage: </span>
            <strong style={{ color: '#1565C0' }}>{currentMilestone.name}</strong>
          </div>
          {nextMilestone && (
            <div>
              <span style={{ color: '#64748B' }}>Next Stage: </span>
              <strong style={{ color: '#0B1F3A' }}>{nextMilestone.name}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Current Status Card & Next Milestone Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', animation: 'fadeIn 0.4s ease 0.2s both' }}>
        {/* Current Audit Status Card */}
        <div style={{ background: '#EFF6FF', borderRadius: '16px', border: '1px solid #BFDBFE', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PlayCircle style={{ width: '22px', height: '22px', color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Current Audit Status
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0B1F3A', marginBottom: '4px' }}>
              {activeAudit?.status || 'Scheduled'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#1E3A8A' }}>
              Current Milestone: <strong>{currentMilestone.name}</strong>
            </div>
          </div>
        </div>

        {/* Next Milestone Card */}
        <div style={{ background: '#FAFCFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowRight style={{ width: '22px', height: '22px', color: '#059669' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Next Action / What's Next
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0B1F3A', marginBottom: '4px' }}>
              {nextMilestone ? nextMilestone.name : 'Audit Completion'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
              {nextMilestone ? nextMilestone.description : 'All audit milestones completed successfully.'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Vertical Milestone Timeline + Compact Audit Contacts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Vertical Timeline Card */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.5rem', animation: 'fadeIn 0.4s ease 0.25s both'
        }}>
          <h3 style={{ fontWeight: 800, color: '#0B1F3A', fontSize: '1.125rem', margin: '0 0 1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
            Lifecycle Milestone Timeline ({activeAudit?.auditPeriod})
          </h3>

          <div style={{ position: 'relative', paddingLeft: '2rem' }}>
            {/* Vertical connector line */}
            <div style={{
              position: 'absolute', left: '15px', top: '15px', bottom: '25px',
              width: '3px', background: '#E2E8F0', borderRadius: '999px'
            }} />

            {milestones.map((m, idx) => {
              const isCompleted = m.state === 'COMPLETED';
              const isInProgress = m.state === 'IN_PROGRESS';
              const isUpcoming = m.state === 'UPCOMING';

              return (
                <div key={m.id} style={{ position: 'relative', marginBottom: idx < milestones.length - 1 ? '1.5rem' : 0 }}>
                  {/* Milestone Icon Node */}
                  <div style={{
                    position: 'absolute', left: '-2rem', top: '0',
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isCompleted ? '#ECFDF5' : isInProgress ? '#1565C0' : '#F8FAFC',
                    border: `2px solid ${isCompleted ? '#10B981' : isInProgress ? '#1565C0' : '#CBD5E1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2,
                    animation: isInProgress ? 'pulseGlow 2s infinite' : 'none'
                  }}>
                    {isCompleted ? (
                      <CheckCircle2 style={{ width: '18px', height: '18px', color: '#10B981' }} />
                    ) : isInProgress ? (
                      <PlayCircle style={{ width: '18px', height: '18px', color: 'white' }} />
                    ) : (
                      <Clock style={{ width: '16px', height: '16px', color: '#94A3B8' }} />
                    )}
                  </div>

                  {/* Milestone Card Body */}
                  <div style={{
                    padding: '1rem 1.25rem', borderRadius: '12px',
                    background: isInProgress ? '#EFF6FF' : isCompleted ? '#FFFFFF' : '#FAFCFF',
                    border: `1px solid ${isInProgress ? '#BFDBFE' : isCompleted ? '#E2E8F0' : '#F1F5F9'}`,
                    boxShadow: isInProgress ? '0 2px 8px rgba(21, 101, 192, 0.08)' : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.375rem' }}>
                      <h4 style={{
                        fontSize: '0.95rem', fontWeight: 800,
                        color: isInProgress ? '#1565C0' : isCompleted ? '#0B1F3A' : '#64748B',
                        margin: 0
                      }}>
                        {m.name}
                      </h4>

                      {/* Status Badge */}
                      <span style={{
                        padding: '0.15rem 0.625rem', borderRadius: '999px',
                        fontSize: '0.725rem', fontWeight: 700,
                        background: isCompleted ? '#ECFDF5' : isInProgress ? '#1565C0' : '#F1F5F9',
                        color: isCompleted ? '#065F46' : isInProgress ? 'white' : '#64748B',
                        border: isCompleted ? '1px solid #A7F3D0' : 'none'
                      }}>
                        {isCompleted ? '✓ Completed' : isInProgress ? 'In Progress' : 'Upcoming'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: isUpcoming ? '#94A3B8' : '#475569', margin: '0 0 0.5rem', lineHeight: 1.45 }}>
                      {m.description}
                    </p>

                    {m.date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                        <Calendar style={{ width: '13px', height: '13px', color: '#94A3B8' }} />
                        {m.date}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compact Audit Contacts Section */}
        <div style={{ position: 'sticky', top: '1.5rem', animation: 'fadeIn 0.4s ease 0.3s both' }}>
          <div style={{
            background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem', paddingBottom: '0.625rem', borderBottom: '1px solid #F1F5F9' }}>
              <ShieldCheck style={{ width: '18px', height: '18px', color: '#1565C0' }} />
              <h3 style={{ fontWeight: 800, color: '#0B1F3A', fontSize: '1rem', margin: 0 }}>Audit Contacts</h3>
            </div>

            {/* Auditor Contact */}
            <div style={{ padding: '0.875rem', borderRadius: '10px', background: '#FAFCFF', border: '1px solid #F1F5F9', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck style={{ width: '14px', height: '14px', color: '#1565C0' }} />
                </div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Assigned Auditor</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B1F3A' }}>
                {auditorContact?.name || activeAudit?.auditorName || activeAudit?.auditor || 'ww'}
              </div>
              <div style={{ fontSize: '0.775rem', color: '#64748B', marginTop: '2px' }}>
                {auditorContact?.email || 'ww@gmail.com'}
              </div>
            </div>

            {/* Customer / Client Contact */}
            <div style={{ padding: '0.875rem', borderRadius: '10px', background: '#FAFCFF', border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 style={{ width: '14px', height: '14px', color: '#7C3AED' }} />
                </div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Customer / Client</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B1F3A' }}>
                {activeAudit?.customerName || activeAudit?.organisation || 'cc'}
              </div>
              <div style={{ fontSize: '0.775rem', color: '#64748B', marginTop: '2px' }}>
                Primary Client Account
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

