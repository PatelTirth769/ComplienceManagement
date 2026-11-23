import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  LayoutDashboard, User, FileCheck, FolderOpen,
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare,
  ArrowLeft, CheckCircle2, Calendar, Building2, UserCheck,
  Hash, Shield, ChevronRight, Info, Scale, X, Paperclip, Download, Search
} from 'lucide-react';
import { getVendorAuditById } from '../services/api';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { findActRule, getDisplayLaw, handleLawButtonClick, downloadActRuleAttachment } from '../utils/actLawMatcher';

export const VendorAuditDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [audit, setAudit] = useState<any>(null);
  const [activeLawModal, setActiveLawModal] = useState<{ item: any; law: any } | null>(null);
  const [drillDownModal, setDrillDownModal] = useState<{
    title: string;
    category?: string;
    filterType: string;
    items: any[];
  } | null>(null);
  const [modalSearch, setModalSearch] = useState('');

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

  const actRules: any[] = audit?.actRules || [];

  const getActLaw = (catOrItem: any) => {
    return findActRule(catOrItem, actRules);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems} hideBackButton={true}>
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
      <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems} backUrl="/vendor/audits" backLabel="Back to Audits">
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

  const matchCategory = (itemCat?: string, targetCat?: string) => {
    if (!targetCat || targetCat === 'ALL') return true;
    if (!itemCat) return false;
    const a = itemCat.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = targetCat.toLowerCase().replace(/[^a-z0-9]/g, '');
    return a === b || a.includes(b) || b.includes(a);
  };

  const getAllAuditItems = () => {
    if (!audit) return [];
    const nonCompMap = new Map();
    if (Array.isArray(audit.nonCompliantItems)) {
      audit.nonCompliantItems.forEach((nc: any) => {
        const k = nc.itemId || nc.id;
        if (k) nonCompMap.set(k, nc);
      });
    }

    const list: any[] = [];
    if (Array.isArray(audit.responses) && audit.responses.length > 0) {
      audit.responses.forEach((r: any, idx: number) => {
        const k = r.itemId || r.id;
        const ncData = k ? nonCompMap.get(k) : null;
        list.push({
          itemId: r.itemId || r.id || `ITEM-${idx + 1}`,
          title: r.title || ncData?.title || 'Statutory Requirement',
          particulars: r.particulars || ncData?.particulars || '',
          type: r.type || r.actNameInShort || ncData?.type || 'Statutory',
          status: (r.status || (ncData ? 'NON_COMPLIANT' : 'COMPLIANT')).toUpperCase(),
          remarks: r.remarks || ncData?.remarks || '',
          vendorResponse: ncData?.vendorResponse || r.vendorResponse || '',
          actionPlan: ncData?.actionPlan || r.actionPlan || '',
          respondedAt: ncData?.respondedAt || r.respondedAt,
          attachmentName: ncData?.attachmentName || r.attachmentName,
          attachmentDocId: ncData?.attachmentDocId || r.attachmentDocId
        });
      });
    } else if (audit.responses && typeof audit.responses === 'object') {
      Object.entries(audit.responses).forEach(([itemId, val]: [string, any], idx: number) => {
        const ncData = nonCompMap.get(itemId);
        const statusVal = typeof val === 'string' ? val : (val?.status || (ncData ? 'NON_COMPLIANT' : 'COMPLIANT'));
        const remarksVal = typeof val === 'object' ? val?.remarks : (ncData?.remarks || '');
        list.push({
          itemId,
          title: ncData?.title || `Requirement ${itemId}`,
          particulars: ncData?.particulars || '',
          type: ncData?.type || 'Statutory',
          status: statusVal.toUpperCase(),
          remarks: remarksVal,
          vendorResponse: ncData?.vendorResponse || '',
          actionPlan: ncData?.actionPlan || '',
          respondedAt: ncData?.respondedAt,
          attachmentName: ncData?.attachmentName,
          attachmentDocId: ncData?.attachmentDocId
        });
      });
    } else if (Array.isArray(audit.nonCompliantItems) && audit.nonCompliantItems.length > 0) {
      audit.nonCompliantItems.forEach((nc: any, idx: number) => {
        list.push({
          itemId: nc.itemId || nc.id || `ITEM-${idx + 1}`,
          title: nc.title || 'Non-Compliant Requirement',
          particulars: nc.particulars || '',
          type: nc.type || 'Statutory',
          status: 'NON_COMPLIANT',
          remarks: nc.remarks || '',
          vendorResponse: nc.vendorResponse || '',
          actionPlan: nc.actionPlan || '',
          respondedAt: nc.respondedAt,
          attachmentName: nc.attachmentName,
          attachmentDocId: nc.attachmentDocId
        });
      });
    }
    return list;
  };

  const isCriticalItem = (item: any) => {
    if (item.isCritical === true) return true;
    const t = item.type || item.category || '';
    if (['CL Act', 'PSRGA', 'EPF Act', 'ESI Act'].includes(t)) return true;
    const text = `${item.title || ''} ${item.particulars || ''}`;
    return /(licence|license|registration|pf|esi|wages)/i.test(text);
  };

  const openDrillDown = (filterType: string, title: string, category?: string) => {
    const all = getAllAuditItems();
    let filtered = all;

    if (category) {
      filtered = filtered.filter(item => matchCategory(item.type, category));
    }

    if (filterType === 'CRITICAL') {
      filtered = filtered.filter(item => isCriticalItem(item));
    } else if (filterType === 'CRITICAL_COMPLIANT') {
      filtered = filtered.filter(item => isCriticalItem(item) && item.status === 'COMPLIANT');
    } else if (filterType === 'CRITICAL_APPLICABLE') {
      filtered = filtered.filter(item => isCriticalItem(item) && (item.status === 'COMPLIANT' || item.status === 'NON_COMPLIANT'));
    } else if (filterType === 'GENERAL') {
      filtered = filtered.filter(item => !isCriticalItem(item));
    } else if (filterType === 'GENERAL_COMPLIANT') {
      filtered = filtered.filter(item => !isCriticalItem(item) && item.status === 'COMPLIANT');
    } else if (filterType === 'GENERAL_APPLICABLE') {
      filtered = filtered.filter(item => !isCriticalItem(item) && (item.status === 'COMPLIANT' || item.status === 'NON_COMPLIANT'));
    } else if (filterType === 'APPLICABLE') {
      filtered = filtered.filter(item => item.status === 'COMPLIANT' || item.status === 'NON_COMPLIANT');
    } else if (filterType === 'COMPLIANT') {
      filtered = filtered.filter(item => item.status === 'COMPLIANT');
    } else if (filterType === 'NON_COMPLIANT') {
      filtered = filtered.filter(item => item.status === 'NON_COMPLIANT');
    } else if (filterType === 'NA') {
      filtered = filtered.filter(item => item.status === 'NA');
    }

    setDrillDownModal({
      title,
      category,
      filterType,
      items: filtered
    });
    setModalSearch('');
  };

  const displayedModalItems = (drillDownModal?.items || []).filter(item => {
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.itemId || '').toLowerCase().includes(q) ||
      (item.particulars || '').toLowerCase().includes(q) ||
      (item.type || '').toLowerCase().includes(q) ||
      (item.remarks || '').toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems} backUrl="/vendor/audits" backLabel="Back to Audits">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8375rem', color: '#94A3B8' }}>
        <Link to="/vendor/audits" style={{ color: '#64748B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#1565C0'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#64748B'}
        >
          My Audits
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
              <span
                style={{
                  backgroundColor: audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? '#F3E8FF' : 'rgba(255,255,255,0.15)',
                  color: audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? '#7E22CE' : '#FFFFFF',
                  border: `1px solid ${audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? '#D8B4FE' : 'rgba(255,255,255,0.25)'}`,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? 'Re-Audit' : 'Original Audit'}
              </span>
              {audit.isReadOnly && (
                <span
                  style={{
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FDE68A',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '999px'
                  }}
                >
                  Read-Only
                </span>
              )}
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
                {formatDate(audit.startDate)} → {formatDate(audit.dueDate)}
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
                { label: 'Start Date', value: formatDate(audit.startDate) || 'N/A', icon: Calendar, color: '#059669', bg: '#ECFDF5' },
                { label: 'Due Date', value: formatDate(audit.dueDate) || 'N/A', icon: Calendar, color: '#DC2626', bg: '#FEF2F2' },
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
              { key: 'TOTAL' as const, label: 'Total Requirements', value: audit.summary?.totalItems ?? audit.totalRequirements ?? 'N/A', color: '#0B1F3A', bg: '#F8FAFC', border: '#E2E8F0' },
              { key: 'APPLICABLE' as const, label: 'Applicable Items', value: audit.summary?.applicableItems ?? audit.applicableItems ?? 'N/A', color: '#1565C0', bg: '#EFF6FF', border: '#BFDBFE' },
              { key: 'COMPLIANT' as const, label: 'Compliant Items', value: audit.summary?.compliantItems ?? audit.compliantItems ?? 'N/A', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              { key: 'NON_COMPLIANT' as const, label: 'Non-Compliant Items', value: audit.summary?.nonCompliantItems ?? (audit.nonCompliantItems ? audit.nonCompliantItems.length : 0), color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
              { key: 'NA' as const, label: 'N/A Items', value: audit.summary?.naItems ?? 'N/A', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' }
            ].map((stat, idx) => (
              <div
                key={idx}
                onClick={() => openDrillDown(stat.key, `All Categories — ${stat.label}`)}
                style={{
                  padding: '0.875rem 1rem', borderRadius: '12px', background: stat.bg,
                  border: `1px solid ${stat.border}`, textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', userSelect: 'none'
                }}
                title={`Click to view all ${stat.label}`}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '1.375rem', fontWeight: 800, color: stat.color, lineHeight: 1.2 }}>{stat.value}</div>
                <div style={{ fontSize: '0.725rem', fontWeight: 600, color: stat.color, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Critical vs General Scores Cards */}
          {(audit.critical || audit.general) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* Critical Score */}
              <div 
                onClick={() => openDrillDown('CRITICAL', 'Critical Compliance Checkpoints')}
                style={{ 
                  padding: '1.25rem', borderRadius: '12px', background: '#FEF2F2', 
                  border: '1px solid #FECACA', display: 'flex', alignItems: 'center', 
                  justifyContent: 'space-between', cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', userSelect: 'none'
                }}
                title="Click to view all Critical Compliance checkpoints"
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(220, 38, 38, 0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Critical Compliance</span>
                    <span style={{ fontSize: '0.675rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px', background: '#FEE2E2', color: '#991B1B' }}>View Data</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7F1D1D', marginTop: '2px' }}>
                    {audit.critical?.scoreDisplay ?? (audit.critical?.score != null ? `${Math.round(audit.critical.score)}%` : 'N/A')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#991B1B', fontWeight: 500 }}>
                  <div 
                    onClick={e => { e.stopPropagation(); openDrillDown('CRITICAL_COMPLIANT', 'Critical Compliance — Compliant Items'); }}
                    style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title="Click to view Compliant Critical Items"
                  >
                    Compliant: <strong style={{ textDecoration: 'underline' }}>{audit.critical?.compliantItems ?? 'N/A'}</strong>
                  </div>
                  <div 
                    onClick={e => { e.stopPropagation(); openDrillDown('CRITICAL_APPLICABLE', 'Critical Compliance — Applicable Items'); }}
                    style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title="Click to view Applicable Critical Items"
                  >
                    Applicable: <strong style={{ textDecoration: 'underline' }}>{audit.critical?.applicableItems ?? 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* General Score */}
              <div 
                onClick={() => openDrillDown('GENERAL', 'General Compliance Checkpoints')}
                style={{ 
                  padding: '1.25rem', borderRadius: '12px', background: '#EFF6FF', 
                  border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', 
                  justifyContent: 'space-between', cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', userSelect: 'none'
                }}
                title="Click to view all General Compliance checkpoints"
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(37, 99, 235, 0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>General Compliance</span>
                    <span style={{ fontSize: '0.675rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px', background: '#DBEAFE', color: '#1E40AF' }}>View Data</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E3A8A', marginTop: '2px' }}>
                    {audit.general?.scoreDisplay ?? (audit.general?.score != null ? `${Math.round(audit.general.score)}%` : 'N/A')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#1E40AF', fontWeight: 500 }}>
                  <div 
                    onClick={e => { e.stopPropagation(); openDrillDown('GENERAL_COMPLIANT', 'General Compliance — Compliant Items'); }}
                    style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#DBEAFE')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title="Click to view Compliant General Items"
                  >
                    Compliant: <strong style={{ textDecoration: 'underline' }}>{audit.general?.compliantItems ?? 'N/A'}</strong>
                  </div>
                  <div 
                    onClick={e => { e.stopPropagation(); openDrillDown('GENERAL_APPLICABLE', 'General Compliance — Applicable Items'); }}
                    style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#DBEAFE')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title="Click to view Applicable General Items"
                  >
                    Applicable: <strong style={{ textDecoration: 'underline' }}>{audit.general?.applicableItems ?? 'N/A'}</strong>
                  </div>
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
                    {(audit.categoryScores || audit.labourCodes || audit.sections).map((cat: any, i: number) => {
                      const catName = cat.category || cat.section || cat.labourCode || 'General';
                      const matchedLaw = getActLaw(cat);
                      const lawDescription = (matchedLaw?.description || '').trim();
                      const hasLawRule = Boolean(lawDescription || matchedLaw?.attachment?.fileData);

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFCFF' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0B1F3A', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                              <span>{catName}</span>
                              <button
                                type="button"
                                className={`badge-law-btn ${hasLawRule ? 'has-rule' : ''} no-print`}
                                onClick={() => {
                                  handleLawButtonClick(matchedLaw, () => {
                                    const lawToDisplay = getDisplayLaw(cat, matchedLaw);
                                    setActiveLawModal({ item: cat, law: lawToDisplay });
                                  });
                                }}
                                title={
                                  !lawDescription && matchedLaw?.attachment?.fileData
                                    ? `Download Attached Rule Document for ${matchedLaw?.shortName || catName}`
                                    : `View Law & Statutory Rule for ${matchedLaw?.shortName || catName}`
                                }
                              >
                                <Scale className="w-3 h-3 mr-1 inline-block" />
                                <span>Law</span>
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openDrillDown('TOTAL', `${catName} — Total Requirements`, catName)}
                              style={{
                                background: 'transparent', border: '1px solid transparent', borderRadius: '6px',
                                padding: '0.2rem 0.55rem', color: '#334155', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Click to view all requirements for ${catName}`}
                              onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                            >
                              {cat.totalItems ?? 'N/A'}
                            </button>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openDrillDown('APPLICABLE', `${catName} — Applicable Requirements`, catName)}
                              style={{
                                background: 'transparent', border: '1px solid transparent', borderRadius: '6px',
                                padding: '0.2rem 0.55rem', color: '#1565C0', fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Click to view applicable requirements for ${catName}`}
                              onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                            >
                              {cat.applicableItems ?? 'N/A'}
                            </button>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openDrillDown('COMPLIANT', `${catName} — Compliant Requirements`, catName)}
                              style={{
                                background: 'transparent', border: '1px solid transparent', borderRadius: '6px',
                                padding: '0.2rem 0.55rem', color: '#059669', fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Click to view compliant requirements for ${catName}`}
                              onMouseEnter={e => { e.currentTarget.style.background = '#ECFDF5'; e.currentTarget.style.borderColor = '#A7F3D0'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                            >
                              {cat.compliantItems ?? 'N/A'}
                            </button>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openDrillDown('NON_COMPLIANT', `${catName} — Non-Compliant Requirements`, catName)}
                              style={{
                                background: cat.nonCompliantItems > 0 ? '#FEF2F2' : 'transparent',
                                border: `1px solid ${cat.nonCompliantItems > 0 ? '#FECACA' : 'transparent'}`,
                                borderRadius: '6px', padding: '0.2rem 0.55rem',
                                color: cat.nonCompliantItems > 0 ? '#DC2626' : '#64748B',
                                fontWeight: cat.nonCompliantItems > 0 ? 800 : 500,
                                cursor: 'pointer', transition: 'all 0.15s ease'
                              }}
                              title={`Click to view non-compliant requirements for ${catName}`}
                              onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = cat.nonCompliantItems > 0 ? '#FEF2F2' : 'transparent'; e.currentTarget.style.borderColor = cat.nonCompliantItems > 0 ? '#FECACA' : 'transparent'; }}
                            >
                              {cat.nonCompliantItems ?? 'N/A'}
                            </button>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openDrillDown('NA', `${catName} — N/A Requirements`, catName)}
                              style={{
                                background: 'transparent', border: '1px solid transparent', borderRadius: '6px',
                                padding: '0.2rem 0.55rem', color: '#D97706', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Click to view N/A requirements for ${catName}`}
                              onMouseEnter={e => { e.currentTarget.style.background = '#FFFBEB'; e.currentTarget.style.borderColor = '#FDE68A'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                            >
                              {cat.naItems ?? 'N/A'}
                            </button>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: cat.score != null ? (cat.score >= 85 ? '#059669' : cat.score >= 70 ? '#D97706' : '#DC2626') : '#94A3B8' }}>
                            {cat.scoreDisplay ?? (cat.score != null ? `${Math.round(cat.score)}%` : 'N/A')}
                          </td>
                        </tr>
                      );
                    })}
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
                        {formatDateTime(event.timestamp)} {event.actor ? `• ${event.actor}` : ''}
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

      {/* Statutory Law Modal for this Act */}
      {activeLawModal && (
        <div className="law-modal-overlay" onClick={() => setActiveLawModal(null)}>
          <div className="law-modal-container" onClick={e => e.stopPropagation()}>
            <div className="law-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="law-modal-icon-badge">
                  <Scale className="w-5 h-5 text-[#1565C0]" />
                </div>
                <div>
                  <div className="law-modal-act-code">{activeLawModal.law?.shortName || activeLawModal.item?.category || 'Statutory Act'}</div>
                  <h3 className="law-modal-act-title">{activeLawModal.law?.actName || activeLawModal.item?.category || 'Statutory Act Law'}</h3>
                </div>
              </div>
              <button
                type="button"
                className="law-modal-close-btn"
                onClick={() => setActiveLawModal(null)}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="law-modal-body">
              {activeLawModal.law?.category && (
                <div className="law-modal-category">
                  <span className="law-category-pill">{activeLawModal.law.category}</span>
                </div>
              )}

              <div className="law-modal-content-card">
                <div className="law-content-heading">Description</div>
                {activeLawModal.law?.description?.trim() ? (
                  <div className="law-content-text">{activeLawModal.law.description.trim()}</div>
                ) : (
                  <div className="law-content-empty">
                    <p>No statutory law description was configured for this Act during this audit.</p>
                    <span className="law-content-subtext">Admin can write and save rules in Admin Console &gt; Rules for future audits.</span>
                  </div>
                )}
              </div>

              {Boolean(activeLawModal.law?.attachment && (activeLawModal.law.attachment.fileData || (activeLawModal.law.attachment as any).fileUrl)) && (
                <div style={{
                  marginTop: '0.875rem', padding: '0.75rem 1rem', background: '#F0FDF4',
                  border: '1px solid #BBF7D0', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <Paperclip className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeLawModal.law.attachment.fileName || 'Attached Statutory Rule Document'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadActRuleAttachment(activeLawModal.law.attachment)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.35rem 0.75rem', borderRadius: '6px',
                      background: '#059669', color: '#FFFFFF', fontSize: '0.75rem', fontWeight: 700,
                      border: 'none', cursor: 'pointer'
                    }}
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              )}

              {activeLawModal.law?.states && activeLawModal.law.states.length > 0 && (
                <div className="law-modal-states">
                  <span className="law-states-title">Applicable Jurisdiction:</span>
                  <div className="law-states-tags">
                    {activeLawModal.law.states.map((st: string, i: number) => (
                      <span key={i} className="law-state-chip">{st}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="law-modal-footer">
              <button
                type="button"
                className="law-modal-done-btn"
                onClick={() => setActiveLawModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Checkpoints Data Modal */}
      {drillDownModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem', animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setDrillDownModal(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '880px', width: '100%',
              maxHeight: '88vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem', background: '#0B1F3A', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FileCheck style={{ width: '20px', height: '20px', color: '#38BDF8' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    {drillDownModal.title}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '2px 0 0' }}>
                    {drillDownModal.items.length} {drillDownModal.items.length === 1 ? 'checkpoint requirement' : 'checkpoint requirements'} in this section
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrillDownModal(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#CBD5E1', cursor: 'pointer'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Search Filter Bar inside Modal */}
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search style={{ width: '16px', height: '16px', color: '#94A3B8', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search checklist items by title, code, or requirement..."
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                style={{
                  width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px',
                  border: '1px solid #CBD5E1', fontSize: '0.825rem', background: '#FFFFFF', outline: 'none'
                }}
              />
            </div>

            {/* Modal Body: Checkpoints List */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {displayedModalItems.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
                  <Info style={{ width: '32px', height: '32px', color: '#94A3B8', margin: '0 auto 0.5rem' }} />
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0, color: '#334155' }}>No checkpoints match</p>
                  <p style={{ fontSize: '0.775rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    There are no items recorded for this filter or matching your search.
                  </p>
                </div>
              ) : (
                displayedModalItems.map((item, idx) => {
                  const isCompliant = item.status === 'COMPLIANT';
                  const isNonCompliant = item.status === 'NON_COMPLIANT';

                  return (
                    <div
                      key={item.itemId || idx}
                      style={{
                        padding: '1rem 1.125rem', borderRadius: '10px',
                        border: `1px solid ${isNonCompliant ? '#FECACA' : isCompliant ? '#BBF7D0' : '#E2E8F0'}`,
                        background: isNonCompliant ? '#FEF2F2' : isCompliant ? '#F0FDF4' : '#F8FAFC'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'monospace', fontSize: '0.725rem', fontWeight: 700,
                            padding: '0.15rem 0.45rem', borderRadius: '4px',
                            background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1'
                          }}>
                            {item.itemId}
                          </span>
                          <span style={{
                            fontSize: '0.725rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                            borderRadius: '4px', background: '#DBEAFE', color: '#1E40AF'
                          }}>
                            {item.type}
                          </span>
                          <span style={{
                            fontSize: '0.675rem', fontWeight: 700, padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: isCriticalItem(item) ? '#FEE2E2' : '#F1F5F9',
                            color: isCriticalItem(item) ? '#991B1B' : '#475569',
                            border: `1px solid ${isCriticalItem(item) ? '#FECACA' : '#E2E8F0'}`
                          }}>
                            {isCriticalItem(item) ? '⚡ Critical' : 'General'}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.725rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          background: isCompliant ? '#DCFCE7' : isNonCompliant ? '#FEE2E2' : '#F1F5F9',
                          color: isCompliant ? '#15803D' : isNonCompliant ? '#B91C1C' : '#64748B',
                          border: `1px solid ${isCompliant ? '#86EFAC' : isNonCompliant ? '#FCA5A5' : '#CBD5E1'}`
                        }}>
                          {isCompliant ? '✓ Compliant' : isNonCompliant ? '⚠ Non-Compliant' : '— Not Applicable'}
                        </span>
                      </div>

                      <h4 style={{ fontWeight: 750, color: '#0F172A', fontSize: '0.875rem', margin: '0 0 0.35rem' }}>
                        {item.title}
                      </h4>

                      {item.particulars && (
                        <div style={{ fontSize: '0.775rem', color: '#475569', marginBottom: '0.5rem', lineHeight: 1.45 }}>
                          <strong style={{ color: '#334155' }}>Statutory Requirement:</strong> {item.particulars}
                        </div>
                      )}

                      {item.remarks && (
                        <div style={{
                          fontSize: '0.75rem', padding: '0.4rem 0.65rem', borderRadius: '6px',
                          background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
                          color: isNonCompliant ? '#B91C1C' : '#334155'
                        }}>
                          <strong>Auditor Remark / Evidence:</strong> {item.remarks}
                        </div>
                      )}

                      {/* Vendor Response if non-compliant */}
                      {isNonCompliant && (item.vendorResponse || item.attachmentName) && (
                        <div style={{
                          marginTop: '0.625rem', padding: '0.55rem 0.75rem', borderRadius: '6px',
                          background: '#ECFDF5', border: '1px solid #A7F3D0'
                        }}>
                          <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#047857', marginBottom: '2px' }}>
                            Vendor Response (CAPA):
                          </div>
                          {item.vendorResponse && (
                            <p style={{ margin: 0, fontSize: '0.775rem', color: '#065F46', fontWeight: 600 }}>
                              {item.vendorResponse}
                            </p>
                          )}
                          {item.actionPlan && item.actionPlan !== item.vendorResponse && (
                            <p style={{ margin: '2px 0 0', fontSize: '0.725rem', color: '#047857' }}>
                              <strong>Action Plan:</strong> {item.actionPlan}
                            </p>
                          )}
                          {item.attachmentName && (
                            <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: '#065F46' }}>
                              <Paperclip style={{ width: '13px', height: '13px' }} />
                              <span style={{ fontWeight: 600 }}>{item.attachmentName}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '0.875rem 1.5rem', borderTop: '1px solid #E2E8F0', background: '#F8FAFC',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.775rem', color: '#64748B' }}>
                Showing {displayedModalItems.length} of {drillDownModal.items.length} items
              </span>
              <button
                type="button"
                onClick={() => setDrillDownModal(null)}
                style={{
                  padding: '0.45rem 1.25rem', borderRadius: '8px', background: '#0B1F3A',
                  color: 'white', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer'
                }}
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
