import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare, 
  ArrowLeft, CheckCircle2, Calendar, Building2, UserCheck, 
  Hash, Shield, ChevronRight, Info
} from 'lucide-react';
import { getVendorAuditById } from '../services/api';

export const VendorAuditDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [audit, setAudit] = useState<any>(null);

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
    const fetchAuditDetails = async () => {
      try {
        if (id) {
          const response = await getVendorAuditById(id);
          if (response.success && response.data) {
            setAudit(response.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch audit details', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAuditDetails();
  }, [id]);

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

  const getProgressPercent = (auditObj: any) => {
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '64px', marginTop: '120px' }}>
          <div style={{ 
            width: '48px', height: '48px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  if (!audit) {
    return (
      <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
        <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <AlertTriangle style={{ width: '36px', height: '36px', color: '#EF4444' }} />
          </div>
          <h2 style={{ fontWeight: 800, color: '#0B1F3A', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Audit Not Found</h2>
          <p style={{ color: '#64748B', margin: '0 0 2rem' }}>The audit you are looking for does not exist or you don't have access.</p>
          <Link to="/vendor/audits" style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.5rem', borderRadius: '10px',
            background: '#1565C0', color: 'white', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem'
          }}>
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Back to Audits
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusCfg = getStatusConfig(audit.status);
  const progress = getProgressPercent(audit);
  const hasScore = audit.score != null;
  const scoreColor = hasScore ? getScoreColor(audit.score) : '#94A3B8';

  return (
    <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8375rem', color: '#94A3B8' }}>
        <Link to="/vendor/audits" style={{ color: '#94A3B8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 500, transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#1565C0'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#94A3B8'}
        >
          <ArrowLeft style={{ width: '13px', height: '13px' }} /> My Audits
        </Link>
        <ChevronRight style={{ width: '13px', height: '13px' }} />
        <span style={{ color: '#0B1F3A', fontWeight: 600 }}>{audit.auditPeriod}</span>
      </div>

      {/* Hero Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0B1F3A 0%, #1565C0 100%)',
        borderRadius: '20px', padding: '2rem', marginBottom: '1.75rem',
        position: 'relative', overflow: 'hidden', animation: 'fadeIn 0.4s ease'
      }}>
        {/* Background decorative circles */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', right: '120px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '0.3rem 0.75rem', borderRadius: '999px',
                background: `${statusCfg.dot}25`, color: statusCfg.dot,
                border: `1px solid ${statusCfg.dot}50`,
                fontSize: '0.75rem', fontWeight: 700
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusCfg.dot }} />
                {statusCfg.label}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                {audit.auditIdString || `#${(audit.id || '').slice(-8)}`}
              </span>
            </div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'white', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
              Audit Details: {audit.auditPeriod}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem' }}>
                <Building2 style={{ width: '14px', height: '14px' }} />
                {audit.establishmentType || 'N/A'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem' }}>
                <Calendar style={{ width: '14px', height: '14px' }} />
                {audit.startDate} → {audit.dueDate}
              </div>
            </div>
          </div>

          {/* Score Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '84px', height: '84px', borderRadius: '50%',
              border: `4px solid ${hasScore ? scoreColor : 'rgba(255,255,255,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${hasScore ? scoreColor : 'rgba(255,255,255,0.05)'}18`,
              flexShrink: 0
            }}>
              {hasScore ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.375rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{Math.round(audit.score)}%</div>
                  <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>SCORE</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <BarChart3 style={{ width: '24px', height: '24px', color: 'rgba(255,255,255,0.3)', margin: '0 auto' }} />
                  <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>PENDING</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Audit Progress</span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', borderRadius: '999px', width: `${progress}%`,
              background: progress === 100 ? '#10B981' : 'linear-gradient(90deg, #60A5FA, #A78BFA)',
              transition: 'width 1s ease', boxShadow: '0 0 8px rgba(147,197,253,0.5)'
            }} />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* General Information */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', animation: 'fadeIn 0.5s ease 0.1s both' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info style={{ width: '16px', height: '16px', color: '#1565C0' }} />
            </div>
            <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1rem', margin: 0 }}>General Information</h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {[
                { label: 'Customer / Client', value: audit.customerName || audit.organisation || audit.customer || 'N/A', icon: UserCheck, color: '#1565C0', bg: '#EFF6FF' },
                { label: 'Auditor Assigned', value: audit.auditorName || audit.auditor || 'N/A', icon: Shield, color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'Establishment Type', value: audit.establishmentType || 'N/A', icon: Building2, color: '#0891B2', bg: '#ECFEFF' },
                { label: 'Audit Period', value: audit.auditPeriod, icon: Clock, color: '#D97706', bg: '#FFFBEB' },
                { label: 'Start Date', value: audit.startDate || 'N/A', icon: Calendar, color: '#059669', bg: '#ECFDF5' },
                { label: 'Due Date', value: audit.dueDate || 'N/A', icon: Calendar, color: '#DC2626', bg: '#FEF2F2' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.875rem 1rem', background: '#FAFCFF', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon style={{ width: '15px', height: '15px', color: item.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7375rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                      {item.label}
                    </div>
                    <div style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '0.9375rem' }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compliance Score Card */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', animation: 'fadeIn 0.5s ease 0.2s both' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 style={{ width: '16px', height: '16px', color: '#7C3AED' }} />
            </div>
            <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1rem', margin: 0 }}>Compliance Score</h3>
          </div>
          <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {hasScore ? (
              <>
                <div style={{ 
                  position: 'relative', width: '120px', height: '120px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}>
                  <svg width="120" height="120" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - audit.score / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                    />
                  </svg>
                  <div style={{ zIndex: 1 }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{Math.round(audit.score)}%</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#0B1F3A', marginBottom: '0.375rem' }}>
                  {audit.score >= 85 ? 'Excellent' : audit.score >= 70 ? 'Good' : 'Needs Improvement'}
                </div>
                <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>
                  Audit evaluation complete
                </p>
              </>
            ) : (
              <div style={{ padding: '1.5rem 0' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F8FAFC', border: '2px dashed #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <BarChart3 style={{ width: '32px', height: '32px', color: '#CBD5E1' }} />
                </div>
                <div style={{ fontWeight: 700, color: '#94A3B8', marginBottom: '0.375rem' }}>Score Pending</div>
                <p style={{ color: '#CBD5E1', fontSize: '0.8rem', margin: 0 }}>Awaiting audit completion</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Audit Score Breakdown */}
      {hasScore && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', animation: 'fadeIn 0.5s ease 0.25s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 style={{ width: '16px', height: '16px', color: '#059669' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Detailed Score Breakdown</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>Granular compliance metrics evaluated by auditor scoring engine</p>
            </div>
          </div>

          {/* Compliance Summary Counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Requirements', value: audit.summary?.totalItems ?? audit.totalRequirements ?? 'N/A', color: '#0B1F3A', bg: '#F8FAFC', border: '#E2E8F0' },
              { label: 'Applicable Items', value: audit.summary?.applicableItems ?? audit.applicableItems ?? 'N/A', color: '#1565C0', bg: '#EFF6FF', border: '#BFDBFE' },
              { label: 'Compliant Items', value: audit.summary?.compliantItems ?? audit.compliantItems ?? 'N/A', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              { label: 'Non-Compliant Items', value: audit.summary?.nonCompliantItems ?? (audit.nonCompliantItems ? audit.nonCompliantItems.length : 0), color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
              { label: 'N/A Items', value: audit.summary?.naItems ?? 'N/A', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' }
            ].map((stat, idx) => (
              <div key={idx} style={{ padding: '0.875rem 1rem', borderRadius: '12px', background: stat.bg, border: `1px solid ${stat.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: '1.375rem', fontWeight: 800, color: stat.color, lineHeight: 1.2 }}>{stat.value}</div>
                <div style={{ fontSize: '0.725rem', fontWeight: 600, color: stat.color, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Critical vs General Scores Cards */}
          {(audit.critical || audit.general) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* Critical Score */}
              <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Critical Compliance</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7F1D1D', marginTop: '2px' }}>
                    {audit.critical?.scoreDisplay ?? (audit.critical?.score != null ? `${Math.round(audit.critical.score)}%` : 'N/A')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#991B1B', fontWeight: 500 }}>
                  <div>Compliant: <strong>{audit.critical?.compliantItems ?? 'N/A'}</strong></div>
                  <div>Applicable: <strong>{audit.critical?.applicableItems ?? 'N/A'}</strong></div>
                </div>
              </div>

              {/* General Score */}
              <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>General Compliance</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E3A8A', marginTop: '2px' }}>
                    {audit.general?.scoreDisplay ?? (audit.general?.score != null ? `${Math.round(audit.general.score)}%` : 'N/A')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#1E40AF', fontWeight: 500 }}>
                  <div>Compliant: <strong>{audit.general?.compliantItems ?? 'N/A'}</strong></div>
                  <div>Applicable: <strong>{audit.general?.applicableItems ?? 'N/A'}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Labour Code & Section Scores Table */}
          {(audit.categoryScores || audit.labourCodes || audit.sections) && (audit.categoryScores || audit.labourCodes || audit.sections).length > 0 && (
            <div>
              <h4 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '0.925rem', marginBottom: '0.75rem' }}>Labour Code & Section Breakdown</h4>
              <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Labour Code / Category</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Applicable</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Compliant</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Non-Compliant</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>N/A</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(audit.categoryScores || audit.labourCodes || audit.sections).map((cat: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFCFF' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0B1F3A' }}>{cat.category || cat.section || cat.labourCode || 'General'}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748B' }}>{cat.totalItems ?? 'N/A'}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#1565C0', fontWeight: 600 }}>{cat.applicableItems ?? 'N/A'}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#059669', fontWeight: 600 }}>{cat.compliantItems ?? 'N/A'}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: cat.nonCompliantItems > 0 ? '#DC2626' : '#64748B', fontWeight: cat.nonCompliantItems > 0 ? 700 : 400 }}>{cat.nonCompliantItems ?? 'N/A'}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#D97706' }}>{cat.naItems ?? 'N/A'}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: cat.score != null ? (cat.score >= 85 ? '#059669' : cat.score >= 70 ? '#D97706' : '#DC2626') : '#94A3B8' }}>
                          {cat.scoreDisplay ?? (cat.score != null ? `${Math.round(cat.score)}%` : 'N/A')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Section: Timeline + Findings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Audit Timeline */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', animation: 'fadeIn 0.5s ease 0.3s both' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock style={{ width: '16px', height: '16px', color: '#D97706' }} />
            </div>
            <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1rem', margin: 0 }}>Audit Timeline</h3>
          </div>
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {audit.timeline && audit.timeline.length > 0 ? (
              <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid #BFDBFE' }}>
                  {audit.timeline.slice().reverse().map((event: any, i: number) => (
                    <div key={i} style={{ position: 'relative', paddingBottom: i < audit.timeline.length - 1 ? '1.5rem' : 0 }}>
                      <div style={{
                        position: 'absolute', left: '-1.625rem', top: '2px',
                        width: '14px', height: '14px', borderRadius: '50%',
                        background: '#1565C0', border: '3px solid white',
                        boxShadow: '0 0 0 2px #BFDBFE'
                      }} />
                      <p style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>{event.event}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0 0 0.25rem' }}>
                        {new Date(event.timestamp).toLocaleString()} {event.actor ? `• ${event.actor}` : ''}
                      </p>
                      {event.notes && <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.25rem 0 0', background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '2px solid #BFDBFE' }}>{event.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#94A3B8' }}>
                <Clock style={{ width: '36px', height: '36px', color: '#E2E8F0', margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#CBD5E1' }}>No timeline events yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Findings Summary */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', animation: 'fadeIn 0.5s ease 0.4s both' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#DC2626' }} />
            </div>
            <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1rem', margin: 0 }}>Findings Summary</h3>
            {audit.nonCompliantItems && audit.nonCompliantItems.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '999px', padding: '0.2rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}>
                {audit.nonCompliantItems.length}
              </span>
            )}
          </div>
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {audit.nonCompliantItems && audit.nonCompliantItems.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {audit.nonCompliantItems.map((item: any, i: number) => (
                  <li key={i} style={{ 
                    background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A',
                    padding: '0.875rem 1rem', marginBottom: i < audit.nonCompliantItems.length - 1 ? '0.75rem' : 0,
                    display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                  }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AlertTriangle style={{ width: '14px', height: '14px', color: '#D97706' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>{item.category}</p>
                      <p style={{ fontSize: '0.8125rem', color: '#92400E', margin: 0 }}>{item.item}</p>
                      {item.remarks && <p style={{ fontSize: '0.75rem', color: '#78716C', marginTop: '0.375rem', fontStyle: 'italic', background: 'white', padding: '0.375rem 0.625rem', borderRadius: '6px', border: '1px solid #FEF3C7' }}>{item.remarks}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : audit.score != null ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <CheckCircle2 style={{ width: '32px', height: '32px', color: '#10B981' }} />
                </div>
                <h4 style={{ fontWeight: 800, color: '#059669', margin: '0 0 0.375rem' }}>All Items Compliant</h4>
                <p style={{ color: '#6B7280', fontSize: '0.8375rem', margin: 0 }}>No non-compliances were found during this audit.</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#CBD5E1' }}>
                <Hash style={{ width: '36px', height: '36px', color: '#E2E8F0', margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Findings will appear once evaluated</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
