const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

let db = null;
let isFirestoreInitialized = false;

function initFirebase() {
  if (admin.getApps().length > 0) {
    db = getFirestore();
    isFirestoreInitialized = true;
    return db;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'labourcode360';

  try {
    // Method 1: Explicit path from env var
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyPath) {
      const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
      if (fs.existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        const app = admin.initializeApp({
          credential: admin.cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId
        });
        db = getFirestore(app);
        isFirestoreInitialized = true;
        console.log(`[Firebase Admin]: Initialized successfully using key at: ${resolvedPath}`);
        return db;
      }
    }

    // Method 2: Default location (backend/serviceAccountKey.json)
    const defaultKeyPath = path.resolve(__dirname, '../../serviceAccountKey.json');
    if (fs.existsSync(defaultKeyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(defaultKeyPath, 'utf8'));
      const app = admin.initializeApp({
        credential: admin.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      db = getFirestore(app);
      isFirestoreInitialized = true;
      console.log(`[Firebase Admin]: Initialized successfully using default serviceAccountKey.json`);
      return db;
    }

    // Method 3: FIREBASE_SERVICE_ACCOUNT_KEY JSON string or Base64 in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      let keyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!keyStr.startsWith('{')) {
        keyStr = Buffer.from(keyStr, 'base64').toString('utf8');
      }
      const serviceAccount = JSON.parse(keyStr);
      const app = admin.initializeApp({
        credential: admin.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      db = getFirestore(app);
      isFirestoreInitialized = true;
      console.log(`[Firebase Admin]: Initialized successfully using FIREBASE_SERVICE_ACCOUNT_KEY env var`);
      return db;
    }

    // Method 4: Client Email & Private Key in env
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      const app = admin.initializeApp({
        credential: admin.cert({
          projectId: projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        }),
        projectId: projectId
      });
      db = getFirestore(app);
      isFirestoreInitialized = true;
      console.log(`[Firebase Admin]: Initialized successfully using client email and private key env vars`);
      return db;
    }

    // Method 5: Application Default Credentials
    if (process.env.NODE_ENV !== 'test' && typeof admin.applicationDefault === 'function') {
      const app = admin.initializeApp({
        credential: admin.applicationDefault(),
        projectId: projectId
      });
      db = getFirestore(app);
      isFirestoreInitialized = true;
      console.log(`[Firebase Admin]: Initialized using application default credentials`);
      return db;
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[Firebase Admin Warning]: Initialization failed (${err.message}). Falling back to local storage.`);
    }
    isFirestoreInitialized = false;
    return null;
  }
}

// Run initialization
initFirebase();

module.exports = {
  getDb: () => db,
  admin,
  isFirestoreInitialized: () => isFirestoreInitialized
};
