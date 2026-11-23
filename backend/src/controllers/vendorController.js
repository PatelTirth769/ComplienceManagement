const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/firebase');

const actRulesFilePath = path.join(__dirname, '../data/actRules.json');

exports.getDashboardStats = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;

    const auditsRef = db.collection('audits');
    const unifiedSnapshot = await auditsRef.where('vendorId', '==', vendorId).get();

    let activeAudit = null;
    let totalDocuments = 0;
    let openFindings = 0;

    const audits = [];
    unifiedSnapshot.forEach(doc => audits.push({ id: doc.id, ...doc.data() }));

    // Also check compliance_audits just in case
    const legacySnapshot = await db.collection('compliance_audits').where('vendorId', '==', vendorId).get();
    legacySnapshot.forEach(doc => {
      if (!audits.find(a => a.id === doc.id)) {
        audits.push({ id: doc.id, ...doc.data() });
      }
    });

    // Find the most recent active audit
    const activeAudits = audits.filter(a => ['scheduled', 'in progress', 'pending sign-off'].includes((a.status || '').toLowerCase()));

    if (activeAudits.length > 0) {
      activeAudits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      activeAudit = activeAudits[0];
    }

    if (activeAudit) {
      const excelReportService = require('../services/excelReportService');
      const completionPercentage = excelReportService.getAuditCompletionPercentage(activeAudit);
      activeAudit = { ...activeAudit, completionPercentage };
      totalDocuments = activeAudit.documents ? activeAudit.documents.length : 0;
      openFindings = activeAudit.nonCompliantItems ? activeAudit.nonCompliantItems.length : 0;
    }

    res.status(200).json({
      success: true,
      data: {
        activeAudit,
        totalDocuments,
        openFindings,
      }
    });
  } catch (error) {
    console.error('Vendor Dashboard Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;

    const userDoc = await db.collection('users').doc(vendorId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    res.status(200).json({ success: true, data: userDoc.data() });
  } catch (error) {
    console.error('Vendor Profile Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;

    const { name, contactPerson, phone, address, establishmentDetails } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (establishmentDetails !== undefined) updateData.establishmentDetails = establishmentDetails;

    updateData.updatedAt = new Date().toISOString();

    await db.collection('users').doc(vendorId).update(updateData);

    const updatedUser = await db.collection('users').doc(vendorId).get();

    res.status(200).json({ success: true, data: updatedUser.data() });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

async function resolveAuditNames(db, audit) {
  let customerName = audit.customerName || audit.organisation || audit.customer || '';
  let auditorName = audit.auditorName || audit.auditor || '';
  let vendorName = audit.vendorName || '';

  if (!customerName && audit.customerId) {
    try {
      const custDoc = await db.collection('users').doc(audit.customerId).get();
      if (custDoc.exists) {
        const d = custDoc.data();
        customerName = d.fullName || d.name || d.companyName || d.organisation || d.email || '';
      }
    } catch (e) {
      console.warn('Resolve customer name error:', e.message);
    }
  }

  if (!auditorName && audit.auditorId) {
    try {
      const audDoc = await db.collection('users').doc(audit.auditorId).get();
      if (audDoc.exists) {
        const d = audDoc.data();
        auditorName = d.fullName || d.name || d.email || '';
      }
    } catch (e) {
      console.warn('Resolve auditor name error:', e.message);
    }
  }

  if (!vendorName && audit.vendorId) {
    try {
      const venDoc = await db.collection('users').doc(audit.vendorId).get();
      if (venDoc.exists) {
        const d = venDoc.data();
        vendorName = d.fullName || d.name || d.companyName || d.email || '';
      }
    } catch (e) {
      console.warn('Resolve vendor name error:', e.message);
    }
  }

  return {
    customerName: customerName || 'N/A',
    organisation: customerName || audit.organisation || 'N/A',
    auditorName: auditorName || 'N/A',
    auditor: auditorName || audit.auditor || 'N/A',
    vendorName: vendorName || 'N/A'
  };
}

exports.getMyAudits = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;

    const auditsRef = db.collection('audits');
    const unifiedSnapshot = await auditsRef.where('vendorId', '==', vendorId).get();

    const rawAudits = [];
    unifiedSnapshot.forEach(doc => {
      rawAudits.push({ id: doc.id, ...doc.data() });
    });

    // Also check compliance_audits just in case the auditor engine creates them there
    const legacySnapshot = await db.collection('compliance_audits').where('vendorId', '==', vendorId).get();
    legacySnapshot.forEach(doc => {
      if (!rawAudits.find(a => a.id === doc.id)) {
        rawAudits.push({ id: doc.id, ...doc.data() });
      }
    });

    const excelReportService = require('../services/excelReportService');
    const audits = await Promise.all(rawAudits.map(async (a) => {
      const resolved = await resolveAuditNames(db, a);
      const completionPercentage = excelReportService.getAuditCompletionPercentage(a);
      return {
        ...a,
        ...resolved,
        auditType: a.auditType || 'Original',
        isReadOnly: a.isReadOnly === true,
        completionPercentage
      };
    }));

    res.status(200).json({ success: true, data: audits });
  } catch (error) {
    console.error('Get Audits Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAuditById = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;
    const { id } = req.params;

    const doc = await db.collection('audits').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const auditData = doc.data();
    if (auditData.vendorId !== vendorId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Resolve names for Customer, Auditor, Vendor
    const resolvedNames = await resolveAuditNames(db, auditData);

    // Ensure full score breakdown is present using scoringService if needed
    const scoringService = require('../services/scoringService');
    const checklistService = require('../services/checklistService');

    const { mergeWithLiveActRules } = require('./adminController');
    const actRulesSnapshot = mergeWithLiveActRules(auditData.actRules);

    let fullData = {
      id: doc.id,
      ...auditData,
      ...resolvedNames,
      auditType: auditData.auditType || 'Original',
      isReadOnly: auditData.isReadOnly === true,
      actRules: actRulesSnapshot
    };

    if ((!fullData.categoryScores || fullData.categoryScores.length === 0 || !fullData.critical) && fullData.responses && Array.isArray(fullData.responses) && fullData.responses.length > 0) {
      try {
        const vendorType = fullData.vendorType || 'other-vendor';
        const checklist = checklistService.getChecklistByVendorType(vendorType, { state: fullData.state, country: fullData.country }) || checklistService.getChecklistByVendorType('other-vendor');
        if (checklist) {
          const calcResult = scoringService.calculateComplianceScore(checklist, fullData.responses);
          fullData.summary = calcResult.summary;
          fullData.categoryScores = calcResult.categoryScores;
          fullData.labourCodes = calcResult.labourCodes;
          fullData.sections = calcResult.sections;
          fullData.critical = calcResult.critical;
          fullData.general = calcResult.general;
        }
      } catch (err) {
        console.warn('On-the-fly score breakdown calculation warn:', err.message);
      }
    }

    res.status(200).json({ success: true, data: fullData });
  } catch (error) {
    console.error('Get Audit By Id Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;
    const { auditId } = req.params;
    const { fileName, fileData, type, formNo, natureOfRegister, files } = req.body; // Supports single file or batch files array

    const auditRef = db.collection('audits').doc(auditId);
    const doc = await auditRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    if (doc.data().vendorId !== vendorId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Support both multiple files in an array or a single file
    const fileItems = Array.isArray(files) && files.length > 0
      ? files
      : (fileName && fileData ? [{ fileName, fileData, type, formNo, natureOfRegister }] : []);

    if (fileItems.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one file and file data are required' });
    }

    const documents = doc.data().documents || [];

    // Convert base64 to buffer and upload to S3
    const s3Service = require('../services/s3Service');
    const { v4: uuidv4 } = require('uuid');
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
    const newDocuments = [];

    for (const item of fileItems) {
      const curFileName = item.fileName;
      const curFileData = item.fileData;
      const curType = item.type || type || 'General';
      const curFormNo = item.formNo !== undefined ? item.formNo : (formNo || '');
      const curNature = item.natureOfRegister !== undefined ? item.natureOfRegister : (natureOfRegister || '');

      if (!curFileName || !curFileData) continue;

      let mimeType = 'application/octet-stream';
      let base64String = curFileData;

      if (curFileData.startsWith('data:')) {
        const parts = curFileData.split(',');
        if (parts.length === 2) {
          const match = parts[0].match(/:(.*?);/);
          if (match) mimeType = match[1];
          base64String = parts[1];
        }
      }

      const fileBuffer = Buffer.from(base64String, 'base64');
      const fileSize = fileBuffer.length;

      if (fileSize > MAX_FILE_SIZE) {
        return res.status(413).json({
          success: false,
          error: `File "${curFileName}" exceeds maximum size limit of 5MB`
        });
      }

      const docId = `doc_${uuidv4()}`;
      const s3Key = `audits/${auditId}/documents/${vendorId}/${docId}_${curFileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      await s3Service.uploadToS3(s3Key, fileBuffer, mimeType);

      // Save metadata in Firestore
      await db.collection('documents').doc(docId).set({
        auditId,
        vendorId,
        fileName: curFileName,
        fileType: mimeType,
        fileSize,
        type: curType,
        formNo: curFormNo,
        natureOfRegister: curNature,
        s3Key,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user.name || 'Vendor'
      });

      const docObj = {
        id: docId,
        fileName: curFileName,
        type: curType,
        formNo: curFormNo,
        natureOfRegister: curNature,
        status: 'Uploaded',
        s3Key,
        uploadedAt: new Date().toISOString()
      };

      documents.push(docObj);
      newDocuments.push(docObj);
    }

    if (newDocuments.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid files could be processed' });
    }

    await auditRef.update({ documents });

    // Sync in-memory audits cache if available
    try {
      const adminController = require('./adminController');
      if (adminController && typeof adminController.invalidateAuditsCache === 'function') {
        adminController.invalidateAuditsCache(auditId, { documents });
      }
    } catch (cacheErr) {
      // ignore
    }

    // Send email & in-app notification to the assigned auditor that document has been uploaded and audit can begin
    try {
      const auditData = doc.data();
      let auditorEmail = auditData.auditorEmail;
      let auditorName = auditData.auditorName || auditData.auditor || 'Auditor';
      const auditorId = auditData.auditorId;

      if (!auditorEmail && auditorId) {
        try {
          const userDoc = await db.collection('users').doc(auditorId).get();
          if (userDoc.exists) {
            const uData = userDoc.data();
            auditorEmail = uData.email || auditorEmail;
            auditorName = uData.fullName || uData.name || auditorName;
          }
        } catch (lookupErr) {
          console.warn('[Vendor Controller]: Could not lookup auditor from users collection:', lookupErr.message);
        }
      }

      const emailService = require('../services/emailService');
      const { formatDate } = require('../utils/dateUtils');
      const vendorName = req.user.name || auditData.vendorName || auditData.vendor || 'Vendor Partner';
      const auditIdString = auditData.auditIdString || auditId;
      const auditPeriod = auditData.auditPeriod || auditData.period || 'Current Period';
      const customerName = auditData.customerName || auditData.customer || 'Enterprise Client';
      const startDate = formatDate(auditData.startDate) || 'N/A';
      const dueDate = formatDate(auditData.dueDate) || 'N/A';
      const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      const docSummary = newDocuments.length === 1
        ? `"${newDocuments[0].fileName}"`
        : `${newDocuments.length} statutory documents`;

      if (auditorEmail) {
        emailService.sendAuditorDocumentUploadedEmail({
          auditorEmail,
          auditorName,
          vendorName,
          customerName,
          auditIdString,
          auditPeriod,
          documentName: docSummary,
          documentType: newDocuments.length === 1 ? (newDocuments[0].type || 'General') : 'Multiple Categories',
          totalDocuments: documents.length,
          startDate,
          dueDate,
          portalUrl
        }).then(emailRes => {
          if (emailRes && emailRes.success) {
            console.log(`[Vendor Controller]: Document upload notification email successfully sent to auditor ${auditorEmail} for audit ${auditIdString}`);
          }
        }).catch(err => {
          console.warn(`[Vendor Controller]: Failed to send document upload notification to auditor ${auditorEmail}:`, err.message);
        });
      }

      if (auditorId) {
        db.collection('notifications').add({
          userId: auditorId,
          role: 'Auditor',
          title: '📁 Vendor Document Uploaded',
          message: `${vendorName} uploaded ${docSummary} for audit ${auditIdString}. You can now begin your audit evaluation.`,
          auditId,
          type: 'document_uploaded',
          read: false,
          createdAt: new Date().toISOString()
        }).catch(notifErr => {
          console.warn('[Vendor Controller]: Could not create in-app notification for auditor:', notifErr.message);
        });
      }
    } catch (notifErr) {
      console.warn('[Vendor Controller]: Error triggering auditor document upload notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: newDocuments.length === 1 ? 'Document uploaded successfully' : `${newDocuments.length} documents uploaded successfully`,
      data: documents
    });
  } catch (error) {
    console.error('Upload Document Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;
    const { auditId } = req.params;

    const doc = await db.collection('audits').doc(auditId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    if (doc.data().vendorId !== vendorId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const documents = doc.data().documents || [];
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    console.error('Get Documents Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getDocumentDownloadUrl = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;
    const { docId } = req.params;

    const docSnapshot = await db.collection('documents').doc(docId).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const docData = docSnapshot.data();

    // Security check: Must belong to this vendor
    if (docData.vendorId !== vendorId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to access this document' });
    }

    // If it's an S3 document, return a pre-signed URL
    if (docData.s3Key) {
      const s3Service = require('../services/s3Service');
      const url = await s3Service.getPresignedUrl(docData.s3Key);
      return res.status(200).json({ success: true, isUrl: true, data: url });
    }

    // If it's a legacy Base64 document, return the Base64 data directly
    if (docData.fileData) {
      return res.status(200).json({ success: true, isUrl: false, data: docData.fileData, fileName: docData.fileName });
    }

    return res.status(404).json({ success: false, error: 'Document content not found' });
  } catch (error) {
    console.error('Get Document URL Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getFindings = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;
    const { auditId } = req.query; // optional filter

    const auditsRef = db.collection('audits');
    let snapshot;

    if (auditId) {
      const doc = await auditsRef.doc(auditId).get();
      if (!doc.exists || doc.data().vendorId !== vendorId) {
        return res.status(404).json({ success: false, error: 'Audit not found or unauthorized' });
      }
      snapshot = [doc]; // Mock snapshot iterable
    } else {
      const qs = await auditsRef.where('vendorId', '==', vendorId).get();
      snapshot = [];
      qs.forEach(d => snapshot.push(d));
    }

    const allFindings = [];

    for (const doc of snapshot) {
      const data = doc.data ? doc.data() : doc;
      if (data.nonCompliantItems && data.nonCompliantItems.length > 0) {
        data.nonCompliantItems.forEach((item, index) => {
          const category = item.category || item.type || 'General';
          const itemText = item.item || item.title || item.particulars || item.statutoryRequirement || 'Audit Requirement Finding';
          allFindings.push({
            id: `finding_${doc.id}_${index}`,
            index: index,
            itemId: item.itemId || item.id || null,
            auditId: doc.id,
            auditPeriod: (data.auditPeriod || data.auditMonth || 'N/A').replace(/[\u2010-\u2015]/g, '-'),
            category: category,
            item: itemText,
            remarks: item.remarks || '',
            status: (item.vendorResponse && String(item.vendorResponse).trim().length > 0) ? 'Responded' : 'Open',
            vendorResponse: item.vendorResponse || null,
            respondedAt: item.respondedAt || null,
            attachmentName: item.attachmentName || (item.attachment ? item.attachment.fileName : null),
            attachmentDocId: item.attachmentDocId || (item.attachment ? (item.attachment.id || item.attachment.docId) : null),
            attachment: item.attachment || null,
            createdAt: data.createdAt
          });
        });
      }
    }

    res.status(200).json({ success: true, data: allFindings });
  } catch (error) {
    console.error('Get Findings Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.respondToFinding = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;
    const {
      auditId,
      itemCategory,
      itemText,
      responseText,
      itemId,
      findingId,
      index,
      attachmentName,
      attachmentData,
      attachmentType
    } = req.body;

    if (!auditId || (!responseText && !attachmentName)) {
      return res.status(400).json({ success: false, error: 'Audit ID and response text or attachment are required' });
    }

    const auditRef = db.collection('audits').doc(auditId);
    const doc = await auditRef.get();

    if (!doc.exists || doc.data().vendorId !== vendorId) {
      return res.status(404).json({ success: false, error: 'Audit not found or unauthorized' });
    }

    const data = doc.data();

    // Security check: Closed audits are read-only
    if (data.status && data.status.toLowerCase() === 'closed') {
      return res.status(403).json({ success: false, error: 'Audit is closed. Cannot submit responses.' });
    }

    // Process attachment upload if provided
    let docId = null;
    let s3Key = null;
    let mimeType = attachmentType || 'application/octet-stream';
    let fileSize = 0;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    if (attachmentName && attachmentData) {
      const s3Service = require('../services/s3Service');
      const { v4: uuidv4 } = require('uuid');

      let base64String = attachmentData;
      if (attachmentData.startsWith('data:')) {
        const parts = attachmentData.split(',');
        if (parts.length === 2) {
          const match = parts[0].match(/:(.*?);/);
          if (match) mimeType = match[1];
          base64String = parts[1];
        }
      }

      const fileBuffer = Buffer.from(base64String, 'base64');
      fileSize = fileBuffer.length;

      if (fileSize > MAX_FILE_SIZE) {
        return res.status(413).json({
          success: false,
          error: `Attachment "${attachmentName}" exceeds maximum limit of 5MB`
        });
      }

      docId = `capa_${uuidv4()}`;
      s3Key = `audits/${auditId}/findings/${vendorId}/${docId}_${attachmentName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      await s3Service.uploadToS3(s3Key, fileBuffer, mimeType);

      // Save record in documents collection so getDocumentDownloadUrl resolves it
      await db.collection('documents').doc(docId).set({
        auditId,
        vendorId,
        fileName: attachmentName,
        fileType: mimeType,
        fileSize,
        type: 'CAPA Finding Proof',
        isFindingAttachment: true,
        s3Key,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user.name || 'Vendor'
      });
    }

    let updated = false;
    let matchedCategory = itemCategory || 'General';

    if (data.nonCompliantItems && data.nonCompliantItems.length > 0) {
      const items = [...data.nonCompliantItems];

      // Matching strategy:
      // 1. By index if provided and within range
      // 2. By findingId suffix
      // 3. By itemId
      // 4. By category + itemText / title / particulars matching
      // 5. Single item fallback
      let matchIdx = -1;

      if (typeof index === 'number' && index >= 0 && index < items.length) {
        matchIdx = index;
      } else if (findingId && findingId.startsWith(`finding_${auditId}_`)) {
        const parsedIdx = parseInt(findingId.replace(`finding_${auditId}_`, ''), 10);
        if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < items.length) {
          matchIdx = parsedIdx;
        }
      }

      if (matchIdx === -1 && itemId) {
        matchIdx = items.findIndex(it => (it.itemId === itemId || it.id === itemId));
      }

      if (matchIdx === -1) {
        matchIdx = items.findIndex(it => {
          const cat = it.category || it.type || 'General';
          const text = it.item || it.title || it.particulars || '';
          return (
            (itemCategory ? cat === itemCategory : true) &&
            (itemText ? text === itemText : true)
          );
        });
      }

      if (matchIdx === -1 && items.length === 1) {
        matchIdx = 0;
      }

      if (matchIdx >= 0 && matchIdx < items.length) {
        items[matchIdx].vendorResponse = (responseText || '').trim();
        items[matchIdx].respondedAt = new Date().toISOString();

        if (docId && attachmentName) {
          items[matchIdx].attachmentName = attachmentName;
          items[matchIdx].attachmentDocId = docId;
          items[matchIdx].attachmentType = mimeType;
          items[matchIdx].attachmentSize = fileSize;
          items[matchIdx].attachment = {
            id: docId,
            docId: docId,
            fileName: attachmentName,
            s3Key: s3Key,
            fileType: mimeType,
            fileSize: fileSize,
            uploadedAt: new Date().toISOString()
          };
        }

        matchedCategory = items[matchIdx].category || items[matchIdx].type || itemCategory || 'General';
        updated = true;
      }

      if (updated) {
        // Log in timeline
        const timeline = data.timeline || [];
        timeline.push({
          event: 'Vendor Responded to Finding',
          status: data.status,
          timestamp: new Date().toISOString(),
          actor: req.user.name || 'Vendor',
          notes: `Vendor responded to finding in ${matchedCategory}${attachmentName ? ` with attachment "${attachmentName}"` : ''}`
        });

        await auditRef.update({
          nonCompliantItems: items,
          timeline
        });

        // Sync in-memory audits cache if available
        try {
          const adminController = require('./adminController');
          if (adminController && typeof adminController.invalidateAuditsCache === 'function') {
            adminController.invalidateAuditsCache(auditId, { nonCompliantItems: items, timeline });
          }
        } catch (cacheErr) {
          // ignore
        }

        return res.status(200).json({ success: true, message: 'Response submitted successfully' });
      }
    }

    res.status(404).json({ success: false, error: 'Finding not found in audit' });
  } catch (error) {
    console.error('Respond to Finding Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getReports = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;

    const snapshot = await db.collection('audits')
      .where('vendorId', '==', vendorId)
      .get();

    const excelReportService = require('../services/excelReportService');
    const reports = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const status = (data.status || '').toLowerCase();
      if (['closed', 'approved', 'released', 'pending sign-off'].includes(status)) {
        const auditObj = { id: doc.id, ...data };
        const completionPercentage = excelReportService.getAuditCompletionPercentage(auditObj);
        reports.push({ ...auditObj, completionPercentage });
      }
    });

    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error('Get Reports Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.downloadReport = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;
    const { auditId } = req.params;

    const doc = await db.collection('audits').doc(auditId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const auditData = doc.data();

    // Security check: Must belong to this vendor
    if (auditData.vendorId !== vendorId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to access this report' });
    }

    // Security check: Must be in closed/approved/released/pending sign-off state
    const status = (auditData.status || '').toLowerCase();
    const allowedStatuses = ['closed', 'approved', 'released', 'pending sign-off'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Report is not available for audit status '${auditData.status}'. Report generation requires completed/closed audit.`
      });
    }

    const s3Service = require('../services/s3Service');
    const pdfReportService = require('../services/pdfReportService');
    const scoringService = require('../services/scoringService');
    const checklistService = require('../services/checklistService');
    const { v4: uuidv4 } = require('uuid');

    // Ensure score breakdown is calculated for PDF
    if ((!auditData.categoryScores || auditData.categoryScores.length === 0 || !auditData.critical) && auditData.responses && Array.isArray(auditData.responses)) {
      try {
        const checklist = checklistService.getChecklistByVendorType(auditData.vendorType || 'other-vendor', { state: auditData.state, country: auditData.country }) || checklistService.getChecklistByVendorType('other-vendor');
        if (checklist) {
          const calcResult = scoringService.calculateComplianceScore(checklist, auditData.responses);
          auditData.summary = calcResult.summary;
          auditData.categoryScores = calcResult.categoryScores;
          auditData.critical = calcResult.critical;
          auditData.general = calcResult.general;
        }
      } catch (e) {
        console.warn('PDF score calc warning:', e.message);
      }
    }

    // Check if report metadata already exists in 'reports' collection
    const reportsRef = db.collection('reports');
    const existingReportSnap = await reportsRef
      .where('auditId', '==', auditId)
      .where('vendorId', '==', vendorId)
      .get();

    let s3Key = null;
    let fileName = `Audit_Report_${auditData.auditPeriod || auditId}_${Date.now()}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
    let reportId = null;

    if (!existingReportSnap.empty) {
      const existingDoc = existingReportSnap.docs[0];
      const data = existingDoc.data();
      s3Key = data.s3Key;
      fileName = data.fileName || fileName;
      reportId = existingDoc.id;
    }

    // If PDF not generated yet or key missing, generate and upload to S3
    if (!s3Key) {
      reportId = `rep_${uuidv4()}`;
      s3Key = `audits/${auditId}/reports/${reportId}_${fileName}`;

      const pdfBuffer = await pdfReportService.generateAuditReportPdf({ id: doc.id, ...auditData });
      await s3Service.uploadToS3(s3Key, pdfBuffer, 'application/pdf');

      // Save report metadata in Firestore
      await db.collection('reports').doc(reportId).set({
        reportId,
        auditId,
        vendorId,
        reportType: 'Final Compliance Audit Report',
        fileName,
        s3Key,
        generatedAt: new Date().toISOString(),
        generatedBy: req.user.name || 'Vendor'
      });
    }

    // Generate temporary AWS S3 pre-signed URL (1 hour expiry)
    const presignedUrl = await s3Service.getPresignedUrl(s3Key, 3600);

    res.status(200).json({
      success: true,
      data: {
        reportId,
        auditId,
        fileName,
        downloadUrl: presignedUrl,
        expiresIn: 3600
      }
    });
  } catch (error) {
    console.error('Download Report Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error generating report' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;

    // In a real app we'd have a notifications collection.
    // Let's derive notifications from audit timeline events for this vendor.
    const snapshot = await db.collection('audits').where('vendorId', '==', vendorId).get();

    let notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.timeline) {
        data.timeline.forEach((event, i) => {
          notifications.push({
            id: `notif_${doc.id}_${i}`,
            title: event.event,
            message: event.notes || `Audit ${data.auditPeriod} status updated to ${event.status}`,
            timestamp: event.timestamp,
            read: true // Mock read status
          });
        });
      }
    });

    // Sort newest first
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getAuditorContact = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;

    // Find active audit
    const snapshot = await db.collection('audits')
      .where('vendorId', '==', vendorId)
      .get();

    let activeAudits = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (['scheduled', 'in progress', 'pending sign-off'].includes((data.status || '').toLowerCase())) {
        activeAudits.push(data);
      }
    });

    if (activeAudits.length === 0 || !activeAudits[0].auditorId) {
      return res.status(404).json({ success: false, error: 'No active auditor assigned' });
    }

    const auditorId = activeAudits[0].auditorId;
    const auditorDoc = await db.collection('users').doc(auditorId).get();

    if (!auditorDoc.exists) {
      return res.status(404).json({ success: false, error: 'Auditor profile not found' });
    }

    const data = auditorDoc.data();
    // Do not expose passwords or unnecessary info
    res.status(200).json({
      success: true,
      data: {
        name: data.name || activeAudits[0].auditorName,
        email: data.email,
        phone: data.phone || 'Not provided',
        specialization: data.specialization || 'Compliance Auditor'
      }
    });
  } catch (error) {
    console.error('Get Auditor Contact Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.downloadAuditExcel = async (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.user.id;
    const { auditId } = req.params;

    if (!auditId) {
      return res.status(400).json({ success: false, error: 'Audit ID is required' });
    }

    let docSnap = await db.collection('audits').doc(auditId).get();
    if (!docSnap.exists) {
      docSnap = await db.collection('compliance_audits').doc(auditId).get();
    }

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }

    const audit = { id: docSnap.id, ...docSnap.data() };

    // Security check: Vendor can ONLY download their own audit
    if (audit.vendorId !== vendorId) {
      return res.status(403).json({ success: false, error: 'Unauthorized access to this audit' });
    }

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
    console.error('downloadAuditExcel Vendor error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error generating Excel workbook' });
  }
};

