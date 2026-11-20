import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type {
  VendorType,
  ChecklistItem,
  ComplianceStatus,
  ComplianceResponse,
  AuditInformation,
  CalculationResult,
  AuditRecord,
  InterviewResource
} from '../types/compliance';
import { getVendorTypes, getChecklist, calculateCompliance, saveAudit, initiateReAudit, getActRules, type ActRule, API_BASE_URL } from '../services/api';
import { findActRule } from '../utils/actLawMatcher';

interface AuditContextType {
  vendorTypes: VendorType[];
  selectedVendorType: string;
  selectedState: string;
  selectedCountry: string;
  auditInfo: AuditInformation;
  checklist: ChecklistItem[];
  responses: Record<string, { status: ComplianceStatus | ''; remarks: string }>;
  calculationResult: CalculationResult | null;
  savedAudit: AuditRecord | null;
  actRules: ActRule[];
  getActLaw: (item: ChecklistItem) => ActRule | null;
  interviewResources: InterviewResource[];
  setInterviewResources: React.Dispatch<React.SetStateAction<InterviewResource[]>>;
  loadingVendorTypes: boolean;
  loadingChecklist: boolean;
  calculating: boolean;
  saving: boolean;
  error: string | null;
  validationErrors: Record<string, string>;

  // Audit Type & Workflow
  activeAuditId: string | null;
  auditType: 'Original' | 'Re-Audit';
  isReadOnly: boolean;
  isReAuditInitiated: boolean;
  setActiveAuditId: (id: string | null) => void;
  setAuditType: (type: 'Original' | 'Re-Audit') => void;
  setIsReadOnly: (readOnly: boolean) => void;
  initiateReAuditAction: () => Promise<boolean>;
  loadAuditRecord: (audit: any) => Promise<boolean>;
  
  // Filters
  searchTerm: string;
  categoryFilter: string;
  statusFilter: string;

  // Actions
  setSelectedVendorType: (vendorType: string) => void;
  setSelectedState: (state: string) => void;
  setSelectedCountry: (country: string) => void;
  updateAuditInfo: (field: keyof AuditInformation, value: any) => void;
  updateResponseStatus: (itemId: string, status: ComplianceStatus) => void;
  updateResponseRemarks: (itemId: string, remarks: string) => void;
  setSearchTerm: (term: string) => void;
  setCategoryFilter: (category: string) => void;
  setStatusFilter: (status: string) => void;
  calculateScore: () => Promise<boolean>;
  saveAuditRecord: () => Promise<boolean>;
  resetAssessment: () => void;
  clearError: () => void;

  // UI Progress Derived Metrics
  progressMetrics: {
    total: number;
    completed: number;
    compliant: number;
    nonCompliant: number;
    na: number;
    pending: number;
    percentComplete: number;
  };
  
  // Dynamic categories extracted from checklist
  categories: string[];
}

const initialAuditInfo: AuditInformation = {
  organisation: '',
  site: '',
  auditMonth: '',
  auditDate: new Date().toISOString().split('T')[0],
  conductedAt: '',
  auditor: '',
  vendorRepresentative: '',
  clientRepresentative: '',
  employeeCount: '',
  vendorType: 'other-vendor',
  country: 'India',
  state: 'All'
};

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vendorTypes, setVendorTypes] = useState<VendorType[]>([]);
  const [selectedVendorType, setSelectedVendorTypeState] = useState<string>('other-vendor');
  const [selectedState, setSelectedStateState] = useState<string>('All');
  const [selectedCountry, setSelectedCountryState] = useState<string>('India');
  const [auditInfo, setAuditInfo] = useState<AuditInformation>(initialAuditInfo);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [responses, setResponses] = useState<Record<string, { status: ComplianceStatus | ''; remarks: string }>>({});
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [savedAudit, setSavedAudit] = useState<AuditRecord | null>(null);
  const [actRules, setActRules] = useState<ActRule[]>([]);
  const [interviewResources, setInterviewResources] = useState<InterviewResource[]>([]);

  // Re-Audit and active workflow state
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [auditType, setAuditType] = useState<'Original' | 'Re-Audit'>('Original');
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isReAuditInitiated, setIsReAuditInitiated] = useState<boolean>(false);

  // Helper to match checklist item with corresponding statutory Act Rule
  const getActLaw = (item: ChecklistItem): ActRule | null => {
    return findActRule(item, actRules);
  };

  const [loadingVendorTypes, setLoadingVendorTypes] = useState<boolean>(true);
  const [loadingChecklist, setLoadingChecklist] = useState<boolean>(false);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const isAuditLoadingRef = React.useRef<boolean>(false);

  // Load Vendor Types on mount
  useEffect(() => {
    let isMounted = true;
    const loadTypes = async () => {
      try {
        setLoadingVendorTypes(true);
        setError(null);
        const types = await getVendorTypes();
        if (isMounted && types && types.length > 0) {
          setVendorTypes(types);
          if (!selectedVendorType) {
            setSelectedVendorTypeState(types[0].id);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.response?.data?.error?.message ||
              `Unable to load vendor types from backend. Please verify backend is running at ${API_BASE_URL}`
          );
        }
      } finally {
        if (isMounted) setLoadingVendorTypes(false);
      }
    };
    loadTypes();

    getActRules().then(res => {
      if (isMounted && res.success && Array.isArray(res.rules)) {
        setActRules(res.rules);
      }
    }).catch(console.warn);

    return () => {
      isMounted = false;
    };
  }, []);

  // Load Checklist when selectedVendorType or selectedState or selectedCountry changes
  useEffect(() => {
    if (isAuditLoadingRef.current) return;
    if (!selectedVendorType) return;
    let isMounted = true;

    const loadChecklistData = async () => {
      try {
        setLoadingChecklist(true);
        setError(null);
        const data = await getChecklist(selectedVendorType, selectedState, selectedCountry);
        if (isMounted) {
          setChecklist(data.checklist);
          const initialResp: Record<string, { status: ComplianceStatus | ''; remarks: string }> = {};
          data.checklist.forEach(item => {
            initialResp[item.id] = { status: '', remarks: '' };
          });
          setResponses(initialResp);
          setCalculationResult(null);
          setSavedAudit(null);
          setValidationErrors({});
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.response?.data?.error?.message ||
              `Unable to load checklist template for '${selectedVendorType}'. Please check backend connection.`
          );
        }
      } finally {
        if (isMounted) setLoadingChecklist(false);
      }
    };

    loadChecklistData();
    return () => {
      isMounted = false;
    };
  }, [selectedVendorType, selectedState, selectedCountry]);

  const setSelectedVendorType = (vendorType: string) => {
    setSelectedVendorTypeState(vendorType);
    setAuditInfo(prev => ({ ...prev, vendorType }));
  };

  const setSelectedState = (state: string) => {
    setSelectedStateState(state);
    setAuditInfo(prev => ({ ...prev, state }));
  };

  const setSelectedCountry = (country: string) => {
    setSelectedCountryState(country);
    setAuditInfo(prev => ({ ...prev, country }));
  };

  const updateAuditInfo = (field: keyof AuditInformation, value: any) => {
    setAuditInfo(prev => ({ ...prev, [field]: value }));
    if (value !== '' && value !== null && value !== undefined && String(value).trim() !== '') {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateResponseStatus = (itemId: string, status: ComplianceStatus) => {
    if (isReadOnly || calculationResult || savedAudit) {
      return;
    }
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status
      }
    }));

    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const updateResponseRemarks = (itemId: string, remarks: string) => {
    if (isReadOnly || calculationResult || savedAudit) {
      return;
    }
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        remarks
      }
    }));

    if (remarks.trim() !== '') {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    checklist.forEach(item => {
      if (item.type) set.add(item.type.trim());
    });
    return Array.from(set);
  }, [checklist]);

  const progressMetrics = useMemo(() => {
    const total = checklist.length;
    let completed = 0;
    let compliant = 0;
    let nonCompliant = 0;
    let na = 0;

    checklist.forEach(item => {
      const resp = responses[item.id];
      if (resp && resp.status) {
        completed++;
        if (resp.status === 'COMPLIANT') compliant++;
        else if (resp.status === 'NON_COMPLIANT') nonCompliant++;
        else if (resp.status === 'NA') na++;
      }
    });

    const pending = total - completed;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      compliant,
      nonCompliant,
      na,
      pending,
      percentComplete
    };
  }, [checklist, responses]);

  const validateBeforeCalculation = (): boolean => {
    const errors: Record<string, string> = {};
    let firstErrorField: string | null = null;
    let firstErrorItemId: string | null = null;

    // 1. Validate all 10 Audit Information fields
    if (!selectedVendorType || !selectedVendorType.trim()) {
      errors.vendorType = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'vendorType';
    }
    if (!auditInfo.organisation || !auditInfo.organisation.trim()) {
      errors.organisation = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'organisation';
    }
    if (!auditInfo.site || !auditInfo.site.trim()) {
      errors.site = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'site';
    }
    if (!auditInfo.auditMonth || !auditInfo.auditMonth.trim()) {
      errors.auditMonth = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'auditMonth';
    }
    if (!auditInfo.auditDate || !auditInfo.auditDate.trim()) {
      errors.auditDate = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'auditDate';
    }
    if (!auditInfo.conductedAt || !auditInfo.conductedAt.trim()) {
      errors.conductedAt = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'conductedAt';
    }
    if (!auditInfo.auditor || !auditInfo.auditor.trim()) {
      errors.auditor = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'auditor';
    }
    if (!auditInfo.vendorRepresentative || !auditInfo.vendorRepresentative.trim()) {
      errors.vendorRepresentative = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'vendorRepresentative';
    }
    if (!auditInfo.clientRepresentative || !auditInfo.clientRepresentative.trim()) {
      errors.clientRepresentative = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'clientRepresentative';
    }
    if (auditInfo.employeeCount === '' || auditInfo.employeeCount === null || auditInfo.employeeCount === undefined) {
      errors.employeeCount = 'This field is required.';
      if (!firstErrorField) firstErrorField = 'employeeCount';
    }

    // 2. Validate Checklist responses
    checklist.forEach(item => {
      const resp = responses[item.id];
      if (!resp || !resp.status) {
        errors[item.id] = 'Item assessment is pending.';
        if (!firstErrorItemId) firstErrorItemId = item.id;
      } else if (resp.status === 'NON_COMPLIANT' && (!resp.remarks || resp.remarks.trim() === '')) {
        errors[item.id] = 'Remarks are required for non-compliant items.';
        if (!firstErrorItemId) firstErrorItemId = item.id;
      }
    });

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (firstErrorField) {
        setError('Please complete all required Audit Information fields before calculating score.');
        const el = document.getElementById(firstErrorField);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      } else {
        setError('Please resolve all pending items and required remarks before calculating score.');
        if (firstErrorItemId) {
          const el = document.getElementById(`checklist-item-${firstErrorItemId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
      return false;
    }

    setError(null);
    return true;
  };

  const calculateScore = async (): Promise<boolean> => {
    if (!validateBeforeCalculation()) {
      return false;
    }

    try {
      setCalculating(true);
      setError(null);

      const payloadResponses: ComplianceResponse[] = checklist.map(item => ({
        itemId: item.id,
        status: responses[item.id].status as ComplianceStatus,
        remarks: responses[item.id].remarks || ''
      }));

      const payload = {
        vendorType: selectedVendorType,
        responses: payloadResponses,
        state: selectedState,
        country: selectedCountry
      };

      const result = await calculateCompliance(payload);
      setCalculationResult(result);

      setTimeout(() => {
        const resultsEl = document.getElementById('results-section');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      return true;
    } catch (err: any) {
      const backendErr = err?.response?.data?.error;
      const errMsg = backendErr?.message || 'Error occurred during compliance score calculation.';
      setError(errMsg);

      if (backendErr?.itemId) {
        setValidationErrors(prev => ({
          ...prev,
          [backendErr.itemId]: backendErr.message
        }));
      }
      return false;
    } finally {
      setCalculating(false);
    }
  };

  const saveAuditRecord = async (): Promise<boolean> => {
    if (!calculationResult) {
      setError('Please calculate compliance score before saving audit.');
      return false;
    }

    try {
      setSaving(true);
      setError(null);

      const payloadResponses: ComplianceResponse[] = checklist.map(item => ({
        itemId: item.id,
        status: responses[item.id].status as ComplianceStatus,
        remarks: responses[item.id].remarks || '',
        title: item.title,
        particulars: item.particulars || item.statutoryRequirement,
        type: item.type,
        actNameInShort: item.actNameInShort || (item as any)['Act Name in Short'],
        nameOfAct: item.nameOfAct || (item as any)['Name of the Act'],
        category: item.vendorCategory || (item as any).category
      }));

      const auditPayload = {
        ...auditInfo,
        country: selectedCountry,
        state: selectedState,
        vendorType: selectedVendorType,
        responses: payloadResponses,
        auditId: activeAuditId || savedAudit?.id,
        auditType: auditType,
        actRules: actRules,
        interviewResources: interviewResources
      };

      const res = await saveAudit(auditPayload);
      if (res.success && res.data) {
        setSavedAudit(res.data);
        setIsReadOnly(true);
        if (res.data.id) {
          setActiveAuditId(res.data.id);
          try {
            localStorage.setItem('compliance_active_audit_id', res.data.id);
          } catch (e) {
            // ignore localStorage quota/access error
          }
        }
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to save audit record.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const initiateReAuditAction = async (): Promise<boolean> => {
    const targetAuditId = activeAuditId || savedAudit?.id;
    if (!targetAuditId) {
      setError('Cannot initiate Re-Audit without a valid saved audit record.');
      return false;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await initiateReAudit(targetAuditId);
      if (res.success && res.data) {
        setActiveAuditId(res.data.id);
        try {
          localStorage.setItem('compliance_active_audit_id', res.data.id);
        } catch (e) {
          // ignore
        }
        setAuditType('Re-Audit');
        setIsReadOnly(false);
        setSavedAudit(null); // Reset saved status so auditor can re-evaluate and save anew
        setCalculationResult(null); // Clear previous score and results dashboard
        setIsReAuditInitiated(true);
        setValidationErrors({});
        setError(null);

        // Reset all checklist item responses to empty so auditor evaluates fresh
        const freshResponses: Record<string, { status: ComplianceStatus | ''; remarks: string }> = {};
        checklist.forEach(item => {
          freshResponses[item.id] = { status: '', remarks: '' };
        });
        setResponses(freshResponses);

        // Scroll smoothly to checklist assessment area
        setTimeout(() => {
          const targetEl = document.querySelector('.assessment-split-container') || document.querySelector('.category-sections-list') || document.querySelector('.audit-info-card');
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 150);

        return true;
      }
      return false;
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to initiate Re-Audit.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Fully loads an assigned audit into context:
   * - Restores checklist template for the audit's vendor type and state
   * - Restores all item responses (compliant / non-compliant / na / remarks)
   * - Restores calculationResult (score, percentage, category scores, non-compliant findings)
   * - Restores savedAudit so "Audit Saved" badge, Excel export, and "Do you want to Re-Audit?" message render immediately
   */
  const loadAuditRecord = async (audit: any): Promise<boolean> => {
    if (!audit) return false;
    try {
      isAuditLoadingRef.current = true;
      setLoadingChecklist(true);
      setError(null);

      const targetId = audit.id || audit.auditIdString;
      setActiveAuditId(targetId);
      try {
        localStorage.setItem('compliance_active_audit_id', targetId);
      } catch (e) {}

      const isRe = audit.auditType === 'Re-Audit' || audit.auditType === 'Re Audit';
      setAuditType(isRe ? 'Re-Audit' : 'Original');
      setIsReadOnly(audit.isReadOnly === true);
      setIsReAuditInitiated(false);

      // Restore snapshotted Act rules / laws for this audit
      if (audit.actRules && Array.isArray(audit.actRules) && audit.actRules.length > 0) {
        setActRules(audit.actRules);
      } else {
        getActRules().then(res => {
          if (res.success && Array.isArray(res.rules)) {
            setActRules(res.rules);
          }
        }).catch(console.warn);
      }

      // Restore interview resources if present
      if (audit.interviewResources && Array.isArray(audit.interviewResources)) {
        setInterviewResources(audit.interviewResources);
      } else {
        setInterviewResources([]);
      }

      // Normalize vendorType, state, country
      let vType = 'other-vendor';
      if (audit.vendorType) {
        const raw = String(audit.vendorType).toLowerCase().replace(/_/g, '-');
        if (raw.includes('security')) {
          vType = 'security-vendor';
        } else {
          vType = 'other-vendor';
        }
      }
      const vState = audit.state || 'All';
      const vCountry = audit.country || 'India';

      setSelectedVendorTypeState(vType);
      setSelectedStateState(vState);
      setSelectedCountryState(vCountry);

      const updatedInfo: AuditInformation = {
        organisation: audit.customerName || audit.organisation || audit.customer || '',
        site: audit.site || 'Main Facility',
        auditMonth: audit.auditPeriod || audit.auditMonth || '',
        auditDate: audit.startDate || audit.auditDate || new Date().toISOString().split('T')[0],
        conductedAt: audit.conductedAt || 'Onsite Facility',
        auditor: audit.auditorName || audit.auditor || 'Auditor',
        vendorRepresentative: audit.vendorRepresentative || audit.vendorName || '',
        clientRepresentative: audit.clientRepresentative || audit.customerName || '',
        employeeCount: audit.employeeCount !== undefined && audit.employeeCount !== null ? audit.employeeCount : 100,
        vendorType: vType,
        country: vCountry,
        state: vState
      };
      setAuditInfo(updatedInfo);

      // Fetch checklist for this vendor type and location
      const checklistData = await getChecklist(vType, vState, vCountry);
      const items: ChecklistItem[] = checklistData?.checklist || [];
      setChecklist(items);

      // Reconstruct responses from audit.responses if available
      const restoredResp: Record<string, { status: ComplianceStatus | ''; remarks: string }> = {};
      items.forEach(item => {
        restoredResp[item.id] = { status: '', remarks: '' };
      });

      if (Array.isArray(audit.responses)) {
        audit.responses.forEach((r: any) => {
          if (r && r.itemId) {
            restoredResp[r.itemId] = {
              status: (r.status as ComplianceStatus) || '',
              remarks: r.remarks || ''
            };
          }
        });
      } else if (audit.responses && typeof audit.responses === 'object') {
        Object.entries(audit.responses).forEach(([itemId, val]: [string, any]) => {
          restoredResp[itemId] = {
            status: typeof val === 'string' ? (val as ComplianceStatus) : ((val?.status as ComplianceStatus) || ''),
            remarks: val?.remarks || ''
          };
        });
      }
      setResponses(restoredResp);

      // If this audit was calculated and saved (has summary or numeric score)
      if (audit.summary || typeof audit.score === 'number') {
        const scoreVal = typeof audit.score === 'number' ? audit.score : (audit.summary?.score ?? 0);
        const scoreDisp = audit.summary?.scoreDisplay || `${scoreVal.toFixed(2)}%`;

        const calcRes: CalculationResult = {
          success: true,
          vendorType: vType,
          country: vCountry,
          state: vState,
          summary: {
            totalItems: audit.summary?.totalItems ?? items.length,
            applicableItems: audit.summary?.applicableItems ?? items.length,
            compliantItems: audit.summary?.compliantItems ?? 0,
            nonCompliantItems: audit.summary?.nonCompliantItems ?? 0,
            naItems: audit.summary?.naItems ?? audit.summary?.notApplicableItems ?? 0,
            score: scoreVal,
            scoreDisplay: scoreDisp,
            message: audit.summary?.message
          },
          categoryScores: audit.categoryScores || [],
          nonCompliantItems: audit.nonCompliantItems || []
        };
        setCalculationResult(calcRes);
        setSavedAudit({
          id: targetId,
          auditIdString: audit.auditIdString || targetId,
          ...audit
        });
      } else {
        setCalculationResult(null);
        setSavedAudit(null);
      }

      setValidationErrors({});
      return true;
    } catch (err: any) {
      console.error('Error loading audit record into context:', err);
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load audit record.');
      return false;
    } finally {
      setLoadingChecklist(false);
      setTimeout(() => {
        isAuditLoadingRef.current = false;
      }, 100);
    }
  };

  const resetAssessment = () => {
    try {
      localStorage.removeItem('compliance_active_audit_id');
    } catch (e) {}
    setAuditInfo(initialAuditInfo);
    setSelectedStateState('All');
    setSelectedCountryState('India');
    setCalculationResult(null);
    setSavedAudit(null);
    setActiveAuditId(null);
    setAuditType('Original');
    setIsReadOnly(false);
    setIsReAuditInitiated(false);
    setError(null);
    setValidationErrors({});
    setSearchTerm('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');

    const resetResp: Record<string, { status: ComplianceStatus | ''; remarks: string }> = {};
    checklist.forEach(item => {
      resetResp[item.id] = { status: '', remarks: '' };
    });
    setResponses(resetResp);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearError = () => setError(null);

  return (
    <AuditContext.Provider
      value={{
        vendorTypes,
        selectedVendorType,
        selectedState,
        selectedCountry,
        auditInfo,
        checklist,
        responses,
        calculationResult,
        savedAudit,
        actRules,
        getActLaw,
        interviewResources,
        setInterviewResources,
        activeAuditId,
        auditType,
        isReadOnly,
        isReAuditInitiated,
        setActiveAuditId,
        setAuditType,
        setIsReadOnly,
        initiateReAuditAction,
        loadAuditRecord,
        loadingVendorTypes,
        loadingChecklist,
        calculating,
        saving,
        error,
        validationErrors,
        searchTerm,
        categoryFilter,
        statusFilter,
        setSelectedVendorType,
        setSelectedState,
        setSelectedCountry,
        updateAuditInfo,
        updateResponseStatus,
        updateResponseRemarks,
        setSearchTerm,
        setCategoryFilter,
        setStatusFilter,
        calculateScore,
        saveAuditRecord,
        resetAssessment,
        clearError,
        progressMetrics,
        categories
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
