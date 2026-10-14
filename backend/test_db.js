const { getDb } = require('./src/config/firebase');

async function check() {
  const db = getDb();
  if (!db) {
    console.log("No DB initialized.");
    return;
  }
  
  console.log('--- USERS ---');
  const usersSnapshot = await db.collection('users').get();
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.role === 'vendor' || data.role === 'Vendor') {
      console.log(`User ID: ${doc.id} | Email: ${data.email} | Role: ${data.role}`);
      console.log(JSON.stringify(data));
    }
  });

  console.log('\n--- AUDITS ---');
  const auditsSnapshot = await db.collection('audits').get();
  auditsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Audit ID: ${doc.id}`);
    console.log(JSON.stringify(data));
  });
}

check().catch(console.error);
