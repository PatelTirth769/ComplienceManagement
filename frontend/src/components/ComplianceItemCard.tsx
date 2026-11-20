import React, { useState } from 'react';
import type { ChecklistItem } from '../types/compliance';
import { useAudit } from '../context/AuditContext';
import { CheckCircle2, AlertTriangle, MinusCircle, MessageSquare, Scale, X, Layers } from 'lucide-react';
import { getDisplayLaw } from '../utils/actLawMatcher';

interface ComplianceItemCardProps {
  item: ChecklistItem;
}

export const ComplianceItemCard: React.FC<ComplianceItemCardProps> = ({ item }) => {
  const { responses, updateResponseStatus, updateResponseRemarks, validationErrors, getActLaw, isReadOnly, calculationResult, savedAudit } = useAudit();
  const [isLawModalOpen, setIsLawModalOpen] = useState(false);

  const isEvaluationReadOnly = Boolean(isReadOnly || calculationResult || savedAudit);

  const matchedLaw = getActLaw ? getActLaw(item) : null;
  const lawToDisplay = getDisplayLaw(item, matchedLaw);
  const lawDescription = (matchedLaw?.description || '').trim();

  const currentResponse = responses[item.id] || { status: '', remarks: '' };
  const currentStatus = currentResponse.status;
  const currentRemarks = currentResponse.remarks;
  const hasError = Boolean(validationErrors[item.id]);

  const paddedSrNo = String(item.serialNumber).padStart(2, '0');

  const statusClass = currentStatus ? `card-status-${currentStatus.toLowerCase().replace('_', '-')}` : 'card-status-pending';

  return (
    <div
      id={`checklist-item-${item.id}`}
      className={`compliance-item-card ${statusClass} ${hasError ? 'border-danger-ring' : ''}`}
    >
      <div className="item-header">
        <div className="item-identity">
          <span className="item-sr-no">{paddedSrNo}</span>
          <span className="badge badge-act">{item.type}</span>
          <span className="item-id-badge">{item.id}</span>

          {/* Law button near state number */}
          <button
            type="button"
            className={`badge-law-btn ${lawDescription ? 'has-rule' : ''}`}
            onClick={() => setIsLawModalOpen(true)}
            title={`View Law & Statutory Rule for ${matchedLaw?.shortName || item.type || 'this Act'}`}
          >
            <Scale className="w-3 h-3 mr-1 inline-block" />
            <span>Law</span>
          </button>
        </div>

        <div className="item-status-indicator">
          {isEvaluationReadOnly && (
            <span style={{ fontSize: '0.7rem', color: '#475569', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginRight: '4px' }}>
              Read-Only
            </span>
          )}
          {currentStatus === 'COMPLIANT' && (
            <span className="status-pill status-pill-compliant">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Compliant
            </span>
          )}
          {currentStatus === 'NON_COMPLIANT' && (
            <span className="status-pill status-pill-non-compliant">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Non-Compliant
            </span>
          )}
          {currentStatus === 'NA' && (
            <span className="status-pill status-pill-na">
              <MinusCircle className="w-3.5 h-3.5 mr-1" /> Not Applicable
            </span>
          )}
          {!currentStatus && (
            <span className="status-pill status-pill-pending">
              Pending Assessment
            </span>
          )}
        </div>
      </div>

      <div className="item-body">
        <h3 className="item-title">{item.title}</h3>

        <div className="item-particulars">
          <span className="particulars-label">Particulars of Statutory Details:</span>
          <p className="particulars-text">{item.particulars || item.statutoryRequirement}</p>
        </div>

        <div className="item-controls-grid">
          {/* Status Selection Buttons */}
          <div className="status-buttons-group">
            <label className="control-label">
              Compliance Status <span className="text-danger">*</span>
              {isEvaluationReadOnly && <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, marginLeft: '6px' }}>(Locked after calculation/save)</span>}
            </label>
            <div className="btn-group-status">
              <button
                type="button"
                disabled={isEvaluationReadOnly}
                className={`btn-status btn-status-compliant ${currentStatus === 'COMPLIANT' ? 'active' : ''}`}
                onClick={() => !isEvaluationReadOnly && updateResponseStatus(item.id, 'COMPLIANT')}
                style={isEvaluationReadOnly ? { cursor: 'not-allowed', opacity: currentStatus === 'COMPLIANT' ? 1 : 0.5 } : undefined}
                title={isEvaluationReadOnly ? 'Compliance assessment is in read-only mode after score calculation/save' : undefined}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5 inline-block" />
                <span>COMPLIANT</span>
              </button>

              <button
                type="button"
                disabled={isEvaluationReadOnly}
                className={`btn-status btn-status-non-compliant ${currentStatus === 'NON_COMPLIANT' ? 'active' : ''}`}
                onClick={() => !isEvaluationReadOnly && updateResponseStatus(item.id, 'NON_COMPLIANT')}
                style={isEvaluationReadOnly ? { cursor: 'not-allowed', opacity: currentStatus === 'NON_COMPLIANT' ? 1 : 0.5 } : undefined}
                title={isEvaluationReadOnly ? 'Compliance assessment is in read-only mode after score calculation/save' : undefined}
              >
                <AlertTriangle className="w-4 h-4 mr-1.5 inline-block" />
                <span>NON-COMPLIANT</span>
              </button>

              <button
                type="button"
                disabled={isEvaluationReadOnly}
                className={`btn-status btn-status-na ${currentStatus === 'NA' ? 'active' : ''}`}
                onClick={() => !isEvaluationReadOnly && updateResponseStatus(item.id, 'NA')}
                style={isEvaluationReadOnly ? { cursor: 'not-allowed', opacity: currentStatus === 'NA' ? 1 : 0.5 } : undefined}
                title={isEvaluationReadOnly ? 'Compliance assessment is in read-only mode after score calculation/save' : undefined}
              >
                <MinusCircle className="w-4 h-4 mr-1.5 inline-block" />
                <span>NA</span>
              </button>
            </div>
          </div>

          {/* Remarks Field */}
          <div className="remarks-field-group">
            <label className="control-label" htmlFor={`remarks-${item.id}`}>
              Remarks {currentStatus === 'NON_COMPLIANT' && <span className="text-danger">* (Required)</span>}
            </label>
            <div className="input-prefix-wrapper">
              <MessageSquare className="input-icon text-muted" />
              <input
                type="text"
                id={`remarks-${item.id}`}
                disabled={isEvaluationReadOnly}
                readOnly={isEvaluationReadOnly}
                className={`form-control ${currentStatus === 'NON_COMPLIANT' && !currentRemarks.trim() && hasError ? 'border-danger' : ''}`}
                placeholder={
                  isEvaluationReadOnly
                    ? (currentRemarks || 'No remarks recorded')
                    : currentStatus === 'NON_COMPLIANT'
                      ? 'Enter mandatory non-compliance findings or evidence...'
                      : 'Optional observations or document notes...'
                }
                value={currentRemarks}
                onChange={e => !isEvaluationReadOnly && updateResponseRemarks(item.id, e.target.value)}
                style={isEvaluationReadOnly ? { backgroundColor: '#F8FAFC', cursor: 'not-allowed', color: '#475569' } : undefined}
              />
            </div>
          </div>
        </div>

        {/* Error Message Alert */}
        {hasError && (
          <div className="item-error-alert">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{validationErrors[item.id]}</span>
          </div>
        )}
      </div>

      {/* Statutory Law Modal for this Act */}
      {isLawModalOpen && (
        <div className="law-modal-overlay" onClick={() => setIsLawModalOpen(false)}>
          <div className="law-modal-container" onClick={e => e.stopPropagation()}>
            <div className="law-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="law-modal-icon-badge">
                  <Scale className="w-5 h-5 text-[#1565C0]" />
                </div>
                <div>
                  <div className="law-modal-act-code">{lawToDisplay.shortName || item.type || 'Statutory Act'}</div>
                  <h3 className="law-modal-act-title">{lawToDisplay.actName || item.type}</h3>
                </div>
              </div>
              <button
                type="button"
                className="law-modal-close-btn"
                onClick={() => setIsLawModalOpen(false)}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="law-modal-body">
              {lawToDisplay.category && (
                <div className="law-modal-category">
                  <span className="law-category-pill">{lawToDisplay.category}</span>
                </div>
              )}

              <div className="law-modal-content-card">
                <div className="law-content-heading">Statutory Rule / Law Mandate:</div>
                {lawToDisplay.description?.trim() ? (
                  <div className="law-content-text">{lawToDisplay.description.trim()}</div>
                ) : (
                  <div className="law-content-empty">
                    <p>No statutory law description has been added for this Act yet.</p>
                    <span className="law-content-subtext">Admin can write and save rules in Admin Console &gt; Rules.</span>
                  </div>
                )}
              </div>

              {lawToDisplay.states && lawToDisplay.states.length > 0 && (
                <div className="law-modal-states">
                  <span className="law-states-title">Applicable Jurisdiction:</span>
                  <div className="law-states-tags">
                    {lawToDisplay.states.map((st, i) => (
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
                onClick={() => setIsLawModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
