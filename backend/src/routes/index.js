const express = require('express');
const router = express.Router();
const complianceRoutes = require('./complianceRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const vendorRoutes = require('./vendorRoutes');
const complianceController = require('../controllers/complianceController');

const customerRoutes = require('./customerRoutes');

// Health Check Endpoint
router.get('/health', complianceController.getHealth);

// Compliance Routes
router.use('/compliance', complianceRoutes);

// Auth Routes
router.use('/auth', authRoutes);

// Admin Routes
router.use('/admin', adminRoutes);

// Vendor Routes
router.use('/vendor', vendorRoutes);

// Customer Routes
router.use('/customer', customerRoutes);

// Auditor Routes Alias
router.get('/auditor/audits/:id/download-excel', complianceController.downloadAuditExcelById);
router.post('/auditor/download-excel', complianceController.downloadExcel);

module.exports = router;
