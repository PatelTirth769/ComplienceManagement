import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  User,
  Users,
  ClipboardCheck,
  Briefcase,
  FileCheck,
  FolderOpen,
  Eye,
  X,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Download,
  Plus,
  Trash2
} from 'lucide-react';
import { useAudit } from '../context/AuditContext';
import { useAuth } from '../context/AuthContext';
import { getAssignedAudits, getAuditDocuments, getAuditDocumentUrl, saveInterviewResources } from '../services/api';
import type { InterviewResource } from '../types/compliance';
import { DateInput } from './DateInput';
import { formatDateTime } from '../utils/dateUtils';

export const AuditInformation: React.FC = () => {
  const { user } = useAuth();
  const {
    vendorTypes,
    selectedVendorType,
    setSelectedVendorType,
    selectedState,
    setSelectedState,
    selectedCountry,
    setSelectedCountry,
    auditInfo,
    updateAuditInfo,
    loadingVendorTypes,
    validationErrors,
    activeAuditId,
    setActiveAuditId,
    auditType,
    setAuditType,
    isReadOnly,
    setIsReadOnly,
    loadAuditRecord,
    interviewResources,
    setInterviewResources
  } = useAudit();

  const [assignedAudits, setAssignedAudits] = useState<any[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);
  const [auditDocuments, setAuditDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [showDocsModal, setShowDocsModal] = useState<boolean>(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [savingResources, setSavingResources] = useState<boolean>(false);
  const [resourcesSavedSuccess, setResourcesSavedSuccess] = useState<boolean>(false);

  const isInterviewAuditEnabled = selectedAudit?.interviewAudit === true || selectedAudit?.isInterviewAuditEnabled === true;

  // Initialize at least 1 resource row if enabled and empty
  useEffect(() => {
    if (isInterviewAuditEnabled && interviewResources.length === 0) {
      setInterviewResources([
        { id: 'res_1', name: '', preDate: '', finalDate: '', ask: '', status: 'Scheduled' }
      ]);
    }
  }, [isInterviewAuditEnabled, selectedAudit?.id]);

  const handleAddResourceRow = () => {
    const newId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setInterviewResources(prev => [
      ...prev,
      { id: newId, name: '', preDate: '', finalDate: '', ask: '', status: 'Scheduled' }
    ]);
  };

  const handleResourceChange = (id: string, field: keyof InterviewResource, val: string) => {
    setInterviewResources(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
    setResourcesSavedSuccess(false);
  };

  const handleDeleteResourceRow = (id: string) => {
    setInterviewResources(prev => prev.filter(r => r.id !== id));
    setResourcesSavedSuccess(false);
  };

  const handleSaveResources = async () => {
    const targetId = selectedAudit?.id || activeAuditId;
    if (!targetId) return;
    try {
      setSavingResources(true);
      // Immediately change status to 'Initiate' when auditor clicks Save Resources
      const updatedResources = interviewResources.map(r => ({
        ...r,
        status: 'Initiate'
      }));
      setInterviewResources(updatedResources);

      const auditorEmail = user?.email || selectedAudit?.auditorEmail;
      const res = await saveInterviewResources(targetId, updatedResources, auditorEmail);
      if (res && res.data && Array.isArray(res.data)) {
        setInterviewResources(res.data);
      }

      setSelectedAudit((prev: any) => prev ? { 
        ...prev, 
        interviewResources: (res && res.data) ? res.data : updatedResources,
        status: (prev.status === 'Scheduled' || !prev.status) ? 'Initiate' : prev.status 
      } : prev);
      setResourcesSavedSuccess(true);
      setTimeout(() => setResourcesSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save interview resources:', err);
      alert('Failed to save interview resources.');
    } finally {
      setSavingResources(false);
    }
  };

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const audits = await getAssignedAudits();
        if (audits && audits.length > 0) {
          setAssignedAudits(audits);

          // Restore exact active audit:
          // 1. By stored ID in localStorage
          // 2. Or prefer audit that already has saved score / calculation
          // 3. Or first audit in list
          const lastActiveId = localStorage.getItem('compliance_active_audit_id');
          let targetAudit = audits[0];
          if (lastActiveId) {
            const found = audits.find(a => a.id === lastActiveId || a.auditIdString === lastActiveId);
            if (found) targetAudit = found;
          } else {
            const withScore = audits.find(a => typeof a.score === 'number' || a.summary);
            if (withScore) targetAudit = withScore;
          }

          handleSelectAudit(targetAudit);
        }
      } catch (e) {
        console.warn('Failed to load assigned audits', e);
      }
    };
    fetchAudits();
  }, []);

  // Sync if activeAuditId changes externally (e.g. Re-Audit initiated)
  useEffect(() => {
    if (!activeAuditId) return;
    if (selectedAuditId !== activeAuditId) {
      setSelectedAuditId(activeAuditId);
    }
    // If activeAuditId is not present in assignedAudits list, re-fetch list to include newly created Re-Audit
    if (assignedAudits.length > 0 && !assignedAudits.some(a => a.id === activeAuditId)) {
      getAssignedAudits().then(audits => {
        if (audits && audits.length > 0) {
          setAssignedAudits(audits);
          const found = audits.find(a => a.id === activeAuditId);
          if (found) {
            setSelectedAudit(found);
            loadDocumentsForAudit(found);
          }
        }
      }).catch(console.warn);
    }
  }, [activeAuditId]);

  const loadDocumentsForAudit = async (targetAudit: any) => {
    if (!targetAudit) {
      setAuditDocuments([]);
      return;
    }
    const auditId = targetAudit.id || targetAudit.auditIdString;
    const isAllowedByCustomer = targetAudit.allowAuditorToSeeDocuments === true;

    // If customer has NOT permitted auditor access, clear documents and return immediately
    if (!isAllowedByCustomer) {
      setAuditDocuments([]);
      setLoadingDocs(false);
      return;
    }

    if (Array.isArray(targetAudit.documents)) {
      setAuditDocuments(targetAudit.documents);
    }
    if (!auditId) return;

    setLoadingDocs(true);
    try {
      const docs = await getAuditDocuments(auditId);
      if (Array.isArray(docs)) {
        setAuditDocuments(docs);
      } else {
        setAuditDocuments([]);
      }
    } catch (err) {
      console.warn('Failed to load audit documents:', err);
      setAuditDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSelectAudit = async (audit: any) => {
    if (!audit) return;
    setSelectedAudit(audit);
    setSelectedAuditId(audit.id);

    // Fully load audit and restore responses, calculation results, and saved status
    await loadAuditRecord(audit);

    loadDocumentsForAudit(audit);
  };

  /**
   * Helper to resolve a valid working URL.
   * If an S3 signed URL returns 403 AccessDenied (due to AWSCompromisedKeyQuarantineV3 on IAM credentials),
   * this automatically resolves to the direct public bucket URL so the actual document is shown.
   */
  const resolveWorkingFileUrl = async (rawUrl: string): Promise<string> => {
    if (!rawUrl || !rawUrl.startsWith('http')) return rawUrl;

    try {
      const headCheck = await fetch(rawUrl, { method: 'HEAD' });
      if (headCheck.ok) return rawUrl;
    } catch {
      // Continue to clean URL check
    }

    if (rawUrl.includes('?')) {
      const cleanUrl = rawUrl.split('?')[0];
      try {
        const cleanCheck = await fetch(cleanUrl, { method: 'HEAD' });
        if (cleanCheck.ok) {
          console.warn('[AuditInformation]: Presigned URL was denied by IAM quarantine; using clean S3 bucket URL.');
          return cleanUrl;
        }
      } catch {
        // Continue
      }
    }

    return rawUrl;
  };

  const handleViewDocument = async (doc: any) => {
    if (!doc) return;
    const docId = doc.id || doc.docId;
    if (!docId) {
      alert('Document ID is missing.');
      return;
    }
    setDownloadingDocId(docId);
    try {
      const res = await getAuditDocumentUrl(docId);
      if (res && res.success) {
        if (res.isUrl && res.data) {
          const workingUrl = await resolveWorkingFileUrl(res.data);
          const newWindow = window.open(workingUrl, '_blank', 'noopener,noreferrer');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            const a = document.createElement('a');
            a.href = workingUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } else if (res.data) {
          const a = document.createElement('a');
          a.href = res.data;
          a.download = res.fileName || doc.fileName || 'compliance_evidence';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          alert('Document file URL or content not found.');
        }
      } else {
        alert(res?.error || 'Could not retrieve document.');
      }
    } catch (err: any) {
      console.error('Error viewing document:', err);
      alert('Error viewing document: ' + (err.message || 'Network error'));
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!doc) return;
    const docId = doc.id || doc.docId;
    if (!docId) return;
    setDownloadingDocId(docId);
    try {
      const res = await getAuditDocumentUrl(docId);
      if (res && res.success) {
        if (res.isUrl && res.data) {
          let workingUrl = await resolveWorkingFileUrl(res.data);
          let fileResp = await fetch(workingUrl);

          // If still failed and contains query params, try clean URL
          if (!fileResp.ok && workingUrl.includes('?')) {
            const cleanUrl = workingUrl.split('?')[0];
            const retry = await fetch(cleanUrl);
            if (retry.ok) {
              fileResp = retry;
              workingUrl = cleanUrl;
            }
          }

          // Strict validation: NEVER download error responses (XML / 403 / 404 / 500)
          if (!fileResp.ok) {
            throw new Error(`Storage server returned error status ${fileResp.status} (${fileResp.statusText})`);
          }

          const contentType = fileResp.headers.get('content-type') || '';
          if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
            const errorText = await fileResp.text();
            console.error('S3 XML Error received:', errorText);
            throw new Error('Access denied by storage provider: Received error XML instead of document');
          }

          const blob = await fileResp.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = res.fileName || doc.fileName || 'compliance_evidence';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } else if (res.data) {
          const a = document.createElement('a');
          a.href = res.data;
          a.download = res.fileName || doc.fileName || 'compliance_evidence';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else {
        alert(res?.error || 'Could not download document.');
      }
    } catch (err: any) {
      console.error('Error downloading document:', err);
      alert('Error downloading document: ' + (err.message || 'Network error'));
    } finally {
      setDownloadingDocId(null);
    }
  };

  return (
    <section className="card audit-info-card">
      <div className="card-header">
        <div className="card-title-group">
          <ClipboardCheck className="card-icon" />
          <h2 className="card-title">Audit Information</h2>
        </div>
      </div>

      <div className="audit-info-grid">
        {/* Select Assigned Audit Dropdown */}
        {assignedAudits.length > 0 && (
          <div className="form-group form-group-full">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <label className="form-label font-bold text-[#1565C0]" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', margin: 0 }} htmlFor="assignedAuditSelect">
                <FileCheck style={{ width: '1rem', height: '1rem', color: '#1565C0' }} />
                <span>Select Assigned Audit to Evaluate</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedAudit && selectedAudit.allowAuditorToSeeDocuments !== true) {
                    alert('The customer has not permitted auditor document access for this audit.');
                    return;
                  }
                  setShowDocsModal(true);
                }}
                disabled={selectedAudit?.allowAuditorToSeeDocuments !== true || auditDocuments.length === 0}
                className="evidence-vault-header-btn"
                title={selectedAudit?.allowAuditorToSeeDocuments !== true ? "Customer has restricted auditor document access for this audit" : "View vendor evidence vault"}
                style={{
                  opacity: selectedAudit?.allowAuditorToSeeDocuments !== true || auditDocuments.length === 0 ? 0.65 : 1,
                  cursor: selectedAudit?.allowAuditorToSeeDocuments !== true || auditDocuments.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <FolderOpen style={{ width: '0.875rem', height: '0.875rem' }} />
                <span>Vendor Documents</span>
                <span className="evidence-vault-badge-count">
                  {loadingDocs ? '...' : (selectedAudit?.allowAuditorToSeeDocuments === true ? auditDocuments.length : '0')}
                </span>
              </button>
            </div>

            <div className="input-prefix-wrapper">
              <ClipboardCheck className="input-icon text-[#1565C0]" />
              <select
                id="assignedAuditSelect"
                className="form-control font-semibold bg-blue-50 border-blue-200 text-[#0B1F3A]"
                value={selectedAuditId}
                onChange={e => {
                  const selected = assignedAudits.find(a => a.id === e.target.value);
                  handleSelectAudit(selected);
                }}
              >
                {assignedAudits.map(a => {
                  const isRe = a.auditType === 'Re-Audit' || a.auditType === 'Re Audit';
                  const tag = isRe ? ' [Re-Audit]' : a.isReadOnly ? ' [Original - Read-Only]' : '';
                  return (
                    <option key={a.id} value={a.id}>
                      {a.auditIdString || a.id}{tag} — {a.auditPeriod} ({a.customerName || a.organisation || 'Client'} / {a.establishmentType || 'Facility'})
                    </option>
                  );
                })}
              </select>
            </div>
            {selectedAudit?.isReadOnly && (
              <div style={{ marginTop: '0.375rem', padding: '0.45rem 0.75rem', borderRadius: '6px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: '0.775rem', fontWeight: 700 }}>
                ⚠️ Notice: This original audit is Read-Only because a Re-Audit was conducted.
              </div>
            )}
            {(selectedAudit?.auditType === 'Re-Audit' || auditType === 'Re-Audit') && (
              <div style={{ marginTop: '0.375rem', padding: '0.45rem 0.75rem', borderRadius: '6px', background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#6D28D9', fontSize: '0.775rem', fontWeight: 700 }}>
                🔄 Active: Evaluating Re-Audit cycle with cloned checklist findings and vendor documents.
              </div>
            )}
            <p className="form-help text-blue-700">Selecting an assigned audit automatically populates vendor, client, and evaluation details.</p>

            {/* Vendor Uploaded Evidence Banner */}
            <div className="evidence-vault-banner" style={{
              background: selectedAudit && selectedAudit.allowAuditorToSeeDocuments !== true ? '#FFFBEB' : undefined,
              borderColor: selectedAudit && selectedAudit.allowAuditorToSeeDocuments !== true ? '#FDE68A' : undefined
            }}>
              <div className="evidence-vault-banner-left">
                <div className="evidence-vault-icon-circle" style={{
                  background: selectedAudit && selectedAudit.allowAuditorToSeeDocuments !== true ? '#FEF3C7' : undefined,
                  color: selectedAudit && selectedAudit.allowAuditorToSeeDocuments !== true ? '#D97706' : undefined
                }}>
                  <FolderOpen style={{ width: '1.25rem', height: '1.25rem' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="evidence-vault-banner-title">
                    <span>Vendor Evidence Vault</span>
                    {selectedAudit && selectedAudit.allowAuditorToSeeDocuments !== true ? (
                      <span className="evidence-vault-pill" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                        Access Restricted by Customer
                      </span>
                    ) : (
                      <span className={`evidence-vault-pill ${auditDocuments.length > 0 ? 'active' : ''}`}>
                        {loadingDocs
                          ? 'Checking...'
                          : `${auditDocuments.length} ${auditDocuments.length === 1 ? 'Document' : 'Documents'} Available`}
                      </span>
                    )}
                  </div>
                  <p className="evidence-vault-banner-sub">
                    {selectedAudit && selectedAudit.allowAuditorToSeeDocuments !== true
                      ? 'The customer has not enabled document visibility for this audit. Documents will appear here once permitted by the customer.'
                      : auditDocuments.length > 0
                        ? `Statutory evidence uploaded by ${auditInfo.vendorRepresentative || 'vendor'} for this audit cycle.`
                        : 'No documents submitted by vendor yet for this audit cycle.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedAudit && selectedAudit.allowAuditorToSeeDocuments !== true) {
                    alert('The customer has not permitted auditor document access for this audit.');
                    return;
                  }
                  setShowDocsModal(true);
                }}
                disabled={selectedAudit?.allowAuditorToSeeDocuments !== true || auditDocuments.length === 0}
                className="evidence-vault-btn-primary"
                title={selectedAudit?.allowAuditorToSeeDocuments !== true ? "Customer has not enabled auditor document access" : "Open vault modal to inspect all files"}
                style={{
                  opacity: selectedAudit?.allowAuditorToSeeDocuments !== true || auditDocuments.length === 0 ? 0.6 : 1,
                  cursor: selectedAudit?.allowAuditorToSeeDocuments !== true || auditDocuments.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <Eye style={{ width: '0.875rem', height: '0.875rem' }} />
                <span>
                  {selectedAudit && selectedAudit.allowAuditorToSeeDocuments !== true
                    ? 'Access Restricted by Customer'
                    : 'View & Verify Documents'}
                </span>
              </button>
            </div>

            {/* Inline Quick Preview of Uploaded Documents */}
            {auditDocuments.length > 0 && (
              <div className="evidence-vault-inline-list">
                {auditDocuments.map((doc, idx) => {
                  const isDownloading = downloadingDocId === doc.id;
                  const isPdf = (doc.fileName || '').toLowerCase().endsWith('.pdf');
                  const isImg = /\.(png|jpe?g|webp)$/i.test(doc.fileName || '');

                  return (
                    <div key={doc.id || idx} className="evidence-vault-inline-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#1565C0', flexShrink: 0
                        }}>
                          <FileText style={{ width: '16px', height: '16px' }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }} title={doc.fileName}>
                            {doc.fileName || `Evidence #${idx + 1}`}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>{isPdf ? 'PDF' : isImg ? 'Image' : 'Attachment'}</span>
                            <span>&bull;</span>
                            <span style={{ color: '#1565C0', fontWeight: 700 }}>{doc.type || 'General'}</span>
                            <span>&bull;</span>
                            <span>{formatDateTime(doc.uploadedAt || doc.createdAt, 'N/A')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="evidence-vault-actions">
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc)}
                          disabled={isDownloading}
                          className="evidence-btn-view"
                          title="Open document in a new tab"
                        >
                          {isDownloading ? (
                            <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <ExternalLink style={{ width: '12px', height: '12px' }} />
                          )}
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(doc)}
                          disabled={isDownloading}
                          className="evidence-btn-download"
                          title="Download file"
                        >
                          <Download style={{ width: '12px', height: '12px' }} />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Vendor Type Selection */}
        <div className="form-group form-group-full">
          <label className="form-label vendor-type-label" htmlFor="vendorType">
            Vendor Type <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Briefcase className="input-icon vendor-type-icon" />
            <select
              id="vendorType"
              className={`form-control vendor-type-select ${validationErrors.vendorType ? 'border-danger-ring' : ''}`}
              value={selectedVendorType}
              onChange={e => setSelectedVendorType(e.target.value)}
              disabled={loadingVendorTypes}
            >
              {loadingVendorTypes ? (
                <option value="">Loading vendor types...</option>
              ) : (
                vendorTypes.map(vt => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name} ({vt.code})
                  </option>
                ))
              )}
            </select>
          </div>
          {validationErrors.vendorType ? (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.vendorType}</p>
          ) : (
            <p className="form-help">Selecting a vendor type dynamically loads the appropriate compliance checklist.</p>
          )}
        </div>

        {/* Country & State Fields */}
        <div className="form-group">
          <label className="form-label font-semibold" htmlFor="auditCountry">
            Country <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <MapPin className="input-icon text-[#1565C0]" />
            <select
              id="auditCountry"
              className="form-control font-semibold bg-slate-50 text-slate-800"
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              disabled
            >
              <option value="India">🇮🇳 India</option>
            </select>
          </div>
          <p className="form-help">Country is set to India for statutory vendor audit checklists.</p>
        </div>

        <div className="form-group">
          <label className="form-label font-bold text-[#1565C0]" htmlFor="auditState">
            State Jurisdiction <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <MapPin className="input-icon text-[#1565C0]" />
            <select
              id="auditState"
              className="form-control font-semibold border-blue-200 text-[#0B1F3A]"
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
            >
              <option value="All">All (Consolidated States)</option>
              <option value="N/A">N/A (General / Unassigned)</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Haryana">Haryana</option>
              <option value="Telangana">Telangana</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
            </select>
          </div>
          <p className="form-help">Select a specific Indian state to apply state-specific checklists, or All for combined.</p>
        </div>

        {/* Organisation */}
        <div className="form-group">
          <label className="form-label" htmlFor="organisation">
            Organisation <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Building2 className="input-icon" />
            <input
              type="text"
              id="organisation"
              className={`form-control ${validationErrors.organisation ? 'border-danger-ring' : ''}`}
              placeholder="e.g. ABC Logistics Pvt Ltd"
              value={auditInfo.organisation}
              onChange={e => updateAuditInfo('organisation', e.target.value)}
            />
          </div>
          {validationErrors.organisation && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.organisation}</p>
          )}
        </div>

        {/* Site */}
        <div className="form-group">
          <label className="form-label" htmlFor="site">
            Site / Location <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <MapPin className="input-icon" />
            <input
              type="text"
              id="site"
              className={`form-control ${validationErrors.site ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Mumbai Manufacturing Facility"
              value={auditInfo.site}
              onChange={e => updateAuditInfo('site', e.target.value)}
            />
          </div>
          {validationErrors.site && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.site}</p>
          )}
        </div>

        {/* Audit Month */}
        <div className="form-group">
          <label className="form-label" htmlFor="auditMonth">
            Audit Month <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Calendar className="input-icon" />
            <input
              type="text"
              id="auditMonth"
              className={`form-control ${validationErrors.auditMonth ? 'border-danger-ring' : ''}`}
              placeholder="e.g. September 2026"
              value={auditInfo.auditMonth}
              onChange={e => updateAuditInfo('auditMonth', e.target.value)}
            />
          </div>
          {validationErrors.auditMonth && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.auditMonth}</p>
          )}
        </div>

        {/* Date of Audit */}
        <div className="form-group">
          <label className="form-label" htmlFor="auditDate">
            Date of Audit <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Calendar className="input-icon" />
            <DateInput
              id="auditDate"
              className={`form-control ${validationErrors.auditDate ? 'border-danger-ring' : ''}`}
              value={auditInfo.auditDate}
              onChange={e => updateAuditInfo('auditDate', e.target.value)}
            />
          </div>
          {validationErrors.auditDate && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.auditDate}</p>
          )}
        </div>

        {/* Conducted At */}
        <div className="form-group">
          <label className="form-label" htmlFor="conductedAt">
            Conducted At <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <MapPin className="input-icon" />
            <input
              type="text"
              id="conductedAt"
              className={`form-control ${validationErrors.conductedAt ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Onsite Facility"
              value={auditInfo.conductedAt}
              onChange={e => updateAuditInfo('conductedAt', e.target.value)}
            />
          </div>
          {validationErrors.conductedAt && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.conductedAt}</p>
          )}
        </div>

        {/* Auditor */}
        <div className="form-group">
          <label className="form-label" htmlFor="auditor">
            Auditor Name <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <User className="input-icon" />
            <input
              type="text"
              id="auditor"
              className={`form-control ${validationErrors.auditor ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Lead Auditor Name"
              value={auditInfo.auditor}
              onChange={e => updateAuditInfo('auditor', e.target.value)}
            />
          </div>
          {validationErrors.auditor && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.auditor}</p>
          )}
        </div>

        {/* Vendor Representative */}
        <div className="form-group">
          <label className="form-label" htmlFor="vendorRepresentative">
            Vendor Representative <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <User className="input-icon" />
            <input
              type="text"
              id="vendorRepresentative"
              className={`form-control ${validationErrors.vendorRepresentative ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Vendor Manager Name"
              value={auditInfo.vendorRepresentative}
              onChange={e => updateAuditInfo('vendorRepresentative', e.target.value)}
            />
          </div>
          {validationErrors.vendorRepresentative && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.vendorRepresentative}</p>
          )}
        </div>

        {/* Client Representative */}
        <div className="form-group">
          <label className="form-label" htmlFor="clientRepresentative">
            Client Representative <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <User className="input-icon" />
            <input
              type="text"
              id="clientRepresentative"
              className={`form-control ${validationErrors.clientRepresentative ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Client Compliance Officer"
              value={auditInfo.clientRepresentative}
              onChange={e => updateAuditInfo('clientRepresentative', e.target.value)}
            />
          </div>
          {validationErrors.clientRepresentative && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.clientRepresentative}</p>
          )}
        </div>

        {/* Number of Employees */}
        <div className="form-group">
          <label className="form-label" htmlFor="employeeCount">
            Number of Employees <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Users className="input-icon" />
            <input
              type="number"
              min="0"
              id="employeeCount"
              className={`form-control ${validationErrors.employeeCount ? 'border-danger-ring' : ''}`}
              placeholder="e.g. 150"
              value={auditInfo.employeeCount}
              onChange={e => {
                const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                updateAuditInfo('employeeCount', val);
              }}
            />
          </div>
          {validationErrors.employeeCount && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.employeeCount}</p>
          )}
        </div>
      </div>

      {/* SECTION: Add Resources (Interview Audit Module) - Rendered below Number of Employees when enabled */}
      {isInterviewAuditEnabled && (
        <div 
          className="interview-audit-card"
          style={{
            marginTop: '1.5rem',
            padding: '1.25rem 1.5rem',
            backgroundColor: '#F8FAFC',
            border: '1.5px solid #CBD5E1',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}>
                <Users style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Add Resources
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    backgroundColor: '#DBEAFE',
                    color: '#1D4ED8',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    border: '1px solid #BFDBFE'
                  }}>
                    Interview Audit
                  </span>
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                  Track employee interview schedules, interview dates, questions/tasks asked, and compliance status.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {resourcesSavedSuccess && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 style={{ width: '14px', height: '14px' }} /> Saved
                </span>
              )}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleSaveResources}
                  disabled={savingResources}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.4rem 0.85rem',
                    backgroundColor: '#1565C0',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    cursor: savingResources ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(21, 101, 192, 0.2)'
                  }}
                  onMouseEnter={e => !savingResources && (e.currentTarget.style.backgroundColor = '#0D47A1')}
                  onMouseLeave={e => !savingResources && (e.currentTarget.style.backgroundColor = '#1565C0')}
                >
                  {savingResources ? <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : null}
                  {savingResources ? 'Saving...' : 'Save Resources'}
                </button>
              )}
            </div>
          </div>

          {/* Resources Table from Screenshot 3: Name, Pre Date, Final Date, Ask, Status */}
          <div style={{ overflowX: 'auto', border: '1px solid #CBD5E1', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '160px' }}>Name</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '135px' }}>Pre Date</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '135px' }}>Final Date</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '180px' }}>Ask</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '130px' }}>Status</th>
                  {!isReadOnly && (
                    <th style={{ padding: '0.625rem 0.75rem', width: '40px', textAlign: 'center' }}></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {interviewResources.length === 0 ? (
                  <tr>
                    <td colSpan={isReadOnly ? 5 : 6} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                      No interview resources added yet. Click [+] below to add a resource.
                    </td>
                  </tr>
                ) : (
                  interviewResources.map((row, index) => (
                    <tr key={row.id || index} style={{ borderBottom: index < interviewResources.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      {/* Name */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          type="text"
                          value={row.name}
                          onChange={e => handleResourceChange(row.id, 'name', e.target.value)}
                          disabled={isReadOnly}
                          placeholder="e.g. Employee Name"
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.6rem',
                            fontSize: '0.8125rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF',
                            color: '#0F172A',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Pre Date */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          type="date"
                          value={row.preDate}
                          onChange={e => handleResourceChange(row.id, 'preDate', e.target.value)}
                          disabled={isReadOnly}
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.8125rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF',
                            color: '#0F172A',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Final Date */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          type="date"
                          value={row.finalDate}
                          onChange={e => handleResourceChange(row.id, 'finalDate', e.target.value)}
                          disabled={isReadOnly}
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.8125rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF',
                            color: '#0F172A',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Ask */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          type="text"
                          value={row.ask}
                          onChange={e => handleResourceChange(row.id, 'ask', e.target.value)}
                          disabled={isReadOnly}
                          placeholder="Questions / queries asked"
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.6rem',
                            fontSize: '0.8125rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF',
                            color: '#0F172A',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <select
                          value={row.status || 'Initiate'}
                          onChange={e => handleResourceChange(row.id, 'status', e.target.value)}
                          disabled={isReadOnly}
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF',
                            color: row.status === 'Initiate' ? '#1D4ED8'
                              : row.status === 'Completed' || row.status === 'Compliant' ? '#047857'
                              : row.status === 'Non-Compliant' ? '#B91C1C'
                              : row.status === 'In Progress' ? '#2563EB'
                              : '#475569',
                            outline: 'none',
                            cursor: isReadOnly ? 'default' : 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="Initiate">Initiate</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Compliant">Compliant</option>
                          <option value="Non-Compliant">Non-Compliant</option>
                        </select>
                      </td>

                      {/* Delete Action */}
                      {!isReadOnly && (
                        <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteResourceRow(row.id)}
                            title="Remove resource row"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.15s ease'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
                          >
                            <Trash2 style={{ width: '15px', height: '15px' }} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom [+] button from Screenshot 3 */}
          {!isReadOnly && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleAddResourceRow}
                title="Add resource row"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.35rem 0.75rem',
                  backgroundColor: '#FFFFFF',
                  color: '#1565C0',
                  border: '1.5px solid #1565C0',
                  borderRadius: '6px',
                  fontSize: '0.7875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <Plus style={{ width: '15px', height: '15px', strokeWidth: 2.5 }} />
                <span>Add Resource</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vendor Documents Vault Modal */}
      {showDocsModal && (
        <div
          className="evidence-modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            backgroundColor: 'rgba(11, 31, 58, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
          onClick={() => setShowDocsModal(false)}
        >
          <div
            className="evidence-modal-card"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(11, 31, 58, 0.35)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="evidence-modal-header" style={{
              padding: '1.125rem 1.5rem',
              backgroundColor: '#0B1F3A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '8px',
                  backgroundColor: 'rgba(37, 99, 235, 0.25)', border: '1px solid rgba(96, 165, 250, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#93C5FD', flexShrink: 0
                }}>
                  <FolderOpen style={{ width: '1.25rem', height: '1.25rem' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1rem', fontWeight: 800, color: '#FFFFFF',
                    margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    <span>Vendor Evidence Vault</span>
                    <span style={{
                      fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem',
                      borderRadius: '9999px', backgroundColor: 'rgba(37, 99, 235, 0.25)',
                      color: '#93C5FD', border: '1px solid rgba(96, 165, 250, 0.3)'
                    }}>
                      {auditDocuments.length} {auditDocuments.length === 1 ? 'file' : 'files'}
                    </span>
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.15rem 0 0' }}>
                    Audit: <strong style={{ color: '#FFFFFF' }}>{selectedAudit?.auditIdString || selectedAuditId}</strong> &bull; Period: {selectedAudit?.auditPeriod || auditInfo.auditMonth} &bull; Vendor: <strong style={{ color: '#FFFFFF' }}>{auditInfo.vendorRepresentative || auditInfo.organisation}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDocsModal(false)}
                className="evidence-modal-close-btn"
                aria-label="Close dialog"
              >
                <X style={{ width: '1.125rem', height: '1.125rem' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="evidence-modal-body" style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              backgroundColor: '#F8FAFC'
            }}>
              {loadingDocs ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <Loader2 style={{ width: '2rem', height: '2rem', color: '#1565C0', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>Loading vendor documents...</p>
                </div>
              ) : auditDocuments.length === 0 ? (
                <div style={{
                  padding: '3rem 1.5rem', textAlign: 'center',
                  backgroundColor: '#FFFFFF', borderRadius: '12px',
                  border: '1.5px dashed #CBD5E1'
                }}>
                  <FolderOpen style={{ width: '3rem', height: '3rem', color: '#94A3B8', margin: '0 auto 0.75rem' }} />
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0B1F3A', margin: 0 }}>No Evidence Uploaded Yet</h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem', maxWidth: '360px', marginInline: 'auto' }}>
                    The vendor has not uploaded statutory compliance documents for this audit cycle yet.
                  </p>
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Document / File</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Date Uploaded</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditDocuments.map((doc, idx) => {
                        const isDownloading = downloadingDocId === doc.id;
                        const isPdf = (doc.fileName || '').toLowerCase().endsWith('.pdf');
                        const isImg = /\.(png|jpe?g|webp)$/i.test(doc.fileName || '');

                        return (
                          <tr key={doc.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '8px',
                                  backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#1565C0', flexShrink: 0
                                }}>
                                  <FileText style={{ width: '16px', height: '16px' }} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{
                                    fontWeight: 700, color: '#0B1F3A',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    maxWidth: '240px'
                                  }} title={doc.fileName}>
                                    {doc.fileName || `Evidence #${idx + 1}`}
                                  </div>
                                  <div style={{ fontSize: '0.6875rem', color: '#64748B' }}>
                                    {isPdf ? 'PDF Document' : isImg ? 'Image Evidence' : 'Statutory Attachment'}
                                    {doc.fileSize ? ` &bull; ${(doc.fileSize / 1024).toFixed(1)} KB` : ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '0.2rem 0.55rem', borderRadius: '9999px',
                                fontSize: '0.6875rem', fontWeight: 700,
                                backgroundColor: '#EFF6FF', color: '#1565C0',
                                border: '1px solid #BFDBFE'
                              }}>
                                {doc.type || 'General Compliance'}
                              </span>
                            </td>
                            <td style={{ padding: '0.875rem 1rem', color: '#475569', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
                                <Clock style={{ width: '14px', height: '14px', color: '#94A3B8' }} />
                                <span>{formatDateTime(doc.uploadedAt || doc.createdAt, 'N/A')}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.2rem 0.55rem', borderRadius: '9999px',
                                fontSize: '0.6875rem', fontWeight: 700,
                                backgroundColor: '#ECFDF5', color: '#047857',
                                border: '1px solid #A7F3D0'
                              }}>
                                <CheckCircle2 style={{ width: '13px', height: '13px', color: '#059669' }} />
                                {doc.status || 'Uploaded'}
                              </span>
                            </td>
                            <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleViewDocument(doc)}
                                  disabled={isDownloading}
                                  className="evidence-btn-view"
                                  title="Open in new tab"
                                >
                                  {isDownloading ? (
                                    <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                                  ) : (
                                    <ExternalLink style={{ width: '12px', height: '12px' }} />
                                  )}
                                  <span>View</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocument(doc)}
                                  disabled={isDownloading}
                                  className="evidence-btn-download"
                                  title="Download file"
                                >
                                  <Download style={{ width: '12px', height: '12px' }} />
                                  <span>Download</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="evidence-modal-footer" style={{
              padding: '0.875rem 1.5rem',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Auditor Verification Mode &bull; All access logged
              </span>
              <button
                type="button"
                onClick={() => setShowDocsModal(false)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
