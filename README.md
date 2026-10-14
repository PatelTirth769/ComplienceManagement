# ComplienceManagement

Standalone Compliance Score Calculator & Vendor Audit Management System.

A full-stack compliance management system featuring dynamic vendor audit checklists, real-time compliance scoring based on Excel reference templates, evidence upload to AWS S3, and Firebase Firestore persistence.

---

## 🏗️ Project Architecture

```
Complience_Calculator/
├── backend/            # Node.js + Express REST API
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/   # Scoring engine, Excel parser, Audit repository
│   │   ├── routes/
│   │   └── data/       # Extracted checklist definitions (JSON)
│   ├── .env.example
│   └── package.json
├── frontend/           # Modern React + Vite + TypeScript application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/      # Audit forms, dashboard, report details
│   │   └── styles/
│   ├── .env.example
│   └── package.json
└── reference_files/    # Excel source-of-truth checklists
    ├── Other_Vendor_Audit__Checklist.xls
    └── Security_Vendor_Audit_Checklist.xls
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your environment variables in .env
npm start
```
*Backend runs on `http://localhost:5005` by default.*

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Configure your API URL in .env if needed
npm run dev
```
*Frontend runs on `http://localhost:5173` by default.*

---

## 📋 Features

- **Vendor Audit Types**: Supports Other Vendor Audit (44 items) and Security Vendor Audit (43 items).
- **Exact Excel Parity**: Compliance scoring matches standard reference Excel calculations.
- **Evidence Management**: Direct document and evidence uploads to AWS S3.
- **Audit Persistence**: Firebase Firestore integration for records, reports, and history.
- **Admin & Auditor Workflows**: Real-time scoring, remark validation for non-compliant items, and comprehensive report generation.
