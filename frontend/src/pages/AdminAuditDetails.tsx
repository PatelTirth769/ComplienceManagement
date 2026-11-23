import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Loader2, CheckCircle2, Circle, FileText, Calendar, Clock, Eye, Download, Paperclip } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL, updateAuditTimeline, getAuditDocumentUrl } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';
import { formatDate, parseFlexibleDate } from '../utils/dateUtils';
import { DateInput } from '../components/DateInput';

export const AdminAuditDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // Timeline Rescheduling State
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isUpdatingTimeline, setIsUpdatingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const [timelineSuccessMsg, setTimelineSuccessMsg] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const resolveWorkingFileUrl = async (rawUrl: string): Promise<string> => {
    if (!rawUrl || !rawUrl.startsWith('http')) return rawUrl;
    try {
      const headCheck = await fetch(rawUrl, { method: 'HEAD' });
      if (headCheck.ok) return rawUrl;
    } catch {
      // Continue
    }
    if (rawUrl.includes('?')) {
      const cleanUrl = rawUrl.split('?')[0];
      try {
        const cleanCheck = await fetch(cleanUrl, { method: 'HEAD' });
        if (cleanCheck.ok) return cleanUrl;
      } catch {
        // Continue
      }
    }
    return rawUrl;
  };

  const handleViewAttachment = async (docId?: string, fallbackData?: string, fileName?: string) => {
    if (!docId && !fallbackData) return;
    const trackId = docId || fileName || 'view';
    try {
      setDownloadingDocId(trackId);
      if (docId) {
        const res = await getAuditDocumentUrl(docId);
        if (res && res.success) {
          if (res.isUrl && res.data) {
            const workingUrl = await resolveWorkingFileUrl(res.data);
            const win = window.open(workingUrl, '_blank', 'noopener,noreferrer');
            if (!win || win.closed || typeof win.closed === 'undefined') {
              const a = document.createElement('a');
              a.href = workingUrl;
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
            return;
          } else if (res.data) {
            const a = document.createElement('a');
            a.href = res.data;
            a.download = res.fileName || fileName || 'resolution_evidence';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
          }
        }
      }

      if (fallbackData) {
        if (fallbackData.startsWith('http')) {
          const workingUrl = await resolveWorkingFileUrl(fallbackData);
          window.open(workingUrl, '_blank', 'noopener,noreferrer');
        } else {
          const a = document.createElement('a');
          a.href = fallbackData;
          a.download = fileName || 'resolution_evidence';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else {
        alert('Document file URL or content not found.');
      }
    } catch (err: any) {
      console.error('Error viewing document:', err);
      alert('Error viewing document: ' + (err.message || 'Network error'));
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDownloadAttachment = async (docId?: string, fallbackData?: string, fileName?: string) => {
    if (!docId && !fallbackData) return;
    const trackId = docId || fileName || 'download';
    try {
      setDownloadingDocId(trackId);
      if (docId) {
        const res = await getAuditDocumentUrl(docId);
        if (res && res.success) {
          if (res.isUrl && res.data) {
            let workingUrl = await resolveWorkingFileUrl(res.data);
            let fileResp = await fetch(workingUrl);
            if (!fileResp.ok && workingUrl.includes('?')) {
              const cleanUrl = workingUrl.split('?')[0];
              const retry = await fetch(cleanUrl);
              if (retry.ok) {
                fileResp = retry;
                workingUrl = cleanUrl;
              }
            }
            if (!fileResp.ok) {
              throw new Error(`Storage returned status ${fileResp.status}`);
            }
            const blob = await fileResp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = res.fileName || fileName || 'resolution_evidence';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            return;
          } else if (res.data) {
            const a = document.createElement('a');
            a.href = res.data;
            a.download = res.fileName || fileName || 'resolution_evidence';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
          }
        }
      }

      if (fallbackData) {
        if (fallbackData.startsWith('http')) {
          const resp = await fetch(fallbackData);
          const blob = await resp.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName || 'resolution_evidence';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } else {
          const a = document.createElement('a');
          a.href = fallbackData;
          a.download = fileName || 'resolution_evidence';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Error downloading document: ' + (err.message || 'Network error'));
    } finally {
      setDownloadingDocId(null);
    }
  };

  const sidebarItems = getAdminSidebarItems('Audits');

  const handleOpenTimelineModal = () => {
    if (!audit) return;
    setNewStartDate(audit.startDate || '');
    setNewDueDate(audit.dueDate || '');
    setTimelineError('');
    setTimelineSuccessMsg('');
    setShowTimelineModal(true);
  };

  const handleStartDateChange = (val: string) => {
    setNewStartDate(val);
    const sDate = parseFlexibleDate(val);
    if (sDate) {
      // Auto-suggest 2-3 days timeline (startDate + 2 days)
      const dDate = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate() + 2);
      const mStr = String(dDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dDate.getDate()).padStart(2, '0');
      setNewDueDate(`${dDate.getFullYear()}-${mStr}-${dayStr}`);
    }
  };

  const handleSaveTimeline = async () => {
    if (!audit || !id) return;
    if (!newStartDate || !newDueDate) {
      setTimelineError('Please enter both Scheduled Start Date and Compliance Due Date.');
      return;
    }
    const sDate = parseFlexibleDate(newStartDate);
    const dDate = parseFlexibleDate(newDueDate);
    if (!sDate || !dDate) {
      setTimelineError('Invalid date format.');
      return;
    }
    if (dDate < sDate) {
      setTimelineError('Due Date cannot be before Start Date.');
      return;
    }

    try {
      setIsUpdatingTimeline(true);
      setTimelineError('');
      const res = await updateAuditTimeline(id, newStartDate, newDueDate);
      if (res && res.success) {
        setAudit((prev: any) => ({ ...prev, startDate: newStartDate, dueDate: newDueDate }));
        setTimelineSuccessMsg(`Timeline updated to ${formatDate(newStartDate)} - ${formatDate(newDueDate)} & notification email sent to auditor!`);
        setTimeout(() => {
          setShowTimelineModal(false);
          setTimelineSuccessMsg('');
        }, 2500);
      } else {
        setTimelineError(res?.error || 'Failed to update timeline.');
      }
    } catch (err: any) {
      console.error('Failed to update timeline:', err);
      setTimelineError(err.response?.data?.error || err.message || 'Failed to update timeline');
    } finally {
      setIsUpdatingTimeline(false);
    }
  };

  const handleSignOff = async () => {
    if (!window.confirm('Are you sure you want to sign off and close this audit?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      let res = await fetch(`${API_BASE_URL}/admin/audits/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Closed', notes: 'Approved and signed off by Reviewer' })
      });

      if (res.status === 404) {
        res = await fetch(`${API_BASE_URL}/admin/audits/${id}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'Closed', notes: 'Approved and signed off by Reviewer' })
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Audit successfully signed off and marked as Closed!');
        window.location.reload();
      } else {
        const rawErr = data.error || data.message || 'Failed to sign off audit.';
        const errText = typeof rawErr === 'object' ? (rawErr.message || JSON.stringify(rawErr)) : String(rawErr);
        alert(`Failed to sign off audit: ${errText}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error performing sign off: ${err?.message || err}`);
    }
  };

  useEffect(() => {
    const fetchAuditAndUsers = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const [auditRes, custRes, vendRes, audRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/audits/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/users?role=customer`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/users?role=vendor`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/users?role=auditor`, { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);

        const auditData = await auditRes.json();
        if (auditData.success) {
          setAudit(auditData.audit);
        }

        const map: Record<string, string> = {};
        const [custData, vendData, audData] = await Promise.all([custRes.json(), vendRes.json(), audRes.json()]);
        [...(custData.users || []), ...(vendData.users || []), ...(audData.users || [])].forEach((u: any) => {
          const name = u.companyName || u.fullName || u.organisation || u.contactPerson || u.name;
          if (name) {
            map[u.id] = name;
            if (u._id) map[u._id] = name;
          }
        });
        setUsersMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAuditAndUsers();
  }, [id]);

  if (isLoading) {
    return (
      <DashboardLayout title="Audit Details" sidebarItems={sidebarItems}>
        <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-12 h-12 text-[#1565C0]" /></div>
      </DashboardLayout>
    );
  }

  if (!audit) {
    return (
      <DashboardLayout title="Audit Details" sidebarItems={sidebarItems}>
        <div className="text-center py-16 text-gray-500">Audit not found</div>
      </DashboardLayout>
    );
  }

  const s = (audit.status || '').toLowerCase();
  const isStarted = s !== 'scheduled';
  const isCompleted = s === 'completed' || s === 'closed' || s === 'approved';
  const scoreNum = Number(audit.score) || 0;
  const scoreBadgeClass = scoreNum >= 85 ? 'high' : scoreNum >= 60 ? 'medium' : 'low';

  const clientDisplay = usersMap[audit.customerId] || audit.customerName || audit.customerId;
  const vendorDisplay = usersMap[audit.vendorId] || audit.vendorName || audit.vendorId;
  const auditorDisplay = usersMap[audit.auditorId] || audit.auditorName || audit.auditorId;

  const summary = audit.summary || {};
  const nonCompliantList: any[] = Array.isArray(audit.nonCompliantItems) && audit.nonCompliantItems.length > 0
    ? audit.nonCompliantItems
    : Array.isArray(audit.findings) && audit.findings.length > 0
      ? audit.findings
      : [];

  const compliantCount = audit.compliantCount ?? summary.compliantItems ?? (
    Array.isArray(audit.responses)
      ? audit.responses.filter((r: any) => (r.status || '').toLowerCase() === 'compliant').length
      : 0
  );
  const nonCompliantCount = audit.nonCompliantCount ?? (typeof summary.nonCompliantItems === 'number' ? summary.nonCompliantItems : nonCompliantList.length);
  const totalApplicable = audit.totalApplicable ?? summary.applicableItems ?? (compliantCount + nonCompliantCount);
  const naCount = audit.naCount ?? summary.naItems ?? (
    Array.isArray(audit.responses)
      ? audit.responses.filter((r: any) => (r.status || '').toLowerCase() === 'na').length
      : 0
  );

  const findingsResolved = audit.findingsResolved ?? nonCompliantList.filter((f: any) => f.status === 'Resolved' || f.isResolved).length;
  const findingsUnderReview = audit.findingsPending ?? nonCompliantList.filter((f: any) => f.vendorResponse && f.status !== 'Resolved').length;
  const findingsOpen = audit.findingsOpen ?? Math.max(0, nonCompliantCount - findingsResolved - findingsUnderReview);
  const hasFindings = nonCompliantCount > 0 || nonCompliantList.length > 0;

  return (
    <DashboardLayout title={`Audit Details - ${audit.auditIdString}`} sidebarItems={sidebarItems} backUrl="/admin/audits" backLabel="Back to Audits">
      {/* 1. Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="admin-header-title">{audit.auditIdString}</h1>
            <span className="audit-id-badge">Cycle {audit.auditPeriod}</span>
            <span
              className="db-badge"
              style={{
                backgroundColor: audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? '#F3E8FF' : '#F1F5F9',
                color: audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? '#7E22CE' : '#334155',
                border: `1px solid ${audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? '#D8B4FE' : '#CBD5E1'}`,
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '6px'
              }}
            >
              {audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? 'Re-Audit' : 'Original Audit'}
            </span>
            {audit.isReadOnly && (
              <span
                className="db-badge"
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                Read-Only
              </span>
            )}
            <span className={`score-badge-pill ${scoreBadgeClass}`}>
              {audit.status}
            </span>
          </div>
          <p className="admin-header-subtitle">
            Statutory governance docket for {vendorDisplay} · Managed by {auditorDisplay}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <Link to={`/admin/reports/${audit.id}`} className="db-btn db-btn-primary">
              <FileText className="w-4 h-4 mr-1.5" /> View Official Report
            </Link>
          )}
        </div>
      </div>

      <div className="audit-details-grid">
        <div className="audit-column-main">
          {/* Audit Engagement Parameters */}
          <div className="audit-panel-card">
            <div className="audit-panel-header">
              <h3 className="audit-panel-title">Audit Engagement Parameters</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isCompleted || audit.isReadOnly === true}
                  onClick={(isCompleted || audit.isReadOnly === true) ? undefined : handleOpenTimelineModal}
                  title={(isCompleted || audit.isReadOnly === true) ? (audit.isReadOnly ? "Audit is Read-Only — timeline cannot be edited" : "Audit is closed — timeline cannot be edited") : "Reschedule Audit Timeline & Notify Auditor"}
                  style={{
                    background: (isCompleted || audit.isReadOnly === true) ? '#F1F5F9' : '#EFF6FF',
                    border: `1px solid ${(isCompleted || audit.isReadOnly === true) ? '#E2E8F0' : '#BFDBFE'}`,
                    borderRadius: '6px',
                    padding: '4px 10px',
                    cursor: (isCompleted || audit.isReadOnly === true) ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: (isCompleted || audit.isReadOnly === true) ? '#94A3B8' : '#1D4ED8',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    opacity: (isCompleted || audit.isReadOnly === true) ? 0.6 : 1
                  }}
                >
                  <Calendar style={{ width: '13px', height: '13px', color: (isCompleted || audit.isReadOnly === true) ? '#94A3B8' : '#2563EB' }} />
                  <span>Edit Timeline</span>
                </button>
                <span className="audit-panel-badge">
                  ID: {audit.id}
                </span>
              </div>
            </div>
            <div className="audit-panel-body">
              <div className="audit-meta-grid">
                <div className="audit-meta-item">
                  <span className="audit-meta-label">Enterprise Client</span>
                  <span className="audit-meta-val">{clientDisplay}</span>
                </div>
                <div className="audit-meta-item">
                  <span className="audit-meta-label">Target Vendor</span>
                  <span className="audit-meta-val">{vendorDisplay}</span>
                </div>
                <div className="audit-meta-item">
                  <span className="audit-meta-label">Assigned Auditor</span>
                  <span className="audit-meta-val">{auditorDisplay}</span>
                </div>
                <div className="audit-meta-item">
                  <span className="audit-meta-label">Audit Type</span>
                  <span className="audit-meta-val" style={{ fontWeight: 700, color: audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? '#7E22CE' : '#0B1F3A' }}>
                    {audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit' ? 'Re-Audit' : 'Original'} {audit.isReadOnly ? '(Read-Only)' : ''}
                  </span>
                </div>
                <div className="audit-meta-item">
                  <span className="audit-meta-label">Establishment Type</span>
                  <span className="audit-meta-val">{audit.establishmentType || 'Industrial Factory'}</span>
                </div>
                <div className="audit-meta-item">
                  <span className="audit-meta-label">Scheduled Start</span>
                  <span className="audit-meta-val">{formatDate(audit.startDate)}</span>
                </div>
                <div className="audit-meta-item">
                  <span className="audit-meta-label">Target Due Date</span>
                  <span className="audit-meta-val">{formatDate(audit.dueDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Score Summary Card */}
          <div className="audit-panel-card">
            <div className="audit-panel-header">
              <h3 className="audit-panel-title">Regulatory Compliance Breakdown</h3>
              <span className="audit-panel-badge" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                Scoring Engine v2.4
              </span>
            </div>
            <div className="audit-panel-body">
              {!isStarted ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94A3B8', fontSize: '0.875rem' }}>
                  Audit is scheduled. Compliance score will populate once the auditor completes verification.
                </div>
              ) : (
                <div>
                  <div className="audit-score-hero">
                    <div className="audit-score-main">
                      <span className="audit-score-label">Certified Score</span>
                      <div className="audit-score-big">
                        {Number(scoreNum).toFixed(scoreNum % 1 === 0 ? 0 : 1)}%
                      </div>
                      <span className={`score-badge-pill ${scoreBadgeClass}`} style={{ marginTop: '0.4rem' }}>
                        {scoreNum >= 85 ? 'High Compliance' : scoreNum >= 60 ? 'Conditional' : 'Non-Compliant'}
                      </span>
                    </div>

                    <div className="audit-score-divider"></div>

                    <div className="audit-subkpi-pair">
                      <div className="audit-subkpi-box compliant">
                        <div className="audit-subkpi-title">Compliant</div>
                        <div className="audit-subkpi-num">{compliantCount}</div>
                      </div>
                      <div className="audit-subkpi-box deficiency">
                        <div className="audit-subkpi-title">Deficiencies</div>
                        <div className="audit-subkpi-num">{nonCompliantCount}</div>
                      </div>
                    </div>
                  </div>

                  <div className="audit-coverage-row">
                    <div className="audit-coverage-item">
                      <span className="audit-coverage-label">Total Applicable</span>
                      <span className="audit-coverage-val">{totalApplicable}</span>
                    </div>
                    <div className="audit-coverage-item">
                      <span className="audit-coverage-label">Not Applicable</span>
                      <span className="audit-coverage-val">{naCount}</span>
                    </div>
                    <div className="audit-coverage-item">
                      <span className="audit-coverage-label">Coverage</span>
                      <span className="audit-coverage-val" style={{ color: '#16A34A' }}>100%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Corrective Action Findings */}
          <div className="audit-panel-card">
            <div className="audit-panel-header">
              <h3 className="audit-panel-title">Audit Findings & CAPA Status</h3>
              <span className="audit-panel-badge" style={{ backgroundColor: hasFindings ? '#FEF2F2' : '#F0FDF4', color: hasFindings ? '#DC2626' : '#166534', borderColor: hasFindings ? '#FECACA' : '#BBF7D0' }}>
                {hasFindings ? `${nonCompliantCount} Observations` : 'Clean Sheet'}
              </span>
            </div>
            <div className="audit-panel-body">
              {!hasFindings ? (
                <div style={{ textAlign: 'center', padding: '1.75rem', color: '#64748B', fontSize: '0.85rem' }}>
                  <CheckCircle2 style={{ width: '2rem', height: '2rem', color: '#10B981', margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>No Deficiencies Identified</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                    All evaluated statutory compliance requirements were fully satisfied for this audit cycle.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="audit-findings-grid">
                    <div className="audit-finding-pill red">
                      <span className="audit-finding-title">Open Findings</span>
                      <span className="audit-finding-count">{findingsOpen}</span>
                    </div>
                    <div className="audit-finding-pill amber">
                      <span className="audit-finding-title">Under Review</span>
                      <span className="audit-finding-count">{findingsUnderReview}</span>
                    </div>
                    <div className="audit-finding-pill green">
                      <span className="audit-finding-title">Resolved</span>
                      <span className="audit-finding-count">{findingsResolved}</span>
                    </div>
                  </div>

                  {nonCompliantList.length > 0 && (
                    <div className="audit-findings-table-wrapper">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Deficiency Log & Vendor Observations ({nonCompliantList.length})
                        </span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="audit-findings-table">
                          <thead>
                            <tr>
                              <th style={{ width: '130px' }}>Clause / Act</th>
                              <th>Requirement & Particulars</th>
                              <th style={{ width: '100px' }}>Severity</th>
                              <th>Auditor Observation</th>
                              <th>Vendor Response (CAPA)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nonCompliantList.map((f: any, idx: number) => {
                              const isCrit = f.isCritical || f.type === 'CL Act' || /(licence|license|registration|pf|esi|wages)/i.test(f.title || f.particulars || '');
                              return (
                                <tr key={f.itemId || idx}>
                                  <td>
                                    <span className="finding-code-badge">{f.itemId || `ITEM-${idx + 1}`}</span>
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                                      {f.type || 'Statutory'}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: 750, color: '#0F172A', fontSize: '0.8rem' }}>
                                      {f.title || 'Non-Compliant Clause'}
                                    </div>
                                    <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                                      {f.particulars || 'Non-compliance identified against statutory compliance benchmark.'}
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`finding-severity-pill ${isCrit ? 'critical' : 'general'}`}>
                                      {isCrit ? 'Critical' : 'General'}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '0.775rem', color: '#B91C1C', fontWeight: 600, background: '#FEF2F2', padding: '0.35rem 0.55rem', borderRadius: '4px', border: '1px solid #FECACA' }}>
                                      {f.remarks || f.observation || 'Non-compliance observed.'}
                                    </div>
                                  </td>
                                  <td>
                                    {f.vendorResponse || f.attachmentName || f.attachmentDocId || f.attachment ? (
                                      <div className="finding-response-box">
                                        {f.vendorResponse && (
                                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{f.vendorResponse}</div>
                                        )}
                                        {f.actionPlan && f.actionPlan !== f.vendorResponse && (
                                          <div style={{ color: '#64748B', fontSize: '0.7rem', marginTop: '2px' }}>
                                            Action Plan: {f.actionPlan}
                                          </div>
                                        )}
                                        {f.respondedAt && (
                                          <div style={{ color: '#94A3B8', fontSize: '0.675rem', marginTop: '2px' }}>
                                            Responded: {formatDate(f.respondedAt)}
                                          </div>
                                        )}
                                        {(f.attachmentName || f.attachmentDocId || f.attachment) && (
                                          <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px',
                                            padding: '0.35rem 0.5rem', marginTop: '0.4rem', gap: '0.5rem'
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                                              <FileText style={{ width: '13px', height: '13px', color: '#059669', flexShrink: 0 }} />
                                              <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#065F46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={f.attachmentName || f.attachment?.fileName || 'Attached Proof'}>
                                                {f.attachmentName || f.attachment?.fileName || 'Attached Proof'}
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                              <button
                                                type="button"
                                                onClick={() => handleViewAttachment(f.attachmentDocId || f.attachment?.id || f.attachment?.docId, f.attachmentUrl || f.attachment?.url || f.attachment?.fileData, f.attachmentName || f.attachment?.fileName)}
                                                disabled={downloadingDocId === (f.attachmentDocId || f.attachmentName || 'view')}
                                                style={{ fontSize: '0.675rem', fontWeight: 700, color: '#1565C0', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.15rem 0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                                              >
                                                <Eye style={{ width: '10px', height: '10px' }} />
                                                <span>View</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDownloadAttachment(f.attachmentDocId || f.attachment?.id || f.attachment?.docId, f.attachmentUrl || f.attachment?.url || f.attachment?.fileData, f.attachmentName || f.attachment?.fileName)}
                                                disabled={downloadingDocId === (f.attachmentDocId || f.attachmentName || 'download')}
                                                style={{ fontSize: '0.675rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.15rem 0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                                              >
                                                <Download style={{ width: '10px', height: '10px' }} />
                                                <span>Download</span>
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '0.725rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                        Pending vendor corrective action
                                      </span>
                                    )}
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
            </div>
          </div>
        </div>

        {/* Right Column: Timeline & Sign-off Action */}
        <div className="audit-column-side">
          {/* Sign-off Action Card */}
          <div className="audit-panel-card" style={{ borderColor: '#BFDBFE' }}>
            <div className="audit-panel-header" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #EEF2FF 100%)' }}>
              <h3 className="audit-panel-title" style={{ color: '#1D4ED8' }}>Reviewer Sign-off</h3>
              <span className="audit-panel-badge" style={{ background: '#DBEAFE', color: '#1E40AF' }}>Governance</span>
            </div>
            <div className="audit-panel-body">
              <div className="audit-signoff-widget">
                <div className="audit-signoff-step">
                  <span>Auditor Verification</span>
                  {s === 'pending sign-off' || isCompleted ? (
                    <span className="audit-signoff-badge done">
                      <CheckCircle2 style={{ width: '1rem', height: '1rem' }} /> Submitted
                    </span>
                  ) : (
                    <span className="audit-signoff-badge neutral">
                      <Circle style={{ width: '1rem', height: '1rem' }} /> Pending
                    </span>
                  )}
                </div>

                <div className="audit-signoff-step">
                  <span>Admin Sign-off</span>
                  {isCompleted ? (
                    <span className="audit-signoff-badge done">
                      <CheckCircle2 style={{ width: '1rem', height: '1rem' }} /> Approved
                    </span>
                  ) : (
                    <span className="audit-signoff-badge pending">
                      <Circle style={{ width: '1rem', height: '1rem' }} /> Awaiting Action
                    </span>
                  )}
                </div>

                {audit.isReadOnly ? (
                  <div style={{ marginTop: '0.5rem', padding: '0.625rem 0.85rem', borderRadius: '6px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>
                    🔒 This Original Audit is Read-Only because a Re-Audit was conducted. Sign-off and final governance is conducted on the Re-Audit docket.
                  </div>
                ) : !isCompleted ? (
                  <button
                    onClick={handleSignOff}
                    className="db-btn db-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                  >
                    <CheckCircle2 style={{ width: '1rem', height: '1rem', marginRight: '0.35rem' }} />
                    Sign Off & Close Audit
                  </button>
                ) : (
                  <div className="audit-signoff-success-box" style={{ marginTop: '0.5rem' }}>
                    <CheckCircle2 style={{ width: '1.25rem', height: '1.25rem', color: '#16A34A' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 750, color: '#166534' }}>Audit Officially Signed & Closed</span>
                    <span style={{ fontSize: '0.7rem', color: '#15803D' }}>Final compliance report generated.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="audit-panel-card">
            <div className="audit-panel-header">
              <h3 className="audit-panel-title">Lifecycle Tracking</h3>
              <span className="audit-panel-badge">Audit Progress</span>
            </div>
            <div className="audit-panel-body">
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-icon-wrapper">
                    <div className="timeline-icon done"><CheckCircle2 className="h-4 w-4" /></div>
                    <div className="timeline-line done"></div>
                  </div>
                  <div className="timeline-content">
                    <h4 className="timeline-title">Audit Scheduled</h4>
                    <p className="timeline-desc">{formatDate(audit.createdAt)}</p>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-icon-wrapper">
                    <div className={`timeline-icon ${isStarted ? 'done' : 'upcoming'}`}>
                      {isStarted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-slate-300" />}
                    </div>
                    <div className={`timeline-line ${isStarted ? 'done' : ''}`}></div>
                  </div>
                  <div className="timeline-content">
                    <h4 className={`timeline-title ${!isStarted && 'text-slate-400'}`}>Field Inspection In Progress</h4>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-icon-wrapper">
                    <div className={`timeline-icon ${s === 'pending sign-off' || isCompleted ? 'done' : 'upcoming'}`}>
                      {s === 'pending sign-off' || isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-slate-300" />}
                    </div>
                    <div className={`timeline-line ${isCompleted ? 'done' : ''}`}></div>
                  </div>
                  <div className="timeline-content">
                    <h4 className={`timeline-title ${!(s === 'pending sign-off' || isCompleted) && 'text-slate-400'}`}>Auditor Submitted</h4>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-icon-wrapper">
                    <div className={`timeline-icon ${isCompleted ? 'done' : 'upcoming'}`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-slate-300" />}
                    </div>
                  </div>
                  <div className="timeline-content">
                    <h4 className={`timeline-title ${!isCompleted && 'text-slate-400'}`}>Governance Sign-off Closed</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Audit Timeline Modal */}
      {showTimelineModal && audit && (
        <div className="modal-overlay" onClick={() => !isUpdatingTimeline && setShowTimelineModal(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-badge" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                <Clock className="w-6 h-6" />
              </div>
              <div className="modal-header-text">
                <h3 className="modal-title">Reschedule Audit Timeline</h3>
                <span className="modal-subtitle">Update submission dates and automatically notify auditor</span>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-info-box" style={{ marginBottom: '1.25rem' }}>
                <div className="modal-info-row">
                  <span className="modal-info-label">Audit ID:</span>
                  <span className="modal-info-value mono">{audit.auditIdString || audit.id}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Period / Target:</span>
                  <span className="modal-info-value">{audit.auditPeriod || 'N/A'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Vendor:</span>
                  <span className="modal-info-value">{audit.vendorName || audit.vendorId || 'N/A'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Auditor:</span>
                  <span className="modal-info-value">{audit.auditorName || audit.auditor || 'Auditor'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Scheduled Start Date <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <DateInput
                    value={newStartDate}
                    placeholder="dd-mm-yyyy"
                    onChange={e => handleStartDateChange(e.target.value)}
                    disabled={isUpdatingTimeline}
                    style={{
                      width: '100%',
                      padding: '0.5rem 2rem 0.5rem 0.65rem',
                      fontSize: '0.8125rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      backgroundColor: isUpdatingTimeline ? '#F8FAFC' : '#FFFFFF',
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Compliance Due Date <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <DateInput
                    value={newDueDate}
                    placeholder="dd-mm-yyyy"
                    onChange={e => setNewDueDate(e.target.value)}
                    disabled={isUpdatingTimeline}
                    style={{
                      width: '100%',
                      padding: '0.5rem 2rem 0.5rem 0.65rem',
                      fontSize: '0.8125rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      backgroundColor: isUpdatingTimeline ? '#F8FAFC' : '#FFFFFF',
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '6px',
                padding: '0.625rem 0.85rem',
                fontSize: '0.75rem',
                color: '#166534',
                lineHeight: 1.45
              }}>
                📧 <strong>Notification:</strong> When you save, an automated email with the revised timeline will immediately be dispatched to the assigned auditor ({audit.auditorEmail || audit.auditor || 'Auditor'}) and vendor.
              </div>

              {timelineSuccessMsg && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', background: '#DCFCE7', color: '#15803D', fontSize: '0.75rem', fontWeight: 700 }}>
                  ✓ {timelineSuccessMsg}
                </div>
              )}

              {timelineError && (
                <div className="modal-error-text mt-3">
                  {timelineError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                disabled={isUpdatingTimeline}
                onClick={() => setShowTimelineModal(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingTimeline}
                onClick={handleSaveTimeline}
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: isUpdatingTimeline ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                }}
              >
                {isUpdatingTimeline ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rescheduling & Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>Save & Notify Auditor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
