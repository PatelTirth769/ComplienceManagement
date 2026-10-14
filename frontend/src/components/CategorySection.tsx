import React, { useState } from 'react';
import type { ChecklistItem } from '../types/compliance';
import { ComplianceItemCard } from './ComplianceItemCard';
import { ChevronDown, ChevronUp, Layers, CheckCircle2 } from 'lucide-react';
import { useAudit } from '../context/AuditContext';

interface CategorySectionProps {
  category: string;
  items: ChecklistItem[];
}

export const CategorySection: React.FC<CategorySectionProps> = ({ category, items }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const { responses } = useAudit();

  let completedCount = 0;
  items.forEach(item => {
    if (responses[item.id] && responses[item.id].status) {
      completedCount++;
    }
  });

  const totalCount = items.length;
  const isCategoryComplete = completedCount === totalCount && totalCount > 0;

  return (
    <div className="category-section-card">
      <button
        type="button"
        className="category-header-btn"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="category-header-left">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="category-name">{category}</h3>
          <span className="badge badge-neutral">
            {completedCount} / {totalCount} completed
          </span>
          {isCategoryComplete && (
            <span className="badge badge-success-outline">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
            </span>
          )}
        </div>

        <div className="category-header-right">
          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
        </div>
      </button>

      {isExpanded && (
        <div className="category-items-container">
          {items.map(item => (
            <ComplianceItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
