const { getDb } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const checklistService = require('../services/checklistService');

// Checklist Management
exports.getChecklists = async (req, res) => {
  try {
    const all = checklistService.getAllChecklists();
    res.status(200).json({ success: true, data: all });
  } catch (error) {
    console.error('getChecklists error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.addChecklistItem = async (req, res) => {
  try {
    const { vendorType, item } = req.body;
    if (!vendorType || !item) {
      return res.status(400).json({ success: false, error: 'Missing vendorType or item data' });
    }
    const addedItem = checklistService.addChecklistItem(vendorType, item);
    if (!addedItem) {
      return res.status(400).json({ success: false, error: 'Invalid vendorType' });
    }
    res.status(201).json({ success: true, data: addedItem });
  } catch (error) {
    console.error('addChecklistItem error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const success = checklistService.updateChecklistItem(id, updates);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Checklist item not found' });
    }
    res.status(200).json({ success: true, message: 'Checklist item updated' });
  } catch (error) {
    console.error('updateChecklistItem error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const db = getDb();
    
    const usersRef = db.collection('users');
    // Fetch all users to count
    const usersSnapshot = await usersRef.get();
    let totalCustomers = 0;
    let totalVendors = 0;
    let totalAuditors = 0;

    usersSnapshot.forEach(doc => {
      const role = (doc.data().role || '').toLowerCase();
      if (role === 'customer') totalCustomers++;
      if (role === 'vendor') totalVendors++;
      if (role === 'auditor') totalAuditors++;
    });

    const auditsRef = db.collection('audits');
    const auditsSnapshot = await auditsRef.get();
    let totalAudits = 0;
    let activeAudits = 0;
    let completedAudits = 0;
    let pendingReviews = 0;
    const recentAudits = [];

    auditsSnapshot.forEach(doc => {
      totalAudits++;
      const data = doc.data();
      const status = (data.status || '').toLowerCase();
      if (status === 'in progress' || status === 'scheduled') activeAudits++;
      if (status === 'completed' || status === 'closed' || status === 'approved') completedAudits++;
      if (status === 'pending sign-off') pendingReviews++;

      recentAudits.push({
        id: doc.id,
        auditIdString: data.auditIdString || data.id || doc.id,
        vendorId: data.vendorId || data.vendor || 'N/A',
        customerId: data.customerId || data.customer || 'N/A',
        auditorId: data.auditorId || data.auditor || 'N/A',
        status: data.status || 'Scheduled',
        auditPeriod: data.auditPeriod || 'Q3 2026',
        score: data.score !== undefined ? data.score : null,
        dueDate: data.dueDate || new Date().toISOString()
      });
    });

    res.status(200).json({
      success: true,
      stats: {
        totalCustomers,
        totalVendors,
        totalAuditors,
        totalAudits,
        activeAudits,
        completedAudits,
        pendingReviews,
        recentAudits: recentAudits.reverse().slice(0, 10)
      }
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getUsersByRole = async (req, res) => {
  try {
    const db = getDb();
    const { role } = req.query;
    
    if (!role) {
      return res.status(400).json({ success: false, error: 'Role query parameter is required' });
    }

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('role', '==', role.toLowerCase()).get();

    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Remove password before sending
      delete data.password;
      users.push({ id: doc.id, ...data });
    });

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('getUsersByRole error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const db = getDb();
    const { email, password, role, ...otherDetails } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Email, password, and role are required' });
    }

    // Check if user exists
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase()).get();

    if (!snapshot.empty) {
      return res.status(400).json({ success: false, error: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role.toLowerCase(),
      ...otherDetails,
      createdAt: new Date().toISOString()
    };

    const docRef = await usersRef.add(newUser);
    delete newUser.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: { id: docRef.id, ...newUser }
    });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAudits = async (req, res) => {
  try {
    const db = getDb();
    const auditsRef = db.collection('audits');
    const snapshot = await auditsRef.orderBy('createdAt', 'desc').get();
    const excelReportService = require('../services/excelReportService');
    const audits = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const completionPercentage = excelReportService.getAuditCompletionPercentage(data);
      audits.push({ id: doc.id, ...data, completionPercentage });
    });
    res.status(200).json({ success: true, audits });
  } catch (error) {
    console.error('getAudits error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.createAudit = async (req, res) => {
  try {
    const db = getDb();
    const { customerId, vendorId, auditorId, auditPeriod, startDate, dueDate, establishmentType, ...otherInfo } = req.body;

    if (!customerId || !vendorId || !auditorId || !auditPeriod || !startDate || !dueDate) {
      return res.status(400).json({ success: false, error: 'Missing required audit fields' });
    }

    if (new Date(dueDate) < new Date(startDate)) {
      return res.status(400).json({ success: false, error: 'Due date cannot be before start date' });
    }

    // Check for duplicates
    const auditsRef = db.collection('audits');
    const dupSnapshot = await auditsRef
      .where('vendorId', '==', vendorId)
      .where('auditPeriod', '==', auditPeriod)
      .get();
    
    if (!dupSnapshot.empty) {
      return res.status(400).json({ success: false, error: 'An audit for this vendor in this period already exists' });
    }

    // Generate AUD-2026-XXXX ID
    const countSnapshot = await auditsRef.get();
    const count = countSnapshot.size + 1;
    const year = new Date().getFullYear();
    const auditIdString = `AUD-${year}-${String(count).padStart(4, '0')}`;

    // Fetch user names for denormalization
    let customerName = 'N/A';
    let vendorName = 'N/A';
    let auditorName = 'N/A';

    try {
      const [custDoc, venDoc, audDoc] = await Promise.all([
        db.collection('users').doc(customerId).get(),
        db.collection('users').doc(vendorId).get(),
        db.collection('users').doc(auditorId).get()
      ]);
      if (custDoc.exists) customerName = custDoc.data().name || custDoc.data().organisation || custDoc.data().companyName || 'Customer';
      if (venDoc.exists) vendorName = venDoc.data().name || venDoc.data().companyName || 'Vendor';
      if (audDoc.exists) auditorName = audDoc.data().name || 'Auditor';
    } catch (e) {
      console.warn('Error fetching names for new audit:', e.message);
    }

    const newAudit = {
      auditIdString,
      customerId,
      customerName,
      organisation: customerName,
      vendorId,
      vendorName,
      auditorId,
      auditorName,
      auditor: auditorName,
      auditPeriod,
      startDate,
      dueDate,
      establishmentType: establishmentType || '',
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
      score: null,
      ...otherInfo
    };

    const docRef = await auditsRef.add(newAudit);
    res.status(201).json({ success: true, message: 'Audit created successfully', audit: { id: docRef.id, ...newAudit } });
  } catch (error) {
    console.error('createAudit error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const db = getDb();
    const auditsRef = db.collection('audits');
    const snapshot = await auditsRef.get();
    
    let totalAudits = 0;
    let scheduled = 0;
    let inProgress = 0;
    let submitted = 0;
    let pendingSignOff = 0;
    let approved = 0;
    let closed = 0;
    
    let totalScoreSum = 0;
    let completedCount = 0;
    
    // Vendor scores: vendorId -> { currentScore, previousScore, name }
    // We'll just collect them and try to find latest and previous if possible based on dates
    const vendorMap = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      totalAudits++;
      
      const status = (data.status || '').toLowerCase();
      if (status === 'scheduled') scheduled++;
      else if (status === 'in progress') inProgress++;
      else if (status === 'submitted') submitted++;
      else if (status === 'pending sign-off') pendingSignOff++;
      else if (status === 'approved') approved++;
      else if (status === 'closed' || status === 'completed') closed++;
      
      if (data.score !== null && data.score !== undefined) {
        completedCount++;
        totalScoreSum += Number(data.score);
        
        if (!vendorMap[data.vendorId]) {
          vendorMap[data.vendorId] = [];
        }
        vendorMap[data.vendorId].push({
          score: Number(data.score),
          createdAt: new Date(data.createdAt || data.startDate).getTime(),
          period: data.auditPeriod
        });
      }
    });

    const overallScore = completedCount > 0 ? Math.round(totalScoreSum / completedCount) : null;
    
    // Process vendor map to find current and previous
    const vendorPerformance = [];
    let prevOverallSum = 0;
    let prevOverallCount = 0;
    
    for (const [vendorId, audits] of Object.entries(vendorMap)) {
      audits.sort((a, b) => b.createdAt - a.createdAt); // newest first
      const current = audits[0];
      const previous = audits.length > 1 ? audits[1] : null;
      
      let change = null;
      let status = 'New';
      if (previous) {
        change = current.score - previous.score;
        status = change > 0 ? 'Improved' : change < 0 ? 'Declined' : 'No Change';
        prevOverallSum += previous.score;
        prevOverallCount++;
      }
      
      vendorPerformance.push({
        vendorId,
        currentScore: current.score,
        previousScore: previous ? previous.score : null,
        change,
        status,
        currentPeriod: current.period,
        previousPeriod: previous ? previous.period : null
      });
    }
    
    const previousOverall = prevOverallCount > 0 ? Math.round(prevOverallSum / prevOverallCount) : null;
    const overallChange = previousOverall !== null && overallScore !== null ? overallScore - previousOverall : null;

    res.status(200).json({
      success: true,
      analytics: {
        auditStatus: { totalAudits, scheduled, inProgress, submitted, pendingSignOff, approved, closed },
        compliance: {
          overallScore,
          previousOverall,
          overallChange,
          vendorPerformance
        }
      }
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAuditById = async (req, res) => {
  try {
    const db = getDb();
    const docRef = await db.collection('audits').doc(req.params.id).get();
    if (!docRef.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }
    res.status(200).json({ success: true, audit: { id: docRef.id, ...docRef.data() } });
  } catch (error) {
    console.error('getAuditById error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateAuditStatus = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const auditRef = db.collection('audits').doc(id);
    const doc = await auditRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const data = doc.data();
    const timeline = data.timeline || [];

    timeline.push({
      event: `Audit Status Changed to ${status}`,
      status: status,
      timestamp: new Date().toISOString(),
      actor: req.user?.name || 'Admin',
      notes: notes || `Audit marked as ${status} by admin/reviewer`
    });

    await auditRef.update({
      status,
      timeline,
      updatedAt: new Date().toISOString(),
      ...(status.toLowerCase() === 'closed' || status.toLowerCase() === 'approved' ? { closedAt: new Date().toISOString() } : {})
    });

    res.status(200).json({ success: true, message: `Audit status updated to ${status}` });
  } catch (error) {
    console.error('updateAuditStatus error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.deleteAudit = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Audit ID is required' });
    }

    // Role verification: strictly require 'admin' role
    const userRole = (req.user?.role || '').toLowerCase();
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required to delete audits' });
    }

    // 1. Locate audit doc in 'audits' or 'compliance_audits'
    const auditsRef = db.collection('audits');
    const auditDocRef = auditsRef.doc(id);
    const auditSnap = await auditDocRef.get();

    let legacyDocRef = null;
    let legacySnap = null;
    const compAuditsRef = db.collection('compliance_audits');
    const compSnap = await compAuditsRef.doc(id).get();
    if (compSnap.exists) {
      legacyDocRef = compAuditsRef.doc(id);
      legacySnap = compSnap;
    }

    if (!auditSnap.exists && !legacySnap) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const auditData = auditSnap.exists ? auditSnap.data() : (legacySnap ? legacySnap.data() : {});
    const auditIdString = auditData.auditIdString || id;

    // 2. Collect related Firestore documents & S3 keys
    const s3Service = require('../services/s3Service');
    const s3Keys = new Set();

    // S3 prefix deletion for this audit
    await s3Service.deleteObjectsByPrefix(`audits/${id}/`);
    if (auditIdString && auditIdString !== id) {
      await s3Service.deleteObjectsByPrefix(`audits/${auditIdString}/`);
    }

    // Documents collection cleanup
    const docsBatch = db.batch();
    let docsToDeleteCount = 0;

    const docsByDocId = await db.collection('documents').where('auditId', '==', id).get();
    docsByDocId.forEach(d => {
      if (d.data().s3Key) s3Keys.add(d.data().s3Key);
      docsBatch.delete(d.ref);
      docsToDeleteCount++;
    });

    if (auditIdString && auditIdString !== id) {
      const docsByStringId = await db.collection('documents').where('auditId', '==', auditIdString).get();
      docsByStringId.forEach(d => {
        if (d.data().s3Key) s3Keys.add(d.data().s3Key);
        docsBatch.delete(d.ref);
        docsToDeleteCount++;
      });
    }

    // Reports collection cleanup
    const reportsByDocId = await db.collection('reports').where('auditId', '==', id).get();
    reportsByDocId.forEach(r => {
      if (r.data().s3Key) s3Keys.add(r.data().s3Key);
      docsBatch.delete(r.ref);
      docsToDeleteCount++;
    });

    if (auditIdString && auditIdString !== id) {
      const reportsByStringId = await db.collection('reports').where('auditId', '==', auditIdString).get();
      reportsByStringId.forEach(r => {
        if (r.data().s3Key) s3Keys.add(r.data().s3Key);
        docsBatch.delete(r.ref);
        docsToDeleteCount++;
      });
    }

    // Delete collected S3 keys
    for (const key of s3Keys) {
      await s3Service.deleteFromS3(key);
    }

    // Commit child document deletions in Firestore
    if (docsToDeleteCount > 0) {
      await docsBatch.commit();
    }

    // 3. Delete main audit document and legacy compliance audit document
    if (auditSnap.exists) {
      await auditDocRef.delete();
    }
    if (legacyDocRef) {
      await legacyDocRef.delete();
    }

    return res.status(200).json({
      success: true,
      message: 'Audit deleted successfully'
    });
  } catch (error) {
    console.error('deleteAudit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete audit. Internal server error.' });
  }
};

exports.downloadAuditExcel = async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.auditId || req.params.id;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Audit ID is required' });
    }

    let docSnap = await db.collection('audits').doc(id).get();
    if (!docSnap.exists) {
      docSnap = await db.collection('compliance_audits').doc(id).get();
    }

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const audit = { id: docSnap.id, ...docSnap.data() };

    // Independent 100% completion validation
    const excelReportService = require('../services/excelReportService');
    const completionPct = excelReportService.getAuditCompletionPercentage(audit);

    if (completionPct < 100) {
      return res.status(400).json({
        success: false,
        error: 'Excel download is available only after the audit is 100% complete.'
      });
    }

    // Fetch related documents if present
    const docsSnap = await db.collection('documents').where('auditId', '==', id).get();
    const relatedDocs = [];
    docsSnap.forEach(d => relatedDocs.push({ id: d.id, ...d.data() }));

    const buffer = excelReportService.generateAuditExcelBuffer(audit, relatedDocs);

    const safeAuditId = (audit.auditIdString || audit.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safePeriod = (audit.auditPeriod || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeAuditId}_${safePeriod}_Complete-Audit.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('downloadAuditExcel Admin error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error generating Excel workbook' });
  }
};


