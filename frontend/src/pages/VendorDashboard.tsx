import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare,
  ShieldCheck, CheckCircle2, ArrowRight, Award, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getVendorDashboardStats } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const VendorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getVendorDashboardStats();
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, active: true, path: '/vendor' },
    { name: 'My Profile', icon: User, path: '/vendor/profile' },
    { name: 'My Audits', icon: FileCheck, path: '/vendor/audits' },
    { name: 'Documents', icon: FolderOpen, path: '/vendor/documents' },
    { name: 'Findings & Actions', icon: AlertTriangle, path: '/vendor/findings' },
    { name: 'Audit Timeline', icon: Clock, path: '/vendor/timeline' },
    { name: 'Reports', icon: BarChart3, path: '/vendor/reports' },
    { name: 'Notifications', icon: Bell, path: '/vendor/notifications' },
    { name: 'Contact Auditor', icon: MessageSquare, path: '/vendor/contact' }
  ];

  const getStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'closed' || s === 'approved') {
      return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', text: status || 'Closed' };
    }
    if (s === 'pending sign-off') {
      return { bg: '#F3E8FF', color: '#6B21A8', border: '#E9D5FF', text: 'Pending Sign-off' };
    }
    if (s === 'in progress') {
      return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', text: 'In Progress' };
    }
    return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', text: status || 'Scheduled' };
  };

  const getProgressPercentage = (auditObj?: any) => {
    if (!auditObj) return 0;
    if (auditObj.completionPercentage !== undefined && auditObj.completionPercentage !== null) {
      return Number(auditObj.completionPercentage);
    }
    const s = (auditObj.status || '').toLowerCase();
    if (s === 'closed' || s === 'approved' || s === 'completed') return 100;

    const items = auditObj.nonCompliantItems || [];
    if (items.length === 0) {
      if (s === 'pending sign-off') return 100;
      if (s === 'in progress') return 60;
      if (s === 'scheduled') return 15;
      return 0;
    }

    const respondedCount = items.filter((i: any) => 
      (i.vendorResponse && String(i.vendorResponse).trim().length > 0) || 
      i.status === 'Responded'
    ).length;

    if (s === 'pending sign-off') {
      if (respondedCount >= items.length) return 100;
      return Math.min(99, 80 + Math.round((respondedCount / items.length) * 20));
    }
    if (s === 'in progress') {
      return Math.min(79, 50 + Math.round((respondedCount / items.length) * 30));
    }
    if (s === 'scheduled') return 15;
    return 0;
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
          <div style={{
            width: '42px', height: '42px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  const activeAudit = stats?.activeAudit;
  const statusInfo = getStatusBadge(activeAudit?.status);
  const progressPct = getProgressPercentage(activeAudit);

  return (
    <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Header Banner */}
      <div style={{ marginBottom: '1.75rem', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
              Welcome back, {user?.name || 'Vendor'} 👋
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
              Vendor Compliance Overview & Real-Time Operational Audit Status
            </p>
          </div>
          <button
            onClick={() => navigate('/vendor/audits')}
            style={{
              padding: '0.625rem 1.25rem', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
              color: 'white', fontWeight: 700, fontSize: '0.8375rem', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(21, 101, 192, 0.25)', transition: 'all 0.2s ease'
            }}
          >
            View All Audits
            <ArrowRight style={{ width: '15px', height: '15px' }} />
          </button>
        </div>
      </div>

      {/* Hero Active Audit Card */}
      {activeAudit ? (
        <div style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          borderRadius: '16px', border: '1px solid #E2E8F0',
          padding: '1.5rem', marginBottom: '1.75rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden',
          animation: 'fadeIn 0.4s ease 0.1s both'
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '100%', background: 'radial-gradient(circle at top right, rgba(21,101,192,0.06), transparent 70%)', pointerEvents: 'none' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ShieldCheck style={{ width: '26px', height: '26px', color: '#1565C0' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B1F3A', margin: 0 }}>
                    Active Audit: {activeAudit.auditPeriod}
                  </h2>
                  <span style={{
                    background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.border}`,
                    padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700
                  }}>
                    {statusInfo.text}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8375rem', color: '#64748B' }}>
                  <span>Assigned Auditor: <strong style={{ color: '#0B1F3A' }}>{activeAudit.auditorName || activeAudit.auditor || 'Auditor'}</strong></span>
                  {activeAudit.createdAt && (
                    <span>• Initiated: <strong style={{ color: '#0B1F3A' }}>{new Date(activeAudit.createdAt).toLocaleDateString()}</strong></span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/vendor/audits/${activeAudit.id}`)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', background: 'white',
                border: '1px solid #CBD5E1', color: '#1E293B', fontWeight: 700,
                fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem'
              }}
            >
              Audit Workspace
              <ArrowRight style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', fontWeight: 700, color: '#475569', marginBottom: '0.375rem' }}>
              <span>AUDIT LIFECYCLE PROGRESS</span>
              <span>{progressPct}% COMPLETED</span>
            </div>
            <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #1565C0 0%, #2563EB 100%)',
                borderRadius: '999px', transition: 'width 0.6s ease'
              }} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
          padding: '2.5rem 1.5rem', textAlign: 'center', marginBottom: '1.75rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)', animation: 'fadeIn 0.4s ease 0.1s both'
        }}>
          <FileCheck style={{ width: '40px', height: '40px', color: '#94A3B8', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>No Active Audit Scheduled</h3>
          <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>
            You currently have no compliance audits scheduled or in progress.
          </p>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem', animation: 'fadeIn 0.4s ease 0.15s both' }}>
        {/* Progress Card */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Progress</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock style={{ width: '18px', height: '18px', color: '#1565C0' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1565C0', lineHeight: 1 }}>
            {activeAudit ? `${progressPct}%` : '--%'}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.375rem 0 0 0' }}>Overall completion status</p>
        </div>

        {/* Documents Card */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Documents</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderOpen style={{ width: '18px', height: '18px', color: '#16A34A' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0B1F3A', lineHeight: 1 }}>
            {stats?.totalDocuments || 0}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.375rem 0 0 0' }}>Total uploaded files</p>
        </div>

        {/* Open Findings Card */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Open Findings</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: stats?.openFindings > 0 ? '#FEF2F2' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle style={{ width: '18px', height: '18px', color: stats?.openFindings > 0 ? '#DC2626' : '#16A34A' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stats?.openFindings > 0 ? '#DC2626' : '#0B1F3A', lineHeight: 1 }}>
            {stats?.openFindings || 0}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.375rem 0 0 0' }}>
            {stats?.openFindings > 0 ? 'Requires vendor action' : 'No pending observations'}
          </p>
        </div>

        {/* Compliance Score Card */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Compliance Score</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award style={{ width: '18px', height: '18px', color: '#7C3AED' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: activeAudit?.score != null ? '#16A34A' : '#0B1F3A', lineHeight: 1 }}>
            {activeAudit?.score != null ? `${Math.round(activeAudit.score)}%` : '--%'}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.375rem 0 0 0' }}>Latest calculated score</p>
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', animation: 'fadeIn 0.4s ease 0.2s both' }}>
        {/* Required Documents */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 6px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFCFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderOpen style={{ width: '18px', height: '18px', color: '#1565C0' }} />
              <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1rem', margin: 0 }}>Required Documents</h3>
            </div>
            <button onClick={() => navigate('/vendor/documents')} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1565C0', background: 'none', border: 'none', cursor: 'pointer' }}>
              Manage →
            </button>
          </div>
          <div style={{ padding: '1.25rem' }}>
            {activeAudit?.documents && activeAudit.documents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeAudit.documents.slice(0, 5).map((doc: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FolderOpen style={{ width: '18px', height: '18px', color: '#2563EB' }} />
                      <div>
                        <div style={{ fontSize: '0.8375rem', fontWeight: 700, color: '#0B1F3A' }}>{doc.fileName}</div>
                        <div style={{ fontSize: '0.725rem', color: '#64748B' }}>{doc.type || 'Compliance Document'}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                      {doc.status || 'Uploaded'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <FolderOpen style={{ width: '32px', height: '32px', color: '#CBD5E1', margin: '0 auto 0.5rem' }} />
                <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>No document requests attached to current audit.</p>
              </div>
            )}
          </div>
        </div>

        {/* Findings & Actions */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 6px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFCFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle style={{ width: '18px', height: '18px', color: '#DC2626' }} />
              <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1rem', margin: 0 }}>Findings & Actions</h3>
            </div>
            <button onClick={() => navigate('/vendor/findings')} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1565C0', background: 'none', border: 'none', cursor: 'pointer' }}>
              Respond →
            </button>
          </div>
          <div style={{ padding: '1.25rem' }}>
            {activeAudit?.nonCompliantItems && activeAudit.nonCompliantItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '240px', overflowY: 'auto' }}>
                {activeAudit.nonCompliantItems.map((item: any, i: number) => (
                  <div key={i} style={{ padding: '0.875rem 1rem', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                        {item.category || item.type || 'General'}
                      </span>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: item.vendorResponse ? '#047857' : '#B45309' }}>
                        {item.vendorResponse ? 'Responded' : 'Action Required'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8375rem', fontWeight: 700, color: '#0B1F3A' }}>
                      {item.item || item.title || item.particulars}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircle2 style={{ width: '32px', height: '32px', color: '#10B981', margin: '0 auto 0.5rem' }} />
                <h4 style={{ fontSize: '0.925rem', fontWeight: 800, color: '#047857', margin: '0 0 0.25rem' }}>No Open Findings</h4>
                <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>All observations are clear and up to date.</p>
              </div>
            )}
          </div>
        </div>

        {/* Audit Timeline Card */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 6px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFCFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity style={{ width: '18px', height: '18px', color: '#1565C0' }} />
              <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1rem', margin: 0 }}>Recent Activity</h3>
            </div>
            <button onClick={() => navigate('/vendor/timeline')} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1565C0', background: 'none', border: 'none', cursor: 'pointer' }}>
              Timeline →
            </button>
          </div>
          <div style={{ padding: '1.25rem' }}>
            {activeAudit?.timeline && activeAudit.timeline.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', maxHeight: '240px', overflowY: 'auto' }}>
                {activeAudit.timeline.slice().reverse().slice(0, 4).map((event: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1565C0', marginTop: '6px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.8375rem', fontWeight: 700, color: '#0B1F3A' }}>{event.event}</div>
                      <div style={{ fontSize: '0.725rem', color: '#64748B' }}>{new Date(event.timestamp).toLocaleString()}</div>
                      {event.notes && <div style={{ fontSize: '0.775rem', color: '#475569', marginTop: '0.15rem' }}>{event.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <Clock style={{ width: '32px', height: '32px', color: '#CBD5E1', margin: '0 auto 0.5rem' }} />
                <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>No timeline activities logged yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Scorecard / Final Result */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 6px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFCFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award style={{ width: '18px', height: '18px', color: '#7C3AED' }} />
              <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1rem', margin: 0 }}>Scorecard Summary</h3>
            </div>
            <button onClick={() => navigate('/vendor/reports')} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1565C0', background: 'none', border: 'none', cursor: 'pointer' }}>
              Reports →
            </button>
          </div>
          <div style={{ padding: '1.25rem' }}>
            {activeAudit?.summary ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                  border: '3px solid #16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 0.75rem', fontSize: '1.375rem', fontWeight: 800, color: '#15803D'
                }}>
                  {Math.round(activeAudit.summary.score)}%
                </div>
                <div style={{ fontSize: '0.925rem', fontWeight: 800, color: '#0B1F3A', marginBottom: '0.25rem' }}>Compliance Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem', textAlign: 'left' }}>
                  <div style={{ padding: '0.625rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Applicable Items</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0B1F3A' }}>{activeAudit.summary.applicableItems || 0}</div>
                  </div>
                  <div style={{ padding: '0.625rem', background: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Compliant Items</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>{activeAudit.summary.compliantItems || 0}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <Award style={{ width: '32px', height: '32px', color: '#CBD5E1', margin: '0 auto 0.5rem' }} />
                <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>Final score available once audit checklist is evaluated.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

