export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NA';

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
}

export interface ComplianceResponse {
  itemId: string;
  status: ComplianceStatus;
  remarks: string;
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
}

export interface CalculationResult {
  success: boolean;
  vendorType: string;
  summary: CalculationSummary;
  categoryScores: CategoryScore[];
  nonCompliantItems: NonCompliantItemDetail[];
}

export interface AuditRecord extends AuditInformation {
  id: string;
  auditIdString?: string;
  summary: CalculationSummary;
  categoryScores: CategoryScore[];
  nonCompliantItems: NonCompliantItemDetail[];
  responses: ComplianceResponse[];
  createdAt: string;
  updatedAt: string;
}
