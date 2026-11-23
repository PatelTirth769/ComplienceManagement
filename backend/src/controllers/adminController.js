const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const checklistService = require('../services/checklistService');
const emailService = require('../services/emailService');
const { parseFlexibleDate, calculateAuditCycle, toIsoDate, formatDate } = require('../utils/dateUtils');

const actRulesFilePath = path.join(__dirname, '../data/actRules.json');

function mergeWithLiveActRules(existingActRules) {
  let liveRules = [];
  try {
    if (fs.existsSync(actRulesFilePath)) {
      liveRules = JSON.parse(fs.readFileSync(actRulesFilePath, 'utf-8'));
    }
  } catch (e) {
    liveRules = [];
  }

  if (!liveRules || liveRules.length === 0) {
    return existingActRules || [];
  }

  if (!existingActRules || !Array.isArray(existingActRules) || existingActRules.length === 0) {
    return liveRules;
  }

  const liveMap = new Map();
  liveRules.forEach(r => {
    if (r.id) liveMap.set(String(r.id).toLowerCase(), r);
    if (r.shortName) liveMap.set(String(r.shortName).toLowerCase(), r);
  });

  return existingActRules.map(r => {
    const live = liveMap.get(String(r.id || '').toLowerCase()) || liveMap.get(String(r.shortName || '').toLowerCase());
    if (live) {
      return {
        ...r,
        attachment: live.attachment || r.attachment || null,
        description: (live.description && live.description.trim()) ? live.description : (r.description || ''),
        actName: live.actName || r.actName,
        category: live.category || r.category,
        states: (live.states && live.states.length > 0) ? live.states : r.states
      };
    }
    return r;
  });
}
exports.mergeWithLiveActRules = mergeWithLiveActRules;

// Checklist Management
exports.getChecklists = async (req, res) => {
  try {
    const { state, country } = req.query;
    const all = checklistService.getAllChecklists({ state, country });
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

// Act Rules Management
exports.getActRules = async (req, res) => {
  try {
    let rules = [];
    if (fs.existsSync(actRulesFilePath)) {
      try {
        rules = JSON.parse(fs.readFileSync(actRulesFilePath, 'utf-8'));
      } catch (err) {
        console.warn('Error reading actRules.json:', err.message);
      }
    }
    
    // Also try to read from Firestore if available
    try {
      const db = getDb();
      if (db) {
        const rulesRef = db.collection('act_rules');
        const snap = await rulesRef.get();
        if (!snap.empty) {
          const dbRules = [];
          snap.forEach(doc => {
            dbRules.push({ id: doc.id, ...doc.data() });
          });
          if (dbRules.length > 0) {
            const dbMap = new Map(dbRules.map(r => [r.id, r]));
            rules = rules.map(r => {
              const matched = dbMap.get(r.id);
              return matched ? { ...r, ...matched } : r;
            });
            dbRules.forEach(dbr => {
              if (!rules.some(r => r.id === dbr.id)) {
                rules.push(dbr);
              }
            });
          }
        }
      }
    } catch (dbErr) {
      // Non-fatal, local actRules.json is source of truth
    }

    res.status(200).json({ success: true, rules });
  } catch (error) {
    console.error('getActRules error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve Act rules' });
  }
};

exports.saveActRules = async (req, res) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({ success: false, error: 'Invalid payload: rules must be an array' });
    }

    const updatedRules = rules.map(r => ({
      ...r,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user ? req.user.email || req.user.name || 'Admin' : 'Admin'
    }));

    fs.writeFileSync(actRulesFilePath, JSON.stringify(updatedRules, null, 2), 'utf-8');

    try {
      const db = getDb();
      if (db) {
        const batch = db.batch();
        updatedRules.forEach(r => {
          const docRef = db.collection('act_rules').doc(r.id || r.shortName);
          batch.set(docRef, r, { merge: true });
        });
        await batch.commit();
      }
    } catch (dbErr) {
      console.warn('Firestore act_rules batch commit warning:', dbErr.message);
    }

    res.status(200).json({ success: true, message: 'Rules saved successfully', rules: updatedRules });
  } catch (error) {
    console.error('saveActRules error:', error);
    res.status(500).json({ success: false, error: 'Failed to save Act rules' });
  }
};

exports.saveActRuleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, attachment } = req.body;
    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'Description must be a string' });
    }

    let rules = [];
    if (fs.existsSync(actRulesFilePath)) {
      rules = JSON.parse(fs.readFileSync(actRulesFilePath, 'utf-8'));
    }

    const idx = rules.findIndex(r => r.id === id || r.shortName === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Act rule not found' });
    }

    if (description !== undefined) {
      rules[idx].description = description;
    }
    if (attachment !== undefined) {
      rules[idx].attachment = attachment;
    }
    rules[idx].updatedAt = new Date().toISOString();
    rules[idx].updatedBy = req.user ? req.user.email || req.user.name || 'Admin' : 'Admin';

    fs.writeFileSync(actRulesFilePath, JSON.stringify(rules, null, 2), 'utf-8');

    try {
      const db = getDb();
      if (db) {
        await db.collection('act_rules').doc(rules[idx].id).set(rules[idx], { merge: true });
      }
    } catch (dbErr) {
      console.warn('Firestore single rule update warning:', dbErr.message);
    }

    res.status(200).json({ success: true, message: 'Act rule updated successfully', rule: rules[idx] });
  } catch (error) {
    console.error('saveActRuleById error:', error);
    res.status(500).json({ success: false, error: 'Failed to update Act rule' });
  }
};

let dashboardStatsCache = null;
let dashboardStatsCacheTime = 0;
const STATS_CACHE_TTL_MS = 30000; // 30 seconds

exports.getDashboardStats = async (req, res) => {
  try {
    const now = Date.now();
    if (dashboardStatsCache && (now - dashboardStatsCacheTime < STATS_CACHE_TTL_MS)) {
      return res.status(200).json(dashboardStatsCache);
    }

    const db = getDb();
    
    const usersRef = db.collection('users');
    // Fetch all users to count and build name lookup
    const usersSnapshot = await usersRef.get();
    let totalCustomers = 0;
    let totalVendors = 0;
    let totalAuditors = 0;
    const usersMap = {};

    usersSnapshot.forEach(doc => {
      const u = doc.data();
      const role = (u.role || '').toLowerCase();
      if (role === 'customer') totalCustomers++;
      if (role === 'vendor') totalVendors++;
      if (role === 'auditor') totalAuditors++;

      const displayName = u.companyName || u.organisation || u.fullName || u.name || u.contactPerson || u.email || doc.id;
      usersMap[doc.id] = displayName;
      if (u.email) {
        usersMap[u.email.toLowerCase()] = displayName;
      }
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

      const customerName = data.customerName || data.organisation || usersMap[data.customerId] || (data.customer && usersMap[data.customer]) || data.customerId || 'N/A';
      const vendorName = data.vendorName || usersMap[data.vendorId] || (data.vendor && usersMap[data.vendor]) || data.vendorId || 'N/A';
      const auditorName = data.auditorName || data.auditor || usersMap[data.auditorId] || data.auditorId || 'N/A';

      recentAudits.push({
        id: doc.id,
        auditIdString: data.auditIdString || data.id || doc.id,
        vendorId: data.vendorId || data.vendor || 'N/A',
        vendorName: vendorName,
        customerId: data.customerId || data.customer || 'N/A',
        customerName: customerName,
        auditorId: data.auditorId || data.auditor || 'N/A',
        auditorName: auditorName,
        status: data.status || 'Scheduled',
        auditPeriod: data.auditPeriod || 'Q3 2026',
        score: data.score !== undefined ? data.score : null,
        dueDate: data.dueDate || new Date().toISOString(),
        auditType: data.auditType || 'Original',
        isReadOnly: !!data.isReadOnly
      });
    });

    const result = {
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
    };
    dashboardStatsCache = result;
    dashboardStatsCacheTime = now;

    res.status(200).json(result);
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
    cachedUsersMapTime = 0;
    dashboardStatsCacheTime = 0;

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

exports.deleteUser = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userDoc.data();
    // Prevent accidental deletion of Admin users via this endpoint if needed
    if ((userData.role || '').toLowerCase() === 'admin' && req.user?.id === id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own admin account' });
    }

    await userRef.delete();
    cachedUsersMapTime = 0;
    dashboardStatsCacheTime = 0;

    return res.status(200).json({
      success: true,
      message: `${userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'User'} deleted successfully`
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete user. Internal server error.' });
  }
};

const LOCAL_AUDITS_FILE = path.resolve(__dirname, '../data/audits_cache.json');

function loadLocalAuditsCache() {
  try {
    if (fs.existsSync(LOCAL_AUDITS_FILE)) {
      const content = fs.readFileSync(LOCAL_AUDITS_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function saveLocalAuditsCache(audits) {
  try {
    fs.writeFileSync(LOCAL_AUDITS_FILE, JSON.stringify(audits, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

let auditsCache = loadLocalAuditsCache();
let auditsCacheTime = auditsCache ? Date.now() : 0;
const CACHE_TTL_MS = 60000; // 60 seconds (Updates immediately on write operations)

let cachedUsersMap = null;
let cachedUsersMapTime = 0;
const USERS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache for user names

exports.invalidateAuditsCache = (auditId, patch) => {
  auditsCacheTime = 0;
  dashboardStatsCacheTime = 0;
  if (auditsCache && Array.isArray(auditsCache)) {
    let found = false;
    auditsCache = auditsCache.map(a => {
      if (a.id === auditId || a.auditIdString === auditId) {
        found = true;
        return { ...a, ...patch };
      }
      if (patch && Array.isArray(patch.interviewResources) && Array.isArray(a.interviewResources)) {
        let modified = false;
        const synced = a.interviewResources.map(ex => {
          const match = patch.interviewResources.find(pr => (pr.id && pr.id === ex.id) || (pr.loginId && pr.loginId === ex.loginId));
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
    if (!found && patch) {
      auditsCache.unshift({ id: auditId, ...patch });
    }
    saveLocalAuditsCache(auditsCache);
  }
};

exports.getAudits = async (req, res) => {
  try {
    const now = Date.now();
    const forceFresh = req.query && req.query.fresh === 'true';
    if (!forceFresh && auditsCache && (now - auditsCacheTime < CACHE_TTL_MS)) {
      return res.status(200).json({ success: true, audits: auditsCache });
    }

    const db = getDb();
    const auditsRef = db.collection('audits');
    const snapshot = await auditsRef.orderBy('createdAt', 'desc').get();
    const excelReportService = require('../services/excelReportService');
    
    // Resolve user IDs to real human/company names using cached map to avoid reading users collection on every request
    let usersMap = {};
    if (cachedUsersMap && (now - cachedUsersMapTime < USERS_CACHE_TTL_MS)) {
      usersMap = cachedUsersMap;
    } else {
      try {
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(uDoc => {
          const u = uDoc.data();
          usersMap[uDoc.id] = u.companyName || u.organisation || u.fullName || u.name || u.contactPerson || uDoc.id;
        });
        cachedUsersMap = usersMap;
        cachedUsersMapTime = now;
      } catch (uErr) {
        if (cachedUsersMap) usersMap = cachedUsersMap;
      }
    }

    const audits = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const completionPercentage = excelReportService.getAuditCompletionPercentage(data);

      const customerName = data.customerName || data.organisation || usersMap[data.customerId] || data.customerId;
      const vendorName = data.vendorName || usersMap[data.vendorId] || data.vendorId;
      const auditorName = data.auditorName || data.auditor || usersMap[data.auditorId] || data.auditorId;

      const summary = data.summary || {};
      const nonCompliantList = Array.isArray(data.nonCompliantItems) ? data.nonCompliantItems : [];
      const compliantCount = data.compliantCount ?? summary.compliantItems ?? (
        Array.isArray(data.responses)
          ? data.responses.filter(r => (r.status || '').toLowerCase() === 'compliant').length
          : 0
      );
      const nonCompliantCount = data.nonCompliantCount ?? (typeof summary.nonCompliantItems === 'number' ? summary.nonCompliantItems : nonCompliantList.length);
      const totalApplicable = data.totalApplicable ?? summary.applicableItems ?? (compliantCount + nonCompliantCount);
      const naCount = data.naCount ?? summary.naItems ?? 0;

      audits.push({
        id: doc.id,
        ...data,
        auditType: data.auditType || 'Original',
        isReadOnly: data.isReadOnly === true,
        customerName,
        vendorName,
        auditorName,
        compliantCount,
        nonCompliantCount,
        totalApplicable,
        naCount,
        findingsCount: data.findingsCount ?? nonCompliantCount,
        completionPercentage
      });
    });

    auditsCache = audits;
    auditsCacheTime = Date.now();
    saveLocalAuditsCache(audits);

    res.status(200).json({ success: true, audits });
  } catch (error) {
    console.warn('[getAudits Warning]: Serving cached audits due to DB error / quota limit:', error.message);
    const fallback = auditsCache || loadLocalAuditsCache() || [];
    return res.status(200).json({ success: true, audits: fallback, cached: true });
  }
};

exports.createAudit = async (req, res) => {
  try {
    const db = getDb();
    const { 
      customerId, 
      vendorId, 
      auditorId, 
      auditPeriod, 
      startDate, 
      dueDate, 
      establishmentType, 
      country, 
      state,
      auditFrequency,
      auditYear,
      periodSelection,
      ...otherInfo 
    } = req.body;

    // Resolve or calculate cycle parameters
    let cycleInfo = null;
    if (auditFrequency && auditYear) {
      cycleInfo = calculateAuditCycle(auditFrequency, auditYear, periodSelection);
      if (!cycleInfo) {
        return res.status(400).json({ success: false, error: 'Invalid audit frequency, year, or period selection.' });
      }
    }

    const finalAuditPeriod = auditPeriod || (cycleInfo ? cycleInfo.summary : null);
    const finalStartDate = startDate || (cycleInfo ? cycleInfo.startDate : null);
    const finalDueDate = dueDate || (cycleInfo ? cycleInfo.dueDate : null);

    if (!customerId || !vendorId || !auditorId || !finalAuditPeriod || !finalStartDate || !finalDueDate) {
      return res.status(400).json({ success: false, error: 'Missing required audit fields' });
    }

    const sDate = parseFlexibleDate(finalStartDate);
    const dDate = parseFlexibleDate(finalDueDate);
    if (!sDate || !dDate) {
      return res.status(400).json({ success: false, error: 'Invalid start or due date format' });
    }
    if (dDate < sDate) {
      return res.status(400).json({ success: false, error: 'Due date cannot be before start date' });
    }

    // Check for duplicates
    const auditsRef = db.collection('audits');
    const existingAuditsSnapshot = await auditsRef
      .where('vendorId', '==', vendorId)
      .get();
    
    const isDup = existingAuditsSnapshot.docs.some(doc => {
      const data = doc.data();
      const p = (data.auditPeriod || '').trim().toLowerCase();
      const newP = (finalAuditPeriod || '').trim().toLowerCase();
      if (p === newP) return true;
      const cleanExisting = p.replace(/[–—]/g, '-').split('(')[0].trim();
      const cleanNew = newP.replace(/[–—]/g, '-').split('(')[0].trim();
      if (cleanExisting && cleanNew && cleanExisting === cleanNew) return true;
      return false;
    });

    if (isDup) {
      return res.status(400).json({ success: false, error: 'An audit for this vendor in this period already exists' });
    }

    // Generate AUD-YYYY-XXXX ID
    const countSnapshot = await auditsRef.get();
    const count = countSnapshot.size + 1;
    const year = new Date().getFullYear();
    const auditIdString = `AUD-${year}-${String(count).padStart(4, '0')}`;

    // Fetch user names for denormalization
    let customerName = 'N/A';
    let customerEmail = '';
    let vendorName = 'N/A';
    let auditorName = 'N/A';
    let vendorEmail = '';
    let auditorEmail = '';

    try {
      const [custDoc, venDoc, audDoc] = await Promise.all([
        db.collection('users').doc(customerId).get(),
        db.collection('users').doc(vendorId).get(),
        db.collection('users').doc(auditorId).get()
      ]);
      if (custDoc.exists) {
        const cd = custDoc.data();
        customerName = cd.name || cd.organisation || cd.companyName || cd.fullName || 'Customer';
        customerEmail = cd.email || '';
      }
      if (venDoc.exists) {
        const vd = venDoc.data();
        vendorName = vd.name || vd.companyName || vd.fullName || 'Vendor';
        vendorEmail = vd.email || '';
      }
      if (audDoc.exists) {
        const ad = audDoc.data();
        auditorName = ad.name || ad.fullName || ad.companyName || 'Auditor';
        auditorEmail = ad.email || '';
      }
    } catch (e) {
      console.warn('Error fetching names for new audit:', e.message);
    }

    // Additional query fallbacks if email was not found via document ID
    if (!customerEmail && customerId) {
      try {
        const cSnap = await db.collection('users').where('email', '==', String(customerId).toLowerCase().trim()).get();
        if (!cSnap.empty) {
          const cd = cSnap.docs[0].data();
          customerName = cd.name || cd.organisation || cd.companyName || cd.fullName || customerName;
          customerEmail = cd.email || '';
        }
      } catch (e) {}
    }
    if (!vendorEmail && vendorId) {
      try {
        const vSnap = await db.collection('users').where('email', '==', String(vendorId).toLowerCase().trim()).get();
        if (!vSnap.empty) {
          const vd = vSnap.docs[0].data();
          vendorName = vd.name || vd.companyName || vd.fullName || vendorName;
          vendorEmail = vd.email || '';
        }
      } catch (e) {}
    }
    if (!auditorEmail && auditorId) {
      try {
        const aSnap = await db.collection('users').where('email', '==', String(auditorId).toLowerCase().trim()).get();
        if (!aSnap.empty) {
          const ad = aSnap.docs[0].data();
          auditorName = ad.name || ad.fullName || ad.companyName || auditorName;
          auditorEmail = ad.email || '';
        }
      } catch (e) {}
    }

    customerEmail = (customerEmail || req.body.customerEmail || '').trim();
    vendorEmail = (vendorEmail || req.body.vendorEmail || '').trim();
    auditorEmail = (auditorEmail || req.body.auditorEmail || '').trim();

    const isoStart = toIsoDate(sDate);
    const isoDue = toIsoDate(dDate);

    const initialTimeline = [
      {
        event: 'Audit Scheduled',
        status: 'Scheduled',
        timestamp: new Date().toISOString(),
        actor: req.user?.email || 'Admin',
        notes: `Statutory compliance audit ${auditIdString} scheduled for ${vendorName} (${finalAuditPeriod}).`
      }
    ];

    // Snapshot current Act rules / laws for this specific audit
    let actRulesSnapshot = [];
    if (fs.existsSync(actRulesFilePath)) {
      try {
        actRulesSnapshot = JSON.parse(fs.readFileSync(actRulesFilePath, 'utf-8'));
      } catch (err) {
        console.warn('Error reading actRules.json for snapshot:', err.message);
      }
    }
    try {
      const dbSnap = await db.collection('act_rules').get();
      if (!dbSnap.empty) {
        const dbRules = [];
        dbSnap.forEach(d => dbRules.push({ id: d.id, ...d.data() }));
        if (dbRules.length > 0) {
          const dbMap = new Map(dbRules.map(r => [r.id, r]));
          actRulesSnapshot = actRulesSnapshot.map(r => {
            const matched = dbMap.get(r.id);
            return matched ? { ...r, ...matched } : r;
          });
        }
      }
    } catch (e) {}

    const newAudit = {
      auditIdString,
      auditType: req.body.auditType || 'Original',
      isReadOnly: false,
      customerId,
      customerName,
      customerEmail,
      organisation: customerName,
      vendorId,
      vendorName,
      vendorEmail,
      auditorId,
      auditorName,
      auditorEmail,
      auditor: auditorName,
      auditPeriod: finalAuditPeriod,
      auditFrequency: auditFrequency || (cycleInfo ? cycleInfo.frequency : 'Quarterly'),
      auditYear: auditYear ? Number(auditYear) : (cycleInfo ? cycleInfo.year : sDate.getFullYear()),
      periodSelection: periodSelection || (cycleInfo ? cycleInfo.period : ''),
      startDate: isoStart,
      dueDate: isoDue,
      establishmentType: establishmentType || '',
      country: country || 'India',
      state: state || 'N/A',
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
      score: null,
      timeline: initialTimeline,
      actRules: actRulesSnapshot,
      ...otherInfo
    };

    const docRef = await auditsRef.add(newAudit);

    // CRITICAL: Immediate Cache Synchronization for instant UI display
    try {
      const createdAuditListItem = {
        id: docRef.id,
        ...newAudit,
        auditType: newAudit.auditType || 'Original',
        isReadOnly: false,
        customerName: newAudit.customerName,
        customerEmail: newAudit.customerEmail,
        vendorName: newAudit.vendorName,
        vendorEmail: newAudit.vendorEmail,
        auditorName: newAudit.auditorName,
        auditorEmail: newAudit.auditorEmail,
        compliantCount: 0,
        nonCompliantCount: 0,
        totalApplicable: 0,
        naCount: 0,
        findingsCount: 0,
        completionPercentage: 0
      };

      let freshAudits = loadLocalAuditsCache() || auditsCache || [];
      freshAudits = [createdAuditListItem, ...freshAudits.filter(a => a.id !== docRef.id)];
      auditsCache = freshAudits;
      auditsCacheTime = Date.now();
      dashboardStatsCacheTime = 0; // force stats cache refresh
      saveLocalAuditsCache(freshAudits);
    } catch (cacheErr) {
      console.warn('[Admin Controller createAudit]: Cache sync warning:', cacheErr.message);
    }

    const portalUrl = req.get('origin') || (req.get('referer') ? new URL(req.get('referer')).origin : null) || process.env.FRONTEND_URL || 'http://localhost:5174';

    // Send immediate email and notification to vendor regarding newly scheduled audit (with Customer in CC)
    if (vendorEmail) {
      emailService.sendAuditScheduledEmail({
        vendorEmail,
        customerEmail: customerEmail || undefined,
        vendorName,
        customerName,
        auditorName,
        auditIdString,
        auditPeriod: finalAuditPeriod,
        startDate: formatDate(isoStart),
        dueDate: formatDate(isoDue),
        establishmentType: establishmentType || '',
        state: state || 'N/A',
        portalUrl
      }).then(emailRes => {
        if (emailRes && emailRes.success) {
          console.log(`[Admin Controller]: Immediate audit scheduled email successfully sent to ${vendorEmail}${customerEmail ? ` (CC: ${customerEmail})` : ''} for audit ${auditIdString}`);
        }
      }).catch(err => {
        console.warn(`[Admin Controller]: Failed to send scheduled audit email to ${vendorEmail}:`, err.message);
      });

      // Also create an in-app notification in vendor portal
      db.collection('notifications').add({
        userId: vendorId,
        role: 'Vendor',
        title: '📋 New Audit Scheduled: Action Required',
        message: `Audit ${auditIdString} (${finalAuditPeriod}) has been scheduled. Please upload your statutory compliance documents.`,
        auditId: docRef.id,
        type: 'audit_scheduled',
        read: false,
        createdAt: new Date().toISOString()
      }).catch(notifErr => {
        console.warn('[Admin Controller]: Could not create in-app notification for vendor:', notifErr.message);
      });
    }

    // Send immediate email and notification to auditor that audit has been created and assigned
    if (auditorEmail) {
      emailService.sendAuditorAuditAssignedEmail({
        auditorEmail,
        auditorName,
        vendorName,
        customerName,
        auditIdString,
        auditPeriod: finalAuditPeriod,
        startDate: formatDate(isoStart),
        dueDate: formatDate(isoDue),
        establishmentType: establishmentType || '',
        state: state || 'N/A',
        portalUrl
      }).then(audEmailRes => {
        if (audEmailRes && audEmailRes.success) {
          console.log(`[Admin Controller]: Immediate audit assignment email successfully sent to auditor ${auditorEmail} for audit ${auditIdString}`);
        }
      }).catch(err => {
        console.warn(`[Admin Controller]: Failed to send audit assignment email to auditor ${auditorEmail}:`, err.message);
      });
    }

    if (auditorId) {
      db.collection('notifications').add({
        userId: auditorId,
        role: 'Auditor',
        title: '📋 New Audit Assigned',
        message: `Audit ${auditIdString} for ${vendorName} (${finalAuditPeriod}) has been assigned to you.`,
        auditId: docRef.id,
        type: 'audit_assigned',
        read: false,
        createdAt: new Date().toISOString()
      }).catch(notifErr => {
        console.warn('[Admin Controller]: Could not create in-app notification for auditor:', notifErr.message);
      });
    }

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
    const auditData = docRef.data();

    let customerName = auditData.customerName || auditData.organisation || '';
    let vendorName = auditData.vendorName || '';
    let auditorName = auditData.auditorName || auditData.auditor || '';

    const needCustomer = !customerName || customerName === auditData.customerId;
    const needVendor = !vendorName || vendorName === auditData.vendorId;
    const needAuditor = !auditorName || auditorName === auditData.auditorId;

    if (needCustomer || needVendor || needAuditor) {
      try {
        const promises = [];
        if (needCustomer && auditData.customerId) promises.push(db.collection('users').doc(auditData.customerId).get());
        else promises.push(Promise.resolve(null));

        if (needVendor && auditData.vendorId) promises.push(db.collection('users').doc(auditData.vendorId).get());
        else promises.push(Promise.resolve(null));

        if (needAuditor && auditData.auditorId) promises.push(db.collection('users').doc(auditData.auditorId).get());
        else promises.push(Promise.resolve(null));

        const [custDoc, vendDoc, audDoc] = await Promise.all(promises);

        if (custDoc && custDoc.exists) {
          const c = custDoc.data();
          customerName = c.companyName || c.organisation || c.fullName || c.name || c.contactPerson || customerName;
        }
        if (vendDoc && vendDoc.exists) {
          const v = vendDoc.data();
          vendorName = v.companyName || v.fullName || v.name || v.contactPerson || vendorName;
        }
        if (audDoc && audDoc.exists) {
          const a = audDoc.data();
          auditorName = a.fullName || a.name || a.contactPerson || auditorName;
        }
      } catch (e) {
        console.warn('Error resolving user names in getAuditById:', e.message);
      }
    }

    const scoringService = require('../services/scoringService');
    const checklistService = require('../services/checklistService');

    let summary = auditData.summary || {};
    let nonCompliantItems = Array.isArray(auditData.nonCompliantItems) ? auditData.nonCompliantItems : [];
    let categoryScores = auditData.categoryScores || [];

    // Recalculate or fill if missing but responses exist
    if ((!summary.compliantItems || nonCompliantItems.length === 0) && auditData.responses) {
      try {
        const vendorType = auditData.vendorType || 'other-vendor';
        const checklist = checklistService.getChecklistByVendorType(vendorType, { state: auditData.state, country: auditData.country }) || checklistService.getChecklistByVendorType('other-vendor') || [];
        
        let respArray = [];
        if (Array.isArray(auditData.responses)) {
          respArray = auditData.responses;
        } else if (typeof auditData.responses === 'object' && auditData.responses !== null) {
          respArray = Object.entries(auditData.responses).map(([k, v]) => {
            if (typeof v === 'object' && v !== null) {
              return { itemId: k, status: v.status || 'COMPLIANT', remarks: v.remarks || '' };
            }
            return { itemId: k, status: String(v), remarks: '' };
          });
        }

        if (checklist.length > 0 && respArray.length > 0) {
          const calcResult = scoringService.calculateComplianceScore(checklist, respArray);
          summary = calcResult.summary || summary;
          if (nonCompliantItems.length === 0 && Array.isArray(calcResult.nonCompliantItems)) {
            nonCompliantItems = calcResult.nonCompliantItems;
          }
          if (categoryScores.length === 0 && Array.isArray(calcResult.categoryScores)) {
            categoryScores = calcResult.categoryScores;
          }
        }
      } catch (err) {
        console.warn('Recalculate audit scores/findings error in adminController:', err.message);
      }
    }

    const compliantCount = auditData.compliantCount ?? summary.compliantItems ?? (
      Array.isArray(auditData.responses)
        ? auditData.responses.filter(r => (r.status || '').toLowerCase() === 'compliant').length
        : 0
    );
    const nonCompliantCount = auditData.nonCompliantCount ?? (typeof summary.nonCompliantItems === 'number' ? summary.nonCompliantItems : nonCompliantItems.length);
    const totalApplicable = auditData.totalApplicable ?? summary.applicableItems ?? (compliantCount + nonCompliantCount);
    const naCount = auditData.naCount ?? summary.naItems ?? (
      Array.isArray(auditData.responses)
        ? auditData.responses.filter(r => (r.status || '').toLowerCase() === 'na').length
        : 0
    );

    const findingsCount = auditData.findingsCount ?? nonCompliantCount;
    const findingsResolved = auditData.findingsResolved ?? nonCompliantItems.filter(f => f.status === 'Resolved' || f.isResolved).length;
    const findingsPending = auditData.findingsPending ?? nonCompliantItems.filter(f => f.vendorResponse && f.status !== 'Resolved').length;
    const findingsOpen = auditData.findingsOpen ?? Math.max(0, findingsCount - findingsResolved - findingsPending);

    // Resolve actRules snapshot for this audit merged with latest live attachments
    const actRulesSnapshot = mergeWithLiveActRules(auditData.actRules);

    // Enrich responses with checklist metadata if missing
    let enrichedResponses = auditData.responses;
    try {
      const allChecklists = checklistService.getAllChecklists();
      const checklistMap = new Map();
      [...(allChecklists.otherVendor || []), ...(allChecklists.securityVendor || []), ...(allChecklists.stateVendor || [])].forEach(it => {
        if (it && it.id) checklistMap.set(it.id, it);
      });

      if (Array.isArray(auditData.responses)) {
        enrichedResponses = auditData.responses.map(r => {
          const itemInfo = checklistMap.get(r.itemId || r.id) || {};
          return {
            ...r,
            itemId: r.itemId || r.id,
            type: r.type || itemInfo.type || itemInfo.actNameInShort || '',
            actNameInShort: r.actNameInShort || itemInfo.actNameInShort || itemInfo.type || '',
            nameOfAct: r.nameOfAct || itemInfo.nameOfAct || '',
            title: r.title || itemInfo.title || '',
            particulars: r.particulars || itemInfo.particulars || itemInfo.description || ''
          };
        });
      } else if (typeof auditData.responses === 'object' && auditData.responses !== null) {
        enrichedResponses = Object.entries(auditData.responses).map(([k, v]) => {
          const itemInfo = checklistMap.get(k) || {};
          const base = typeof v === 'object' && v !== null ? v : { status: String(v) };
          return {
            ...base,
            itemId: k,
            type: base.type || itemInfo.type || itemInfo.actNameInShort || '',
            actNameInShort: base.actNameInShort || itemInfo.actNameInShort || itemInfo.type || '',
            nameOfAct: base.nameOfAct || itemInfo.nameOfAct || '',
            title: base.title || itemInfo.title || '',
            particulars: base.particulars || itemInfo.particulars || itemInfo.description || ''
          };
        });
      }
    } catch (enrichErr) {
      console.warn('Error enriching responses in getAuditById:', enrichErr.message);
    }

    res.status(200).json({ 
      success: true, 
      audit: { 
        id: docRef.id, 
        ...auditData,
        auditType: auditData.auditType || 'Original',
        isReadOnly: auditData.isReadOnly === true,
        summary,
        categoryScores,
        nonCompliantItems,
        compliantCount,
        nonCompliantCount,
        totalApplicable,
        naCount,
        findingsCount,
        findingsOpen,
        findingsResolved,
        findingsPending,
        actRules: actRulesSnapshot,
        responses: enrichedResponses || auditData.responses,
        customerName: customerName || auditData.customerId,
        vendorName: vendorName || auditData.vendorId,
        auditorName: auditorName || auditData.auditorId
      } 
    });
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

exports.updateAuditTimeline = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { startDate, dueDate, notes } = req.body;

    if (!startDate || !dueDate) {
      return res.status(400).json({ success: false, error: 'startDate and dueDate are required' });
    }

    const sDate = parseFlexibleDate(startDate);
    const dDate = parseFlexibleDate(dueDate);
    if (!sDate || !dDate) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    if (dDate < sDate) {
      return res.status(400).json({ success: false, error: 'Due date cannot be before start date' });
    }

    const formattedStart = toIsoDate(sDate);
    const formattedDue = toIsoDate(dDate);

    // Fetch existing audit
    const auditRef = db.collection('audits').doc(id);
    const doc = await auditRef.get();
    let auditData = null;
    let targetAuditDocId = id;

    if (doc.exists) {
      auditData = doc.data();
    } else {
      // Check in local cache
      const cached = loadLocalAuditsCache().find(a => a.id === id || a.auditIdString === id);
      if (cached) {
        auditData = cached;
        targetAuditDocId = cached.id;
      }
    }

    if (!auditData) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const oldStart = auditData.startDate;
    const oldDue = auditData.dueDate;

    const timeline = Array.isArray(auditData.timeline) ? [...auditData.timeline] : [];
    timeline.push({
      event: 'Audit Timeline Rescheduled',
      status: auditData.status || 'Scheduled',
      timestamp: new Date().toISOString(),
      actor: req.user?.name || req.user?.email || 'Admin',
      notes: notes || `Audit timeline updated from ${formatDate(oldStart)} - ${formatDate(oldDue)} to ${formatDate(formattedStart)} - ${formatDate(formattedDue)} by Administrator.`
    });

    const updatePayload = {
      startDate: formattedStart,
      dueDate: formattedDue,
      timeline,
      updatedAt: new Date().toISOString()
    };

    if (doc.exists) {
      await auditRef.update(updatePayload);
    }

    // Update local cache and persist
    exports.invalidateAuditsCache(targetAuditDocId, updatePayload);

    // Send updated timeline notification email to auditor (and vendor)
    const emailService = require('../services/emailService');
    const auditorEmail = auditData.auditorEmail || (auditData.auditor && auditData.auditor.includes('@') ? auditData.auditor : null);
    const vendorEmail = auditData.vendorEmail;

    const emailParams = {
      auditIdString: auditData.auditIdString || targetAuditDocId,
      auditPeriod: auditData.auditPeriod || 'Current Period',
      vendorName: auditData.vendorName || 'Vendor Partner',
      customerName: auditData.customerName || auditData.organisation || 'Enterprise Client',
      auditorName: auditData.auditorName || auditData.auditor || 'Auditor',
      auditorEmail,
      vendorEmail,
      startDate: formatDate(formattedStart),
      dueDate: formatDate(formattedDue),
      establishmentType: auditData.establishmentType,
      state: auditData.state
    };

    let emailSentToAuditor = false;
    if (auditorEmail && auditorEmail.includes('@')) {
      try {
        await emailService.sendAuditorTimelineUpdatedEmail(emailParams);
        emailSentToAuditor = true;
      } catch (err) {
        console.warn('[updateAuditTimeline]: Error sending email to auditor:', err.message);
      }
    }

    // Also notify vendor of the updated timeline
    if (vendorEmail && vendorEmail.includes('@')) {
      try {
        await emailService.sendVendorTimelineUpdatedEmail(emailParams);
      } catch (err) {
        console.warn('[updateAuditTimeline]: Error sending email to vendor:', err.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Audit timeline updated to ${formatDate(formattedStart)} - ${formatDate(formattedDue)} successfully`,
      data: {
        id: targetAuditDocId,
        startDate: formattedStart,
        dueDate: formattedDue,
        emailSentToAuditor
      }
    });
  } catch (error) {
    console.error('updateAuditTimeline error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
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

    const auditsRef = db.collection('audits');
    const compAuditsRef = db.collection('compliance_audits');

    // 1. Locate target audit doc in 'audits' or 'compliance_audits' or local cache
    let targetDocSnap = null;

    // Check direct doc ID in audits
    let docSnap = await auditsRef.doc(id).get().catch(() => null);
    if (docSnap && docSnap.exists) {
      targetDocSnap = docSnap;
    } else {
      // Check by auditIdString
      const q = await auditsRef.where('auditIdString', '==', id).get().catch(() => null);
      if (q && !q.empty) {
        targetDocSnap = q.docs[0];
      } else {
        // Check in compliance_audits
        const compSnap = await compAuditsRef.doc(id).get().catch(() => null);
        if (compSnap && compSnap.exists) {
          targetDocSnap = compSnap;
        } else {
          const compQ = await compAuditsRef.where('auditIdString', '==', id).get().catch(() => null);
          if (compQ && !compQ.empty) {
            targetDocSnap = compQ.docs[0];
          }
        }
      }
    }

    // Also check local cache
    const localCached = loadLocalAuditsCache() || [];
    const cachedTarget = localCached.find(a => a.id === id || a.auditIdString === id);

    if (!targetDocSnap && !cachedTarget) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const targetData = targetDocSnap ? targetDocSnap.data() : (cachedTarget || {});
    const targetAuditId = (targetDocSnap && targetDocSnap.id) || cachedTarget?.id || id;
    const targetAuditIdString = targetData.auditIdString || cachedTarget?.auditIdString || id;
    const baseAuditIdString = targetAuditIdString.replace(/-RA\d*$/, '');

    // 2. Collect ALL related audit document IDs and auditIdStrings (Cascade Original <-> Re-Audit)
    const auditDocIdsToDelete = new Set();
    const auditIdStringsToDelete = new Set();

    auditDocIdsToDelete.add(targetAuditId);
    auditIdStringsToDelete.add(targetAuditIdString);
    if (baseAuditIdString) {
      auditIdStringsToDelete.add(baseAuditIdString);
    }

    if (targetData.parentAuditId) auditDocIdsToDelete.add(targetData.parentAuditId);
    if (targetData.originalAuditId) auditDocIdsToDelete.add(targetData.originalAuditId);
    if (targetData.originalAuditIdString) auditIdStringsToDelete.add(targetData.originalAuditIdString);

    // Look for all related audits in local cache (original <-> re-audits)
    localCached.forEach(a => {
      const aId = a.id;
      const aStr = a.auditIdString || '';
      const aBase = aStr.replace(/-RA\d*$/, '');
      const isRelated = 
        auditDocIdsToDelete.has(aId) ||
        auditIdStringsToDelete.has(aStr) ||
        (baseAuditIdString && aBase === baseAuditIdString) ||
        (a.parentAuditId && auditDocIdsToDelete.has(a.parentAuditId)) ||
        (a.originalAuditId && auditDocIdsToDelete.has(a.originalAuditId));

      if (isRelated) {
        if (aId) auditDocIdsToDelete.add(aId);
        if (aStr) auditIdStringsToDelete.add(aStr);
        if (aBase) auditIdStringsToDelete.add(aBase);
        if (a.parentAuditId) auditDocIdsToDelete.add(a.parentAuditId);
        if (a.originalAuditId) auditDocIdsToDelete.add(a.originalAuditId);
      }
    });

    // Query Firestore for related original or re-audit docs
    try {
      if (targetAuditId) {
        const relatedByParent = await auditsRef.where('parentAuditId', '==', targetAuditId).get().catch(() => null);
        if (relatedByParent) {
          relatedByParent.forEach(d => {
            auditDocIdsToDelete.add(d.id);
            if (d.data().auditIdString) auditIdStringsToDelete.add(d.data().auditIdString);
          });
        }
      }

      if (targetData.parentAuditId) {
        const relatedSiblings = await auditsRef.where('parentAuditId', '==', targetData.parentAuditId).get().catch(() => null);
        if (relatedSiblings) {
          relatedSiblings.forEach(d => {
            auditDocIdsToDelete.add(d.id);
            if (d.data().auditIdString) auditIdStringsToDelete.add(d.data().auditIdString);
          });
        }
      }

      if (baseAuditIdString) {
        const relatedByBase = await auditsRef.where('auditIdString', '==', baseAuditIdString).get().catch(() => null);
        if (relatedByBase) {
          relatedByBase.forEach(d => {
            auditDocIdsToDelete.add(d.id);
            if (d.data().auditIdString) auditIdStringsToDelete.add(d.data().auditIdString);
          });
        }
      }
    } catch (e) {
      console.warn('Firestore related audit query warning:', e.message);
    }

    // 3. Clean up Firestore documents, reports, and S3 objects for all related IDs
    const s3Service = require('../services/s3Service');
    const s3Keys = new Set();

    for (const docId of auditDocIdsToDelete) {
      await s3Service.deleteObjectsByPrefix(`audits/${docId}/`).catch(() => {});
    }
    for (const strId of auditIdStringsToDelete) {
      await s3Service.deleteObjectsByPrefix(`audits/${strId}/`).catch(() => {});
    }

    // Cleanup documents & reports collections in Firestore
    try {
      const allIds = Array.from(new Set([...auditDocIdsToDelete, ...auditIdStringsToDelete]));
      for (const aid of allIds) {
        const docsSnap = await db.collection('documents').where('auditId', '==', aid).get().catch(() => null);
        if (docsSnap && !docsSnap.empty) {
          const batch = db.batch();
          let bCount = 0;
          docsSnap.forEach(d => {
            if (d.data().s3Key) s3Keys.add(d.data().s3Key);
            batch.delete(d.ref);
            bCount++;
          });
          if (bCount > 0) await batch.commit().catch(() => {});
        }

        const repSnap = await db.collection('reports').where('auditId', '==', aid).get().catch(() => null);
        if (repSnap && !repSnap.empty) {
          const batch = db.batch();
          let bCount = 0;
          repSnap.forEach(r => {
            if (r.data().s3Key) s3Keys.add(r.data().s3Key);
            batch.delete(r.ref);
            bCount++;
          });
          if (bCount > 0) await batch.commit().catch(() => {});
        }
      }
    } catch (docErr) {
      console.warn('Cleanup documents/reports warning:', docErr.message);
    }

    for (const key of s3Keys) {
      await s3Service.deleteFromS3(key).catch(() => {});
    }

    // 4. Delete all collected audit documents from Firestore
    for (const docId of auditDocIdsToDelete) {
      await auditsRef.doc(docId).delete().catch(() => {});
      await compAuditsRef.doc(docId).delete().catch(() => {});
    }

    // 5. CRITICAL: Clean up from local memory cache and audits_cache.json
    try {
      let freshCache = loadLocalAuditsCache() || [];
      freshCache = freshCache.filter(a => {
        if (auditDocIdsToDelete.has(a.id)) return false;
        if (a.auditIdString && auditIdStringsToDelete.has(a.auditIdString)) return false;
        if (baseAuditIdString && (a.auditIdString || '').replace(/-RA\d*$/, '') === baseAuditIdString) return false;
        if (a.parentAuditId && auditDocIdsToDelete.has(a.parentAuditId)) return false;
        if (a.originalAuditId && auditDocIdsToDelete.has(a.originalAuditId)) return false;
        return true;
      });
      auditsCache = freshCache;
      auditsCacheTime = 0;
      dashboardStatsCacheTime = 0;
      saveLocalAuditsCache(freshCache);
    } catch (cacheErr) {
      console.warn('Local audits cache cleanup error:', cacheErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Audit and all associated re-audit records deleted successfully',
      deletedIds: Array.from(auditDocIdsToDelete),
      deletedIdStrings: Array.from(auditIdStringsToDelete),
      baseAuditIdString
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

/**
 * Manual trigger for automated vendor document upload reminders
 */
exports.triggerDocumentReminders = async (req, res) => {
  try {
    const reminderService = require('../services/reminderService');
    const result = await reminderService.checkAndSendVendorDocumentReminders();
    return res.status(200).json(result);
  } catch (error) {
    console.error('triggerDocumentReminders error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


