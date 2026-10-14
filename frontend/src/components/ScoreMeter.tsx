import React from 'react';
import { Award, AlertCircle } from 'lucide-react';
import type { CalculationSummary } from '../types/compliance';

interface ScoreMeterProps {
  summary: CalculationSummary;
}

export const ScoreMeter: React.FC<ScoreMeterProps> = ({ summary }) => {
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
