const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');

// Vendor Types
router.get('/vendor-types', complianceController.getVendorTypes);

// Templates / Checklists
router.get('/templates/other-vendor', (req, res, next) => {
  req.params.vendorType = 'other-vendor';
  complianceController.getTemplate(req, res, next);
});

router.get('/templates/security-vendor', (req, res, next) => {
  req.params.vendorType = 'security-vendor';
  complianceController.getTemplate(req, res, next);
});

router.get('/templates/:vendorType', complianceController.getTemplate);

// Act Rules Endpoint
router.get('/rules', (req, res) => {
  const adminController = require('../controllers/adminController');
  adminController.getActRules(req, res);
});

// Scoring Engine Endpoint
router.post('/calculate', complianceController.calculateScore);

// Audits Endpoints
router.get('/assigned-audits', complianceController.getMyAssignedAudits);
router.post('/audits', complianceController.createAudit);
router.post('/audits/:auditId/re-audit', complianceController.initiateReAudit);
router.post('/audits/re-audit', complianceController.initiateReAudit);
router.get('/audits/:id', complianceController.getAuditById);

// Excel Download Endpoints for Auditor
router.post('/download-excel', complianceController.downloadExcel);
router.get('/audits/:id/download-excel', complianceController.downloadAuditExcelById);

// Document Endpoints for Auditor
router.get('/audits/:auditId/documents', complianceController.getAuditDocuments);
router.get('/documents/:docId/url', complianceController.getDocumentDownloadUrl);

// Interview Resources Endpoint for Auditor
router.patch('/audits/:auditId/interview-resources', complianceController.updateInterviewResources);
router.post('/audits/:auditId/interview-resources', complianceController.updateInterviewResources);

// Interview Portal Endpoints
router.post('/interview-login', complianceController.interviewLogin);
router.post('/interview-answer', complianceController.submitInterviewAnswer);
router.get('/interview-session', complianceController.getInterviewSession);

module.exports = router;

