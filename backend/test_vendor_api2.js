require('dotenv').config();
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 5000;

async function testApi() {
  const token = jwt.sign({ id: 'rSW5Gf1BVOUDGZ2uQldh', email: 'vb@gmail.com', role: 'vendor' }, 'super-secret-compliance-key', { expiresIn: '1d' });
  const headers = { 'Authorization': `Bearer ${token}` };

  console.log('Testing /api/vendor/audits');
  let res = await fetch(`http://localhost:${PORT}/api/vendor/audits`, { headers });
  let data = await res.json();
  console.log(`Status: ${res.status}`);
  console.log(`Data: ${JSON.stringify(data, null, 2)}`);
}

testApi().catch(console.error);
