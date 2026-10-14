const { getDb } = require('../config/firebase');
const excelReportService = require('../services/excelReportService');
const pptReportService = require('../services/pptReportService');

/**
 * Get Customer Dashboard Statistics & Data
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase();

    // 1. Fetch customer user document for name/organisation lookup
    let customerName = req.user.name || 'Customer';
    try {
      const custDoc = await db.collection('users').doc(customerId).get();
      if (custDoc.exists) {
        const d = custDoc.data();
        customerName = d.name || d.organisation || d.companyName || d.fullName || customerName;
      }
    } catch (e) {
      console.warn('Customer doc lookup warn:', e.message);
    }

    // 2. Fetch all vendors for this customer
    const usersRef = db.collection('users');
    const vendorsSnapshot = await usersRef.where('role', '==', 'vendor').get();
    const vendorMap = new Map();

    vendorsSnapshot.forEach(doc => {
      const v = doc.data();
      const isMyVendor = (
        v.customerId === customerId ||
        (v.customerName && v.customerName.toLowerCase() === customerName.toLowerCase()) ||
        (v.customerEmail && v.customerEmail.toLowerCase() === userEmail)
      );
      if (isMyVendor) {
        vendorMap.set(doc.id, { id: doc.id, ...v });
      }
    });

    // 3. Fetch audits belonging to this customer
    const auditsRef = db.collection('audits');
    const auditsSnapshot = await auditsRef.get();

    const customerAudits = [];
    const recentMilestones = [];
    let activeAuditsCount = 0;
    let completedAuditsCount = 0;
    let pendingActionsCount = 0;
    let totalScoresSum = 0;
    let completedWithScoreCount = 0;

    auditsSnapshot.forEach(doc => {
      const data = doc.data();
      const matchCust = (
        data.customerId === customerId ||
        data.customer === customerId ||
        (data.customerEmail && data.customerEmail.toLowerCase() === userEmail) ||
        (data.customerName && data.customerName.toLowerCase().includes(customerName.toLowerCase())) ||
        (data.vendorId && vendorMap.has(data.vendorId))
      );

      // If explicit match or system demo audits exist
      if (matchCust || auditsSnapshot.size > 0) {
        const completionPercentage = excelReportService.getAuditCompletionPercentage(data);
        const status = (data.status || 'Scheduled').toLowerCase();

        const isCompleted = ['completed', 'closed', 'approved'].includes(status);
        const isActive = ['scheduled', 'in progress', 'pending sign-off', 'released', 'under review'].includes(status);

        if (isActive) activeAuditsCount++;
        if (isCompleted) {
          completedAuditsCount++;
          if (data.score !== undefined && data.score !== null) {
            totalScoresSum += Number(data.score);
            completedWithScoreCount++;
          }
        }
        if (status === 'pending sign-off' || status === 'under review') {
          pendingActionsCount++;
        }

        const vId = data.vendorId || data.vendor || doc.id;
        if (!vendorMap.has(vId) && data.vendorName) {
          vendorMap.set(vId, {
            id: vId,
            companyName: data.vendorName || data.organisation || 'Vendor',
            contactPerson: data.vendorRepresentative || 'N/A',
            email: data.vendorEmail || 'N/A'
          });
        }

        const auditItem = {
          id: doc.id,
          auditIdString: data.auditIdString || data.id || doc.id,
          vendorName: data.vendorName || data.organisation || 'Vendor',
          vendorId: data.vendorId || 'N/A',
          auditPeriod: data.auditPeriod || 'Q3 2026',
          status: data.status || 'Scheduled',
          completionPercentage,
          score: data.score !== undefined ? data.score : null,
          criticalFindingsCount: (data.nonCompliantItems || []).filter(i => i && i.isCritical).length,
          auditorName: data.auditorName || data.auditor || 'Auditor',
          startDate: data.startDate || data.createdAt,
          dueDate: data.dueDate || new Date().toISOString()
        };

        customerAudits.push(auditItem);

        // Collect Milestones
        if (Array.isArray(data.timeline)) {
          data.timeline.forEach(t => {
            recentMilestones.push({
              vendorName: auditItem.vendorName,
              auditIdString: auditItem.auditIdString,
              event: t.event || 'Audit Activity',
              status: t.status || auditItem.status,
              timestamp: t.timestamp || new Date().toISOString(),
              actor: t.actor || 'System',
              notes: t.notes || ''
            });
          });
        }
      }
    });

    const overallCompliance = completedWithScoreCount > 0
      ? Math.round(totalScoresSum / completedWithScoreCount)
      : null;

    recentMilestones.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      stats: {
        totalVendors: vendorMap.size,
        activeAudits: activeAuditsCount,
        completedAudits: completedAuditsCount,
        pendingActions: pendingActionsCount,
        overallCompliance,
        completedCount: completedWithScoreCount,
        vendorStatuses: customerAudits,
        recentMilestones: recentMilestones.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('getCustomerDashboardStats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get Customer Vendors (with audit metadata)
 */
exports.getVendors = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase();

    let customerName = req.user.name || 'Customer';
    try {
      const custDoc = await db.collection('users').doc(customerId).get();
      if (custDoc.exists) {
        const d = custDoc.data();
        customerName = d.name || d.organisation || d.companyName || d.fullName || customerName;
      }
    } catch (e) {
      console.warn('Customer doc lookup warn:', e.message);
    }

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('role', '==', 'vendor').get();

    const rawVendors = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      delete data.password;
      const isMyVendor = (
        data.customerId === customerId ||
        (data.customerName && data.customerName.toLowerCase() === customerName.toLowerCase()) ||
        (data.customerEmail && data.customerEmail.toLowerCase() === userEmail) ||
        !data.customerId
      );
      if (isMyVendor) {
        rawVendors.push({ id: doc.id, ...data });
      }
    });

    // Fetch all audits to map audits to vendors
    const auditsSnapshot = await db.collection('audits').get();
    const auditsByVendor = new Map();

    auditsSnapshot.forEach(doc => {
      const data = doc.data();
      const completionPercentage = excelReportService.getAuditCompletionPercentage(data);
      const auditObj = {
        id: doc.id,
        auditIdString: data.auditIdString || data.id || doc.id,
        ...data,
        completionPercentage
      };

      const keys = [
        data.vendorId,
        data.vendor,
        (data.vendorName || '').toLowerCase(),
        (data.organisation || '').toLowerCase()
      ].filter(Boolean);

      keys.forEach(k => {
        if (!auditsByVendor.has(k)) auditsByVendor.set(k, []);
        if (!auditsByVendor.get(k).some(a => a.id === doc.id)) {
          auditsByVendor.get(k).push(auditObj);
        }
      });
    });

    const vendors = rawVendors.map(v => {
      const vCompName = (v.companyName || v.name || '').toLowerCase();
      const vAudits = (auditsByVendor.get(v.id) || [])
        .concat(vCompName ? (auditsByVendor.get(vCompName) || []) : []);
      
      const uniqueAudits = Array.from(new Map(vAudits.map(a => [a.id, a])).values());
      uniqueAudits.sort((a, b) => new Date(b.createdAt || b.startDate || 0).getTime() - new Date(a.createdAt || a.startDate || 0).getTime());
      
      const activeAudit = uniqueAudits.find(a => ['scheduled', 'in progress', 'pending sign-off', 'under review'].includes((a.status || '').toLowerCase()));
      const lastCompletedAudit = uniqueAudits.find(a => ['closed', 'completed', 'approved'].includes((a.status || '').toLowerCase()));
      const currentAudit = activeAudit || uniqueAudits[0] || null;

      return {
        ...v,
        currentAudit: currentAudit ? {
          id: currentAudit.id,
          auditIdString: currentAudit.auditIdString,
          auditPeriod: currentAudit.auditPeriod || 'N/A',
          status: currentAudit.status || 'Scheduled',
          completionPercentage: currentAudit.completionPercentage,
          score: currentAudit.score !== undefined ? currentAudit.score : null
        } : null,
        lastAudit: lastCompletedAudit ? {
          id: lastCompletedAudit.id,
          auditIdString: lastCompletedAudit.auditIdString,
          auditPeriod: lastCompletedAudit.auditPeriod,
          score: lastCompletedAudit.score
        } : null,
        auditsCount: uniqueAudits.length
      };
    });

    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    console.error('getCustomerVendors error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get Customer Vendor Details by ID
 */
exports.getVendorById = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user.id;
    const { vendorId } = req.params;

    let userDoc = await db.collection('users').doc(vendorId).get();
    let vendorData = userDoc.exists ? userDoc.data() : null;

    if (!vendorData) {
      const usersSnap = await db.collection('users').where('role', '==', 'vendor').get();
      usersSnap.forEach(d => {
        if (d.id === vendorId || (d.data().companyName && d.data().companyName.toLowerCase() === vendorId.toLowerCase())) {
          userDoc = d;
          vendorData = d.data();
        }
      });
    }

    if (!vendorData) {
      return res.status(404).json({ success: false, error: 'Vendor record not found' });
    }

    delete vendorData.password;
    const vCompName = (vendorData.companyName || vendorData.name || '').toLowerCase();

    // Fetch all audits matching vendor ID or vendor name
    const auditsSnapshot = await db.collection('audits').get();
    const vendorAudits = [];

    auditsSnapshot.forEach(doc => {
      const data = doc.data();
      const matchVendor = (
        data.vendorId === userDoc.id ||
        data.vendorId === vendorId ||
        doc.id === vendorId ||
        data.vendor === vendorId ||
        (data.vendorName && data.vendorName.toLowerCase() === vCompName) ||
        (data.organisation && data.organisation.toLowerCase() === vCompName)
      );
      if (matchVendor) {
        const completionPercentage = excelReportService.getAuditCompletionPercentage(data);
        vendorAudits.push({
          id: doc.id,
          auditIdString: data.auditIdString || data.id || doc.id,
          ...data,
          completionPercentage
        });
      }
    });

    vendorAudits.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const activeAudit = vendorAudits.find(a => ['scheduled', 'in progress', 'pending sign-off', 'under review'].includes((a.status || '').toLowerCase()));
    const currentAudit = activeAudit || vendorAudits[0] || null;

    // Calculate findings summary from current audit (or latest audit)
    let totalFindings = 0;
    let criticalFindings = 0;
    let generalFindings = 0;
    let openFindings = 0;
    let resolvedFindings = 0;

    if (currentAudit && Array.isArray(currentAudit.nonCompliantItems)) {
      totalFindings = currentAudit.nonCompliantItems.length;
      currentAudit.nonCompliantItems.forEach(item => {
        if (item) {
          if (item.isCritical) criticalFindings++;
          else generalFindings++;

          if (item.status === 'Resolved' || item.vendorResponse) resolvedFindings++;
          else openFindings++;
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        vendor: { id: userDoc.id, ...vendorData },
        currentAudit,
        findingsSummary: {
          totalFindings,
          criticalFindings,
          generalFindings,
          openFindings,
          resolvedFindings
        },
        auditHistory: vendorAudits
      }
    });
  } catch (error) {
    console.error('getVendorById error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get Customer Audits
 */
exports.getAudits = async (req, res) => {
  try {
    const db = getDb();
    const auditsRef = db.collection('audits');
    const snapshot = await auditsRef.orderBy('createdAt', 'desc').get();
    const customerAudits = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const completionPercentage = excelReportService.getAuditCompletionPercentage(data);
      customerAudits.push({
        id: doc.id,
        auditIdString: data.auditIdString || data.id || doc.id,
        ...data,
        completionPercentage
      });
    });

    res.status(200).json({ success: true, data: customerAudits });
  } catch (error) {
    console.error('getCustomerAudits error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get Customer Audit by ID (Read-Only)
 */
exports.getAuditById = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const doc = await db.collection('audits').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Audit record not found' });
    }

    const data = doc.data();
    const completionPercentage = excelReportService.getAuditCompletionPercentage(data);

    res.status(200).json({
      success: true,
      data: {
        id: doc.id,
        auditIdString: data.auditIdString || data.id || doc.id,
        ...data,
        completionPercentage,
        isReadOnly: true
      }
    });
  } catch (error) {
    console.error('getCustomerAuditById error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get Customer Timeline & Milestone Data
 */
exports.getTimeline = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase();

    let customerName = req.user.name || 'Customer';
    try {
      const custDoc = await db.collection('users').doc(customerId).get();
      if (custDoc.exists) {
        const d = custDoc.data();
        customerName = d.name || d.organisation || d.companyName || d.fullName || customerName;
      }
    } catch (e) {}

    const usersRef = db.collection('users');
    const vendorsSnapshot = await usersRef.where('role', '==', 'vendor').get();
    const vendorMap = new Map();

    vendorsSnapshot.forEach(doc => {
      const v = doc.data();
      const isMyVendor = (
        v.customerId === customerId ||
        (v.customerName && v.customerName.toLowerCase() === customerName.toLowerCase()) ||
        (v.customerEmail && v.customerEmail.toLowerCase() === userEmail) ||
        !v.customerId
      );
      if (isMyVendor) {
        vendorMap.set(doc.id, { id: doc.id, ...v });
      }
    });

    const auditsSnapshot = await db.collection('audits').get();
    const audits = [];
    const allEvents = [];

    auditsSnapshot.forEach(doc => {
      const data = doc.data();
      const matchCust = (
        data.customerId === customerId ||
        data.customer === customerId ||
        (data.customerEmail && data.customerEmail.toLowerCase() === userEmail) ||
        (data.customerName && data.customerName.toLowerCase().includes(customerName.toLowerCase())) ||
        (data.vendorId && vendorMap.has(data.vendorId)) ||
        true
      );

      if (matchCust) {
        const completionPercentage = excelReportService.getAuditCompletionPercentage(data);
        const auditObj = {
          id: doc.id,
          auditIdString: data.auditIdString || data.id || doc.id,
          vendorName: data.vendorName || data.organisation || 'Vendor',
          vendorId: data.vendorId || 'N/A',
          auditPeriod: data.auditPeriod || 'Q3 2026',
          establishmentType: data.establishmentType || 'Standard Audit',
          status: data.status || 'Scheduled',
          completionPercentage,
          score: data.score !== undefined && data.score !== null ? Number(data.score) : null,
          auditorName: data.auditorName || data.auditor || 'Auditor',
          startDate: data.startDate || data.createdAt,
          dueDate: data.dueDate || new Date().toISOString(),
          createdAt: data.createdAt || new Date().toISOString(),
          timeline: Array.isArray(data.timeline) ? data.timeline : []
        };

        audits.push(auditObj);

        if (Array.isArray(data.timeline)) {
          data.timeline.forEach(t => {
            allEvents.push({
              auditId: doc.id,
              auditIdString: auditObj.auditIdString,
              vendorName: auditObj.vendorName,
              event: t.event || 'Audit Activity',
              status: t.status || auditObj.status,
              timestamp: t.timestamp || new Date().toISOString(),
              actor: t.actor || 'System',
              notes: t.notes || ''
            });
          });
        }
      }
    });

    audits.sort((a, b) => new Date(b.createdAt || b.startDate || 0).getTime() - new Date(a.createdAt || a.startDate || 0).getTime());
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      data: {
        audits,
        recentEvents: allEvents
      }
    });
  } catch (error) {
    console.error('getCustomerTimeline error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get Customer Compliance Scores & Performance Analytics
 */
exports.getComplianceScores = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase();

    let customerName = req.user.name || 'Customer';
    try {
      const custDoc = await db.collection('users').doc(customerId).get();
      if (custDoc.exists) {
        const d = custDoc.data();
        customerName = d.name || d.organisation || d.companyName || d.fullName || customerName;
      }
    } catch (e) {}

    const usersRef = db.collection('users');
    const vendorsSnapshot = await usersRef.where('role', '==', 'vendor').get();
    const vendorMap = new Map();

    vendorsSnapshot.forEach(doc => {
      const v = doc.data();
      const isMyVendor = (
        v.customerId === customerId ||
        (v.customerName && v.customerName.toLowerCase() === customerName.toLowerCase()) ||
        (v.customerEmail && v.customerEmail.toLowerCase() === userEmail) ||
        !v.customerId
      );
      if (isMyVendor) {
        vendorMap.set(doc.id, { id: doc.id, ...v });
      }
    });

    const auditsSnapshot = await db.collection('audits').get();
    const audits = [];
    const vendorsDataMap = new Map();

    let totalScoreSum = 0;
    let completedWithScoreCount = 0;

    let totalFindings = 0;
    let criticalFindings = 0;
    let generalFindings = 0;
    let openFindings = 0;
    let resolvedFindings = 0;

    const labourCodeScoreMap = new Map();

    auditsSnapshot.forEach(doc => {
      const data = doc.data();
      const completionPercentage = excelReportService.getAuditCompletionPercentage(data);
      const status = (data.status || 'Scheduled').toLowerCase();
      const isCompleted = ['closed', 'completed', 'approved'].includes(status);

      const auditObj = {
        id: doc.id,
        auditIdString: data.auditIdString || data.id || doc.id,
        vendorName: data.vendorName || data.organisation || 'Vendor',
        vendorId: data.vendorId || 'N/A',
        auditPeriod: data.auditPeriod || 'Q3 2026',
        establishmentType: data.establishmentType || 'Standard Audit',
        status: data.status || 'Scheduled',
        completionPercentage,
        score: data.score !== undefined && data.score !== null ? Number(data.score) : null,
        categoryScores: Array.isArray(data.categoryScores) ? data.categoryScores : [],
        summary: data.summary || {},
        nonCompliantItems: Array.isArray(data.nonCompliantItems) ? data.nonCompliantItems : [],
        createdAt: data.createdAt || new Date().toISOString()
      };

      audits.push(auditObj);

      if (isCompleted && auditObj.score !== null) {
        totalScoreSum += auditObj.score;
        completedWithScoreCount++;
      }

      // Group audits by vendor
      const vKey = auditObj.vendorId !== 'N/A' ? auditObj.vendorId : auditObj.vendorName.toLowerCase();
      if (!vendorsDataMap.has(vKey)) {
        vendorsDataMap.set(vKey, { vendorName: auditObj.vendorName, audits: [] });
      }
      vendorsDataMap.get(vKey).audits.push(auditObj);

      // Collect findings metrics
      if (Array.isArray(data.nonCompliantItems)) {
        totalFindings += data.nonCompliantItems.length;
        data.nonCompliantItems.forEach(item => {
          if (item) {
            if (item.isCritical) criticalFindings++;
            else generalFindings++;

            if (item.status === 'Resolved' || item.vendorResponse) resolvedFindings++;
            else openFindings++;
          }
        });
      }

      // Collect Category / Labour Code Scores
      if (Array.isArray(data.categoryScores)) {
        data.categoryScores.forEach(cs => {
          if (cs && cs.category) {
            if (!labourCodeScoreMap.has(cs.category)) {
              labourCodeScoreMap.set(cs.category, { category: cs.category, scores: [] });
            }
            const catObj = labourCodeScoreMap.get(cs.category);
            if (cs.score !== undefined && cs.score !== null) {
              catObj.scores.push(Number(cs.score));
            }
          }
        });
      }
    });

    const avgScore = completedWithScoreCount > 0 ? Math.round(totalScoreSum / completedWithScoreCount) : null;

    // Calculate Vendor Performance & History Comparison
    const vendorPerformance = [];
    vendorsDataMap.forEach((val) => {
      const vAudits = val.audits;
      vAudits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const latestWithScore = vAudits.find(a => a.score !== null);
      const previousWithScore = vAudits.filter(a => a.score !== null)[1] || null;

      const currentScore = latestWithScore ? Math.round(latestWithScore.score) : null;
      const previousScore = previousWithScore ? Math.round(previousWithScore.score) : null;
      const change = currentScore !== null && previousScore !== null ? currentScore - previousScore : null;

      vendorPerformance.push({
        vendorName: val.vendorName,
        currentScore,
        previousScore,
        change,
        history: vAudits.map(a => ({ auditPeriod: a.auditPeriod, score: a.score, status: a.status, completionPercentage: a.completionPercentage }))
      });
    });

    // Format Labour Code scores
    const labourCodeScores = [];
    labourCodeScoreMap.forEach((val, key) => {
      const avg = val.scores.length > 0 ? Math.round(val.scores.reduce((a, b) => a + b, 0) / val.scores.length) : null;
      labourCodeScores.push({
        category: key,
        score: avg
      });
    });

    res.status(200).json({
      success: true,
      data: {
        overallCompliance: avgScore,
        completedAuditsCount: completedWithScoreCount,
        findingsSummary: {
          totalFindings,
          criticalFindings,
          generalFindings,
          openFindings,
          resolvedFindings
        },
        vendorPerformance,
        labourCodeScores,
        audits
      }
    });
  } catch (error) {
    console.error('getComplianceScores error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get Customer Reports List & Summary
 */
exports.getReports = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase();

    let customerName = req.user.name || 'Customer';
    try {
      const custDoc = await db.collection('users').doc(customerId).get();
      if (custDoc.exists) {
        const d = custDoc.data();
        customerName = d.name || d.organisation || d.companyName || d.fullName || customerName;
      }
    } catch (e) {}

    const usersRef = db.collection('users');
    const vendorsSnapshot = await usersRef.where('role', '==', 'vendor').get();
    const vendorMap = new Map();

    vendorsSnapshot.forEach(doc => {
      const v = doc.data();
      const isMyVendor = (
        v.customerId === customerId ||
        (v.customerName && v.customerName.toLowerCase() === customerName.toLowerCase()) ||
        (v.customerEmail && v.customerEmail.toLowerCase() === userEmail) ||
        !v.customerId
      );
      if (isMyVendor) {
        vendorMap.set(doc.id, { id: doc.id, ...v });
      }
    });

    const auditsSnapshot = await db.collection('audits').get();
    const reports = [];

    let totalReports = 0;
    let completedAudits = 0;
    let availableReports = 0;
    let pendingReports = 0;

    auditsSnapshot.forEach(doc => {
      const data = doc.data();
      const matchCust = (
        data.customerId === customerId ||
        data.customer === customerId ||
        (data.customerEmail && data.customerEmail.toLowerCase() === userEmail) ||
        (data.customerName && data.customerName.toLowerCase().includes(customerName.toLowerCase())) ||
        (data.vendorId && vendorMap.has(data.vendorId)) ||
        true
      );

      if (matchCust) {
        totalReports++;
        const completionPercentage = excelReportService.getAuditCompletionPercentage(data);
        const status = (data.status || 'Scheduled').toLowerCase();
        const isClosedOrCompleted = ['closed', 'completed', 'approved'].includes(status) || completionPercentage === 100;

        if (isClosedOrCompleted) {
          completedAudits++;
          availableReports++;
        } else {
          pendingReports++;
        }

        // Compute Critical vs General counts from nonCompliantItems
        let criticalCount = 0;
        let generalCount = 0;
        if (Array.isArray(data.nonCompliantItems)) {
          data.nonCompliantItems.forEach(item => {
            if (item) {
              if (item.isCritical) criticalCount++;
              else generalCount++;
            }
          });
        }

        reports.push({
          id: doc.id,
          auditIdString: data.auditIdString || data.id || doc.id,
          reportTitle: `${data.auditPeriod || 'Q3 2026'} Audit Compliance Report`,
          vendorName: data.vendorName || data.organisation || 'Vendor',
          vendorId: data.vendorId || 'N/A',
          auditPeriod: data.auditPeriod || 'Q3 2026',
          establishmentType: data.establishmentType || 'Standard Audit',
          status: data.status || 'Scheduled',
          completionPercentage,
          score: data.score !== undefined && data.score !== null ? Number(data.score) : null,
          categoryScores: Array.isArray(data.categoryScores) ? data.categoryScores : [],
          summary: data.summary || {},
          nonCompliantItems: Array.isArray(data.nonCompliantItems) ? data.nonCompliantItems : [],
          auditorName: data.auditorName || data.auditor || 'Auditor',
          reportAvailable: isClosedOrCompleted,
          reportStatus: isClosedOrCompleted ? 'Available' : 'Pending',
          generatedDate: isClosedOrCompleted ? (data.updatedAt || data.createdAt || new Date().toISOString()) : null,
          createdAt: data.createdAt || new Date().toISOString(),
          criticalCount,
          generalCount
        });
      }
    });

    reports.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.status(200).json({
      success: true,
      summary: {
        totalReports,
        completedAudits,
        availableReports,
        pendingReports
      },
      data: reports
    });
  } catch (error) {
    console.error('getCustomerReports error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get Customer Notifications List & Read State
 */
exports.getNotifications = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase();

    let readNotificationIds = [];
    try {
      const userDoc = await db.collection('users').doc(customerId).get();
      if (userDoc.exists && Array.isArray(userDoc.data().readNotificationIds)) {
        readNotificationIds = userDoc.data().readNotificationIds;
      }
    } catch (e) {
      console.warn('user lookup warn:', e.message);
    }

    const auditsSnapshot = await db.collection('audits').get();
    const notifications = [];

    auditsSnapshot.forEach(doc => {
      const data = doc.data();

      // Timeline notifications
      if (Array.isArray(data.timeline)) {
        data.timeline.forEach((t, index) => {
          const rawId = `notif_${doc.id}_${index}_${(t.event || '').replace(/[^a-zA-Z0-9]/g, '_')}`;
          const isRead = readNotificationIds.includes(rawId);
          const eventLower = (t.event || '').toLowerCase();

          let type = 'info';
          let actionUrl = `/customer/audits/${doc.id}`;
          if (eventLower.includes('closed') || eventLower.includes('approved')) {
            type = 'success';
            actionUrl = '/customer/reports';
          } else if (eventLower.includes('submitted') || eventLower.includes('responded')) {
            type = 'action';
            actionUrl = '/customer/timeline';
          }

          notifications.push({
            id: rawId,
            title: t.event || 'Audit Update',
            message: `${data.vendorName || 'Vendor'} audit (${data.auditIdString || doc.id}) - ${t.notes || t.event}`,
            vendorName: data.vendorName || 'Vendor',
            auditIdString: data.auditIdString || doc.id,
            auditId: doc.id,
            timestamp: t.timestamp || data.createdAt || new Date().toISOString(),
            type,
            read: isRead,
            actionUrl
          });
        });
      }

      // High-level audit creation notification
      const createId = `notif_created_${doc.id}`;
      const isCreateRead = readNotificationIds.includes(createId);
      notifications.push({
        id: createId,
        title: 'Audit Scheduled',
        message: `${data.auditPeriod || 'Quarterly'} statutory audit scheduled for vendor ${data.vendorName || 'Vendor'} (${data.auditIdString || doc.id}).`,
        vendorName: data.vendorName || 'Vendor',
        auditIdString: data.auditIdString || doc.id,
        auditId: doc.id,
        timestamp: data.createdAt || data.startDate || new Date().toISOString(),
        type: 'info',
        read: isCreateRead,
        actionUrl: `/customer/audits/${doc.id}`
      });
    });

    const uniqueMap = new Map();
    notifications.forEach(n => uniqueMap.set(n.id, n));
    const finalNotifs = Array.from(uniqueMap.values());
    finalNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalNotifications = finalNotifs.length;
    const unreadCount = finalNotifs.filter(n => !n.read).length;

    res.status(200).json({
      success: true,
      summary: {
        totalNotifications,
        unreadCount
      },
      data: finalNotifs
    });
  } catch (error) {
    console.error('getCustomerNotifications error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Mark a single notification as read
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Notification ID required' });
    }

    const userRef = db.collection('users').doc(customerId);
    const userDoc = await userRef.get();
    let readNotificationIds = userDoc.exists && Array.isArray(userDoc.data().readNotificationIds)
      ? userDoc.data().readNotificationIds
      : [];

    if (!readNotificationIds.includes(id)) {
      readNotificationIds.push(id);
      await userRef.set({ readNotificationIds }, { merge: true });
    }

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user.id;
    const { notificationIds } = req.body || {};

    const userRef = db.collection('users').doc(customerId);
    const userDoc = await userRef.get();
    let readNotificationIds = userDoc.exists && Array.isArray(userDoc.data().readNotificationIds)
      ? userDoc.data().readNotificationIds
      : [];

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      const setIds = new Set([...readNotificationIds, ...notificationIds]);
      readNotificationIds = Array.from(setIds);
    }

    await userRef.set({ readNotificationIds }, { merge: true });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Download Complete Audit Excel Workbook for Customer
 */
exports.downloadAuditExcel = async (req, res) => {
  try {
    const db = getDb();
    const { auditId } = req.params;
    let docSnap = await db.collection('audits').doc(auditId).get();
    if (!docSnap.exists) {
      docSnap = await db.collection('compliance_audits').doc(auditId).get();
    }
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }
    const audit = { id: docSnap.id, ...docSnap.data() };
    const completionPct = excelReportService.getAuditCompletionPercentage(audit);
    if (completionPct < 100) {
      return res.status(400).json({
        success: false,
        error: 'Excel report download is available only after the audit is 100% complete.'
      });
    }
    const docsSnap = await db.collection('documents').where('auditId', '==', auditId).get();
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
    console.error('downloadAuditExcel Customer error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error generating Excel workbook' });
  }
};

/**
 * Download Overall Audit PPT Presentation for Customer
 */
exports.downloadAuditPpt = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user ? req.user.id : null;
    const { auditId } = req.params;

    console.log(`[downloadAuditPpt] Incoming request for auditId: ${auditId}, user: ${customerId}`);

    let docSnap = await db.collection('audits').doc(auditId).get();
    if (!docSnap.exists) {
      docSnap = await db.collection('compliance_audits').doc(auditId).get();
    }
    if (!docSnap.exists) {
      const q1 = await db.collection('audits').where('auditIdString', '==', auditId).get();
      if (!q1.empty) docSnap = q1.docs[0];
    }
    if (!docSnap.exists) {
      const q2 = await db.collection('compliance_audits').where('auditIdString', '==', auditId).get();
      if (!q2.empty) docSnap = q2.docs[0];
    }
    if (!docSnap.exists) {
      const q3 = await db.collection('audits').where('id', '==', auditId).get();
      if (!q3.empty) docSnap = q3.docs[0];
    }

    if (!docSnap || !docSnap.exists) {
      console.warn(`[downloadAuditPpt] Audit not found for ID: ${auditId}`);
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const auditData = { id: docSnap.id, ...docSnap.data() };
    const completionPct = excelReportService.getAuditCompletionPercentage(auditData);
    const statusLower = (auditData.status || '').toLowerCase();

    // Check completion matching getReports logic
    const isCompleted = completionPct === 100 || 
                        ['closed', 'completed', 'approved'].includes(statusLower) || 
                        auditData.score !== undefined;

    if (!isCompleted) {
      return res.status(400).json({
        success: false,
        error: 'PPT presentation download is available only for completed or evaluated audits.'
      });
    }

    const buffer = await pptReportService.generateAuditPptBuffer(auditData);

    const safeAuditId = (auditData.auditIdString || auditData.id || 'AUD-REPORT').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeVendor = (auditData.vendorName || auditData.organisation || 'Vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safePeriod = (auditData.auditPeriod || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeAuditId}_${safeVendor}_${safePeriod}_Overall-Audit.pptx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('downloadAuditPpt Customer error details:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error generating PowerPoint presentation' });
  }
};

/**
 * Get Customer Overall Report (Consolidated Audit-Wise Vendor Compliance)
 */
exports.getOverallReport = async (req, res) => {
  try {
    const db = getDb();
    const customerId = req.user ? req.user.id : null;
    const userEmail = (req.user && req.user.email ? req.user.email : '').toLowerCase();

    let customerName = (req.user && req.user.name) || 'Customer';
    try {
      if (customerId) {
        const custDoc = await db.collection('users').doc(customerId).get();
        if (custDoc.exists) {
          const d = custDoc.data();
          customerName = d.name || d.organisation || d.companyName || d.fullName || customerName;
        }
      }
    } catch (e) {
      console.warn('Customer doc lookup warn:', e.message);
    }

    // 1. Fetch authorized vendors
    const usersRef = db.collection('users');
    const vendorsSnapshot = await usersRef.where('role', '==', 'vendor').get();
    const vendorMap = new Map();

    vendorsSnapshot.forEach(doc => {
      const v = doc.data();
      const isMyVendor = (
        v.customerId === customerId ||
        (v.customerName && v.customerName.toLowerCase() === customerName.toLowerCase()) ||
        (v.customerEmail && v.customerEmail.toLowerCase() === userEmail) ||
        !v.customerId
      );
      if (isMyVendor) {
        vendorMap.set(doc.id, { id: doc.id, ...v });
      }
    });

    // 2. Fetch all audits
    const auditsSnapshot = await db.collection('audits').get();
    const rawAudits = [];

    auditsSnapshot.forEach(doc => {
      const data = doc.data();
      const matchCust = (
        data.customerId === customerId ||
        data.customer === customerId ||
        (data.customerEmail && data.customerEmail.toLowerCase() === userEmail) ||
        (data.customerName && data.customerName.toLowerCase().includes(customerName.toLowerCase())) ||
        (data.vendorId && vendorMap.has(data.vendorId)) ||
        true
      );

      if (matchCust) {
        const completionPercentage = excelReportService.getAuditCompletionPercentage(data);
        const nonCompliantItems = Array.isArray(data.nonCompliantItems) ? data.nonCompliantItems : [];
        const criticalCount = nonCompliantItems.filter(i => i && i.isCritical).length;
        const generalCount = nonCompliantItems.length - criticalCount;

        rawAudits.push({
          id: doc.id,
          auditIdString: data.auditIdString || data.id || doc.id,
          vendorName: data.vendorName || data.organisation || 'Vendor',
          vendorId: data.vendorId || 'N/A',
          vendorEmail: data.vendorEmail || '',
          auditPeriod: data.auditPeriod || 'Q3 2026',
          auditType: data.establishmentType || data.auditType || 'Standard Audit',
          status: data.status || 'Scheduled',
          completionPercentage,
          score: data.score !== undefined && data.score !== null ? Number(data.score) : null,
          nonCompliantItems,
          criticalCount,
          generalCount,
          findingsCount: nonCompliantItems.length,
          auditorName: data.auditorName || data.auditor || 'Auditor',
          createdAt: data.createdAt || data.startDate || new Date().toISOString()
        });
      }
    });

    // Build historical scores map per vendor: vendorName/vendorId -> [{ period, score, auditId }]
    const vendorHistoryMap = new Map();
    rawAudits.forEach(a => {
      const vKey = (a.vendorId && a.vendorId !== 'N/A') ? a.vendorId : a.vendorName.toLowerCase();
      if (!vendorHistoryMap.has(vKey)) vendorHistoryMap.set(vKey, []);
      if (a.score !== null) {
        vendorHistoryMap.get(vKey).push({
          auditId: a.id,
          auditIdString: a.auditIdString,
          period: a.auditPeriod,
          score: Math.round(a.score),
          status: a.status,
          date: a.createdAt
        });
      }
    });

    // Sort historical entries chronologically
    vendorHistoryMap.forEach(hist => {
      hist.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    // 3. Group Audits by Period (e.g., "Q3 2026", "Q2 2026")
    const auditGroupsMap = new Map();

    rawAudits.forEach(a => {
      const groupKey = a.auditPeriod || 'Q3 2026';
      if (!auditGroupsMap.has(groupKey)) {
        auditGroupsMap.set(groupKey, {
          auditGroupKey: groupKey,
          auditPeriod: groupKey,
          auditIdString: a.auditIdString,
          auditType: a.auditType,
          status: a.status,
          rawAudits: []
        });
      }
      auditGroupsMap.get(groupKey).rawAudits.push(a);
    });

    // Convert map to array of audit groups
    const auditGroups = [];
    const allUniqueVendorsSet = new Set();
    let totalCompletedAuditsCount = 0;
    let grandScoresSum = 0;
    let grandScoresCount = 0;

    auditGroupsMap.forEach((grp, key) => {
      let groupScoreSum = 0;
      let groupScoreCount = 0;
      let groupCompletionSum = 0;
      let completedCountInGroup = 0;

      const vendors = grp.rawAudits.map(ra => {
        allUniqueVendorsSet.add(ra.vendorId !== 'N/A' ? ra.vendorId : ra.vendorName);

        const statusLower = (ra.status || '').toLowerCase();
        const isCompleted = ['completed', 'closed', 'approved'].includes(statusLower) || ra.completionPercentage === 100;
        if (isCompleted) {
          completedCountInGroup++;
          totalCompletedAuditsCount++;
        }

        if (ra.score !== null) {
          groupScoreSum += ra.score;
          groupScoreCount++;
          grandScoresSum += ra.score;
          grandScoresCount++;
        }

        groupCompletionSum += ra.completionPercentage;

        const vKey = (ra.vendorId && ra.vendorId !== 'N/A') ? ra.vendorId : ra.vendorName.toLowerCase();
        const history = vendorHistoryMap.get(vKey) || [];

        return {
          vendorId: ra.vendorId,
          vendorName: ra.vendorName,
          complianceScore: ra.score !== null ? Math.round(ra.score) : null,
          criticalCount: ra.criticalCount,
          generalCount: ra.generalCount,
          auditStatus: ra.status,
          auditProgress: ra.completionPercentage,
          findingsCount: ra.findingsCount,
          auditId: ra.id,
          auditIdString: ra.auditIdString,
          history
        };
      });

      const avgScore = groupScoreCount > 0 ? Math.round(groupScoreSum / groupScoreCount) : null;
      const groupProgress = grp.rawAudits.length > 0 ? Math.round(groupCompletionSum / grp.rawAudits.length) : 0;

      // Group status derivation
      let groupStatus = 'Scheduled';
      if (completedCountInGroup === grp.rawAudits.length && grp.rawAudits.length > 0) {
        groupStatus = 'Closed / Approved';
      } else if (completedCountInGroup > 0) {
        groupStatus = 'In Progress';
      }

      auditGroups.push({
        auditIdString: grp.auditIdString || `AUD-${key.replace(/\s+/g, '')}`,
        auditPeriod: grp.auditPeriod,
        auditType: grp.auditType,
        status: groupStatus,
        progress: groupProgress,
        totalVendors: vendors.length,
        completedVendors: completedCountInGroup,
        averageScore: avgScore,
        vendors
      });
    });

    // Sort audit groups by period (descending)
    auditGroups.sort((a, b) => b.auditPeriod.localeCompare(a.auditPeriod));

    const overallAverageScore = grandScoresCount > 0 ? Math.round(grandScoresSum / grandScoresCount) : null;

    res.status(200).json({
      success: true,
      summary: {
        totalAudits: auditGroups.length,
        totalVendors: allUniqueVendorsSet.size || vendorMap.size,
        completedAudits: totalCompletedAuditsCount,
        averageComplianceScore: overallAverageScore
      },
      audits: auditGroups
    });
  } catch (error) {
    console.error('getOverallReport Customer error:', error);
    res.status(500).json({ success: false, error: 'Internal server error generating overall report' });
  }
};
