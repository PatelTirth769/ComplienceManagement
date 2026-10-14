const XLSX = require('xlsx');
const checklistService = require('./checklistService');
const scoringService = require('./scoringService');

/**
 * Calculates completion percentage for an audit doc.
 * @param {Object} audit 
 * @returns {number} 0 to 100
 */
function getAuditCompletionPercentage(audit) {
  if (!audit) return 0;

  const s = (audit.status || '').toLowerCase();

  // ONLY Closed, Completed, Approved audits are 100% finished
  if (['closed', 'approved', 'completed'].includes(s)) {
    return 100;
  }

  const items = audit.nonCompliantItems || [];
  if (!Array.isArray(items) || items.length === 0) {
    if (s === 'pending sign-off' || s === 'under review') return 100;
    if (s === 'in progress') return 60;
    if (s === 'scheduled') return 15;
    return 0;
  }

  const respondedCount = items.filter((i) => 
    i && ((i.vendorResponse && String(i.vendorResponse).trim().length > 0) || i.status === 'Responded')
  ).length;

  if (s === 'pending sign-off' || s === 'under review') {
    if (respondedCount >= items.length) return 100;
    return Math.min(99, 80 + Math.round((respondedCount / items.length) * 20));
  }

  if (s === 'in progress') {
    return Math.min(79, 50 + Math.round((respondedCount / items.length) * 30));
  }

  if (s === 'scheduled') {
    return 15;
  }

  return 0;
}

/**
 * Generates a multi-sheet Excel workbook buffer for a complete audit.
 * @param {Object} audit - Complete audit record from Firestore
 * @param {Array} relatedDocs - Documents array/snapshot data
 * @returns {Buffer} Excel file buffer (.xlsx)
 */
function generateAuditExcelBuffer(audit, relatedDocs = []) {
  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // SHEET 1 — Audit Summary
  // ----------------------------------------------------
  const summary = audit.summary || {};
  const summaryRows = [
    ['COMPLIANCE AUDIT COMPLETE REPORT', ''],
    ['Generated At', new Date().toISOString()],
    ['', ''],
    ['METRIC / PROPERTY', 'VALUE'],
    ['Audit ID', audit.auditIdString || audit.id],
    ['Audit Period', audit.auditPeriod || 'N/A'],
    ['Vendor Name', audit.vendorName || audit.organisation || 'N/A'],
    ['Vendor ID', audit.vendorId || 'N/A'],
    ['Customer / Client', audit.customerName || audit.organisation || 'N/A'],
    ['Auditor Name', audit.auditorName || audit.auditor || 'N/A'],
    ['Auditor ID', audit.auditorId || 'N/A'],
    ['Start Date', audit.startDate || 'N/A'],
    ['Due Date', audit.dueDate || 'N/A'],
    ['Completion Date', audit.closedAt || audit.submittedAt || audit.updatedAt || new Date().toISOString()],
    ['Establishment Type', audit.establishmentType || 'General'],
    ['Site / Location', audit.site || audit.location || 'Default Site'],
    ['Audit Status', audit.status || 'Closed'],
    ['Audit Completion Progress', '100%'],
    ['Overall Compliance Score', audit.score !== null && audit.score !== undefined ? `${Math.round(audit.score)}%` : 'N/A'],
    ['Total Requirements', summary.totalItems || 0],
    ['Applicable Items', summary.applicableItems || 0],
    ['Compliant Items', summary.compliantItems || 0],
    ['Non-Compliant Items', summary.nonCompliantItems || 0],
    ['N/A Items', summary.naItems || 0]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  // Column widths for Sheet 1
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Audit Summary');

  // ----------------------------------------------------
  // SHEET 2 — Compliance Checklist
  // ----------------------------------------------------
  const vendorType = audit.vendorType || 'other-vendor';
  const checklist = checklistService.getChecklistByVendorType(vendorType) || [];
  
  // Normalize responses into map
  const respMap = {};
  if (Array.isArray(audit.responses)) {
    audit.responses.forEach(r => {
      if (r && r.itemId) respMap[r.itemId] = r;
    });
  } else if (audit.responses && typeof audit.responses === 'object') {
    Object.entries(audit.responses).forEach(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        respMap[k] = v;
      } else if (typeof v === 'string') {
        respMap[k] = { itemId: k, status: v };
      }
    });
  }

  const checklistExportRows = checklist.map((item, idx) => {
    const resp = respMap[item.id] || {};
    const status = resp.status || 'NA';
    return {
      'S.No': item.serialNumber || (idx + 1),
      'Labour Code': item.type || 'General',
      'Category': item.category || item.type || 'Standard',
      'Factory / S&E': item.establishmentType || 'All',
      'Criticality': item.isCritical ? 'Critical' : 'General',
      'Section': item.section || 'General Compliance',
      'Compliance Question / Requirement': item.title || item.particulars || item.statutoryRequirement || '',
      'Auditor Response': status,
      'Auditor Observation': resp.remarks || resp.observation || '',
      'Auditor Remarks': resp.remarks || '',
      'Compliance Status': status === 'COMPLIANT' ? 'Pass' : status === 'NON_COMPLIANT' ? 'Fail' : 'N/A',
      'Score': status === 'COMPLIANT' ? 100 : status === 'NON_COMPLIANT' ? 0 : 'N/A'
    };
  });

  const wsChecklist = XLSX.utils.json_to_sheet(checklistExportRows.length > 0 ? checklistExportRows : [{ 'Notice': 'No checklist data available' }]);
  wsChecklist['!cols'] = [
    { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
    { wch: 25 }, { wch: 50 }, { wch: 15 }, { wch: 35 }, { wch: 35 },
    { wch: 15 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, wsChecklist, 'Compliance Checklist');

  // ----------------------------------------------------
  // SHEET 3 — Score Breakdown
  // ----------------------------------------------------
  let catScores = audit.categoryScores || [];
  if ((!catScores || catScores.length === 0) && checklist.length > 0 && Object.keys(respMap).length > 0) {
    try {
      const respArray = Object.keys(respMap).map(k => ({
        itemId: k,
        status: respMap[k].status || 'COMPLIANT',
        remarks: respMap[k].remarks || (respMap[k].status === 'NON_COMPLIANT' ? 'Non-compliant requirement' : '')
      }));
      const calcResult = scoringService.calculateComplianceScore(checklist, respArray);
      catScores = calcResult.categoryScores || [];
    } catch (e) {
      console.warn('Excel score recalc warn:', e.message);
    }
  }

  const scoreRows = (catScores || []).map(cs => ({
    'Category / Labour Code': cs.category || 'General',
    'Total Items': cs.totalItems || 0,
    'Applicable Items': cs.applicableItems || 0,
    'Compliant Items': cs.compliantItems || 0,
    'Non-Compliant Items': cs.nonCompliantItems || 0,
    'N/A Items': cs.naItems || 0,
    'Compliance Score (%)': cs.scoreDisplay || (cs.score !== null ? `${Math.round(cs.score)}%` : 'N/A')
  }));

  const wsScores = XLSX.utils.json_to_sheet(scoreRows.length > 0 ? scoreRows : [{ 'Overall Score': audit.score ? `${audit.score}%` : 'N/A' }]);
  wsScores['!cols'] = [
    { wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsScores, 'Score Breakdown');

  // ----------------------------------------------------
  // SHEET 4 — Findings
  // ----------------------------------------------------
  const nonCompliantList = audit.nonCompliantItems || [];
  const findingsRows = (nonCompliantList || []).map((nc, i) => ({
    'Finding ID': `FIND-${audit.auditIdString || audit.id}-${i + 1}`,
    'Item ID': nc.itemId || nc.id || `ITEM-${i + 1}`,
    'Labour Code / Type': nc.type || 'General',
    'Requirement': nc.title || nc.particulars || 'Compliance Requirement',
    'Auditor Observation': nc.remarks || nc.observation || 'Non-compliant observation noted during audit',
    'Severity': nc.isCritical ? 'High / Critical' : 'Medium',
    'Finding Status': 'Open Action Item',
    'Auditor Recommendation': 'Rectify non-compliance and submit proof of closure',
    'Vendor Response': nc.vendorResponse || 'Pending vendor response',
    'Corrective Action': nc.correctiveAction || 'Pending corrective action'
  }));

  const wsFindings = XLSX.utils.json_to_sheet(findingsRows.length > 0 ? findingsRows : [{ 'Notice': 'No non-compliance findings for this audit.' }]);
  wsFindings['!cols'] = [
    { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 40 }, { wch: 35 },
    { wch: 15 }, { wch: 18 }, { wch: 40 }, { wch: 30 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsFindings, 'Findings');

  // ----------------------------------------------------
  // SHEET 5 — Timeline
  // ----------------------------------------------------
  const timelineEvents = audit.timeline || [
    { event: 'Audit Scheduled', status: 'Scheduled', timestamp: audit.startDate || audit.createdAt, actor: audit.auditorName || 'Admin' },
    { event: 'Auditor Submitted', status: 'Pending Sign-off', timestamp: audit.submittedAt || audit.createdAt, actor: audit.auditorName || 'Auditor' },
    { event: 'Audit Closed & Approved', status: 'Closed', timestamp: audit.closedAt || audit.updatedAt, actor: 'Admin' }
  ];

  const timelineRows = timelineEvents.map((t, idx) => ({
    'Milestone / Event': t.event || `Milestone ${idx + 1}`,
    'Status': t.status || 'Completed',
    'Date & Time': t.timestamp ? new Date(t.timestamp).toLocaleString() : 'N/A',
    'Completed By / Actor': t.actor || 'System',
    'Notes / Description': t.notes || t.description || 'Milestone logged'
  }));

  const wsTimeline = XLSX.utils.json_to_sheet(timelineRows);
  wsTimeline['!cols'] = [
    { wch: 25 }, { wch: 18 }, { wch: 25 }, { wch: 22 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTimeline, 'Timeline');

  // ----------------------------------------------------
  // SHEET 6 — Documents / Evidence
  // ----------------------------------------------------
  const docsList = relatedDocs.length > 0 ? relatedDocs : (audit.documents || []);
  const docsRows = docsList.map((d, i) => ({
    'Document ID': d.id || d.docId || `DOC-${i + 1}`,
    'File Name': d.fileName || 'Document File',
    'Category / Type': d.type || d.fileType || 'General Evidence',
    'Uploaded By': d.uploadedBy || d.uploader || 'Vendor / Auditor',
    'Upload Date': d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : 'N/A',
    'Status': d.status || 'Verified',
    'S3 Key Reference': d.s3Key || `audits/${audit.id}/documents/${d.fileName}`
  }));

  const wsDocs = XLSX.utils.json_to_sheet(docsRows.length > 0 ? docsRows : [{ 'Notice': 'No uploaded documents attached to this audit.' }]);
  wsDocs['!cols'] = [
    { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 50 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDocs, 'Documents & Evidence');

  // Write workbook to buffer
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
}

module.exports = {
  getAuditCompletionPercentage,
  generateAuditExcelBuffer
};
