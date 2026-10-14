const request = require('supertest');
const app = require('../src/app');
const checklistService = require('../src/services/checklistService');

describe('Compliance Calculator API Endpoints Integration Tests', () => {

  test('GET /api/health returns 200 OK with success message', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Compliance Calculator API is running');
  });

  test('GET /api/compliance/vendor-types returns vendor types list', async () => {
    const res = await request(app).get('/api/compliance/vendor-types');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.vendorTypes).toHaveLength(2);
  });

  test('GET /api/compliance/templates/other-vendor returns Other Vendor checklist', async () => {
    const res = await request(app).get('/api/compliance/templates/other-vendor');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalItems).toBe(44);
    expect(res.body.checklist).toHaveLength(44);
    expect(res.body.checklist[0].id).toBe('OTHER-001');
  });

  test('GET /api/compliance/templates/security-vendor returns Security Vendor checklist', async () => {
    const res = await request(app).get('/api/compliance/templates/security-vendor');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalItems).toBe(43);
    expect(res.body.checklist).toHaveLength(43);
    expect(res.body.checklist[0].id).toBe('SECURITY-001');
  });

  test('GET /api/compliance/templates/unknown-vendor returns 404', async () => {
    const res = await request(app).get('/api/compliance/templates/unknown-vendor');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('POST /api/compliance/calculate calculates score for Security Vendor correctly', async () => {
    const securityChecklist = checklistService.getChecklistByVendorType('security-vendor');
    const responses = securityChecklist.map((item, idx) => {
      if (idx < 30) {
        return { itemId: item.id, status: 'COMPLIANT', remarks: '' };
      } else if (idx < 38) {
        return { itemId: item.id, status: 'NON_COMPLIANT', remarks: 'Document not provided' };
      } else {
        return { itemId: item.id, status: 'NA', remarks: '' };
      }
    });

    const payload = {
      vendorType: 'security-vendor',
      responses
    };

    const res = await request(app).post('/api/compliance/calculate').send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.vendorType).toBe('SECURITY_VENDOR');
    expect(res.body.summary.totalItems).toBe(43);
    expect(res.body.summary.applicableItems).toBe(38);
    expect(res.body.summary.compliantItems).toBe(30);
    expect(res.body.summary.nonCompliantItems).toBe(8);
    expect(res.body.summary.naItems).toBe(5);
    // 30 / 38 * 100 = 78.947368...
    expect(res.body.summary.score).toBeCloseTo(78.947368, 4);
    expect(res.body.summary.scoreDisplay).toBe('78.95%');
    expect(res.body.categoryScores.length).toBeGreaterThan(0);
    expect(res.body.nonCompliantItems).toHaveLength(8);
  });

  test('POST /api/compliance/calculate handles ALL-NA edge case for Other Vendor checklist (44 items)', async () => {
    const otherChecklist = checklistService.getChecklistByVendorType('other-vendor');
    expect(otherChecklist).toHaveLength(44);

    const responses = otherChecklist.map(item => ({
      itemId: item.id,
      status: 'NA',
      remarks: ''
    }));

    const payload = {
      vendorType: 'other-vendor',
      responses
    };

    const res = await request(app).post('/api/compliance/calculate').send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.vendorType).toBe('OTHER_VENDOR');
    expect(res.body.summary.totalItems).toBe(44);
    expect(res.body.summary.applicableItems).toBe(0);
    expect(res.body.summary.compliantItems).toBe(0);
    expect(res.body.summary.nonCompliantItems).toBe(0);
    expect(res.body.summary.naItems).toBe(44);
    expect(res.body.summary.score).toBeNull();
    expect(res.body.summary.scoreDisplay).toBe('N/A');

    const responseText = JSON.stringify(res.body);
    expect(responseText).not.toContain('NaN');
    expect(responseText).not.toContain('Infinity');
    expect(responseText).not.toContain('#DIV/0!');
  });

  test('POST /api/compliance/calculate rejects NON_COMPLIANT without remarks', async () => {
    const securityChecklist = checklistService.getChecklistByVendorType('security-vendor');
    const responses = securityChecklist.map((item, idx) => {
      if (idx === 1) {
        return { itemId: item.id, status: 'NON_COMPLIANT', remarks: '' };
      }
      return { itemId: item.id, status: 'COMPLIANT', remarks: '' };
    });

    const payload = {
      vendorType: 'security-vendor',
      responses
    };

    const res = await request(app).post('/api/compliance/calculate').send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.itemId).toBe('SECURITY-002');
    expect(res.body.error.message).toContain('Remarks are required for non-compliant items');
  });

  test('POST /api/compliance/calculate rejects invalid vendor type', async () => {
    const res = await request(app)
      .post('/api/compliance/calculate')
      .send({ vendorType: 'invalid-vendor', responses: [] });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /api/compliance/audits creates audit record and GET retrieves it', async () => {
    const otherChecklist = checklistService.getChecklistByVendorType('other-vendor');
    const responses = otherChecklist.map(item => ({
      itemId: item.id,
      status: 'COMPLIANT',
      remarks: ''
    }));

    const auditPayload = {
      organisation: 'Acme Corp',
      site: 'Mumbai HQ',
      auditMonth: 'September 2026',
      auditDate: '2026-09-28',
      conductedAt: 'Onsite',
      auditor: 'John Doe',
      vendorRepresentative: 'Alice Smith',
      clientRepresentative: 'Bob Johnson',
      employeeCount: 150,
      vendorType: 'other-vendor',
      responses
    };

    const createRes = await request(app)
      .post('/api/compliance/audits')
      .send(auditPayload);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.id).toMatch(/^audit_/);
    expect(createRes.body.data.summary.score).toBe(100);

    const auditId = createRes.body.data.id;

    const getRes = await request(app).get(`/api/compliance/audits/${auditId}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.organisation).toBe('Acme Corp');
    expect(getRes.body.data.employeeCount).toBe(150);
  });

  test('GET /api/compliance/audits/invalid-id returns 404', async () => {
    const res = await request(app).get('/api/compliance/audits/non_existent_id');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
