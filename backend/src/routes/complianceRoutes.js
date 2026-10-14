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

// Scoring Engine Endpoint
router.post('/calculate', complianceController.calculateScore);

// Audits Endpoints
router.get('/assigned-audits', complianceController.getMyAssignedAudits);
router.post('/audits', complianceController.createAudit);
router.get('/audits/:id', complianceController.getAuditById);

// Excel Download Endpoints for Auditor
router.post('/download-excel', complianceController.downloadExcel);
router.get('/audits/:id/download-excel', complianceController.downloadAuditExcelById);

module.exports = router;
