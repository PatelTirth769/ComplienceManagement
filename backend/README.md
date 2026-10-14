# Standalone Compliance Score Calculator Backend

A modular Node.js & Express REST API backend for calculating compliance scores based on audit checklists extracted directly from Excel reference templates (`Other_Vendor_Audit__Checklist.xls` and `Security_Vendor_Audit_Checklist.xls`).

---

## Table of Contents

- [Project Purpose](#project-purpose)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Excel Source of Truth & Extraction](#excel-source-of-truth--extraction)
- [Scoring Methodology & Excel Parity](#scoring-methodology--excel-parity)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Endpoints & Examples](#api-endpoints--examples)
- [Remark Validation Rules](#remark-validation-rules)
- [All NA Handling](#all-na-handling)
- [Testing & Parity Verification](#testing--parity-verification)

---

## Project Purpose

The Standalone Compliance Score Calculator API allows auditors to assess compliance for different vendor types (`other-vendor` and `security-vendor`). It dynamically processes checklist responses, validates compliance data, calculates category-wise and overall compliance scores, enforces remark requirements for non-compliant items, and persists audit records.

---

## Technology Stack

- **Runtime**: Node.js (JavaScript)
- **Framework**: Express.js
- **Excel Processing**: SheetJS / `xlsx`
- **Security**: `helmet`, `cors`
- **Environment**: `dotenv`
- **Testing**: `jest`, `supertest`

---

## Project Architecture

```
backend/
├── src/
│   ├── config/
│   │   └── index.js                   # Application configuration & environment loader
│   ├── controllers/
│   │   └── complianceController.js    # Express route handlers
│   ├── routes/
│   │   ├── index.js                   # Top-level API router
│   │   └── complianceRoutes.js        # Compliance & Audit routes
│   ├── services/
│   │   ├── excelService.js            # SheetJS reader & checklist JSON extractor
│   │   ├── checklistService.js        # Dynamic template loader & vendor validator
│   │   ├── scoringService.js          # Pure business logic scoring engine & validator
│   │   └── auditService.js            # Audit persistence repository service
│   ├── data/
│   │   ├── otherVendorChecklist.json  # Extracted Other Vendor checklist (44 items)
│   │   └── securityVendorChecklist.json# Extracted Security Vendor checklist (43 items)
│   ├── middleware/
│   │   └── errorHandler.js            # Centralized error handler
│   ├── app.js                         # Express application setup
│   └── server.js                      # Application server entry point
├── tests/
│   ├── checklist.test.js              # Excel extraction & item count tests
│   ├── scoringService.test.js         # Scoring engine unit & edge case tests
│   └── api.test.js                    # REST API integration tests
├── .env                               # Local environment variables
├── .env.example                       # Environment template
├── .gitignore                         # Git ignore rules
├── package.json                       # Project dependencies and scripts
└── README.md                          # Documentation
```

---

## Excel Source of Truth & Extraction

The compliance checklists are extracted programmatically from the reference files:
- `reference_files/Other_Vendor_Audit__Checklist.xls` -> Extracted **44 items** (`OTHER-001` to `OTHER-044`).
- `reference_files/Security_Vendor_Audit_Checklist.xls` -> Extracted **43 items** (`SECURITY-001` to `SECURITY-043`).

Each item contains:
- `id`: Unique stable identifier (e.g. `OTHER-001`, `SECURITY-001`)
- `serialNumber`: Numeric sequence number from Excel
- `title`: Short title of requirement
- `type`: Compliance category (e.g., `CL Act`, `PSRGA`, `ESI Act`, `PF Act`)
- `particulars` / `statutoryRequirement`: Detailed statutory text from Excel

---

## Scoring Methodology & Excel Parity

### Excel Formula Representation
- `COMPLIANT` = 1
- `NON_COMPLIANT` = 0
- `NA` = Not Applicable (Excluded from denominator)

### Scoring Formula
$$\text{Applicable Items} = \text{Compliant Items} + \text{Non-Compliant Items}$$

$$\text{Compliance Score (\%)} = \left( \frac{\text{Compliant Items}}{\text{Applicable Items}} \right) \times 100$$

### Numerical Parity Example
Suppose an audit has:
- 10 **COMPLIANT** items
- 5 **NON_COMPLIANT** items
- 5 **NA** items

**Calculation**:
- Total Items = $10 + 5 + 5 = 20$
- Applicable Items = $10 + 5 = 15$ (NA items are strictly excluded)
- Raw Score = $\frac{10}{15} \times 100 = 66.666666...\%$
- Display Score = `"66.67%"`

---

## Installation & Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

---

## Running the Application

### Start Development Server
```bash
npm start
```
Server runs at `http://localhost:5000`.

---

## API Endpoints & Examples

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | API health check |
| `GET` | `/api/compliance/vendor-types` | List available vendor types |
| `GET` | `/api/compliance/templates/other-vendor` | Get Other Vendor checklist (44 items) |
| `GET` | `/api/compliance/templates/security-vendor` | Get Security Vendor checklist (43 items) |
| `GET` | `/api/compliance/templates/:vendorType` | Dynamic template loader |
| `POST` | `/api/compliance/calculate` | Calculate compliance score |
| `POST` | `/api/compliance/audits` | Save completed audit record |
| `GET` | `/api/compliance/audits/:id` | Fetch audit record by ID |

---

### Request & Response Examples

#### 1. GET `/api/health`
**Response**:
```json
{
  "success": true,
  "message": "Compliance Calculator API is running"
}
```

#### 2. POST `/api/compliance/calculate`
**Request Body**:
```json
{
  "vendorType": "security-vendor",
  "responses": [
    {
      "itemId": "SECURITY-001",
      "status": "COMPLIANT",
      "remarks": ""
    },
    {
      "itemId": "SECURITY-002",
      "status": "NON_COMPLIANT",
      "remarks": "Required registration document was not available during audit."
    },
    {
      "itemId": "SECURITY-003",
      "status": "NA",
      "remarks": ""
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "vendorType": "SECURITY_VENDOR",
  "summary": {
    "totalItems": 43,
    "applicableItems": 38,
    "compliantItems": 30,
    "nonCompliantItems": 8,
    "naItems": 5,
    "score": 78.94736842105263,
    "scoreDisplay": "78.95%"
  },
  "categoryScores": [
    {
      "category": "PSRGA",
      "totalItems": 16,
      "applicableItems": 15,
      "compliantItems": 12,
      "nonCompliantItems": 3,
      "naItems": 1,
      "score": 80,
      "scoreDisplay": "80.00%"
    }
  ],
  "nonCompliantItems": [
    {
      "itemId": "SECURITY-002",
      "serialNumber": 2,
      "type": "PSRGA",
      "title": "Application of Principal Employer",
      "particulars": "To file the application alongwith Principal Employers consent Letter and Exhibit C",
      "remarks": "Required registration document was not available during audit."
    }
  ]
}
```

---

## Remark Validation Rules

For every response with `status: "NON_COMPLIANT"`, non-empty `remarks` are **MANDATORY**.
If missing, a `400 Bad Request` validation error is returned:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Remarks are required for non-compliant items.",
    "itemId": "SECURITY-002"
  }
}
```

---

## All NA Handling

If all checklist items are marked as `NA`:
```json
{
  "success": true,
  "vendorType": "SECURITY_VENDOR",
  "summary": {
    "totalItems": 43,
    "applicableItems": 0,
    "compliantItems": 0,
    "nonCompliantItems": 0,
    "naItems": 43,
    "score": null,
    "scoreDisplay": "N/A",
    "message": "No applicable compliance items have been assessed."
  }
}
```

---

## Testing & Parity Verification

Run all automated Jest tests:
```bash
npm test
```

**Test Coverage**:
- 25 automated unit & integration tests passing across 3 test suites.
- Verifies exact checklist counts against Excel files (44 items for Other, 43 items for Security).
- Verifies exact scoring formulas, category breakdowns, validation rules, and REST API endpoints.
