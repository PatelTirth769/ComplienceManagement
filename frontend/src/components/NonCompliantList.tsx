import React, { useState } from 'react';
import type { NonCompliantItemDetail } from '../types/compliance';
import { AlertTriangle, FileText, CheckCircle2, ShieldAlert, Eye, Download, Loader2, Paperclip } from 'lucide-react';
import { getAuditDocumentUrl } from '../services/api';

interface NonCompliantListProps {
  items: NonCompliantItemDetail[];
}

export const NonCompliantList: React.FC<NonCompliantListProps> = ({ items }) => {
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

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!items || items.length === 0) {
    return (
      <div className="card non-compliant-card">
        <div className="card-header border-b">
          <div className="card-title-group">
            <CheckCircle2 className="card-icon text-emerald-600" />
            <h3 className="card-title text-emerald-900">Non-Compliant Findings</h3>
          </div>
          <span className="badge badge-success-outline">0 Findings</span>
        </div>
        <div className="p-6 text-center text-emerald-800 bg-emerald-50/50 rounded-b-xl">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <h4 className="font-semibold text-base">Perfect Score — Zero Non-Compliant Items!</h4>
          <p className="text-xs text-emerald-700 mt-1">All assessed statutory requirements were verified as compliant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card non-compliant-card">
      <div className="card-header non-compliant-card-header">
        <div className="card-title-group">
          <div className="non-compliant-header-icon-wrapper">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="card-title text-red-950 font-extrabold text-base">
              Non-Compliant Findings & Corrective Action List
            </h3>
            <p className="text-xs text-red-700 font-medium mt-0.5">
              Identified statutory non-compliance items requiring auditor action
            </p>
          </div>
        </div>
        <span className="badge badge-non-compliant-summary">
          {items.length} {items.length === 1 ? 'Finding' : 'Findings'} Required Action
        </span>
      </div>

      <div className="non-compliant-items-list">
        {items.map((item, idx) => {
          const hasResponse = Boolean(
            (item.vendorResponse && item.vendorResponse.trim().length > 0) ||
            item.attachmentName ||
            item.attachmentDocId ||
            item.attachment
          );
          const attachmentDocId = item.attachmentDocId || item.attachment?.id || item.attachment?.docId;
          const attachmentFileName = item.attachmentName || item.attachment?.fileName;
          const attachmentFallback = item.attachmentUrl || item.attachment?.url || item.attachment?.fileData;
          const attachmentSize = item.attachmentSize || item.attachment?.fileSize;
          const hasAttachment = Boolean(attachmentFileName || attachmentDocId || attachmentFallback);
          const trackId = attachmentDocId || attachmentFileName || 'active';
          const isBusy = downloadingDocId === trackId;

          return (
            <div key={item.itemId || idx} className="non-compliant-item-box">
              <div className="non-compliant-item-top">
                <div className="non-compliant-item-badges">
                  <span className="sr-badge">{String(item.serialNumber).padStart(2, '0')}</span>
                  <span className="badge badge-act">{item.type}</span>
                  <span className="item-id-code">{item.itemId}</span>
                </div>
                {hasResponse ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px'
                  }}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Responded
                  </span>
                ) : (
                  <span className="action-required-pill">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Action Required
                  </span>
                )}
              </div>

              <h4 className="non-compliant-item-title">{item.title}</h4>

              <div className="non-compliant-statutory-box">
                <span className="non-compliant-box-label text-slate-700">
                  Statutory Requirement:
                </span>
                <p className="non-compliant-box-text">{item.particulars}</p>
              </div>

              <div className="non-compliant-remarks-box">
                <div className="non-compliant-remarks-header">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>Auditor Remarks & Evidence:</span>
                </div>
                <p className="non-compliant-remarks-text">{item.remarks}</p>
              </div>

              {/* Vendor Response & Attached Proof Section */}
              {hasResponse && (
                <div className="non-compliant-vendor-response-box">
                  <div className="non-compliant-vendor-response-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Vendor Response (CAPA):</span>
                    </div>
                    {item.respondedAt && (
                      <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                        {new Date(item.respondedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {item.vendorResponse && item.vendorResponse.trim().length > 0 && (
                    <p className="non-compliant-vendor-response-text">{item.vendorResponse}</p>
                  )}

                  {item.actionPlan && item.actionPlan !== item.vendorResponse && (
                    <p className="non-compliant-vendor-action-text">
                      <strong>Action Plan:</strong> {item.actionPlan}
                    </p>
                  )}

                  {/* Attached Document Proof Card */}
                  {hasAttachment && (
                    <div style={{
                      marginTop: (item.vendorResponse && item.vendorResponse.trim().length > 0) ? '0.75rem' : '0.25rem',
                      padding: '0.625rem 0.875rem',
                      background: '#FFFFFF',
                      border: '1px solid #A7F3D0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#ECFDF5',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Paperclip style={{ width: '15px', height: '15px' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#065F46',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '220px'
                            }} title={attachmentFileName || 'CAPA Resolution Proof'}>
                              {attachmentFileName || 'CAPA Resolution Proof'}
                            </span>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: '#047857',
                              background: '#D1FAE5',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px'
                            }}>
                              Proof
                            </span>
                          </div>
                          {attachmentSize ? (
                            <span style={{ fontSize: '0.675rem', color: '#64748B' }}>
                              {formatSize(attachmentSize)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleViewAttachment(attachmentDocId, attachmentFallback, attachmentFileName)}
                          disabled={isBusy}
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            color: '#1565C0',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            cursor: isBusy ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          title="View attached document"
                        >
                          {isBusy ? (
                            <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Eye style={{ width: '12px', height: '12px' }} />
                          )}
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(attachmentDocId, attachmentFallback, attachmentFileName)}
                          disabled={isBusy}
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            color: '#047857',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            cursor: isBusy ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Download attached document"
                        >
                          {isBusy ? (
                            <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Download style={{ width: '12px', height: '12px' }} />
                          )}
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
