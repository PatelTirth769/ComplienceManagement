const fs = require('fs');
const files = [
  'src/pages/AdminVendors.tsx',
  'src/pages/AdminCustomers.tsx',
  'src/pages/AdminAuditors.tsx',
  'src/pages/AdminChecklist.tsx',
  'src/pages/AdminCreateAudit.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace grids
  content = content.replace(/className="grid grid-cols-1 md:grid-cols-2 gap-4"/g, 'className="db-form-grid"');
  content = content.replace(/className="grid grid-cols-1 md:grid-cols-2 gap-6"/g, 'className="db-form-grid"');

  // Replace labels
  content = content.replace(/className="block text-sm font-semibold mb-1"/g, 'className="db-label"');
  content = content.replace(/className="block text-sm font-semibold mb-2"/g, 'className="db-label"');
  content = content.replace(/className="block text-sm font-semibold text-gray-700 mb-1\.5"/g, 'className="db-label"');
  
  // Blanket replace inputs
  content = content.replace(/className="w-full border[^"]+"/g, 'className="db-input"');
  
  // Force autofill to off on forms
  content = content.replace(/<form onSubmit={handleAddSubmit} className="space-y-6">/g, '<form onSubmit={handleAddSubmit} className="space-y-6" autoComplete="off">');
  content = content.replace(/<form onSubmit={handleAddSubmit} className="db-form-grid">/g, '<form onSubmit={handleAddSubmit} className="db-form-grid" autoComplete="off">');
  content = content.replace(/<form onSubmit={handleSubmit} className="space-y-6">/g, '<form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">');
  
  // Add autoComplete attributes based on type
  content = content.replace(/type="email" className="db-input"/g, 'type="email" className="db-input" autoComplete="new-email"');
  content = content.replace(/type="password" minLength={6} className="db-input"/g, 'type="password" minLength={6} className="db-input" autoComplete="new-password"');

  // Convert select elements
  content = content.replace(/<select required className="db-input"/g, '<select required className="db-select"');
  content = content.replace(/<select className="db-input"/g, '<select className="db-select"');
  
  fs.writeFileSync(file, content);
}
console.log('Fixed for real.');
