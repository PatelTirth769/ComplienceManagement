import React, { useState } from 'react';
import { Award, AlertCircle, RotateCcw } from 'lucide-react';
import type { CalculationSummary } from '../types/compliance';
import { useAudit } from '../context/AuditContext';

interface ScoreMeterProps {
  summary: CalculationSummary;
}

export const ScoreMeter: React.FC<ScoreMeterProps> = ({ summary }) => {
  const { savedAudit, initiateReAuditAction, isReAuditInitiated, auditType } = useAudit();
  const [reAuditing, setReAuditing] = useState(false);

  const isAllNa = summary.score === null || summary.scoreDisplay === 'N/A';
  const numericScore = typeof summary.score === 'number' ? Math.max(0, Math.min(100, summary.score)) : 0;

  // Determine score color theme
  let scoreColorClass = 'score-emerald';
  let badgeLabel = 'Excellent Compliance';

  if (!isAllNa) {
    if (numericScore < 50) {
      scoreColorClass = 'score-danger';
      badgeLabel = 'Critical Risk';
    } else if (numericScore < 80) {
      scoreColorClass = 'score-warning';
      badgeLabel = 'Needs Improvement';
    }
  }

  return (
    <div className={`card score-meter-card ${scoreColorClass}`}>
      <div className="score-meter-header">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-current" />
          <h3 className="score-meter-title">Compliance Score</h3>
        </div>
        {!isAllNa && (
          <span className={`badge badge-score-${scoreColorClass}`}>
            {badgeLabel}
          </span>
        )}
      </div>

      <div className="score-meter-body">
        {isAllNa ? (
          <div className="all-na-box">
            <div className="score-display-text text-slate-500 font-bold text-5xl">N/A</div>
            <div className="all-na-alert">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{summary.message || 'No applicable compliance items have been assessed.'}</span>
            </div>
          </div>
        ) : (
          <div className="score-main-display">
            <div className="score-display-number">{summary.scoreDisplay}</div>

            {/* Re-Audit Prompt shown just below the percent after saving audit */}
            {savedAudit && auditType !== 'Re-Audit' && !isReAuditInitiated && (
              <div 
                className="re-audit-prompt-box"
                style={{
                  margin: '0.75rem auto 0.75rem auto',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '9999px',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px dashed #6366F1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.08)'
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>
                  Do you want to Re-Audit?
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Do you want to initiate a Re-Audit for this cycle? The current original audit will become Read-Only, and you will be able to complete and save the Re-Audit.')) return;
                    setReAuditing(true);
                    await initiateReAuditAction();
                    setReAuditing(false);
                  }}
                  disabled={reAuditing}
                  style={{
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.3rem 0.9rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: reAuditing ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Click to initiate Re-Audit for this cycle"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${reAuditing ? 'animate-spin' : ''}`} />
                  <span>{reAuditing ? 'Initiating...' : 'Yes, Re-Audit'}</span>
                </button>
              </div>
            )}

            {(isReAuditInitiated || auditType === 'Re-Audit') && (
              <div 
                className="re-audit-active-banner"
                style={{
                  margin: '0.75rem auto 0.75rem auto',
                  padding: '0.4rem 0.9rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#F5F3FF',
                  border: '1px solid #DDD6FE',
                  color: '#6D28D9',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                <span>Re-Audit Mode Active · Original Audit is now Read-Only</span>
              </div>
            )}

            {/* Score Progress Bar */}
            <div className="score-track-bg">
              <div
                className={`score-track-fill ${scoreColorClass}`}
                style={{ width: `${numericScore}%` }}
              />
            </div>

            <p className="score-subtext">
              Calculated based on {summary.compliantItems} compliant items out of {summary.applicableItems} applicable statutory requirements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
