/**
 * Centralized Date & Time formatting utilities for DD/MM/YYYY compliance across the application.
 */

/**
 * Formats a date string, Date object, or timestamp into DD/MM/YYYY.
 * Handles ISO strings (YYYY-MM-DD, YYYY-MM-DDTHH:mm:ssZ), timestamps, and already formatted DD/MM/YYYY strings.
 */
export function formatDate(val: any, fallback = ''): string {
  if (!val) return fallback;

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;

    // Already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // YYYY-MM-DD format (extract components directly to avoid timezone shift)
    const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
    }

    // DD-MM-YYYY format
    const dmyDash = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyDash) {
      return `${dmyDash[1].padStart(2, '0')}/${dmyDash[2].padStart(2, '0')}/${dmyDash[3]}`;
    }
  }

  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) {
    return typeof val === 'string' ? val : fallback;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a timestamp into DD/MM/YYYY, HH:mm:ss
 */
export function formatDateTime(val: any, fallback = ''): string {
  if (!val) return fallback;

  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) {
    return typeof val === 'string' ? val : fallback;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

/**
 * Safely parses any date string (ISO, YYYY-MM-DD, DD/MM/YYYY, timestamp) into a Date object.
 */
export function parseFlexibleDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (dmy) {
      const d = parseInt(dmy[1], 10);
      const m = parseInt(dmy[2], 10) - 1;
      const y = parseInt(dmy[3], 10);
      const parsed = new Date(y, m, d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Converts any date format to ISO format YYYY-MM-DD for native date pickers or backend storage.
 */
export function toIsoDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const dmy = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
  }

  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const AUDIT_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export type AuditMonth = typeof AUDIT_MONTHS[number];

export interface AuditQuarterOption {
  value: string;
  label: string;
  name: string;
  startMonth: string;
  startDay: string;
  endMonth: string;
  endDay: string;
}

export const AUDIT_QUARTERS: AuditQuarterOption[] = [
  { value: 'Q1', label: 'Q1 (Jan–Mar)', name: 'Q1 (Jan - Mar)', startMonth: '01', startDay: '01', endMonth: '03', endDay: '31' },
  { value: 'Q2', label: 'Q2 (Apr–Jun)', name: 'Q2 (Apr - Jun)', startMonth: '04', startDay: '01', endMonth: '06', endDay: '30' },
  { value: 'Q3', label: 'Q3 (Jul–Sep)', name: 'Q3 (Jul - Sep)', startMonth: '07', startDay: '01', endMonth: '09', endDay: '30' },
  { value: 'Q4', label: 'Q4 (Oct–Dec)', name: 'Q4 (Oct - Dec)', startMonth: '10', startDay: '01', endMonth: '12', endDay: '31' }
];

export interface AuditHalfYearOption {
  value: string;
  label: string;
  name: string;
  startMonth: string;
  startDay: string;
  endMonth: string;
  endDay: string;
}

export const AUDIT_HALF_YEARS: AuditHalfYearOption[] = [
  { value: 'H1', label: 'H1 (Jan–Jun)', name: 'H1 (Jan - Jun)', startMonth: '01', startDay: '01', endMonth: '06', endDay: '30' },
  { value: 'H2', label: 'H2 (Jul–Dec)', name: 'H2 (Jul - Dec)', startMonth: '07', startDay: '01', endMonth: '12', endDay: '31' }
];

export interface AuditCycleResult {
  frequency: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
  year: number;
  period: string;
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  summary: string;
}

/**
 * Calculates start date, due date, and display summary for an audit cycle.
 * @param frequency - 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly'
 * @param year - 4 digit year e.g. 2026
 * @param period - Month name / number for Monthly, 'Q1'..'Q4' for Quarterly, or 'H1'/'H2' for Half-Yearly
 */
export function calculateAuditCycle(
  frequency: string,
  year: number | string,
  period?: string | number
): AuditCycleResult | null {
  const y = parseInt(String(year), 10);
  if (isNaN(y) || y < 1900 || y > 2200) return null;

  const normFreq = String(frequency || '').trim().toLowerCase();

  if (normFreq === 'monthly') {
    let monthIdx = -1;
    if (typeof period === 'number') {
      monthIdx = period - 1;
    } else if (typeof period === 'string') {
      const trimmed = period.trim();
      if (/^\d+$/.test(trimmed)) {
        monthIdx = parseInt(trimmed, 10) - 1;
      } else {
        monthIdx = AUDIT_MONTHS.findIndex(m => m.toLowerCase() === trimmed.toLowerCase());
      }
    }
    if (monthIdx < 0 || monthIdx > 11) return null;

    const mNum = String(monthIdx + 1).padStart(2, '0');
    const monthName = AUDIT_MONTHS[monthIdx];
    const startDate = `${y}-${mNum}-01`;
    // 2-3 days timeline for vendor to submit documents (1st to 3rd of the month)
    const dueDate = `${y}-${mNum}-03`;
    const summary = `${monthName} ${y}`;

    return {
      frequency: 'Monthly',
      year: y,
      period: monthName,
      startDate,
      dueDate,
      summary
    };
  }

  if (normFreq === 'quarterly') {
    const qStr = String(period || 'Q1').toUpperCase().trim();
    const foundQ = AUDIT_QUARTERS.find(q => q.value === qStr || qStr.startsWith(q.value));
    if (!foundQ) return null;

    const startDate = `${y}-${foundQ.startMonth}-${foundQ.startDay}`;
    const dueDate = `${y}-${foundQ.endMonth}-${foundQ.endDay}`;
    const summary = `${foundQ.value} ${y} (${foundQ.label.split('(')[1]}`.replace(/[\u2010-\u2015]/g, '-');

    return {
      frequency: 'Quarterly',
      year: y,
      period: foundQ.value,
      startDate,
      dueDate,
      summary
    };
  }

  if (normFreq === 'half-yearly' || normFreq === 'half_yearly' || normFreq === 'halfyearly' || normFreq === 'half yearly') {
    const hStr = String(period || 'H1').toUpperCase().trim();
    const foundH = AUDIT_HALF_YEARS.find(h => h.value === hStr || hStr.startsWith(h.value));
    if (!foundH) return null;

    const startDate = `${y}-${foundH.startMonth}-${foundH.startDay}`;
    const dueDate = `${y}-${foundH.endMonth}-${foundH.endDay}`;
    const summary = `${foundH.value} ${y} (${foundH.label.split('(')[1]}`.replace(/[\u2010-\u2015]/g, '-');

    return {
      frequency: 'Half-Yearly',
      year: y,
      period: foundH.value,
      startDate,
      dueDate,
      summary
    };
  }

  if (normFreq === 'yearly' || normFreq === 'annual') {
    const startDate = `${y}-01-01`;
    const dueDate = `${y}-12-31`;
    const summary = `Annual Comprehensive ${y}`;

    return {
      frequency: 'Yearly',
      year: y,
      period: 'Annual',
      startDate,
      dueDate,
      summary
    };
  }

  return null;
}
