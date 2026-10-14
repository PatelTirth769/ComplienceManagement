const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// Protect all admin routes
router.use(authenticate, requireAdmin);

// Dashboard Stats
router.get('/stats', adminController.getDashboardStats);

// User Management (Customers, Vendors, Auditors)
router.get('/users', adminController.getUsersByRole);
router.post('/users', adminController.createUser);

// Audits Management
router.get('/audits', adminController.getAudits);
router.post('/audits', adminController.createAudit);
router.get('/audits/:id', adminController.getAuditById);
router.get('/audits/:auditId/download-excel', adminController.downloadAuditExcel);
router.patch('/audits/:id/status', adminController.updateAuditStatus);
router.put('/audits/:id/status', adminController.updateAuditStatus);
router.post('/audits/:id/status', adminController.updateAuditStatus);
router.delete('/audits/:id', adminController.deleteAudit);

// Checklist Management
router.get('/checklist', adminController.getChecklists);
router.post('/checklist', adminController.addChecklistItem);
router.put('/checklist/:id', adminController.updateChecklistItem);
router.patch('/checklist/:id/status', adminController.updateChecklistItem);

// Analytics
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
