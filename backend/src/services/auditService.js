const crypto = require('crypto');
const { getDb, isFirestoreInitialized } = require('../config/firebase');

const COLLECTION_NAME = 'compliance_audits';

/**
 * Audit Persistence Service using Cloud Firestore (Collection: compliance_audits)
 */
class AuditService {
  constructor() {
    // Fallback in-memory map for unit tests / offline fallback
    this.fallbackAudits = new Map();
  }

  /**
   * Generates a unique audit ID.
   */
  _generateId() {
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(4).toString('hex');
    return `audit_${timestamp}_${randomHex}`;
  }

  /**
   * Saves a new audit record to Cloud Firestore (collection: compliance_audits).
   * @param {Object} auditData 
   * @returns {Promise<Object>} Saved audit record
   */
  async createAudit(auditData) {
    const id = this._generateId();
    const now = new Date().toISOString();

    const auditRecord = {
      id,
      organisation: auditData.organisation || '',
      site: auditData.site || '',
      auditMonth: auditData.auditMonth || '',
      auditDate: auditDate(auditData.auditDate),
      conductedAt: auditData.conductedAt || '',
      auditor: auditData.auditor || '',
      vendorRepresentative: auditData.vendorRepresentative || '',
      clientRepresentative: auditData.clientRepresentative || '',
      employeeCount: auditData.employeeCount !== undefined && auditData.employeeCount !== '' ? Number(auditData.employeeCount) : null,
      vendorType: auditData.vendorType,
      summary: auditData.summary,
      categoryScores: auditData.categoryScores || [],
      nonCompliantItems: auditData.nonCompliantItems || [],
      responses: auditData.responses || [],
      createdAt: now,
      updatedAt: now
    };

    const db = getDb();
    if (db && isFirestoreInitialized()) {
      try {
        await db.collection(COLLECTION_NAME).doc(id).set(auditRecord);
        // Also keep fallback map updated
        this.fallbackAudits.set(id, auditRecord);
        return auditRecord;
      } catch (err) {
        console.warn(`[AuditService Warning]: Firestore write failed (${err.message}). Using fallback storage.`);
        this.fallbackAudits.set(id, auditRecord);
        return auditRecord;
      }
    }

    // Fallback if Firestore is uninitialized / offline mode
    this.fallbackAudits.set(id, auditRecord);
    return auditRecord;
  }

  /**
   * Fetches an audit by ID from Cloud Firestore.
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async getAuditById(id) {
    if (!id || typeof id !== 'string') return null;

    const db = getDb();
    if (db && isFirestoreInitialized()) {
      try {
        // First try the unified audits collection
        let docSnap = await db.collection('audits').doc(id).get();
        if (docSnap.exists) {
          return { id: docSnap.id, ...docSnap.data() };
        }
        
        // Fallback to legacy compliance_audits collection
        docSnap = await db.collection(COLLECTION_NAME).doc(id).get();
        if (docSnap.exists) {
          return { id: docSnap.id, ...docSnap.data() };
        }
      } catch (err) {
        console.warn(`[AuditService Warning]: Firestore read failed (${err.message}). Checking fallback storage.`);
      }
    }

    return this.fallbackAudits.get(id) || null;
  }

  /**
   * Returns all stored audits from Cloud Firestore.
   * @returns {Promise<Array<Object>>}
   */
  async getAllAudits() {
    const db = getDb();
    if (db && isFirestoreInitialized()) {
      try {
        const snapshot = await db.collection(COLLECTION_NAME).get();
        const results = [];
        snapshot.forEach(doc => {
          results.push(doc.data());
        });
        return results;
      } catch (err) {
        console.warn(`[AuditService Warning]: Firestore getAll failed (${err.message}).`);
      }
    }

    return Array.from(this.fallbackAudits.values());
  }

  /**
   * Clears fallback audits (useful for tests).
   */
  clear() {
    this.fallbackAudits.clear();
  }
}

function auditDate(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
}

module.exports = new AuditService();
