const PptxGenJS = require('pptxgenjs');
const excelReportService = require('./excelReportService');

/**
 * Helper to safely extract string values for PPT text & tables,
 * stripping control characters and raw newlines that invalidate OpenXML schema.
 */
function safeStr(val, fallback = 'N/A') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return fallback;
  const cleaned = String(val).replace(/[\r\n\t]+/g, ' ').trim();
  return cleaned || fallback;
}

/**
 * Generate a 10-slide PowerPoint presentation (.pptx) buffer for an audit.
 * Note: LAYOUT_16x9 canvas dimensions are 10.0 inches (W) x 5.625 inches (H).
 * All elements must strictly remain within X:[0..10.0] and Y:[0..5.625].
 */
exports.generateAuditPptBuffer = async (auditData) => {
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Statutory Compliance Platform';
  pptx.title = `${safeStr(auditData.auditIdString || auditData.id, 'AUD-REPORT')} - Overall Audit Presentation`;

  // Hex Colors (Use raw hex strings for table cell fill options)
  const NAVY = '0B1F3A';
  const BLUE = '1565C0';
  const GREEN = '047857';
  const RED = 'DC2626';
  const AMBER = 'B45309';
  const DARK_GRAY = '475569';

  const auditIdStr = safeStr(auditData.auditIdString || auditData.id, 'AUD-REPORT');
  const vendorName = safeStr(auditData.vendorName || auditData.organisation, 'Vendor');
  const auditPeriod = safeStr(auditData.auditPeriod, 'Q3 2026');
  const establishmentType = safeStr(auditData.establishmentType, 'Standard Audit');
  const status = safeStr(auditData.status, 'Scheduled');
  const auditorName = safeStr(auditData.auditorName || auditData.auditor, 'Assigned Auditor');
  const customerName = safeStr(auditData.customerName, 'Customer');
  const completionPercentage = excelReportService.getAuditCompletionPercentage(auditData);
  const score = auditData.score !== undefined && auditData.score !== null ? Number(auditData.score) : null;
  const scoreText = score !== null && !isNaN(score) ? `${Math.round(score)}%` : 'N/A';

  const summary = auditData.summary || {};
  const nonCompliantItems = Array.isArray(auditData.nonCompliantItems) ? auditData.nonCompliantItems : [];
  const categoryScores = Array.isArray(auditData.categoryScores) ? auditData.categoryScores : [];
  const timelineEvents = Array.isArray(auditData.timeline) ? auditData.timeline : [];

  let criticalCount = 0;
  let generalCount = 0;
  nonCompliantItems.forEach(item => {
    if (item && typeof item === 'object') {
      if (item.isCritical) criticalCount++;
      else generalCount++;
    }
  });

  // Common Table Options
  const tableProps = {
    x: 0.5,
    w: 9.0,
    fontSize: 10,
    color: '1E293B',
    border: { pt: 0.5, color: 'CBD5E1' }
  };

  // ----------------------------------------------------
  // SLIDE 1: COVER
  // ----------------------------------------------------
  const slide1 = pptx.addSlide();
  slide1.background = { color: NAVY };

  slide1.addText('OVERALL AUDIT PRESENTATION', {
    x: 0.5, y: 0.8, w: 9.0, h: 0.6,
    fontSize: 28, bold: true, color: 'FFFFFF', fontFace: 'Arial'
  });

  slide1.addText(`Statutory Compliance Audit Report • ${auditPeriod}`, {
    x: 0.5, y: 1.4, w: 9.0, h: 0.4,
    fontSize: 16, color: '93C5FD', fontFace: 'Arial'
  });

  slide1.addShape(pptx.shapes.RECTANGLE, {
    x: 0.5, y: 1.9, w: 9.0, h: 0.04, fill: { color: BLUE }
  });

  slide1.addText([
    { text: 'Vendor Name: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: vendorName, options: { bold: true, color: 'FFFFFF', breakLine: true } },
    { text: 'Audit ID: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: auditIdStr, options: { bold: true, color: 'FFFFFF', breakLine: true } },
    { text: 'Audit Period: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: auditPeriod, options: { bold: true, color: 'FFFFFF', breakLine: true } },
    { text: 'Establishment Type: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: establishmentType, options: { bold: true, color: 'FFFFFF', breakLine: true } },
    { text: 'Audit Status: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: status, options: { bold: true, color: '34D399', breakLine: false } }
  ], { x: 0.5, y: 2.2, w: 9.0, h: 2.8, fontSize: 14, fontFace: 'Arial', lineSpacing: 22 });

  // ----------------------------------------------------
  // SLIDE 2: EXECUTIVE SUMMARY
  // ----------------------------------------------------
  const slide2 = pptx.addSlide();
  slide2.addText('Executive Summary', {
    x: 0.5, y: 0.4, w: 9.0, h: 0.5,
    fontSize: 22, bold: true, color: NAVY, fontFace: 'Arial'
  });
  slide2.addText('High-level overview of statutory compliance performance metrics', {
    x: 0.5, y: 0.9, w: 9.0, h: 0.3,
    fontSize: 12, color: DARK_GRAY, fontFace: 'Arial'
  });

  const cards = [
    { title: 'COMPLIANCE SCORE', val: scoreText, color: GREEN, bg: 'ECFDF5' },
    { title: 'AUDIT COMPLETION', val: `${completionPercentage}%`, color: BLUE, bg: 'EFF6FF' },
    { title: 'CRITICAL FINDINGS', val: `${criticalCount}`, color: RED, bg: 'FEF2F2' },
    { title: 'GENERAL FINDINGS', val: `${generalCount}`, color: AMBER, bg: 'FFFBEB' }
  ];

  cards.forEach((c, idx) => {
    const xPos = 0.5 + (idx * 2.3);
    slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: xPos, y: 1.3, w: 2.1, h: 1.3, fill: { color: c.bg }, line: { color: c.color }
    });
    slide2.addText(c.title, {
      x: xPos + 0.05, y: 1.45, w: 2.0, h: 0.25,
      fontSize: 9, bold: true, color: DARK_GRAY, fontFace: 'Arial', align: 'center'
    });
    slide2.addText(c.val, {
      x: xPos + 0.05, y: 1.75, w: 2.0, h: 0.6,
      fontSize: 24, bold: true, color: c.color, fontFace: 'Arial', align: 'center'
    });
  });

  const totalReqVal = typeof summary.totalItems === 'number' ? summary.totalItems : safeStr(auditData.totalRequirements);
  const compliantVal = typeof summary.compliantItems === 'number' ? summary.compliantItems : (typeof summary.compliantCount === 'number' ? summary.compliantCount : 'N/A');
  const nonCompliantVal = typeof summary.nonCompliantItems === 'number' ? summary.nonCompliantItems : nonCompliantItems.length;
  const naVal = typeof summary.naItems === 'number' ? summary.naItems : (typeof summary.naCount === 'number' ? summary.naCount : 'N/A');

  const execRows = [
    [
      { text: 'Metric', options: { bold: true, fill: NAVY, color: 'FFFFFF' } },
      { text: 'Result Value', options: { bold: true, fill: NAVY, color: 'FFFFFF' } }
    ],
    [{ text: 'Total Requirements Evaluated' }, { text: safeStr(totalReqVal) }],
    [{ text: 'Compliant Requirements' }, { text: safeStr(compliantVal) }],
    [{ text: 'Non-Compliant Findings' }, { text: safeStr(nonCompliantVal) }],
    [{ text: 'Not Applicable (N/A)' }, { text: safeStr(naVal) }],
    [{ text: 'Audit Final Status' }, { text: status }]
  ];
  slide2.addTable(execRows, { ...tableProps, y: 2.8, colW: [5.0, 4.0] });

  // ----------------------------------------------------
  // SLIDE 3: AUDIT INFORMATION
  // ----------------------------------------------------
  const slide3 = pptx.addSlide();
  slide3.addText('Audit Information & Scope', {
    x: 0.5, y: 0.4, w: 9.0, h: 0.5,
    fontSize: 22, bold: true, color: NAVY, fontFace: 'Arial'
  });

  const infoTableRows = [
    [{ text: 'Attribute', options: { bold: true, fill: BLUE, color: 'FFFFFF' } }, { text: 'Details', options: { bold: true, fill: BLUE, color: 'FFFFFF' } }],
    [{ text: 'Audit ID' }, { text: auditIdStr }],
    [{ text: 'Vendor Name' }, { text: vendorName }],
    [{ text: 'Customer / Client' }, { text: customerName }],
    [{ text: 'Assigned Auditor' }, { text: auditorName }],
    [{ text: 'Establishment Type' }, { text: establishmentType }],
    [{ text: 'Audit Period' }, { text: auditPeriod }],
    [{ text: 'Start Date' }, { text: safeStr(auditData.startDate) }],
    [{ text: 'Due / Completion Date' }, { text: safeStr(auditData.dueDate) }],
    [{ text: 'Audit Status' }, { text: status }]
  ];
  slide3.addTable(infoTableRows, { ...tableProps, y: 1.1, colW: [3.5, 5.5], fontSize: 9 });

  // ----------------------------------------------------
  // SLIDE 4: COMPLIANCE OVERVIEW
  // ----------------------------------------------------
  const slide4 = pptx.addSlide();
  slide4.addText('Compliance Overview & Evaluation Breakdown', {
    x: 0.5, y: 0.4, w: 9.0, h: 0.5,
    fontSize: 22, bold: true, color: NAVY, fontFace: 'Arial'
  });

  const overviewRows = [
    [{ text: 'Category', options: { bold: true, fill: NAVY, color: 'FFFFFF' } }, { text: 'Score / Count', options: { bold: true, fill: NAVY, color: 'FFFFFF' } }, { text: 'Evaluation Notes', options: { bold: true, fill: NAVY, color: 'FFFFFF' } }],
    [{ text: 'Overall Compliance Score' }, { text: scoreText }, { text: 'Engine score calculated against statutory requirements' }],
    [{ text: 'Critical Non-Compliance Count' }, { text: `${criticalCount}` }, { text: 'High severity non-compliant findings' }],
    [{ text: 'General Non-Compliance Count' }, { text: `${generalCount}` }, { text: 'Standard operational findings' }],
    [{ text: 'Audit Completion' }, { text: `${completionPercentage}%` }, { text: 'Single source of truth completion percentage' }]
  ];
  slide4.addTable(overviewRows, { ...tableProps, y: 1.2, colW: [3.0, 2.0, 4.0] });

  // ----------------------------------------------------
  // SLIDE 5: LABOUR CODE PERFORMANCE
  // ----------------------------------------------------
  const slide5 = pptx.addSlide();
  slide5.addText('Labour Code Performance', {
    x: 0.5, y: 0.4, w: 9.0, h: 0.5,
    fontSize: 22, bold: true, color: NAVY, fontFace: 'Arial'
  });

  if (categoryScores.length > 0) {
    const catRows = [
      [{ text: 'Labour Code / Category', options: { bold: true, fill: BLUE, color: 'FFFFFF' } }, { text: 'Compliance Score', options: { bold: true, fill: BLUE, color: 'FFFFFF' } }]
    ];
    categoryScores.forEach(cs => {
      if (cs && typeof cs === 'object') {
        const catName = cs.category || cs.categoryName || cs.name || cs.labourCode || 'Category';
        const catScore = cs.score != null ? `${Math.round(Number(cs.score))}%` : 'N/A';
        catRows.push([
          { text: safeStr(catName) },
          { text: safeStr(catScore) }
        ]);
      }
    });
    slide5.addTable(catRows, { ...tableProps, y: 1.2, colW: [6.0, 3.0] });
  } else {
    slide5.addText('No detailed Labour Code category scores recorded.', {
      x: 0.5, y: 1.5, w: 9.0, h: 0.8, fontSize: 14, color: DARK_GRAY, fontFace: 'Arial'
    });
  }

  // ----------------------------------------------------
  // SLIDE 6: SECTION PERFORMANCE
  // ----------------------------------------------------
  const slide6 = pptx.addSlide();
  slide6.addText('Section-Wise Performance Breakdown', {
    x: 0.5, y: 0.4, w: 9.0, h: 0.5,
    fontSize: 22, bold: true, color: NAVY, fontFace: 'Arial'
  });

  if (categoryScores.length > 0) {
    const secRows = [
      [{ text: 'Section / Code', options: { bold: true, fill: NAVY, color: 'FFFFFF' } }, { text: 'Score', options: { bold: true, fill: NAVY, color: 'FFFFFF' } }, { text: 'Status', options: { bold: true, fill: NAVY, color: 'FFFFFF' } }]
    ];
    categoryScores.forEach(cs => {
      if (cs && typeof cs === 'object') {
        const secName = cs.category || cs.section || cs.categoryName || cs.name || 'Section';
        const secScoreVal = cs.score != null ? Math.round(Number(cs.score)) : null;
        const secScoreText = secScoreVal != null ? `${secScoreVal}%` : 'N/A';
        const secStatus = secScoreVal != null ? (secScoreVal >= 80 ? 'Compliant' : 'Needs Action') : 'N/A';
        secRows.push([
          { text: safeStr(secName) },
          { text: safeStr(secScoreText) },
          { text: safeStr(secStatus) }
        ]);
      }
    });
    slide6.addTable(secRows, { ...tableProps, y: 1.2, colW: [4.5, 2.0, 2.5] });
  } else {
    slide6.addText('No section performance breakdown available.', {
      x: 0.5, y: 1.5, w: 9.0, h: 0.8, fontSize: 14, color: DARK_GRAY, fontFace: 'Arial'
    });
  }

  // ----------------------------------------------------
  // SLIDE 7: FINDINGS SUMMARY
  // ----------------------------------------------------
  const slide7 = pptx.addSlide();
  slide7.addText('Non-Compliant Findings Summary', {
    x: 0.5, y: 0.4, w: 9.0, h: 0.5,
    fontSize: 22, bold: true, color: NAVY, fontFace: 'Arial'
  });

  if (nonCompliantItems.length > 0) {
    const findingRows = [
      [
        { text: '#', options: { bold: true, fill: NAVY, color: 'FFFFFF' } },
        { text: 'Category', options: { bold: true, fill: NAVY, color: 'FFFFFF' } },
        { text: 'Requirement / Particulars', options: { bold: true, fill: NAVY, color: 'FFFFFF' } },
        { text: 'Severity', options: { bold: true, fill: NAVY, color: 'FFFFFF' } },
        { text: 'Vendor Response', options: { bold: true, fill: NAVY, color: 'FFFFFF' } }
      ]
    ];

    nonCompliantItems.slice(0, 7).forEach((item, idx) => {
      if (item && typeof item === 'object') {
        const cat = item.category || item.act || item.law || item.labourCode || 'General';
        const reqText = item.requirement || item.lawTitle || item.particulars || item.section || 'Non-compliance observed';
        const sevText = item.isCritical ? 'Critical' : (item.severity || 'General');
        const respText = typeof item.vendorResponse === 'string' ? item.vendorResponse : (item.remediationStatus || 'Pending Response');
        findingRows.push([
          { text: `${idx + 1}` },
          { text: safeStr(cat) },
          { text: safeStr(reqText) },
          { text: safeStr(sevText) },
          { text: safeStr(respText) }
        ]);
      }
    });

    slide7.addTable(findingRows, { ...tableProps, y: 1.1, colW: [0.5, 2.0, 3.5, 1.2, 1.8], fontSize: 8.5 });
  } else {
    slide7.addText('No non-compliant findings recorded for this audit.', {
      x: 0.5, y: 1.5, w: 9.0, h: 0.8, fontSize: 14, color: GREEN, fontFace: 'Arial'
    });
  }

  // ----------------------------------------------------
  // SLIDE 8: CRITICAL FINDINGS
  // ----------------------------------------------------
  const slide8 = pptx.addSlide();
  slide8.addText('Critical Findings & High Severity Non-Compliances', {
    x: 0.5, y: 0.4, w: 9.0, h: 0.5,
    fontSize: 22, bold: true, color: RED, fontFace: 'Arial'
  });

  const criticalItems = nonCompliantItems.filter(i => i && typeof i === 'object' && i.isCritical);
  if (criticalItems.length > 0) {
    const critRows = [
      [
        { text: '#', options: { bold: true, fill: RED, color: 'FFFFFF' } },
        { text: 'Category', options: { bold: true, fill: RED, color: 'FFFFFF' } },
        { text: 'Critical Requirement', options: { bold: true, fill: RED, color: 'FFFFFF' } },
        { text: 'Auditor Observation', options: { bold: true, fill: RED, color: 'FFFFFF' } }
      ]
    ];
    criticalItems.slice(0, 6).forEach((ci, idx) => {
      const cat = ci.category || ci.act || ci.law || ci.labourCode || 'Statutory Code';
      const reqText = ci.requirement || ci.lawTitle || ci.particulars || ci.section || 'Critical Item';
      const obsText = ci.observation || ci.remarks || ci.correctiveAction || 'High risk non-compliance';
      critRows.push([
        { text: `${idx + 1}` },
        { text: safeStr(cat) },
        { text: safeStr(reqText) },
        { text: safeStr(obsText) }
      ]);
    });
    slide8.addTable(critRows, { ...tableProps, y: 1.1, colW: [0.5, 2.2, 3.3, 3.0], fontSize: 8.5 });
  } else {
    slide8.addText('✓ No critical findings recorded for this audit.', {
      x: 0.5, y: 1.8, w: 9.0, h: 0.8, fontSize: 18, bold: true, color: GREEN, fontFace: 'Arial'
    });
  }

  // ----------------------------------------------------
  // SLIDE 9: AUDIT TIMELINE & MILESTONES
  // ----------------------------------------------------
  const slide9 = pptx.addSlide();
  slide9.addText('Audit Lifecycle & Timeline Milestones', {
    x: 0.5, y: 0.4, w: 9.0, h: 0.5,
    fontSize: 22, bold: true, color: NAVY, fontFace: 'Arial'
  });

  if (timelineEvents.length > 0) {
    const tRows = [
      [
        { text: 'Milestone Event', options: { bold: true, fill: BLUE, color: 'FFFFFF' } },
        { text: 'Timestamp', options: { bold: true, fill: BLUE, color: 'FFFFFF' } },
        { text: 'Actor', options: { bold: true, fill: BLUE, color: 'FFFFFF' } },
        { text: 'Notes', options: { bold: true, fill: BLUE, color: 'FFFFFF' } }
      ]
    ];
    timelineEvents.slice(0, 7).forEach(te => {
      if (te && typeof te === 'object') {
        const evName = te.event || te.title || 'Audit Event';
        let dateStr = 'N/A';
        if (te.timestamp) {
          try {
            const d = new Date(te.timestamp);
            dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString() : String(te.timestamp);
          } catch (e) {
            dateStr = String(te.timestamp);
          }
        }
        const actorStr = te.actor || 'System';
        const notesStr = te.notes || te.description || 'Activity logged';
        tRows.push([
          { text: safeStr(evName) },
          { text: safeStr(dateStr) },
          { text: safeStr(actorStr) },
          { text: safeStr(notesStr) }
        ]);
      }
    });
    slide9.addTable(tRows, { ...tableProps, y: 1.1, colW: [2.5, 1.8, 1.7, 3.0], fontSize: 8.5 });
  } else {
    slide9.addText('Standard Audit Lifecycle Milestones recorded.', {
      x: 0.5, y: 1.5, w: 9.0, h: 0.8, fontSize: 14, color: DARK_GRAY, fontFace: 'Arial'
    });
  }

  // ----------------------------------------------------
  // SLIDE 10: AUDIT RESULT & CONCLUSION
  // ----------------------------------------------------
  const slide10 = pptx.addSlide();
  slide10.background = { color: NAVY };

  slide10.addText('AUDIT FINAL RESULT & CONCLUSION', {
    x: 0.5, y: 0.8, w: 9.0, h: 0.6,
    fontSize: 24, bold: true, color: 'FFFFFF', fontFace: 'Arial'
  });

  slide10.addShape(pptx.shapes.RECTANGLE, {
    x: 0.5, y: 1.5, w: 9.0, h: 0.04, fill: { color: BLUE }
  });

  slide10.addText([
    { text: 'Audit ID: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: auditIdStr, options: { bold: true, color: 'FFFFFF', breakLine: true } },
    { text: 'Vendor Name: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: vendorName, options: { bold: true, color: 'FFFFFF', breakLine: true } },
    { text: 'Audit Period: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: auditPeriod, options: { bold: true, color: 'FFFFFF', breakLine: true } },
    { text: 'Final Compliance Score: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: scoreText, options: { bold: true, color: '34D399', breakLine: true } },
    { text: 'Overall Audit Status: ', options: { bold: true, color: '94A3B8', breakLine: false } },
    { text: status, options: { bold: true, color: '60A5FA', breakLine: false } }
  ], { x: 0.5, y: 1.8, w: 9.0, h: 3.0, fontSize: 16, fontFace: 'Arial', lineSpacing: 24 });

  slide10.addText('Report generated by Statutory Compliance Platform', {
    x: 0.5, y: 5.0, w: 9.0, h: 0.3,
    fontSize: 11, italic: true, color: '94A3B8', fontFace: 'Arial'
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer;
};
