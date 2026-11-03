const request = require('supertest');
const app = require('../src/app');
const checklistService = require('../src/services/checklistService');
const { calculateComplianceScore } = require('../src/services/scoringService');

describe('State-Based Vendor Compliance Audit Checklist Tests', () => {

  const EXPECTED_STATE_COUNTS = {
    'Haryana': 31,
    'Karnataka': 24,
    'Madhya Pradesh': 28,
    'Maharashtra': 26,
    'Telangana': 42,
    'Uttar Pradesh': 29
  };

  test('Checklist service provides supported states list including All and N/A', () => {
    const states = checklistService.SUPPORTED_STATES;
    expect(states).toContain('All');
    expect(states).toContain('N/A');
    expect(states).toContain('Maharashtra');
    expect(states).toContain('Haryana');
    expect(states).toContain('Telangana');
    expect(states).toContain('Karnataka');
    expect(states).toContain('Madhya Pradesh');
    expect(states).toContain('Uttar Pradesh');
    expect(states).toHaveLength(8);
  });

  test('All 180 entries imported and accurate counts per state', () => {
    const allStateItems = checklistService.getStateVendorChecklist({ state: 'All', deduplicate: false });
    expect(allStateItems).toHaveLength(180);

    const counts = {};
    allStateItems.forEach(item => {
      counts[item.state] = (counts[item.state] || 0) + 1;
    });

    expect(counts).toEqual(EXPECTED_STATE_COUNTS);
  });

  test('Specific state filtering returns only that state items', () => {
    Object.entries(EXPECTED_STATE_COUNTS).forEach(([stateName, expectedCount]) => {
      const items = checklistService.getStateVendorChecklist({ state: stateName });
      expect(items).toHaveLength(expectedCount);
      items.forEach(item => {
        expect(item.state.toLowerCase()).toBe(stateName.toLowerCase());
        expect(item.country).toBe('India');
      });
    });
  });

  test('All source Excel columns are preserved on each imported item', () => {
    const allStateItems = checklistService.getStateVendorChecklist({ state: 'All', deduplicate: false });
    const first = allStateItems[0];

    // Original Excel keys
    expect(first['Sl.No']).toBeDefined();
    expect(first['State']).toBe('Haryana');
    expect(first['Name of the Act']).toBeDefined();
    expect(first['Act Name in Short']).toBeDefined();
    expect(first['Form No.']).toBeDefined();
    expect(first['Description']).toBeDefined();
    expect(first['Nature of Register']).toBeDefined();
    expect(first['Classifications']).toBeDefined();
    expect(first['Periodicity']).toBeDefined();

    // Standardized application keys
    expect(first).toHaveProperty('country', 'India');
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('type');
    expect(first).toHaveProperty('particulars');
    expect(first).toHaveProperty('statutoryRequirement');
  });

  test('When "All" is selected with deduplication, handles duplicates appropriately', () => {
    const consolidated = checklistService.getStateVendorChecklist({ state: 'All', deduplicate: true });
    expect(consolidated.length).toBe(100);

    // PoB Act Form D applies across all 6 states
    const pobFormD = consolidated.find(i => 
      (i.actNameInShort || '').toLowerCase().includes('pob') && 
      (i.formNo || '').toLowerCase() === 'form d'
    );
    expect(pobFormD).toBeDefined();
    expect(pobFormD.applicableStates).toHaveLength(6);
    expect(pobFormD.isConsolidated).toBe(true);
  });

  test('Keep N/A distinct from All (not a wildcard)', () => {
    // Calling with N/A on state checklist returns 0 (since all 180 state items have concrete states)
    const naStateItems = checklistService.getStateVendorChecklist({ state: 'N/A' });
    expect(naStateItems).toHaveLength(0);

    // Calling otherVendorChecklist returns 44 items where state is N/A
    const otherItems = checklistService.getChecklistByVendorType('other-vendor');
    expect(otherItems.every(i => i.state === 'N/A' && i.country === 'India')).toBe(true);
  });

  test('Compliance score calculation works with state checklist items', () => {
    const haryanaItems = checklistService.getStateVendorChecklist({ state: 'Haryana' });
    expect(haryanaItems).toHaveLength(31);

    const responses = haryanaItems.map((item, idx) => {
      if (idx < 20) {
        return { itemId: item.id, status: 'COMPLIANT', remarks: '' };
      } else if (idx < 25) {
        return { itemId: item.id, status: 'NON_COMPLIANT', remarks: 'Missing register evidence' };
      } else {
        return { itemId: item.id, status: 'NA', remarks: '' };
      }
    });

    const result = calculateComplianceScore(haryanaItems, responses);
    expect(result.summary.compliantItems).toBe(20);
    expect(result.summary.nonCompliantItems).toBe(5);
    expect(result.summary.applicableItems).toBe(25);
    expect(result.summary.naItems).toBe(6);
    expect(result.summary.score).toBe(80);
    expect(result.summary.scoreDisplay).toBe('80.00%');
  });

  test('API GET /api/compliance/templates/:vendorType?state=Maharashtra returns 26 items', async () => {
    const res = await request(app).get('/api/compliance/templates/other-vendor?state=Maharashtra');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.state).toBe('Maharashtra');
    expect(res.body.country).toBe('India');
    expect(res.body.totalItems).toBe(26);
    expect(res.body.checklist).toHaveLength(26);
  });

  test('API GET /api/compliance/templates/:vendorType?state=All returns consolidated 100 items', async () => {
    const res = await request(app).get('/api/compliance/templates/state-vendor?state=All');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.state).toBe('All');
    expect(res.body.country).toBe('India');
    expect(res.body.totalItems).toBe(100);
  });

});
