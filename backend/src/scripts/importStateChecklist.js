const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Optional dotenv for Firestore connection
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (e) {}

const { getDb } = require('../config/firebase');

const REFERENCE_EXCEL_PATH = path.resolve(__dirname, '../../../../reference/Haryana-Maharashtra- MP - Karnataka -Telangana-UP Vendor Audit Checklist.xlsx');
const DATA_DIR = path.resolve(__dirname, '../data');
const STATE_OUTPUT_JSON = path.join(DATA_DIR, 'stateVendorChecklist.json');
const OTHER_OUTPUT_JSON = path.join(DATA_DIR, 'otherVendorChecklist.json');
const SEC_OUTPUT_JSON = path.join(DATA_DIR, 'securityVendorChecklist.json');

const EXPECTED_STATES = [
  'Haryana',
  'Karnataka',
  'Madhya Pradesh',
  'Maharashtra',
  'Telangana',
  'Uttar Pradesh'
];

async function importStateChecklist() {
  console.log('========================================================');
  console.log('Importing State-Based Vendor Compliance Audit Checklist');
  console.log('========================================================');
  console.log(`Reference File: ${REFERENCE_EXCEL_PATH}`);

  if (!fs.existsSync(REFERENCE_EXCEL_PATH)) {
    throw new Error(`Reference Excel file not found at: ${REFERENCE_EXCEL_PATH}`);
  }

  const workbook = XLSX.readFile(REFERENCE_EXCEL_PATH);
  const sheetName = workbook.SheetNames[0] || 'Sheet2';
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`Workbook loaded: ${workbook.SheetNames.join(', ')}`);
  console.log(`Processing Sheet: ${sheetName} (${rawRows.length} total rows)`);

  if (rawRows.length !== 180) {
    console.warn(`[Warning]: Expected exactly 180 rows, found: ${rawRows.length}`);
  }

  const stateCounts = {};
  EXPECTED_STATES.forEach(st => { stateCounts[st] = 0; });

  const stateChecklistItems = [];

  rawRows.forEach((row, index) => {
    const slNo = Number(row['Sl.No']) || (index + 1);
    const state = String(row['State'] || '').trim();
    const nameOfAct = String(row['Name of the Act'] || '').trim();
    const actNameInShort = String(row['Act Name in Short'] || '').trim();
    const formNo = String(row['Form No.'] || '').trim();
    const description = String(row['Description'] || '').trim();
    const natureOfRegister = String(row['Nature of Register'] || '').trim();
    const classifications = String(row['Classifications'] || '').trim();
    const periodicity = String(row['Periodicity'] || '').trim();

    stateCounts[state] = (stateCounts[state] || 0) + 1;

    // Preserving all source columns exactly plus standard application attributes
    const item = {
      // Unique Identifier
      id: `STATE-${slNo}`,
      serialNumber: slNo,

      // India & State Association
      country: 'India',
      state: state,

      // Exact Excel Columns (CamelCase)
      slNo: slNo,
      nameOfAct: nameOfAct,
      actNameInShort: actNameInShort,
      formNo: formNo,
      description: description,
      natureOfRegister: natureOfRegister,
      classifications: classifications,
      periodicity: periodicity,

      // Exact Excel Columns (Original Keys for 100% source fidelity)
      'Sl.No': slNo,
      'State': state,
      'Name of the Act': nameOfAct,
      'Act Name in Short': actNameInShort,
      'Form No.': formNo,
      'Description': description,
      'Nature of Register': natureOfRegister,
      'Classifications': classifications,
      'Periodicity': periodicity,

      // Standard Compliance Engine Schema
      title: `${actNameInShort}${formNo && formNo !== '-' ? ' - ' + formNo : ''}: ${description}`,
      type: actNameInShort || 'Labour Law',
      particulars: description,
      statutoryRequirement: `${nameOfAct}${formNo && formNo !== '-' ? ' (' + formNo + ')' : ''} — ${description} [Periodicity: ${periodicity}]`,
      vendorType: 'other-vendor',
      supportedVendorTypes: ['other-vendor', 'state-vendor'],
      active: true
    };

    stateChecklistItems.push(item);
  });

  console.log('\n--- State Record Counts ---');
  Object.keys(stateCounts).sort().forEach(st => {
    console.log(`  • ${st.padEnd(16)}: ${stateCounts[st]} records`);
  });
  console.log(`  Total imported    : ${stateChecklistItems.length} records`);

  // Write JSON to disk
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(STATE_OUTPUT_JSON, JSON.stringify(stateChecklistItems, null, 2), 'utf-8');
  console.log(`\nSaved local JSON to: ${STATE_OUTPUT_JSON}`);

  // Ensure otherVendorChecklist.json and securityVendorChecklist.json have country and state
  if (fs.existsSync(OTHER_OUTPUT_JSON)) {
    const otherList = JSON.parse(fs.readFileSync(OTHER_OUTPUT_JSON, 'utf-8'));
    const updatedOther = otherList.map(item => ({
      ...item,
      country: item.country || 'India',
      state: item.state || 'N/A'
    }));
    fs.writeFileSync(OTHER_OUTPUT_JSON, JSON.stringify(updatedOther, null, 2), 'utf-8');
    console.log(`Updated ${OTHER_OUTPUT_JSON} with default country: India, state: N/A`);
  }

  if (fs.existsSync(SEC_OUTPUT_JSON)) {
    const secList = JSON.parse(fs.readFileSync(SEC_OUTPUT_JSON, 'utf-8'));
    const updatedSec = secList.map(item => ({
      ...item,
      country: item.country || 'India',
      state: item.state || 'N/A'
    }));
    fs.writeFileSync(SEC_OUTPUT_JSON, JSON.stringify(updatedSec, null, 2), 'utf-8');
    console.log(`Updated ${SEC_OUTPUT_JSON} with default country: India, state: N/A`);
  }

  // Sync to Firestore if initialized
  const db = getDb();
  if (db) {
    console.log('\nSyncing state checklist items to Firestore collection "compliance_checklists"...');
    const colRef = db.collection('compliance_checklists');

    // Firestore batch writes are limited to 500 ops per commit
    const batch = db.batch();
    for (const item of stateChecklistItems) {
      const docRef = colRef.doc(item.id);
      batch.set(docRef, item, { merge: true });
    }
    await batch.commit();
    console.log(`Successfully synced ${stateChecklistItems.length} items to Firestore "compliance_checklists"!`);

    // Also ensure existing OTHER and SEC docs have country and state set
    const existingSnap = await colRef.get();
    let updatedCount = 0;
    const updateBatch = db.batch();
    existingSnap.forEach(doc => {
      const data = doc.data();
      if (!data.country || !data.state) {
        updateBatch.set(doc.ref, { country: data.country || 'India', state: data.state || 'N/A' }, { merge: true });
        updatedCount++;
      }
    });
    if (updatedCount > 0) {
      await updateBatch.commit();
      console.log(`Updated ${updatedCount} existing Firestore docs with default country: India, state: N/A`);
    }
  } else {
    console.log('\n[Note]: Firestore db not connected or offline. Local JSON sync succeeded.');
  }

  console.log('\nImport completed successfully!');
  return {
    total: stateChecklistItems.length,
    counts: stateCounts
  };
}

if (require.main === module) {
  importStateChecklist()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}

module.exports = { importStateChecklist, EXPECTED_STATES };
