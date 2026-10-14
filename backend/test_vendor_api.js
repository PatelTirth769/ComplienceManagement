require('dotenv').config();
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 5000;
const token = jwt.sign({ id: 'rSW5Gf1BVOUDGZ2uQldh', email: 'vb@gmail.com', role: 'vendor' }, 'super-secret-compliance-key', { expiresIn: '1d' });

fetch(`http://localhost:${PORT}/api/vendor/dashboard`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => res.json()).then(data => {
  console.log("Data:", JSON.stringify(data, null, 2));
}).catch(console.error);
