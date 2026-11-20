const path = require('path');
const fs = require('fs');

const OTHER_VENDOR = 'OTHER_VENDOR';
const SECURITY_VENDOR = 'SECURITY_VENDOR';
const STATE_VENDOR = 'STATE_VENDOR';

const SUPPORTED_STATES = [
  'All',
  'N/A',
  'Maharashtra',
  'Haryana',
  'Telangana',
  'Karnataka',
  'Madhya Pradesh',
  'Uttar Pradesh'
];

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
const stateVendorChecklistPath = path.join(__dirname, '../data/stateVendorChecklist.json');

let otherVendorChecklist = [];
let securityVendorChecklist = [];
let stateVendorChecklist = [];

function reloadChecklistsFromDisk() {
  if (fs.existsSync(otherVendorChecklistPath)) {
    try {
      otherVendorChecklist = JSON.parse(fs.readFileSync(otherVendorChecklistPath, 'utf-8'));
    } catch (e) {
      console.warn('Error reading otherVendorChecklist.json:', e.message);
    }
  }

  if (fs.existsSync(securityVendorChecklistPath)) {
    try {
      securityVendorChecklist = JSON.parse(fs.readFileSync(securityVendorChecklistPath, 'utf-8'));
    } catch (e) {
      console.warn('Error reading securityVendorChecklist.json:', e.message);
    }
  }

  if (fs.existsSync(stateVendorChecklistPath)) {
    try {
      stateVendorChecklist = JSON.parse(fs.readFileSync(stateVendorChecklistPath, 'utf-8'));
    } catch (e) {
      console.warn('Error reading stateVendorChecklist.json:', e.message);
    }
  }
}

reloadChecklistsFromDisk();

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
  if (normalized === 'state-vendor' || normalized === 'state') return STATE_VENDOR;
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
 * Combines checklist entries across multiple states and deduplicates
 * identical statutory requirements while preserving which states they apply to.
 * @param {Array<Object>} items 
 * @returns {Array<Object>}
 */
function combineAndDeduplicateChecklist(items) {
  if (!Array.isArray(items)) return [];
  const groups = new Map();

  items.forEach(item => {
    const shortAct = (item.actNameInShort || item['Act Name in Short'] || item.type || '').trim().toLowerCase();
    const formNo = (item.formNo || item['Form No.'] || '').trim().toLowerCase();
    const desc = (item.description || item['Description'] || item.particulars || '').trim().toLowerCase();
    const period = (item.periodicity || item['Periodicity'] || '').trim().toLowerCase();
    const key = `${shortAct}:::${formNo}:::${desc}:::${period}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  const consolidated = [];
  groups.forEach((groupItems) => {
    const first = groupItems[0];
    const states = Array.from(new Set(groupItems.map(g => g.state || g.State).filter(Boolean)));

    consolidated.push({
      ...first,
      applicableStates: states,
      state: states.length > 1 ? `All (${states.length} States)` : (states[0] || 'N/A'),
      isConsolidated: states.length > 1,
      duplicateCount: groupItems.length
    });
  });

  return consolidated;
}

/**
 * Returns state-specific vendor compliance checklist.
 * @param {Object} options - { state, country, deduplicate }
 * @returns {Array<Object>}
 */
function getStateVendorChecklist(options = {}) {
  const { state, deduplicate = true } = options;

  if (!state || state.toLowerCase() === 'all') {
    // "All": display the combined applicable entries across the six states, handling duplicates appropriately
    return deduplicate ? combineAndDeduplicateChecklist(stateVendorChecklist) : stateVendorChecklist;
  }

  const normalizedState = state.trim().toLowerCase();

  if (normalizedState === 'n/a' || normalizedState === 'na') {
    // Keep N/A distinct from All. N/A represents unassigned/non-applicable state entries only, NOT a wildcard.
    return stateVendorChecklist.filter(item => {
      const itemState = (item.state || item.State || '').trim().toLowerCase();
      return itemState === 'n/a' || itemState === 'na' || itemState === '';
    });
  }

  // Filter for specific state
  return stateVendorChecklist.filter(item => {
    const itemState = (item.state || item.State || '').trim().toLowerCase();
    return itemState === normalizedState;
  });
}

/**
 * Returns checklist items for given vendor type and state.
 * @param {string} vendorType 
 * @param {Object} [options] - Optional filters like { state, country, deduplicate }
 * @returns {Array<Object>|null}
 */
function getChecklistByVendorType(vendorType, options = {}) {
  const normalized = normalizeVendorType(vendorType);

  if (normalized === STATE_VENDOR) {
    return getStateVendorChecklist(options);
  }

  // If a state is specified for other-vendor or security-vendor:
  if (options && options.state && options.state !== 'All' && options.state !== 'N/A') {
    // State-specific checklist requested
    return getStateVendorChecklist(options);
  }

  if (normalized === OTHER_VENDOR) {
    return otherVendorChecklist;
  }
  if (normalized === SECURITY_VENDOR) {
    return securityVendorChecklist;
  }
  return null;
}

function getAllChecklists(options = {}) {
  return {
    otherVendor: otherVendorChecklist,
    securityVendor: securityVendorChecklist,
    stateVendor: getStateVendorChecklist({ ...options, deduplicate: false }),
    stateVendorConsolidated: getStateVendorChecklist({ ...options, state: 'All', deduplicate: true }),
    states: SUPPORTED_STATES,
    country: 'India'
  };
}

function saveChecklists() {
  fs.writeFileSync(otherVendorChecklistPath, JSON.stringify(otherVendorChecklist, null, 2));
  fs.writeFileSync(securityVendorChecklistPath, JSON.stringify(securityVendorChecklist, null, 2));
  fs.writeFileSync(stateVendorChecklistPath, JSON.stringify(stateVendorChecklist, null, 2));

  // Sync to Firestore if initialized
  try {
    const { getDb } = require('../config/firebase');
    const db = getDb();
    if (db) {
      // Optional async sync in background
    }
  } catch (e) {}
}

function addChecklistItem(vendorType, item) {
  const normalized = normalizeVendorType(vendorType);
  const enrichedItem = {
    ...item,
    country: item.country || 'India',
    state: item.state || 'N/A'
  };

  if (normalized === OTHER_VENDOR) {
    otherVendorChecklist.push(enrichedItem);
    saveChecklists();
    syncItemToFirestore(enrichedItem);
    return enrichedItem;
  } else if (normalized === SECURITY_VENDOR) {
    securityVendorChecklist.push(enrichedItem);
    saveChecklists();
    syncItemToFirestore(enrichedItem);
    return enrichedItem;
  } else if (normalized === STATE_VENDOR) {
    stateVendorChecklist.push(enrichedItem);
    saveChecklists();
    syncItemToFirestore(enrichedItem);
    return enrichedItem;
  }
  return null;
}

function updateChecklistItem(id, updates) {
  let found = false;
  let targetItem = null;

  // Look in otherVendorChecklist
  for (let i = 0; i < otherVendorChecklist.length; i++) {
    if (otherVendorChecklist[i].id === id) {
      otherVendorChecklist[i] = { ...otherVendorChecklist[i], ...updates };
      targetItem = otherVendorChecklist[i];
      found = true;
      break;
    }
  }

  // Look in securityVendorChecklist if not found
  if (!found) {
    for (let i = 0; i < securityVendorChecklist.length; i++) {
      if (securityVendorChecklist[i].id === id) {
        securityVendorChecklist[i] = { ...securityVendorChecklist[i], ...updates };
        targetItem = securityVendorChecklist[i];
        found = true;
        break;
      }
    }
  }

  // Look in stateVendorChecklist if not found
  if (!found) {
    for (let i = 0; i < stateVendorChecklist.length; i++) {
      if (stateVendorChecklist[i].id === id) {
        stateVendorChecklist[i] = { ...stateVendorChecklist[i], ...updates };
        targetItem = stateVendorChecklist[i];
        found = true;
        break;
      }
    }
  }

  if (found) {
    saveChecklists();
    if (targetItem) {
      syncItemToFirestore(targetItem);
    }
    return true;
  }
  return false;
}

function syncItemToFirestore(item) {
  try {
    const { getDb } = require('../config/firebase');
    const db = getDb();
    if (db && item && item.id) {
      db.collection('compliance_checklists').doc(item.id).set(item, { merge: true }).catch(err => {
        console.warn('Firestore syncItem error:', err.message);
      });
    }
  } catch (e) {}
}

module.exports = {
  OTHER_VENDOR,
  SECURITY_VENDOR,
  STATE_VENDOR,
  SUPPORTED_STATES,
  normalizeVendorType,
  isValidVendorType,
  getVendorTypes,
  getChecklistByVendorType,
  getStateVendorChecklist,
  combineAndDeduplicateChecklist,
  getAllChecklists,
  addChecklistItem,
  updateChecklistItem,
  reloadChecklistsFromDisk
};
