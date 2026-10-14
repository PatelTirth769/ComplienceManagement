const fs = require('fs');
const files = [
  'src/pages/AdminVendors.tsx',
  'src/pages/AdminCustomers.tsx',
  'src/pages/AdminAuditors.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Update form tag
  content = content.replace(/<form onSubmit={handleAddSubmit} className="space-y-6">/g, '<form onSubmit={handleAddSubmit} className="space-y-6" autoComplete="off">');
  content = content.replace(/<form onSubmit={handleAddSubmit} className="db-form-grid">/g, '<form onSubmit={handleAddSubmit} className="db-form-grid" autoComplete="off">');
  
  // Update email input
  content = content.replace(/type="email" className="db-input" value={formData\.email}/g, 'type="email" className="db-input" autoComplete="new-email" value={formData.email}');
  // Just in case:
  content = content.replace(/type="email" className="db-input"/g, 'type="email" className="db-input" autoComplete="new-email"');
  
  // Update password input
  content = content.replace(/type="password" minLength={6} className="db-input" value={formData\.password}/g, 'type="password" minLength={6} className="db-input" autoComplete="new-password" value={formData.password}');
  // Just in case:
  content = content.replace(/type="password" className="db-input"/g, 'type="password" autoComplete="new-password" className="db-input"');
  
  fs.writeFileSync(file, content);
}
console.log('Autofill fixed');
