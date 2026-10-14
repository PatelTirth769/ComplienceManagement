const path = require('path');
const { extractChecklistFromExcel } = require('../src/services/excelService');
const checklistService = require('../src/services/checklistService');

describe('Checklist Extraction and Verification', () => {
  const referenceDir = path.resolve(__dirname, '../../reference_files');
  const otherExcelPath = path.join(referenceDir, 'Other_Vendor_Audit__Checklist.xls');
  const securityExcelPath = path.join(referenceDir, 'Security_Vendor_Audit_Checklist.xls');

  test('Other Vendor Excel file extracts exactly 44 checklist items', () => {
    const items = extractChecklistFromExcel(otherExcelPath, 'OTHER');
    expect(items).toHaveLength(44);
    expect(items[0].id).toBe('OTHER-001');
    expect(items[43].id).toBe('OTHER-044');
    expect(items[0].title).toBe('Contract Labour Licence / Application');
  });

  test('Security Vendor Excel file extracts exactly 43 checklist items', () => {
    const items = extractChecklistFromExcel(securityExcelPath, 'SECURITY');
    expect(items).toHaveLength(43);
    expect(items[0].id).toBe('SECURITY-001');
    expect(items[42].id).toBe('SECURITY-043');
    expect(items[0].title).toBe('Regn. of Agency');
  });

  test('Checklist service loads correct vendor types', () => {
    const types = checklistService.getVendorTypes();
    expect(types).toHaveLength(2);
    expect(types[0].id).toBe('other-vendor');
    expect(types[1].id).toBe('security-vendor');
  });

  test('Checklist service retrieves correct checklists for valid vendor types', () => {
    const otherChecklist = checklistService.getChecklistByVendorType('other-vendor');
    expect(otherChecklist).toHaveLength(44);

    const securityChecklist = checklistService.getChecklistByVendorType('security-vendor');
    expect(securityChecklist).toHaveLength(43);
  });
});
