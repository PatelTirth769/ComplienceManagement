import React, { useMemo } from 'react';
import { useAudit } from '../context/AuditContext';
import { Header } from '../components/Header';
import { AuditInformation } from '../components/AuditInformation';
import { AssessmentSummary } from '../components/AssessmentSummary';
import { SearchAndFilter } from '../components/SearchAndFilter';
import { CategorySection } from '../components/CategorySection';
import { ResultsDashboard } from '../components/ResultsDashboard';
import { Calculator, AlertCircle, Loader2 } from 'lucide-react';
import type { ChecklistItem } from '../types/compliance';

export const ComplianceCalculatorPage: React.FC = () => {
  const {
    checklist,
    responses,
    loadingChecklist,
    error,
    clearError,
    searchTerm,
    categoryFilter,
    statusFilter,
    calculateScore,
    calculating,
    progressMetrics
  } = useAudit();

  // Filter items dynamically based on search, category filter, and status filter
  const filteredChecklist = useMemo(() => {
    return checklist.filter(item => {
      // 1. Search filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchType = item.type.toLowerCase().includes(query);
        const matchParticulars = (item.particulars || item.statutoryRequirement || '').toLowerCase().includes(query);
        const matchId = item.id.toLowerCase().includes(query);
        const matchSr = String(item.serialNumber).includes(query);

        if (!matchTitle && !matchType && !matchParticulars && !matchId && !matchSr) {
          return false;
        }
      }

      // 2. Category filter
      if (categoryFilter !== 'ALL') {
        if (item.type.trim() !== categoryFilter.trim()) {
          return false;
        }
      }

      // 3. Status filter
      if (statusFilter !== 'ALL') {
        const resp = responses[item.id];
        const status = resp ? resp.status : '';

        if (statusFilter === 'PENDING' && status !== '') return false;
        if (statusFilter === 'COMPLIANT' && status !== 'COMPLIANT') return false;
        if (statusFilter === 'NON_COMPLIANT' && status !== 'NON_COMPLIANT') return false;
        if (statusFilter === 'NA' && status !== 'NA') return false;
      }

      return true;
    });
  }, [checklist, responses, searchTerm, categoryFilter, statusFilter]);

  // Group filtered items by category
  const groupedCategories = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    filteredChecklist.forEach(item => {
      const cat = item.type ? item.type.trim() : 'Other';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return groups;
  }, [filteredChecklist]);

  const categoryNames = Object.keys(groupedCategories);

  return (
    <div className="app-container">
      {/* Header */}
      <Header />

      <main className="main-content-layout">
        {/* Error Notification Alert Banner */}
        {error && (
          <div className="error-alert-banner">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-red-900">Validation / Connection Notice</h4>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button onClick={clearError} className="btn-close-alert" title="Dismiss error">
              &times;
            </button>
          </div>
        )}

        {/* Section 1: Audit Information */}
        <AuditInformation />

        {/* Section 2: Search and Filter Bar */}
        <SearchAndFilter />

        {/* Section 3: Main Split Assessment Area */}
        <div className="assessment-split-container">
          {/* LEFT: Checklist Section */}
          <div className="checklist-main-area">
            {loadingChecklist ? (
              <div className="card loading-placeholder-card">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <h3 className="font-semibold text-base text-slate-800">Loading Compliance Checklist...</h3>
                <p className="text-xs text-slate-500 mt-1">Extracting statutory items from backend repository...</p>
              </div>
            ) : checklist.length === 0 ? (
              <div className="card empty-placeholder-card">
                <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                <h3 className="font-semibold text-base text-slate-700">No Checklist Items Found</h3>
                <p className="text-xs text-slate-500 mt-1">Please verify that backend is running and vendor template is selected.</p>
              </div>
            ) : filteredChecklist.length === 0 ? (
              <div className="card empty-placeholder-card">
                <h3 className="font-semibold text-base text-slate-700">No Matching Items</h3>
                <p className="text-xs text-slate-500 mt-1">No compliance items match your current search or filter criteria.</p>
              </div>
            ) : (
              <div className="category-sections-list">
                {categoryNames.map(categoryName => (
                  <CategorySection
                    key={categoryName}
                    category={categoryName}
                    items={groupedCategories[categoryName]}
                  />
                ))}
              </div>
            )}

            {/* Calculate Compliance Score Action Bar */}
            <div className="calculate-action-bar card">
              <div className="calculate-info-left">
                <h3 className="font-bold text-slate-900 text-sm">Calculate Compliance Score</h3>
                <p className="text-xs text-slate-500">
                  {progressMetrics.pending > 0
                    ? `${progressMetrics.pending} items remain pending. Complete assessment before calculating.`
                    : 'All items assessed! Click button to process score via backend scoring engine.'}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-calculate"
                onClick={calculateScore}
                disabled={calculating || loadingChecklist}
              >
                {calculating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin inline-block" />
                    <span>Processing Calculation...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5 mr-2 inline-block" />
                    <span>Calculate Compliance Score</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Sticky Assessment Live Summary Sidebar */}
          <aside className="summary-sidebar-area">
            <div className="sticky-sidebar-wrapper">
              <AssessmentSummary />
            </div>
          </aside>
        </div>

        {/* Section 4: Results Dashboard (revealed after calculation) */}
        <ResultsDashboard />
      </main>
    </div>
  );
};
