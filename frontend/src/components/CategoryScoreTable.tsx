import React from 'react';
import type { CategoryScore } from '../types/compliance';
import { Layers } from 'lucide-react';

interface CategoryScoreTableProps {
  categoryScores: CategoryScore[];
}

export const CategoryScoreTable: React.FC<CategoryScoreTableProps> = ({ categoryScores }) => {
  return (
    <div className="card category-table-card">
      <div className="card-header border-b">
        <div className="card-title-group">
          <Layers className="card-icon text-primary" />
          <h3 className="card-title">Category-Wise Score Breakdown</h3>
        </div>
        <span className="badge badge-neutral">{categoryScores.length} Categories</span>
      </div>

      <div className="table-responsive">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Compliance Category / Act</th>
              <th className="text-center">Total</th>
              <th className="text-center">Applicable</th>
              <th className="text-center">Compliant</th>
              <th className="text-center">Non-Compliant</th>
              <th className="text-center">NA</th>
              <th className="text-right">Category Score</th>
            </tr>
          </thead>
          <tbody>
            {categoryScores.map((cat, idx) => {
              const isAllNaCat = cat.score === null || cat.scoreDisplay === 'N/A';
              const numScore = cat.score ?? 0;

              let scoreBadgeClass = 'badge-emerald';
              if (isAllNaCat) {
                scoreBadgeClass = 'badge-slate';
              } else if (numScore < 50) {
                scoreBadgeClass = 'badge-amber';
              } else if (numScore < 80) {
                scoreBadgeClass = 'badge-warning';
              }

              return (
                <tr key={idx}>
                  <td className="font-semibold text-slate-800">{cat.category}</td>
                  <td className="text-center font-medium">{cat.totalItems}</td>
                  <td className="text-center font-medium text-blue-700">{cat.applicableItems}</td>
                  <td className="text-center font-medium text-emerald-700">{cat.compliantItems}</td>
                  <td className="text-center font-medium text-amber-700">{cat.nonCompliantItems}</td>
                  <td className="text-center font-medium text-slate-500">{cat.naItems}</td>
                  <td className="text-right font-bold">
                    <span className={`badge ${scoreBadgeClass}`}>
                      {cat.scoreDisplay}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
