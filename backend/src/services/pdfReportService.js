const PDFDocument = require('pdfkit');

/**
 * Generates a production-ready PDF Audit Report Buffer from real audit data.
 * @param {Object} audit - Audit data object
 * @returns {Promise<Buffer>} PDF Buffer
 */
function generateAuditReportPdf(audit) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', err => reject(err));

      const primaryColor = '#0B1F3A';
      const secondaryColor = '#1565C0';
      const grayColor = '#475569';
      const lightBg = '#F8FAFC';
      const borderColor = '#E2E8F0';

      // --- PAGE 1: HEADER & OVERVIEW ---
      // Document Title
      doc.rect(40, 40, 515, 60).fill(primaryColor);
      doc.fillColor('#FFFFFF')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('LABOUR COMPLIANCE AUDIT FINAL REPORT', 55, 55);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#93C5FD')
         .text(`Audit Period: ${audit.auditPeriod || 'N/A'}  |  Audit ID: ${audit.auditIdString || audit.id || 'N/A'}`, 55, 78);

      doc.moveDown(2);

      // Status Badge & Date
      let currentY = 115;
      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('1. AUDIT SNAPSHOT & GENERAL INFORMATION', 40, currentY);

      currentY += 20;

      // Metadata Grid Table
      const metadata = [
        [ 'Customer / Organisation:', audit.organisation || audit.customerName || 'N/A', 'Establishment Type:', audit.establishmentType || audit.vendorType || 'General' ],
        [ 'Vendor Name:', audit.vendorName || 'N/A', 'Site / Location:', audit.site || 'N/A' ],
        [ 'Assigned Auditor:', audit.auditorName || audit.auditor || 'N/A', 'Audit Month / Date:', audit.auditMonth || audit.auditDate || 'N/A' ],
        [ 'Vendor Representative:', audit.vendorRepresentative || 'N/A', 'Client Representative:', audit.clientRepresentative || 'N/A' ],
        [ 'Audit Status:', (audit.status || 'CLOSED').toUpperCase(), 'Employee Count:', String(audit.employeeCount || 'N/A') ]
      ];

      doc.fontSize(9).font('Helvetica');
      metadata.forEach((row, i) => {
        const y = currentY + (i * 20);
        doc.rect(40, y, 515, 20).fill(i % 2 === 0 ? lightBg : '#FFFFFF');
        
        doc.fillColor(grayColor).font('Helvetica-Bold').text(row[0], 48, y + 5);
        doc.fillColor(primaryColor).font('Helvetica').text(row[1], 160, y + 5, { width: 110, height: 15, ellipsis: true });
        
        doc.fillColor(grayColor).font('Helvetica-Bold').text(row[2], 280, y + 5);
        doc.fillColor(primaryColor).font('Helvetica').text(row[3], 400, y + 5, { width: 145, height: 15, ellipsis: true });
      });

      currentY += (metadata.length * 20) + 25;

      // --- SECTION 2: EXECUTIVE COMPLIANCE SCORE ---
      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('2. EXECUTIVE COMPLIANCE SCORES', 40, currentY);

      currentY += 20;

      const summary = audit.summary || {};
      const scoreVal = audit.score != null ? Math.round(audit.score) : (summary.score != null ? Math.round(summary.score) : 'N/A');
      const scoreStr = typeof scoreVal === 'number' ? `${scoreVal}%` : 'N/A';

      // Score Callout Box
      doc.rect(40, currentY, 140, 75).fill(secondaryColor);
      doc.fillColor('#FFFFFF').fontSize(28).font('Helvetica-Bold').text(scoreStr, 40, currentY + 18, { align: 'center', width: 140 });
      doc.fontSize(9).font('Helvetica').text('OVERALL SCORE', 40, currentY + 52, { align: 'center', width: 140 });

      // Metrics Summary Table next to score box
      const metricsY = currentY;
      const metrics = [
        ['Total Requirements', String(summary.totalItems || audit.totalRequirements || 0)],
        ['Applicable Items', String(summary.applicableItems || audit.applicableItems || 0)],
        ['Compliant Items', String(summary.compliantItems || audit.compliantItems || 0)],
        ['Non-Compliant Items', String(summary.nonCompliantItems ? summary.nonCompliantItems.length : 0)],
        ['N/A Items', String(summary.naItems || 0)]
      ];

      metrics.forEach((m, idx) => {
        const my = metricsY + (idx * 15);
        doc.rect(190, my, 365, 15).fill(idx % 2 === 0 ? lightBg : '#FFFFFF');
        doc.fillColor(grayColor).font('Helvetica').fontSize(8.5).text(m[0], 200, my + 3);
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text(m[1], 480, my + 3, { align: 'right', width: 65 });
      });

      currentY += 90;

      // Critical vs General Scores Breakdown
      const crit = audit.critical || {};
      const gen = audit.general || {};

      doc.rect(40, currentY, 250, 45).fill('#FEF2F2').stroke('#FECACA');
      doc.fillColor('#991B1B').font('Helvetica-Bold').fontSize(10).text('Critical Compliance Score', 50, currentY + 10);
      doc.fillColor('#991B1B').font('Helvetica-Bold').fontSize(16).text(crit.scoreDisplay || 'N/A', 50, currentY + 23);
      doc.fillColor('#7F1D1D').font('Helvetica').fontSize(8).text(`Compliant: ${crit.compliantItems || 0} / ${crit.applicableItems || 0}`, 170, currentY + 27);

      doc.rect(305, currentY, 250, 45).fill('#EFF6FF').stroke('#BFDBFE');
      doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(10).text('General Compliance Score', 315, currentY + 10);
      doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(16).text(gen.scoreDisplay || 'N/A', 315, currentY + 23);
      doc.fillColor('#1E3A8A').font('Helvetica').fontSize(8).text(`Compliant: ${gen.compliantItems || 0} / ${gen.applicableItems || 0}`, 435, currentY + 27);

      currentY += 60;

      // --- SECTION 3: LABOUR CODE & SECTION BREAKDOWN ---
      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('3. LABOUR CODE & SECTION BREAKDOWN', 40, currentY);

      currentY += 20;

      const categoryScores = audit.categoryScores || audit.labourCodes || [];

      // Table Header
      doc.rect(40, currentY, 515, 20).fill(primaryColor);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
      doc.text('Labour Code / Category', 48, currentY + 5);
      doc.text('Total', 220, currentY + 5, { width: 45, align: 'center' });
      doc.text('Applicable', 270, currentY + 5, { width: 60, align: 'center' });
      doc.text('Compliant', 335, currentY + 5, { width: 55, align: 'center' });
      doc.text('Non-Compliant', 395, currentY + 5, { width: 75, align: 'center' });
      doc.text('Score', 480, currentY + 5, { width: 65, align: 'right' });

      currentY += 20;

      if (categoryScores.length > 0) {
        categoryScores.forEach((cat, i) => {
          if (currentY > 730) {
            doc.addPage();
            currentY = 40;
          }
          doc.rect(40, currentY, 515, 18).fill(i % 2 === 0 ? lightBg : '#FFFFFF');
          doc.fillColor(primaryColor).font('Helvetica').fontSize(8);
          doc.text(cat.category || 'General', 48, currentY + 4, { width: 170, ellipsis: true });
          doc.text(String(cat.totalItems || 0), 220, currentY + 4, { width: 45, align: 'center' });
          doc.text(String(cat.applicableItems || 0), 270, currentY + 4, { width: 60, align: 'center' });
          doc.text(String(cat.compliantItems || 0), 335, currentY + 4, { width: 55, align: 'center' });
          doc.text(String(cat.nonCompliantItems || 0), 395, currentY + 4, { width: 75, align: 'center' });
          doc.font('Helvetica-Bold').text(cat.scoreDisplay || (cat.score != null ? `${Math.round(cat.score)}%` : 'N/A'), 480, currentY + 4, { width: 65, align: 'right' });

          currentY += 18;
        });
      } else {
        doc.rect(40, currentY, 515, 20).fill(lightBg);
        doc.fillColor(grayColor).font('Helvetica-Oblique').fontSize(8.5).text('No detailed category breakdown recorded.', 48, currentY + 5);
        currentY += 20;
      }

      currentY += 25;

      // --- SECTION 4: FINDINGS & ACTIONABLE OBSERVATIONS ---
      if (currentY > 680) {
        doc.addPage();
        currentY = 40;
      }

      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('4. NON-COMPLIANCE FINDINGS & AUDITOR REMARKS', 40, currentY);

      currentY += 20;

      const nonCompliantItems = audit.nonCompliantItems || [];

      if (nonCompliantItems.length > 0) {
        nonCompliantItems.forEach((item, idx) => {
          if (currentY > 700) {
            doc.addPage();
            currentY = 40;
          }

          doc.rect(40, currentY, 515, 45).fill('#FFFBEB').stroke('#FDE68A');
          doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(9)
             .text(`Finding #${idx + 1}: ${item.category || item.type || 'Requirement'} - ${item.title || item.item || ''}`, 48, currentY + 6, { width: 500, ellipsis: true });
          
          doc.fillColor(grayColor).font('Helvetica').fontSize(8)
             .text(`Auditor Remark: ${item.remarks || 'Non-compliance detected.'}`, 48, currentY + 19, { width: 500, height: 12, ellipsis: true });

          if (item.vendorResponse) {
            doc.fillColor('#065F46').font('Helvetica-Oblique').fontSize(8)
               .text(`Vendor Response: ${item.vendorResponse}`, 48, currentY + 31, { width: 500, height: 12, ellipsis: true });
          }

          currentY += 52;
        });
      } else {
        doc.rect(40, currentY, 515, 30).fill('#ECFDF5').stroke('#A7F3D0');
        doc.fillColor('#065F46').font('Helvetica-Bold').fontSize(9)
           .text('Full Compliance Achieved - No Non-Compliant Items Found.', 48, currentY + 10);
        currentY += 40;
      }

      // --- SECTION 5: AUDIT TIMELINE & APPROVAL CLOSURE ---
      if (currentY > 650) {
        doc.addPage();
        currentY = 40;
      } else {
        currentY += 15;
      }

      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('5. AUDIT CLOSURE & AUTHORIZATION', 40, currentY);

      currentY += 20;

      const timeline = audit.timeline || [];
      const closedEvent = timeline.slice().reverse().find(t => (t.status || '').toLowerCase() === 'closed') || {};

      doc.rect(40, currentY, 515, 45).fill(lightBg).stroke(borderColor);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text('Final Report Status:', 48, currentY + 8);
      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(8.5).text((audit.status || 'Closed').toUpperCase(), 140, currentY + 8);

      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text('Approved / Released Date:', 48, currentY + 24);
      doc.fillColor(grayColor).font('Helvetica').fontSize(8.5).text(closedEvent.timestamp ? new Date(closedEvent.timestamp).toLocaleString() : new Date().toLocaleDateString(), 180, currentY + 24);

      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text('Authorized Auditor:', 320, currentY + 8);
      doc.fillColor(grayColor).font('Helvetica').fontSize(8.5).text(audit.auditorName || audit.auditor || 'Compliance Officer', 420, currentY + 8);

      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text('Report Generation:', 320, currentY + 24);
      doc.fillColor(grayColor).font('Helvetica').fontSize(8.5).text(new Date().toISOString().split('T')[0], 420, currentY + 24);

      // Footer line on last page
      doc.fontSize(7.5).fillColor('#94A3B8').font('Helvetica').text('Labor Compliance Audit Management System — System Generated Final Audit Report', 40, 780, { align: 'center', width: 515 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateAuditReportPdf
};
