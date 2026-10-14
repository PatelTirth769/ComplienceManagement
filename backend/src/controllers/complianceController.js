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
  const checklist = checklistService.getChecklistByVendorType(vendorType);

  return res.status(200).json({
    success: true,
    vendorType: normalizedVendorType,
    totalItems: checklist.length,
    checklist: checklist
  });
}

/**
 * Calculate Compliance Score
 */
function calculateScore(req, res, next) {
  try {
    const { vendorType, responses } = req.body || {};

    if (!vendorType || !checklistService.isValidVendorType(vendorType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid or missing vendor type '${vendorType}'. Allowed values: 'other-vendor', 'security-vendor'.`
        }
      });
    }

    const checklist = checklistService.getChecklistByVendorType(vendorType);
    const normalizedVendorType = checklistService.normalizeVendorType(vendorType);

    const calculationResult = scoringService.calculateComplianceScore(checklist, responses);

    return res.status(200).json({
      success: true,
      vendorType: normalizedVendorType,
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
      employeeCount
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

    const checklist = checklistService.getChecklistByVendorType(vendorType);
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

    if (auditorId) {
      const auditsRef = db.collection('audits');
      const snapshot = await auditsRef.where('auditorId', '==', auditorId).get();
      let candidate = null;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const status = (data.status || '').toLowerCase();
        if (['scheduled', 'in progress'].includes(status)) {
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
      const now = new Date().toISOString();
      const timeline = existingData.timeline || [];
      timeline.push({
        event: 'Audit marked Pending Sign-off',
        status: 'Pending Sign-off',
        timestamp: now,
        actor: auditor || existingData.auditorName || 'Auditor',
        notes: 'Auditor completed and submitted checklist for review'
      });

      const updateData = {
        status: 'Pending Sign-off',
        organisation: organisation || existingData.organisation || '',
        site: site || existingData.site || '',
        auditMonth: auditMonth || existingData.auditMonth || '',
        auditDate: auditDate || existingData.auditDate || '',
        conductedAt: conductedAt || existingData.conductedAt || '',
        vendorRepresentative: vendorRepresentative || existingData.vendorRepresentative || '',
        clientRepresentative: clientRepresentative || existingData.clientRepresentative || '',
        employeeCount: employeeCount || existingData.employeeCount || null,
        vendorType: normalizedVendorType,
        summary: calculationResult.summary,
        categoryScores: calculationResult.categoryScores,
        nonCompliantItems: calculationResult.nonCompliantItems,
        responses,
        score: calculationResult.summary.score,
        timeline,
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
      if (['scheduled', 'in progress', 'pending sign-off'].includes(status)) {
        audits.push({ id: doc.id, ...data });
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
      auditId
    } = req.body || {};

    const targetVendorType = vendorType || 'other-vendor';
    if (!checklistService.isValidVendorType(targetVendorType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid vendor type '${targetVendorType}'.`
        }
      });
    }

    const checklist = checklistService.getChecklistByVendorType(targetVendorType);
    const normalizedVendorType = checklistService.normalizeVendorType(targetVendorType);

    // Calculate score using existing scoring engine (single source of truth)
    const calculationResult = scoringService.calculateComplianceScore(checklist, responses || []);

    const auditObject = {
      id: auditId || `AUD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      auditIdString: auditId || `AUD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      auditPeriod: auditMonth || 'Q3 2026',
      organisation: organisation || 'Vendor Organisation',
      site: site || conductedAt || 'Site / Location',
      auditMonth: auditMonth || '',
      auditDate: auditDate || new Date().toISOString().split('T')[0],
      conductedAt: conductedAt || '',
      auditor: auditor || 'Auditor',
      vendorRepresentative: vendorRepresentative || '',
      clientRepresentative: clientRepresentative || '',
      employeeCount: employeeCount || '',
      vendorType: normalizedVendorType,
      summary: calculationResult.summary,
      categoryScores: calculationResult.categoryScores,
      nonCompliantItems: calculationResult.nonCompliantItems,
      responses: responses || [],
      score: calculationResult.summary.score,
      status: 'Completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const excelBuffer = excelReportService.generateAuditExcelBuffer(auditObject, []);
    const fileName = `${auditObject.auditIdString}_${(auditMonth || 'Audit').replace(/\s+/g, '_')}_Complete-Audit.xlsx`;

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
    const fileName = `${auditObj.auditIdString || auditObj.id}_${(auditObj.auditPeriod || 'Report').replace(/\s+/g, '_')}_Complete-Audit.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(excelBuffer);
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
  getAuditById,
  getMyAssignedAudits,
  downloadExcel,
  downloadAuditExcelById
};
