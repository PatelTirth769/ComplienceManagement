import React from 'react';
import type { NonCompliantItemDetail } from '../types/compliance';
import { AlertTriangle, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

interface NonCompliantListProps {
  items: NonCompliantItemDetail[];
}

export const NonCompliantList: React.FC<NonCompliantListProps> = ({ items }) => {
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
        {items.map((item, idx) => (
          <div key={item.itemId || idx} className="non-compliant-item-box">
            <div className="non-compliant-item-top">
              <div className="non-compliant-item-badges">
                <span className="sr-badge">{String(item.serialNumber).padStart(2, '0')}</span>
                <span className="badge badge-act">{item.type}</span>
                <span className="item-id-code">{item.itemId}</span>
              </div>
              <span className="action-required-pill">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Action Required
              </span>
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
          </div>
        ))}
      </div>
    </div>
  );
};

