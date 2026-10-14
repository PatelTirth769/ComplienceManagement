const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(requireRole(['Vendor']));

router.get('/dashboard', vendorController.getDashboardStats);
router.get('/profile', vendorController.getProfile);
router.put('/profile', vendorController.updateProfile);
router.get('/audits', vendorController.getMyAudits);
router.get('/audits/:id', vendorController.getAuditById);
router.get('/audits/:auditId/download-excel', vendorController.downloadAuditExcel);
router.get('/audits/:auditId/documents', vendorController.getDocuments);
router.post('/audits/:auditId/documents', vendorController.uploadDocument);
router.get('/documents/:docId/url', vendorController.getDocumentDownloadUrl); // New download route
router.get('/findings', vendorController.getFindings);
router.post('/findings/respond', vendorController.respondToFinding);
router.get('/reports', vendorController.getReports);
router.get('/reports/:auditId/download', vendorController.downloadReport);
router.get('/notifications', vendorController.getNotifications);
router.get('/contact', vendorController.getAuditorContact);

module.exports = router;
