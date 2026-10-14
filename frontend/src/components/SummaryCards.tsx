import React from 'react';
import type { CalculationSummary } from '../types/compliance';
import { ListChecks, CheckCircle2, AlertTriangle, MinusCircle, FileSpreadsheet } from 'lucide-react';

interface SummaryCardsProps {
  summary: CalculationSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="summary-cards-grid">
      <div className="card summary-stat-card">
        <div className="stat-icon-wrapper bg-slate-100 text-slate-700">
          <ListChecks className="w-5 h-5" />
        </div>
        <div>
          <div className="stat-label">Total Items</div>
          <div className="stat-value text-slate-800">{summary.totalItems}</div>
        </div>
      </div>

      <div className="card summary-stat-card">
        <div className="stat-icon-wrapper bg-blue-100 text-blue-700">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <div className="stat-label">Applicable Items</div>
          <div className="stat-value text-blue-800">{summary.applicableItems}</div>
        </div>
      </div>

      <div className="card summary-stat-card">
        <div className="stat-icon-wrapper bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="stat-label">Compliant</div>
          <div className="stat-value text-emerald-800">{summary.compliantItems}</div>
        </div>
      </div>

      <div className="card summary-stat-card">
        <div className="stat-icon-wrapper bg-amber-100 text-amber-700">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="stat-label">Non-Compliant</div>
          <div className="stat-value text-amber-800">{summary.nonCompliantItems}</div>
        </div>
      </div>

      <div className="card summary-stat-card">
        <div className="stat-icon-wrapper bg-slate-100 text-slate-600">
          <MinusCircle className="w-5 h-5" />
        </div>
        <div>
          <div className="stat-label">Not Applicable</div>
          <div className="stat-value text-slate-700">{summary.naItems}</div>
        </div>
      </div>
    </div>
  );
};
