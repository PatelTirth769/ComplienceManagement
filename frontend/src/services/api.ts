import axios from 'axios';
import type {
  VendorType,
  ChecklistItem,
  ComplianceResponse,
  CalculationResult,
  AuditRecord
} from '../types/compliance';

// Resolution priority:
// 1. Explicit VITE_API_URL in frontend/.env (e.g., https://api.yourdomain.com/api)
// 2. Default: '/api' (proxied by Vite dev server to backend in dev, relative URL in prod)
export const API_BASE_URL = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim())
  ? import.meta.env.VITE_API_URL.trim()
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Fetch supported vendor types
 */
export async function getVendorTypes(): Promise<VendorType[]> {
  const response = await api.get<{ success: boolean; vendorTypes: VendorType[] }>('/compliance/vendor-types');
  return response.data.vendorTypes;
}

/**
 * Fetch checklist template for vendor type with optional state and country
 */
export async function getChecklist(
  vendorType: string,
  state?: string,
  country?: string
): Promise<{ totalItems: number; checklist: ChecklistItem[]; state?: string; country?: string }> {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (country) params.set('country', country);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const response = await api.get<{
    success: boolean;
    vendorType: string;
    totalItems: number;
    checklist: ChecklistItem[];
    state?: string;
    country?: string;
  }>(`/compliance/templates/${vendorType}${qs}`);
  return {
    totalItems: response.data.totalItems,
    checklist: response.data.checklist,
    state: response.data.state,
    country: response.data.country
  };
}

/**
 * Send responses to backend scoring engine to calculate compliance score
 */
export async function calculateCompliance(payload: {
  vendorType: string;
  responses: ComplianceResponse[];
  state?: string;
  country?: string;
}): Promise<CalculationResult> {
  const response = await api.post<CalculationResult>('/compliance/calculate', payload);
  return response.data;
}

/**
 * Save audit record to backend
 */
export async function saveAudit(payload: any): Promise<{ success: boolean; data: AuditRecord }> {
  const response = await api.post<{ success: boolean; message: string; data: AuditRecord }>('/compliance/audits', payload);
  return response.data;
}

/**
 * Initiate Re-Audit for an audit (marks original as Read-Only and clones into a new Re-Audit)
 */
export async function initiateReAudit(auditId: string): Promise<{ success: boolean; message: string; data: any; originalAuditId: string }> {
  const response = await api.post<{ success: boolean; message: string; data: any; originalAuditId: string }>(`/compliance/audits/${auditId}/re-audit`);
  return response.data;
}

/**
 * Get audit record by ID
 */
export async function getAudit(id: string): Promise<AuditRecord> {
  const response = await api.get<{ success: boolean; data: AuditRecord }>(`/compliance/audits/${id}`);
  return response.data.data;
}

export async function getAssignedAudits(): Promise<any[]> {
  const response = await api.get<{ success: boolean; data: any[] }>('/compliance/assigned-audits');
  return response.data.data;
}

/**
 * Fetch documents uploaded for an audit (accessible by Auditor & Admin)
 */
export async function getAuditDocuments(auditId: string): Promise<any[]> {
  try {
    const response = await api.get<{ success: boolean; data: any[] }>(`/compliance/audits/${auditId}/documents`);
    return response.data.data || [];
  } catch (error) {
    console.warn('Failed to load audit documents:', error);
    return [];
  }
}

/**
 * Get pre-signed download / view URL for a document (accessible by Auditor & Admin)
 */
export async function getAuditDocumentUrl(docId: string): Promise<any> {
  const response = await api.get(`/compliance/documents/${docId}/url`);
  return response.data;
}

/**
 * Download Auditor Excel File
 */
export async function downloadAuditorExcel(payload: any): Promise<Blob> {
  const response = await api.post('/compliance/download-excel', payload, {
    responseType: 'blob'
  });
  return response.data;
}

/**
 * Register a new user
 */
export async function authRegister(payload: any): Promise<any> {
  const response = await api.post('/auth/register', payload);
  return response.data;
}

/**
 * Login a user
 */
export async function authLogin(email: string, password: string, role: string): Promise<any> {
  const response = await api.post('/auth/login', { email, password, role });
  return response.data;
}

// ==========================================
// VENDOR APIs
// ==========================================

export async function getVendorDashboardStats(): Promise<any> {
  const response = await api.get('/vendor/dashboard');
  return response.data;
}

export async function getVendorProfile(): Promise<any> {
  const response = await api.get('/vendor/profile');
  return response.data;
}

export async function updateVendorProfile(payload: any): Promise<any> {
  const response = await api.put('/vendor/profile', payload);
  return response.data;
}

export async function getVendorAudits(): Promise<any> {
  const response = await api.get('/vendor/audits');
  return response.data;
}

export async function getVendorAuditById(id: string): Promise<any> {
  const response = await api.get(`/vendor/audits/${id}`);
  return response.data;
}

export async function getVendorDocuments(auditId: string): Promise<any> {
  const response = await api.get(`/vendor/audits/${auditId}/documents`);
  return response.data;
}

export async function getVendorDocumentUrl(docId: string): Promise<any> {
  const response = await api.get(`/vendor/documents/${docId}/url`);
  return response.data;
}

export async function uploadVendorDocument(auditId: string, payload: { fileName: string, fileData: string, type: string }): Promise<any> {
  const response = await api.post(`/vendor/audits/${auditId}/documents`, payload);
  return response.data;
}

export async function getVendorFindings(auditId?: string): Promise<any> {
  const url = auditId ? `/vendor/findings?auditId=${auditId}` : '/vendor/findings';
  const response = await api.get(url);
  return response.data;
}

export async function respondToVendorFinding(payload: {
  auditId: string;
  itemCategory?: string;
  itemText?: string;
  responseText: string;
  itemId?: string;
  findingId?: string;
  index?: number;
}): Promise<any> {
  const response = await api.post('/vendor/findings/respond', payload);
  return response.data;
}

export async function getVendorReports(): Promise<any> {
  const response = await api.get('/vendor/reports');
  return response.data;
}

export async function downloadVendorReport(auditId: string): Promise<any> {
  const response = await api.get(`/vendor/reports/${auditId}/download`);
  return response.data;
}

export async function getVendorNotifications(): Promise<any> {
  const response = await api.get('/vendor/notifications');
  return response.data;
}

export async function getAuditorContact(): Promise<any> {
  const response = await api.get('/vendor/contact');
  return response.data;
}

// ==========================================
// CUSTOMER APIs
// ==========================================

export async function getCustomerDashboardStats(): Promise<any> {
  const response = await api.get('/customer/dashboard');
  return response.data;
}

export async function getCustomerVendors(): Promise<any> {
  const response = await api.get('/customer/vendors');
  return response.data;
}

export async function getCustomerVendorById(vendorId: string): Promise<any> {
  const response = await api.get(`/customer/vendors/${vendorId}`);
  return response.data;
}

export async function getCustomerAudits(): Promise<any> {
  const response = await api.get('/customer/audits');
  return response.data;
}

export async function getCustomerAuditById(id: string): Promise<any> {
  const response = await api.get(`/customer/audits/${id}`);
  return response.data;
}

export async function updateAuditorDocumentAccess(auditId: string, allow: boolean): Promise<any> {
  const response = await api.patch(`/customer/audits/${auditId}/auditor-document-access`, {
    allowAuditorToSeeDocuments: allow
  });
  return response.data;
}

export async function updateInterviewAuditAccess(auditId: string, allow: boolean): Promise<any> {
  const response = await api.patch(`/customer/audits/${auditId}/interview-audit`, {
    interviewAudit: allow,
    allow: allow
  });
  return response.data;
}

export async function updateAuditTimeline(auditId: string, startDate: string, dueDate: string, notes?: string): Promise<any> {
  const response = await api.patch(`/admin/audits/${auditId}/timeline`, {
    startDate,
    dueDate,
    notes
  });
  return response.data;
}

export interface VendorOption {
  id: string;
  name: string;
  email: string;
  companyName?: string;
}

export async function getVendorsList(): Promise<VendorOption[]> {
  try {
    const res = await api.get<{ success: boolean; vendors: VendorOption[] }>('/compliance/vendors');
    return res.data?.vendors || [];
  } catch (err) {
    console.warn('Failed to load vendors list:', err);
    return [];
  }
}

export async function saveInterviewResources(auditId: string, resources: any[], vendorOrAuditorEmail?: string, sendEmail?: boolean): Promise<any> {
  const response = await api.patch(`/compliance/audits/${auditId}/interview-resources`, {
    resources,
    auditorEmail: vendorOrAuditorEmail,
    vendorEmail: vendorOrAuditorEmail,
    sendEmail: sendEmail === true
  });
  return response.data;
}

export async function interviewLogin(loginId: string, pass: string, auditId?: string): Promise<any> {
  const response = await api.post('/compliance/interview-login', { loginId, pass, auditId });
  return response.data;
}

export async function submitInterviewAnswer(
  auditId: string,
  resourceId: string,
  answer?: string,
  answers?: Record<string, string>,
  questions?: any[],
  proctoring?: any,
  status: string = 'Completed'
): Promise<any> {
  const response = await api.post('/compliance/interview-answer', {
    auditId,
    resourceId,
    answer,
    answers,
    questions,
    proctoring,
    status
  });
  return response.data;
}

export async function getInterviewSession(auditId: string, resourceId: string): Promise<any> {
  const response = await api.get('/compliance/interview-session', {
    params: { auditId, resourceId }
  });
  return response.data;
}

export async function getAdminAudits(): Promise<{ success: boolean; audits: any[] }> {
  const response = await api.get<{ success: boolean; audits: any[] }>('/admin/audits');
  return response.data;
}

export async function getCustomerTimeline(): Promise<any> {
  const response = await api.get('/customer/timeline');
  return response.data;
}

export async function getCustomerComplianceScores(): Promise<any> {
  const response = await api.get('/customer/compliance-scores');
  return response.data;
}

export async function getCustomerReports(): Promise<any> {
  const response = await api.get('/customer/reports');
  return response.data;
}

export async function getCustomerNotifications(): Promise<any> {
  const response = await api.get('/customer/notifications');
  return response.data;
}

export async function markCustomerNotificationRead(id: string): Promise<any> {
  const response = await api.patch(`/customer/notifications/${id}/read`);
  return response.data;
}

export async function markAllCustomerNotificationsRead(notificationIds?: string[]): Promise<any> {
  const response = await api.patch('/customer/notifications/read-all', { notificationIds });
  return response.data;
}

export async function downloadCustomerAuditPpt(auditId: string): Promise<Blob> {
  const response = await api.get(`/customer/audits/${auditId}/download-ppt`, {
    responseType: 'blob'
  });
  return response.data;
}

export async function getCustomerOverallReport(): Promise<any> {
  const response = await api.get('/customer/overall-report');
  return response.data;
}

export interface ActRuleAttachment {
  fileName: string;
  fileType?: string;
  fileSize?: number;
  fileData: string; // Base64 data URL
  uploadedAt?: string;
}

export interface ActRule {
  id: string;
  actName: string;
  shortName: string;
  category: string;
  states: string[];
  formsCount?: number;
  description: string;
  attachment?: ActRuleAttachment | null;
  updatedAt?: string;
  updatedBy?: string;
}

export async function getActRules(): Promise<{ success: boolean; rules: ActRule[] }> {
  const response = await api.get<{ success: boolean; rules: ActRule[] }>('/admin/rules');
  return response.data;
}

export async function saveActRules(rules: ActRule[]): Promise<{ success: boolean; message: string; rules: ActRule[] }> {
  const response = await api.post<{ success: boolean; message: string; rules: ActRule[] }>('/admin/rules', { rules });
  return response.data;
}

export async function saveActRuleById(id: string, description: string, attachment?: ActRuleAttachment | null): Promise<{ success: boolean; message: string; rule: ActRule }> {
  const response = await api.put<{ success: boolean; message: string; rule: ActRule }>(`/admin/rules/${id}`, { description, attachment });
  return response.data;
}

export { api };
export default api;

