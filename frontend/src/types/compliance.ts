export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NA';

export const SUPPORTED_STATES = [
  'All',
  'N/A',
  'Maharashtra',
  'Haryana',
  'Telangana',
  'Karnataka',
  'Madhya Pradesh',
  'Uttar Pradesh'
] as const;

export type SupportedState = typeof SUPPORTED_STATES[number];

export interface VendorType {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface ChecklistItem {
  id: string;
  serialNumber: number;
  title: string;
  type: string;
  particulars: string;
  statutoryRequirement: string;
  country?: string;
  state?: string;
  vendorCategory?: string;
  slNo?: number;
  nameOfAct?: string;
  actNameInShort?: string;
  formNo?: string;
  description?: string;
  natureOfRegister?: string;
  classifications?: string;
  periodicity?: string;
  applicableStates?: string[];
  isConsolidated?: boolean;
  duplicateCount?: number;
  active?: boolean;
  'Sl.No'?: number;
  'State'?: string;
  'Name of the Act'?: string;
  'Act Name in Short'?: string;
  'Form No.'?: string;
  'Description'?: string;
  'Nature of Register'?: string;
  'Classifications'?: string;
  'Periodicity'?: string;
}

export interface ComplianceResponse {
  itemId: string;
  status: ComplianceStatus;
  remarks: string;
  title?: string;
  particulars?: string;
  type?: string;
  actNameInShort?: string;
  nameOfAct?: string;
  category?: string;
}

export interface AuditInformation {
  organisation: string;
  site: string;
  auditMonth: string;
  auditDate: string;
  conductedAt: string;
  auditor: string;
  vendorRepresentative: string;
  clientRepresentative: string;
  employeeCount: number | '';
  vendorType: string;
  country?: string;
  state?: string;
}

export interface CalculationSummary {
  totalItems: number;
  applicableItems: number;
  compliantItems: number;
  nonCompliantItems: number;
  naItems: number;
  score: number | null;
  scoreDisplay: string;
  message?: string;
}

export interface CategoryScore {
  category: string;
  totalItems: number;
  applicableItems: number;
  compliantItems: number;
  nonCompliantItems: number;
  naItems: number;
  score: number | null;
  scoreDisplay: string;
}

export interface NonCompliantItemDetail {
  itemId: string;
  serialNumber: number;
  type: string;
  title: string;
  particulars: string;
  remarks: string;
  vendorResponse?: string;
  respondedAt?: string;
  actionPlan?: string;
  status?: string;
  attachmentName?: string;
  attachmentDocId?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentSize?: number;
  attachment?: {
    id?: string;
    docId?: string;
    fileName?: string;
    fileData?: string;
    url?: string;
    fileType?: string;
    fileSize?: number;
    uploadedAt?: string;
  };
}

export interface CalculationResult {
  success: boolean;
  vendorType: string;
  country?: string;
  state?: string;
  summary: CalculationSummary;
  categoryScores: CategoryScore[];
  nonCompliantItems: NonCompliantItemDetail[];
}

export interface QuestionAnswerItem {
  id: string;
  question: string;
  answer?: string;
  attachmentName?: string;
  attachmentData?: string;
  attachmentType?: string;
  attachmentSize?: number;
}

export interface InterviewProctoringResult {
  integrityScore: number;
  integrityStatus: 'Verified Clean' | 'Review Needed' | 'Flagged';
  violations: {
    faceMissingCount: number;
    multipleFacesCount: number;
    tabSwitchesCount: number;
  };
  durationSeconds: number;
  verifiedAt: string;
}

export interface InterviewResource {
  id: string;
  name: string;
  preDate: string;
  finalDate: string;
  ask: string;
  status: string;
  question?: string;
  answer?: string;
  questions?: QuestionAnswerItem[];
  loginId?: string;
  pass?: string;
  isQuestionSaved?: boolean;
  vendorId?: string;
  vendorEmail?: string;
  vendorName?: string;
  proctoring?: InterviewProctoringResult | null;
}

export interface AuditRecord extends AuditInformation {
  id: string;
  auditIdString?: string;
  summary: CalculationSummary;
  categoryScores: CategoryScore[];
  nonCompliantItems: NonCompliantItemDetail[];
  responses: ComplianceResponse[];
  interviewAudit?: boolean;
  interviewResources?: InterviewResource[];
  createdAt: string;
  updatedAt: string;
}
