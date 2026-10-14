const { getDb } = require('./src/config/firebase');

async function check() {
  const db = getDb();
  if (!db) return;
  const snapshot = await db.collection('vendors').get();
  snapshot.forEach(doc => {
    console.log(`Vendor ID in 'vendors': ${doc.id}`);
    console.log(JSON.stringify(doc.data()));
  });
}
check().catch(console.error);
