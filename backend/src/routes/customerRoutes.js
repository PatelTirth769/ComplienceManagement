const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Authenticate and enforce Customer role
router.use(authenticate);
router.use(requireRole(['customer', 'admin']));

router.get('/dashboard', customerController.getDashboardStats);
router.get('/vendors', customerController.getVendors);
router.get('/vendors/:vendorId', customerController.getVendorById);
router.get('/audits', customerController.getAudits);
router.get('/audits/:id', customerController.getAuditById);
router.get('/audits/:auditId/download-excel', customerController.downloadAuditExcel);
router.get('/audits/:auditId/download-ppt', customerController.downloadAuditPpt);
router.get('/timeline', customerController.getTimeline);
router.get('/audit-timeline', customerController.getTimeline);
router.get('/scores', customerController.getComplianceScores);
router.get('/compliance-scores', customerController.getComplianceScores);
router.get('/reports', customerController.getReports);
router.get('/overall-report', customerController.getOverallReport);
router.get('/notifications', customerController.getNotifications);
router.patch('/notifications/read-all', customerController.markAllNotificationsRead);
router.patch('/notifications/:id/read', customerController.markNotificationRead);

module.exports = router;
