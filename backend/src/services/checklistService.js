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

let otherVendorChecklist = [];
let securityVendorChecklist = [];

if (fs.existsSync(otherVendorChecklistPath)) {
  otherVendorChecklist = JSON.parse(fs.readFileSync(otherVendorChecklistPath, 'utf-8'));
}

if (fs.existsSync(securityVendorChecklistPath)) {
  securityVendorChecklist = JSON.parse(fs.readFileSync(securityVendorChecklistPath, 'utf-8'));
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
