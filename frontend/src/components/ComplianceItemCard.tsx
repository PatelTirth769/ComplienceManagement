import React from 'react';
import type { ChecklistItem } from '../types/compliance';
import { useAudit } from '../context/AuditContext';
import { CheckCircle2, AlertTriangle, MinusCircle, MessageSquare } from 'lucide-react';

interface ComplianceItemCardProps {
  item: ChecklistItem;
}

export const ComplianceItemCard: React.FC<ComplianceItemCardProps> = ({ item }) => {
  const { responses, updateResponseStatus, updateResponseRemarks, validationErrors } = useAudit();

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
        </div>

        <div className="item-status-indicator">
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
            <label className="control-label">Compliance Status <span className="text-danger">*</span></label>
            <div className="btn-group-status">
              <button
                type="button"
                className={`btn-status btn-status-compliant ${currentStatus === 'COMPLIANT' ? 'active' : ''}`}
                onClick={() => updateResponseStatus(item.id, 'COMPLIANT')}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5 inline-block" />
                <span>COMPLIANT</span>
              </button>

              <button
                type="button"
                className={`btn-status btn-status-non-compliant ${currentStatus === 'NON_COMPLIANT' ? 'active' : ''}`}
                onClick={() => updateResponseStatus(item.id, 'NON_COMPLIANT')}
              >
                <AlertTriangle className="w-4 h-4 mr-1.5 inline-block" />
                <span>NON-COMPLIANT</span>
              </button>

              <button
                type="button"
                className={`btn-status btn-status-na ${currentStatus === 'NA' ? 'active' : ''}`}
                onClick={() => updateResponseStatus(item.id, 'NA')}
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
                className={`form-control ${currentStatus === 'NON_COMPLIANT' && !currentRemarks.trim() && hasError ? 'border-danger' : ''}`}
                placeholder={
                  currentStatus === 'NON_COMPLIANT'
                    ? 'Enter mandatory non-compliance findings or evidence...'
                    : 'Optional observations or document notes...'
                }
                value={currentRemarks}
                onChange={e => updateResponseRemarks(item.id, e.target.value)}
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
    </div>
  );
};
