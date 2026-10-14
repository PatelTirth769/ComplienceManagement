import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type {
  VendorType,
  ChecklistItem,
  ComplianceStatus,
  ComplianceResponse,
  AuditInformation,
  CalculationResult,
  AuditRecord
} from '../types/compliance';
import { getVendorTypes, getChecklist, calculateCompliance, saveAudit, API_BASE_URL } from '../services/api';

interface AuditContextType {
  vendorTypes: VendorType[];
  selectedVendorType: string;
  auditInfo: AuditInformation;
  checklist: ChecklistItem[];
  responses: Record<string, { status: ComplianceStatus | ''; remarks: string }>;
  calculationResult: CalculationResult | null;
  savedAudit: AuditRecord | null;
  loadingVendorTypes: boolean;
  loadingChecklist: boolean;
  calculating: boolean;
  saving: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
  
  // Filters
  searchTerm: string;
  categoryFilter: string;
  statusFilter: string;

  // Actions
  setSelectedVendorType: (vendorType: string) => void;
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
  vendorType: 'other-vendor'
};

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vendorTypes, setVendorTypes] = useState<VendorType[]>([]);
  const [selectedVendorType, setSelectedVendorTypeState] = useState<string>('other-vendor');
  const [auditInfo, setAuditInfo] = useState<AuditInformation>(initialAuditInfo);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [responses, setResponses] = useState<Record<string, { status: ComplianceStatus | ''; remarks: string }>>({});
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [savedAudit, setSavedAudit] = useState<AuditRecord | null>(null);

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
    return () => {
      isMounted = false;
    };
  }, []);

  // Load Checklist when selectedVendorType changes
  useEffect(() => {
    if (!selectedVendorType) return;
    let isMounted = true;

    const loadChecklistData = async () => {
      try {
        setLoadingChecklist(true);
        setError(null);
        const data = await getChecklist(selectedVendorType);
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
  }, [selectedVendorType]);

  const setSelectedVendorType = (vendorType: string) => {
    setSelectedVendorTypeState(vendorType);
    setAuditInfo(prev => ({ ...prev, vendorType }));
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
        responses: payloadResponses
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
        remarks: responses[item.id].remarks || ''
      }));

      const auditPayload = {
        ...auditInfo,
        vendorType: selectedVendorType,
        responses: payloadResponses
      };

      const res = await saveAudit(auditPayload);
      if (res.success && res.data) {
        setSavedAudit(res.data);
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

  const resetAssessment = () => {
    setAuditInfo(initialAuditInfo);
    setCalculationResult(null);
    setSavedAudit(null);
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
        auditInfo,
        checklist,
        responses,
        calculationResult,
        savedAudit,
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
