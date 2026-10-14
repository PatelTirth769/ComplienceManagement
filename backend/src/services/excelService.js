const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

/**
 * Extracts checklist items from an Excel file (.xls or .xlsx).
 * @param {string} filePath - Absolute or relative path to the Excel file.
 * @param {string} idPrefix - Prefix for generating item IDs (e.g., 'OTHER', 'SECURITY').
 * @returns {Array<Object>} Array of formatted checklist items.
 */
function extractChecklistFromExcel(filePath, idPrefix) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Excel file not found at: ${absolutePath}`);
  }

  const workbook = XLSX.readFile(absolutePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

  let headerRowIndex = -1;
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && cell.trim().toLowerCase() === 'sr no')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(`Header row containing 'Sr No' not found in ${filePath}`);
  }

  const checklistItems = [];

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawSrNo = row[0];
    if (rawSrNo === null || rawSrNo === undefined || rawSrNo === '') continue;

    const srNo = Number(rawSrNo);
    if (isNaN(srNo) || srNo <= 0) continue;

    const title = row[1] ? String(row[1]).trim() : '';
    const type = row[2] ? String(row[2]).trim() : '';
    const particulars = row[3] ? String(row[3]).trim() : '';

    if (!title && !particulars) continue;

    const paddedId = String(Math.floor(srNo)).padStart(3, '0');
    const item = {
      id: `${idPrefix}-${paddedId}`,
      serialNumber: Math.floor(srNo),
      title: title,
      type: type,
      particulars: particulars,
      statutoryRequirement: particulars
    };

    checklistItems.push(item);
  }

  return checklistItems;
}

/**
 * Reads Excel reference files and syncs JSON data files.
 */
function syncChecklistJsonFiles(referenceDir, outputDir) {
  const otherPath = path.join(referenceDir, 'Other_Vendor_Audit__Checklist.xls');
  const securityPath = path.join(referenceDir, 'Security_Vendor_Audit_Checklist.xls');

  const otherItems = extractChecklistFromExcel(otherPath, 'OTHER');
  const securityItems = extractChecklistFromExcel(securityPath, 'SECURITY');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, 'otherVendorChecklist.json'),
    JSON.stringify(otherItems, null, 2),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(outputDir, 'securityVendorChecklist.json'),
    JSON.stringify(securityItems, null, 2),
    'utf-8'
  );

  return {
    otherCount: otherItems.length,
    securityCount: securityItems.length
  };
}

module.exports = {
  extractChecklistFromExcel,
  syncChecklistJsonFiles
};
