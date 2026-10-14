import React from 'react';
import { PieChart, CheckCircle2, AlertTriangle, MinusCircle, Clock, ListChecks } from 'lucide-react';
import { useAudit } from '../context/AuditContext';

export const AssessmentSummary: React.FC = () => {
  const { progressMetrics } = useAudit();
  const { total, completed, compliant, nonCompliant, na, pending, percentComplete } = progressMetrics;

  return (
    <div className="card summary-panel-card">
      <div className="card-header summary-panel-header">
        <div className="card-title-group">
          <div className="summary-title-icon-wrapper">
            <PieChart className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="card-title text-sm font-bold text-slate-900">Live Progress Summary</h3>
            <p className="text-xs text-slate-500 font-normal">Real-time completion tracker</p>
          </div>
        </div>
        <span className="badge badge-neutral font-mono font-bold">{percentComplete}%</span>
      </div>

      <div className="summary-panel-body">
        {/* Completion Progress Bar */}
        <div className="summary-progress-wrapper">
          <div className="summary-progress-labels">
            <span className="summary-progress-title">Completion Status</span>
            <span className="summary-progress-count">{completed} / {total} items</span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Breakdown Metrics Grid */}
        <div className="summary-metrics-grid">
          {/* Total Items */}
          <div className="metric-box metric-box-total">
            <div className="metric-box-top">
              <ListChecks className="metric-icon text-slate-600" />
              <span className="metric-label">Total Items</span>
            </div>
            <div className="metric-value text-slate-900">{total}</div>
          </div>

          {/* Completed */}
          <div className="metric-box metric-box-completed">
            <div className="metric-box-top">
              <ListChecks className="metric-icon text-blue-600" />
              <span className="metric-label">Completed</span>
            </div>
            <div className="metric-value text-blue-700">{completed}</div>
          </div>

          {/* Compliant */}
          <div className="metric-box metric-box-compliant">
            <div className="metric-box-top">
              <CheckCircle2 className="metric-icon text-emerald-600" />
              <span className="metric-label">Compliant</span>
            </div>
            <div className="metric-value text-emerald-700">{compliant}</div>
          </div>

          {/* Non-Compliant */}
          <div className="metric-box metric-box-non-compliant">
            <div className="metric-box-top">
              <AlertTriangle className="metric-icon text-amber-600" />
              <span className="metric-label">Non-Compliant</span>
            </div>
            <div className="metric-value text-amber-700">{nonCompliant}</div>
          </div>

          {/* NA */}
          <div className="metric-box metric-box-na">
            <div className="metric-box-top">
              <MinusCircle className="metric-icon text-slate-500" />
              <span className="metric-label">NA</span>
            </div>
            <div className="metric-value text-slate-700">{na}</div>
          </div>

          {/* Pending */}
          <div className="metric-box metric-box-pending">
            <div className="metric-box-top">
              <Clock className="metric-icon text-indigo-600" />
              <span className="metric-label">Pending</span>
            </div>
            <div className="metric-value text-indigo-700">{pending}</div>
          </div>
        </div>

        {/* Status Notice Banner */}
        {pending > 0 ? (
          <div className="summary-notice-banner summary-notice-pending">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-950 block">{pending} Items Pending</span>
              <p className="text-xs text-indigo-800 leading-snug mt-0.5">
                Assess all items before calculating score.
              </p>
            </div>
          </div>
        ) : (
          <div className="summary-notice-banner summary-notice-complete">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950 block">All Items Assessed!</span>
              <p className="text-xs text-emerald-800 leading-snug mt-0.5">
                Ready to generate compliance score.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

