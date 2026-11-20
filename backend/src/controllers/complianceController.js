const fs = require('fs');
const path = require('path');
const checklistService = require('../services/checklistService');
const scoringService = require('../services/scoringService');
const auditService = require('../services/auditService');
const excelReportService = require('../services/excelReportService');
const { getDb } = require('../config/firebase');
const jwt = require('jsonwebtoken');

/**
 * Health Check Controller
 */
function getHealth(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Compliance Calculator API is running'
  });
}

/**
 * Get Supported Vendor Types
 */
function getVendorTypes(req, res) {
  const types = checklistService.getVendorTypes();
  return res.status(200).json({
    success: true,
    vendorTypes: types
  });
}

/**
 * Get Checklist Template for specific vendor type
 */
function getTemplate(req, res) {
  const { vendorType } = req.params;

  const { state, country } = req.query;

  if (!checklistService.isValidVendorType(vendorType)) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Vendor type '${vendorType}' not found. Valid vendor types are 'other-vendor' and 'security-vendor'.`
      }
    });
  }

  const normalizedVendorType = checklistService.normalizeVendorType(vendorType);
  const checklist = checklistService.getChecklistByVendorType(vendorType, { state, country }) || [];

  return res.status(200).json({
    success: true,
    vendorType: normalizedVendorType,
    country: country || 'India',
    state: state || 'All',
    totalItems: checklist.length,
    checklist: checklist
  });
}

/**
 * Calculate Compliance Score
 */
function calculateScore(req, res, next) {
  try {
    const { vendorType, responses, state, country } = req.body || {};

    if (!vendorType || !checklistService.isValidVendorType(vendorType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid or missing vendor type '${vendorType}'. Allowed values: 'other-vendor', 'security-vendor'.`
        }
      });
    }

    const checklist = checklistService.getChecklistByVendorType(vendorType, { state, country }) || [];
    const normalizedVendorType = checklistService.normalizeVendorType(vendorType);

    const calculationResult = scoringService.calculateComplianceScore(checklist, responses);

    return res.status(200).json({
      success: true,
      vendorType: normalizedVendorType,
      country: country || 'India',
      state: state || 'All',
      summary: calculationResult.summary,
      categoryScores: calculationResult.categoryScores,
      nonCompliantItems: calculationResult.nonCompliantItems
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save Audit Record
 */
async function createAudit(req, res, next) {
  try {
    const {
      vendorType,
      responses,
      organisation,
      site,
      auditMonth,
      auditDate,
      conductedAt,
      auditor,
      vendorRepresentative,
      clientRepresentative,
      employeeCount,
      state,
      country
    } = req.body || {};

    if (!vendorType || !checklistService.isValidVendorType(vendorType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid or missing vendor type '${vendorType}'.`
        }
      });
    }

    const checklist = checklistService.getChecklistByVendorType(vendorType, { state, country }) || [];
    const normalizedVendorType = checklistService.normalizeVendorType(vendorType);

    const calculationResult = scoringService.calculateComplianceScore(checklist, responses);

    // Try to find the associated Admin Workflow audit
    let auditorId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-compliance-key');
        auditorId = decoded.id;
      } catch (e) {
        console.warn('JWT verify error in createAudit:', e.message);
      }
    }

    const db = getDb();
    let auditRefToUpdate = null;
    let auditDocId = null;
    let existingData = {};

    if (req.body.auditId) {
      const explicitDoc = await db.collection('audits').doc(req.body.auditId).get();
      if (explicitDoc.exists) {
        auditDocId = explicitDoc.id;
        existingData = explicitDoc.data();
        auditRefToUpdate = explicitDoc.ref;
      }
    }

    if (!auditRefToUpdate && auditorId) {
      const auditsRef = db.collection('audits');
      const snapshot = await auditsRef.where('auditorId', '==', auditorId).get();
      let candidate = null;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const status = (data.status || '').toLowerCase();
        if (['scheduled', 'in progress'].includes(status) && !data.isReadOnly) {
          if (!candidate) {
            candidate = { id: doc.id, data };
          } else if (data.vendorName && organisation && data.vendorName.toLowerCase().includes(organisation.toLowerCase())) {
            candidate = { id: doc.id, data };
          }
        }
      });

      if (candidate) {
        auditDocId = candidate.id;
        existingData = candidate.data;
        auditRefToUpdate = auditsRef.doc(auditDocId);
      }
    }

    if (auditRefToUpdate) {
      if (existingData.isReadOnly) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AUDIT_READ_ONLY',
            message: 'This audit is marked as Read-Only because a Re-Audit was conducted. Further changes cannot be saved to the original audit.'
          }
        });
      }

      const now = new Date().toISOString();
      const timeline = existingData.timeline || [];
      timeline.push({
        event: 'Audit marked Pending Sign-off',
        status: 'Pending Sign-off',
        timestamp: now,
        actor: auditor || existingData.auditorName || 'Auditor',
        notes: 'Auditor completed and submitted checklist for review'
      });

      let resolvedActRules = (existingData.actRules && Array.isArray(existingData.actRules) && existingData.actRules.length > 0)
        ? existingData.actRules
        : ((req.body.actRules && Array.isArray(req.body.actRules) && req.body.actRules.length > 0)
            ? req.body.actRules
            : null);

      if (!resolvedActRules) {
        const actRulesFilePath = path.join(__dirname, '../data/actRules.json');
        if (fs.existsSync(actRulesFilePath)) {
          try {
            resolvedActRules = JSON.parse(fs.readFileSync(actRulesFilePath, 'utf-8'));
          } catch (e) {
            resolvedActRules = [];
          }
        } else {
          resolvedActRules = [];
        }
      }

      const updateData = {
        status: 'Pending Sign-off',
        auditType: existingData.auditType || req.body.auditType || 'Original',
        isReadOnly: false,
        organisation: organisation || existingData.organisation || '',
        site: site || existingData.site || '',
        auditMonth: auditMonth || existingData.auditMonth || '',
        auditDate: auditDate || existingData.auditDate || '',
        conductedAt: conductedAt || existingData.conductedAt || '',
        vendorRepresentative: vendorRepresentative || existingData.vendorRepresentative || '',
        clientRepresentative: clientRepresentative || existingData.clientRepresentative || '',
        employeeCount: employeeCount || existingData.employeeCount || null,
        country: country || existingData.country || 'India',
        state: state || existingData.state || 'N/A',
        vendorType: normalizedVendorType,
        summary: calculationResult.summary,
        categoryScores: calculationResult.categoryScores,
        nonCompliantItems: calculationResult.nonCompliantItems,
        responses,
        score: calculationResult.summary.score,
        timeline,
        actRules: resolvedActRules,
        interviewResources: Array.isArray(req.body.interviewResources)
          ? req.body.interviewResources
          : (existingData.interviewResources || []),
        submittedAt: now,
        updatedAt: now
      };

      await auditRefToUpdate.update(updateData);

      return res.status(201).json({
        success: true,
        message: 'Audit successfully calculated and saved to assigned workflow.',
        data: { id: auditDocId, ...existingData, ...updateData }
      });
    } else {
      // Fallback for standalone usage (no admin assigned audit found)
      const auditRecord = await auditService.createAudit({
        organisation,
        site,
        auditMonth,
        auditDate,
        conductedAt,
        auditor,
        vendorRepresentative,
        clientRepresentative,
        employeeCount,
        country: country || 'India',
        state: state || 'N/A',
        vendorType: normalizedVendorType,
        summary: calculationResult.summary,
        categoryScores: calculationResult.categoryScores,
        nonCompliantItems: calculationResult.nonCompliantItems,
        responses
      });

      return res.status(201).json({
        success: true,
        message: 'Audit successfully calculated and saved as standalone.',
        data: auditRecord
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Get Audit by ID
 */
async function getAuditById(req, res, next) {
  try {
    const { id } = req.params;
    const audit = await auditService.getAuditById(id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Audit with ID '${id}' not found.`
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: audit
    });
  } catch (err) {
    next(err);
  }
}

async function getMyAssignedAudits(req, res, next) {
  try {
    const db = getDb();
    let auditorId = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-compliance-key');
        auditorId = decoded.id;
      } catch (e) {
        console.warn('JWT decode warn:', e.message);
      }
    }

    const auditsRef = db.collection('audits');
    let snapshot;

    if (auditorId) {
      snapshot = await auditsRef.where('auditorId', '==', auditorId).get();
      if (snapshot.empty) {
        snapshot = await auditsRef.get();
      }
    } else {
      snapshot = await auditsRef.get();
    }

    const audits = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const status = (data.status || '').toLowerCase();
      if (['scheduled', 'in progress', 'pending sign-off', 'under review', 'review', 'submitted'].includes(status) || !data.status) {
        const allowDocs = data.allowAuditorToSeeDocuments === true;
        audits.push({
          id: doc.id,
          ...data,
          auditType: data.auditType || 'Original',
          isReadOnly: data.isReadOnly === true,
          allowAuditorToSeeDocuments: allowDocs,
          documents: allowDocs ? (data.documents || []) : []
        });
      }
    });

    return res.status(200).json({ success: true, data: audits });
  } catch (err) {
    next(err);
  }
}

/**
 * Download Audit Excel for Auditor / Calculator Screen
 */
async function downloadExcel(req, res, next) {
  try {
    let {
      vendorType,
      responses,
      organisation,
      site,
      auditMonth,
      auditDate,
      conductedAt,
      auditor,
      vendorRepresentative,
      clientRepresentative,
      employeeCount,
      auditId,
      state,
      country
    } = req.body || {};

    let storedAudit = null;
    if (auditId) {
      try {
        const db = getDb();
        if (db) {
          let docSnap = await db.collection('audits').doc(auditId).get();
          if (!docSnap.exists) {
            const q = await db.collection('audits').where('auditIdString', '==', auditId).get();
            if (!q.empty) docSnap = q.docs[0];
          }
          if (docSnap && docSnap.exists) {
            storedAudit = { id: docSnap.id, ...docSnap.data() };
          }
        }
      } catch (e) {
        console.warn('Could not fetch stored audit for excel download:', e.message);
      }
    }

    const resolvedState = state || storedAudit?.state || 'All';
    const resolvedCountry = country || storedAudit?.country || 'India';
    const targetVendorType = vendorType || storedAudit?.vendorType || 'other-vendor';

    if (!checklistService.isValidVendorType(targetVendorType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid vendor type '${targetVendorType}'.`
        }
      });
    }

    const checklist = checklistService.getChecklistByVendorType(targetVendorType, { state: resolvedState, country: resolvedCountry }) || [];
    const normalizedVendorType = checklistService.normalizeVendorType(targetVendorType);

    const activeResponses = (Array.isArray(responses) && responses.length > 0)
      ? responses
      : (storedAudit?.responses || []);

    // Calculate score using existing scoring engine, with graceful fallback to stored audit evaluation
    let calculationResult;
    try {
      calculationResult = scoringService.calculateComplianceScore(checklist, activeResponses);
    } catch (calcErr) {
      if (storedAudit && storedAudit.summary) {
        calculationResult = {
          summary: storedAudit.summary,
          categoryScores: storedAudit.categoryScores || [],
          nonCompliantItems: storedAudit.nonCompliantItems || []
        };
      } else {
        throw calcErr;
      }
    }

    const auditObject = {
      ...(storedAudit || {}),
      id: auditId || storedAudit?.id || `AUD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      auditIdString: storedAudit?.auditIdString || auditId || `AUD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      auditPeriod: auditMonth || storedAudit?.auditPeriod || 'Q3 2026',
      organisation: organisation || storedAudit?.organisation || storedAudit?.customerName || 'Vendor Organisation',
      site: site || conductedAt || storedAudit?.site || storedAudit?.conductedAt || 'Site / Location',
      auditMonth: auditMonth || storedAudit?.auditMonth || '',
      auditDate: auditDate || storedAudit?.auditDate || new Date().toISOString().split('T')[0],
      conductedAt: conductedAt || storedAudit?.conductedAt || '',
      auditor: auditor || storedAudit?.auditorName || storedAudit?.auditor || 'Auditor',
      vendorRepresentative: vendorRepresentative || storedAudit?.vendorRepresentative || '',
      clientRepresentative: clientRepresentative || storedAudit?.clientRepresentative || '',
      employeeCount: employeeCount || storedAudit?.employeeCount || '',
      country: resolvedCountry,
      state: resolvedState,
      vendorType: normalizedVendorType,
      summary: calculationResult.summary,
      categoryScores: calculationResult.categoryScores,
      nonCompliantItems: calculationResult.nonCompliantItems,
      responses: activeResponses,
      score: calculationResult.summary.score,
      status: storedAudit?.status || 'Completed',
      createdAt: storedAudit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const relatedDocs = storedAudit?.documents || [];
    const excelBuffer = excelReportService.generateAuditExcelBuffer(auditObject, relatedDocs);

    const safeAuditId = String(auditObject.auditIdString || auditObject.id || 'AUDIT').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safePeriod = String(auditObject.auditMonth || auditObject.auditPeriod || 'Report')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fileName = `${safeAuditId}_${safePeriod}_Complete-Audit.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Download Audit Excel By ID
 */
async function downloadAuditExcelById(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDb();
    const doc = await db.collection('audits').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const auditData = doc.data();
    const auditObj = { id: doc.id, ...auditData };

    const excelBuffer = excelReportService.generateAuditExcelBuffer(auditObj, auditData.documents || []);
    const safeAuditId = String(auditObj.auditIdString || auditObj.id || 'AUDIT').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safePeriod = String(auditObj.auditPeriod || auditObj.auditMonth || 'Report')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fileName = `${safeAuditId}_${safePeriod}_Complete-Audit.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Get Documents uploaded for an Audit (Accessible to Auditor and Admin)
 */
async function getAuditDocuments(req, res, next) {
  try {
    const { auditId } = req.params;
    const db = getDb();

    // 1. Fetch documents array from audit doc (check doc.id, auditIdString, and id field)
    let auditDoc = await db.collection('audits').doc(auditId).get();
    let auditData = null;
    let actualDocId = auditId;

    if (auditDoc.exists) {
      auditData = auditDoc.data();
    } else {
      const byString = await db.collection('audits').where('auditIdString', '==', auditId).get();
      if (!byString.empty) {
        auditDoc = byString.docs[0];
        actualDocId = auditDoc.id;
        auditData = auditDoc.data();
      } else {
        const byIdField = await db.collection('audits').where('id', '==', auditId).get();
        if (!byIdField.empty) {
          auditDoc = byIdField.docs[0];
          actualDocId = auditDoc.id;
          auditData = auditDoc.data();
        }
      }
    }

    if (auditData && auditData.allowAuditorToSeeDocuments !== true) {
      return res.status(200).json({
        success: true,
        data: [],
        accessRestricted: true,
        allowAuditorToSeeDocuments: false,
        message: 'Customer has not enabled auditor document access for this audit.'
      });
    }

    let auditDocs = [];
    if (auditData && Array.isArray(auditData.documents)) {
      auditDocs = auditData.documents;
    }

    // 2. Query documents collection for any additional records matching auditId, actualDocId, or auditIdString
    const possibleIds = new Set([auditId, actualDocId]);
    if (auditData?.auditIdString) possibleIds.add(auditData.auditIdString);
    if (auditData?.id) possibleIds.add(auditData.id);

    const collectionDocs = [];
    for (const idToSearch of possibleIds) {
      if (!idToSearch) continue;
      const docsSnapshot = await db.collection('documents').where('auditId', '==', idToSearch).get();
      docsSnapshot.forEach(d => {
        collectionDocs.push({ id: d.id, ...d.data() });
      });
    }

    // Merge by id so auditor gets complete metadata
    const docMap = new Map();
    auditDocs.forEach(d => {
      if (d && d.id) docMap.set(d.id, d);
    });
    collectionDocs.forEach(d => {
      if (d && d.id) {
        if (docMap.has(d.id)) {
          docMap.set(d.id, { ...docMap.get(d.id), ...d });
        } else {
          docMap.set(d.id, d);
        }
      }
    });

    const result = Array.from(docMap.values());
    return res.status(200).json({ success: true, data: result, allowAuditorToSeeDocuments: true });
  } catch (err) {
    console.error('getAuditDocuments error:', err);
    next(err);
  }
}

/**
 * Get Pre-signed Download/View URL for a Document (Accessible to Auditor and Admin)
 */
async function getDocumentDownloadUrl(req, res, next) {
  try {
    const { docId } = req.params;
    const db = getDb();

    // 1. Try finding in documents collection
    const docSnapshot = await db.collection('documents').doc(docId).get();
    let docData = null;

    if (docSnapshot.exists) {
      docData = docSnapshot.data();
    } else {
      // 2. Fallback: Search across audits collection
      const auditsSnapshot = await db.collection('audits').get();
      for (const aDoc of auditsSnapshot.docs) {
        const auditDocs = aDoc.data().documents || [];
        const match = auditDocs.find(d => d.id === docId);
        if (match) {
          docData = match;
          break;
        }
      }
    }

    if (!docData) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Check parent audit permission if auditId is present
    if (docData.auditId) {
      try {
        let parentAuditDoc = await db.collection('audits').doc(docData.auditId).get();
        if (!parentAuditDoc.exists) {
          const byStr = await db.collection('audits').where('auditIdString', '==', docData.auditId).get();
          if (!byStr.empty) parentAuditDoc = byStr.docs[0];
        }
        if (parentAuditDoc && parentAuditDoc.exists) {
          const pData = parentAuditDoc.data();
          if (pData && pData.allowAuditorToSeeDocuments !== true) {
            return res.status(403).json({
              success: false,
              error: 'Customer has not enabled auditor document access for this audit.'
            });
          }
        }
      } catch (chkErr) {
        console.warn('Error checking parent audit permission:', chkErr.message);
      }
    }

    // If S3 key exists, generate pre-signed URL
    if (docData.s3Key) {
      try {
        const s3Service = require('../services/s3Service');
        const url = await s3Service.getPresignedUrl(docData.s3Key);
        return res.status(200).json({ success: true, isUrl: true, data: url, fileName: docData.fileName });
      } catch (s3Err) {
        console.warn('S3 presign warning:', s3Err.message);
        if (docData.fileData) {
          return res.status(200).json({ success: true, isUrl: false, data: docData.fileData, fileName: docData.fileName });
        }
      }
    }

    // If Base64 data exists
    if (docData.fileData) {
      return res.status(200).json({ success: true, isUrl: false, data: docData.fileData, fileName: docData.fileName });
    }

    return res.status(404).json({ success: false, error: 'Document file content not found' });
  } catch (err) {
    console.error('getDocumentDownloadUrl error:', err);
    next(err);
  }
}

/**
 * Initiate Re-Audit
 * Marks original audit as isReadOnly = true, hasReAudit = true,
 * and creates a new audit doc with auditType = 'Re-Audit', copying all details and documents.
 */
async function initiateReAudit(req, res, next) {
  try {
    const auditId = req.params.auditId || req.body.auditId;
    if (!auditId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Audit ID is required to initiate re-audit.' }
      });
    }

    const db = getDb();
    const auditDocRef = db.collection('audits').doc(auditId);
    const auditDoc = await auditDocRef.get();

    if (!auditDoc.exists) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Audit with ID '${auditId}' not found.` }
      });
    }

    const originalData = auditDoc.data();
    const now = new Date().toISOString();

    // Mark original audit as Read-Only
    await auditDocRef.update({
      isReadOnly: true,
      hasReAudit: true,
      auditType: originalData.auditType || 'Original',
      updatedAt: now
    });

    // Derive re-audit ID string: e.g. AUD-2026-0010-RA
    const origIdStr = originalData.auditIdString || originalData.id || auditDoc.id;
    let reAuditIdString = origIdStr;
    if (origIdStr.includes('-RA')) {
      const parts = origIdStr.split('-RA');
      const count = parseInt(parts[1] || '1', 10) + 1;
      reAuditIdString = `${parts[0]}-RA${count}`;
    } else {
      reAuditIdString = `${origIdStr}-RA`;
    }

    // Prepare initial timeline for the Re-Audit
    const timeline = [
      ...(originalData.timeline || []),
      {
        event: 'Re-Audit Initiated',
        status: 'In Progress',
        timestamp: now,
        actor: req.user?.name || req.user?.email || originalData.auditorName || 'Auditor',
        notes: `Re-Audit initiated from original audit ${origIdStr}. Original audit marked as Read-Only.`
      }
    ];

    const newReAuditData = {
      ...originalData,
      auditIdString: reAuditIdString,
      auditType: 'Re-Audit',
      isReadOnly: false,
      parentAuditId: auditDoc.id,
      originalAuditId: auditDoc.id,
      originalAuditIdString: origIdStr,
      status: 'In Progress',
      score: null,
      summary: null,
      responses: [],
      timeline,
      createdAt: now,
      updatedAt: now
    };
    delete newReAuditData.id;

    // Check if an existing In Progress Re-Audit document already exists for this original audit to prevent duplicates
    const existingReAuditSnap = await db.collection('audits')
      .where('parentAuditId', '==', auditDoc.id)
      .get();

    let candidateDoc = null;
    existingReAuditSnap.forEach(d => {
      const st = (d.data().status || '').toLowerCase();
      if (['in progress', 'scheduled'].includes(st)) {
        candidateDoc = d;
      }
    });

    let newAuditId = null;
    if (candidateDoc) {
      newAuditId = candidateDoc.id;
      await candidateDoc.ref.update({
        ...newReAuditData,
        updatedAt: now
      });
    } else {
      const newDocRef = await db.collection('audits').add(newReAuditData);
      newAuditId = newDocRef.id;

      // Clone any existing documents in 'documents' collection for this audit
      try {
        const docsSnapshot = await db.collection('documents').where('auditId', '==', auditDoc.id).get();
        const clonePromises = [];
        docsSnapshot.forEach(d => {
          const docData = d.data();
          clonePromises.push(
            db.collection('documents').add({
              ...docData,
              auditId: newAuditId,
              clonedFrom: d.id,
              createdAt: now
            })
          );
        });
        await Promise.all(clonePromises);
      } catch (docErr) {
        console.warn('Error cloning documents for re-audit:', docErr.message);
      }
    }

    try {
      const allCached = loadLocalAudits() || [];
      const updatedList = allCached.map(a => {
        if (a.id === auditDoc.id || a.auditIdString === origIdStr) {
          return { ...a, isReadOnly: true, hasReAudit: true, auditType: originalData.auditType || 'Original', updatedAt: now };
        }
        return a;
      });
      const reAuditIdx = updatedList.findIndex(a => a.id === newAuditId || a.auditIdString === reAuditIdString);
      const reAuditObj = { id: newAuditId, ...newReAuditData };
      if (reAuditIdx >= 0) {
        updatedList[reAuditIdx] = reAuditObj;
      } else {
        updatedList.unshift(reAuditObj);
      }
      saveLocalAudits(updatedList);

      const adminController = require('./adminController');
      if (adminController && typeof adminController.invalidateAuditsCache === 'function') {
        adminController.invalidateAuditsCache(newAuditId, newReAuditData);
      }
    } catch (cacheErr) {
      console.warn('Cache sync error on initiateReAudit:', cacheErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Re-Audit (${reAuditIdString}) created successfully. Original audit marked as Read-Only.`,
      data: {
        id: newAuditId,
        ...newReAuditData
      },
      originalAuditId: auditDoc.id
    });
  } catch (err) {
    console.error('initiateReAudit error:', err);
    next(err);
  }
}

const LOCAL_AUDITS_FILE = path.resolve(__dirname, '../data/audits_cache.json');

function loadLocalAudits() {
  try {
    if (fs.existsSync(LOCAL_AUDITS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_AUDITS_FILE, 'utf8'));
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function saveLocalAudits(audits) {
  try {
    fs.writeFileSync(LOCAL_AUDITS_FILE, JSON.stringify(audits, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

/**
 * Update Interview Resources for an Audit
 */
async function updateInterviewResources(req, res, next) {
  try {
    const { auditId } = req.params;
    const { resources, auditorEmail, sendEmail } = req.body;
    if (!auditId) {
      return res.status(400).json({ success: false, error: 'Audit ID required' });
    }

    let actualRef = null;
    let auditData = null;
    let db = null;
    try {
      db = getDb();
      const docRef = db.collection('audits').doc(auditId);
      let docSnap = await docRef.get();
      actualRef = docRef;
      if (!docSnap.exists) {
        const q = await db.collection('audits').where('auditIdString', '==', auditId).get();
        if (!q.empty) {
          docSnap = q.docs[0];
          actualRef = db.collection('audits').doc(docSnap.id);
        }
      }
      if (docSnap && docSnap.exists) {
        auditData = docSnap.data();
      }
    } catch (dbErr) {
      console.warn('[updateInterviewResources DB quota/error]:', dbErr.message);
    }

    if (!auditData) {
      const cached = (loadLocalAudits() || []).find(a => a.id === auditId || a.auditIdString === auditId);
      if (cached) {
        auditData = cached;
      }
    }

    if (!auditData) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }
    const existingResources = Array.isArray(auditData.interviewResources) ? auditData.interviewResources : [];

    // Generate distinct Login ID and Password for each person if not present
    const cleanResources = (Array.isArray(resources) ? resources : []).map((r, idx) => {
      const existing = existingResources.find(ex => ex.id === r.id);
      const randDigits = Math.floor(100000 + Math.random() * 900000);
      const randPass = Math.floor(1000 + Math.random() * 9000);

      const loginId = r.loginId || (existing && existing.loginId) || `INT-${randDigits}`;
      const pass = r.pass || (existing && existing.pass) || `Pass@${randPass}`;
      
      // Support multiple questions or single question
      let questions = [];
      if (Array.isArray(r.questions) && r.questions.length > 0) {
        questions = r.questions.map((q, qIdx) => ({
          id: q.id || `qa_${qIdx + 1}`,
          question: q.question !== undefined ? q.question : '',
          answer: q.answer !== undefined ? q.answer : '',
          attachmentName: q.attachmentName || '',
          attachmentData: q.attachmentData || '',
          attachmentType: q.attachmentType || '',
          attachmentSize: q.attachmentSize || 0
        }));
      } else {
        const primaryQ = r.question !== undefined ? r.question : (existing?.question || '');
        const primaryA = r.answer !== undefined ? r.answer : (existing?.answer || '');
        questions = [{
          id: 'qa_1',
          question: primaryQ,
          answer: primaryA
        }];
      }

      const primaryQuestion = questions[0]?.question || '';
      const primaryAnswer = questions[0]?.answer || '';

      return {
        ...r,
        status: r.status || 'Initiate',
        loginId,
        pass,
        question: primaryQuestion,
        answer: primaryAnswer,
        questions
      };
    });

    const updatePayload = {
      interviewResources: cleanResources,
      updatedAt: new Date().toISOString()
    };
    if (auditData.status === 'Scheduled' || !auditData.status) {
      updatePayload.status = 'Initiate';
    }
    
    const targetAuditId = (actualRef && actualRef.id) || auditId;
    try {
      if (actualRef) {
        await actualRef.update(updatePayload);
      }
    } catch (updateErr) {
      console.warn('[updateInterviewResources DB update quota/error]:', updateErr.message);
    }

    try {
      const adminController = require('./adminController');
      if (adminController && typeof adminController.invalidateAuditsCache === 'function') {
        adminController.invalidateAuditsCache(targetAuditId, { interviewResources: cleanResources, ...updatePayload });
      }
    } catch (e) {
      // ignore
    }

    try {
      const allCached = loadLocalAudits() || [];
      const updatedList = allCached.map(a => {
        if (a.id === targetAuditId || a.auditIdString === targetAuditId) {
          return { ...a, ...updatePayload };
        }
        // Propagate question updates to any audits sharing these candidate resource IDs or loginIds
        if (Array.isArray(a.interviewResources) && a.interviewResources.length > 0) {
          let modified = false;
          const synced = a.interviewResources.map(ex => {
            const match = cleanResources.find(cr => (cr.id && cr.id === ex.id) || (cr.loginId && cr.loginId === ex.loginId));
            if (match) {
              modified = true;
              return {
                ...ex,
                loginId: match.loginId || ex.loginId,
                pass: match.pass || ex.pass,
                question: match.question || ex.question,
                questions: match.questions || ex.questions,
                isQuestionSaved: match.isQuestionSaved !== undefined ? match.isQuestionSaved : ex.isQuestionSaved,
                ask: match.ask || ex.ask
              };
            }
            return ex;
          });
          if (modified) {
            return { ...a, interviewResources: synced };
          }
        }
        return a;
      });
      saveLocalAudits(updatedList);
    } catch (e) {
      // ignore
    }

    // Send automated email to the auditor ONLY when sendEmail is true (when Admin clicks "Save Question")
    let emailSent = false;
    let recipientEmail = null;
    let recipientName = auditData.auditorName || (auditData.auditor !== 'Auditor' ? auditData.auditor : '') || 'Auditor';

    if (sendEmail === true && cleanResources.length > 0) {
      // 1. Check passed auditorEmail if it contains '@'
      if (typeof auditorEmail === 'string' && auditorEmail.includes('@')) {
        recipientEmail = auditorEmail.trim();
      }

      // 2. Check auditData.auditorEmail
      if (!recipientEmail && typeof auditData.auditorEmail === 'string' && auditData.auditorEmail.includes('@')) {
        recipientEmail = auditData.auditorEmail.trim();
      }

      // 3. Check auditData.auditor if it is an email
      if (!recipientEmail && typeof auditData.auditor === 'string' && auditData.auditor.includes('@')) {
        recipientEmail = auditData.auditor.trim();
      }

      // 4. Resolve via auditData.auditorId in 'users' collection
      const targetAuditorId = auditData.auditorId || (typeof auditData.auditor === 'string' && auditData.auditor !== 'Auditor' ? auditData.auditor : null);
      if (!recipientEmail && targetAuditorId && db) {
        try {
          const uSnap = await db.collection('users').doc(targetAuditorId).get();
          if (uSnap.exists) {
            const uData = uSnap.data() || {};
            if (uData.email && uData.email.includes('@')) {
              recipientEmail = uData.email.trim();
            }
            if (uData.fullName || uData.name) {
              recipientName = uData.fullName || uData.name;
            }
          }
        } catch (e) {
          console.warn('Could not resolve auditorId in users:', e.message);
        }
      }

      // 5. Fallback lookup to any auditor user in DB if still not found
      if (!recipientEmail && db) {
        try {
          const aSnap = await db.collection('users').where('role', '==', 'auditor').limit(1).get();
          if (!aSnap.empty) {
            const firstAuditor = aSnap.docs[0].data();
            if (firstAuditor && firstAuditor.email && firstAuditor.email.includes('@')) {
              recipientEmail = firstAuditor.email.trim();
              recipientName = firstAuditor.fullName || firstAuditor.name || recipientName;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (!recipientEmail || !recipientEmail.includes('@')) {
        recipientEmail = 'ww@gmail.com';
      }

      const emailService = require('../services/emailService');
      emailService.sendInterviewScheduledEmail({
        recipientEmail,
        auditorName: recipientName,
        auditIdString: auditData.auditIdString || auditData.id || auditId,
        auditPeriod: auditData.auditPeriod || 'Current Period',
        resources: cleanResources,
        portalUrl: req.get('origin') || (req.get('referer') ? new URL(req.get('referer')).origin : null) || process.env.FRONTEND_URL || 'http://localhost:5174',
        auditId: targetAuditId
      }).catch(err => console.error('sendInterviewScheduledEmail error:', err));
      emailSent = true;
    }

    return res.status(200).json({
      success: true,
      message: emailSent
        ? `Interview question saved and email sent to auditor (${recipientEmail}) successfully`
        : 'Interview resources saved successfully',
      data: cleanResources,
      resources: cleanResources,
      emailSent,
      recipientEmail
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Interview Login endpoint for the automated email link
 * Validates loginId and pass against all scheduled interview resources in audits
 */
async function interviewLogin(req, res, next) {
  try {
    const { loginId, pass, auditId } = req.body;
    if (!loginId || !pass) {
      return res.status(400).json({ success: false, error: 'Login ID and Password are required.' });
    }

    const cleanLoginId = String(loginId).trim().toLowerCase();
    const cleanPass = String(pass).trim();
    const targetAuditId = auditId ? String(auditId).trim().toLowerCase() : null;

    let auditsList = [];
    try {
      const db = getDb();
      const auditsSnap = await db.collection('audits').get();
      auditsSnap.forEach(doc => auditsList.push({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn('[interviewLogin DB quota/error, falling back to cache]:', e.message);
      auditsList = loadLocalAudits() || [];
    }

    // Merge with local audits cache to ensure we have the most up to date data
    const localList = loadLocalAudits() || [];
    const allAuditsMap = new Map();
    [...auditsList, ...localList].forEach(a => {
      if (a && a.id) {
        const existing = allAuditsMap.get(a.id);
        if (!existing) {
          allAuditsMap.set(a.id, a);
        } else {
          const aHasQ = Array.isArray(a.interviewResources) && a.interviewResources.some(r => 
            (r.question && r.question.trim().length > 0) || 
            (Array.isArray(r.questions) && r.questions.some(q => q && q.question && q.question.trim().length > 0)) ||
            r.isQuestionSaved
          );
          if (aHasQ) {
            allAuditsMap.set(a.id, { ...existing, ...a });
          }
        }
      }
    });
    const combinedAudits = Array.from(allAuditsMap.values());

    const isPassMatch = (storedPass, enteredPass) => {
      const s = String(storedPass || '').trim();
      const e = String(enteredPass || '').trim();
      return s === e || s.toLowerCase() === e.toLowerCase();
    };

    // Find all matching candidates across all audits
    const matches = [];
    combinedAudits.forEach(a => {
      if (Array.isArray(a.interviewResources)) {
        const found = a.interviewResources.find(r => 
          r && r.loginId && 
          String(r.loginId).trim().toLowerCase() === cleanLoginId && 
          isPassMatch(r.pass, cleanPass)
        );
        if (found) {
          matches.push({
            audit: a,
            resource: found
          });
        }
      }
    });

    if (matches.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Login ID or Password. Please check the credentials received in your email.'
      });
    }

    const hasQuestions = (res) => {
      if (!res) return false;
      if (Array.isArray(res.questions) && res.questions.some(q => q && q.question && q.question.trim().length > 0)) {
        return true;
      }
      if (res.question && res.question.trim().length > 0) {
        return true;
      }
      return Boolean(res.isQuestionSaved);
    };

    // If any match has saved questions, preserve canonical questions
    const matchWithQuestions = matches.find(m => hasQuestions(m.resource));
    const canonicalQuestions = matchWithQuestions?.resource?.questions;
    const canonicalQuestion = matchWithQuestions?.resource?.question;

    matches.sort((a, b) => {
      // Priority 1: Specifically requested auditId
      if (targetAuditId) {
        const aMatchesAudit = (a.audit.id && a.audit.id.toLowerCase() === targetAuditId) || (a.audit.auditIdString && a.audit.auditIdString.toLowerCase() === targetAuditId);
        const bMatchesAudit = (b.audit.id && b.audit.id.toLowerCase() === targetAuditId) || (b.audit.auditIdString && b.audit.auditIdString.toLowerCase() === targetAuditId);
        if (aMatchesAudit && !bMatchesAudit) return -1;
        if (!aMatchesAudit && bMatchesAudit) return 1;
      }

      // Priority 2: Has questions configured & saved
      const aHas = hasQuestions(a.resource);
      const bHas = hasQuestions(b.resource);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;

      // Priority 3: Re-Audit over Original if questions exist
      if (a.audit.auditType === 'Re-Audit' && b.audit.auditType !== 'Re-Audit') return -1;
      if (a.audit.auditType !== 'Re-Audit' && b.audit.auditType === 'Re-Audit') return 1;

      // Priority 4: Newer updatedAt
      const aTime = new Date(a.audit.updatedAt || a.audit.createdAt || 0).getTime();
      const bTime = new Date(b.audit.updatedAt || b.audit.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const bestMatch = matches[0];
    let matchedResource = { ...bestMatch.resource };
    const matchedAuditObj = bestMatch.audit;

    // Propagate canonical questions if matched resource had empty questions
    if (!hasQuestions(matchedResource) && canonicalQuestions && canonicalQuestions.length > 0) {
      matchedResource.questions = canonicalQuestions;
      matchedResource.question = canonicalQuestion || canonicalQuestions[0]?.question || '';
      matchedResource.isQuestionSaved = true;
    }

    const matchedAudit = {
      id: matchedAuditObj.id,
      auditIdString: matchedAuditObj.auditIdString || matchedAuditObj.id,
      auditPeriod: matchedAuditObj.auditPeriod || 'Current Period',
      vendorName: matchedAuditObj.vendorName || 'Vendor',
      customerName: matchedAuditObj.customerName || 'Customer',
      auditorName: matchedAuditObj.auditorName || matchedAuditObj.auditor || 'Auditor',
      status: matchedAuditObj.status || 'Initiate'
    };

    return res.status(200).json({
      success: true,
      message: 'Interview login successful',
      resource: matchedResource,
      audit: matchedAudit
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Submit or update interview answer for candidate
 */
async function submitInterviewAnswer(req, res, next) {
  try {
    const { auditId, resourceId, answer, answers, questions } = req.body;
    if (!auditId || !resourceId) {
      return res.status(400).json({ success: false, error: 'Audit ID and Resource ID are required.' });
    }

    let docSnap = null;
    let actualRef = null;
    let auditData = null;
    try {
      const db = getDb();
      const docRef = db.collection('audits').doc(auditId);
      docSnap = await docRef.get();
      actualRef = docRef;
      if (!docSnap.exists) {
        const q = await db.collection('audits').where('auditIdString', '==', auditId).get();
        if (!q.empty) {
          docSnap = q.docs[0];
          actualRef = db.collection('audits').doc(docSnap.id);
        }
      }
      if (docSnap && docSnap.exists) {
        auditData = docSnap.data();
      }
    } catch (e) {
      console.warn('[submitInterviewAnswer DB quota/error, using fallback]:', e.message);
    }

    if (!auditData) {
      const cachedList = loadLocalAudits() || [];
      auditData = cachedList.find(a => a.id === auditId || a.auditIdString === auditId);
    }

    if (!auditData) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const resources = Array.isArray(auditData.interviewResources) ? auditData.interviewResources : [];

    let updatedResource = null;
    const updated = resources.map(r => {
      if (r.id === resourceId || (r.loginId && r.loginId === resourceId)) {
        let resQuestions = Array.isArray(r.questions) && r.questions.length > 0 ? [...r.questions] : [];
        if (Array.isArray(questions) && questions.length > 0) {
          const existingMap = new Map((r.questions || []).map(q => [q.id, q]));
          resQuestions = questions.map((q, idx) => {
            const ex = existingMap.get(q.id) || (r.questions && r.questions[idx]) || {};
            return {
              id: q.id || ex.id || `qa_${idx + 1}`,
              question: q.question || ex.question || '',
              answer: q.answer !== undefined ? q.answer : (ex.answer || ''),
              attachmentName: q.attachmentName !== undefined ? q.attachmentName : (ex.attachmentName || ''),
              attachmentData: q.attachmentData !== undefined ? q.attachmentData : (ex.attachmentData || ''),
              attachmentType: q.attachmentType !== undefined ? q.attachmentType : (ex.attachmentType || ''),
              attachmentSize: q.attachmentSize !== undefined ? q.attachmentSize : (ex.attachmentSize || 0)
            };
          });
          (r.questions || []).forEach(ex => {
            if (!resQuestions.some(rq => rq.id === ex.id)) {
              resQuestions.push(ex);
            }
          });
        } else if (answers && typeof answers === 'object') {
          resQuestions = resQuestions.map(q => ({
            ...q,
            answer: answers[q.id] !== undefined ? answers[q.id] : (q.answer || '')
          }));
        } else if (answer !== undefined) {
          if (resQuestions.length === 0) {
            resQuestions = [{ id: 'qa_1', question: r.question || '', answer: answer || '' }];
          } else {
            resQuestions[0] = { ...resQuestions[0], answer: answer || '' };
          }
        }

        const primaryAnswer = resQuestions[0]?.answer || answer || '';

        updatedResource = {
          ...r,
          answer: primaryAnswer,
          questions: resQuestions,
          status: 'In Progress'
        };
        return updatedResource;
      }
      return r;
    });

    const targetAuditId = (actualRef && actualRef.id) || auditId;
    try {
      if (actualRef) {
        // Strip out large attachmentData (>500KB) when saving to Firestore document to prevent 1MB limit error
        const firestoreSafeResources = updated.map(r => ({
          ...r,
          questions: (r.questions || []).map(q => ({
            ...q,
            attachmentData: (q.attachmentData && q.attachmentData.length > 500000) ? '' : (q.attachmentData || '')
          }))
        }));
        await actualRef.update({
          interviewResources: firestoreSafeResources,
          updatedAt: new Date().toISOString()
        });

        // Also propagate interviewResources to related Re-Audit or Parent audit in Firestore
        try {
          const db = getDb();
          const relatedDocIds = new Set();
          if (auditData.parentAuditId) relatedDocIds.add(auditData.parentAuditId);
          if (auditData.originalAuditId) relatedDocIds.add(auditData.originalAuditId);
          
          const childAudits = await db.collection('audits').where('parentAuditId', '==', targetAuditId).get();
          childAudits.forEach(d => relatedDocIds.add(d.id));

          for (const relId of relatedDocIds) {
            if (relId !== targetAuditId) {
              await db.collection('audits').doc(relId).update({
                interviewResources: firestoreSafeResources,
                updatedAt: new Date().toISOString()
              }).catch(() => {});
            }
          }
        } catch (relErr) {
          // ignore
        }
      }
    } catch (dbUpdateErr) {
      console.warn('[submitInterviewAnswer DB update quota/error]:', dbUpdateErr.message);
    }

    try {
      const adminController = require('./adminController');
      if (adminController && typeof adminController.invalidateAuditsCache === 'function') {
        adminController.invalidateAuditsCache(targetAuditId, { interviewResources: updated });
      }
    } catch (e) {
      // ignore
    }

    try {
      const allCached = loadLocalAudits() || [];
      const updatedList = allCached.map(a => {
        if (a.id === targetAuditId || a.auditIdString === targetAuditId) {
          return { ...a, interviewResources: updated };
        }
        // Also sync answer and attachments to any other audit sharing this candidate resource ID or loginId
        if (Array.isArray(a.interviewResources) && a.interviewResources.length > 0) {
          let modified = false;
          const synced = a.interviewResources.map(ex => {
            const match = updated.find(ur => (ur.id && ur.id === ex.id) || (ur.loginId && ur.loginId === ex.loginId));
            if (match) {
              modified = true;
              return {
                ...ex,
                answer: match.answer !== undefined ? match.answer : ex.answer,
                questions: match.questions || ex.questions,
                status: match.status || ex.status
              };
            }
            return ex;
          });
          if (modified) {
            return { ...a, interviewResources: synced };
          }
        }
        return a;
      });
      saveLocalAudits(updatedList);
    } catch (e) {
      // ignore
    }

    return res.status(200).json({
      success: true,
      message: 'Interview answer saved successfully',
      resource: updatedResource,
      resources: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve fresh session details for logged-in interview
 */
async function getInterviewSession(req, res, next) {
  try {
    const { auditId, resourceId } = req.query;
    if (!auditId || !resourceId) {
      return res.status(400).json({ success: false, error: 'Audit ID and Resource ID required.' });
    }

    let auditData = null;
    const cached = (loadLocalAudits() || []).find(a => a.id === auditId || a.auditIdString === auditId);
    if (cached) {
      auditData = cached;
      resolvedId = cached.id || auditId;
    } else {
      try {
        const db = getDb();
        let docRef = db.collection('audits').doc(auditId);
        let docSnap = await docRef.get();
        if (!docSnap.exists) {
          const q = await db.collection('audits').where('auditIdString', '==', auditId).get();
          if (!q.empty) {
            docSnap = q.docs[0];
            resolvedId = docSnap.id;
          }
        }
        if (docSnap && docSnap.exists) {
          auditData = docSnap.data();
          resolvedId = docSnap.id;
        }
      } catch (e) {
        console.warn('[getInterviewSession DB quota/error, fallback to cache]:', e.message);
      }
    }

    if (!auditData) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }
    let resource = (auditData.interviewResources || []).find(r => r.id === resourceId || (r.loginId && r.loginId === resourceId));
    
    // Fallback: If resource questions are empty or missing, check if any other audit has this resource with saved questions
    const hasQ = (res) => res && ((Array.isArray(res.questions) && res.questions.some(q => q && q.question && q.question.trim().length > 0)) || (res.question && res.question.trim().length > 0) || res.isQuestionSaved);
    if (!resource || !hasQ(resource)) {
      const allCached = loadLocalAudits() || [];
      for (const a of allCached) {
        if (Array.isArray(a.interviewResources)) {
          const found = a.interviewResources.find(r => (r.id === resourceId || (r.loginId && resource && r.loginId === resource.loginId)) && hasQ(r));
          if (found) {
            resource = resource ? { ...resource, questions: found.questions, question: found.question, isQuestionSaved: true } : found;
            break;
          }
        }
      }
    }

    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    return res.status(200).json({
      success: true,
      resource,
      audit: {
        id: resolvedId,
        auditIdString: auditData.auditIdString || resolvedId,
        auditPeriod: auditData.auditPeriod,
        vendorName: auditData.vendorName,
        customerName: auditData.customerName,
        status: auditData.status
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHealth,
  getVendorTypes,
  getTemplate,
  calculateScore,
  createAudit,
  initiateReAudit,
  getAuditById,
  getMyAssignedAudits,
  downloadExcel,
  downloadAuditExcelById,
  getAuditDocuments,
  getDocumentDownloadUrl,
  updateInterviewResources,
  interviewLogin,
  submitInterviewAnswer,
  getInterviewSession
};

