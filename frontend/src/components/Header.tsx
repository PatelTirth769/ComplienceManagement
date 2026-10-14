import React from 'react';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { useAudit } from '../context/AuditContext';

export const Header: React.FC = () => {
  const { resetAssessment } = useAudit();

  return (
    <header className="header-container">
      <div className="header-content">
        <div className="header-brand">
          <div className="header-icon-wrapper">
            <ShieldCheck className="header-icon" />
          </div>
          <div>
            <h1 className="header-title">Compliance Score Calculator</h1>
            <p className="header-subtitle">Vendor Compliance Assessment & Audit Management</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            onClick={resetAssessment}
            className="btn btn-header-action"
            title="Reset assessment state and start a new audit"
          >
            <RotateCcw className="btn-icon" />
            <span>New Assessment</span>
          </button>
        </div>
      </div>
    </header>
  );
};
