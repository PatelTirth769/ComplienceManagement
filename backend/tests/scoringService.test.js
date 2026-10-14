const { calculateComplianceScore, ValidationError } = require('../src/services/scoringService');

describe('Scoring Service Engine', () => {
  const mockChecklist = [
    { id: 'TEST-001', serialNumber: 1, title: 'Item 1', type: 'Category A' },
    { id: 'TEST-002', serialNumber: 2, title: 'Item 2', type: 'Category A' },
    { id: 'TEST-003', serialNumber: 3, title: 'Item 3', type: 'Category B' },
    { id: 'TEST-004', serialNumber: 4, title: 'Item 4', type: 'Category B' }
  ];

  test('All COMPLIANT produces 100%', () => {
    const responses = [
      { itemId: 'TEST-001', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-002', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-003', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-004', status: 'COMPLIANT', remarks: '' }
    ];

    const result = calculateComplianceScore(mockChecklist, responses);
    expect(result.summary.score).toBe(100);
    expect(result.summary.scoreDisplay).toBe('100.00%');
    expect(result.summary.compliantItems).toBe(4);
    expect(result.summary.nonCompliantItems).toBe(0);
    expect(result.summary.applicableItems).toBe(4);
  });

  test('All NON_COMPLIANT produces 0%', () => {
    const responses = [
      { itemId: 'TEST-001', status: 'NON_COMPLIANT', remarks: 'Failed doc check' },
      { itemId: 'TEST-002', status: 'NON_COMPLIANT', remarks: 'Missing register' },
      { itemId: 'TEST-003', status: 'NON_COMPLIANT', remarks: 'No proof' },
      { itemId: 'TEST-004', status: 'NON_COMPLIANT', remarks: 'Expired license' }
    ];

    const result = calculateComplianceScore(mockChecklist, responses);
    expect(result.summary.score).toBe(0);
    expect(result.summary.scoreDisplay).toBe('0.00%');
    expect(result.summary.compliantItems).toBe(0);
    expect(result.summary.nonCompliantItems).toBe(4);
    expect(result.summary.applicableItems).toBe(4);
    expect(result.nonCompliantItems).toHaveLength(4);
  });

  test('50% COMPLIANT and 50% NON_COMPLIANT produces 50%', () => {
    const responses = [
      { itemId: 'TEST-001', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-002', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-003', status: 'NON_COMPLIANT', remarks: 'Remark 1' },
      { itemId: 'TEST-004', status: 'NON_COMPLIANT', remarks: 'Remark 2' }
    ];

    const result = calculateComplianceScore(mockChecklist, responses);
    expect(result.summary.score).toBe(50);
    expect(result.summary.scoreDisplay).toBe('50.00%');
  });

  test('NA is excluded from denominator (Excel Parity Test)', () => {
    // 20 items checklist: 10 Compliant, 5 Non-Compliant, 5 NA
    const customChecklist = Array.from({ length: 20 }, (_, idx) => ({
      id: `ITEM-${String(idx + 1).padStart(3, '0')}`,
      serialNumber: idx + 1,
      title: `Title ${idx + 1}`,
      type: 'General'
    }));

    const responses = [];
    for (let i = 1; i <= 10; i++) {
      responses.push({ itemId: `ITEM-${String(i).padStart(3, '0')}`, status: 'COMPLIANT', remarks: '' });
    }
    for (let i = 11; i <= 15; i++) {
      responses.push({ itemId: `ITEM-${String(i).padStart(3, '0')}`, status: 'NON_COMPLIANT', remarks: 'Document missing' });
    }
    for (let i = 16; i <= 20; i++) {
      responses.push({ itemId: `ITEM-${String(i).padStart(3, '0')}`, status: 'NA', remarks: '' });
    }

    const result = calculateComplianceScore(customChecklist, responses);

    expect(result.summary.totalItems).toBe(20);
    expect(result.summary.compliantItems).toBe(10);
    expect(result.summary.nonCompliantItems).toBe(5);
    expect(result.summary.naItems).toBe(5);
    expect(result.summary.applicableItems).toBe(15);
    // 10 / 15 * 100 = 66.66666...
    expect(result.summary.score).toBeCloseTo(66.66666, 4);
    expect(result.summary.scoreDisplay).toBe('66.67%');
  });

  test('All NA produces N/A score with message', () => {
    const responses = [
      { itemId: 'TEST-001', status: 'NA', remarks: '' },
      { itemId: 'TEST-002', status: 'NA', remarks: '' },
      { itemId: 'TEST-003', status: 'NA', remarks: '' },
      { itemId: 'TEST-004', status: 'NA', remarks: '' }
    ];

    const result = calculateComplianceScore(mockChecklist, responses);
    expect(result.summary.score).toBeNull();
    expect(result.summary.scoreDisplay).toBe('N/A');
    expect(result.summary.message).toBe('No applicable compliance items have been assessed.');
  });

  test('All 44 items NA for Other Vendor checklist via scoring engine', () => {
    const checklistService = require('../src/services/checklistService');
    const otherChecklist = checklistService.getChecklistByVendorType('other-vendor');
    expect(otherChecklist).toHaveLength(44);

    const responses = otherChecklist.map(item => ({
      itemId: item.id,
      status: 'NA',
      remarks: ''
    }));

    const result = calculateComplianceScore(otherChecklist, responses);

    expect(result.summary.totalItems).toBe(44);
    expect(result.summary.applicableItems).toBe(0);
    expect(result.summary.compliantItems).toBe(0);
    expect(result.summary.nonCompliantItems).toBe(0);
    expect(result.summary.naItems).toBe(44);
    expect(result.summary.score).toBeNull();
    expect(result.summary.scoreDisplay).toBe('N/A');
    expect(result.summary.message).toBe('No applicable compliance items have been assessed.');

    const stringified = JSON.stringify(result);
    expect(stringified).not.toContain('NaN');
    expect(stringified).not.toContain('Infinity');
    expect(stringified).not.toContain('#DIV/0!');
  });

  test('NON_COMPLIANT without remarks throws validation error', () => {
    const responses = [
      { itemId: 'TEST-001', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-002', status: 'NON_COMPLIANT', remarks: '   ' },
      { itemId: 'TEST-003', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-004', status: 'COMPLIANT', remarks: '' }
    ];

    expect(() => calculateComplianceScore(mockChecklist, responses)).toThrow(ValidationError);
    try {
      calculateComplianceScore(mockChecklist, responses);
    } catch (err) {
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.itemId).toBe('TEST-002');
      expect(err.message).toBe('Remarks are required for non-compliant items.');
    }
  });

  test('Invalid status throws validation error', () => {
    const responses = [
      { itemId: 'TEST-001', status: 'YES', remarks: '' },
      { itemId: 'TEST-002', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-003', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-004', status: 'COMPLIANT', remarks: '' }
    ];

    expect(() => calculateComplianceScore(mockChecklist, responses)).toThrow(ValidationError);
  });

  test('Invalid item ID throws validation error', () => {
    const responses = [
      { itemId: 'INVALID-999', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-002', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-003', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-004', status: 'COMPLIANT', remarks: '' }
    ];

    expect(() => calculateComplianceScore(mockChecklist, responses)).toThrow(ValidationError);
  });

  test('Duplicate item ID throws validation error', () => {
    const responses = [
      { itemId: 'TEST-001', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-001', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-003', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-004', status: 'COMPLIANT', remarks: '' }
    ];

    expect(() => calculateComplianceScore(mockChecklist, responses)).toThrow(ValidationError);
  });

  test('Missing response for item throws validation error', () => {
    const responses = [
      { itemId: 'TEST-001', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-002', status: 'COMPLIANT', remarks: '' }
    ];

    expect(() => calculateComplianceScore(mockChecklist, responses)).toThrow(ValidationError);
  });

  test('Calculates category-wise scores accurately', () => {
    const responses = [
      { itemId: 'TEST-001', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-002', status: 'NON_COMPLIANT', remarks: 'Not done' },
      { itemId: 'TEST-003', status: 'COMPLIANT', remarks: '' },
      { itemId: 'TEST-004', status: 'NA', remarks: '' }
    ];

    const result = calculateComplianceScore(mockChecklist, responses);

    expect(result.categoryScores).toHaveLength(2);

    const catA = result.categoryScores.find(c => c.category === 'Category A');
    expect(catA.totalItems).toBe(2);
    expect(catA.applicableItems).toBe(2);
    expect(catA.compliantItems).toBe(1);
    expect(catA.nonCompliantItems).toBe(1);
    expect(catA.score).toBe(50);
    expect(catA.scoreDisplay).toBe('50.00%');

    const catB = result.categoryScores.find(c => c.category === 'Category B');
    expect(catB.totalItems).toBe(2);
    expect(catB.applicableItems).toBe(1);
    expect(catB.compliantItems).toBe(1);
    expect(catB.naItems).toBe(1);
    expect(catB.score).toBe(100);
    expect(catB.scoreDisplay).toBe('100.00%');
  });
});
