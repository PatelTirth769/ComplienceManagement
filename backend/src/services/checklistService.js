const path = require('path');
const fs = require('fs');

const OTHER_VENDOR = 'OTHER_VENDOR';
const SECURITY_VENDOR = 'SECURITY_VENDOR';

const VENDOR_TYPES = [
  {
    id: 'other-vendor',
    code: OTHER_VENDOR,
    name: 'Other Vendor Compliance Audit Checklist',
    description: 'Compliance checklist for General/Other Vendors'
  },
  {
    id: 'security-vendor',
    code: SECURITY_VENDOR,
    name: 'Security Vendor Compliance Audit Checklist',
    description: 'Compliance checklist for Security Vendors'
  }
];

// Load JSON data files
const otherVendorChecklistPath = path.join(__dirname, '../data/otherVendorChecklist.json');
const securityVendorChecklistPath = path.join(__dirname, '../data/securityVendorChecklist.json');

// Helper function to safely load JSON data without crashing on empty or corrupt files
function loadJsonSafely(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8').trim();
      if (raw.length > 0) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn(`[Checklist Warning]: Could not parse JSON from ${filePath}:`, err.message);
  }
  return null;
}

let otherVendorChecklist = loadJsonSafely(otherVendorChecklistPath) || [];
let securityVendorChecklist = loadJsonSafely(securityVendorChecklistPath) || [];

// Fallback: If either checklist is empty, try to extract from reference Excel files
if (otherVendorChecklist.length === 0 || securityVendorChecklist.length === 0) {
  try {
    const { extractChecklistFromExcel } = require('./excelService');
    const referenceDir = path.resolve(__dirname, '../../../reference_files');

    if (otherVendorChecklist.length === 0) {
      const otherExcelPath = path.join(referenceDir, 'Other_Vendor_Audit__Checklist.xls');
      if (fs.existsSync(otherExcelPath)) {
        otherVendorChecklist = extractChecklistFromExcel(otherExcelPath, 'OTHER');
        fs.mkdirSync(path.dirname(otherVendorChecklistPath), { recursive: true });
        fs.writeFileSync(otherVendorChecklistPath, JSON.stringify(otherVendorChecklist, null, 2), 'utf-8');
      }
    }

    if (securityVendorChecklist.length === 0) {
      const securityExcelPath = path.join(referenceDir, 'Security_Vendor_Audit_Checklist.xls');
      if (fs.existsSync(securityExcelPath)) {
        securityVendorChecklist = extractChecklistFromExcel(securityExcelPath, 'SECURITY');
        fs.mkdirSync(path.dirname(securityVendorChecklistPath), { recursive: true });
        fs.writeFileSync(securityVendorChecklistPath, JSON.stringify(securityVendorChecklist, null, 2), 'utf-8');
      }
    }
  } catch (err) {
    console.warn('[Checklist Warning]: Could not auto-extract from Excel files:', err.message);
  }
}

/**
 * Normalizes vendor type parameter into canonical vendor code.
 * @param {string} vendorType 
 * @returns {string|null} Canonical vendor code or null if invalid
 */
function normalizeVendorType(vendorType) {
  if (!vendorType || typeof vendorType !== 'string') return null;
  const normalized = vendorType.trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'other-vendor' || normalized === 'other') return OTHER_VENDOR;
  if (normalized === 'security-vendor' || normalized === 'security') return SECURITY_VENDOR;
  return null;
}

/**
 * Checks if vendor type is valid.
 * @param {string} vendorType 
 * @returns {boolean}
 */
function isValidVendorType(vendorType) {
  return normalizeVendorType(vendorType) !== null;
}

/**
 * Returns available vendor types.
 * @returns {Array<Object>}
 */
function getVendorTypes() {
  return VENDOR_TYPES;
}

/**
 * Returns checklist items for given vendor type.
 * @param {string} vendorType 
 * @returns {Array<Object>|null}
 */
function getChecklistByVendorType(vendorType) {
  const normalized = normalizeVendorType(vendorType);
  if (normalized === OTHER_VENDOR) {
    return otherVendorChecklist;
  }
  if (normalized === SECURITY_VENDOR) {
    return securityVendorChecklist;
  }
  return null;
}

function getAllChecklists() {
  return {
    otherVendor: otherVendorChecklist,
    securityVendor: securityVendorChecklist
  };
}

function saveChecklists() {
  fs.writeFileSync(otherVendorChecklistPath, JSON.stringify(otherVendorChecklist, null, 2));
  fs.writeFileSync(securityVendorChecklistPath, JSON.stringify(securityVendorChecklist, null, 2));
}

function addChecklistItem(vendorType, item) {
  const normalized = normalizeVendorType(vendorType);
  if (normalized === OTHER_VENDOR) {
    otherVendorChecklist.push(item);
    saveChecklists();
    return item;
  } else if (normalized === SECURITY_VENDOR) {
    securityVendorChecklist.push(item);
    saveChecklists();
    return item;
  }
  return null;
}

function updateChecklistItem(id, updates) {
  let found = false;
  
  // Look in otherVendorChecklist
  for (let i = 0; i < otherVendorChecklist.length; i++) {
    if (otherVendorChecklist[i].id === id) {
      otherVendorChecklist[i] = { ...otherVendorChecklist[i], ...updates };
      found = true;
      break;
    }
  }
  
  // Look in securityVendorChecklist if not found
  if (!found) {
    for (let i = 0; i < securityVendorChecklist.length; i++) {
      if (securityVendorChecklist[i].id === id) {
        securityVendorChecklist[i] = { ...securityVendorChecklist[i], ...updates };
        found = true;
        break;
      }
    }
  }

  if (found) {
    saveChecklists();
    return true;
  }
  return false;
}

module.exports = {
  OTHER_VENDOR,
  SECURITY_VENDOR,
  normalizeVendorType,
  isValidVendorType,
  getVendorTypes,
  getChecklistByVendorType,
  getAllChecklists,
  addChecklistItem,
  updateChecklistItem
};
